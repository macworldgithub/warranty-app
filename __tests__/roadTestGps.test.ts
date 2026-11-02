import { RoadTestGpsTracker } from '../src/utils/roadTestGps';

// Latitude steps in metres near the equator; no React, device, or backend mocks.
const fix = (metres: number, timestamp: number, speedKmh?: number) => ({ latitude: metres / 111194.9266, longitude: 0, timestamp, speedKmh });
describe('live road-test GPS speed', () => {
  it('calculates speed from GPS time even when callbacks arrive in one JS batch', () => {
    const tracker = new RoadTestGpsTracker();
    tracker.sample(fix(0, 1000));
    const sample = tracker.sample(fix(10, 2000, 0));
    expect(sample?.speedKmh).toBe(36);
    expect(sample?.distanceMeters).toBeCloseTo(10, 3);
  });
  it('retains the anchor across fast updates instead of counting distance with zero speed', () => {
    const tracker = new RoadTestGpsTracker();
    tracker.sample(fix(0, 1000));
    for (let i = 1; i < 5; i++) expect(tracker.sample(fix(i * 2, 1000 + i * 100))).toBeNull();
    const sample = tracker.sample(fix(10, 1500));
    expect(sample?.speedKmh).toBe(72);
    expect(sample?.distanceMeters).toBeCloseTo(10, 3);
  });
  it('ignores repeated/out-of-order fixes rather than erasing current speed', () => {
    const tracker = new RoadTestGpsTracker();
    tracker.sample(fix(0, 1000)); tracker.sample(fix(10, 2000));
    expect(tracker.sample(fix(10, 2000, 0))).toBeNull();
    expect(tracker.sample(fix(1, 1500, 0))).toBeNull();
    expect(tracker.sample(fix(20, 3000))?.speedKmh).toBe(36);
  });
  it('retains small distances without rounding each fix away', () => {
    const tracker = new RoadTestGpsTracker(); tracker.sample(fix(0, 1000));
    let metres = 0;
    for (let i = 1; i <= 50; i++) metres += tracker.sample(fix(i * 2, 1000 + i * 1000))?.distanceMeters || 0;
    expect(metres).toBeCloseTo(100, 2);
  });
  it('uses valid device speed and rejects missing, invalid and impossible values', () => {
    const tracker = new RoadTestGpsTracker();
    expect(tracker.sample(fix(0, 1000, 48))?.speedKmh).toBe(48);
    tracker.reset(); tracker.sample(fix(0, 1000));
    expect(tracker.sample(fix(10, 2000, NaN))?.speedKmh).toBe(36);
    tracker.reset(); tracker.sample(fix(0, 1000));
    expect(tracker.sample(fix(10, 2000, -1))?.speedKmh).toBe(36);
  });
  it('returns to zero at a stop, rejects GPS jumps and resets between drives', () => {
    const tracker = new RoadTestGpsTracker(); tracker.sample(fix(0, 1000)); tracker.sample(fix(10, 2000));
    expect(tracker.sample(fix(10, 3000, 0))?.speedKmh).toBe(0);
    tracker.reset(); tracker.sample(fix(0, 1000));
    expect(tracker.sample(fix(2000, 2000, 1000))?.speedKmh).toBe(0);
    tracker.reset(); expect(tracker.sample(fix(10000, 90000))?.distanceMeters).toBe(0);
  });
  it('starts a fresh anchor after a long GPS gap', () => {
    const tracker = new RoadTestGpsTracker(); tracker.sample(fix(0, 1000));
    expect(tracker.sample(fix(1000, 100000))?.speedKmh).toBe(0);
    expect(tracker.sample(fix(1010, 101000))?.speedKmh).toBe(36);
  });
});
