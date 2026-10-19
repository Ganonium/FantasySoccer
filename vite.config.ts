import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative Pfade, damit der Build unter jedem Unterpfad läuft (z. B. GitHub Pages).
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
