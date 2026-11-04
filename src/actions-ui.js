const BUTTONS = [
  { name: 'jump', label: 'Sauter' },
  { name: 'boxing', label: 'Frapper' },
  { name: 'push', label: 'Pousser' }
]

// Builds the action buttons inside `root`. onAction(name) is called on press.
export function createActionButtons(root, onAction) {
  const wrap = document.createElement('div')
  wrap.className = 'action-buttons'
  const els = BUTTONS.map(({ name, label }) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'action-btn'
    b.textContent = label
    b.addEventListener('pointerdown', e => {
      e.stopPropagation()
      e.preventDefault()
      if (!b.disabled) onAction(name)
    })
    wrap.appendChild(b)
    return b
  })
  root.appendChild(wrap)
  return {
    setBusy(busy) {
      wrap.classList.toggle('busy', busy)
      els.forEach(b => { b.disabled = busy })
    }
  }
}
