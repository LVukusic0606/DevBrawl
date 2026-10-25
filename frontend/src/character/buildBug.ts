import * as THREE from 'three'

// The DevBrawl bug built from simple shapes, after the mascot artwork: a big orange head with round
// tortoiseshell glasses and segmented antennae, a grey DEV_BUG hoodie over a light blue shirt, a belt,
// dark khaki trousers with rolled cuffs, brown sneakers, a USB stick on a keyring and a coffee mug.
// Units are roughly metres; the feet stand on y = 0 and the character faces +z.

const COLORS = {
  skin: '#d77a2c',
  smile: '#6b2f14',
  eyeWhite: '#f4f1ea',
  iris: '#3d78ad',
  pupil: '#111111',
  glasses: '#5a3a22',
  antenna: '#a24f27',
  hoodie: '#55595f',
  hoodieRib: '#4a4e54',
  drawstring: '#e2ddd2',
  shirt: '#b3cde6',
  glove: '#5a4a42',
  trousers: '#4f4a3c',
  belt: '#3a2c22',
  sneaker: '#6b6258',
  sneakerCap: '#e8e0cc',
  lace: '#f4f2ec',
  usb: '#8a6a4a',
  metal: '#b8bcc2',
  mug: '#cfc8bc',
  coffee: '#3b2414',
}

function material(color: string, roughness = 0.6, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness })
}

function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geometry, mat)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// "DEV_BUG" with a little terminal icon on the hoodie's chest
function chestPrint(): THREE.Mesh {
  const texture = canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = '#c9ccd0'
    ctx.strokeStyle = '#c9ccd0'
    ctx.lineWidth = 8
    ctx.strokeRect(14, 24, 100, 80)
    ctx.font = 'bold 40px monospace'
    ctx.fillText('>_', 32, 80)
    ctx.font = 'bold 68px monospace'
    ctx.fillText('DEV_BUG', 136, 88)
  })
  const print = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.155),
    new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.9 }),
  )
  // Just in front of the hoodie's surface (body radius 0.56 squashed to 0.86 in depth)
  print.position.set(0, 1.16, 0.495)
  return print
}

// Long antennae made of small beads, so they read as segmented like the artwork
function antenna(side: 1 | -1, mat: THREE.Material): THREE.Group {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.14 * side, 2.62, 0.02),
    new THREE.Vector3(0.18 * side, 3.0, 0),
    new THREE.Vector3(0.38 * side, 3.3, -0.05),
    new THREE.Vector3(0.7 * side, 3.32, -0.08),
    new THREE.Vector3(0.95 * side, 3.05, -0.1),
  ])
  const group = new THREE.Group()
  group.add(mesh(new THREE.TubeGeometry(curve, 48, 0.026, 8, false), mat))
  const bead = new THREE.SphereGeometry(0.036, 10, 10)
  for (let i = 1; i <= 14; i++) {
    const p = curve.getPoint(i / 14)
    group.add(mesh(bead, mat, p.x, p.y, p.z))
  }
  return group
}

function eye(x: number): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, 2.16, 0.5)
  group.add(mesh(new THREE.SphereGeometry(0.21, 32, 32), material(COLORS.eyeWhite, 0.25)))
  group.add(mesh(new THREE.SphereGeometry(0.105, 24, 24), material(COLORS.iris, 0.3), 0, 0, 0.14))
  group.add(mesh(new THREE.SphereGeometry(0.058, 16, 16), material(COLORS.pupil, 0.2), 0, 0, 0.19))
  // Small highlight so the eyes look alive
  group.add(mesh(new THREE.SphereGeometry(0.024, 8, 8), material('#ffffff', 0.1), 0.045, 0.045, 0.22))
  return group
}

function glasses(): THREE.Group {
  const mat = material(COLORS.glasses, 0.35)
  const group = new THREE.Group()
  for (const x of [-0.27, 0.27]) {
    group.add(mesh(new THREE.TorusGeometry(0.26, 0.045, 16, 48), mat, x, 2.16, 0.68))
    // Temple arms run back along the head
    const temple = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 8), mat, x * 2.15, 2.18, 0.42)
    temple.rotation.x = Math.PI / 2
    group.add(temple)
  }
  const bridge = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.1, 8), mat, 0, 2.22, 0.7)
  bridge.rotation.z = Math.PI / 2
  group.add(bridge)
  return group
}

function arm(side: 1 | -1): THREE.Group {
  const group = new THREE.Group()
  group.position.set(0.66 * side, 1.34, 0)
  group.rotation.z = 0.14 * side
  group.add(mesh(new THREE.CapsuleGeometry(0.17, 0.48, 8, 16), material(COLORS.hoodie, 0.95), 0, -0.34, 0))
  // Ribbed sleeve cuff
  const cuff = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 20), material(COLORS.hoodieRib, 0.95), 0, -0.66, 0)
  group.add(cuff)
  // Fingerless glove with orange fingers poking out
  group.add(mesh(new THREE.SphereGeometry(0.15, 20, 20), material(COLORS.glove, 0.9), 0, -0.8, 0.02))
  const finger = new THREE.CapsuleGeometry(0.035, 0.08, 4, 8)
  const skin = material(COLORS.skin)
  for (const [fx, fz] of [
    [-0.06, 0.08],
    [0, 0.1],
    [0.06, 0.08],
  ]) {
    group.add(mesh(finger, skin, fx, -0.95, fz))
  }
  // Thumb towards the front
  const thumb = mesh(finger, skin, -0.1 * side, -0.82, 0.12)
  thumb.rotation.z = 0.8 * side
  group.add(thumb)
  return group
}

function leg(side: 1 | -1): THREE.Group {
  const group = new THREE.Group()
  group.position.x = 0.22 * side
  const trousers = material(COLORS.trousers, 0.9)
  group.add(mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.5, 20), trousers, 0, 0.46, 0))
  // Rolled-up cuff
  group.add(mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.11, 20), trousers, 0, 0.25, 0))

  // Sneaker: brown upper, cream toe cap and sole, white laces
  const upper = mesh(new THREE.CapsuleGeometry(0.14, 0.24, 8, 16), material(COLORS.sneaker, 0.8), 0, 0.12, 0.06)
  upper.rotation.x = Math.PI / 2
  upper.scale.set(1.15, 1, 0.75)
  group.add(upper)
  const cap = mesh(new THREE.SphereGeometry(0.15, 20, 20), material(COLORS.sneakerCap, 0.7), 0, 0.09, 0.27)
  cap.scale.set(1.05, 0.6, 0.8)
  group.add(cap)
  group.add(mesh(new THREE.BoxGeometry(0.32, 0.06, 0.58), material(COLORS.sneakerCap, 0.7), 0, 0.03, 0.06))
  const lace = new THREE.BoxGeometry(0.16, 0.015, 0.025)
  const laceMat = material(COLORS.lace, 0.6)
  for (const z of [0.04, 0.1, 0.16]) {
    group.add(mesh(lace, laceMat, 0, 0.215, z))
  }
  return group
}

// A coffee mug with a power icon, standing next to the right foot
function mug(): THREE.Group {
  const group = new THREE.Group()
  group.position.set(0.95, 0, 0.45)
  group.rotation.y = -0.5
  const body = mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.3, 32), material(COLORS.mug, 0.5), 0, 0.15, 0)
  group.add(body)
  group.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.01, 32), material(COLORS.coffee, 0.3), 0, 0.29, 0))
  const handle = mesh(new THREE.TorusGeometry(0.075, 0.022, 10, 24), material(COLORS.mug, 0.5), 0.15, 0.16, 0)
  group.add(handle)
  const icon = canvasTexture(128, 128, (ctx) => {
    ctx.strokeStyle = '#5a3a26'
    ctx.lineWidth = 12
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(64, 70, 34, -Math.PI / 3, (4 * Math.PI) / 3)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(64, 22)
    ctx.lineTo(64, 66)
    ctx.stroke()
  })
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.14, 0.14),
    new THREE.MeshStandardMaterial({ map: icon, transparent: true, roughness: 0.6 }),
  )
  decal.position.set(0, 0.15, 0.142)
  group.add(decal)
  return group
}

export function buildBug(): THREE.Group {
  const bug = new THREE.Group()
  const skin = material(COLORS.skin, 0.65)

  // Head: big and round, as wide as the hoodie
  const head = mesh(new THREE.SphereGeometry(0.66, 48, 48), skin, 0, 2.08, 0)
  head.scale.set(1, 0.95, 0.95)
  bug.add(head)
  bug.add(eye(-0.27), eye(0.27), glasses())

  const smile = mesh(new THREE.TorusGeometry(0.17, 0.026, 8, 24, Math.PI), material(COLORS.smile, 0.5), 0.03, 1.88, 0.6)
  smile.rotation.z = Math.PI
  smile.rotation.x = -0.3
  bug.add(smile)

  const antennaMat = material(COLORS.antenna, 0.7)
  bug.add(antenna(1, antennaMat), antenna(-1, antennaMat))

  // Hoodie: body, ribbed hem, hood around the neck, drawstrings, kangaroo pocket and the chest print
  const hoodie = material(COLORS.hoodie, 0.95)
  const body = mesh(new THREE.CapsuleGeometry(0.56, 0.42, 12, 32), hoodie, 0, 1.08, 0)
  body.scale.set(1, 1, 0.86)
  bug.add(body)
  const hem = mesh(new THREE.CylinderGeometry(0.53, 0.5, 0.12, 32), material(COLORS.hoodieRib, 0.95), 0, 0.66, 0)
  hem.scale.z = 0.86
  bug.add(hem)

  const hood = mesh(new THREE.TorusGeometry(0.44, 0.15, 16, 40), hoodie, 0, 1.55, -0.04)
  hood.rotation.x = Math.PI / 2
  bug.add(hood)

  const drawstring = new THREE.CylinderGeometry(0.014, 0.014, 0.36, 8)
  const stringMat = material(COLORS.drawstring, 0.7)
  for (const x of [-0.11, 0.11]) {
    bug.add(mesh(drawstring, stringMat, x, 1.27, 0.47))
    bug.add(mesh(new THREE.SphereGeometry(0.022, 8, 8), stringMat, x, 1.08, 0.47))
  }

  // Kangaroo pocket: a thin panel only a shade darker than the hoodie, so it doesn't read as a block
  const pocket = mesh(new THREE.BoxGeometry(0.7, 0.26, 0.03), material('#505459', 0.95), 0, 0.88, 0.465)
  bug.add(pocket)
  bug.add(chestPrint())

  // Pointed light blue shirt collar under the head
  for (const side of [-1, 1]) {
    const collar = mesh(new THREE.ConeGeometry(0.12, 0.24, 3), material(COLORS.shirt, 0.7), 0.11 * side, 1.5, 0.36)
    collar.rotation.set(Math.PI / 2 + 0.4, 0, side * 0.7)
    bug.add(collar)
  }

  // Belt with a silver buckle, between hoodie and trousers
  const belt = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.07, 32), material(COLORS.belt, 0.6), 0, 0.58, 0)
  belt.scale.z = 0.85
  bug.add(belt)
  bug.add(mesh(new THREE.BoxGeometry(0.12, 0.07, 0.02), material(COLORS.metal, 0.3, 0.8), 0, 0.58, 0.39))

  bug.add(arm(1), arm(-1), leg(1), leg(-1))

  // USB stick on a keyring at the right hip
  bug.add(mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 20), material(COLORS.metal, 0.3, 0.8), 0.43, 0.5, 0.3))
  bug.add(mesh(new THREE.BoxGeometry(0.08, 0.14, 0.04), material(COLORS.usb, 0.6), 0.43, 0.37, 0.3))
  bug.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), material(COLORS.metal, 0.3, 0.8), 0.43, 0.28, 0.3))

  bug.add(mug())
  return bug
}

// Frees the GPU memory of everything in a scene when the page closes
export function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const mat of materials) {
      if (mat instanceof THREE.MeshStandardMaterial) mat.map?.dispose()
      mat.dispose()
    }
  })
}
