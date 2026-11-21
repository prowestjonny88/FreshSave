import type { Reservation } from "./model.ts";

export function validHandover(r: Reservation): r is Extract<Reservation, { status: "completed" }> {
  return r.status === "completed" && r.handover?.method === "code" && !r.sample && !r.disputed;
}

export function handoverMetrics(reservations: readonly Reservation[]) {
  const completed = reservations.filter((r) => r.status === "completed");
  const valid = completed.filter(validHandover);
  return {
    valid,
    handovers: valid.length,
    units: valid.reduce((sum, r) => sum + r.qty, 0),
    sampleDone: completed.filter((r) => r.sample).length,
    simulated: completed.filter((r) => r.handover?.method === "simulated").length,
    disputed: completed.filter((r) => r.disputed).length,
  };
}
