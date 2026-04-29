export function computeStreakFromDays(days = []) {
  // days: [{ day: 'YYYY-MM-DD', status: 'completed'|'partial'|'missed' }]
  // Streak counts only 'completed' days, ending today or yesterday (grace via timezone is handled by caller).
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  const set = new Set(sorted.filter((d) => d.status === "completed").map((d) => d.day));

  const today = new Date().toISOString().slice(0, 10);
  let cursor = today;
  let count = 0;

  while (set.has(cursor)) {
    count += 1;
    const dt = new Date(cursor);
    dt.setDate(dt.getDate() - 1);
    cursor = dt.toISOString().slice(0, 10);
  }

  return count;
}

export function computeStreakChain(days = []) {
  // returns array of day strings belonging to current streak chain
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  const set = new Set(sorted.filter((d) => d.status === "completed").map((d) => d.day));
  const chain = [];
  let cursor = new Date().toISOString().slice(0, 10);
  while (set.has(cursor)) {
    chain.push(cursor);
    const dt = new Date(cursor);
    dt.setDate(dt.getDate() - 1);
    cursor = dt.toISOString().slice(0, 10);
  }
  return chain;
}

import { getSecondsUntilEndOfDay } from "../utils/time.js";

export function secondsUntilStreakBreak(now = new Date()) {
  return getSecondsUntilEndOfDay(now);
}

