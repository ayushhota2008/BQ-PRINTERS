"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import { FileText, Download, Scale, Trash2, Loader2 } from "lucide-react";
import { listSavedDatasets, compareMultipleWeeks, deleteDatasetById, getDatasetById } from "@/lib/api";
import { jsPDF } from "jspdf";

export default function ReportsPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [comparing, setComparing] = useState(false);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    loadDatasets();
  }, []);

  async function loadDatasets() {
    setLoading(true);
    try {
      const data = await listSavedDatasets();
      setDatasets(data);
      if (data.length >= 2) {
        setSelectedIds([data[0].id, data[1].id]);
      } else if (data.length === 1) {
        setSelectedIds([data[0].id]);
      }
    } catch (err) {
      console.error("Failed to load datasets:", err);
    } finally {
      setLoading(false);
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      alert("Please select at least 2 datasets to compare.");
      return;
    }
    setComparing(true);
    try {
      const comp = await compareMultipleWeeks(selectedIds);
      setComparisonResult(comp);
    } catch (err: any) {
      alert(err.message || "Comparison failed");
    } finally {
      setComparing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this dataset?")) {
      await deleteDatasetById(id);
      loadDatasets();
    }
  };

  const handleDownloadPdf = async (datasetId: string) => {
    try {
      const details = await getDatasetById(datasetId);
      const ds = details.dataset;
      const calc = details.calculations;

      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(225, 29, 72);
      doc.text("BQ PRINTERS", 20, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("Demand Analytics Platform — Executive Weekly Report", 20, 26);
      doc.line(20, 30, 190, 30);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(`Dataset: ${ds.dataset_name}`, 20, 42);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Week Period: ${ds.week_label || "7-Day Recorded Demand"} | Generated: ${new Date().toLocaleDateString()}`, 20, 48);

      // Demand summary box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, 54, 170, 32, 3, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("Total Weekly Demand:", 26, 64);
      doc.text("Average Daily Demand:", 26, 72);
      doc.text("Peak Customer Time Slot:", 26, 80);

      const totalDemand = Number(calc?.total_weekly_demand ?? ds?.total_demand ?? 0);
      const avgDemand = totalDemand > 0 ? (totalDemand / 7).toFixed(2) : "0.00";
      const peakLabel = calc?.peak_time_slot?.label || "11 AM – 1 PM";
      const peakDemand = calc?.peak_time_slot?.total_demand ?? 0;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(225, 29, 72);
      doc.text(`${totalDemand} orders`, 90, 64);
      doc.setTextColor(15, 23, 42);
      doc.text(`${avgDemand} orders/day`, 90, 72);
      doc.text(`${peakLabel} (${peakDemand} orders)`, 90, 80);

      // Recommendations
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Key Business Recommendations:", 20, 100);

      let yPos = 110;
      const recs = calc.recommendations || [];
      recs.slice(0, 4).forEach((r: any, idx: number) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(225, 29, 72);
        doc.text(`${idx + 1}. ${r.title}`, 22, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        const splitText = doc.splitTextToSize(r.description, 165);
        doc.text(splitText, 22, yPos);
        yPos += splitText.length * 5 + 4;
      });

      doc.save(`BQ_Printers_Report_${ds.dataset_name.replace(/\s+/g, "_")}.pdf`);
    } catch (e: any) {
      alert("Failed to export PDF: " + e.message);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />

      <main className="main-wrapper">
        <TopHeader />

        <div className="dashboard-content animate-fade-in" style={{ maxWidth: "1200px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
                Historical Datasets &amp; Week Comparisons
              </h1>
              <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                Select multiple weeks stored in Supabase PostgreSQL to compare demand shifts and workloads.
              </p>
            </div>

            <button
              onClick={handleCompare}
              disabled={selectedIds.length < 2 || comparing}
              className="btn-primary"
            >
              {comparing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Comparing...</span>
                </>
              ) : (
                <>
                  <Scale size={16} />
                  <span>Compare Selected ({selectedIds.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Datasets Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <FileText size={18} color="#e11d48" />
                Saved Weekly Datasets
              </h3>
              <span className="badge-tag" style={{ background: "#ecfdf5", color: "#059669" }}>
                {datasets.length} Week(s) Preserved
              </span>
            </div>

            {datasets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <p style={{ fontSize: "14px", color: "#64748b" }}>
                  No uploaded datasets found in Supabase yet.
                </p>
                <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                  Upload a 7-day CSV from the dashboard or click &apos;Load Academic Benchmark Data&apos;.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>Select</th>
                      <th>Dataset Name</th>
                      <th>Week Period</th>
                      <th>Total Demand</th>
                      <th>Uploaded On</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasets.map((ds) => {
                      const isChecked = selectedIds.includes(ds.id);
                      return (
                        <tr key={ds.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelect(ds.id)}
                              style={{ accentColor: "#e11d48", width: "16px", height: "16px", cursor: "pointer" }}
                            />
                          </td>
                          <td style={{ fontWeight: "700" }}>{ds.dataset_name}</td>
                          <td style={{ color: "#64748b" }}>{ds.week_label || "Recorded Week"}</td>
                          <td style={{ fontWeight: "700", color: "#e11d48" }}>{ds.total_demand}</td>
                          <td style={{ fontSize: "12px", color: "#94a3b8" }}>
                            {new Date(ds.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "8px" }}>
                              <button
                                onClick={() => handleDownloadPdf(ds.id)}
                                className="btn-secondary"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                title="Download PDF Report"
                              >
                                <Download size={13} color="#e11d48" />
                                <span>PDF</span>
                              </button>
                              <button
                                onClick={() => handleDelete(ds.id)}
                                style={{ background: "transparent", color: "#94a3b8", padding: "4px 6px" }}
                                title="Delete dataset"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Comparison Result Section */}
          {comparisonResult && (
            <div className="card animate-fade-in" style={{ border: "1px solid #fecdd3" }}>
              <div className="card-header">
                <h3 className="card-title">
                  <Scale size={18} color="#e11d48" />
                  Week-to-Week Comparative Analysis
                </h3>
              </div>

              {/* Insights bullet points */}
              {comparisonResult.summary_insights && comparisonResult.summary_insights.length > 0 && (
                <div style={{ background: "#fff1f2", padding: "14px", borderRadius: "8px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#9f1239", marginBottom: "6px" }}>
                    Comparative Key Findings:
                  </div>
                  <ul style={{ paddingLeft: "18px", fontSize: "12px", color: "#475569" }}>
                    {comparisonResult.summary_insights.map((ins: string, i: number) => (
                      <li key={i} style={{ marginBottom: "2px" }}>{ins}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Side by side comparison table */}
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      {comparisonResult.datasets.map((d: any) => (
                        <th key={d.dataset_id} style={{ textAlign: "center" }}>
                          {d.dataset_name} ({d.week_label || "Week"})
                        </th>
                      ))}
                      <th style={{ textAlign: "right" }}>Absolute Diff</th>
                      <th style={{ textAlign: "right" }}>% Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: "600" }}>Total Weekly Demand</td>
                      {comparisonResult.datasets.map((d: any) => (
                        <td key={d.dataset_id} style={{ textAlign: "center", fontWeight: "700" }}>
                          {d.total_demand}
                        </td>
                      ))}
                      <td style={{ textAlign: "right", fontWeight: "700", color: comparisonResult.absolute_differences.total_demand >= 0 ? "#059669" : "#dc2626" }}>
                        {comparisonResult.absolute_differences.total_demand > 0 ? "+" : ""}
                        {comparisonResult.absolute_differences.total_demand}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700", color: comparisonResult.percentage_differences.total_demand >= 0 ? "#059669" : "#dc2626" }}>
                        {comparisonResult.percentage_differences.total_demand > 0 ? "+" : ""}
                        {comparisonResult.percentage_differences.total_demand}%
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "600" }}>Average Daily Demand</td>
                      {comparisonResult.datasets.map((d: any) => (
                        <td key={d.dataset_id} style={{ textAlign: "center" }}>
                          {d.average_daily_demand}
                        </td>
                      ))}
                      <td style={{ textAlign: "right" }}>
                        {comparisonResult.absolute_differences.average_daily_demand}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {comparisonResult.percentage_differences.average_daily_demand}%
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "600" }}>Peak Time Slot</td>
                      {comparisonResult.datasets.map((d: any) => (
                        <td key={d.dataset_id} style={{ textAlign: "center", color: "#e11d48", fontWeight: "600" }}>
                          {d.peak_time_slot}
                        </td>
                      ))}
                      <td colSpan={2} style={{ textAlign: "center", color: "#64748b", fontSize: "11px" }}>
                        Categorical Match
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "600" }}>HP 303dw Load Ratio</td>
                      {comparisonResult.datasets.map((d: any) => (
                        <td key={d.dataset_id} style={{ textAlign: "center" }}>
                          {d.hp_load_ratio.toFixed(2)}%
                        </td>
                      ))}
                      <td style={{ textAlign: "right" }}>
                        {comparisonResult.absolute_differences.hp_load_ratio}%
                      </td>
                      <td style={{ textAlign: "right" }}>—</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "600" }}>Staff Utilization Ratio</td>
                      {comparisonResult.datasets.map((d: any) => (
                        <td key={d.dataset_id} style={{ textAlign: "center" }}>
                          {d.staff_utilization.toFixed(2)}%
                        </td>
                      ))}
                      <td style={{ textAlign: "right" }}>
                        {comparisonResult.absolute_differences.staff_utilization}%
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {comparisonResult.percentage_differences.staff_utilization}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
