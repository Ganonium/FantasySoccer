import './style.css';
import { AI_PROFILES, planShot, type AiProfile } from '../core/ai';
import { CAMPAIGN, type Level } from '../core/campaign';
import { PHYSICS, SHOT } from '../core/config';
import { activeUnits, createMatch, maxShotSpeed, shoot, tick } from '../core/match';
import { createRng } from '../core/rng';
import type { GameEvent, MatchState, TeamId } from '../core/types';
import { loadCosmetics, saveCosmetics, skinText, type Cosmetics } from './cosmetics';
import { Input } from './input';
import { loadProgress, markCompleted } from './progress';
import { Renderer } from './renderer';
import { unitSprite } from './sprites';

/** Das Heimteam spielt der Mensch, das Auswärtsteam die KI. */
const HUMAN: TeamId = 'home';
const AI_TEAM: TeamId = 'away';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

class Game {
  private state: MatchState | null = null;
  private level: Level | null = null;
  private profile: AiProfile = AI_PROFILES.normal;
  private rng = createRng(1);
  private acc = 0;
  private last = 0;
  private running = false;
  private bannerTimer = 0;
  readonly renderer: Renderer;
  private readonly input: Input;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas, this.renderer, {
      selectable: () => {
        const s = this.state;
        return s && s.phase === 'aim' && s.turn === HUMAN ? activeUnits(s, HUMAN) : [];
      },
      onShoot: (unit, pullX, pullY) => {
        if (!this.state) return;
        const len = Math.hypot(pullX, pullY);
        const speed = (Math.min(len, SHOT.MAX_PULL) / SHOT.MAX_PULL) * maxShotSpeed(unit);
        this.handle(shoot(this.state, HUMAN, unit.id, (-pullX / len) * speed, (-pullY / len) * speed));
      },
    });
    new ResizeObserver(() => this.renderer.resize()).observe(canvas);
    document.addEventListener('visibilitychange', () => { this.last = performance.now(); });
  }

  start(level: Level): void {
    this.level = level;
    this.profile = AI_PROFILES[level.difficulty];
    const seed = (Math.random() * 2 ** 32) >>> 0;
    this.rng = createRng(seed);
    this.state = createMatch(level.setup);
    this.input.reset();
    this.acc = 0;
    $('name-home').textContent = skinText(level.setup.home.name, cosmetics);
    $('name-away').textContent = skinText(level.setup.away.name, cosmetics);
    $('score-home').style.color = level.setup.home.color;
    $('score-away').style.color = level.setup.away.color;
    this.updateHud();
    if (!this.running) {
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame(this.frame);
    }
  }

  stop(): void {
    this.running = false;
    this.state = null;
    this.input.reset();
  }

  private readonly frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, 0.25);
    this.last = now;
    this.acc += dt;
    while (this.acc >= PHYSICS.TICK && this.state) {
      this.acc -= PHYSICS.TICK;
      this.step(this.state);
    }
    this.renderer.update(dt);
    if (this.state) {
      const selectable = this.state.phase === 'aim' && this.state.turn === HUMAN && !this.input.drag ? HUMAN : null;
      this.renderer.draw(this.state, { drag: this.input.drag, selectable });
    }
    requestAnimationFrame(this.frame);
  };

  private step(state: MatchState): void {
    // KI zieht nach ihrer Bedenkzeit – gemessen in Simulationszeit, also pausierbar.
    if (state.phase === 'aim' && state.turn === AI_TEAM && state.phaseTime >= this.profile.thinkTime) {
      const shot = planShot(state, AI_TEAM, this.profile, this.rng);
      if (shot) this.handle(shoot(state, AI_TEAM, shot.unitId, shot.vx, shot.vy));
    }
    this.handle(tick(state));
  }

  private handle(events: GameEvent[]): void {
    const state = this.state;
    if (!state || !events.length) return;
    this.renderer.onEvents(state, events);
    for (const e of events) {
      if (e.type === 'goal') {
        const ours = e.scorer === HUMAN;
        this.showBanner(ours ? '⚽ TOR!' : 'Gegentor', state.setup[e.scorer].color);
      } else if (e.type === 'goalKick') {
        this.showBanner('Abstoß', '#ffffff');
      } else if (e.type === 'over') {
        this.input.reset();
        const level = this.level;
        if (e.winner === HUMAN && level) markCompleted(level.id);
        window.setTimeout(() => { if (this.state === state) showResult(state, level); }, 900);
      }
    }
    this.updateHud();
  }

  private updateHud(): void {
    const s = this.state;
    if (!s) return;
    $('score-home').textContent = String(s.score.home);
    $('score-away').textContent = String(s.score.away);
    const el = $('turn');
    const [text, color] =
      s.phase === 'aim' ? (s.turn === HUMAN ? ['▶ Dein Zug', s.setup.home.color] : [`◀ ${skinText(s.setup.away.name, cosmetics)} …`, s.setup.away.color])
      : s.phase === 'sim' ? ['···', 'rgba(255,255,255,0.35)']
      : s.phase === 'goal' ? ['Tor', '#ffd600']
      : ['Abpfiff', 'rgba(255,255,255,0.6)'];
    el.textContent = text;
    el.style.color = color;
  }

  private showBanner(text: string, color: string): void {
    const el = $('banner');
    el.textContent = text;
    el.style.color = color;
    el.classList.add('show');
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => el.classList.remove('show'), 1600);
  }
}

// ── Menü & Ergebnis ──────────────────────────────────────────────────────────

const game = new Game($<HTMLCanvasElement>('canvas'));
let cosmetics: Cosmetics = loadCosmetics();
game.renderer.cosmetics = cosmetics;

// Easter Egg: Knöpfe unten im Menü schalten die Verkleidungen der Ritter um.
function setupEasterEggs(): void {
  const toggles: Array<[string, keyof Cosmetics]> = [['egg-unicorn', 'unicorn'], ['egg-halloween', 'halloween']];
  for (const [id, key] of toggles) {
    const btn = $<HTMLButtonElement>(id);
    btn.setAttribute('aria-pressed', String(cosmetics[key]));
    btn.addEventListener('click', () => {
      cosmetics = { ...cosmetics, [key]: !cosmetics[key] };
      game.renderer.cosmetics = cosmetics;
      saveCosmetics(cosmetics);
      btn.setAttribute('aria-pressed', String(cosmetics[key]));
      showMenu();
    });
  }
}

function showMenu(): void {
  game.stop();
  $('hud').hidden = true;
  $('result').hidden = true;
  const { completed } = loadProgress();
  const list = $('levels');
  list.replaceChildren();
  CAMPAIGN.forEach((level, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'level';
    // Alle Gegner sind frei wählbar – keine feste Reihenfolge, damit sich jeder einzeln spielen lässt.
    const badge = completed.includes(level.id) ? '✓ Geschafft' : `Kapitel ${i + 1}`;
    btn.innerHTML = `<span class="text"><span class="badge"></span><span class="title"></span><span class="intro"></span></span><img class="portrait" alt="" />`;
    const away = level.setup.away;
    btn.querySelector<HTMLImageElement>('.portrait')!.src = unitSprite(away.formation[0]!.kind, away.color, away.look, cosmetics).toDataURL();
    btn.querySelector('.badge')!.textContent = badge;
    btn.querySelector('.title')!.textContent = level.title;
    btn.querySelector('.intro')!.textContent = skinText(level.intro, cosmetics);
    btn.addEventListener('click', () => play(level));
    li.append(btn);
    list.append(li);
  });
  $('menu').hidden = false;
}

function play(level: Level): void {
  $('menu').hidden = true;
  $('result').hidden = true;
  $('hud').hidden = false;
  game.start(level);
}

function showResult(state: MatchState, level: Level | null): void {
  const won = state.winner === HUMAN;
  $('result-title').textContent = won ? 'Sieg!' : 'Niederlage';
  $('result-text').textContent =
    state.winReason === 'knockout'
      ? won
        ? `Alle ${skinText(state.setup.away.name, cosmetics)} wurden vom Feld gerammt.`
        : 'Deine Mannschaft wurde komplett vom Feld gerammt.'
      : `Endstand ${state.score.home} : ${state.score.away}`;

  const idx = level ? CAMPAIGN.indexOf(level) : -1;
  const next = CAMPAIGN[idx + 1];
  const nextBtn = $<HTMLButtonElement>('next');
  nextBtn.hidden = !(won && next);
  nextBtn.onclick = () => next && play(next);
  $('retry').onclick = () => level && play(level);
  $('result').hidden = false;
}

$('to-menu').addEventListener('click', showMenu);
$('quit').addEventListener('click', showMenu);
setupEasterEggs();
showMenu();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
