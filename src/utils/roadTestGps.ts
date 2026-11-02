interface GpsFix {
  latitude: number;
  longitude: number;
  timestamp: number;
  speedKmh?: number;
}

// Separate GPS measurement time from the time React receives a batch of fixes.
// Keep the movement anchor until there is enough elapsed time to calculate speed.
export class RoadTestGpsTracker {
  private anchor: GpsFix | null = null;
  private lastTimestamp = -Infinity;
  private speeds: number[] = [];

  reset() {
    this.anchor = null;
    this.lastTimestamp = -Infinity;
    this.speeds = [];
  }

  sample(fix: GpsFix): { speedKmh: number; distanceMeters: number } | null {
    if (!Number.isFinite(fix.latitude) || Math.abs(fix.latitude) > 90 ||
        !Number.isFinite(fix.longitude) || Math.abs(fix.longitude) > 180 ||
        !Number.isFinite(fix.timestamp) || fix.timestamp <= this.lastTimestamp) return null;

    const elapsed = this.anchor ? (fix.timestamp - this.anchor.timestamp) / 1000 : 0;
    // Do not consume the anchor or erase speed for batched/sub-second callbacks.
    if (this.anchor && elapsed < 0.5) return null;
    this.lastTimestamp = fix.timestamp;

    let distanceMeters = 0;
    let calculatedSpeed = 0;
    if (this.anchor && elapsed <= 30) {
      const radians = Math.PI / 180;
      const dLat = (fix.latitude - this.anchor.latitude) * radians;
      const dLng = (fix.longitude - this.anchor.longitude) * radians;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.anchor.latitude * radians) * Math.cos(fix.latitude * radians) * Math.sin(dLng / 2) ** 2;
      const metres = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
      const estimate = metres / elapsed * 3.6;
      if (metres >= 1.5 && metres <= 5000 && estimate <= 160) {
        distanceMeters = metres;
        calculatedSpeed = estimate;
        this.anchor = fix;
      } else if (estimate > 160 || elapsed > 3.5) {
        // Reject teleports and restart the anchor after a sustained stop.
        this.anchor = fix;
      }
    } else {
      this.anchor = fix;
      this.speeds = [];
    }

    const nativeSpeed = typeof fix.speedKmh === 'number' && Number.isFinite(fix.speedKmh) && fix.speedKmh > 0 && fix.speedKmh <= 160 ? fix.speedKmh : 0;
    const rawSpeed = nativeSpeed || calculatedSpeed;
    if (rawSpeed > 0) {
      this.speeds.push(rawSpeed);
      if (this.speeds.length > 3) this.speeds.shift();
    } else {
      this.speeds.shift();
    }
    const speedKmh = this.speeds.length ? Math.round(this.speeds.reduce((sum, speed) => sum + speed, 0) / this.speeds.length) : 0;
    return { speedKmh, distanceMeters };
  }
}
