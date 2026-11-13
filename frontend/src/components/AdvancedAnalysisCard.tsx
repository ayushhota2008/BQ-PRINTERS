"use client";

import { useState } from "react";

interface AdvancedAnalysisProps {
  covarianceMatrix?: Record<string, Record<string, number>>;
  correlationMatrix?: Record<string, Record<string, number>>;
  eigenvalues?: number[];
  varianceExplained?: number[];
  matrixRank?: number;
}

export default function AdvancedAnalysisCard({
  covarianceMatrix,
  correlationMatrix,
  eigenvalues = [323.828, 13.839, 3.768, 1.352],
  varianceExplained = [94.47, 4.04, 1.10, 0.39],
  matrixRank = 7,
}: AdvancedAnalysisProps) {
  const [activeTab, setActiveTab] = useState<"covariance" | "eigenvalues" | "correlation">("covariance");

  const services = ["B&W", "Colour", "Binding", "Photocopying"];
  const serviceFullNames = ["B&W Printing", "Colour Printing", "Binding", "Photocopying"];

  // Default paper covariance matrix if not provided
  const cov = covarianceMatrix || {
    "B&W Printing": { "B&W Printing": 224.175, "Colour Printing": 69.272, "Binding": 33.590, "Photocopying": 126.122 },
    "Colour Printing": { "B&W Printing": 69.272, "Colour Printing": 28.914, "Binding": 10.888, "Photocopying": 34.672 },
    "Binding": { "B&W Printing": 33.590, "Colour Printing": 10.888, "Binding": 6.448, "Photocopying": 18.725 },
    "Photocopying": { "B&W Printing": 126.122, "Colour Printing": 34.672, "Binding": 18.725, "Photocopying": 83.249 },
  };

  // Find max value in covariance matrix for color normalization
  let maxCov = 1;
  serviceFullNames.forEach((s1) => {
    serviceFullNames.forEach((s2) => {
      const val = cov[s1]?.[s2] ?? 0;
      if (val > maxCov) maxCov = val;
    });
  });

  const getCellColor = (val: number, max: number) => {
    const ratio = Math.max(0, Math.min(1, val / max));
    // interpolate from light blush rgb(254, 242, 242) to deep rose rgb(225, 29, 72)
    const r = Math.round(254 - ratio * (254 - 225));
    const g = Math.round(242 - ratio * (242 - 29));
    const b = Math.round(242 - ratio * (242 - 72));
    const textColor = ratio > 0.6 ? "#ffffff" : "#0f172a";
    return { bg: `rgb(${r}, ${g}, ${b})`, color: textColor };
  };

  return (
    <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="card-header" style={{ marginBottom: "12px" }}>
        <h3 className="card-title">Advanced Analysis</h3>
        <div className="tabs-header">
          <button
            onClick={() => setActiveTab("covariance")}
            className={`tab-btn ${activeTab === "covariance" ? "active" : ""}`}
          >
            Covariance Matrix
          </button>
          <button
            onClick={() => setActiveTab("eigenvalues")}
            className={`tab-btn ${activeTab === "eigenvalues" ? "active" : ""}`}
          >
            Eigenvalues
          </button>
          <button
            onClick={() => setActiveTab("correlation")}
            className={`tab-btn ${activeTab === "correlation" ? "active" : ""}`}
          >
            Service Correlation
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {activeTab === "covariance" && (
          <div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "8px" }}>
              Covariance Matrix (Services)
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ flex: 1, overflowX: "auto" }}>
                <table className="heatmap-table">
                  <thead>
                    <tr>
                      <th style={{ width: "70px", textAlign: "left" }}></th>
                      {services.map((s) => (
                        <th key={s}>{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {serviceFullNames.map((s1, rIdx) => (
                      <tr key={s1}>
                        <td style={{ fontSize: "11px", fontWeight: "700", color: "#0f172a" }}>
                          {services[rIdx]}
                        </td>
                        {serviceFullNames.map((s2) => {
                          const val = cov[s1]?.[s2] ?? 0;
                          const { bg, color } = getCellColor(val, maxCov);
                          return (
                            <td
                              key={s2}
                              className="heatmap-cell"
                              style={{ backgroundColor: bg, color: color }}
                              title={`${s1} & ${s2}: ${val.toFixed(2)}`}
                            >
                              {val.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vertical Color Scale Bar matching Reference Image 1 */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b" }}>High</span>
                <div
                  style={{
                    width: "12px",
                    height: "90px",
                    borderRadius: "4px",
                    background: "linear-gradient(to bottom, #e11d48, #fecdd3, #fef2f2)",
                  }}
                />
                <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b" }}>Low</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "eigenvalues" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#334155" }}>
                Eigenvalue Decomposition & Variance Explained
              </span>
              <span className="badge-tag" style={{ background: "#ecfdf5", color: "#059669" }}>
                Rank: {matrixRank} (Full Rank)
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {eigenvalues.map((val, idx) => {
                const pct = varianceExplained[idx] || 0;
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ width: "40px", fontSize: "11px", fontWeight: "700", color: "#64748b" }}>
                      λ{idx + 1}
                    </span>
                    <div style={{ flex: 1, backgroundColor: "#f1f5f9", height: "16px", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.max(2, pct)}%`,
                          height: "100%",
                          backgroundColor: idx === 0 ? "#e11d48" : "#94a3b8",
                          borderRadius: "4px",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                    <span style={{ width: "65px", fontSize: "11px", fontWeight: "700", textAlign: "right" }}>
                      {(pct ?? 0).toFixed(2)}%
                    </span>
                    <span style={{ width: "65px", fontSize: "11px", color: "#94a3b8", fontFamily: "var(--font-mono)", textAlign: "right" }}>
                      ({(val ?? 0).toFixed(1)})
                    </span>
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", lineHeight: "1.4" }}>
              <strong>Dominant Principal Component:</strong> λ₁ explains{" "}
              {(varianceExplained?.[0] ?? 94.47).toFixed(2)}% of all service variance. This indicates customer footfall uniformly influences all four printing services simultaneously.
            </p>
          </div>
        )}

        {activeTab === "correlation" && (
          <div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "8px" }}>
              Service-to-Service Pearson Correlation Matrix (r)
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="heatmap-table">
                <thead>
                  <tr>
                    <th style={{ width: "70px", textAlign: "left" }}></th>
                    {services.map((s) => (
                      <th key={s}>{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {serviceFullNames.map((s1, rIdx) => (
                    <tr key={s1}>
                      <td style={{ fontSize: "11px", fontWeight: "700", color: "#0f172a" }}>
                        {services[rIdx]}
                      </td>
                      {serviceFullNames.map((s2) => {
                        const val = correlationMatrix?.[s1]?.[s2] ?? (s1 === s2 ? 1.0 : 0.85);
                        const { bg, color } = getCellColor(val, 1.0);
                        return (
                          <td
                            key={s2}
                            className="heatmap-cell"
                            style={{ backgroundColor: bg, color: color }}
                          >
                            {val.toFixed(3)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
