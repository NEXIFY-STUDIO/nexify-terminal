"use client"

if (typeof window !== "undefined") {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === "string") {
      if (args[0].includes("THREE.Clock") || args[0].includes("WebGLRenderer")) {
        return;
      }
    }
    originalWarn(...args);
  };
}

import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

function DottedSphere({ radius = 1.2, dotCount = 350, dotSize = 0.035, isTyping = false, keystrokeTrigger = 0 }) {
  const instancedRef = useRef<THREE.InstancedMesh>(null)
  const progressRef = useRef(0)
  const lastKeystrokeRef = useRef(keystrokeTrigger)
  const keystrokeImpulseRef = useRef(0)
  const ringVelocityRef = useRef(0.8)
  const currentRotationRef = useRef(0)

  // Use a shared Object3D instance to calculate instanced matrix transforms off-screen
  const tempObject = useMemo(() => new THREE.Object3D(), [])

  // Pre-calculate both Sphere and Dual Orbital Ring positions for smooth morphing
  const dots = useMemo(() => {
    const spherePositions: [number, number, number][] = []
    const ringPositions: [number, number, number][] = []
    const ringIds: number[] = [] // 0 for Ring A, 1 for Ring B
    
    const phiAngle = Math.PI * (3 - Math.sqrt(5)) // golden angle for sphere distribution

    for (let i = 0; i < dotCount; i++) {
      // 1. Sphere positions
      const y = 1 - (i / (dotCount - 1)) * 2
      const radiusAtY = Math.sqrt(1 - y * y)
      const theta = phiAngle * i
      const sx = Math.cos(theta) * radiusAtY * radius
      const sy = y * radius
      const sz = Math.sin(theta) * radiusAtY * radius
      spherePositions.push([sx, sy, sz])

      // 2. Dual Concentric Orbital Ring positions
      const alpha = (i / dotCount) * Math.PI * 2
      const ringRadius = radius * 1.15
      const inclination = 0.45 // ~25 degree inclination for gyroscopic look
      
      const isRingA = i % 2 === 0
      ringIds.push(isRingA ? 0 : 1)

      if (isRingA) {
        // Ring A: inclined left-to-right
        const rx = Math.cos(alpha) * ringRadius
        const ry = Math.sin(alpha) * ringRadius * Math.sin(inclination)
        const rz = Math.sin(alpha) * ringRadius * Math.cos(inclination)
        ringPositions.push([rx, ry, rz])
      } else {
        // Ring B: inclined right-to-left
        const rx = Math.cos(alpha) * ringRadius
        const ry = -Math.sin(alpha) * ringRadius * Math.sin(inclination)
        const rz = Math.sin(alpha) * ringRadius * Math.cos(inclination)
        ringPositions.push([rx, ry, rz])
      }
    }

    return { spherePositions, ringPositions, ringIds }
  }, [radius, dotCount])

  useFrame((state, delta) => {
    // Check if keystroke triggered
    if (keystrokeTrigger !== lastKeystrokeRef.current) {
      lastKeystrokeRef.current = keystrokeTrigger
      if (isTyping) {
        keystrokeImpulseRef.current = 1.0
        ringVelocityRef.current = 2.8 // spin burst
      }
    }

    // Decay physics
    keystrokeImpulseRef.current += (0 - keystrokeImpulseRef.current) * 7.5 * delta
    if (keystrokeImpulseRef.current < 0) keystrokeImpulseRef.current = 0

    const targetVelocity = isTyping ? 0.8 : 0.4
    ringVelocityRef.current += (targetVelocity - ringVelocityRef.current) * 5.0 * delta
    currentRotationRef.current += ringVelocityRef.current * delta

    const target = isTyping ? 1 : 0
    // Smooth lerp transition (approx 1s duration)
    progressRef.current += (target - progressRef.current) * 2.2 * delta
    if (progressRef.current > 1) progressRef.current = 1
    if (progressRef.current < 0) progressRef.current = 0

    const t = progressRef.current
    const impulse = keystrokeImpulseRef.current

    if (instancedRef.current) {
      // Sphere base rotation (only active when not typing)
      const sphereRotSpeed = 0.08 * (1 - t)
      instancedRef.current.rotation.y += delta * sphereRotSpeed
      instancedRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.1 * (1 - t)

      const basePulse = isTyping ? (1 + Math.sin(state.clock.elapsedTime * 8) * 0.15) : 1
      const pulse = basePulse + impulse * 0.35

      // Precompute rotation factors for the dual rings outside the loop to save Math.cos/Math.sin overhead
      const rot = currentRotationRef.current
      const cosRot = Math.cos(rot)
      const sinRot = Math.sin(rot)

      // GPU matrix transformations for instanced rendering
      for (let i = 0; i < dotCount; i++) {
        const sPos = dots.spherePositions[i]
        const rPos = dots.ringPositions[i]
        const ringId = dots.ringIds[i]
        if (!sPos || !rPos) continue

        // Rotate ring coordinates around Y-axis in 3D space
        // ringId === 0 is rot (angleOffset), ringId === 1 is -rot (-angleOffset)
        let rxRot: number
        let rzRot: number
        if (ringId === 0) {
          rxRot = rPos[0] * cosRot - rPos[2] * sinRot
          rzRot = rPos[0] * sinRot + rPos[2] * cosRot
        } else {
          rxRot = rPos[0] * cosRot + rPos[2] * sinRot
          rzRot = -rPos[0] * sinRot + rPos[2] * cosRot
        }
        const ryRot = rPos[1]

        // Linearly interpolate between sphere and spinning gyroscopic ring position
        const px = sPos[0] * (1 - t) + rxRot * t
        const py = sPos[1] * (1 - t) + ryRot * t
        const pz = sPos[2] * (1 - t) + rzRot * t

        tempObject.position.set(px, py, pz)
        tempObject.scale.setScalar(pulse)
        tempObject.updateMatrix()

        // Push transformation matrix to shader attribute
        instancedRef.current.setMatrixAt(i, tempObject.matrix)
      }
      
      // Notify Three.js renderer that the instanced coordinates changed
      instancedRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={instancedRef} args={[null as any, null as any, dotCount]}>
      {/* Lower segments count (4, 3 instead of 5, 5) for extra performance */}
      <sphereGeometry args={[dotSize, 4, 3]} />
      {/* Extremely fast basic material instead of standard PBR to eliminate lighting math */}
      <meshBasicMaterial
        color="#ffffff"
        transparent={true}
        opacity={0.85}
      />
    </instancedMesh>
  )
}

function GlowingCore({ isTyping = false, keystrokeTrigger = 0 }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const progressRef = useRef(0)
  const lastKeystrokeRef = useRef(keystrokeTrigger)
  const keystrokeImpulseRef = useRef(0)

  useFrame((state, delta) => {
    if (keystrokeTrigger !== lastKeystrokeRef.current) {
      lastKeystrokeRef.current = keystrokeTrigger
      if (isTyping) {
        keystrokeImpulseRef.current = 1.0
      }
    }

    keystrokeImpulseRef.current += (0 - keystrokeImpulseRef.current) * 7.5 * delta
    if (keystrokeImpulseRef.current < 0) keystrokeImpulseRef.current = 0

    const target = isTyping ? 1 : 0
    progressRef.current += (target - progressRef.current) * 2.2 * delta
    if (progressRef.current > 1) progressRef.current = 1
    if (progressRef.current < 0) progressRef.current = 0

    const t = progressRef.current
    const impulse = keystrokeImpulseRef.current

    if (meshRef.current) {
      const pulseSpeed = isTyping ? 8 : 1.5
      const pulse = 1 + Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.03
      const targetScale = isTyping ? 0.55 : 1.0
      const currentScale = 1 * (1 - t) + (targetScale + impulse * 0.2) * t
      const scale = pulse * currentScale
      meshRef.current.scale.set(scale, scale, scale)
      
      const material = meshRef.current.material as THREE.MeshBasicMaterial
      if (material) {
        // Animate opacity instead of emissiveIntensity for BasicMaterial
        material.opacity = 0.7 * (1 - t) + (0.95 + impulse * 0.05) * t
      }
    }
  })

  return (
    <mesh ref={meshRef}>
      {/* Lower segments count (12 instead of 16) for efficiency */}
      <sphereGeometry args={[0.15, 12, 12]} />
      {/* Extremely fast basic material instead of standard PBR */}
      <meshBasicMaterial
        color="#ffffff"
        transparent={true}
        opacity={0.7}
      />
    </mesh>
  )
}

function Scene({ isTyping = false, keystrokeTrigger = 0 }) {
  return (
    <group position={[0, 0.45, 0]}>
      {/* Basic materials do not need point lights at all, saving massive pixel shading overhead */}
      <ambientLight intensity={1.0} />

      <GlowingCore isTyping={isTyping} keystrokeTrigger={keystrokeTrigger} />
      <DottedSphere radius={1.2} dotCount={350} dotSize={0.035} isTyping={isTyping} keystrokeTrigger={keystrokeTrigger} />
    </group>
  )
}

interface ParticleOrbProps {
  isTyping?: boolean;
  keystrokeTrigger?: number;
}

export function ParticleOrb({ isTyping = false, keystrokeTrigger = 0 }: ParticleOrbProps) {
  return (
    <div 
      className="w-full max-w-[650px] h-[550px] relative flex items-center justify-center pointer-events-none"
      style={{
        WebkitMaskImage: 'radial-gradient(circle at center, rgba(0, 0, 0, 1) 30%, rgba(0, 0, 0, 0) 85%)',
        maskImage: 'radial-gradient(circle at center, rgba(0, 0, 0, 1) 30%, rgba(0, 0, 0, 0) 85%)'
      }}
    >
      <div className="absolute inset-[20%] bg-gradient-radial from-white/10 via-white/2 to-transparent rounded-full blur-3xl pointer-events-none" />
      <Canvas
        camera={{ position: [0, 0, 6.0], fov: 45 }}
        style={{ background: "transparent", width: '100%', height: '100%' }}
        gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
        dpr={1.5}
      >
        <Scene isTyping={isTyping} keystrokeTrigger={keystrokeTrigger} />
      </Canvas>
    </div>
  )
}
