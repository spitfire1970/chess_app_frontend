import sys
from .transformer import ViT
sys.path.append("/".join(__file__.split('/')[:-2]))
from params_model import *
from params_data import *

from torch.nn.utils import clip_grad_norm_
from collections import OrderedDict
from torch import nn
import torch

class ConvBlock(nn.Sequential):
    def __init__(self, in_channels, out_channels, kernel_size, padding=0):
        super().__init__(OrderedDict([
            ('conv', nn.Conv2d(in_channels, out_channels, kernel_size, padding=padding, bias=False)),
            ('bn', nn.BatchNorm2d(out_channels)),
            ('relu', nn.ReLU(inplace=True)),
        ]))

# reference: https://github.com/moskomule/senet.pytorch/blob/master/senet/se_resnet.py
class SqueezeExcitation(nn.Module):
    def __init__(self, channels, ratio):
        super().__init__()

        self.pool = nn.AdaptiveAvgPool2d(1) # reduce dimensions to h x w to 1 x 1 # squeeze
        # tiny nn
        self.lin1 = nn.Linear(channels, channels // ratio)
        self.relu = nn.ReLU(inplace=True)
        self.lin2 = nn.Linear(channels // ratio, 2 * channels) # excite

    def forward(self, x):
        n, c, h, w = x.size()
        x_in = x

        x = self.pool(x).view(n, c)
        x = self.lin1(x)
        x = self.relu(x)
        x = self.lin2(x)

        x = x.view(n, 2 * c, 1, 1)
        scale, shift = x.chunk(2, dim=1)

        x = scale.sigmoid() * x_in + shift # combine batch norm like shifting with SE
        return x

# reference only: https://github.com/imkhan2/se-resnet/blob/master/se_resnet.py
class ResidualBlock(nn.Module):
    def __init__(self, channels, se_ratio):
        super().__init__()
        self.layers = nn.Sequential(OrderedDict([
            ('conv1', nn.Conv2d(channels, channels, 3, padding=1, bias=False)),
            ('bn1', nn.BatchNorm2d(channels)),
            ('relu', nn.ReLU(inplace=True)),

            ('conv2', nn.Conv2d(channels, channels, 3, padding=1, bias=False)),
            ('bn2', nn.BatchNorm2d(channels)),

            ('se', SqueezeExcitation(channels, se_ratio)),
        ]))
        self.relu2 = nn.ReLU(inplace=True)

    def forward(self, x):
        x_in = x

        x = self.layers(x)

        x = x + x_in
        x = self.relu2(x)
        return x

class Encoder(nn.Module):

    def __init__(self, loss_device, loss_method = "softmax"):
        super().__init__()
        self.loss_device = loss_device
        
        channels = residual_channels

        self.conv_block = ConvBlock(34, channels, 3, padding=1)
        blocks = [(f'block{i+1}', ResidualBlock(channels, se_ratio)) for i in range(residual_blocks)]
        self.residual_stack = nn.Sequential(OrderedDict(blocks))

        self.conv_block2 = ConvBlock(channels, channels, 3, padding=1)
        self.final_feature = ConvBlock(channels, vit_input_channels, 3, padding=1)
        self.global_avgpool = nn.AvgPool2d(kernel_size=8)

        self.cnn = nn.Sequential(*[
            self.conv_block,
            self.residual_stack,
            self.conv_block2,
            self.final_feature,
            self.global_avgpool,
            torch.nn.Flatten()
        ])

        self.transformer = ViT(input_dim=vit_input_channels, 
                               output_dim=model_embedding_size, 
                               dim=transformer_input_dim, 
                               depth=transformer_depth, 
                               heads=attention_heads, 
                               mlp_dim=mlp_dim, 
                               pool='mean',
                               dim_head = dim_head,
                               dropout=dropout, 
                               emb_dropout=emb_dropout)
        
        # Cosine similarity scaling (with fixed initial parameter values)
        self.similarity_weight = nn.Parameter(torch.tensor([similarity_weight_init])) 
        self.similarity_bias = nn.Parameter(torch.tensor([similarity_bias_init]))

        # Loss
        if loss_method == "mix":
            self.loss_fn = self.GE2E_loss_mix
        elif loss_method == "softmax":
            self.loss_fn = self.GE2E_softmax_loss
        else:
            self.loss_fn = self.GE2E_contrast_loss

    def do_gradient_ops(self):
        # Gradient scale (don't want these two to change rapidly)
        self.similarity_weight.grad *= 0.01
        self.similarity_bias.grad *= 0.01
            
        # Gradient clipping for exploding gradients #https://medium.com/biased-algorithms/guide-to-gradient-clipping-in-pytorch-f1db24ea08a2
        clip_grad_norm_(self.parameters(), 3, norm_type=2) # start from max_norm = 1.0, adjust accordingly
    
    def forward(self, games):
        """
        Computes the embeddings of a batch of games.
        
        :param games: batch of games of same duration as a tensor of shape 
        (batch_size, n_frames, 34, 8, 8)
        :return: the embeddings as a tensor of shape (batch_size, embedding_size)
        """

        batch_size, n_frames, feature_shape = games.shape[0], games.shape[1], games.shape[2:]
        
        #  (batch_size, n_frames, 34, 8, 8) -> (batch_size*n_frames, 34, 8, 8)
        games = torch.reshape(games, (batch_size*n_frames, *feature_shape))

        # (batch_size*n_frames, cnn_out_features)
        game_features = self.cnn(games)

        # (batch_size*n_frames, cnn_out_features) -> (batch_size, n_frames, cnn_out_features)
        game_features = torch.reshape(game_features, (batch_size, n_frames, game_features.shape[-1]))

        # Pass the input into transformer
        # (batch_size, n_frames, n_features) 
        embeds_raw = self.transformer(game_features)
        # self.lstm.flatten_parameters()

        # L2-normalize it
        embeds = embeds_raw / torch.norm(embeds_raw, dim=1, keepdim=True)
        
        return embeds
   