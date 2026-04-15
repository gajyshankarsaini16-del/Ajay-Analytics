"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export default function RelationAnalysis({ data }) {
  const [colA, setColA] = useState("");
  const [colB, setColB] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);

    const res = await fetch("/api/relation", {
      method: "POST",
      body: JSON.stringify({
        colA: data[colA],
        colB: data[colB],
      }),
    });

    const json = await res.json();
    setResult(json);
    setLoading(false);
  };

  const categories =
    result?.chartData?.length > 0
      ? Object.keys(result.chartData[0]).filter((k) => k !== "name")
      : [];

  return (
    <div className="p-4 bg-[#0f172a] rounded-xl text-white">
      <h2 className="text-lg mb-3">Relation Analysis</h2>

      {/* Select */}
      <div className="flex gap-3 mb-4">
        <select onChange={(e) => setColA(e.target.value)}>
          <option>Select Column A</option>
          {Object.keys(data).map((col) => (
            <option key={col}>{col}</option>
          ))}
        </select>

        <select onChange={(e) => setColB(e.target.value)}>
          <option>Select Column B</option>
          {Object.keys(data).map((col) => (
            <option key={col}>{col}</option>
          ))}
        </select>

        <button onClick={handleAnalyze} className="bg-blue-600 px-3 py-1">
          Analyze
        </button>
      </div>

      {/* Loading */}
      {loading && <p>Loading...</p>}

      {/* Chart */}
      {result?.chartData?.length > 0 && (
        <BarChart width={600} height={300} data={result.chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />

          {categories.map((cat) => (
            <Bar key={cat} dataKey={cat} />
          ))}
        </BarChart>
      )}

      {/* Insights */}
      {result?.insights && (
        <div className="mt-4">
          <h3 className="font-bold">Insights</h3>
          <ul className="list-disc ml-5">
            {result.insights.map((ins: string, i: number) => (
              <li key={i}>{ins}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
