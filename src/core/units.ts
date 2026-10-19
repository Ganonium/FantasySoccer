import { REFERENCE_RADIUS } from './config';
import type { UnitKind } from './types';

export interface UnitType {
  name: string;
  radius: number;
  /** Dichte – Masse = density · (radius / REFERENCE_RADIUS)². */
  density: number;
  hp: number;
  atk: number;
  /** Faktor auf die maximale Schussgeschwindigkeit. */
  shotPower: number;
}

export const UNIT_TYPES: Record<UnitKind, UnitType> = {
  knight: { name: 'Ritter', radius: 66, density: 1, hp: 3, atk: 1, shotPower: 1 },
  goblin: { name: 'Goblin', radius: 48, density: 1, hp: 2, atk: 1, shotPower: 1.1 },
  orc: { name: 'Ork', radius: 88, density: 1.15, hp: 5, atk: 2, shotPower: 0.85 },
  // Endgegner: allein auf dem Feld, verdeckt mit seiner Größe einen Großteil des Tores.
  dragon: { name: 'Drache', radius: 124, density: 1.3, hp: 8, atk: 2, shotPower: 0.8 },
};

export function unitMass(t: UnitType): number {
  const s = t.radius / REFERENCE_RADIUS;
  return t.density * s * s;
}
