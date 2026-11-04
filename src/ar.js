import * as THREE from 'three'
window.THREE = THREE // XR8.Threejs expects a global THREE (official example does the same)

function waitForEvent(check, eventName, label) {
  return new Promise((resolve, reject) => {
    if (check()) return resolve(check())
    const timer = setTimeout(() => reject(new Error(label)), 15000)
    window.addEventListener(eventName, () => { clearTimeout(timer); resolve(check()) }, { once: true })
  })
}

async function waitForXR8() {
  const XR8 = await waitForEvent(() => window.XR8, 'xrloaded', 'Moteur AR indisponible (réseau ?)')
  await waitForEvent(() => window.XRExtras, 'xrextrasloaded', 'Composants AR indisponibles (réseau ?)')
  return XR8
}

export async function startAR({ canvas, app, onError }) {
  const XR8 = await waitForXR8()

  XR8.XrController.configure({ disableWorldTracking: false })

  const characterModule = {
    name: 'character-ar',

    onStart: () => {
      const { scene, camera, renderer } = XR8.Threejs.xrScene()
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      // initial camera height must be > 0 (official example uses 0, 2, 2); set BEFORE updateCameraProjectionMatrix
      camera.position.set(0, 2, 2)
      XR8.XrController.updateCameraProjectionMatrix({
        origin: camera.position,
        facing: camera.quaternion
      })
      app.attach({ scene, camera }).catch(e => onError('Modèle introuvable : ' + e.message))

      canvas.addEventListener('touchmove', e => e.preventDefault())

      // tap on the camera view places the character on the detected surface.
      // hitTest coordinates are 0..1 over the camera feed (full-window canvas).
      canvas.addEventListener('touchstart', e => {
        const t = e.touches[0]
        const hits = XR8.XrController.hitTest(
          t.clientX / window.innerWidth,
          t.clientY / window.innerHeight,
          ['FEATURE_POINT']
        )
        if (hits.length > 0) app.place(hits[0].position)
      })
    },

    onUpdate: () => app.update(),

    onException: e => onError('Erreur AR : ' + (e && e.message ? e.message : e))
  }

  // XRExtras (loaded in index.html) sizes the canvas and shows runtime errors, as in the official example
  XR8.addCameraPipelineModules([
    XR8.GlTextureRenderer.pipelineModule(),
    XR8.Threejs.pipelineModule(),
    XR8.XrController.pipelineModule(),
    XRExtras.FullWindowCanvas.pipelineModule(),
    XRExtras.RuntimeError.pipelineModule(),
    characterModule
  ])

  try {
    XR8.run({ canvas })
  } catch (e) {
    onError("Impossible de démarrer la caméra. Autorisez l'accès à la caméra et utilisez Safari (iOS) ou Chrome (Android).")
  }
}
