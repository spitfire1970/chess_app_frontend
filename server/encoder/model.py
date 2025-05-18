import sys
from .transformer import ViT
sys.path.append("/".join(__file__.split('/')[:-2]))
from params_model import *
from params_data import *

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

class SqueezeExcitation(nn.Module):
    def __init__(self, channels, ratio):
        super().__init__()

        self.pool = nn.AdaptiveAvgPool2d(1)
        # tiny nn
        self.lin1 = nn.Linear(channels, channels // ratio)
        self.relu = nn.ReLU(inplace=True)
        self.lin2 = nn.Linear(channels // ratio, 2 * channels)

    def forward(self, x):
        n, c, h, w = x.size()
        x_in = x

        x = self.pool(x).view(n, c)
        x = self.lin1(x)
        x = self.relu(x)
        x = self.lin2(x)

        x = x.view(n, 2 * c, 1, 1)
        scale, shift = x.chunk(2, dim=1)

        x = scale.sigmoid() * x_in + shift
        return x

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
    
    def forward(self, games):

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