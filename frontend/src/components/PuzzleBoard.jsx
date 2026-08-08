import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { recordResult } from '../lib/stats'
import { getAllPuzzles } from '../lib/puzzleData'
import { themeDescription } from '../lib/themeGlossary'

function sampleWithoutReplacement(arr, n) {
  const pool = [...arr]
  const picked = []
  while (pool.length > 0 && picked.length < n) {
    const i = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(i, 1)[0])
  }
  return picked
}

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
export default function PuzzleBoard({ puzzle, onNext, onSelectPuzzle }) {
  const gameRef = useRef(null)
  const [fen, setFen] = useState('')
  const [moveIndex, setMoveIndex] = useState(1)
  const [status, setStatus] = useState('thinking') // thinking | correct | incorrect
  const [orientation, setOrientation] = useState('white')
  const [resultRecorded, setResultRecorded] = useState(false)
  const [hintSquare, setHintSquare] = useState(null)
  const [hintShownThisMove, setHintShownThisMove] = useState(false)
  const [hintUsedThisPuzzle, setHintUsedThisPuzzle] = useState(false)
  const [moveHistory, setMoveHistory] = useState([])
  const [selectedSquare, setSelectedSquare] = useState(null)

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
    setHintShownThisMove(false)
    setHintUsedThisPuzzle(false)
    setMoveHistory(game.history())
    setSelectedSquare(null)
    setOrientation(game.turn() === 'w' ? 'white' : 'black')
  }, [puzzle])

  const totalPlayerMoves = useMemo(() => {
    if (!puzzle) return 0
    // player moves are odd indices: 1, 3, 5, ...
    return Math.ceil((puzzle.moves.length - 1) / 2)
  }, [puzzle])

  const playerMovesSoFar = Math.floor(moveIndex / 2)

  const similarPuzzles = useMemo(() => {
    if (!puzzle) return []
    const topTheme = puzzle.themes[0]
    const candidates = getAllPuzzles().filter((p) => p.id !== puzzle.id && p.themes.includes(topTheme))
    return sampleWithoutReplacement(candidates, 4)
  }, [puzzle])

  function finishSolved() {
    setStatus('correct')
    if (!resultRecorded) {
      recordResult(puzzle, 'solved', { hintUsed: hintUsedThisPuzzle })
      setResultRecorded(true)
    }
  }

  function finishFailed() {
    setStatus('incorrect')
    if (!resultRecorded) {
      recordResult(puzzle, 'failed', { hintUsed: hintUsedThisPuzzle })
      setResultRecorded(true)
    }
  }

  // Shared by both drag-and-drop and click-to-move — attempts the move,
  // checks it against the puzzle's solution, and advances/fails the puzzle
  // accordingly. Returns true if a move was accepted as a legal chess move
  // (right OR wrong for the puzzle), false if it was illegal and rejected.
  function attemptMove(sourceSquare, targetSquare) {
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
    setMoveHistory(game.history())
    setHintSquare(null) // clear any hint highlight once a move is played
    setHintShownThisMove(false) // and re-enable the hint button for the next move in this puzzle
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
      setMoveHistory(game.history())
      setMoveIndex(nextIndex + 1)
    }, 350)

    return true
  }

  function onPieceDrop(sourceSquare, targetSquare) {
    const accepted = attemptMove(sourceSquare, targetSquare)
    if (accepted) setSelectedSquare(null)
    return accepted
  }

  function pieceColorAt(square) {
    const piece = gameRef.current?.get(square)
    return piece ? piece.color : null
  }

  // Click-to-move: click a piece to select it (highlighted), then click a
  // destination square to move there. Click the same square again to
  // deselect, or click a different one of your own pieces to switch
  // selection instead of attempting an illegal move.
  function onSquareClick(square) {
    if (status !== 'thinking' || !gameRef.current) return
    const turnColor = gameRef.current.turn()

    if (!selectedSquare) {
      if (pieceColorAt(square) === turnColor) {
        setSelectedSquare(square)
      }
      return
    }

    if (square === selectedSquare) {
      setSelectedSquare(null)
      return
    }

    if (pieceColorAt(square) === turnColor) {
      setSelectedSquare(square)
      return
    }

    attemptMove(selectedSquare, square)
    setSelectedSquare(null)
  }

  // Reveals only the source square of the solution move — enough to nudge
  // you toward the right idea without just handing over the answer.
  function showHint() {
    if (status !== 'thinking') return
    const expected = puzzle.moves[moveIndex]
    setHintSquare(expected.slice(0, 2))
    setHintShownThisMove(true)
    setHintUsedThisPuzzle(true)
  }

  function showSolution() {
    if (!gameRef.current || !puzzle) return
    const game = new Chess(puzzle.fen)
    for (const uci of puzzle.moves) {
      game.move(uciToMoveObj(uci))
    }
    gameRef.current = game
    setFen(game.fen())
    setMoveHistory(game.history())
    setMoveIndex(puzzle.moves.length)
    setSelectedSquare(null)
    finishFailed()
  }

  function retry() {
    if (!puzzle) return
    const game = new Chess(puzzle.fen)
    game.move(uciToMoveObj(puzzle.moves[0]))
    gameRef.current = game
    setFen(game.fen())
    setMoveHistory(game.history())
    setMoveIndex(1)
    setStatus('thinking')
    setHintSquare(null)
    setHintShownThisMove(false)
    setHintUsedThisPuzzle(false)
    setSelectedSquare(null)
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
      ? `Solved${hintUsedThisPuzzle ? ' (hint used)' : ''} — nice tactic.`
      : status === 'incorrect'
        ? 'Not the move. Try again or see the solution.'
        : 'Find the best move for the side to move.'

  const squareStyles = {}
  if (hintSquare) {
    squareStyles[hintSquare] = { boxShadow: 'inset 0 0 0 4px var(--brass-bright)' }
  }
  if (selectedSquare) {
    squareStyles[selectedSquare] = {
      ...(squareStyles[selectedSquare] || {}),
      backgroundColor: 'rgba(90, 141, 108, 0.45)',
    }
  }
  const finalSquareStyles = Object.keys(squareStyles).length > 0 ? squareStyles : undefined

  return (
    <div className="solve-layout">
      <div className="board-wrap">
        <Chessboard
          position={fen}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          boardOrientation={orientation}
          arePiecesDraggable={status === 'thinking'}
          customDarkSquareStyle={{ backgroundColor: '#7a6a52' }}
          customLightSquareStyle={{ backgroundColor: '#ede6d6' }}
          customBoardStyle={{ borderRadius: '6px' }}
          customSquareStyles={finalSquareStyles}
        />
      </div>

      <div className="solve-side">
        <div className={`solve-status ${status}`}>{statusText}</div>

        <div className="solve-meta">
          <span>rating {puzzle.rating}</span>
          <span>
            move {playerMovesSoFar} / {totalPlayerMoves}
          </span>
        </div>

        <div className="theme-tag-list">
          {puzzle.themes.map((t) => (
            <span key={t} className="theme-tag" title={themeDescription(t)}>
              {t}
            </span>
          ))}
        </div>

        <div className="btn-row">
          {status === 'thinking' && (
            <button className="btn btn-secondary" onClick={showHint} type="button" disabled={hintShownThisMove}>
              {hintShownThisMove ? 'Hint shown' : 'Hint'}
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

        <div className="info-grid">
          <div className="side-card">
            <div className="filter-section-label">Moves played</div>
            {moveHistory.length === 0 ? (
              <div className="moves-empty">—</div>
            ) : (
              <ol className="moves-list">
                {moveHistory.map((san, i) => (
                  <li key={i}>
                    {i % 2 === 0 && <span className="move-number">{Math.floor(i / 2) + 1}.</span>}
                    <span className="move-san">{san}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="side-card">
            <div className="filter-section-label">About this puzzle</div>
            <div className="puzzle-info-grid">
              <span>Rating</span>
              <span>{puzzle.rating}</span>
              <span>Popularity</span>
              <span>{puzzle.popularity}%</span>
              <span>Times played</span>
              <span>{puzzle.nbPlays.toLocaleString()}</span>
            </div>
            {puzzle.gameUrl && (
              <a className="source-game-link" href={puzzle.gameUrl} target="_blank" rel="noreferrer">
                View original game on Lichess ↗
              </a>
            )}
          </div>

          <div className="side-card">
            <div className="filter-section-label">Themes explained</div>
            <dl className="theme-glossary-list">
              {puzzle.themes.map((t) => (
                <div key={t} className="theme-glossary-entry">
                  <dt>{t}</dt>
                  <dd>{themeDescription(t)}</dd>
                </div>
              ))}
            </dl>
          </div>

          {similarPuzzles.length > 0 && (
            <div className="side-card">
              <div className="filter-section-label">Similar puzzles ({puzzle.themes[0]})</div>
              <div className="similar-puzzle-list">
                {similarPuzzles.map((p) => (
                  <button
                    key={p.id}
                    className="similar-puzzle-item"
                    onClick={() => onSelectPuzzle?.(p)}
                    type="button"
                  >
                    <span className="similar-puzzle-rating">{p.rating}</span>
                    <span className="similar-puzzle-themes">{p.themes.slice(0, 3).join(', ')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
