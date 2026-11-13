"use client";

interface DailyTotal {
  day_number: number;
  day_name: string;
  total_demand: number;
}

interface WeeklyTrendChartProps {
  dailyTotals: DailyTotal[];
}

export default function WeeklyTrendChart({ dailyTotals }: WeeklyTrendChartProps) {
  const days = dailyTotals.length === 7 ? dailyTotals : [
    { day_number: 1, day_name: "Mon", total_demand: 265 },
    { day_number: 2, day_name: "Tue", total_demand: 286 },
    { day_number: 3, day_name: "Wed", total_demand: 248 },
    { day_number: 4, day_name: "Thu", total_demand: 312 },
    { day_number: 5, day_name: "Fri", total_demand: 286 },
    { day_number: 6, day_name: "Sat", total_demand: 211 },
    { day_number: 7, day_name: "Sun", total_demand: 232 },
  ];

  const maxVal = 400;
  const width = 280;
  const height = 150;
  const paddingX = 25;
  const paddingY = 20;

  // Compute SVG points
  const points = days.map((d, idx) => {
    const x = paddingX + (idx / (days.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - (d.total_demand / maxVal) * (height - 2 * paddingY);
    return { x, y, day: d.day_name.slice(0, 3), val: d.total_demand };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="card-header">
        <h3 className="card-title">Weekly Demand Trend</h3>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ position: "relative", width: "100%", height: "180px" }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
            {/* Horizontal Grid lines */}
            {[0, 100, 200, 300, 400].map((level) => {
              const y = height - paddingY - (level / maxVal) * (height - 2 * paddingY);
              return (
                <g key={level}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={paddingX - 6}
                    y={y + 3}
                    fontSize="9"
                    fill="#94a3b8"
                    textAnchor="end"
                    fontFamily="inherit"
                  >
                    {level}
                  </text>
                </g>
              );
            })}

            {/* Area under trend line */}
            <polygon
              points={`${points[0].x},${height - paddingY} ${polylineStr} ${points[points.length - 1].x},${height - paddingY}`}
              fill="rgba(225, 29, 72, 0.08)"
            />

            {/* Trend Line */}
            <polyline
              fill="none"
              stroke="#e11d48"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylineStr}
            />

            {/* Data Dots & Tooltips */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4.5"
                  fill="#ffffff"
                  stroke="#e11d48"
                  strokeWidth="2"
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="2"
                  fill="#e11d48"
                />
                <text
                  x={p.x}
                  y={height - 2}
                  fontSize="9"
                  fill="#64748b"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {p.day}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
