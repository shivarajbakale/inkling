import { describe, expect, it } from 'vitest';
import { FIXTURES, golden, renderSVG } from './fixtures';

// Same source and seed must always give the same drawing. If a change is
// intended, run `npm run test:update` and review the SVG diff like code.
describe('golden drawings', () => {
  for (const [name, source] of Object.entries(FIXTURES)) {
    it(name, () => {
      const { expected, actual } = golden(name, renderSVG(source));
      expect(actual).toBe(expected);
    });
  }
});
