import { describe, it, expect } from 'vitest';
import { schedule, initialState, MIN_EASE, DEFAULT_EASE, previewIntervals } from './sm2';

const FIXED_NOW = new Date('2026-01-01T00:00:00Z');

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

describe('SM-2 schedule', () => {
  it('initial state has default ease and zero interval', () => {
    const s = initialState();
    expect(s.ease).toBe(DEFAULT_EASE);
    expect(s.intervalDays).toBe(0);
    expect(s.repetitions).toBe(0);
  });

  it('q=5 streak: interval grows 1 → 6 → ceil(6*ease)', () => {
    let s = initialState();
    const r1 = schedule(s, 5, FIXED_NOW);
    expect(r1.intervalDays).toBe(1);
    expect(r1.repetitions).toBe(1);
    expect(daysBetween(FIXED_NOW, r1.dueAt)).toBe(1);

    s = r1;
    const r2 = schedule(s, 5, FIXED_NOW);
    expect(r2.intervalDays).toBe(6);
    expect(r2.repetitions).toBe(2);

    s = r2;
    const r3 = schedule(s, 5, FIXED_NOW);
    // Interval after rep 3 = round(prev * ease). ease has been bumped.
    expect(r3.intervalDays).toBeGreaterThan(6);
    expect(r3.repetitions).toBe(3);
  });

  it('q=5 raises ease by exactly 0.1 each time', () => {
    let s = initialState();
    const after = schedule(s, 5, FIXED_NOW);
    expect(after.ease).toBeCloseTo(DEFAULT_EASE + 0.1, 4);
    s = after;
    const after2 = schedule(s, 5, FIXED_NOW);
    expect(after2.ease).toBeCloseTo(DEFAULT_EASE + 0.2, 4);
  });

  it('q=3 holds ease roughly steady (delta = -0.14)', () => {
    const s = initialState();
    const after = schedule(s, 3, FIXED_NOW);
    // E + (0.1 - 2 * (0.08 + 2*0.02)) = E + 0.1 - 0.24 = E - 0.14
    expect(after.ease).toBeCloseTo(DEFAULT_EASE - 0.14, 4);
  });

  it('q=2 fails the card: repetitions reset, interval back to 1 day', () => {
    let s = initialState();
    s = schedule(s, 5, FIXED_NOW);
    s = schedule(s, 5, FIXED_NOW); // repetitions=2, interval=6
    expect(s.repetitions).toBe(2);
    expect(s.intervalDays).toBe(6);

    const failed = schedule(s, 2, FIXED_NOW);
    expect(failed.repetitions).toBe(0);
    expect(failed.intervalDays).toBe(1);
    // ease drops too: delta = 0.1 - 3 * (0.08 + 3*0.02) = 0.1 - 0.42 = -0.32
    expect(failed.ease).toBeCloseTo(s.ease - 0.32, 4);
  });

  it('q=0 (blackout) drops ease the most', () => {
    const s = initialState();
    const after = schedule(s, 0, FIXED_NOW);
    // delta = 0.1 - 5 * (0.08 + 5*0.02) = 0.1 - 0.9 = -0.8
    expect(after.ease).toBeCloseTo(Math.max(MIN_EASE, DEFAULT_EASE - 0.8), 4);
    expect(after.intervalDays).toBe(1);
    expect(after.repetitions).toBe(0);
  });

  it('ease floors at 1.3 after repeated failures', () => {
    let s = initialState();
    for (let i = 0; i < 20; i++) {
      s = schedule(s, 0, FIXED_NOW);
    }
    expect(s.ease).toBe(MIN_EASE);
  });

  it('dueAt is now + intervalDays', () => {
    const s = initialState();
    const r = schedule(s, 4, FIXED_NOW);
    expect(daysBetween(FIXED_NOW, r.dueAt)).toBe(r.intervalDays);
  });

  it('previewIntervals matches what schedule would set', () => {
    const s = initialState();
    const p = previewIntervals(s);
    expect(p.again).toBe(schedule(s, 0).intervalDays);
    expect(p.hard).toBe(schedule(s, 3).intervalDays);
    expect(p.good).toBe(schedule(s, 4).intervalDays);
    expect(p.easy).toBe(schedule(s, 5).intervalDays);
  });
});
