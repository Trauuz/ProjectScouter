export const MOTION_SPEED_MULTIPLIER = 1.125;

export function speedAdjustedInterval(value: number): number {
  return value / MOTION_SPEED_MULTIPLIER;
}
