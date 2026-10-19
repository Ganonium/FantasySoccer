import { BALL, COMBAT, FIELD, PHYSICS } from './config';
import { activeUnits, maxShotSpeed } from './match';
import type { Body, MatchState, TeamId, Unit } from './types';
import { otherTeam } from './types';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface AiProfile {
  /** Maximale Winkelabweichung in Radiant. */
  scatter: number;
  /** Relative Abweichung der Schusskraft. */
  powerNoise: number;
  /** Gewichtung von Rammangriffen gegenüber Schüssen auf den Ball (0 = nie rammen). */
  ramWeight: number;
  /** Bedenkzeit in Sekunden (Simulationszeit). */
  thinkTime: number;
}

export const AI_PROFILES: Record<Difficulty, AiProfile> = {
  easy: { scatter: 0.12, powerNoise: 0.18, ramWeight: 0, thinkTime: 1.0 },
  normal: { scatter: 0.06, powerNoise: 0.1, ramWeight: 0.5, thinkTime: 0.9 },
  hard: { scatter: 0.025, powerNoise: 0.05, ramWeight: 1, thinkTime: 0.8 },
};

export interface PlannedShot {
  unitId: number;
  vx: number;
  vy: number;
}

interface Candidate extends PlannedShot {
  score: number;
}

/**
 * Plant einen Schuss für `team`. Liefert null nur, wenn das Team keine Einheiten mehr hat.
 * Strategie: für jede Einheit den „Geisterball“-Punkt hinter dem Ball anvisieren, sodass der
 * Ball Richtung gegnerisches Tor abprallt; alternativ angeschlagene Gegner vom Feld rammen.
 */
export function planShot(state: MatchState, team: TeamId, profile: AiProfile, rng: () => number): PlannedShot | null {
  const own = activeUnits(state, team);
  if (!own.length) return null;

  const enemies = activeUnits(state, otherTeam(team));
  const all: Body[] = [...activeUnits(state), state.ball];
  const goalY = team === 'home' ? 0 : FIELD.height;
  const candidates: Candidate[] = [];

  for (const u of own) {
    for (const offset of [0, -0.3, 0.3]) {
      const goal = { x: FIELD.width / 2 + offset * FIELD.goalWidth, y: goalY };
      candidates.push(ballShot(u, state, goal, all));
    }
    if (profile.ramWeight > 0) {
      for (const t of enemies) {
        const c = ramShot(u, t, all, profile.ramWeight);
        if (c) candidates.push(c);
      }
    }
  }

  let best = candidates[0]!;
  for (const c of candidates) if (c.score > best.score) best = c;

  const angle = Math.atan2(best.vy, best.vx) + (rng() * 2 - 1) * profile.scatter;
  const speed = Math.hypot(best.vx, best.vy) * (1 + (rng() * 2 - 1) * profile.powerNoise);
  return { unitId: best.unitId, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

function ballShot(u: Unit, state: MatchState, goal: { x: number; y: number }, all: Body[]): Candidate {
  const ball = state.ball;
  const bg = norm(goal.x - ball.x, goal.y - ball.y);
  // Geisterball: wo der Spielermittelpunkt beim Kontakt sein muss.
  const ghost = { x: ball.x - bg.x * (u.radius + ball.radius), y: ball.y - bg.y * (u.radius + ball.radius) };
  const toGhost = norm(ghost.x - u.x, ghost.y - u.y);
  const cut = toGhost.x * bg.x + toGhost.y * bg.y; // 1 = gerader Stoß, ≤ 0 = unmöglich

  const ballDist = Math.hypot(goal.x - ball.x, goal.y - ball.y);
  const ballSpeed = speedForDistance(ballDist + 250);
  const transfer = ((1 + PHYSICS.BALL_RESTITUTION) * u.mass) / (u.mass + BALL.mass);
  const contactSpeed = ballSpeed / (transfer * Math.max(cut, 0.35));
  const speed = speedForDistance(toGhost.len + travelDistance(contactSpeed));
  const max = maxShotSpeed(u);

  let score = cut - 0.35 * (toGhost.len / FIELD.height);
  if (cut < 0.2) score -= 1;
  if (speed > max) score -= 0.4 * (speed / max - 1);
  if (pathBlocked(u, ghost, u.radius, all, [u, ball])) score -= 0.8;
  if (pathBlocked(ball, goal, ball.radius, all, [u, ball])) score -= 0.4;
  if (ghost.x < u.radius || ghost.x > FIELD.width - u.radius) score -= 0.5;

  const v = Math.min(speed, max);
  return { unitId: u.id, vx: toGhost.x * v, vy: toGhost.y * v, score };
}

function ramShot(u: Unit, t: Unit, all: Body[], weight: number): Candidate | null {
  if (pathBlocked(u, t, u.radius, all, [u, t])) return null;
  const d = norm(t.x - u.x, t.y - u.y);
  const gap = Math.max(0, d.len - u.radius - t.radius);
  const speed = speedForDistance(gap + travelDistance(COMBAT.MIN_IMPACT_SPEED * 1.6));
  const max = maxShotSpeed(u);
  if (speed > max) return null;
  const finishing = t.hp <= u.atk;
  const score = weight * ((finishing ? 0.95 : 0.4) - 0.3 * (gap / FIELD.height));
  return { unitId: u.id, vx: d.x * speed, vy: d.y * speed, score };
}

/** Prüft, ob ein Kreis mit Radius r auf dem Weg von `from` nach `to` an anderen Körpern hängen bleibt. */
function pathBlocked(from: { x: number; y: number }, to: { x: number; y: number }, r: number, all: Body[], ignore: Body[]): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lenSq = dx * dx + dy * dy || 1;
  for (const o of all) {
    if (ignore.includes(o)) continue;
    const t = Math.max(0, Math.min(1, ((o.x - from.x) * dx + (o.y - from.y) * dy) / lenSq));
    const px = from.x + dx * t - o.x;
    const py = from.y + dy * t - o.y;
    if (px * px + py * py < (r + o.radius) ** 2) return true;
  }
  return false;
}

/** Strecke, die ein Körper mit Anfangsgeschwindigkeit v bis zum Stillstand rollt (analytisch). */
export function travelDistance(v: number): number {
  const k = PHYSICS.DAMPING;
  const c = PHYSICS.ROLL_DECEL;
  return v / k - (c / (k * k)) * Math.log(1 + (k * v) / c);
}

/** Umkehrung von travelDistance per Bisektion. */
export function speedForDistance(d: number): number {
  let lo = 0;
  let hi = 20000;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (travelDistance(mid) < d) lo = mid;
    else hi = mid;
  }
  return hi;
}

function norm(x: number, y: number) {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len, len };
}
