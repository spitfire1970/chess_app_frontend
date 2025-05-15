import requests
import torch
import numpy as np
import chess.pgn
import requests
import time
import re
import io
import random
from pathlib import Path
from encoder.model import Encoder
from data_objects.game import Game

_model = None
_device = None
games_per_player = 500

def load_model(weights_fpath: Path):
    global _model, _device
    
    print("Loading model...")
    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    checkpoint = torch.load(weights_fpath, _device, weights_only=True)
    _model = Encoder(_device)
    state_dict = checkpoint['model_state']
    _model.load_state_dict(state_dict)
    _model = _model.to(_device)
    _model.eval()    
    print(f"Successfully loaded model from {weights_fpath}")

def get_centroid_embedding(player_batch):
    global _model, _device
    inputs = torch.from_numpy(player_batch).float().to(_device)
    with torch.no_grad():
        embeds = _model(inputs)
        embeds = embeds.view((1, games_per_player, -1)).to(_device)
        centroids_incl = torch.mean(embeds, dim=1, keepdim=True)
        centroids_incl = centroids_incl.clone() / torch.norm(centroids_incl, dim=2, keepdim=True)
    centroids_incl = centroids_incl.cpu().squeeze(1)
    return [centroid.numpy() for centroid in centroids_incl]

def process_game(game):
    def create_position_planes(board: chess.Board, positions_seen: set, cur_player: chess.Color) -> np.ndarray:

        def bb_to_plane(bb: int, player: chess.Color) -> np.ndarray:
            binary = format(bb, '064b')
            h_flipped = np.fliplr(np.array([int(binary[i]) for i in range(64)], dtype=np.float32).reshape(8, 8))
            if player:
                return h_flipped
            else:
                return np.flip(h_flipped)
            
        planes = np.zeros((13, 8, 8), dtype=np.float32)
        
        piece_types = [chess.PAWN, chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN, chess.KING]
        
        # white pieces (planes 1-6)
        for i, piece_type in enumerate(piece_types):
            bb = board.pieces_mask(piece_type, chess.WHITE)
            planes[i] = bb_to_plane(bb, cur_player)
        
        # black pieces (planes 7-12)
        for i, piece_type in enumerate(piece_types):
            bb = board.pieces_mask(piece_type, chess.BLACK)
            planes[i + 6] = bb_to_plane(bb, cur_player)
        
        # repetition plane (plane 13)
        current_position = board.fen().split(' ')[0]
        if list(positions_seen).count(current_position) > 1:
            planes[12] = 1.0
        
        return planes

    board = chess.Board()
    positions_seen = set()
    positions_seen.add(board.fen().split(' ')[0])
    
    white_moves = []
    black_moves = []
    
    node = game
    while node.next():
        node = node.next()
        move = node.move
        assert(move is not None)
        cur_player = board.turn

        current_planes = create_position_planes(board, positions_seen, cur_player)
        
        board.push(move)
        
        positions_seen.add(board.fen().split(' ')[0])
        
        next_planes = create_position_planes(board, positions_seen, cur_player)
        assert(not (current_planes==next_planes).all())
        # print_planes(next_planes)
        
        move_planes = np.zeros((34, 8, 8), dtype=np.float32)
        
        # first 13 planes (before move)
        move_planes[0:13] = current_planes
        
        # next 13 planes (after move)
        move_planes[13:26] = next_planes
        
        # castling availability (planes 27-30)
        move_planes[26] = float(board.has_queenside_castling_rights(chess.WHITE))
        move_planes[27] = float(board.has_kingside_castling_rights(chess.WHITE))
        move_planes[28] = float(board.has_queenside_castling_rights(chess.BLACK))
        move_planes[29] = float(board.has_kingside_castling_rights(chess.BLACK))
        
        # side to move (plane 31)
        move_planes[30] = 1 if board.turn is chess.WHITE else 0
        
        # fifty move counter (plane 32)
        move_planes[31] = board.halfmove_clock / 100.0
        
        # move time normalized between 0 and 1 (plane 33)
        # change based on time control
        clock_info = node.comment.strip('{}[] ').split()[1] if node.comment else "0:00:30" 
        try:
            minutes, seconds = map(int, clock_info.split(':')[1:])
            total_seconds = minutes * 60 + seconds
            move_planes[32] = min(1.0, total_seconds / 180.0)
        except:
            move_planes[32] = 0.5
        
        # all 1s (plane 34)
        move_planes[33] = 1.0
        
        if board.turn:
            black_moves.append(move_planes)
        else: # chess.BLACK is falsy
            white_moves.append(move_planes)
    
    if len(white_moves) < 10 or len(black_moves) < 10:
        return None
    
    white_array = np.stack(white_moves, axis=0)
    black_array = np.stack(black_moves, axis=0)
    
    return white_array, black_array

def get_player_game_archives(username, session):
    """Get the list of monthly game archive URLs for a player"""
    url = f"https://api.chess.com/pub/player/{username}/games/archives"
    
    # Add proper headers to look more like a browser
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.chess.com/',
        'Connection': 'keep-alive'
    }
    
    # Try with exponential backoff
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = session.get(url, headers=headers)
            
            if response.status_code == 200:
                return response.json().get('archives', [])
            elif response.status_code == 429:  # Too Many Requests
                wait_time = (2 ** attempt) + random.random()
                print(f"Rate limited. Waiting {wait_time:.2f} seconds...")
                time.sleep(wait_time)
            else:
                print(f"Error fetching archives for {username}: HTTP {response.status_code}")
                print(f"Response body: {response.text[:200]}...")
                return []
        except Exception as e:
            print(f"Exception when fetching archives for {username}: {str(e)}")
            wait_time = (2 ** attempt) + random.random()
            time.sleep(wait_time)
    
    print(f"Failed to fetch archives for {username} after {max_retries} attempts")
    return []

def is_standard_blitz_game(game_text):
    """Check if a game is a standard blitz game (not Chess960 or other variants)"""
    # First, check if it's a variant game - exclude these
    event_match = re.search(r'\[Event "([^"]+)"\]', game_text)
    if event_match:
        event = event_match.group(1).lower()
        # Exclude chess960, bughouse, crazyhouse and any other variants
        if any(variant in event for variant in ["chess960", "960", "bughouse", "crazy", "variant", "thematic"]):
            return False
    
    # Check for Variant tag
    variant_match = re.search(r'\[Variant "([^"]+)"\]', game_text)
    if variant_match and variant_match.group(1).lower() not in ["", "standard", "chess"]:
        return False
    
    # Now check if it's a blitz game
    time_class_match = re.search(r'\[TimeClass "([^"]+)"\]', game_text)
    if time_class_match and time_class_match.group(1).lower() == "blitz":
        return True
    
    if event_match and "blitz" in event_match.group(1).lower():
        return True
    
    # Check time control (chess.com blitz is 3-10 minutes)
    time_control_match = re.search(r'\[TimeControl "([^"]+)"\]', game_text)
    if time_control_match:
        time_control = time_control_match.group(1)
        try:
            if "+" in time_control:
                base_time = int(time_control.split("+")[0])
            else:
                base_time = int(time_control)
                
            # Convert to minutes
            minutes = base_time / 60
            return 3 <= minutes <= 10
        except:
            pass
    
    return False

def download_blitz_games(username, session, max_games):
    """Download up to max_games blitz games for a player in PGN format"""
    archives = get_player_game_archives(username, session)
    
    if not archives:
        print(f"No game archives found for {username}")
        return ""
        
    print(f"Found {len(archives)} monthly archives for {username}")
    
    all_pgn_games = []
    games_count = 0
    
    # Add proper headers
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'Accept': 'application/x-chess-pgn',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.chess.com/',
        'Connection': 'keep-alive'
    }
    
    # Process archives from newest to oldest
    for i, archive_url in enumerate(reversed(archives)):
        if games_count >= max_games:
            break
            
        # Get PGN format directly
        pgn_url = f"{archive_url}/pgn"
        print(f"Fetching games from {pgn_url} ({i+1}/{len(archives)})")
        
        # Try with exponential backoff
        max_retries = 3
        success = False
        
        for attempt in range(max_retries):
            try:
                response = session.get(pgn_url, headers=headers)
                
                if response.status_code == 200:
                    success = True
                    break
                elif response.status_code == 429:  # Too Many Requests
                    wait_time = (2 ** attempt) + random.random()
                    print(f"Rate limited. Waiting {wait_time:.2f} seconds...")
                    time.sleep(wait_time)
                else:
                    print(f"Error fetching PGN from {pgn_url}: HTTP {response.status_code}")
                    break
            except Exception as e:
                print(f"Exception when fetching {pgn_url}: {str(e)}")
                wait_time = (2 ** attempt) + random.random()
                time.sleep(wait_time)
        
        if not success:
            print(f"Failed to fetch games from {pgn_url} after {max_retries} attempts")
            continue
                
        # Parse the PGN data to extract only blitz games
        pgn_content = response.text
        
        # Split into individual games
        games = re.split(r'\n\n(?=\[Event)', pgn_content)
        if len(games) > 0 and not games[0].strip().startswith('[Event'):
            games = games[1:] # Remove any leading text that's not a game
        
        print(f"Found {len(games)} total games in archive, filtering for blitz...")
        blitz_count = 0
        
        for game in games:
            if is_standard_blitz_game(game):
                all_pgn_games.append(game.strip())
                games_count += 1
                blitz_count += 1
                
                # Progress update
                if games_count % 50 == 0:
                    print(f"Collected {games_count} blitz games so far...")
                
                if games_count >= max_games:
                    print(f"Reached target of {max_games} games")
                    break
        
        print(f"Added {blitz_count} blitz games from this archive")
        
        # Respect API rate limits - use a random delay between 2-4 seconds
        time.sleep(2 + 2 * random.random())
    
    print(f"Total blitz games collected for {username}: {len(all_pgn_games)}")
    return "\n\n".join(all_pgn_games[:max_games])

def download_pgn_for_players(username):
    
    session = requests.Session()
        
    pgn_content = io.StringIO(download_blitz_games(username, session, games_per_player))
    l = []

    while True:
        game = chess.pgn.read_game(pgn_content)
        if game is None:
            print("breaking main loop")
            break
        white = game.headers.get("White")
        black = game.headers.get("Black")
        if white == username:
            color = "white"
        elif black == username:
            color = "black"
        else:
            raise Exception
        arrs = process_game(game)
        if arrs is None: # skip if less than 10 moves
            print("skipped")
            continue
        if color == "white":
            l.append(arrs[0])
        else:
           l.append(arrs[1])

    inputs = np.array([Game(g).random_partial() for g in l])
    load_model

    return get_centroid_embedding(inputs)