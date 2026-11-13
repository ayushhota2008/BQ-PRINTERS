"use client";

import { TrendingUp, Printer, Clock, FileSpreadsheet } from "lucide-react";
import { formatInteger } from "@/lib/format";

interface KeyStatisticsCardProps {
  peakSlot: { label: string; total_demand: number };
  topService: { name: string; total_demand: number };
  leastSlot?: { label: string; total_demand: number };
  estimatedPages?: number;
}

export default function KeyStatisticsCard({
  peakSlot,
  topService,
  leastSlot = { label: "4 PM – 6 PM", total_demand: 180 },
  estimatedPages = 7109,
}: KeyStatisticsCardProps) {
  const stats = [
    {
      title: "Highest Demand Time",
      value: peakSlot.label || "11 AM – 1 PM",
      subtext: `(${peakSlot.total_demand} requests)`,
      icon: TrendingUp,
    },
    {
      title: "Highest Service Demand",
      value: topService.name || "B&W Printing",
      subtext: `(${topService.total_demand} requests)`,
      icon: Printer,
    },
    {
      title: "Lowest Demand Time",
      value: leastSlot.label || "4 PM – 6 PM",
      subtext: `(${leastSlot.total_demand} requests)`,
      icon: Clock,
    },
    {
      title: "Total Pages (Estimated)",
      value: estimatedPages ? formatInteger(estimatedPages) : "187,200",
      subtext: "(based on avg. pages per order)",
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="card-header">
        <h3 className="card-title">Key Statistics</h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1, justifyContent: "space-between" }}>
        {stats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "#f1f5f9",
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>{item.title}</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                  {item.value} <span style={{ fontSize: "11px", fontWeight: "400", color: "#94a3b8" }}>{item.subtext}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
