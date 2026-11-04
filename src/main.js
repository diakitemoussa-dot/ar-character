import { createApp } from './app.js'
import { createJoystick } from './joystick.js'
import { startDesktop } from './desktop.js'

const MODEL_URL = import.meta.env.BASE_URL + 'models/character.glb'
const canvas = document.getElementById('ar-canvas')
const messageEl = document.getElementById('message')

function showMessage(text) {
  messageEl.textContent = text
  messageEl.hidden = false
}

const app = createApp({ modelUrl: MODEL_URL })
createJoystick(document.getElementById('joystick-root'), v => app.setInput(v))

async function main() {
  const desktop = new URLSearchParams(location.search).has('desktop')
  if (desktop) {
    await startDesktop({ canvas, app })
  } else {
    const { startAR } = await import('./ar.js')
    await startAR({ canvas, app, onError: showMessage })
  }
}

main().catch(err => {
  console.error(err)
  showMessage('Erreur : ' + (err && err.message ? err.message : err))
})
