import { useState, useEffect, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import axios from 'axios';

import { BACKEND_URL } from '@/config'
const API = BACKEND_URL
const evil = "[Event \"?\"]\n[Site \"?\"]\n[Date \"????.??.??\"]\n[Round \"?\"]\n[White \"?\"]\n[Black \"?\"]\n[Result \"*\"]\n *"
const axiosInstance = axios.create({
  baseURL: API,
  withCredentials: true,
});

const play_sound = (name: string) => {
  new Audio(`/audio/${name}.mp3`).play()
}

export default function ChessBoard({username, mode}: {username: string, mode: string}) {
  const [game, setGame] = useState<Chess>(new Chess());
  const [color, setColor] = useState<string>('w')
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('White to move');

  const board = useMemo(() => {
    const rows = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        let file, rank;
        if (color === 'w') {
          file = String.fromCharCode(97 + col); // a-h
          rank = 8 - row; // ranks 8-1
        } else {
          file = String.fromCharCode(97 + (7 - col)); // h-a
          rank = row + 1; // ranks 1-8
        }
        const square = (file + rank) as Square;
        const piece = game.get(square);
        rows[row][col] = {
          piece: piece ? { type: piece.type, color: piece.color } : null,
          square,
        };
      }
    }
      if (game.isGameOver()) {
        if (game.isCheckmate()) {
          setStatus(`Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!`);
          play_sound('toot')
        } else {
          setStatus('Game over! Draw.');
          play_sound('bwong')
        }
      } else if (!status.startsWith("Enter")) {
        setStatus(`${game.turn() === 'w' ? 'White' : 'Black'} to move${game.isCheck() ? ' (Check)' : ''}`);
      }
    return rows;

    }, [game, color]);

  useEffect(() => {
    resetGame('resetted');
  },
  [color, username, mode]);

  useEffect(() => {
    const oldStatus = status
    setStatus('computer thinking...')
    async function makeComputerMove() {
      try {        
        let agentMove;
        try {
          const response = await axiosInstance.post('/ai_move', {
            chess_username: username,
            pgn_string: game.pgn(),
            color: (color === 'w') ? 'black' : 'white'
          });
          agentMove = response.data.ai_move;
        } catch (error) {
          resetGame("Enter a username above to play against!");
          console.error("poop making computer move:", error);
          return;
        }
        if (agentMove) {
          const oldpgn = game.pgn()
          const newGame = new Chess()
          if (oldpgn !== evil) newGame.loadPgn(oldpgn)
          newGame.move(agentMove);
          setGame(newGame);
          play_sound('wow')
        }
      } catch (error) {
        console.error("Error making computer move:", error);
      }
    }
    
    if (game.turn() !== color && !game.isGameOver() && !status.startsWith("Enter")) makeComputerMove()
    setStatus(oldStatus)
  },
  [game]);
  
  async function makeHumanMove(from: Square, to: Square) {
    try {
      const oldpgn = game.pgn()
      const newGame = new Chess()
      if (oldpgn !== evil) newGame.loadPgn(oldpgn)
      newGame.move({ from, to, promotion: 'q' });
      setGame(newGame);
      play_sound('squeak')
      return true
    } catch (error) {
        console.log('illegal move')
        return false
    }
  }
  
  async function handleSquareClick(squareStr: string) {
    const square = squareStr as Square;
    const [row, col] = getRowColFromSquare(squareStr);
    const piece = board[row][col].piece;
    if (piece && piece.color === color) {
      setSelectedSquare(square)
      return
    }
    if (selectedSquare && status === "computer thinking...") return // guard
    if (selectedSquare && game.turn() !==  color) return // guard
    if (!game.isGameOver()) {
      // If a square is already selected, try to make a move
      if (selectedSquare && await makeHumanMove(selectedSquare as Square, square)) {
        setSelectedSquare(null);
      }
    }
  };
  
  // Convert chess notation to array indices
  const getRowColFromSquare = (square: string): [number, number] => {
    let row, col;
    
    if (color === 'w') {
      col = square.charCodeAt(0) - 97; // 'a' is 97 in ASCII, maps a-h to 0-7
      row = 8 - parseInt(square[1]); // maps ranks 8-1 to rows 0-7
    } else {
      col = 7 - (square.charCodeAt(0) - 97); // maps a-h to 7-0 (reversed)
      row = parseInt(square[1]) - 1; // maps ranks 1-8 to rows 0-7
    }
    
    return [row, col];
  };
  
   const resetGame = (message:string) =>  {
    setGame(new Chess());
    setSelectedSquare(null);
    setStatus(message);
  };
  
  return (
    <div className="flex flex-col text-white items-center">
      <div className="flex gap-4 mb-8">
        <div>Play as:</div>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="playerColor"
            value='w'
            checked={color === 'w'}
            onChange={(e) => setColor(e.target.value)}
            className="mr-2"
          />
          <span className="text-white">White</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="playerColor"
            value='b'
            checked={color === 'b'}
            onChange={(e) => setColor(e.target.value)}
            className="mr-2"
          />
          <span className="text-white">Black</span>
        </label>
      </div>
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