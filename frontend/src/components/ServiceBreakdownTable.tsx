"use client";

import { formatInteger } from "@/lib/format";

interface ServiceBreakdownTableProps {
  totalDemand: number;
  serviceTotals: Record<string, number>;
  servicePercentages: Record<string, number>;
}

export default function ServiceBreakdownTable({
  totalDemand,
  serviceTotals,
  servicePercentages,
}: ServiceBreakdownTableProps) {
  const services = [
    { name: "B&W Printing", color: "#e11d48" },
    { name: "Colour Printing", color: "#1e293b" },
    { name: "Binding", color: "#94a3b8" },
    { name: "Photocopying", color: "#fb7185" },
  ];

  return (
    <div className="card" style={{ height: "100%" }}>
      <div className="card-header">
        <h3 className="card-title">Service Breakdown</h3>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th style={{ textAlign: "right" }}>Weekly Total</th>
              <th style={{ textAlign: "right" }}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => {
              const count = serviceTotals[s.name] || 0;
              const pct = servicePercentages[s.name] || 0;
              return (
                <tr key={s.name}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: s.color,
                        }}
                      />
                      <span style={{ fontWeight: "600" }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "600" }}>{count}</td>
                  <td style={{ textAlign: "right", color: "#64748b" }}>{pct.toFixed(2)}%</td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td style={{ fontWeight: "700" }}>Total</td>
              <td style={{ textAlign: "right", fontWeight: "700" }}>{formatInteger(totalDemand)}</td>
              <td style={{ textAlign: "right", fontWeight: "700" }}>100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
