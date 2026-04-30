import React from "react";
import { Card } from "../Card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444"];

export function StudentSegmentation({ segments }) {
  const data = segments?.map((s, idx) => ({
    name: s.segment,
    value: s.student_count
  })) || [];

  return (
    <Card title="Student Segmentation">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#f1f5f9" }}
              itemStyle={{ color: "#f1f5f9" }}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between rounded bg-slate-800/50 p-2">
            <span className="text-slate-400">{item.name}</span>
            <span className="font-bold text-slate-100">{item.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
