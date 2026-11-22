// Geometry helpers shared by guards, cameras and movement:
// segment-vs-rectangle tests decide line of sight and wall sliding.

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// Shortest absolute difference between two angles, in radians.
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when the segment (ax,ay)-(bx,by) touches rectangle r.
export function segmentHitsRect(ax, ay, bx, by, r) {
  if (pointInRect(ax, ay, r) || pointInRect(bx, by, r)) return true;
  const edges = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  return edges.some(([cx, cy, dx, dy]) => segmentsCross(ax, ay, bx, by, cx, cy, dx, dy));
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = side(dx, dy, cx, cy, ax, ay);
  const d2 = side(dx, dy, cx, cy, bx, by);
  const d3 = side(bx, by, ax, ay, cx, cy);
  const d4 = side(bx, by, ax, ay, dx, dy);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function side(px, py, qx, qy, rx, ry) {
  return (rx - px) * (qy - py) - (ry - py) * (qx - px);
}

// Line of sight between two points: clear unless a wall blocks it.
export function hasLineOfSight(ax, ay, bx, by, walls) {
  for (const wall of walls) {
    if (segmentHitsRect(ax, ay, bx, by, wall)) return false;
  }
  return true;
}

// Is the target inside a vision cone (origin, facing, half-angle, range)?
// Walls and smoke clouds can still block the view; callers check that.
export function insideCone(ox, oy, facing, halfAngle, range, tx, ty) {
  const d = distance(ox, oy, tx, ty);
  if (d > range) return false;
  if (d < 12) return true;
  return Math.abs(angleDifference(angleTo(ox, oy, tx, ty), facing)) <= halfAngle;
}

// Move a circle (x,y,r) by (dx,dy), sliding along walls instead of
// sticking: try the full move, then each axis on its own.
export function moveCircle(x, y, r, dx, dy, walls) {
  let nx = x + dx;
  let ny = y + dy;
  if (circleHitsWalls(nx, ny, r, walls)) {
    if (!circleHitsWalls(nx, y, r, walls)) ny = y;
    else if (!circleHitsWalls(x, ny, r, walls)) nx = x;
    else {
      nx = x;
      ny = y;
    }
  }
  return { x: nx, y: ny };
}

export function circleHitsWalls(x, y, r, walls) {
  for (const wall of walls) {
    const cx = clamp(x, wall.x, wall.x + wall.w);
    const cy = clamp(y, wall.y, wall.y + wall.h);
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
  }
  return false;
}
