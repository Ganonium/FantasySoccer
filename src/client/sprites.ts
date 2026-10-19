// Prozedurale Porträts der Einheiten (Draufsicht als „Spielmarke“). Gezeichnet wird einmal pro
// Kombination aus Typ, Teamfarbe und Optik in ein Offscreen-Canvas, danach nur noch kopiert.
// Zeichenkoordinaten: Mittelpunkt (0, 0), Markenradius 100, y zeigt nach unten.

import type { TeamLook, UnitKind } from '../core/types';
import { NO_COSMETICS, type Cosmetics } from './cosmetics';

/** Kantenlänge des Sprite-Canvas in Pixeln – reicht für große Einheiten auf 3x-Displays. */
const SIZE = 256;
/** Radius des Porträtbereichs; außen bleibt Platz für den Lebenspunkte-Ring des Renderers. */
const INNER = 86;

const cache = new Map<string, HTMLCanvasElement>();

export function unitSprite(
  kind: UnitKind,
  color: string,
  look: TeamLook = 'default',
  cosmetics: Cosmetics = NO_COSMETICS,
): HTMLCanvasElement {
  const key = `${kind}|${color}|${look}|${cosmetics.unicorn}|${cosmetics.halloween}`;
  let sprite = cache.get(key);
  if (!sprite) {
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = SIZE;
    const ctx = sprite.getContext('2d');
    if (ctx) {
      ctx.translate(SIZE / 2, SIZE / 2);
      ctx.scale(SIZE / 200, SIZE / 200);
      drawToken(ctx, kind, color, look, cosmetics);
    }
    cache.set(key, sprite);
  }
  return sprite;
}

function drawToken(ctx: CanvasRenderingContext2D, kind: UnitKind, color: string, look: TeamLook, cosmetics: Cosmetics): void {
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
  if (kind === 'knight') {
    if (cosmetics.unicorn) drawUnicorn(ctx, color, look, cosmetics.halloween);
    else drawKnight(ctx, color, look, cosmetics.halloween);
  }
  else if (kind === 'goblin') drawGoblin(ctx, color);
  else if (kind === 'dragon') drawDragon(ctx, color);
  else drawOrc(ctx, color);
  ctx.restore();
}

// ── Ritter ───────────────────────────────────────────────────────────────────

function drawKnight(ctx: CanvasRenderingContext2D, color: string, look: TeamLook, halloween: boolean): void {
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

  if (halloween) {
    drawPumpkinHelm(ctx, dark);
    return;
  }

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

// ── Easter Egg: Kürbishelm, Einhorn, Hexenhut ─────────────────────────────────

/** Freundlich grinsender Kürbis als Helm – lustig, nicht gruselig. */
function drawPumpkinHelm(ctx: CanvasRenderingContext2D, dark: boolean): void {
  const orange = dark ? '#f57c00' : '#ffa726';
  const orangeDark = dark ? '#bf360c' : '#e65100';
  const outline = '#6d2a00';

  // Stiel mit Ranke
  ctx.beginPath();
  ctx.moveTo(-6, -50);
  ctx.quadraticCurveTo(-4, -70, 8, -78);
  ctx.lineTo(14, -72);
  ctx.quadraticCurveTo(6, -64, 7, -50);
  ctx.closePath();
  ctx.fillStyle = '#66bb6a';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#1b5e20';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, -62);
  ctx.bezierCurveTo(24, -70, 30, -56, 22, -54);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#43a047';
  ctx.stroke();

  // Kürbis aus fünf Rippen, außen beginnend
  for (const x of [-34, 34, -18, 18, 0]) {
    ctx.beginPath();
    ctx.ellipse(x, -2, 24, 52, 0, 0, Math.PI * 2);
    const g = ctx.createLinearGradient(x - 24, 0, x + 24, 0);
    g.addColorStop(0, orangeDark);
    g.addColorStop(0.4, orange);
    g.addColorStop(1, orangeDark);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }

  // Gesicht: runde, fröhliche Augen und ein breites Lächeln mit Zahnlücke
  ctx.fillStyle = '#ffe082';
  ctx.shadowColor = '#ffca28';
  ctx.shadowBlur = 10;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * 20, -6, 11, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-4, 4);
  ctx.lineTo(4, 4);
  ctx.lineTo(0, 11);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-32, 16);
  ctx.quadraticCurveTo(0, 50, 32, 16);
  ctx.quadraticCurveTo(0, 30, -32, 16);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = orange;
  ctx.fillRect(-12, 22, 8, 9);
  ctx.fillRect(6, 22, 8, 9);

  // Glanzlicht
  ctx.beginPath();
  ctx.ellipse(-30, -32, 5, 12, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
}

function drawUnicorn(ctx: CanvasRenderingContext2D, color: string, look: TeamLook, halloween: boolean): void {
  // Die Schwarzen Ritter werden zu Nacht-Einhörnern.
  const dark = look === 'dark';
  const coat = dark ? '#4a4e6e' : '#ffffff';
  const coatShade = dark ? '#2e3150' : '#dcd6f0';
  const muzzle = dark ? '#6c6f94' : '#f8d7e3';
  const outline = dark ? '#15172b' : '#7a6a90';
  const maneLight = mix(color, '#ffffff', 0.45);

  // Hals mit Halstuch in Teamfarbe
  ctx.beginPath();
  ctx.ellipse(0, 86, 40, 36, 0, 0, Math.PI * 2);
  ctx.fillStyle = coat;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-38, 64);
  ctx.quadraticCurveTo(0, 82, 38, 64);
  ctx.lineTo(30, 80);
  ctx.quadraticCurveTo(0, 96, -30, 80);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();

  // Lockige Mähne zu beiden Seiten
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(side * (40 + (i % 2) * 6), -36 + i * 20, 14, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? color : maneLight;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = mix(color, '#000000', 0.4);
      ctx.stroke();
    }
  }

  // Ohren
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 16, -44);
    ctx.lineTo(side * 34, -72);
    ctx.lineTo(side * 36, -36);
    ctx.closePath();
    ctx.fillStyle = coat;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = outline;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(side * 22, -46);
    ctx.lineTo(side * 32, -64);
    ctx.lineTo(side * 32, -42);
    ctx.closePath();
    ctx.fillStyle = '#f48fb1';
    ctx.fill();
  }

  // Kopf: breite Stirn, lange Nase, rundes Maul
  const head = new Path2D();
  head.moveTo(0, -54);
  head.bezierCurveTo(30, -54, 40, -30, 36, 0);
  head.bezierCurveTo(34, 24, 32, 56, 0, 58);
  head.bezierCurveTo(-32, 56, -34, 24, -36, 0);
  head.bezierCurveTo(-40, -30, -30, -54, 0, -54);
  const g = ctx.createRadialGradient(-10, -20, 6, 0, 0, 64);
  g.addColorStop(0, coat);
  g.addColorStop(1, coatShade);
  ctx.fillStyle = g;
  ctx.fill(head);
  ctx.lineWidth = 4;
  ctx.strokeStyle = outline;
  ctx.stroke(head);
  ctx.beginPath();
  ctx.ellipse(0, 38, 28, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = muzzle;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = outline;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 9, 34, 3.5, 5, side * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 42, 9, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Stirnlocke
  for (const [x, y, c] of [[-10, -50, color], [8, -52, maneLight], [0, -44, color]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = mix(color, '#000000', 0.4);
    ctx.stroke();
  }

  // Große Kulleraugen mit Wimpern und rosa Bäckchen
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 18, -6, 8, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1030';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(side * 18 - 3, -10, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1a1030';
    for (const a of [-0.9, -0.5, -0.1]) {
      ctx.beginPath();
      ctx.moveTo(side * (18 + Math.cos(a) * 9), -6 + Math.sin(a) * 11);
      ctx.lineTo(side * (18 + Math.cos(a) * 15), -6 + Math.sin(a) * 16);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(side * 26, 14, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(244,143,177,0.6)';
    ctx.fill();
  }

  // Goldenes Spiralhorn
  ctx.beginPath();
  ctx.moveTo(-9, -50);
  ctx.lineTo(0, -94);
  ctx.lineTo(9, -50);
  ctx.closePath();
  const gold = ctx.createLinearGradient(-9, 0, 9, 0);
  gold.addColorStop(0, '#ffb300');
  gold.addColorStop(0.5, '#fff59d');
  gold.addColorStop(1, '#ff8f00');
  ctx.fillStyle = gold;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#a66a00';
  ctx.stroke();
  ctx.lineWidth = 2;
  for (let i = 1; i <= 3; i++) {
    const y = -50 - i * 10;
    const w = 9 * (1 - (i * 10) / 44);
    ctx.beginPath();
    ctx.moveTo(-w, y + 3);
    ctx.lineTo(w, y - 3);
    ctx.stroke();
  }

  if (halloween) drawWitchHat(ctx);
}

/** Kleiner, schief sitzender Hexenhut neben dem Horn. */
function drawWitchHat(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(-30, -48);
  ctx.rotate(-0.35);
  const outline = '#311b92';
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#7e57c2';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-17, -2);
  ctx.quadraticCurveTo(-6, -24, -2, -40);
  ctx.quadraticCurveTo(-12, -42, -16, -36);
  ctx.quadraticCurveTo(4, -40, 17, -2);
  ctx.closePath();
  ctx.fillStyle = '#9575cd';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffa726';
  ctx.fillRect(-15, -9, 30, 6);
  // Stern
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 2.5 : 6;
    ctx.lineTo(2 + Math.cos(a) * r, -20 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffee58';
  ctx.fill();
  ctx.restore();
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

// ── Drache ───────────────────────────────────────────────────────────────────

function drawDragon(ctx: CanvasRenderingContext2D, color: string): void {
  const skin = '#c62828';
  const skinLight = '#ef5350';
  const skinDark = '#7f0000';
  const outline = '#3e0000';
  const horn = '#fff3e0';

  // Fledermausflügel mit Flughaut in Teamfarbe
  for (const side of [-1, 1]) {
    const wing = new Path2D();
    wing.moveTo(side * 30, 40);
    wing.lineTo(side * 58, -72);
    wing.lineTo(side * 98, -34);
    wing.quadraticCurveTo(side * 84, -18, side * 92, 4);
    wing.quadraticCurveTo(side * 74, 6, side * 80, 32);
    wing.quadraticCurveTo(side * 60, 34, side * 56, 60);
    wing.closePath();
    ctx.fillStyle = mix(color, '#000000', 0.25);
    ctx.fill(wing);
    ctx.lineWidth = 3;
    ctx.strokeStyle = outline;
    ctx.stroke(wing);
    // Flügelknochen
    ctx.beginPath();
    ctx.moveTo(side * 30, 40);
    ctx.lineTo(side * 58, -72);
    for (const [x, y] of [[98, -34], [92, 4], [80, 32]] as const) {
      ctx.moveTo(side * 58, -72);
      ctx.lineTo(side * x, y);
    }
    ctx.lineWidth = 5;
    ctx.strokeStyle = skinDark;
    ctx.stroke();
    // Kralle an der Flügelspitze
    ctx.beginPath();
    ctx.moveTo(side * 54, -70);
    ctx.lineTo(side * 54, -84);
    ctx.lineTo(side * 62, -72);
    ctx.closePath();
    ctx.fillStyle = horn;
    ctx.fill();
  }

  // Hals und Brust mit Bauchschuppen
  ctx.beginPath();
  ctx.ellipse(0, 88, 44, 42, 0, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 92, 24, 40, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#ffcc80';
  ctx.fillRect(-30, 50, 60, 60);
  ctx.strokeStyle = '#e0913a';
  ctx.lineWidth = 2;
  for (let y = 58; y < 100; y += 9) {
    ctx.beginPath();
    ctx.moveTo(-26, y);
    ctx.quadraticCurveTo(0, y + 5, 26, y);
    ctx.stroke();
  }
  ctx.restore();

  // Gebogene Hörner
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 14, -44);
    ctx.quadraticCurveTo(side * 30, -70, side * 56, -86);
    ctx.quadraticCurveTo(side * 40, -60, side * 34, -36);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -86, 0, -36);
    g.addColorStop(0, horn);
    g.addColorStop(1, '#bcaaa4');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }

  // Stachelkamm auf der Stirn
  ctx.fillStyle = skinDark;
  for (const [x, y, h] of [[0, -50, 16], [-11, -48, 10], [11, -48, 10]] as const) {
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 4);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + 6, y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }

  // Wangenstacheln
  for (const side of [-1, 1]) {
    for (const [y, len] of [[-12, 20], [4, 16]] as const) {
      ctx.beginPath();
      ctx.moveTo(side * 40, y - 8);
      ctx.lineTo(side * (40 + len), y + 2);
      ctx.lineTo(side * 38, y + 8);
      ctx.closePath();
      ctx.fillStyle = skinDark;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = outline;
      ctx.stroke();
    }
  }

  // Kopf: breiter Schädel, zur Schnauze hin schmaler
  const head = new Path2D();
  head.moveTo(0, -50);
  head.bezierCurveTo(30, -50, 46, -32, 44, -6);
  head.bezierCurveTo(42, 14, 32, 22, 30, 36);
  head.bezierCurveTo(28, 52, 12, 58, 0, 58);
  head.bezierCurveTo(-12, 58, -28, 52, -30, 36);
  head.bezierCurveTo(-32, 22, -42, 14, -44, -6);
  head.bezierCurveTo(-46, -32, -30, -50, 0, -50);
  const g = ctx.createRadialGradient(-10, -24, 6, 0, 0, 64);
  g.addColorStop(0, skinLight);
  g.addColorStop(0.6, skin);
  g.addColorStop(1, skinDark);
  ctx.fillStyle = g;
  ctx.fill(head);
  ctx.lineWidth = 4;
  ctx.strokeStyle = outline;
  ctx.stroke(head);

  // Schuppen auf der Stirn
  ctx.save();
  ctx.clip(head);
  ctx.strokeStyle = 'rgba(62,0,0,0.45)';
  ctx.lineWidth = 2;
  for (const [x, y] of [[-14, -38], [0, -34], [14, -38], [-7, -26], [7, -26]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();

  // Schnauze mit Nüstern
  ctx.beginPath();
  ctx.ellipse(0, 34, 25, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = skinLight;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.fillStyle = outline;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 9, 28, 4, 3, side * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rauchwölkchen aus den Nüstern
  ctx.fillStyle = 'rgba(207,216,220,0.8)';
  for (const side of [-1, 1]) {
    for (const [dx, dy, r] of [[28, 40, 4], [37, 47, 6], [49, 52, 8]] as const) {
      ctx.beginPath();
      ctx.arc(side * dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Maul mit zwei Fangzähnen
  ctx.beginPath();
  ctx.moveTo(-18, 46);
  ctx.quadraticCurveTo(0, 52, 18, 46);
  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.fillStyle = horn;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 9, 48);
    ctx.lineTo(side * 15, 47);
    ctx.lineTo(side * 12, 57);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Stirnwülste
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 6, -18);
    ctx.quadraticCurveTo(side * 22, -30, side * 38, -22);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = skinDark;
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // Bernsteinaugen mit Schlitzpupille
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 21, -8, 11, 8, side * -0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd54f';
    ctx.shadowColor = '#ffab00';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = outline;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(side * 21, -8, 2.5, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
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
