import { describe, expect, it } from 'vitest';
import { FIELD, PHYSICS } from '../src/core/config';
import { physicsTick } from '../src/core/physics';
import type { Ball, Unit } from '../src/core/types';

function unit(id: number, x: number, y: number, extra: Partial<Unit> = {}): Unit {
  return {
    id, team: 'home', kind: 'knight', slot: 0, x, y, vx: 0, vy: 0, radius: 66, mass: 1,
    hp: 3, maxHp: 3, atk: 1, shotPower: 1, active: true, ...extra,
  };
}

function ballAt(x: number, y: number): Ball {
  return { x, y, vx: 0, vy: 0, radius: 33, mass: 0.14 };
}

const momentum = (us: Unit[]) => us.reduce((s, u) => s + u.mass * u.vx, 0);

describe('Kollisionen', () => {
  it('erhält den Impuls und wendet die Restitution korrekt an', () => {
    const a = unit(0, 300, 800, { vx: 1000 });
    const b = unit(1, 433, 800); // knapp vor dem Kontakt
    const ball = ballAt(100, 200);
    const before = momentum([a, b]);
    // Kein Damping-Einfluss: nur so lange simulieren, bis der Stoß passiert ist.
    for (let i = 0; i < 4 && b.vx === 0; i++) physicsTick([a, b], ball, PHYSICS.TICK);
    expect(b.vx).toBeGreaterThan(0);
    // Impulserhaltung (bis auf die Dämpfung der wenigen Ticks)
    expect(momentum([a, b])).toBeCloseTo(before, -2);
    // Restitution: Trenngeschwindigkeit ≈ e · Annäherungsgeschwindigkeit
    const sep = b.vx - a.vx;
    const appr = a.vx + b.vx; // gleiche Massen: Summe ≈ Anfangsgeschwindigkeit
    expect(sep / appr).toBeCloseTo(PHYSICS.RESTITUTION, 1);
  });

  it('lässt Körper bei hoher Geschwindigkeit nicht durcheinander tunneln', () => {
    const a = unit(0, 200, 800, { vx: 2900 });
    const b = unit(1, 400, 800);
    const ball = ballAt(100, 200);
    for (let i = 0; i < 30; i++) physicsTick([a, b], ball, PHYSICS.TICK);
    expect(b.x).toBeGreaterThan(a.x);
  });
});

describe('Wände und Tore', () => {
  it('lässt den Ball durch die Tormündung', () => {
    const ball = ballAt(FIELD.width / 2, 100);
    ball.vy = -2000;
    for (let i = 0; i < 30; i++) physicsTick([], ball, PHYSICS.TICK);
    expect(ball.y).toBeLessThan(0);
  });

  it('lässt Einheiten nie über die Torlinie', () => {
    const u = unit(0, FIELD.width / 2, 200, { vy: -2900 });
    for (let i = 0; i < 60; i++) physicsTick([u], ballAt(100, 800), PHYSICS.TICK);
    expect(u.y).toBeGreaterThanOrEqual(u.radius - 1e-9);
  });

  it('blockt den Ball neben dem Tor', () => {
    const ball = ballAt(80, 100);
    ball.vy = -2000;
    for (let i = 0; i < 30; i++) physicsTick([], ball, PHYSICS.TICK);
    expect(ball.y).toBeGreaterThanOrEqual(ball.radius - 1e-9);
  });

  it('bringt alles zum Stillstand', () => {
    const u = unit(0, 450, 800, { vx: 2900, vy: 1500 });
    const ball = ballAt(300, 600);
    let ticks = 0;
    while ((u.vx || u.vy || ball.vx || ball.vy) && ticks < 120 * 20) {
      physicsTick([u], ball, PHYSICS.TICK);
      ticks++;
    }
    expect(ticks).toBeLessThan(120 * 20);
  });
});
