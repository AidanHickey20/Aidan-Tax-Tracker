"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  week: string;
  Income: number;
  Expenses: number;
}

export default function IncomeExpenseChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0" }}
          labelStyle={{ color: "#94a3b8" }}
          formatter={(value) =>
            new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(value as number)
          }
        />
        <Legend wrapperStyle={{ color: "#e2e8f0" }} />
        <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
