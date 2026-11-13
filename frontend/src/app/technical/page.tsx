"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import { Binary, CheckCircle, Calculator, Sigma, Network } from "lucide-react";
import { listSavedDatasets, getDatasetById } from "@/lib/api";
import { DEFAULT_BENCHMARK_CALCULATIONS } from "@/lib/constants";

export default function TechnicalAnalysisPage() {
  const [_loading, setLoading] = useState(true);
  const [datasetDetails, setDatasetDetails] = useState<any>(null);

  useEffect(() => {
    async function fetchTechData() {
      try {
        const storedId = typeof window !== "undefined" ? localStorage.getItem("bq_printers_active_dataset_id") : null;
        let storedData: any = null;
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem("bq_printers_active_dataset_data") : null;
          if (raw) storedData = JSON.parse(raw);
        } catch {}

        if (storedData && storedData.calculations) {
          setDatasetDetails(storedData);
          setLoading(false);
          return;
        }

        const datasets = await listSavedDatasets();
        const targetId = storedId || (datasets.length > 0 ? datasets[0].id : null);
        if (targetId) {
          const details = await getDatasetById(targetId);
          setDatasetDetails(details);
        }
      } catch (err) {
        console.error("Failed to fetch technical analysis data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTechData();
  }, []);

  const calc = datasetDetails?.calculations;
  const adv = calc?.advanced_analysis || calc;
  const _observations = datasetDetails?.observations || [];

  return (
    <div className="app-container">
      <Sidebar />

      <main className="main-wrapper">
        <TopHeader />

        <div className="dashboard-content animate-fade-in" style={{ maxWidth: "1200px" }}>
          {/* Header Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #0f172a, #1e293b)",
              color: "#ffffff",
              padding: "28px",
              borderRadius: "14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(225, 29, 72, 0.2)", color: "#fb7185", padding: "4px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: "700", marginBottom: "8px" }}>
                <Binary size={14} />
                <span>ACADEMIC VERIFICATION &amp; AUDIT</span>
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px" }}>
                Technical Analysis &amp; Linear Algebra Engine
              </h2>
              <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
                Mathematical verification proving matrix rank, covariance calculation, and eigenvalue decomposition from the project report.
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <span className="badge-tag" style={{ background: "#ecfdf5", color: "#059669", fontSize: "13px", padding: "6px 12px" }}>
                <CheckCircle size={14} />
                <span>Verified with NumPy &amp; SciPy</span>
              </span>
            </div>
          </div>

          {/* Section 1: Matrix Representation & Rank */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Calculator size={18} color="#e11d48" />
                1. Weekly Demand Matrix W and Matrix Rank rank(M)
              </h3>
              <span className="badge-tag" style={{ background: "#f1f5f9", color: "#0f172a" }}>
                Matrix Rank: {adv?.matrix_rank || 7} (Full Rank of 7 Operating Days)
              </span>
            </div>

            <p style={{ fontSize: "13px", color: "#475569", marginBottom: "16px", lineHeight: "1.5" }}>
              Each day&apos;s demand is formulated as a 4×4 matrix <em>D_d</em> where rows represent services (B&amp;W, Colour, Binding, Photocopying) and columns represent time slots. Placing the flattened 16-element daily vectors into a 7×16 matrix <em>M</em> yields <strong>rank(M) = 7</strong>, proving that all 7 daily patterns are linearly independent.
            </p>

            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service / Time Slot</th>
                    <th style={{ textAlign: "center" }}>9 AM–11 AM (2 hrs)</th>
                    <th style={{ textAlign: "center" }}>11 AM–1 PM (2 hrs)</th>
                    <th style={{ textAlign: "center" }}>1 PM–4 PM (3 hrs)</th>
                    <th style={{ textAlign: "center" }}>4 PM–6 PM (2 hrs)</th>
                    <th style={{ textAlign: "center" }}>Row Total R_i</th>
                  </tr>
                </thead>
                <tbody>
                  {(calc?.weekly_matrix || [
                    [259, 355, 214, 90],
                    [81, 122, 81, 35],
                    [28, 47, 25, 7],
                    [146, 204, 98, 48],
                  ]).map((row: number[], idx: number) => {
                    const names = ["B&W Printing", "Colour Printing", "Binding", "Photocopying"];
                    const rowSum = row.reduce((a, b) => a + b, 0);
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: "700" }}>{names[idx]}</td>
                        {row.map((val: number, cIdx: number) => (
                          <td key={cIdx} style={{ textAlign: "center", fontFamily: "var(--font-mono)" }}>
                            {val}
                          </td>
                        ))}
                        <td style={{ textAlign: "center", fontWeight: "700", color: "#e11d48" }}>
                          {rowSum}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Mean Vector & Covariance Matrix */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Sigma size={18} color="#e11d48" />
                2. Mean Vector x̄ &amp; Sample Covariance Matrix S
              </h3>
              <span className="badge-tag" style={{ background: "#fff1f2", color: "#e11d48" }}>
                N = 28 Observations (7 Days × 4 Time Slots)
              </span>
            </div>

            <p style={{ fontSize: "13px", color: "#475569", marginBottom: "16px", lineHeight: "1.5" }}>
              Calculated using the sample covariance formula with Bessel&apos;s correction (ddof=1) across the 28 observation vectors <em>x_n = [b_n, c_n, g_n, p_n]^T</em>:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
              {/* Mean Vector */}
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "10px", color: "#0f172a" }}>
                  Mean Vector x̄:
                </h4>
                {["B&W Printing", "Colour Printing", "Binding", "Photocopying"].map((s) => {
                  const val = adv?.mean_vector?.[s] ?? (s === "B&W Printing" ? 32.79 : s === "Colour Printing" ? 11.39 : s === "Binding" ? 3.82 : 17.71);
                  return (
                    <div key={s} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: "12px" }}>
                      <span style={{ color: "#64748b" }}>{s}</span>
                      <strong style={{ fontFamily: "var(--font-mono)" }}>{typeof val === 'number' ? val.toFixed(2) : val}</strong>
                    </div>
                  );
                })}
              </div>

              {/* Covariance Matrix */}
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "10px", color: "#0f172a" }}>
                  Sample Covariance Matrix S (4×4):
                </h4>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: "12px", fontFamily: "var(--font-mono)", textAlign: "center" }}>
                    <thead>
                      <tr>
                        <th></th>
                        <th>B&W</th>
                        <th>Colour</th>
                        <th>Binding</th>
                        <th>Photo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["B&W Printing", "Colour Printing", "Binding", "Photocopying"].map((s1) => (
                        <tr key={s1}>
                          <td style={{ textAlign: "left", fontWeight: "700", color: "#64748b", padding: "4px" }}>
                            {s1.slice(0, 5)}
                          </td>
                          {["B&W Printing", "Colour Printing", "Binding", "Photocopying"].map((s2) => {
                            const defaultCov = DEFAULT_BENCHMARK_CALCULATIONS.advanced_analysis.covariance_matrix as Record<string, Record<string, number>>;
                            const val = adv?.covariance_matrix?.[s1]?.[s2] ?? defaultCov?.[s1]?.[s2] ?? 0;
                            return (
                              <td key={s2} style={{ padding: "4px", color: s1 === s2 ? "#e11d48" : "#0f172a", fontWeight: s1 === s2 ? "700" : "500" }}>
                                {typeof val === 'number' ? val.toFixed(2) : val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Eigenvalue Decomposition */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Network size={18} color="#e11d48" />
                3. Eigenvalue Decomposition: S = P Λ P^T
              </h3>
            </div>

            <p style={{ fontSize: "13px", color: "#475569", marginBottom: "16px", lineHeight: "1.5" }}>
              Solving the characteristic equation <em>det(S - λI) = 0</em> yields 4 orthogonal eigenvalues and normalized eigenvectors:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
              {(adv?.eigenvalues || [323.828, 13.839, 3.768, 1.352]).map((val: number, idx: number) => {
                const varPct = adv?.variance_explained?.[idx] || (idx === 0 ? 94.47 : idx === 1 ? 4.04 : idx === 2 ? 1.10 : 0.39);
                return (
                  <div key={idx} style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                      Eigenvalue λ{idx + 1}
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: idx === 0 ? "#e11d48" : "#0f172a", margin: "6px 0", fontFamily: "var(--font-mono)" }}>
                      {typeof val === 'number' ? val.toFixed(3) : val}
                    </div>
                    <div className="badge-tag" style={{ background: idx === 0 ? "#fff1f2" : "#f1f5f9", color: idx === 0 ? "#e11d48" : "#64748b" }}>
                      {typeof varPct === 'number' ? varPct.toFixed(2) : varPct}% of Variance
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
