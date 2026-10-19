import { FIELD, SHOT } from '../core/config';
import { POSTS } from '../core/physics';
import type { GameEvent, MatchState, TeamId, TeamLook, Unit } from '../core/types';
import { unitSprite } from './sprites';

/** Rand um Feld und Tore in Feld-Einheiten. */
const MARGIN = 16;
const WORLD = {
  left: -MARGIN,
  top: -FIELD.goalDepth - MARGIN,
  width: FIELD.width + 2 * MARGIN,
  height: FIELD.height + 2 * (FIELD.goalDepth + MARGIN),
};

export interface DragView {
  unit: Unit;
  /** Zieh-Vektor in Feld-Einheiten (Schussrichtung = Gegenrichtung des Ziehens). */
  pullX: number;
  pullY: number;
}

export interface DrawOptions {
  drag: DragView | null;
  /** Team, dessen Einheiten gerade ausgewählt werden können (hervorgehoben). */
  selectable: TeamId | null;
}

interface Effect {
  kind: 'damage' | 'ko' | 'goal';
  x: number;
  y: number;
  t: number;
  duration: number;
  text?: string;
  color: string;
  radius?: number;
}

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private dpr = 1;
  private effects: Effect[] = [];
  private flashes = new Map<number, number>();
  private clock = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D wird nicht unterstützt');
    this.ctx = ctx;
  }

  /** An die CSS-Größe des Canvas anpassen – scharf auf hochauflösenden Displays. */
  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.scale = Math.min(rect.width / WORLD.width, rect.height / WORLD.height);
    this.offsetX = (rect.width - WORLD.width * this.scale) / 2 - WORLD.left * this.scale;
    this.offsetY = (rect.height - WORLD.height * this.scale) / 2 - WORLD.top * this.scale;
  }

  screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.offsetX) / this.scale,
      y: (clientY - rect.top - this.offsetY) / this.scale,
    };
  }

  /** Visuelle Effekte aus Spielereignissen ableiten. */
  onEvents(state: MatchState, events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'hit') {
        this.flashes.set(e.targetId, 0.3);
        const target = state.units.find(u => u.id === e.targetId);
        if (target) {
          this.effects.push({ kind: 'damage', x: target.x, y: target.y - target.radius, t: 0, duration: 0.9, text: `−${e.damage}`, color: '#ffd54f' });
        }
      } else if (e.type === 'ko') {
        const u = state.units.find(x => x.id === e.unitId);
        this.effects.push({ kind: 'ko', x: e.x, y: e.y, t: 0, duration: 0.7, color: u ? state.setup[u.team].color : '#fff', radius: u?.radius ?? 60 });
      } else if (e.type === 'goalKick') {
        this.effects.push({ kind: 'ko', x: e.x, y: e.y, t: 0, duration: 0.8, color: '#ffffff', radius: state.ball.radius });
      } else if (e.type === 'goal') {
        this.effects.push({ kind: 'goal', x: 0, y: 0, t: 0, duration: 1.6, color: state.setup[e.scorer].color });
      }
    }
  }

  update(dt: number): void {
    this.clock += dt;
    for (const fx of this.effects) fx.t += dt;
    this.effects = this.effects.filter(fx => fx.t < fx.duration);
    for (const [id, t] of this.flashes) {
      if (t - dt <= 0) this.flashes.delete(id);
      else this.flashes.set(id, t - dt);
    }
  }

  draw(state: MatchState, opts: DrawOptions): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const s = this.scale * this.dpr;
    ctx.setTransform(s, 0, 0, s, this.offsetX * this.dpr, this.offsetY * this.dpr);

    this.drawField(state);
    for (const fx of this.effects) if (fx.kind === 'goal') this.drawGoalFlash(fx);
    for (const fx of this.effects) if (fx.kind === 'ko') this.drawKo(fx);

    const selectedId = opts.drag?.unit.id ?? -1;
    for (const u of state.units) {
      if (!u.active) continue;
      const highlight = opts.selectable === u.team;
      const team = state.setup[u.team];
      this.drawUnit(u, team.color, team.look, u.id === selectedId, highlight);
    }
    this.drawBall(state.ball.x, state.ball.y, state.ball.radius);
    if (opts.drag) this.drawDrag(opts.drag);
    for (const fx of this.effects) if (fx.kind === 'damage') this.drawDamage(fx);
  }

  private drawField(state: MatchState): void {
    const ctx = this.ctx;
    const W = FIELD.width;
    const H = FIELD.height;

    const R = FIELD.cornerRadius;
    const pitch = new Path2D();
    pitch.roundRect(0, 0, W, H, R);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0d1f0e');
    grad.addColorStop(0.5, '#122413');
    grad.addColorStop(1, '#0d1f0e');
    ctx.fillStyle = grad;
    ctx.fill(pitch);

    ctx.save();
    ctx.clip(pitch);
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    const stripes = 10;
    for (let i = 0; i < stripes; i += 2) ctx.fillRect(0, (i * H) / stripes, W, H / stripes);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 4;
    ctx.stroke(pitch);
    ctx.save();
    ctx.clip(pitch);
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, W * 0.13, 0, Math.PI * 2);
    ctx.stroke();
    // Strafräume
    const pw = FIELD.penaltyAreaWidth;
    const ph = FIELD.penaltyAreaDepth;
    ctx.strokeRect((W - pw) / 2, 0, pw, ph);
    ctx.strokeRect((W - pw) / 2, H - ph, pw, ph);
    // 5-Meter-Räume (Abstoßzone) etwas deutlicher, mit Abstoßpunkten an den Ecken
    const aw = FIELD.goalAreaWidth;
    const ah = FIELD.goalAreaDepth;
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect((W - aw) / 2, 0, aw, ah);
    ctx.fillRect((W - aw) / 2, H - ah, aw, ah);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeRect((W - aw) / 2, 0, aw, ah);
    ctx.strokeRect((W - aw) / 2, H - ah, aw, ah);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (const x of [(W - aw) / 2, (W + aw) / 2]) {
      for (const y of [ah, H - ah]) {
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Tore: oben verteidigt das Auswärtsteam, unten das Heimteam.
    const gx = (W - FIELD.goalWidth) / 2;
    const goals: Array<{ team: TeamId; y: number }> = [
      { team: 'away', y: -FIELD.goalDepth },
      { team: 'home', y: H },
    ];
    for (const g of goals) {
      const color = state.setup[g.team].color;
      ctx.fillStyle = color + '2e';
      ctx.fillRect(gx, g.y, FIELD.goalWidth, FIELD.goalDepth);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 3;
      ctx.strokeRect(gx, g.y, FIELD.goalWidth, FIELD.goalDepth);
      ctx.strokeStyle = color;
      ctx.lineWidth = 7;
      const lineY = g.team === 'away' ? 0 : H;
      ctx.beginPath();
      ctx.moveTo(gx, lineY);
      ctx.lineTo(gx + FIELD.goalWidth, lineY);
      ctx.stroke();
    }
    ctx.fillStyle = '#e0e0e0';
    for (const p of POSTS) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, FIELD.postRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawUnit(u: Unit, color: string, look: TeamLook | undefined, selected: boolean, highlight: boolean): void {
    const ctx = this.ctx;
    const r = u.radius;
    const flash = this.flashes.get(u.id) ?? 0;

    ctx.save();
    ctx.translate(u.x, u.y);

    // Schlagschatten
    ctx.beginPath();
    ctx.ellipse(r * 0.08, r * 0.14, r, r * 0.96, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();

    // Porträt der Einheit
    ctx.drawImage(unitSprite(u.kind, color, look), -r, -r, 2 * r, 2 * r);
    if (flash > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.8, flash * 2.5)})`;
      ctx.fill();
    }

    // Rand = Lebenspunkte: ein Segment pro HP, verlorene dunkel
    if (selected || highlight) {
      ctx.shadowColor = color;
      ctx.shadowBlur = selected ? 40 : 14 + 8 * Math.sin(this.clock * 4);
    }
    const hr = r * 0.93;
    ctx.lineWidth = r * (selected ? 0.17 : 0.14);
    ctx.beginPath();
    ctx.arc(0, 0, hr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(10,14,16,0.9)';
    ctx.stroke();
    ctx.shadowBlur = 0;
    const segGap = 0.1;
    const seg = (Math.PI * 2) / u.maxHp;
    ctx.lineWidth = r * (selected ? 0.12 : 0.09);
    for (let i = 0; i < u.maxHp; i++) {
      const a0 = -Math.PI / 2 + i * seg + segGap / 2;
      ctx.beginPath();
      ctx.arc(0, 0, hr, a0, a0 + seg - segGap);
      ctx.strokeStyle = i < u.hp ? color : 'rgba(255,255,255,0.12)';
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBall(x: number, y: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x + 4, y + 6, r * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.05, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.6, '#e0e0e0');
    g.addColorStop(1, '#9e9e9e');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  private drawDrag(d: DragView): void {
    const len = Math.hypot(d.pullX, d.pullY);
    if (len < SHOT.MIN_PULL) return;
    const ctx = this.ctx;
    const u = d.unit;
    const clamped = Math.min(len, SHOT.MAX_PULL);
    const ratio = clamped / SHOT.MAX_PULL;
    const nx = -d.pullX / len;
    const ny = -d.pullY / len;
    const arrowLen = u.radius + clamped * 1.6;

    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.3 + ratio * 0.5})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 18]);
    ctx.beginPath();
    ctx.moveTo(u.x + nx * u.radius, u.y + ny * u.radius);
    ctx.lineTo(u.x + nx * arrowLen, u.y + ny * arrowLen);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rückzug-Linie zum Finger
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(u.x, u.y);
    ctx.lineTo(u.x + d.pullX * Math.min(1, SHOT.MAX_PULL / len), u.y + d.pullY * Math.min(1, SHOT.MAX_PULL / len));
    ctx.stroke();

    // Power-Streifen quer zur Schussrichtung; rot bei voller Kraft
    const px = -ny;
    const py = nx;
    const n = 7;
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1);
      if (t > ratio) break;
      const sx = u.x + nx * (u.radius + t * (arrowLen - u.radius));
      const sy = u.y + ny * (u.radius + t * (arrowLen - u.radius));
      const w = 10 + t * 16;
      ctx.strokeStyle = ratio >= 1 ? `rgba(255,138,101,${0.4 + t * 0.6})` : `rgba(255,255,255,${0.2 + t * 0.65})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(sx - px * w, sy - py * w);
      ctx.lineTo(sx + px * w, sy + py * w);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawDamage(fx: Effect): void {
    const ctx = this.ctx;
    const p = fx.t / fx.duration;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = fx.color;
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fx.text ?? '', fx.x, fx.y - 20 - p * 70);
    ctx.restore();
  }

  private drawKo(fx: Effect): void {
    const ctx = this.ctx;
    const p = fx.t / fx.duration;
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.8;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 6 * (1 - p) + 1;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, (fx.radius ?? 60) * (1 + p * 1.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawGoalFlash(fx: Effect): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (fx.duration - fx.t) / fx.duration) * 0.3;
    ctx.fillStyle = fx.color;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.restore();
  }
}
