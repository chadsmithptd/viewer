import { DOWNSTREAM, JOBS } from './machines.js';

export const TOTAL_DAYS = 42;

// Base utilization per machine per day — hand-crafted to tell a story:
// M3 (VMC #1) becomes a hard bottleneck around days 7–14,
// which backs up M6 (CMM) immediately after.
function buildBase() {
  const ramp = (start, peak, end, days) =>
    Array.from({ length: days }, (_, i) => {
      if (i < start) return 0.3 + (i / start) * (peak - 0.3);
      if (i < peak)  return peak - ((i - start) / (end - start)) * (peak - 0.5);
      return Math.max(0.25, 0.5 - ((i - peak) / (days - peak)) * 0.25);
    });

  return {
    M1: ramp(3, 9,  20, TOTAL_DAYS).map((v, i) => clamp(v * (i < 10 ? 0.95 : 0.7))),
    M2: ramp(5, 12, 22, TOTAL_DAYS).map((v, i) => clamp(v * 0.8)),
    M3: buildM3(),
    M4: ramp(2, 8,  18, TOTAL_DAYS).map(v => clamp(v * 0.85)),
    M5: ramp(6, 14, 25, TOTAL_DAYS).map(v => clamp(v * 0.65)),
    M6: buildM6(),
    M7: Array.from({ length: TOTAL_DAYS }, (_, i) => clamp(0.3 + Math.sin(i * 0.4) * 0.2)),
    M8: Array.from({ length: TOTAL_DAYS }, (_, i) => clamp(0.25 + Math.sin(i * 0.3 + 1) * 0.15)),
  };
}

function buildM3() {
  // The bottleneck: starts moderate, spikes to 1.0+ around days 7–14
  return Array.from({ length: TOTAL_DAYS }, (_, i) => {
    if (i < 3)  return 0.55;
    if (i < 7)  return 0.55 + (i - 3) * 0.10;
    if (i < 14) return clamp(0.95 + (i - 7) * 0.015);  // overloaded
    if (i < 21) return 0.90 - (i - 14) * 0.06;
    return clamp(0.45 + Math.sin(i * 0.25) * 0.1);
  });
}

function buildM6() {
  // CMM backs up ~3 days after VMC surge
  return Array.from({ length: TOTAL_DAYS }, (_, i) => {
    if (i < 6)  return 0.4;
    if (i < 10) return 0.4 + (i - 6) * 0.12;
    if (i < 18) return clamp(0.88 + (i - 10) * 0.01);
    if (i < 24) return 0.88 - (i - 18) * 0.07;
    return 0.35 + Math.sin(i * 0.2) * 0.1;
  });
}

function clamp(v) { return Math.min(1.0, Math.max(0.0, v)); }

export const BASE_SCHEDULE = buildBase();

/**
 * Apply what-if mutations on top of the base schedule.
 * Returns a new utilization map {machineId: Float32Array[TOTAL_DAYS]}.
 */
export function computeSchedule(mutations) {
  // Deep copy base
  const result = {};
  for (const [id, arr] of Object.entries(BASE_SCHEDULE)) {
    result[id] = Float32Array.from(arr);
  }

  for (const m of mutations) {
    if (m.type === 'shift') {
      applyShift(result, m);
    } else if (m.type === 'moveJob') {
      applyMoveJob(result, m);
    } else if (m.type === 'downtime') {
      applyDowntime(result, m);
    }
  }
  return result;
}

function applyShift(schedule, { machineId, startDay, endDay, capacityMultiplier }) {
  const arr = schedule[machineId];
  const cascade = DOWNSTREAM[machineId] || [];
  for (let d = startDay; d <= Math.min(endDay, TOTAL_DAYS - 1); d++) {
    const before = arr[d];
    arr[d] = clamp(arr[d] * capacityMultiplier);
    const freed = before - arr[d];
    // Downstream machines benefit with a 1-3 day lag
    cascade.forEach((mid, idx) => {
      const lag = idx + 1;
      if (d + lag < TOTAL_DAYS && freed > 0) {
        schedule[mid][d + lag] = clamp(schedule[mid][d + lag] - freed * 0.5);
      }
    });
  }
}

function applyMoveJob(schedule, { jobId, toMachineId }) {
  const job = JOBS.find(j => j.id === jobId);
  if (!job) return;
  const { fromMachine, load } = job;
  for (let d = 0; d < TOTAL_DAYS; d++) {
    schedule[fromMachine][d] = clamp(schedule[fromMachine][d] - load * 0.8);
    schedule[toMachineId][d] = clamp(schedule[toMachineId][d] + load * 0.85);
  }
}

function applyDowntime(schedule, { machineId, startDay, endDay }) {
  const arr = schedule[machineId];
  const preload = 0.25;
  for (let d = startDay; d <= Math.min(endDay, TOTAL_DAYS - 1); d++) {
    arr[d] = 0; // machine is down
  }
  // Work piles up in the 3 days before downtime
  for (let d = Math.max(0, startDay - 3); d < startDay; d++) {
    arr[d] = clamp(arr[d] + preload);
  }
  // Catch-up spike 2 days after downtime ends
  for (let d = endDay + 1; d <= Math.min(endDay + 4, TOTAL_DAYS - 1); d++) {
    arr[d] = clamp(arr[d] + 0.3);
  }
}
