from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import get_db, User, Embedding
from pydantic import BaseModel
from utils import download_pgn_for_players

app = FastAPI()

class ChessUserRequest(BaseModel):
    chess_username: str
    platform: str
    is_grandmaster: bool = False

@app.post("/create_username")
def create_username(request: ChessUserRequest, db: Session = Depends(get_db)):
    
    # Check if user exists
    existing_user = db.query(User).filter(User.chess_username == request.chess_username).first()
    
    if existing_user:
        # Update existing user
        existing_user.platform = request.platform  # Use the value property
        existing_user.is_grandmaster = request.is_grandmaster
        
        # Get the new embedding
        embedding_vector = download_pgn_for_players(request.chess_username)
        
        # Check for existing embedding
        existing_embedding = db.query(Embedding).filter(Embedding.user_id == existing_user.user_id).first()
        
        if existing_embedding:
            # Update existing embedding
            existing_embedding.embedding = embedding_vector
        else:
            # Create new embedding
            new_embedding = Embedding(user_id=existing_user.user_id, embedding=embedding_vector)
            db.add(new_embedding)
        
        db.commit()
        return {"message": f"Updated user and embedding for {request.chess_username}"}
    else:
        new_user = User(
            chess_username=request.chess_username,
            platform=request.platform,
            is_grandmaster=request.is_grandmaster
        )
        db.add(new_user)
        db.flush()  # Flush to get the new user_id
        
        # Get the embedding
        embedding_vector = download_pgn_for_players(request.chess_username)
        
        # Create embedding
        new_embedding = Embedding(user_id=new_user.user_id, embedding=embedding_vector)
        db.add(new_embedding)
        
        db.commit()
        return {"message": f"Created new user and embedding for {request.chess_username}"}