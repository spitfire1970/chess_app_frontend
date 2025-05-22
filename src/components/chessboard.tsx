import { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import axios from 'axios';

// Simple type for chess pieces
type ChessPiece = {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
};
const API = '/api/proxy'
const axiosInstance = axios.create({
  baseURL: API,
  withCredentials: true,
});

export default function ChessBoard({username}: {username: string}) {
  // Initialize chess.js instance
  const [game, setGame] = useState<Chess>(new Chess());
  const [board, setBoard] = useState<Array<Array<{square: string, piece: ChessPiece | null}>>>(getBoard());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('White to move');
  
  // Generate board representation from chess.js
  function getBoard() {
    const rows = Array(8).fill(null).map(() => Array(8).fill(null));
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = (String.fromCharCode(97 + col) + (8 - row)) as Square;
        const piece = game.get(square);
        
        rows[row][col] = {
          piece: piece ? { type: piece.type, color: piece.color } : null,
          square,
        };
      }
    }
    
    return rows;
  }
  
  // Update board state and status message
  function updateGameState() {
    setBoard(getBoard());
    
    if (game.isGameOver()) {
      if (game.isCheckmate()) {
        setStatus(`Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!`);
      } else {
        setStatus('Game over! Draw.');
      }
    } else if (!status.startsWith("Enter")) {
      setStatus(`${game.turn() === 'w' ? 'White' : 'Black'} to move${game.isCheck() ? ' (Check)' : ''}`);
    }
  }
  
  // Handle AI/computer move
  async function makeComputerMove() {
    try {
      const agentMove = await getComputerMove(game.fen());
      console.log('agent move', agentMove)
      if (agentMove) {
        game.move(agentMove);
        updateGameState();
      }
    } catch (error) {
      console.error("Error making computer move:", error);
    }
  }
  
  async function getComputerMove(fen: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const pgn = game.pgn()
        console.log('pgn', pgn)
        const request_obj = {
        chess_username: username,
        pgn_string: pgn,
        color: 'black'
    };
    axiosInstance.post('/ai_move', request_obj)
      .then(response => {
        console.log('ai_move', response.data.ai_move)
        resolve(response.data.ai_move)
      })
      .catch(error => {
        console.log('user not found. resetting game')
        resetGame("Enter a username above to play against!")
      })
      }, 500);
    });
  }
  
  // Handle player move
  async function makeMove(from: Square, to: Square) {
    try {
      // Try to make the move
      game.move({ from, to, promotion: 'q' });

      updateGameState();
      
      // If game isn't over, make the computer move
      if (!game.isGameOver()) {
        await makeComputerMove();
      }
      return true
    } catch (error) {
        console.log('illegal move')
        return false
    }
  }
  
  // Handle square click
  async function handleSquareClick(squareStr: string) {
    if (!game.isGameOver()) {
      const square = squareStr as Square;

      // If a square is already selected, try to make a move
      if (selectedSquare && await makeMove(selectedSquare as Square, square)) {
        setSelectedSquare(null);
      } else {
        // If no square is selected, select it if it has a piece of current turn
        const [row, col] = getRowColFromSquare(squareStr);
        const piece = board[row][col].piece;
        if (piece && piece.color === game.turn()) {
          setSelectedSquare(square);
        }
      }
    }
  };
  
  // Convert chess notation to array indices
  const getRowColFromSquare = (square: string): [number, number] => {
    const col = square.charCodeAt(0) - 97; // 'a' is 97 in ASCII
    const row = 8 - parseInt(square[1]);
    return [row, col];
  };
  
  // Reset the game
  const resetGame = (message:string) => {
    const newGame = new Chess();
    setGame(newGame);
    setBoard(getBoard());
    setSelectedSquare(null);
    setStatus(message);
  };
  
  // Update board when game changes
  useEffect(() => {
    updateGameState();
  }, [game]);
  
  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 text-xl">{status}</div>
      
      <div className="grid grid-cols-8 grid-rows-8 w-96 h-96 border border-gray-800">
        {board.map((row, rowIndex) =>
          row.map((square, colIndex) => {
            const isLight = (rowIndex + colIndex) % 2 === 0;
            const isSelected = square.square === selectedSquare;
            
            return (
              <div
                key={square.square}
                className={`
                  flex items-center justify-center
                  ${isLight ? 'bg-amber-100' : 'bg-amber-800'}
                  ${isSelected ? 'ring-4 ring-blue-500 ring-inset' : ''}
                  cursor-pointer
                  hover:opacity-80
                `}
                onClick={() => handleSquareClick(square.square)}
              >
                {square.piece && (
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img 
                      src={`/pieces/${square.piece.color === 'w' ? 'white' : 'black'}_${getPieceName(square.piece.type)}.png`}
                      alt={`${square.piece.color === 'w' ? 'White' : 'Black'} ${getPieceName(square.piece.type)}`}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      <button 
        onClick={() => {resetGame("white to move")}}
        className="mt-4 px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-700"
      >
        Reset Game
      </button>
    </div>
  );
}

function getPieceName(type: string): string {
  switch (type) {
    case 'p': return 'pawn';
    case 'n': return 'knight';
    case 'b': return 'bishop';
    case 'r': return 'rook';
    case 'q': return 'queen';
    case 'k': return 'king';
    default: return type;
  }
}