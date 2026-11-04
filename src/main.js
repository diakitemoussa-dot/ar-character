import { createApp } from './app.js'
import { createJoystick } from './joystick.js'
import { startDesktop } from './desktop.js'
import { createActionButtons } from './actions-ui.js'
import { parseSceneScale } from './scale.js'

const MODEL_URL = import.meta.env.BASE_URL + 'models/character.glb'
const canvas = document.getElementById('ar-canvas')
const messageEl = document.getElementById('message')

function showMessage(text) {
  messageEl.textContent = text
  messageEl.hidden = false
}

let buttons = null
const sceneScale = parseSceneScale(location.search)
const app = createApp({ modelUrl: MODEL_URL, scale: sceneScale, onBusy: b => buttons && buttons.setBusy(b) })
if (new URLSearchParams(location.search).has('debug')) window.__app = app
buttons = createActionButtons(document.getElementById('action-root'), name => app.triggerAction(name))
createJoystick(document.getElementById('joystick-root'), v => app.setInput(v))

async function main() {
  const desktop = new URLSearchParams(location.search).has('desktop')
  if (desktop) {
    await startDesktop({ canvas, app, scale: sceneScale })
  } else {
    const { startAR } = await import('./ar.js')
    await startAR({ canvas, app, onError: showMessage })
  }
}

main().catch(err => {
  console.error(err)
  showMessage('Erreur : ' + (err && err.message ? err.message : err))
})
