// Easter Egg: rein optische Verkleidungen für die Ritter. Gespeichert im localStorage; Fehler
// (Privatmodus, gesperrter Speicher) werden ignoriert, dann gilt einfach der Standard.

const KEY = 'fantasysoccer.cosmetics.v1';

export interface Cosmetics {
  /** Ritter werden zu Einhörnern. */
  unicorn: boolean;
  /** Kindgerechte Halloween-Verkleidung. */
  halloween: boolean;
}

export const NO_COSMETICS: Cosmetics = { unicorn: false, halloween: false };

export function loadCosmetics(): Cosmetics {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Cosmetics>) : null;
    return { unicorn: parsed?.unicorn === true, halloween: parsed?.halloween === true };
  } catch {
    return { ...NO_COSMETICS };
  }
}

export function saveCosmetics(c: Cosmetics): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // ignorieren
  }
}

/** Passt angezeigte Texte an: im Einhorn-Modus heißen die Ritter Einhörner. */
export function skinText(text: string, c: Cosmetics): string {
  return c.unicorn ? text.replace(/Ritter/g, 'Einhörner') : text;
}
