import { useCallback, useEffect, useRef, useState } from 'react'
import { ejectMass, initialState, splitPlayerCells, tick } from './gameLogic'
import { Camera, computeCamera, render, screenToWorld } from './renderer'
import { GameState, MovementInput } from './types'

const MOBILE_MOVE_DISTANCE = 180
const MOBILE_ACTION_DISTANCE = 220

function screenCenter(canvas: HTMLCanvasElement) {
  return { x: canvas.width / 2, y: canvas.height / 2 }
}

export function useGame(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  playerName: string,
  movementInput: MovementInput,
  isMobile: boolean,
) {
  const stateRef = useRef<GameState>(initialState(playerName))
  const mouseRef = useRef({ x: 0, y: 0 })
  const camRef = useRef<Camera>({ x: 2000, y: 2000, zoom: 1 })
  const movementInputRef = useRef(movementInput)
  const lastAimRef = useRef({ x: 1, y: 0 })
  const rafRef = useRef<number>(0)
  const [, forceRender] = useState(0)
  const [dead, setDead] = useState(false)

  useEffect(() => {
    movementInputRef.current = movementInput
    if (movementInput.intensity > 0.01) {
      lastAimRef.current = { x: movementInput.x, y: movementInput.y }
    }
  }, [movementInput])

  const restart = useCallback((name: string) => {
    stateRef.current = initialState(name)
    setDead(false)
  }, [])

  const getTargetWorld = useCallback((mode: 'move' | 'action') => {
    const canvas = canvasRef.current
    if (!canvas) return null

    let targetScreen = mouseRef.current
    if (isMobile) {
      const center = screenCenter(canvas)
      const input = movementInputRef.current

      if (mode === 'move') {
        if (input.intensity <= 0.01) {
          targetScreen = center
        } else {
          const distance = input.intensity * MOBILE_MOVE_DISTANCE
          targetScreen = {
            x: center.x + input.x * distance,
            y: center.y + input.y * distance,
          }
        }
      } else {
        const aim = input.intensity > 0.01
          ? { x: input.x, y: input.y }
          : lastAimRef.current
        targetScreen = {
          x: center.x + aim.x * MOBILE_ACTION_DISTANCE,
          y: center.y + aim.y * MOBILE_ACTION_DISTANCE,
        }
      }
    }

    return screenToWorld(targetScreen.x, targetScreen.y, camRef.current, canvas)
  }, [canvasRef, isMobile])

  // Exposed so mobile buttons can trigger these
  const doSplit = useCallback(() => {
    const state = stateRef.current
    if (state.dead) return
    const target = getTargetWorld('action')
    if (!target) return
    const { wx, wy } = target
    stateRef.current = { ...state, playerCells: splitPlayerCells(state.playerCells, wx, wy) }
  }, [getTargetWorld])

  const doEject = useCallback(() => {
    const state = stateRef.current
    if (state.dead) return
    const target = getTargetWorld('action')
    if (!target) return
    const { wx, wy } = target
    const { cells, food } = ejectMass(state.playerCells, state.food, wx, wy)
    stateRef.current = { ...state, playerCells: cells, food }
  }, [getTargetWorld])

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

    if (!isMobile) {
      canvas.addEventListener('touchmove', onTouchMove, { passive: false })
      canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    }

    // ── Game loop ──────────────────────────────────────────────────────────
    const ctx = canvas.getContext('2d')!
    let frameCount = 0

    const loop = () => {
      frameCount++
      const state = stateRef.current
      const target = getTargetWorld('move')
      if (!target) return
      const { wx, wy } = target

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
      if (!isMobile) {
        canvas.removeEventListener('touchmove', onTouchMove)
        canvas.removeEventListener('touchstart', onTouchStart)
      }
    }
  }, [canvasRef, playerName, doSplit, doEject, getTargetWorld, isMobile])

  return { state: stateRef.current, dead, restart, doSplit, doEject }
}
