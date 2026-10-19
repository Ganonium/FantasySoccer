import { FIELD, PHYSICS } from './config';
import type { Ball, Body, Unit } from './types';

/** Ein Zusammenstoß zweier Einheiten – Grundlage für das Schadenssystem. */
export interface UnitContact {
  a: Unit;
  b: Unit;
  /** Geschwindigkeit von a in Richtung b bzw. von b in Richtung a, vor dem Stoß. */
  approachA: number;
  approachB: number;
  x: number;
  y: number;
}

export interface Impact {
  kind: 'unit' | 'ball' | 'wall' | 'post';
  speed: number;
  x: number;
  y: number;
}

export interface StepResult {
  unitContacts: UnitContact[];
  impacts: Impact[];
}

const GOAL_LEFT = (FIELD.width - FIELD.goalWidth) / 2;
const GOAL_RIGHT = (FIELD.width + FIELD.goalWidth) / 2;

/** Torpfosten als statische Kreise an den Enden beider Torlinien. */
export const POSTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: GOAL_LEFT, y: 0 },
  { x: GOAL_RIGHT, y: 0 },
  { x: GOAL_LEFT, y: FIELD.height },
  { x: GOAL_RIGHT, y: FIELD.height },
];

/** Liegt x in der Tormündung, sodass der Ball die Torlinie überqueren darf? */
export function inGoalMouth(x: number): boolean {
  return x > GOAL_LEFT && x < GOAL_RIGHT;
}

export function speedOf(b: Body): number {
  return Math.hypot(b.vx, b.vy);
}

export function allAtRest(bodies: Iterable<Body>): boolean {
  for (const b of bodies) if (speedOf(b) >= PHYSICS.MIN_SPEED) return false;
  return true;
}

/** Ein vollständiger Physik-Tick (inkl. Unterschritte). Nur aktive Einheiten übergeben. */
export function physicsTick(units: Unit[], ball: Ball, dt: number): StepResult {
  const result: StepResult = { unitContacts: [], impacts: [] };
  const h = dt / PHYSICS.SUBSTEPS;
  const bodies: Body[] = [...units, ball];

  for (let s = 0; s < PHYSICS.SUBSTEPS; s++) {
    for (const b of bodies) {
      applyFriction(b, h);
      b.x += b.vx * h;
      b.y += b.vy * h;
    }
    for (let it = 0; it < PHYSICS.SOLVER_ITERATIONS; it++) {
      const first = it === 0;
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          collideBodies(bodies[i]!, bodies[j]!, ball, first, result);
        }
      }
      for (const b of bodies) {
        for (const p of POSTS) collidePost(b, p, first, result);
        collideWalls(b, b === ball, first, result);
      }
    }
  }
  return result;
}

function applyFriction(b: Body, h: number): void {
  const s = speedOf(b);
  if (s === 0) return;
  const next = s * Math.exp(-PHYSICS.DAMPING * h) - PHYSICS.ROLL_DECEL * h;
  if (next < PHYSICS.MIN_SPEED) {
    b.vx = 0;
    b.vy = 0;
  } else {
    const f = next / s;
    b.vx *= f;
    b.vy *= f;
  }
}

function collideBodies(a: Body, b: Body, ball: Ball, resolveVelocity: boolean, out: StepResult): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const minD = a.radius + b.radius;
  const distSq = dx * dx + dy * dy;
  if (distSq >= minD * minD) return;

  const dist = Math.sqrt(distSq);
  // Exakt deckungsgleich: beliebige, aber feste Trennrichtung (deterministisch).
  const nx = dist > 1e-6 ? dx / dist : 1;
  const ny = dist > 1e-6 ? dy / dist : 0;

  const invA = 1 / a.mass;
  const invB = 1 / b.mass;
  const invSum = invA + invB;
  const overlap = minD - dist;
  a.x -= nx * overlap * (invA / invSum);
  a.y -= ny * overlap * (invA / invSum);
  b.x += nx * overlap * (invB / invSum);
  b.y += ny * overlap * (invB / invSum);

  if (!resolveVelocity) return;
  const relN = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (relN >= 0) return; // trennen sich bereits

  const approachA = a.vx * nx + a.vy * ny;
  const approachB = -(b.vx * nx + b.vy * ny);
  const isBall = a === ball || b === ball;
  const e = isBall ? PHYSICS.BALL_RESTITUTION : PHYSICS.RESTITUTION;
  const j = (-(1 + e) * relN) / invSum;
  a.vx -= j * invA * nx;
  a.vy -= j * invA * ny;
  b.vx += j * invB * nx;
  b.vy += j * invB * ny;

  const x = a.x + nx * a.radius;
  const y = a.y + ny * a.radius;
  out.impacts.push({ kind: isBall ? 'ball' : 'unit', speed: -relN, x, y });
  if (!isBall) {
    out.unitContacts.push({ a: a as Unit, b: b as Unit, approachA, approachB, x, y });
  }
}

function collidePost(b: Body, p: { x: number; y: number }, resolveVelocity: boolean, out: StepResult): void {
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  const minD = b.radius + FIELD.postRadius;
  const distSq = dx * dx + dy * dy;
  if (distSq >= minD * minD || distSq < 1e-12) return;
  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  b.x = p.x + nx * minD;
  b.y = p.y + ny * minD;
  if (!resolveVelocity) return;
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return;
  b.vx -= (1 + PHYSICS.POST_RESTITUTION) * vn * nx;
  b.vy -= (1 + PHYSICS.POST_RESTITUTION) * vn * ny;
  out.impacts.push({ kind: 'post', speed: -vn, x: p.x, y: p.y });
}

function collideWalls(b: Body, isBall: boolean, resolveVelocity: boolean, out: StepResult): void {
  const r = b.radius;
  const e = PHYSICS.WALL_RESTITUTION;
  const bounce = (axis: 'vx' | 'vy', sign: 1 | -1, x: number, y: number) => {
    const v = b[axis];
    if (!resolveVelocity || v * sign >= 0) return;
    b[axis] = -v * e;
    out.impacts.push({ kind: 'wall', speed: Math.abs(v), x, y });
  };

  if (b.x - r < 0) { b.x = r; bounce('vx', 1, 0, b.y); }
  if (b.x + r > FIELD.width) { b.x = FIELD.width - r; bounce('vx', -1, FIELD.width, b.y); }

  // Nur der Ball darf durch die Tormündung – Einheiten prallen an der ganzen Linie ab.
  const passes = isBall && inGoalMouth(b.x);
  if (!passes && b.y - r < 0) { b.y = r; bounce('vy', 1, b.x, 0); }
  if (!passes && b.y + r > FIELD.height) { b.y = FIELD.height - r; bounce('vy', -1, b.x, FIELD.height); }
}
