import { describe, expect, it, vi } from "vitest";

import { UsageReservation } from "./monthly-usage";

describe("UsageReservation", () => {
  it("completes only once when complete and release race", async () => {
    const transition = vi.fn().mockResolvedValue(undefined);
    const reservation = new UsageReservation(crypto.randomUUID(), transition);

    await Promise.all([
      reservation.complete(),
      reservation.complete(),
      reservation.release(),
    ]);

    expect(transition).toHaveBeenCalledTimes(1);
    expect(transition).toHaveBeenCalledWith("completed");
  });

  it("releases only once when release and complete race", async () => {
    const transition = vi.fn().mockResolvedValue(undefined);
    const reservation = new UsageReservation(crypto.randomUUID(), transition);

    await Promise.all([
      reservation.release(),
      reservation.release(),
      reservation.complete(),
    ]);

    expect(transition).toHaveBeenCalledTimes(1);
    expect(transition).toHaveBeenCalledWith("released");
  });
});
