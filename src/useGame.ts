import { useCallback, useEffect, useRef, useState } from 'react'
import { ejectMass, initialState, splitPlayerCells, tick } from './gameLogic'
import { Camera, computeCamera, render, screenToWorld } from './renderer'
import { GameState } from './types'

export function useGame(canvasRef: React.RefObject<HTMLCanvasElement | null>, playerName: string) {
  const stateRef = useRef<GameState>(initialState(playerName))
  const mouseRef = useRef({ x: 0, y: 0 })
  const camRef = useRef<Camera>({ x: 2000, y: 2000, zoom: 1 })
  const rafRef = useRef<number>(0)
  const [, forceRender] = useState(0)
  const [dead, setDead] = useState(false)

  const restart = useCallback((name: string) => {
    stateRef.current = initialState(name)
    setDead(false)
  }, [])

  // Exposed so mobile buttons can trigger these
  const doSplit = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const state = stateRef.current
    if (state.dead) return
    const { wx, wy } = screenToWorld(mouseRef.current.x, mouseRef.current.y, camRef.current, canvas)
    stateRef.current = { ...state, playerCells: splitPlayerCells(state.playerCells, wx, wy) }
  }, [canvasRef])

  const doEject = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const state = stateRef.current
    if (state.dead) return
    const { wx, wy } = screenToWorld(mouseRef.current.x, mouseRef.current.y, camRef.current, canvas)
    const { cells, food } = ejectMass(state.playerCells, state.food, wx, wy)
    stateRef.current = { ...state, playerCells: cells, food }
  }, [canvasRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      // Default mouse to center so cell doesn't rush off-screen on load
      mouseRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    }
    resize()
    window.addEventListener('resize', resize)

    // ── Mouse ──────────────────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); doSplit() }
      if (e.code === 'KeyW')  { e.preventDefault(); doEject() }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)

    // ── Touch ──────────────────────────────────────────────────────────────
    // We track the FIRST touch for movement. Additional touches are ignored
    // here — split/eject are handled by React button elements.
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length > 0) {
        mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length > 0) {
        mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }

    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })

    // ── Game loop ──────────────────────────────────────────────────────────
    const ctx = canvas.getContext('2d')!
    let frameCount = 0

    const loop = () => {
      frameCount++
      const state = stateRef.current
      const { wx, wy } = screenToWorld(mouseRef.current.x, mouseRef.current.y, camRef.current, canvas)

      const { state: newState } = tick({ state, mouseWorldX: wx, mouseWorldY: wy })
      stateRef.current = newState

      const targetCam = computeCamera(newState.playerCells, canvas)
      const lerpFactor = 0.08
      camRef.current = {
        x: camRef.current.x + (targetCam.x - camRef.current.x) * lerpFactor,
        y: camRef.current.y + (targetCam.y - camRef.current.y) * lerpFactor,
        zoom: camRef.current.zoom + (targetCam.zoom - camRef.current.zoom) * lerpFactor,
      }

      render(ctx, canvas, newState, camRef.current)

      if (frameCount % 10 === 0) forceRender(n => n + 1)

      if (newState.dead) { setDead(true); return }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchstart', onTouchStart)
    }
  }, [canvasRef, playerName, doSplit, doEject])

  return { state: stateRef.current, dead, restart, doSplit, doEject }
}
