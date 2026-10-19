// Kampagnen-Fortschritt im localStorage. Fehler (Privatmodus, gesperrter Speicher) werden
// ignoriert – das Spiel funktioniert dann ohne gespeicherten Fortschritt.

const KEY = 'fantasysoccer.progress.v1';

export interface Progress {
  completed: string[];
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Progress>) : null;
    return { completed: Array.isArray(parsed?.completed) ? parsed.completed : [] };
  } catch {
    return { completed: [] };
  }
}

export function markCompleted(levelId: string): void {
  const p = loadProgress();
  if (p.completed.includes(levelId)) return;
  p.completed.push(levelId);
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignorieren
  }
}
