import * as THREE from 'three'

export async function startDesktop({ canvas, app }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x223344)
  scene.add(new THREE.GridHelper(10, 20))
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
  camera.position.set(0, 1.6, 3)
  camera.lookAt(0, 0.5, 0)

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', resize)
  resize()

  await app.attach({ scene, camera })
  app.place({ x: 0, y: 0, z: 0 })

  // keyboard input (WASD / arrows) feeds the same input vector as the joystick
  const keys = new Set()
  const pushKeys = () => {
    const x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0)
    const y = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0)
    app.setInput({ x, y })
  }
  window.addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); pushKeys() })
  window.addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); pushKeys() })

  renderer.setAnimationLoop(() => {
    app.update()
    renderer.render(scene, camera)
  })
}
