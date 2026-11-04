const RADIUS = 50

// Builds a touch/mouse joystick inside `root`. Calls onChange({x, y}) with x right+, y up+, each in [-1, 1].
export function createJoystick(root, onChange) {
  const base = document.createElement('div')
  base.className = 'joy-base'
  const knob = document.createElement('div')
  knob.className = 'joy-knob'
  base.appendChild(knob)
  root.appendChild(base)

  let activeId = null

  const move = (clientX, clientY) => {
    const r = base.getBoundingClientRect()
    let dx = clientX - (r.left + r.width / 2)
    let dy = clientY - (r.top + r.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) { dx = (dx / len) * RADIUS; dy = (dy / len) * RADIUS }
    knob.style.transform = `translate(${dx}px, ${dy}px)`
    onChange({ x: dx / RADIUS, y: -dy / RADIUS })
  }

  const end = e => {
    if (e.pointerId !== activeId) return
    activeId = null
    knob.style.transform = 'translate(0, 0)'
    onChange({ x: 0, y: 0 })
  }

  base.addEventListener('pointerdown', e => {
    activeId = e.pointerId
    base.setPointerCapture(e.pointerId)
    e.stopPropagation()
    move(e.clientX, e.clientY)
  })
  base.addEventListener('pointermove', e => { if (e.pointerId === activeId) move(e.clientX, e.clientY) })
  base.addEventListener('pointerup', end)
  base.addEventListener('pointercancel', end)
}
