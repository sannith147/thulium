function cellColor(status) {
  if (status === "completed") return "bg-emerald-500";
  if (status === "partial") return "bg-emerald-500/40";
  if (status === "missed") return "bg-rose-500/20";
  return "bg-slate-700";
}

function cellRing({ day, streakChainDaysSet, breakpointsSet }) {
  if (streakChainDaysSet?.has(day)) return "ring-2 ring-emerald-200/80";
  if (breakpointsSet?.has(day)) return "ring-1 ring-rose-200/60";
  return "ring-0";
}

export function StreakHeatmap({ days = [], streakChainDays = [], breakpoints = [] }) {
  const streakChainDaysSet = new Set(streakChainDays || []);
  const breakpointsSet = new Set(breakpoints || []);
  return (
    <div className="grid grid-cols-10 gap-1">
      {days.map((d) => (
        <div
          key={d.day}
          title={`${d.day}: ${d.status}`}
          className={`h-3 w-3 rounded-sm ${cellColor(d.status)} ${cellRing({
            day: d.day,
            streakChainDaysSet,
            breakpointsSet
          })}`}
        />
      ))}
    </div>
  );
}

