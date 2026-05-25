import { useRef, useState } from 'react'
import { useGame } from './useGame'

const isMobile = () =>
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  ('ontouchstart' in window)

// ─── Start Screen ─────────────────────────────────────────────────────────

function StartScreen({ onStart }: { onStart: (name: string) => void }) {
  const [name, setName] = useState('')
  const mobile = isMobile()

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Arial, sans-serif', color: '#fff',
      zIndex: 100,
      padding: '0 24px',
    }}>
      <h1 style={{
        fontSize: mobile ? 56 : 72,
        fontWeight: 900,
        background: 'linear-gradient(135deg, #e74c3c, #f39c12)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: 8,
        letterSpacing: '-2px',
      }}>
        AGARIO
      </h1>
      <p style={{ color: '#aaa', marginBottom: 36, fontSize: 16 }}>
        Spis eller bli spist
      </p>

      <input
        autoFocus={!mobile}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onStart(name)}
        placeholder="Ditt navn..."
        maxLength={16}
        style={{
          padding: '14px 24px',
          fontSize: 18,
          borderRadius: 40,
          border: 'none',
          outline: 'none',
          background: 'rgba(255,255,255,0.1)',
          color: '#fff',
          width: '100%',
          maxWidth: 300,
          textAlign: 'center',
          marginBottom: 20,
          boxShadow: '0 0 0 2px rgba(231,76,60,0.5)',
        }}
      />

      <button
        onClick={() => onStart(name)}
        style={{
          padding: '16px 56px',
          fontSize: mobile ? 20 : 18,
          fontWeight: 700,
          borderRadius: 40,
          border: 'none',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(231,76,60,0.5)',
          marginBottom: 40,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        SPILL
      </button>

      {mobile ? (
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          padding: '16px 24px',
          fontSize: 14, color: '#bbb',
          lineHeight: 2,
          textAlign: 'center',
        }}>
          <b style={{ color: '#fff' }}>Kontroller:</b><br />
          Dra fingeren — beveg cellen<br />
          <b style={{ color: '#4d96ff' }}>SPLIT</b> — del deg i to<br />
          <b style={{ color: '#2ecc71' }}>EJECT</b> — sleng ut masse
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          padding: '16px 28px',
          fontSize: 14, color: '#bbb',
          lineHeight: 1.8,
        }}>
          <b style={{ color: '#fff' }}>Kontroller:</b><br />
          Mus &nbsp;— beveg cellen<br />
          <kbd style={kbdStyle}>Space</kbd> &nbsp;— del deg i to<br />
          <kbd style={kbdStyle}>W</kbd> &nbsp;— sleng ut masse
        </div>
      )}
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)',
  padding: '1px 7px',
  borderRadius: 5,
  fontSize: 12,
  fontFamily: 'monospace',
}

// ─── Death Screen ─────────────────────────────────────────────────────────

function DeathScreen({ score, onRestart }: { score: number; onRestart: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Arial, sans-serif', color: '#fff',
      zIndex: 100,
    }}>
      <h2 style={{ fontSize: 52, fontWeight: 900, marginBottom: 8, color: '#e74c3c' }}>DU DØDE</h2>
      <p style={{ fontSize: 22, marginBottom: 36, color: '#aaa' }}>
        Poeng: <b style={{ color: '#f1c40f' }}>{score}</b>
      </p>
      <button
        onClick={onRestart}
        style={{
          padding: '16px 56px',
          fontSize: 20, fontWeight: 700,
          borderRadius: 40, border: 'none',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(231,76,60,0.5)',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        PRØV IGJEN
      </button>
    </div>
  )
}

// ─── HUD ──────────────────────────────────────────────────────────────────

function HUD({ score, cellCount }: { score: number; cellCount: number }) {
  return (
    <div style={{
      position: 'fixed', bottom: 16, left: 16,
      fontFamily: 'Arial, sans-serif',
      color: '#fff',
      userSelect: 'none',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.55)',
        borderRadius: 10, padding: '10px 18px',
        fontSize: 15, lineHeight: 1.7,
      }}>
        <div>Poeng: <b style={{ color: '#f1c40f' }}>{score}</b></div>
        {cellCount > 1 && <div style={{ color: '#aaa' }}>Celler: {cellCount}</div>}
      </div>
    </div>
  )
}

// ─── Mobile action buttons ────────────────────────────────────────────────

function MobileControls({
  onSplit,
  onEject,
}: {
  onSplit: () => void
  onEject: () => void
}) {
  const btnBase: React.CSSProperties = {
    position: 'fixed',
    bottom: 24,
    width: 72,
    height: 72,
    borderRadius: '50%',
    border: 'none',
    fontWeight: 900,
    fontSize: 13,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 2,
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    zIndex: 50,
    touchAction: 'manipulation',
  }

  return (
    <>
      {/* Split — bottom right */}
      <button
        onTouchStart={e => { e.preventDefault(); onSplit() }}
        onClick={onSplit}
        style={{
          ...btnBase,
          right: 24,
          background: 'linear-gradient(135deg, #4d96ff, #1971c2)',
          color: '#fff',
        }}
      >
        <span style={{ fontSize: 22 }}>✂</span>
        <span>SPLIT</span>
      </button>

      {/* Eject — bottom right, above split */}
      <button
        onTouchStart={e => { e.preventDefault(); onEject() }}
        onClick={onEject}
        style={{
          ...btnBase,
          right: 24,
          bottom: 112,
          background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
          color: '#fff',
        }}
      >
        <span style={{ fontSize: 22 }}>💨</span>
        <span>EJECT</span>
      </button>
    </>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [started, setStarted] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mobile = isMobile()

  const { state, dead, restart, doSplit, doEject } = useGame(canvasRef, playerName)

  const handleStart = (name: string) => {
    setPlayerName(name || 'Spiller')
    setStarted(true)
  }

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {!started && <StartScreen onStart={handleStart} />}
      {started && dead && <DeathScreen score={state.score} onRestart={() => restart(playerName)} />}
      {started && !dead && (
        <>
          <HUD score={state.score} cellCount={state.playerCells.length} />
          {mobile && <MobileControls onSplit={doSplit} onEject={doEject} />}
        </>
      )}
    </>
  )
}
