import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { buildBug, disposeObject } from '../character/buildBug'
import './CharacterPage.css'

interface CharacterPageProps {
  onBack: () => void
}

// The player's character on a pedestal, like a game lobby: drag to turn it, scroll to zoom.
// It turns slowly on its own until the player grabs it.
function CharacterPage({ onBack }: CharacterPageProps) {
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = stage.current
    if (!container) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    camera.position.set(0, 2.3, 6.6)

    // Soft fill from above, a warm key light that casts the shadow, and a cyan rim light from behind
    scene.add(new THREE.HemisphereLight('#dfefff', '#0d1b26', 1.4))
    const key = new THREE.DirectionalLight('#fff4e6', 2.4)
    key.position.set(3, 6, 4)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -3
    key.shadow.camera.right = 3
    key.shadow.camera.top = 4
    key.shadow.camera.bottom = -1
    scene.add(key)
    const rim = new THREE.DirectionalLight('#22d3ee', 2)
    rim.position.set(-3, 3, -5)
    scene.add(rim)

    // Pedestal with a glowing cyan edge
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.4, 0.18, 64),
      new THREE.MeshStandardMaterial({ color: '#12293a', roughness: 0.5, metalness: 0.3 }),
    )
    pedestal.position.y = -0.09
    pedestal.receiveShadow = true
    scene.add(pedestal)
    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.025, 12, 96),
      new THREE.MeshStandardMaterial({ color: '#22d3ee', emissive: '#22d3ee', emissiveIntensity: 2 }),
    )
    glow.rotation.x = Math.PI / 2
    glow.position.y = 0.0
    scene.add(glow)

    const bug = buildBug()
    scene.add(bug)

    const controls = new OrbitControls(camera, renderer.domElement)
    // Middle of the whole figure, from the pedestal to the antenna tips
    controls.target.set(0, 1.6, 0)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 3.5
    controls.maxDistance = 9
    // Keep the camera above the floor and not straight overhead
    controls.minPolarAngle = 0.35
    controls.maxPolarAngle = Math.PI / 2 - 0.05
    controls.autoRotate = !reduceMotion
    controls.autoRotateSpeed = 1.6
    controls.update()

    // Grabbing the character stops the slow turn; it starts again a few seconds after letting go
    let resumeTimer: number | undefined
    const stopTurning = () => {
      window.clearTimeout(resumeTimer)
      controls.autoRotate = false
    }
    const resumeTurning = () => {
      if (reduceMotion) return
      resumeTimer = window.setTimeout(() => {
        controls.autoRotate = true
      }, 3000)
    }
    controls.addEventListener('start', stopTurning)
    controls.addEventListener('end', resumeTurning)

    function resize() {
      if (!container) return
      const { clientWidth, clientHeight } = container
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / Math.max(clientHeight, 1)
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)

    const clock = new THREE.Clock()
    let frame = 0
    function render() {
      frame = requestAnimationFrame(render)
      // A gentle idle bob, like a character breathing in the lobby
      if (!reduceMotion) bug.position.y = Math.sin(clock.getElapsedTime() * 2) * 0.03
      controls.update()
      renderer.render(scene, camera)
    }
    render()

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(resumeTimer)
      observer.disconnect()
      controls.dispose()
      disposeObject(scene)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <main className="character">
      <header className="character-header">
        <button type="button" className="character-back" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Back to profile
        </button>
        <span className="character-logo">DevBrawl</span>
      </header>

      <section className="character-content" aria-labelledby="character-title">
        <h1 id="character-title" className="character-title">
          Your character
        </h1>
        <div
          ref={stage}
          className="character-stage"
          role="img"
          aria-label="3D model of the DevBrawl bug in a grey DEV_BUG hoodie, standing on a pedestal"
        />
        <p className="character-hint">
          <i className="ti ti-hand-move" aria-hidden="true" />
          Drag to turn · Scroll to zoom
        </p>
      </section>
    </main>
  )
}

export default CharacterPage
