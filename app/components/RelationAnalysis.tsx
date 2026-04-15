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

export default function RelationAnalysis({ data }: any) {
  const [colA, setColA] = useState("");
  const [colB, setColB] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ✅ IMPORTANT FIX
  const extractColumn = (column: string) => {
    return data.map((row: any) => row[column]);
  };

  const handleAnalyze = async () => {
    if (!colA || !colB) return;

    setLoading(true);

    try {
      const res = await fetch("/api/relation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          colA: extractColumn(colA),
          colB: extractColumn(colB),
        }),
      });

      const json = await res.json();
      setResult(json);

    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  const columns = data?.length > 0 ? Object.keys(data[0]) : [];

  const categories =
    result?.chartData?.length > 0
      ? Object.keys(result.chartData[0]).filter((k) => k !== "name")
      : [];

  return (
    <div className="p-4 bg-[#0f172a] rounded-xl text-white">
      <h2 className="text-lg mb-3">Relation Analysis</h2>

      {/* SELECT */}
      <div className="flex gap-3 mb-4">
        <select
          className="bg-[#1e293b] p-2 rounded"
          onChange={(e) => setColA(e.target.value)}
        >
          <option value="">Column A</option>
          {columns.map((col: string) => (
            <option key={col}>{col}</option>
          ))}
        </select>

        <select
          className="bg-[#1e293b] p-2 rounded"
          onChange={(e) => setColB(e.target.value)}
        >
          <option value="">Column B</option>
          {columns.map((col: string) => (
            <option key={col}>{col}</option>
          ))}
        </select>

        <button
          onClick={handleAnalyze}
          className="bg-purple-600 px-4 py-2 rounded"
        >
          Analyze
        </button>
      </div>

      {/* LOADING */}
      {loading && <p>Analyzing...</p>}

      {/* NO DATA */}
      {!loading && result?.chartData?.length === 0 && (
        <p>No relation found</p>
      )}

      {/* CHART */}
      {result?.chartData?.length > 0 && (
        <BarChart width={600} height={300} data={result.chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />

          {categories.map((cat: string) => (
            <Bar key={cat} dataKey={cat} />
          ))}
        </BarChart>
      )}

      {/* INSIGHTS */}
      {result?.insights?.length > 0 && (
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
