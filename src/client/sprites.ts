// Prozedurale Porträts der Einheiten (Draufsicht als „Spielmarke“). Gezeichnet wird einmal pro
// Kombination aus Typ, Teamfarbe und Optik in ein Offscreen-Canvas, danach nur noch kopiert.
// Zeichenkoordinaten: Mittelpunkt (0, 0), Markenradius 100, y zeigt nach unten.

import type { TeamLook, UnitKind } from '../core/types';

/** Kantenlänge des Sprite-Canvas in Pixeln – reicht für große Einheiten auf 3x-Displays. */
const SIZE = 256;
/** Radius des Porträtbereichs; außen bleibt Platz für den Lebenspunkte-Ring des Renderers. */
const INNER = 86;

const cache = new Map<string, HTMLCanvasElement>();

export function unitSprite(kind: UnitKind, color: string, look: TeamLook = 'default'): HTMLCanvasElement {
  const key = `${kind}|${color}|${look}`;
  let sprite = cache.get(key);
  if (!sprite) {
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = SIZE;
    const ctx = sprite.getContext('2d');
    if (ctx) {
      ctx.translate(SIZE / 2, SIZE / 2);
      ctx.scale(SIZE / 200, SIZE / 200);
      drawToken(ctx, kind, color, look);
    }
    cache.set(key, sprite);
  }
  return sprite;
}

function drawToken(ctx: CanvasRenderingContext2D, kind: UnitKind, color: string, look: TeamLook): void {
  // Hintergrund: dunkel getönte Teamfarbe
  const bg = ctx.createRadialGradient(0, -30, 10, 0, 0, INNER);
  bg.addColorStop(0, mix(color, '#000000', 0.55));
  bg.addColorStop(1, mix(color, '#000000', 0.82));
  ctx.beginPath();
  ctx.arc(0, 0, INNER, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();

  ctx.save();
  ctx.clip();
  if (kind === 'knight') drawKnight(ctx, color, look);
  else if (kind === 'goblin') drawGoblin(ctx, color);
  else drawOrc(ctx, color);
  ctx.restore();
}

// ── Ritter ───────────────────────────────────────────────────────────────────

function drawKnight(ctx: CanvasRenderingContext2D, color: string, look: TeamLook): void {
  const dark = look === 'dark';
  const steelLight = dark ? '#5a616b' : '#eef2f5';
  const steelMid = dark ? '#2c3138' : '#a7b1ba';
  const steelDark = dark ? '#121418' : '#5d6670';
  const outline = dark ? '#050608' : '#2b3036';

  // Schulterpanzer und Wappenrock
  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 50, 82, 40, 26, side * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = steelGradient(ctx, side * 50 - 40, side * 50 + 40, steelLight, steelMid, steelDark);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-34, 56);
  ctx.lineTo(34, 56);
  ctx.lineTo(42, 100);
  ctx.lineTo(-42, 100);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
  // Kreuz auf dem Wappenrock
  ctx.fillStyle = dark ? '#111' : '#fff';
  ctx.fillRect(-4, 62, 8, 30);
  ctx.fillRect(-13, 70, 26, 7);

  // Helmbusch in Teamfarbe
  ctx.save();
  ctx.translate(0, -50);
  for (let i = 0; i < 5; i++) {
    const a = -0.5 + i * 0.25;
    ctx.beginPath();
    ctx.ellipse(Math.sin(a) * 18, -20 - Math.cos(a) * 6, 9, 26, a, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 ? color : mix(color, '#ffffff', 0.3);
    ctx.fill();
    ctx.strokeStyle = mix(color, '#000000', 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  // Topfhelm
  const helm = new Path2D();
  helm.moveTo(-44, 46);
  helm.lineTo(-46, -20);
  helm.bezierCurveTo(-46, -56, -24, -64, 0, -64);
  helm.bezierCurveTo(24, -64, 46, -56, 46, -20);
  helm.lineTo(44, 46);
  helm.quadraticCurveTo(0, 58, -44, 46);
  helm.closePath();
  ctx.fillStyle = steelGradient(ctx, -46, 46, steelLight, steelMid, steelDark);
  ctx.fill(helm);
  ctx.lineWidth = 4;
  ctx.strokeStyle = outline;
  ctx.stroke(helm);

  // Mittelgrat und Stirnband
  ctx.lineWidth = 3;
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.moveTo(-3, -62);
  ctx.lineTo(-3, 50);
  ctx.stroke();
  ctx.fillStyle = dark ? '#1b1e23' : '#8a949e';
  ctx.fillRect(-45, -30, 90, 8);

  // Sehschlitze – bei den Schwarzen Rittern glühen die Augen
  ctx.fillStyle = dark ? mix(color, '#ffffff', 0.15) : '#0b0d10';
  if (dark) { ctx.shadowColor = color; ctx.shadowBlur = 14; }
  ctx.fillRect(-38, -12, 32, 9);
  ctx.fillRect(6, -12, 32, 9);
  ctx.shadowBlur = 0;

  // Atemlöcher
  ctx.fillStyle = '#0b0d10';
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      ctx.beginPath();
      ctx.arc(14 + col * 9, 14 + row * 9, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Glanzlicht
  ctx.beginPath();
  ctx.ellipse(-24, -38, 7, 16, 0.4, 0, Math.PI * 2);
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)';
  ctx.fill();
}

// ── Goblin ───────────────────────────────────────────────────────────────────

function drawGoblin(ctx: CanvasRenderingContext2D, color: string): void {
  const skin = '#b5c43c';
  const skinDark = '#6f7d1e';
  const outline = '#2e3510';

  // Kleiner Körper mit Kittel in Teamfarbe
  ctx.beginPath();
  ctx.ellipse(0, 92, 44, 34, 0, 0, Math.PI * 2);
  ctx.fillStyle = mix(color, '#000000', 0.15);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Riesige Spitzohren
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 34, -22);
    ctx.quadraticCurveTo(side * 70, -40, side * 92, -46);
    ctx.quadraticCurveTo(side * 74, -8, side * 38, 14);
    ctx.closePath();
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = outline;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(side * 40, -16);
    ctx.quadraticCurveTo(side * 66, -32, side * 82, -40);
    ctx.quadraticCurveTo(side * 66, -12, side * 42, 6);
    ctx.closePath();
    ctx.fillStyle = '#c97b72';
    ctx.fill();
  }

  // Kopf – breit oben, spitzes Kinn
  const head = new Path2D();
  head.moveTo(0, -46);
  head.bezierCurveTo(34, -46, 46, -22, 44, 2);
  head.bezierCurveTo(42, 28, 20, 52, 0, 56);
  head.bezierCurveTo(-20, 52, -42, 28, -44, 2);
  head.bezierCurveTo(-46, -22, -34, -46, 0, -46);
  const g = ctx.createRadialGradient(-12, -16, 6, 0, 0, 60);
  g.addColorStop(0, '#d4e157');
  g.addColorStop(0.6, skin);
  g.addColorStop(1, skinDark);
  ctx.fillStyle = g;
  ctx.fill(head);
  ctx.lineWidth = 4;
  ctx.strokeStyle = outline;
  ctx.stroke(head);

  // Kopftuch in Teamfarbe
  ctx.save();
  ctx.clip(head);
  ctx.beginPath();
  ctx.ellipse(0, -46, 52, 28, 0, 0, Math.PI * 2);
  ctx.fillStyle = mix(color, '#000000', 0.25);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (const [x, y] of [[-20, -30], [0, -26], [20, -30]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Große gelbe Augen mit Schlitzpupillen
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 18, -4, 13, 10, side * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff176';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = outline;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(side * 16, -3, 3, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
    // Fiese Augenbrauen
    ctx.beginPath();
    ctx.moveTo(side * 6, -12);
    ctx.lineTo(side * 32, -20);
    ctx.lineWidth = 4;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }

  // Lange Hakennase
  ctx.beginPath();
  ctx.moveTo(-3, 2);
  ctx.quadraticCurveTo(10, 14, 6, 26);
  ctx.quadraticCurveTo(0, 24, -5, 18);
  ctx.closePath();
  ctx.fillStyle = skinDark;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Breites Grinsen mit spitzen Zähnen
  ctx.beginPath();
  ctx.moveTo(-26, 28);
  ctx.quadraticCurveTo(0, 50, 26, 28);
  ctx.quadraticCurveTo(0, 38, -26, 28);
  ctx.fillStyle = '#3b1010';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fffde7';
  for (let i = -2; i <= 2; i++) {
    const x = i * 9;
    const y = 31 + 2.2 * (2 - Math.abs(i));
    ctx.beginPath();
    ctx.moveTo(x - 3.5, y);
    ctx.lineTo(x + 3.5, y);
    ctx.lineTo(x, y + 6);
    ctx.closePath();
    ctx.fill();
  }
}

// ── Ork ──────────────────────────────────────────────────────────────────────

function drawOrc(ctx: CanvasRenderingContext2D, color: string): void {
  const skin = '#6d8a4b';
  const skinDark = '#3c5226';
  const outline = '#1c2612';

  // Breite Schultern: Leder mit Schulterplatten in Teamfarbe
  ctx.beginPath();
  ctx.ellipse(0, 90, 84, 40, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#4e342e';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 58, 66, 30, 20, side * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();
    // Stacheln
    ctx.fillStyle = '#cfd8dc';
    for (const dx of [-12, 8]) {
      const x = side * (58 + dx);
      ctx.beginPath();
      ctx.moveTo(x - 6, 58);
      ctx.lineTo(x + side * 6, 38);
      ctx.lineTo(x + 6, 58);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // Kleine spitze Ohren
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 48, -14);
    ctx.lineTo(side * 68, -30);
    ctx.lineTo(side * 52, 10);
    ctx.closePath();
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }

  // Massiger, kantiger Schädel mit breitem Kiefer
  const head = new Path2D();
  head.moveTo(-36, -50);
  head.quadraticCurveTo(0, -60, 36, -50);
  head.quadraticCurveTo(50, -40, 50, -10);
  head.lineTo(56, 30);
  head.quadraticCurveTo(54, 56, 0, 60);
  head.quadraticCurveTo(-54, 56, -56, 30);
  head.lineTo(-50, -10);
  head.quadraticCurveTo(-50, -40, -36, -50);
  head.closePath();
  const g = ctx.createRadialGradient(-14, -18, 8, 0, 0, 70);
  g.addColorStop(0, '#8fae63');
  g.addColorStop(0.6, skin);
  g.addColorStop(1, skinDark);
  ctx.fillStyle = g;
  ctx.fill(head);
  ctx.lineWidth = 4;
  ctx.strokeStyle = outline;
  ctx.stroke(head);

  // Haarknoten
  ctx.beginPath();
  ctx.ellipse(0, -60, 12, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-4, -66);
  ctx.quadraticCurveTo(14, -84, 4, -96);
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#1a1a1a';
  ctx.stroke();

  // Kriegsbemalung in Teamfarbe
  ctx.save();
  ctx.clip(head);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    for (const dy of [0, 12]) {
      ctx.beginPath();
      ctx.moveTo(side * 26, 10 + dy);
      ctx.lineTo(side * 46, 4 + dy);
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.lineTo(0, -28);
  ctx.stroke();
  ctx.restore();

  // Wuchtige Stirnwulst
  ctx.beginPath();
  ctx.moveTo(-44, -22);
  ctx.quadraticCurveTo(-22, -32, 0, -14);
  ctx.quadraticCurveTo(22, -32, 44, -22);
  ctx.lineTo(40, -12);
  ctx.quadraticCurveTo(22, -20, 0, -4);
  ctx.quadraticCurveTo(-22, -20, -40, -12);
  ctx.closePath();
  ctx.fillStyle = skinDark;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Kleine, rot glühende Augen
  ctx.shadowColor = '#ff1744';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ff5252';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 19, -6, 7, 4.5, side * -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Narbe über dem linken Auge
  ctx.strokeStyle = '#2b3a1a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-30, -26);
  ctx.lineTo(-12, 8);
  for (const t of [0.3, 0.6]) {
    const x = -30 + 18 * t;
    const y = -26 + 34 * t;
    ctx.moveTo(x - 5, y + 2);
    ctx.lineTo(x + 5, y - 2);
  }
  ctx.stroke();

  // Breite, flache Nase
  ctx.beginPath();
  ctx.ellipse(0, 12, 13, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = skinDark;
  ctx.fill();
  ctx.fillStyle = '#1c2612';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 5, 15, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vorstehender Unterkiefer
  ctx.beginPath();
  ctx.moveTo(-32, 34);
  ctx.quadraticCurveTo(0, 28, 32, 34);
  ctx.lineWidth = 4;
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Hauer
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 16, 36);
    ctx.quadraticCurveTo(side * 18, 18, side * 28, 8);
    ctx.quadraticCurveTo(side * 26, 24, side * 28, 36);
    ctx.closePath();
    ctx.fillStyle = '#fff8e1';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }
}

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function steelGradient(ctx: CanvasRenderingContext2D, x0: number, x1: number, light: string, mid: string, dark: string): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, mid);
  g.addColorStop(0.3, light);
  g.addColorStop(0.65, mid);
  g.addColorStop(1, dark);
  return g;
}

/** Mischt zwei Farben im Format #rrggbb; t = 0 ergibt a, t = 1 ergibt b. */
function mix(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i]! - v) * t));
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function parseHex(hex: string): number[] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}
