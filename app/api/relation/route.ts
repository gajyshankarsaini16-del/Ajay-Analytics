import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { colA, colB } = await req.json();

    if (!colA || !colB || colA.length !== colB.length) {
      return NextResponse.json(
        { error: "Invalid data" },
        { status: 400 }
      );
    }

    const relation: Record<string, Record<string, number>> = {};

    colA.forEach((a: string, i: number) => {
      const b = colB[i];

      if (!relation[a]) relation[a] = {};
      if (!relation[a][b]) relation[a][b] = 0;

      relation[a][b]++;
    });

    // Chart data
    const chartData = Object.entries(relation).map(([key, values]) => ({
      name: key,
      ...values,
    }));

    // Insights
    const insights: string[] = [];

    for (const key in relation) {
      const top = Object.entries(relation[key]).sort(
        (a, b) => b[1] - a[1]
      )[0];

      insights.push(
        `${key} → highest in ${top[0]} (${top[1]})`
      );
    }

    return NextResponse.json({
      chartData,
      insights: insights.slice(0, 5),
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
