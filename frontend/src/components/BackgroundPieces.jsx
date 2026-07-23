import { useMemo } from 'react'

const GLYPHS = ['♟', '♞', '♝', '♜', '♛', '♚']

// Seeded once per mount so pieces don't jump around on re-render.
function generatePieces(count) {
  const pieces = []
  for (let i = 0; i < count; i++) {
    pieces.push({
      glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: 32 + Math.random() * 64, // px
      duration: 3 + Math.random() * 4, // seconds
      delay: Math.random() * -7, // negative = start mid-animation, staggers them
    })
  }
  return pieces
}

export default function BackgroundPieces({ count = 28 }) {
  const pieces = useMemo(() => generatePieces(count), [count])

  return (
    <div className="bg-ambient" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="bg-piece"
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.glyph}
        </span>
      ))}
    </div>
  )
}
