import { SHOT } from '../core/config';
import type { Unit } from '../core/types';
import type { DragView, Renderer } from './renderer';

/** Ab dieser Entfernung (über den Radius hinaus) gilt ein Antippen noch als Treffer. */
const PICK_SLACK = 40;

export interface InputHandlers {
  /** Einheiten, die gerade ausgewählt werden dürfen (leer = keine Eingabe möglich). */
  selectable(): Unit[];
  onShoot(unit: Unit, pullX: number, pullY: number): void;
}

/**
 * Billard-Steuerung über Pointer Events (Touch, Maus, Stift in einem Pfad).
 * Pointer-Capture sorgt dafür, dass Loslassen außerhalb des Canvas den Zug beendet;
 * weitere Finger werden ignoriert, solange ein Zug läuft.
 */
export class Input {
  private pointerId: number | null = null;
  private unit: Unit | null = null;
  private start = { x: 0, y: 0 };
  private current = { x: 0, y: 0 };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly renderer: Renderer,
    private readonly handlers: InputHandlers,
  ) {
    canvas.addEventListener('pointerdown', e => this.down(e));
    canvas.addEventListener('pointermove', e => this.move(e));
    canvas.addEventListener('pointerup', e => this.up(e));
    canvas.addEventListener('pointercancel', e => this.cancel(e));
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  get drag(): DragView | null {
    if (!this.unit) return null;
    return { unit: this.unit, pullX: this.current.x - this.start.x, pullY: this.current.y - this.start.y };
  }

  reset(): void {
    if (this.pointerId !== null && this.canvas.hasPointerCapture(this.pointerId)) {
      this.canvas.releasePointerCapture(this.pointerId);
    }
    this.pointerId = null;
    this.unit = null;
  }

  private down(e: PointerEvent): void {
    if (this.pointerId !== null) return;
    const p = this.renderer.screenToWorld(e.clientX, e.clientY);
    let best: Unit | null = null;
    let bestD = Infinity;
    for (const u of this.handlers.selectable()) {
      const d = Math.hypot(p.x - u.x, p.y - u.y);
      if (d < u.radius + PICK_SLACK && d < bestD) {
        best = u;
        bestD = d;
      }
    }
    if (!best) return;
    e.preventDefault();
    this.pointerId = e.pointerId;
    this.canvas.setPointerCapture(e.pointerId);
    this.unit = best;
    this.start = p;
    this.current = p;
  }

  private move(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    this.current = this.renderer.screenToWorld(e.clientX, e.clientY);
  }

  private up(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId || !this.unit) return;
    this.current = this.renderer.screenToWorld(e.clientX, e.clientY);
    const unit = this.unit;
    const pullX = this.current.x - this.start.x;
    const pullY = this.current.y - this.start.y;
    this.reset();
    // Die Einheit muss noch auswählbar sein (z. B. kein Phasenwechsel während des Ziehens).
    if (Math.hypot(pullX, pullY) >= SHOT.MIN_PULL && this.handlers.selectable().includes(unit)) {
      this.handlers.onShoot(unit, pullX, pullY);
    }
  }

  private cancel(e: PointerEvent): void {
    if (e.pointerId === this.pointerId) this.reset();
  }
}
