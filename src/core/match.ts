import { BALL, COMBAT, FIELD, PHYSICS, RULES, SHOT } from './config';
import { allAtRest, physicsTick, type UnitContact } from './physics';
import type { GameEvent, MatchSetup, MatchState, TeamId, Unit } from './types';
import { otherTeam } from './types';
import { UNIT_TYPES, unitMass } from './units';

/** Ab dieser Aufprallgeschwindigkeit wird ein Stoß als Ereignis gemeldet (z. B. für Sound). */
const IMPACT_EVENT_MIN_SPEED = 80;

export function createMatch(setup: MatchSetup): MatchState {
  const units: Unit[] = [];
  let id = 0;
  for (const team of ['home', 'away'] as const) {
    setup[team].formation.forEach((slot, i) => {
      const t = UNIT_TYPES[slot.kind];
      units.push({
        id: id++, team, kind: slot.kind, slot: i,
        x: 0, y: 0, vx: 0, vy: 0,
        radius: t.radius, mass: unitMass(t),
        hp: t.hp, maxHp: t.hp, atk: t.atk, shotPower: t.shotPower,
        active: true,
      });
    });
  }
  const state: MatchState = {
    setup,
    units,
    ball: { x: 0, y: 0, vx: 0, vy: 0, radius: BALL.radius, mass: BALL.mass },
    score: { home: 0, away: 0 },
    phase: 'aim',
    turn: setup.firstKickoff,
    phaseTime: 0,
    turnNumber: 0,
    winner: null,
    winReason: null,
    hitCooldowns: {},
  };
  placeForKickoff(state);
  return state;
}

/** Setzt Einheiten auf ihre Formationsplätze und den Ball auf den Anstoßpunkt. */
function placeForKickoff(state: MatchState): void {
  for (const u of state.units) {
    if (RULES.RESTORE_ON_KICKOFF) {
      u.hp = u.maxHp;
      u.active = true;
    }
    const slot = state.setup[u.team].formation[u.slot]!;
    // Formationen sind aus Sicht des Heimteams (unten) angegeben – Auswärtsteam gespiegelt.
    const nx = u.team === 'home' ? slot.x : 1 - slot.x;
    const ny = u.team === 'home' ? slot.y : 1 - slot.y;
    u.x = nx * FIELD.width;
    u.y = ny * FIELD.height;
    u.vx = 0;
    u.vy = 0;
  }
  const b = state.ball;
  b.x = FIELD.width / 2;
  b.y = FIELD.height / 2;
  b.vx = 0;
  b.vy = 0;
  state.hitCooldowns = {};
}

export function activeUnits(state: MatchState, team?: TeamId): Unit[] {
  return state.units.filter(u => u.active && (team === undefined || u.team === team));
}

export function maxShotSpeed(u: Unit): number {
  return SHOT.MAX_SPEED * u.shotPower;
}

/**
 * Schuss-Kommando. Gibt Ereignisse zurück; ungültige Kommandos (falsches Team, falsche
 * Phase, KO-Einheit) werden ignoriert und liefern ein leeres Array.
 */
export function shoot(state: MatchState, team: TeamId, unitId: number, vx: number, vy: number): GameEvent[] {
  if (state.phase !== 'aim' || state.turn !== team) return [];
  const u = state.units.find(x => x.id === unitId);
  if (!u || !u.active || u.team !== team) return [];
  if (!Number.isFinite(vx) || !Number.isFinite(vy)) return [];

  const speed = Math.hypot(vx, vy);
  const max = maxShotSpeed(u);
  const f = speed > max ? max / speed : 1;
  u.vx = vx * f;
  u.vy = vy * f;
  setPhase(state, 'sim');
  return [{ type: 'shot', team, unitId, speed: speed * f }];
}

/** Ein fester Simulations-Tick (PHYSICS.TICK). */
export function tick(state: MatchState): GameEvent[] {
  const dt = PHYSICS.TICK;
  const events: GameEvent[] = [];
  state.phaseTime += dt;

  switch (state.phase) {
    case 'aim':
      // Ein Team ohne Einheiten kann nicht ziehen – das Spiel ist entschieden.
      checkKnockout(state, events);
      break;
    case 'sim':
      simulate(state, dt, events);
      break;
    case 'goal':
      if (state.phaseTime >= RULES.GOAL_PAUSE) afterGoal(state, events);
      break;
    case 'over':
      break;
  }
  return events;
}

function simulate(state: MatchState, dt: number, events: GameEvent[]): void {
  for (const key in state.hitCooldowns) {
    const left = state.hitCooldowns[key]! - dt;
    if (left <= 0) delete state.hitCooldowns[key];
    else state.hitCooldowns[key] = left;
  }

  const units = activeUnits(state);
  const res = physicsTick(units, state.ball, dt);

  for (const imp of res.impacts) {
    if (imp.speed >= IMPACT_EVENT_MIN_SPEED) events.push({ type: 'impact', ...imp });
  }
  for (const c of res.unitContacts) resolveHit(state, c, events);

  const ball = state.ball;
  if (ball.y < 0 || ball.y > FIELD.height) {
    // Ball über die obere Linie: Tor für das Heimteam (es greift nach oben an).
    scoreGoal(state, ball.y < 0 ? 'home' : 'away', events);
    return;
  }

  if (checkKnockout(state, events)) return;

  const atRest = allAtRest(activeUnits(state)) && allAtRest([ball]);
  if (atRest || state.phaseTime >= PHYSICS.MAX_SIM_TIME) {
    if (!atRest) stopAll(state);
    goalKickIfNeeded(state, events);
    startTurn(state, otherTeam(state.turn), events);
  }
}

/**
 * Bleibt der Ball im 5-Meter-Raum liegen, kommt er auf die vordere Ecke des Raums
 * (wie ein Abstoß) – sonst wäre ein Ball direkt vor der Torlinie kaum zu verteidigen.
 */
function goalKickIfNeeded(state: MatchState, events: GameEvent[]): void {
  const ball = state.ball;
  const halfW = FIELD.goalAreaWidth / 2;
  const cx = FIELD.width / 2;
  const top = ball.y < FIELD.goalAreaDepth;
  const bottom = ball.y > FIELD.height - FIELD.goalAreaDepth;
  if (Math.abs(ball.x - cx) > halfW || (!top && !bottom)) return;

  const y = top ? FIELD.goalAreaDepth : FIELD.height - FIELD.goalAreaDepth;
  const side = ball.x < cx ? -1 : 1;
  // Ecke auf der Seite des Balls bevorzugen; ist sie belegt, entlang der Linie zur Mitte rücken,
  // danach die andere Ecke versuchen.
  const candidates: number[] = [];
  for (const s of [side, -side]) {
    for (let step = 0; step <= halfW; step += 20) candidates.push(cx + s * (halfW - step));
  }
  const units = activeUnits(state);
  const free = candidates.find(x =>
    units.every(u => Math.hypot(u.x - x, u.y - y) >= u.radius + ball.radius + 2));
  if (free === undefined) return;
  ball.x = free;
  ball.y = y;
  events.push({ type: 'goalKick', x: ball.x, y: ball.y });
}

/**
 * Rammen: Nur Einheiten des Teams, das gerade geschossen hat, verursachen Schaden, und nur
 * wenn sie selbst schnell genug auf den Gegner zufahren. Ein weggestoßener Gegner, der in eine
 * andere Einheit prallt, verletzt also niemanden. Schaden = ATK des Rammenden.
 */
function resolveHit(state: MatchState, c: UnitContact, events: GameEvent[]): void {
  const { a, b } = c;
  if (a.team === b.team || !a.active || !b.active) return;
  const [attacker, target, approach] = a.team === state.turn ? [a, b, c.approachA] : [b, a, c.approachB];
  if (approach < COMBAT.MIN_IMPACT_SPEED) return;

  const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
  if (state.hitCooldowns[key] !== undefined) return;
  state.hitCooldowns[key] = COMBAT.HIT_COOLDOWN;

  target.hp = Math.max(0, target.hp - attacker.atk);
  events.push({ type: 'hit', attackerId: attacker.id, targetId: target.id, damage: attacker.atk, x: c.x, y: c.y });

  if (target.hp === 0) {
    target.active = false;
    target.vx = 0;
    target.vy = 0;
    events.push({ type: 'ko', unitId: target.id, x: target.x, y: target.y });
  }
}

function checkKnockout(state: MatchState, events: GameEvent[]): boolean {
  const homeAlive = activeUnits(state, 'home').length > 0;
  const awayAlive = activeUnits(state, 'away').length > 0;
  if (homeAlive && awayAlive) return false;
  // Sind beide Teams leer, gewinnt das Team, das zuletzt geschossen hat.
  const winner: TeamId = homeAlive ? 'home' : awayAlive ? 'away' : state.turn;
  endMatch(state, winner, 'knockout', events);
  return true;
}

function scoreGoal(state: MatchState, scorer: TeamId, events: GameEvent[]): void {
  state.score[scorer]++;
  stopAll(state);
  events.push({ type: 'goal', scorer });
  // Damit afterGoal weiß, wer den Anstoß hat: das Team, das das Tor kassiert hat.
  state.turn = otherTeam(scorer);
  setPhase(state, 'goal');
}

function afterGoal(state: MatchState, events: GameEvent[]): void {
  for (const team of ['home', 'away'] as const) {
    if (state.score[team] >= state.setup.goalsToWin) {
      endMatch(state, team, 'goals', events);
      return;
    }
  }
  placeForKickoff(state);
  startTurn(state, state.turn, events);
}

function startTurn(state: MatchState, team: TeamId, events: GameEvent[]): void {
  state.turn = team;
  state.turnNumber++;
  setPhase(state, 'aim');
  if (!checkKnockout(state, events)) events.push({ type: 'turn', team });
}

function endMatch(state: MatchState, winner: TeamId, reason: 'goals' | 'knockout', events: GameEvent[]): void {
  state.winner = winner;
  state.winReason = reason;
  stopAll(state);
  setPhase(state, 'over');
  events.push({ type: 'over', winner, reason });
}

function stopAll(state: MatchState): void {
  for (const u of state.units) { u.vx = 0; u.vy = 0; }
  state.ball.vx = 0;
  state.ball.vy = 0;
}

function setPhase(state: MatchState, phase: MatchState['phase']): void {
  state.phase = phase;
  state.phaseTime = 0;
}
