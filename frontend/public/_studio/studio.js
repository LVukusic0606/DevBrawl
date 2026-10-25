// Temporary studio: renders 3D costume pieces in three.js and composites them onto the recolored bug faces.
// Coordinates are image pixels of the 256px avatar (x right, y down); P() turns them into world units.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const SIZE = 512
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(1)
renderer.setSize(SIZE, SIZE)
renderer.setClearColor(0x000000, 0)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
const envMap = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture

const camera = new THREE.OrthographicCamera(-128, 128, 128, -128, -3000, 3000)
camera.position.set(0, 0, 1500)

const P = (x, y, z = 0) => new THREE.Vector3(x - 128, 128 - y, z)
const D = THREE.DoubleSide

function makeScene() {
  const scene = new THREE.Scene()
  scene.environment = envMap
  scene.environmentIntensity = 0.55
  const key = new THREE.DirectionalLight('#fff1dc', 2.4)
  key.position.set(-300, 500, 600)
  scene.add(key)
  const fill = new THREE.DirectionalLight('#dde8ff', 0.7)
  fill.position.set(400, 50, 300)
  scene.add(fill)
  scene.add(new THREE.HemisphereLight('#ffffff', '#4a4a4a', 0.55))
  return scene
}

const mat = (color, options = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, side: D, ...options })

function mesh(geometry, material, position, rotation) {
  const m = new THREE.Mesh(geometry, material)
  if (position) m.position.copy(position)
  if (rotation) m.rotation.set(...rotation)
  return m
}

// A tube along points whose radius shrinks to endScale at the end: horns, mustaches, hats that flop over
function taperedTube(points, radius, endScale = 0.1, segments = 48, radial = 20) {
  const path = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(path, segments, radius, radial, false)
  const pos = geometry.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const center = path.getPointAt(t)
    const scale = 1 + (endScale - 1) * t
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j
      v.fromBufferAttribute(pos, k).sub(center).multiplyScalar(scale).add(center)
      pos.setXYZ(k, v.x, v.y, v.z)
    }
  }
  geometry.computeVertexNormals()
  return geometry
}

// Moves every vertex through fn(vector) and recomputes the normals
function deform(geometry, fn) {
  const pos = geometry.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    fn(v)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geometry.computeVertexNormals()
  return geometry
}

const lathe = (points, segments = 96) =>
  new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  )

function textPlane(width, height, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = width * 4
  canvas.height = height * 4
  const ctx = canvas.getContext('2d')
  ctx.scale(4, 4)
  draw(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.5 }),
  )
}

function star(radius) {
  const shape = new THREE.Shape()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.45
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  return new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: true, bevelSize: 1, bevelThickness: 1, bevelSegments: 2 })
}

const smooth = (x, a, b) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// An invisible head: it only writes depth, so costume parts behind it (back of a band, a brim) are hidden
function headOccluder(x, y, r, z = 0) {
  const m = mesh(new THREE.SphereGeometry(r, 64, 32), new THREE.MeshBasicMaterial({ colorWrite: false }), P(x, y, z))
  m.scale.z = 0.9
  m.renderOrder = -1
  return m
}

// ---------------------------------------------------------------- characters

function viking() {
  const g = new THREE.Group()
  const steel = mat('#9aa3ad', { metalness: 0.85, roughness: 0.32 })
  const bronze = mat('#b5803a', { metalness: 0.9, roughness: 0.3 })
  const dome = mesh(new THREE.SphereGeometry(108, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), steel)
  dome.scale.set(1, 0.72, 1)
  g.add(dome)
  g.add(mesh(new THREE.TorusGeometry(108, 9, 16, 128), bronze, null, [Math.PI / 2, 0, 0]))
  const ridge = mesh(new THREE.TorusGeometry(108, 7, 12, 96, Math.PI), bronze, null, [0, Math.PI / 2, 0])
  ridge.scale.set(1, 0.72, 1)
  g.add(ridge)
  for (let a = -1.2; a <= 1.21; a += 0.3) {
    g.add(mesh(new THREE.SphereGeometry(4.5, 12, 8), bronze, new THREE.Vector3(Math.sin(a) * 110, 0, Math.cos(a) * 110)))
  }
  const ivory = mat('#efe4cb', { roughness: 0.45 })
  for (const side of [-1, 1]) {
    const pts = [
      [92, 14, 10], [118, 34, 18], [124, 82, 14], [108, 122, 4],
    ].map(([x, y, z]) => new THREE.Vector3(side * x, y, z))
    g.add(mesh(taperedTube(pts, 19, 0.06), ivory))
    g.add(mesh(new THREE.TorusGeometry(17, 4, 10, 32), bronze, new THREE.Vector3(side * 96, 17, 12), [0.2, side * 0.9, side * -0.6]))
  }
  g.position.copy(P(128, 60))
  g.rotation.x = 0.22
  return { group: g, shadows: [[128, 66, 105, 14, 0.38]] }
}

function astronaut() {
  const g = new THREE.Group()
  const shell = mesh(new THREE.TorusGeometry(205, 72, 48, 160), mat('#e4e9f0', { roughness: 0.3, metalness: 0.15 }), P(128, 138, -60))
  g.add(shell)
  const visorRim = mesh(new THREE.TorusGeometry(136, 10, 16, 160), mat('#6f7988', { metalness: 0.9, roughness: 0.25 }), P(128, 138, 0))
  g.add(visorRim)
  const glass = new THREE.MeshStandardMaterial({
    color: '#bfdcff', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0, depthWrite: false,
  })
  const visor = mesh(new THREE.SphereGeometry(136, 64, 32), glass, P(128, 138, -40))
  visor.scale.z = 0.35
  g.add(visor)
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false })
  g.add(mesh(new THREE.TorusGeometry(112, 4, 8, 64, 0.85), shine, P(128, 138, 30), [0, 0, 1.95]))
  g.add(mesh(new THREE.TorusGeometry(100, 2.5, 8, 64, 0.4), shine, P(128, 138, 30), [0, 0, 2.95]))
  g.add(mesh(new THREE.SphereGeometry(7, 16, 12), shine, P(78, 72, 40)))
  // A light on the helmet's side and a mission stripe on the shell
  g.add(mesh(new THREE.CylinderGeometry(9, 11, 18, 24), mat('#4a5361', { metalness: 0.8, roughness: 0.3 }), P(232, 40, 30), [0, 0, -0.7]))
  g.add(mesh(new THREE.SphereGeometry(7, 16, 12), mat('#ff5a3c', { emissive: '#ff3b1f', emissiveIntensity: 1.2 }), P(238, 34, 40)))
  g.add(mesh(new THREE.TorusGeometry(205, 74, 8, 160, 0.35), mat('#2f6fe4', { roughness: 0.35 }), P(128, 138, -58), [0, 0, 3.6]))
  return { group: g, shadows: [] }
}

function pirate() {
  const g = new THREE.Group()
  const felt = mat('#1f1f26', { roughness: 0.8 })
  const crown = mesh(new THREE.SphereGeometry(80, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), felt)
  crown.scale.set(1, 0.85, 0.95)
  g.add(crown)
  // Three turned-up sides with the corners pointing out, like a tricorn
  const brimShape = (radius, height) =>
    deform(new THREE.CylinderGeometry(radius, radius, height, 120, 1), (v) => {
      const r = Math.hypot(v.x, v.z)
      const a = Math.atan2(v.z, v.x)
      const up = (1 - Math.cos(3 * (a - Math.PI / 2))) / 2
      v.y += 52 * up * smooth(r, 70, radius)
    })
  g.add(mesh(brimShape(146, 8), felt))
  const gold = mat('#d8a536', { metalness: 0.9, roughness: 0.3 })
  const trim = mesh(brimShape(150, 4), gold, new THREE.Vector3(0, -1, 0))
  g.add(trim)
  const skull = textPlane(46, 46, (ctx) => {
    ctx.fillStyle = '#f2efe6'
    ctx.beginPath()
    ctx.arc(23, 19, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(16, 26, 14, 8)
    ctx.fillStyle = '#1f1f26'
    ctx.beginPath()
    ctx.arc(18, 19, 3.6, 0, Math.PI * 2)
    ctx.arc(28, 19, 3.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(19, 29, 2, 5)
    ctx.fillRect(25, 29, 2, 5)
    ctx.strokeStyle = '#f2efe6'
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(6, 33)
    ctx.lineTo(40, 44)
    ctx.moveTo(40, 33)
    ctx.lineTo(6, 44)
    ctx.stroke()
  })
  skull.position.set(0, 34, 84)
  g.add(skull)
  g.position.copy(P(128, 86))
  g.rotation.x = 0.3

  const patch = new THREE.Group()
  const leather = mat('#141417', { roughness: 0.45 })
  const eye = mesh(new THREE.SphereGeometry(40, 48, 24), leather, P(208, 160, 60))
  eye.scale.set(1, 0.86, 0.3)
  patch.add(eye)
  const strap = (pts) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 3.2, 10), leather)
  patch.add(strap([P(186, 132, 62), P(130, 104, 60), P(60, 100, 50), P(-10, 106, 40)]))
  patch.add(strap([P(240, 142, 62), P(270, 138, 40)]))
  const all = new THREE.Group()
  all.add(g, patch)
  return { group: all, shadows: [[128, 95, 125, 14, 0.4], [208, 162, 44, 38, 0.35]] }
}

function wizard() {
  const g = new THREE.Group()
  const felt = mat('#26348f', { roughness: 0.85 })
  const pts = [[0, 0], [4, 45], [40, 82], [92, 86], [116, 58]].map(([x, y]) => new THREE.Vector3(x, y, 0))
  g.add(mesh(taperedTube(pts, 92, 0.05, 64, 48), felt))
  const brim = deform(new THREE.CylinderGeometry(158, 158, 6, 120, 1), (v) => {
    const a = Math.atan2(v.z, v.x)
    v.y += 6 * Math.sin(5 * a) * smooth(Math.hypot(v.x, v.z), 100, 158)
  })
  g.add(mesh(brim, felt))
  g.add(mesh(new THREE.TorusGeometry(91, 9, 16, 96), mat('#e2b13c', { metalness: 0.85, roughness: 0.3 }), new THREE.Vector3(0, 8, 0), [Math.PI / 2, 0, 0]))
  const starMat = mat('#ffd54a', { emissive: '#ffb300', emissiveIntensity: 0.5, metalness: 0.4, roughness: 0.35 })
  for (const [x, y, r] of [[-38, 28, 11], [30, 40, 9], [2, 62, 7], [58, 80, 8], [-12, 36, 5]]) {
    g.add(mesh(star(r), starMat, new THREE.Vector3(x, y, 100)))
  }
  g.position.copy(P(128, 74))
  g.rotation.x = 0.28
  return { group: g, shadows: [[128, 80, 130, 14, 0.4]] }
}

function ninja() {
  const g = new THREE.Group()
  g.add(headOccluder(128, 215, 176, -90))
  const cloth = mat('#24272e', { roughness: 0.95 })
  // The mask's top edge sits under the glasses (y 165); the sphere is centered on the face
  const top = Math.acos(-53 / 182)
  const mask = mesh(new THREE.SphereGeometry(182, 96, 48, 0, Math.PI * 2, top, Math.PI * 0.95 - top), cloth, P(128, 112, 0))
  g.add(mask)
  g.add(mesh(new THREE.TorusGeometry(182 * Math.sin(top), 6, 12, 160), cloth, P(128, 165, 0), [Math.PI / 2, 0, 0]))
  const red = mat('#c62828', { roughness: 0.8 })
  // The band circles the head; tilted forward, it crosses the forehead and rises out of frame at the sides
  const tilt = 0.2
  // Only the front half: the back of the band is behind the head
  const band = new THREE.TorusGeometry(150, 12, 16, 160, Math.PI)
  band.rotateX(Math.PI / 2 + tilt)
  g.add(mesh(band, red, P(128, 25, 0)))
  g.add(mesh(new THREE.BoxGeometry(76, 30, 8), mat('#b8c0c8', { metalness: 0.9, roughness: 0.28 }), P(128, 55, 160), [tilt, 0, 0]))
  const sign = textPlane(70, 26, (ctx) => {
    ctx.fillStyle = '#3d4450'
    ctx.font = 'bold 20px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('</>', 35, 14)
  })
  sign.position.copy(P(128, 55, 165))
  sign.rotation.x = tilt
  g.add(sign)
  g.add(mesh(new THREE.SphereGeometry(14, 20, 14), red, P(234, 47, 110)))
  for (const [dx, dy] of [[26, 34], [12, 48]]) {
    g.add(mesh(taperedTube([P(236, 50, 112), P(236 + dx * 0.6, 50 + dy * 0.5, 114), P(236 + dx, 50 + dy, 110)], 10, 0.5), red))
  }
  return { group: g, shadows: [[128, 172, 150, 10, 0.45], [128, 62, 120, 9, 0.3]] }
}

function king() {
  const g = new THREE.Group()
  const gold = mat('#f2c040', { metalness: 1, roughness: 0.22 })
  const crown = deform(new THREE.CylinderGeometry(78, 72, 70, 120, 10, true), (v) => {
    const a = Math.atan2(v.z, v.x)
    const peak = Math.pow(Math.max(0, Math.cos(5 * a)), 0.7)
    const top = 2 + 33 * peak
    if (v.y > -12) v.y = -12 + ((v.y + 12) / 47) * (top + 12)
  })
  g.add(mesh(crown, gold))
  g.add(mesh(new THREE.TorusGeometry(74, 8, 16, 120), gold, new THREE.Vector3(0, -33, 0), [Math.PI / 2, 0, 0]))
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    g.add(mesh(new THREE.SphereGeometry(7, 16, 12), gold, new THREE.Vector3(Math.cos(a) * 78, 38, Math.sin(a) * 78)))
  }
  const gems = [
    ['#d81b60', 0, 13],
    ['#1e88e5', 0.75, 9],
    ['#1e88e5', -0.75, 9],
    ['#43a047', 1.4, 8],
    ['#43a047', -1.4, 8],
  ]
  for (const [color, a, r] of gems) {
    const gem = mesh(new THREE.OctahedronGeometry(r, 1), mat(color, { metalness: 0.2, roughness: 0.08 }), new THREE.Vector3(Math.sin(a) * 80, -14, Math.cos(a) * 80))
    gem.scale.z = 0.6
    gem.rotation.y = a
    g.add(gem)
  }
  g.position.copy(P(128, 46))
  g.rotation.x = 0.3
  return { group: g, shadows: [[128, 82, 80, 10, 0.32]] }
}

function detective() {
  const g = new THREE.Group()
  const felt = mat('#7a5534', { roughness: 0.92 })
  const crown = deform(lathe([[84, 0], [86, 22], [81, 46], [70, 60], [40, 67], [0, 56]]), (v) => {
    // A pinch at the front of the crown
    if (v.z > 0) v.x *= 1 - 0.18 * smooth(v.y, 30, 64) * (v.z / 86)
  })
  g.add(mesh(crown, felt))
  g.add(mesh(new THREE.CylinderGeometry(86.5, 87, 15, 96, 1, true), mat('#2b1d14', { roughness: 0.7 }), new THREE.Vector3(0, 9, 0)))
  const brim = deform(lathe([[84, 2], [150, 0], [162, 7], [163, 3], [150, -4], [84, -2]]), (v) => {
    v.y -= 16 * Math.pow(Math.max(0, v.z / 160), 2)
    v.y += 10 * Math.pow(Math.max(0, -v.z / 160), 2)
  })
  g.add(mesh(brim, felt))
  g.position.copy(P(128, 100))
  g.rotation.x = 0.26

  const pipe = new THREE.Group()
  const wood = mat('#5b3a1f', { roughness: 0.55 })
  pipe.add(mesh(taperedTube([P(150, 236, 50), P(178, 246, 50), P(198, 240, 50)], 5, 1.4), mat('#222', { roughness: 0.4 })))
  pipe.add(mesh(lathe([[0, 0], [14, 2], [16, 18], [15, 30], [12, 31], [11, 8], [0, 7]], 48), wood, P(208, 236, 50)))
  const all = new THREE.Group()
  all.add(g, pipe)
  return { group: all, shadows: [[128, 106, 125, 15, 0.42]] }
}

function cowboy() {
  const g = new THREE.Group()
  const felt = mat('#b8864b', { roughness: 0.85 })
  const crown = deform(lathe([[74, 0], [77, 26], [71, 50], [54, 62], [24, 56], [0, 50]]), (v) => {
    if (v.z > 0) v.x *= 1 - 0.22 * smooth(v.y, 28, 60) * (v.z / 77)
  })
  g.add(mesh(crown, felt))
  g.add(mesh(new THREE.CylinderGeometry(77.5, 78, 11, 96, 1, true), mat('#4e321c', { roughness: 0.7 }), new THREE.Vector3(0, 7, 0)))
  const brim = deform(lathe([[74, 2], [138, 0], [152, 5], [152, 1], [138, -4], [74, -2]]), (v) => {
    v.y += 70 * Math.pow(Math.abs(v.x) / 152, 3)
    v.y -= 12 * Math.max(0, v.z / 152)
  })
  g.add(mesh(brim, felt))
  g.add(mesh(star(9), mat('#d9dde2', { metalness: 0.9, roughness: 0.25 }), new THREE.Vector3(0, 6, 80)))
  g.position.copy(P(128, 70))
  g.rotation.x = 0.14
  return { group: g, shadows: [[128, 76, 115, 13, 0.4]] }
}

function cyberpunk() {
  const g = new THREE.Group()
  const visorMat = new THREE.MeshStandardMaterial({
    color: '#0a2a3a', emissive: '#00a6c4', emissiveIntensity: 0.35, transparent: true, opacity: 0.62,
    roughness: 0.08, metalness: 0.3, side: D, depthWrite: false,
  })
  const visor = deform(new THREE.SphereGeometry(178, 120, 24, Math.PI * 0.08, Math.PI * 0.84, Math.PI * 0.4, Math.PI * 0.16), (v) => v)
  g.add(mesh(visor, visorMat, P(128, 104, -60)))
  const cyan = mat('#00e5ff', { emissive: '#00e5ff', emissiveIntensity: 1.1 })
  for (const theta of [0.4, 0.56]) {
    const y = 104 - 178 * Math.cos(Math.PI * theta)
    const r = 178 * Math.sin(Math.PI * theta)
    const line = new THREE.TorusGeometry(r, 3, 8, 120, Math.PI * 0.84)
    line.rotateZ(Math.PI * 0.08)
    line.rotateX(Math.PI / 2)
    g.add(mesh(line, cyan, P(128, y, -60)))
  }
  // Reflections sliding across the visor
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false })
  g.add(mesh(new THREE.PlaneGeometry(14, 60), shine, P(70, 118, 130), [0, 0, -0.5]))
  g.add(mesh(new THREE.PlaneGeometry(6, 60), shine, P(92, 118, 130), [0, 0, -0.5]))
  const neon = mat('#ff2bd6', { emissive: '#ff2bd6', emissiveIntensity: 0.9 })
  for (let i = -3; i <= 3; i++) {
    const spike = new THREE.Group()
    const h = 74 - Math.abs(i) * 8
    spike.add(mesh(new THREE.ConeGeometry(12, h, 24), neon, new THREE.Vector3(0, h / 2, 0)))
    spike.position.copy(P(128 + i * 6, 52, -10 - Math.abs(i) * 4))
    spike.rotation.z = -i * 0.24
    g.add(spike)
  }
  return { group: g, shadows: [[128, 58, 30, 8, 0.3], [128, 150, 140, 8, 0.25]] }
}

function chef() {
  const g = new THREE.Group()
  const cloth = mat('#f7f6f2', { roughness: 0.92 })
  const band = deform(new THREE.CylinderGeometry(86, 82, 58, 96, 4, true), (v) => {
    const a = Math.atan2(v.z, v.x)
    const k = 1 + 0.03 * Math.cos(24 * a)
    v.x *= k
    v.z *= k
  })
  g.add(mesh(band, cloth))
  for (const [x, y, z, r] of [[-48, 58, 0, 48], [48, 58, 0, 48], [0, 66, 30, 52], [-24, 84, -20, 50], [26, 82, -18, 50], [0, 92, 0, 46]]) {
    g.add(mesh(new THREE.SphereGeometry(r, 40, 24), cloth, new THREE.Vector3(x, y, z)))
  }
  g.position.copy(P(128, 34))
  g.rotation.x = 0.25

  const brown = mat('#3d2516', { roughness: 0.7 })
  const stache = new THREE.Group()
  for (const side of [-1, 1]) {
    const pts = [[2, 176], [26, 182], [50, 177], [60, 166], [52, 158]].map(([dx, y]) => P(128 + side * dx, y, 60))
    stache.add(mesh(taperedTube(pts, 11, 0.18), brown))
  }
  const all = new THREE.Group()
  all.add(g, stache)
  return { group: all, shadows: [[128, 66, 92, 10, 0.32], [128, 186, 56, 8, 0.25]] }
}

const SPECS = [
  { id: 26, build: viking },
  { id: 27, build: astronaut },
  { id: 28, build: pirate },
  { id: 29, build: wizard },
  { id: 30, build: ninja },
  { id: 31, build: king },
  { id: 32, build: detective },
  { id: 33, build: cowboy },
  { id: 34, build: cyberpunk },
  { id: 35, build: chef },
]

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

async function renderAvatar(spec) {
  const scene = makeScene()
  const { group, shadows } = spec.build()
  scene.add(group)
  renderer.render(scene, camera)

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  canvas.title = String(spec.id)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(await loadImage(`./base-${spec.id}.png?v=${Date.now()}`), 0, 0)
  // Soft contact shadows where the costume touches the head
  for (const [x, y, rx, ry, alpha] of shadows) {
    ctx.save()
    ctx.filter = 'blur(7px)'
    ctx.fillStyle = `rgba(20, 10, 0, ${alpha})`
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.drawImage(renderer.domElement, 0, 0, 256, 256)
  document.body.appendChild(canvas)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  await fetch(`http://localhost:5199/save?name=avatar-${spec.id}`, { method: 'POST', body: blob })
  scene.traverse((o) => {
    o.geometry?.dispose()
    o.material?.map?.dispose()
    o.material?.dispose()
  })
}

window.renderAll = async (ids) => {
  document.querySelectorAll('canvas').forEach((c) => c.remove())
  for (const spec of SPECS) if (!ids || ids.includes(spec.id)) await renderAvatar(spec)
  return 'done'
}
