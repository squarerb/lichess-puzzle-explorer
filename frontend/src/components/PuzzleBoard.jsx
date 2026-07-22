import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { recordResult } from '../lib/stats'

function uciToMoveObj(uci) {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci.slice(4) : 'q',
  }
}

function moveToUci(move) {
  return move.from + move.to + (move.promotion ? move.promotion : '')
}

// Lichess puzzle convention: `fen` is the position BEFORE moves[0].
// moves[0] is auto-played as the "setup" move, then the player must find
// moves[1], the opponent auto-replies with moves[2], and so on.
export default function PuzzleBoard({ puzzle, onNext }) {
  const gameRef = useRef(null)
  const [fen, setFen] = useState('')
  const [moveIndex, setMoveIndex] = useState(1)
  const [status, setStatus] = useState('thinking') // thinking | correct | incorrect
  const [orientation, setOrientation] = useState('white')
  const [resultRecorded, setResultRecorded] = useState(false)
  const [hintSquare, setHintSquare] = useState(null)
  const [hintUsed, setHintUsed] = useState(false)

  useEffect(() => {
    if (!puzzle) return
    const game = new Chess(puzzle.fen)
    game.move(uciToMoveObj(puzzle.moves[0]))
    gameRef.current = game
    setFen(game.fen())
    setMoveIndex(1)
    setStatus('thinking')
    setResultRecorded(false)
    setHintSquare(null)
    setHintUsed(false)
    setOrientation(game.turn() === 'w' ? 'white' : 'black')
  }, [puzzle])

  const totalPlayerMoves = useMemo(() => {
    if (!puzzle) return 0
    // player moves are odd indices: 1, 3, 5, ...
    return Math.ceil((puzzle.moves.length - 1) / 2)
  }, [puzzle])

  const playerMovesSoFar = Math.floor(moveIndex / 2)

  function finishSolved() {
    setStatus('correct')
    if (!resultRecorded) {
      recordResult(puzzle, 'solved', { hintUsed })
      setResultRecorded(true)
    }
  }

  function finishFailed() {
    setStatus('incorrect')
    if (!resultRecorded) {
      recordResult(puzzle, 'failed', { hintUsed })
      setResultRecorded(true)
    }
  }

  function onPieceDrop(sourceSquare, targetSquare) {
    if (status !== 'thinking' || !gameRef.current) return false
    const game = gameRef.current
    const expected = puzzle.moves[moveIndex]

    let move
    try {
      move = game.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
    } catch {
      return false
    }
    if (!move) return false

    const playedUci = moveToUci(move)
    if (playedUci !== expected && move.from + move.to !== expected.slice(0, 4)) {
      // wrong solution move — undo it and mark the attempt failed
      game.undo()
      setFen(game.fen())
      finishFailed()
      return true
    }

    setFen(game.fen())
    setHintSquare(null) // clear any hint highlight once a move is played
    const nextIndex = moveIndex + 1

    if (nextIndex >= puzzle.moves.length) {
      setMoveIndex(nextIndex)
      finishSolved()
      return true
    }

    // opponent's automatic reply
    setTimeout(() => {
      const reply = puzzle.moves[nextIndex]
      game.move(uciToMoveObj(reply))
      setFen(game.fen())
      setMoveIndex(nextIndex + 1)
    }, 350)

    return true
  }

  // Reveals only the source square of the solution move — enough to nudge
  // you toward the right idea without just handing over the answer.
  function showHint() {
    if (status !== 'thinking') return
    const expected = puzzle.moves[moveIndex]
    setHintSquare(expected.slice(0, 2))
    setHintUsed(true)
  }

  function showSolution() {
    if (!gameRef.current || !puzzle) return
    const game = new Chess(puzzle.fen)
    for (const uci of puzzle.moves) {
      game.move(uciToMoveObj(uci))
    }
    gameRef.current = game
    setFen(game.fen())
    setMoveIndex(puzzle.moves.length)
    finishFailed()
  }

  function retry() {
    if (!puzzle) return
    const game = new Chess(puzzle.fen)
    game.move(uciToMoveObj(puzzle.moves[0]))
    gameRef.current = game
    setFen(game.fen())
    setMoveIndex(1)
    setStatus('thinking')
    setHintSquare(null)
    setHintUsed(false)
  }

  if (!puzzle) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No puzzle loaded</div>
        <div>Pick one from the Browse tab to start solving.</div>
      </div>
    )
  }

  const statusText =
    status === 'correct'
      ? `Solved${hintUsed ? ' (hint used)' : ''} — nice tactic.`
      : status === 'incorrect'
        ? 'Not the move. Try again or see the solution.'
        : 'Find the best move for the side to move.'

  const squareStyles = hintSquare
    ? { [hintSquare]: { boxShadow: 'inset 0 0 0 4px var(--brass-bright)' } }
    : undefined

  return (
    <div className="solve-layout">
      <div className="board-wrap">
        <Chessboard
          position={fen}
          onPieceDrop={onPieceDrop}
          boardOrientation={orientation}
          arePiecesDraggable={status === 'thinking'}
          customDarkSquareStyle={{ backgroundColor: '#7a6a52' }}
          customLightSquareStyle={{ backgroundColor: '#ede6d6' }}
          customBoardStyle={{ borderRadius: '6px' }}
          customSquareStyles={squareStyles}
        />
      </div>

      <div className="solve-side">
        <div className={`solve-status ${status}`}>{statusText}</div>

        <div className="solve-meta">
          <span>rating {puzzle.rating}</span>
          <span>
            move {playerMovesSoFar} / {totalPlayerMoves}
          </span>
          <span>{puzzle.themes.join(', ')}</span>
        </div>

        <div className="btn-row">
          {status === 'thinking' && (
            <button className="btn btn-secondary" onClick={showHint} type="button" disabled={hintUsed}>
              {hintUsed ? 'Hint shown' : 'Hint'}
            </button>
          )}
          {status === 'incorrect' && (
            <>
              <button className="btn btn-secondary" onClick={retry} type="button">
                Try again
              </button>
              <button className="btn btn-secondary" onClick={showSolution} type="button">
                Show solution
              </button>
            </>
          )}
          <button className="btn" onClick={onNext} type="button">
            Next puzzle
          </button>
        </div>
      </div>
    </div>
  )
}
