// Keyboard + mouse input. WASD / arrows move, Shift sneaks, E cracks
// a safe, 1/2/3 spend points on tools, M mutes, P pauses, Enter starts.

export function createInput() {
  const keys = new Set();
  const pressed = new Set(); // edge-triggered: consumed once per press
  const state = {
    keys,
    pressed,
    mouse: { x: 0, y: 0, clicked: false },
    anyKey: false,
  };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    pressed.add(event.code);
    state.anyKey = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('mousemove', (event) => {
    const rect = document.getElementById('game').getBoundingClientRect();
    state.mouse.x = event.clientX - rect.left;
    state.mouse.y = event.clientY - rect.top;
  });
  window.addEventListener('mousedown', () => {
    state.mouse.clicked = true;
    state.anyKey = true;
  });
  return state;
}

// Movement vector from the held keys, normalised to length 1.
export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}

export function isSneaking(input) {
  return input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
}

// True once per physical key press; callers clear it each frame.
export function wasPressed(input, code) {
  return input.pressed.has(code);
}

export function endFrame(input) {
  input.pressed.clear();
  input.mouse.clicked = false;
  input.anyKey = false;
}
