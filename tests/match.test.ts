import { describe, expect, it } from 'vitest';
import { AI_PROFILES, planShot } from '../src/core/ai';
import { CAMPAIGN } from '../src/core/campaign';
import { FIELD, PHYSICS, RULES } from '../src/core/config';
import { activeUnits, createMatch, shoot, tick } from '../src/core/match';
import { createRng } from '../src/core/rng';
import type { GameEvent, MatchState, Unit } from '../src/core/types';
import { otherTeam } from '../src/core/types';

const level = (id: string) => CAMPAIGN.find(l => l.id === id)!;

/** Simuliert bis zur nächsten Zielphase (oder Spielende) und sammelt alle Ereignisse. */
function runUntilAim(state: MatchState, maxSeconds = 30): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < maxSeconds / PHYSICS.TICK; i++) {
    events.push(...tick(state));
    if (state.phase === 'aim' || state.phase === 'over') break;
  }
  return events;
}

describe('Zugablauf', () => {
  it('wechselt nach dem Ausrollen das Team', () => {
    const s = createMatch(level('training').setup);
    expect(s.turn).toBe('home');
    const u = activeUnits(s, 'home')[0]!;
    expect(shoot(s, 'home', u.id, 0, -300)).toHaveLength(1);
    const ev = runUntilAim(s);
    expect(s.phase).toBe('aim');
    expect(s.turn).toBe('away');
    expect(ev.some(e => e.type === 'turn' && e.team === 'away')).toBe(true);
  });

  it('ignoriert Schüsse außerhalb des eigenen Zuges', () => {
    const s = createMatch(level('training').setup);
    const enemy = activeUnits(s, 'away')[0]!;
    expect(shoot(s, 'away', enemy.id, 0, 500)).toEqual([]);
    const own = activeUnits(s, 'home')[0]!;
    expect(shoot(s, 'home', enemy.id, 0, 500)).toEqual([]); // fremde Einheit
    shoot(s, 'home', own.id, 0, -500);
    expect(shoot(s, 'home', own.id, 0, -500)).toEqual([]); // Doppelzug
  });

  it('begrenzt die Schussgeschwindigkeit', () => {
    const s = createMatch(level('training').setup);
    const u = activeUnits(s, 'home')[0]!;
    const [e] = shoot(s, 'home', u.id, 0, -1e9);
    expect(e?.type === 'shot' && e.speed).toBeLessThanOrEqual(2900 * u.shotPower + 1e-6);
  });
});

describe('Tore', () => {
  it('zählt ein Tor, pausiert und gibt dem Gegner den Anstoß', () => {
    const s = createMatch(level('training').setup);
    s.ball.x = FIELD.width / 2;
    s.ball.y = 60;
    const u = activeUnits(s, 'home')[1]!;
    u.x = FIELD.width / 2;
    u.y = 200;
    shoot(s, 'home', u.id, 0, -2500);
    const ev = runUntilAim(s);
    expect(ev.some(e => e.type === 'goal' && e.scorer === 'home')).toBe(true);
    expect(s.score.home).toBe(1);
    expect(s.turn).toBe('away');
    expect(s.ball.y).toBe(FIELD.height / 2);
  });

  it('beendet das Spiel bei goalsToWin', () => {
    const s = createMatch(level('training').setup);
    s.score.home = s.setup.goalsToWin - 1;
    s.ball.y = 60;
    s.ball.x = FIELD.width / 2;
    s.ball.vy = -2000;
    s.phase = 'sim';
    const ev = runUntilAim(s, RULES.GOAL_PAUSE + 2);
    expect(s.phase).toBe('over');
    expect(s.winner).toBe('home');
    expect(ev.some(e => e.type === 'over' && e.reason === 'goals')).toBe(true);
  });
});

describe('HP/ATK – Rammen', () => {
  function setupRam(attackerSpeed: number) {
    const s = createMatch(level('orcs').setup);
    const attacker = activeUnits(s, 'home')[0]!;
    const target = activeUnits(s, 'away')[0]!;
    attacker.x = 450; attacker.y = 1000;
    target.x = 450; target.y = 700;
    s.ball.x = 100; s.ball.y = 1400;
    shoot(s, 'home', attacker.id, 0, -attackerSpeed);
    return { s, attacker, target };
  }

  it('zieht dem Gerammten die ATK des Angreifers ab', () => {
    const { s, attacker, target } = setupRam(2000);
    const ev = runUntilAim(s);
    const hits = ev.filter(e => e.type === 'hit');
    expect(hits).toHaveLength(1);
    expect(target.hp).toBe(target.maxHp - attacker.atk);
    expect(attacker.hp).toBe(attacker.maxHp);
  });

  it('macht bei sanfter Berührung keinen Schaden', () => {
    const { s, target } = setupRam(500);
    runUntilAim(s);
    expect(target.hp).toBe(target.maxHp);
  });

  it('verletzt niemanden, wenn ein weggestoßener Gegner in eine andere Einheit prallt', () => {
    const s = createMatch(level('goblins').setup);
    const [attacker, bystander] = activeUnits(s, 'home') as [Unit, Unit];
    const goblin = activeUnits(s, 'away')[0]!;
    for (const u of activeUnits(s)) { u.x = 80 + u.id * 10; u.y = 80; } // aus dem Weg
    s.units.filter(u => u.team === 'away' && u !== goblin).forEach((u, i) => { u.x = 700 + i * 0; u.y = 300 + i * 120; });
    attacker.x = 450; attacker.y = 1300;
    goblin.x = 450; goblin.y = 1000;
    bystander.x = 450; bystander.y = 700;
    s.ball.x = 150; s.ball.y = 1450;
    shoot(s, 'home', attacker.id, 0, -2900);
    const ev = runUntilAim(s);
    expect(ev.some(e => e.type === 'hit' && e.targetId === goblin.id)).toBe(true);
    expect(bystander.hp).toBe(bystander.maxHp);
    expect(ev.filter(e => e.type === 'hit')).toHaveLength(1);
  });

  it('nimmt Einheiten bei 0 HP vom Feld', () => {
    const { s, target } = setupRam(2000);
    target.hp = 1;
    const ev = runUntilAim(s);
    expect(target.active).toBe(false);
    expect(ev.some(e => e.type === 'ko' && e.unitId === target.id)).toBe(true);
  });

  it('gewinnt per K.O., wenn kein Gegner mehr steht', () => {
    const s = createMatch(level('orcs').setup);
    for (const u of activeUnits(s, 'away')) u.active = false;
    const ev = tick(s);
    expect(s.phase).toBe('over');
    expect(s.winner).toBe('home');
    expect(ev.some(e => e.type === 'over' && e.reason === 'knockout')).toBe(true);
  });
});

describe('Spielfeld-Regeln', () => {
  it('lässt beim Anstoß keinen freien Schusskanal vom Ball ins gegnerische Tor', () => {
    for (const l of CAMPAIGN) {
      for (const team of ['home', 'away'] as const) {
        const s = createMatch(l.setup);
        const goalY = team === 'home' ? 0 : FIELD.height;
        const blocked = activeUnits(s, otherTeam(team)).some(u =>
          Math.abs(u.x - s.ball.x) < u.radius + s.ball.radius && (goalY < s.ball.y ? u.y < s.ball.y : u.y > s.ball.y));
        expect(blocked, `${l.id}: ${team} hat freie Bahn`).toBe(true);
      }
    }
  });

  it('legt einen im 5-Meter-Raum liegenden Ball auf dessen Ecke (Abstoß)', () => {
    const s = createMatch(level('training').setup);
    const u = activeUnits(s, 'home')[0]!;
    shoot(s, 'home', u.id, 0, -50); // kurzer Zug, Ball bleibt liegen
    s.ball.x = FIELD.width / 2 - 40;
    s.ball.y = 40;
    const ev = runUntilAim(s);
    expect(ev.some(e => e.type === 'goalKick')).toBe(true);
    expect(s.ball.y).toBe(FIELD.goalAreaDepth);
    expect(s.ball.x).toBe(FIELD.width / 2 - FIELD.goalAreaWidth / 2);
    expect(s.score.home).toBe(0);
  });
});

describe('KI', () => {
  it('plant für jedes Level einen gültigen Schuss', () => {
    for (const l of CAMPAIGN) {
      const s = createMatch({ ...l.setup, firstKickoff: 'away' });
      const shot = planShot(s, 'away', AI_PROFILES.hard, createRng(7));
      expect(shot).not.toBeNull();
      expect(shoot(s, 'away', shot!.unitId, shot!.vx, shot!.vy)).toHaveLength(1);
    }
  });

  it('trifft aus guter Position den Ball Richtung Tor', () => {
    const s = createMatch({ ...level('training').setup, firstKickoff: 'away' });
    s.ball.x = FIELD.width / 2;
    s.ball.y = 1000;
    // Den mittleren Verteidiger aus der Schusslinie nehmen.
    const keeper = activeUnits(s, 'home')[1]!;
    keeper.x = 120;
    keeper.y = 1450;
    const shot = planShot(s, 'away', { ...AI_PROFILES.hard, scatter: 0, powerNoise: 0 }, createRng(1));
    shoot(s, 'away', shot!.unitId, shot!.vx, shot!.vy);
    const ev = runUntilAim(s);
    expect(ev.some(e => e.type === 'goal' && e.scorer === 'away')).toBe(true);
  });

  it('ist deterministisch: gleicher Seed, gleiches Spiel', () => {
    const play = () => {
      const s = createMatch(level('goblins').setup);
      const rng = createRng(42);
      for (let turn = 0; turn < 12 && s.phase !== 'over'; turn++) {
        const shot = planShot(s, s.turn, AI_PROFILES.normal, rng)!;
        shoot(s, s.turn, shot.unitId, shot.vx, shot.vy);
        runUntilAim(s);
      }
      return JSON.stringify(s);
    };
    expect(play()).toBe(play());
  });
});
