import { useRef, useEffect, useState } from 'react'
import { Renderer, Program, Mesh, Triangle, Color } from 'ogl'
import './SpecularButton.css'

const PAD = 20

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform vec2 uHalfSize;
uniform float uRadius;
uniform float uAngle;
uniform float uPx;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uShineSize;
uniform float uShineFade;
uniform float uThickness;
uniform float uBaseWidth;

out vec4 fragColor;

float sdRoundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float shapeSDF(vec2 p) { return sdRoundedRect(p, uHalfSize, uRadius); }

float gaussianLine(float d, float sigma) {
  float x = d / (sigma + 1e-6);
  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));
  return exp(-k * x * x);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = shapeSDF(p);
  vec2 L = vec2(cos(uAngle), sin(uAngle));

  // Dark base stroke hugging the edge for a sense of thickness
  float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * 0.45;

  // Symmetric specular: the edges facing toward/away from the light both
  // catch a streak. The angular window (size + fade) is measured with an
  // elliptical normal so it varies continuously along straight edges.
  vec2 nEll = normalize(p / (uHalfSize * uHalfSize) + 1e-6);
  float phi = acos(clamp(abs(dot(nEll, L)), 0.0, 1.0));
  float rim = 1.0 - smoothstep(uShineSize - uShineFade, uShineSize + uShineFade + 1e-4, phi);
  float line = gaussianLine(d, uThickness);
  float edgeClamp = 1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d));
  float hi = line * rim * edgeClamp * uIntensity;

  vec3 col = uBaseColor * base + uLineColor * hi;
  float a = clamp(base + hi, 0.0, 1.0);
  fragColor = vec4(col, a);
}
`

interface SpecularButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  radius?: number
  tint?: string
  tintOpacity?: number
  blur?: number
  textColor?: string
  lineColor?: string
  baseColor?: string
  intensity?: number
  shineSize?: number
  shineFade?: number
  thickness?: number
  speed?: number
  followMouse?: boolean
  proximity?: number
  autoAnimate?: boolean
}

const SpecularButton = ({
  children = 'Get Started',
  size = 'lg',
  radius = 18,
  tint = '#ffffff',
  tintOpacity = 0,
  blur = 0,
  textColor = '#f5f5f5',
  lineColor = '#ffffff',
  baseColor = '#525252',
  intensity = 1,
  shineSize = 10,
  shineFade = 40,
  thickness = 1,
  speed = 0.35,
  followMouse = true,
  proximity = 250,
  autoAnimate = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  tabIndex,
  'aria-hidden': ariaHidden,
  'aria-label': ariaLabel,
  ...rest
}: SpecularButtonProps): React.JSX.Element => {
  const btnRef = useRef<HTMLButtonElement>(null)
  const fxRef = useRef<HTMLSpanElement>(null)
  const propsRef = useRef<Record<string, unknown>>({})
  const [isFallback, setIsFallback] = useState(false)

  // keep latest props for rAF without re-subscribing; assignment during render is intentional
  // eslint-disable-next-line
  propsRef.current = {
    radius,
    lineColor,
    baseColor,
    intensity,
    shineSize,
    shineFade,
    thickness,
    speed,
    followMouse,
    proximity,
    autoAnimate
  }

  useEffect((): (() => void) | void => {
    const btn = btnRef.current
    const fx = fxRef.current
    if (!btn || !fx) return undefined

    // prefers-reduced-motion: freeze animation, show static sheen
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
    // quick WebGL probe — if no context, fall back to pure CSS rim
    let probeCanvas: HTMLCanvasElement | null = null
    try {
      probeCanvas = document.createElement('canvas')
      const hasGL =
        !!probeCanvas.getContext('webgl2') || !!probeCanvas.getContext('webgl') || !!probeCanvas.getContext('experimental-webgl')
      if (!hasGL) {
        setIsFallback(true)
        return undefined
      }
    } catch {
      setIsFallback(true)
      return undefined
    } finally {
      probeCanvas = null
    }

    let renderer: InstanceType<typeof Renderer> | null = null
    let gl: WebGL2RenderingContext | null = null
    let program: InstanceType<typeof Program> | null = null
    let mesh: InstanceType<typeof Mesh> | null = null
    let ro: ResizeObserver | null = null
    let raf = 0
    let cleanupPointer: (() => void) | null = null

    try {
      const dpr = window.devicePixelRatio || 1
      renderer = new Renderer({
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
        dpr
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gl = (renderer as any).gl as WebGL2RenderingContext
      if (!gl || typeof gl.clearColor !== 'function') throw new Error('no-gl')
      gl.clearColor(0, 0, 0, 0)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geometry: any = new Triangle(gl as any)
      if ((geometry.attributes as Record<string, unknown>).uv) {
        delete (geometry.attributes as Record<string, unknown>).uv
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      program = new Program(gl as any, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          uCenter: { value: [0, 0] },
          uHalfSize: { value: [1, 1] },
          uRadius: { value: 0 },
          uAngle: { value: 2.4 },
          uPx: { value: dpr },
          uLineColor: { value: [1, 1, 1] },
          uBaseColor: { value: [0.32, 0.32, 0.32] },
          uIntensity: { value: 1 },
          uShineSize: { value: 0.17 },
          uShineFade: { value: 0.7 },
          uThickness: { value: 1 },
          uBaseWidth: { value: dpr }
        }
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mesh = new Mesh(gl as any, { geometry, program })
      fx.appendChild(gl.canvas as unknown as HTMLCanvasElement)

      const sizeRef = { w: 1, h: 1 }
      const resize = (): void => {
        if (!renderer || !program || !btn) return
        const rect = btn.getBoundingClientRect()
        const w = rect.width
        const h = rect.height
        sizeRef.w = w
        sizeRef.h = h
        renderer.setSize(w + PAD * 2, h + PAD * 2)
        ;(program.uniforms.uCenter as { value: number[] }).value = [
          (PAD + w / 2) * dpr,
          (PAD + h / 2) * dpr
        ]
        ;(program.uniforms.uHalfSize as { value: number[] }).value = [(w / 2) * dpr, (h / 2) * dpr]
      }
      ro = new ResizeObserver(resize)
      ro.observe(btn)
      resize()

      let pointerAngle: number | null = null
      let proximityT = 0
      const onPointerMove = (e: PointerEvent): void => {
        if (prefersReduced) return
        const rect = btn.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right)
        const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom)
        const dist = Math.hypot(dx, dy)
        if (dist === 0) {
          const nx = (e.clientX - cx) / (rect.width / 2)
          const ny = (cy - e.clientY) / (rect.height / 2)
          pointerAngle = Math.atan2(2 / rect.height, -2 / rect.width) + nx * 0.3 + ny * 0.15
        } else {
          pointerAngle = Math.atan2(cy - e.clientY, e.clientX - cx)
        }
        const prox = propsRef.current.proximity as number
        const t = Math.max(0, 1 - dist / Math.max(prox, 1))
        proximityT = t * t * (3 - 2 * t)
      }
      window.addEventListener('pointermove', onPointerMove)
      cleanupPointer = () => window.removeEventListener('pointermove', onPointerMove)

      let angle = 2.4
      let idleAngle = 2.4
      let bright = 0
      let last = performance.now()

      const lineC = new Color()
      const baseC = new Color()

      const update = (now: number): void => {
        raf = requestAnimationFrame(update)
        const dt = Math.min((now - last) / 1000, 0.05)
        last = now
        const p = propsRef.current as {
          radius: number
          lineColor: string
          baseColor: string
          intensity: number
          shineSize: number
          shineFade: number
          thickness: number
          speed: number
          followMouse: boolean
          proximity: number
          autoAnimate: boolean
        }

        if (!prefersReduced) idleAngle += p.speed * dt
        const steer = !prefersReduced && p.followMouse && pointerAngle != null && (!p.autoAnimate || proximityT > 0)
        const target = steer ? (pointerAngle as number) : idleAngle
        const diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
        // snap quickly if reduced motion, otherwise smooth
        angle += diff * (prefersReduced ? 1 : 1 - Math.exp(-dt * 7))

        const brightTarget = p.autoAnimate ? 1 : prefersReduced ? 0.65 : proximityT
        if (prefersReduced) bright = brightTarget
        else bright += (brightTarget - bright) * (1 - Math.exp(-dt * 8))

        if (!program || !renderer || !mesh) return
        lineC.set(p.lineColor)
        baseC.set(p.baseColor)
        ;(program.uniforms.uAngle as { value: number }).value = angle
        ;(program.uniforms.uRadius as { value: number }).value =
          Math.min(p.radius, Math.min(sizeRef.w, sizeRef.h) / 2) * dpr
        ;(program.uniforms.uLineColor as { value: number[] }).value = [lineC.r, lineC.g, lineC.b]
        ;(program.uniforms.uBaseColor as { value: number[] }).value = [baseC.r, baseC.g, baseC.b]
        ;(program.uniforms.uIntensity as { value: number }).value = p.intensity * bright
        ;(program.uniforms.uShineSize as { value: number }).value = (p.shineSize * Math.PI) / 180
        ;(program.uniforms.uShineFade as { value: number }).value = (p.shineFade * Math.PI) / 180
        ;(program.uniforms.uThickness as { value: number }).value = p.thickness * dpr
        renderer.render({ scene: mesh })
      }
      raf = requestAnimationFrame(update)

      return () => {
        cancelAnimationFrame(raf)
        ro?.disconnect()
        cleanupPointer?.()
        if (gl && fx.contains(gl.canvas as unknown as Node)) fx.removeChild(gl.canvas as unknown as Node)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(gl?.getExtension('WEBGL_lose_context') as any)?.loseContext()
      }
    } catch {
      // any WebGL/init failure → graceful CSS fallback (no throw)
      setIsFallback(true)
      if (ro) ro.disconnect()
      if (cleanupPointer) cleanupPointer()
      if (raf) cancelAnimationFrame(raf)
      try {
        if (gl && fx.contains(gl.canvas as unknown as Node)) fx.removeChild(gl.canvas as unknown as Node)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(gl?.getExtension('WEBGL_lose_context') as any)?.loseContext()
      } catch {
        // ignore
      }
      return undefined
    }
    return undefined
  }, [])

  const fallbackClass = isFallback ? ' specular-button--fallback' : ''
  const sizeClass = ` specular-button--${size}`

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      className={`specular-button${sizeClass}${fallbackClass}${className ? ` ${className}` : ''}`}
      style={
        {
          '--sb-radius': `${radius}px`,
          '--sb-tint': tint,
          '--sb-tint-opacity': tintOpacity,
          '--sb-blur': `${blur}px`,
          '--sb-text-color': textColor
        } as React.CSSProperties
      }
      {...rest}
    >
      <span ref={fxRef} className="specular-button__fx" aria-hidden="true" />
      <span className="specular-button__label">{children}</span>
    </button>
  )
}

export default SpecularButton
