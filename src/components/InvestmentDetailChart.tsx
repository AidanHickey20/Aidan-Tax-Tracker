"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface ChartPoint {
  time: string;
  price: number;
}

interface Props {
  data: ChartPoint[];
  color: string;
  range: string;
}

export default function InvestmentDetailChart({ data, color, range }: Props) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        No chart data available
      </div>
    );
  }

  const formatXAxis = (time: string) => {
    const d = new Date(time);
    switch (range) {
      case "1d": return format(d, "h:mm a");
      case "5d": return format(d, "EEE h a");
      case "1mo":
      case "3mo": return format(d, "MMM d");
      case "6mo":
      case "1y": return format(d, "MMM yyyy");
      case "5y": return format(d, "yyyy");
      default: return format(d, "MMM d");
    }
  };

  const minPrice = Math.min(...data.map((d) => d.price)) * 0.998;
  const maxPrice = Math.max(...data.map((d) => d.price)) * 1.002;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="time"
          tickFormatter={formatXAxis}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          minTickGap={50}
        />
        <YAxis
          domain={[minPrice, maxPrice]}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) =>
            new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: v < 1 ? 4 : 2,
            }).format(v)
          }
          width={80}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "none",
            borderRadius: "8px",
            color: "#f8fafc",
            fontSize: "12px",
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => {
            const num = Number(value) || 0;
            return [
              new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: num < 1 ? 6 : 2,
              }).format(num),
              "Price",
            ];
          }}
          labelFormatter={(label) => format(new Date(label), "MMM d, yyyy h:mm a")}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={2}
          fill="url(#priceGradient)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
