from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from database import get_db, User, Embedding
from utils import download_pgn_for_players

application = FastAPI()

application.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChessUserRequest(BaseModel):
    chess_username: str
    platform: str
    is_grandmaster: bool = False

@application.get("/")
def root():
    return {"message": "Hello World"}

@application.post("/create_username")
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
        print(type(embedding_vector), len(embedding_vector), type(embedding_vector[0]))

        
        # Create embedding
        new_embedding = Embedding(user_id=new_user.user_id, embedding=embedding_vector)
        db.add(new_embedding)
        
        db.commit()
        return {"message": f"Created new user and embedding for {request.chess_username}"}
    
@application.get("/similar_players/{chess_username}")
def find_similar_players(
    chess_username: str, 
    limit: int = 5, 
    platform_filter: str = None,
    grandmaster_only: bool = False,
    db: Session = Depends(get_db)
):
    # Find the user and their embedding
    user = db.query(User).filter(User.chess_username == chess_username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Get user's embedding
    embedding = db.query(Embedding).filter(Embedding.user_id == user.user_id).first()
    if not embedding:
        raise HTTPException(status_code=404, detail="No embedding found for this player")
    
    # Convert embedding to a format pgvector understands
    # If it's a NumPy array, convert to list
    if hasattr(embedding.embedding, 'tolist'):
        embedding_vector = embedding.embedding.tolist()
    else:
        embedding_vector = embedding.embedding
    
    # Build where clause with proper parameters
    where_conditions = []
    params = {}
    
    where_conditions.append("e.user_id != :user_id")
    params["user_id"] = user.user_id
    
    if platform_filter:
        where_conditions.append("u.platform = :platform")
        params["platform"] = platform_filter
        
    if grandmaster_only:
        where_conditions.append("u.is_grandmaster = TRUE")
    
    where_clause = " AND ".join(where_conditions)
    
    # Use native pgvector SQL approach with binding parameters
    from pgvector.sqlalchemy import Vector
    
    # Manually construct the SQL with pgvector's operators
    query = f"""
        SELECT u.chess_username, u.platform, u.is_grandmaster, 
               1 - (e.embedding <=> '{embedding_vector}'::vector) as similarity
        FROM embeddings e
        JOIN users u ON e.user_id = u.user_id
        WHERE {where_clause}
        ORDER BY similarity DESC
        LIMIT :limit
    """
    
    params["limit"] = limit
    
    similar_players = db.execute(text(query), params).fetchall()
    
    return {
        "player": chess_username,
        "similar_players": [
            {
                "username": row[0],
                "platform": row[1],
                "is_grandmaster": row[2],
                "similarity": float(row[3])
            }
            for row in similar_players
        ]
    }

@application.get("/player_similarity")
def get_player_similarity(player1: str, player2: str, db: Session = Depends(get_db)):
    # Get both users
    user1 = db.query(User).filter(User.chess_username == player1).first()
    user2 = db.query(User).filter(User.chess_username == player2).first()
    
    if not user1 or not user2:
        raise HTTPException(status_code=404, detail="One or both players not found")
    
    # Get embeddings
    embedding1 = db.query(Embedding).filter(Embedding.user_id == user1.user_id).first()
    embedding2 = db.query(Embedding).filter(Embedding.user_id == user2.user_id).first()
 
    if not embedding1 or not embedding2:
        raise HTTPException(status_code=404, detail="Embedding missing for one or both players")
    
    if hasattr(embedding1.embedding, 'tolist'):
        embedding1 = embedding1.embedding.tolist()
    else:
        embedding1 = embedding1.embedding

    if hasattr(embedding2.embedding, 'tolist'):
        embedding2 = embedding2.embedding.tolist()
    else:
        embedding2 = embedding2.embedding 
    # Compute similarity (using raw SQL with pgvector's operator)
    result = db.execute(
        text(f"SELECT 1 - ('{embedding1}'::vector <=> '{embedding2}'::vector) as cosine_similarity"),
        {"emb1": embedding1, "emb2": embedding2}
    ).fetchone()
    
    return {
        "player1": player1,
        "player2": player2,
        "similarity": float(result[0])
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000)