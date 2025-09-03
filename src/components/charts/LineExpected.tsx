"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

export default function LineExpected({ data }: { data: { x: number; y: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="x" />
        <YAxis domain={[0, 40]} />
        <Legend />
        <Line dataKey="y" name="Expected CTR %" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

