"use client";

import { useMemo } from "react";
import { formatInteger } from "@/lib/format";

interface DemandByServiceChartProps {
  totalDemand: number;
  serviceTotals: Record<string, number>;
  servicePercentages: Record<string, number>;
}

export default function DemandByServiceChart({
  totalDemand,
  serviceTotals,
  servicePercentages,
}: DemandByServiceChartProps) {
  const items = useMemo(() => {
    return [
      {
        name: "B&W Printing",
        count: serviceTotals["B&W Printing"] || 0,
        pct: servicePercentages["B&W Printing"] || 0,
        color: "#e11d48",
      },
      {
        name: "Colour Printing",
        count: serviceTotals["Colour Printing"] || 0,
        pct: servicePercentages["Colour Printing"] || 0,
        color: "#1e293b",
      },
      {
        name: "Binding",
        count: serviceTotals["Binding"] || 0,
        pct: servicePercentages["Binding"] || 0,
        color: "#94a3b8",
      },
      {
        name: "Photocopying",
        count: serviceTotals["Photocopying"] || 0,
        pct: servicePercentages["Photocopying"] || 0,
        color: "#fb7185",
      },
    ];
  }, [serviceTotals, servicePercentages]);

  // Compute SVG Donut arcs
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const arcs = items.map((item) => {
    const fraction = totalDemand > 0 ? item.count / totalDemand : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle * circumference;
    accumulatedAngle += fraction;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="card" style={{ height: "100%" }}>
      <div className="card-header">
        <h3 className="card-title">Demand by Service</h3>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px" }}>
        {/* SVG Donut */}
        <div style={{ position: "relative", width: "170px", height: "170px", flexShrink: 0 }}>
          <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx="85"
              cy="85"
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth="24"
            />
            {arcs.map((arc, i) => (
              <circle
                key={i}
                cx="85"
                cy="85"
                r={radius}
                fill="transparent"
                stroke={arc.color}
                strokeWidth="24"
                strokeDasharray={arc.strokeDasharray}
                strokeDashoffset={arc.strokeDashoffset}
                strokeLinecap="butt"
                style={{ transition: "stroke-dasharray 0.5s ease" }}
              />
            ))}
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "19px", fontWeight: "800", color: "#0f172a" }}>
              {formatInteger(totalDemand)}
            </span>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "500" }}>Total Demand</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
          {items.map((item) => (
            <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: item.color,
                    display: "inline-block",
                  }}
                />
                <span style={{ color: "#334155", fontWeight: "600" }}>{item.name}</span>
              </div>
              <div style={{ display: "flex", gap: "8px", fontWeight: "600" }}>
                <span style={{ color: "#0f172a" }}>{item.count}</span>
                <span style={{ color: "#94a3b8" }}>({item.pct.toFixed(2)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
