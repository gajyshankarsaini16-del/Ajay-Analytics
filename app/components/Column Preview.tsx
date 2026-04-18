"use client";

import { useState } from "react";

export default function ColumnPreview({ title, values }: any) {
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? values : values.slice(0, 20);

  return (
    <div className="bg-[#0f172a] p-4 rounded-xl text-white mb-4">
      <h3 className="mb-2">{title}</h3>

      <ul className="text-sm max-h-60 overflow-auto">
        {visible.map((v: any, i: number) => (
          <li key={i}>{v}</li>
        ))}
      </ul>

      {values.length > 20 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-blue-400"
        >
          {showAll ? "Show Less" : "Show All"}
        </button>
      )}
    </div>
  );
}
