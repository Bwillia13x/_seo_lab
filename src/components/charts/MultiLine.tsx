"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
} from "recharts";

type Series = { key: string; name?: string; color?: string };

export default function MultiLine({
  data,
  xKey,
  series,
  yDomain = [0, 100],
}: {
  data: any[];
  xKey: string;
  series: Series[];
  yDomain?: [number, number];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis domain={yDomain} />
        <ReTooltip />
        <Legend />
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.name || s.key}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

