## Model parameters
residual_channels = 64
residual_blocks = 6
se_ratio = 8
vit_input_channels = 320 # input dimension to ViT
transformer_input_dim = 1024
model_embedding_size = 512
transformer_depth = 12
attention_heads = 8
mlp_dim = 2048
dim_head = 64 # k_q_v dims, risky to tune?
dropout = 0.
emb_dropout = 0.
similarity_weight_init = 10.
similarity_bias_init = -5.

## Training parameters
learning_rate_init = 0.005
players_per_batch = 36
games_per_player = 10

v_players_per_batch = 40
v_games_per_player = 10
num_validate = 10