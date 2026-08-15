import { describe, expect, it } from 'vitest';
import { csvCell } from './csv';

describe('csvCell', () => {
  it('wraps plain values in quotes', () => {
    expect(csvCell('hello')).toBe('"hello"');
    expect(csvCell('')).toBe('""');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(42)).toBe('"42"');
  });

  it('doubles embedded double quotes', () => {
    expect(csvCell('he said "hi"')).toBe('"he said ""hi"""');
  });

  it('neutralizes leading formula characters', () => {
    expect(csvCell('=SUM(A1:A2)')).toBe('"\'=SUM(A1:A2)"');
    expect(csvCell('+123')).toBe('"\'+123"');
    expect(csvCell('-1+1')).toBe('"\'-1+1"');
    expect(csvCell('@cmd')).toBe('"\'@cmd"');
    expect(csvCell('\tTab')).toBe('"\'\tTab"');
    expect(csvCell('regular')).toBe('"regular"');
  });
});
