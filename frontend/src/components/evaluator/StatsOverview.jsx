import React from "react";
import { Card } from "../Card";
import { Users, Activity, Target, CheckCircle } from "lucide-react";

export function StatsOverview({ stats }) {
  const cards = [
    {
      title: "Total Students",
      value: stats?.totalStudents || 0,
      icon: <Users className="h-5 w-5 text-indigo-400" />,
      color: "bg-indigo-500/10 border-indigo-500/20"
    },
    {
      title: "Active Today",
      value: stats?.activeToday || 0,
      icon: <Activity className="h-5 w-5 text-emerald-400" />,
      color: "bg-emerald-500/10 border-emerald-500/20"
    },
    {
      title: "Avg Global Accuracy",
      value: `${stats?.avgAccuracy || 0}%`,
      icon: <Target className="h-5 w-5 text-amber-400" />,
      color: "bg-amber-500/10 border-amber-500/20"
    },
    {
      title: "Your Exam Avg",
      value: stats?.myAvgAccuracy !== null ? `${stats.myAvgAccuracy}%` : "N/A",
      icon: <CheckCircle className="h-5 w-5 text-violet-400" />,
      color: "bg-violet-500/10 border-violet-500/20"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card, idx) => (
        <Card key={idx} className={`${card.color} border transition-all hover:scale-[1.02]`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {card.title}
              </p>
              <h3 className="mt-1 text-2xl font-bold text-slate-100">
                {card.value}
              </h3>
            </div>
            <div className={`rounded-full p-2 ${card.color.replace('border', 'bg')}`}>
              {card.icon}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
