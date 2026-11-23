// A light haptic tick on taps. Android: the Vibration API. iPhone (no Vibration API): a real tap on an
// <input type="checkbox" switch> ticks. Since iOS 26.5 a script click does not, so on iPhone put v-tick on the
// element: it lays a real switch under the finger (the click bubbles up, so the element's handler still runs).
// haptic() keeps the old script click for iOS 18 and earlier. On iOS 26.5+ it's always a single tick.
let label = null
function ensure() {
  if (label || typeof document === 'undefined') return label
  label = document.createElement('label')
  label.setAttribute('aria-hidden', 'true')
  label.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  input.tabIndex = -1
  label.appendChild(input)
  document.body.appendChild(label)
  return label
}

export function haptic(ms = 12) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms)
    else ensure()?.click()
  } catch {
    // 触覚が使えなくても、画面には影響させない
  }
}

// v-tick: a real switch under the finger, so the tap itself ticks on iPhone. It is the first child (the HUD and the
// cards paint over it) and see-through. v-tick.over puts it on top instead, for a plain tap target (its own handler
// still runs). Android has vibrate and needs nothing.
export const vTick = {
  mounted(el, { modifiers }) {
    if (navigator.vibrate) return
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
    const sw = document.createElement('input')
    sw.type = 'checkbox'
    sw.setAttribute('switch', '')
    sw.tabIndex = -1
    sw.setAttribute('aria-hidden', 'true')
    sw.style.cssText = `position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;touch-action:none;clip-path:inset(0 round ${getComputedStyle(el).borderRadius})`
    el._tick = sw // so a component can switch the tick on and off (pointer-events)
    if (modifiers.over) { sw.style.zIndex = '2'; el.style.isolation = 'isolate'; el.appendChild(sw) } // on top of its own children, inside it: a card above still wins
    else el.prepend(sw) // under them: the HUD and the cards stay tappable
  },
}

// a short run of pulses for a moment with no tap (the streak celebration). Script clicks: iOS 26.5+ stays silent.
export function pulses(n = 3, gap = 120) {
  for (let i = 0; i < n; i++) setTimeout(() => haptic(), i * gap)
}

// a handler's pointerdown.prevent would also cancel the tick switch's own tap on iPhone, so only the switch's tap is let through
export function keepTick(e) {
  if (e?.target?.tagName !== 'INPUT') e?.preventDefault?.()
}
