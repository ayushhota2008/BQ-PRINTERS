"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import { Clock, Users, Printer, Database, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { listSavedDatasets, getDatasetById } from "@/lib/api";
import { DEFAULT_BENCHMARK_CALCULATIONS as defaultCalculations } from "@/lib/constants";

function formatAnalysisTime(ts?: string): string {
  if (!ts) return "Just now";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return ts;
  }
}

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const urlDatasetId = searchParams ? searchParams.get("datasetId") : null;

  const [data, setData] = useState<any>(null);
  const [datasetList, setDatasetList] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [activeMetadata, setActiveMetadata] = useState<{
    name: string;
    weekLabel: string;
    createdAt: string;
  }>({
    name: "Academic Benchmark Dataset",
    weekLabel: "Week 1 (Report)",
    createdAt: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const datasets = await listSavedDatasets();
        setDatasetList(datasets);

        const storedId = typeof window !== "undefined" ? localStorage.getItem("bq_printers_active_dataset_id") : null;
        let storedData: any = null;
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem("bq_printers_active_dataset_data") : null;
          if (raw) storedData = JSON.parse(raw);
        } catch {}

        const targetId = urlDatasetId || storedId;

        // If targetId matches cached active dataset
        if (targetId && storedData && (storedData.dataset_id === targetId || targetId === "local-preview-id")) {
          setSelectedDatasetId(targetId);
          setData(storedData.calculations);
          setActiveMetadata({
            name: storedData.dataset_name || "Uploaded Dataset",
            weekLabel: storedData.week_label || "Analyzed Week",
            createdAt: storedData.created_at || new Date().toISOString(),
          });
          return;
        }

        // If targetId matches a dataset in Supabase
        if (targetId && datasets.some((d: any) => d.id === targetId)) {
          setSelectedDatasetId(targetId);
          const details = await getDatasetById(targetId);
          if (details && details.calculations) {
            setData(details.calculations);
            setActiveMetadata({
              name: details.dataset?.dataset_name || "Saved Dataset",
              weekLabel: details.dataset?.week_label || "",
              createdAt: details.dataset?.created_at || "",
            });
            return;
          }
        }

        // Fallback to active stored data, first dataset, or benchmark
        if (storedData && storedData.calculations) {
          setSelectedDatasetId(storedData.dataset_id || "");
          setData(storedData.calculations);
          setActiveMetadata({
            name: storedData.dataset_name || "Uploaded Dataset",
            weekLabel: storedData.week_label || "Analyzed Week",
            createdAt: storedData.created_at || new Date().toISOString(),
          });
        } else if (datasets.length > 0) {
          const first = datasets[0];
          setSelectedDatasetId(first.id);
          const details = await getDatasetById(first.id);
          if (details && details.calculations) {
            setData(details.calculations);
            setActiveMetadata({
              name: details.dataset?.dataset_name || first.dataset_name,
              weekLabel: details.dataset?.week_label || first.week_label || "",
              createdAt: details.dataset?.created_at || first.created_at || "",
            });
          } else {
            setData(defaultCalculations);
          }
        } else {
          setData(defaultCalculations);
        }
      } catch (err) {
        console.error("Failed to load analytics data:", err);
        setData(defaultCalculations);
      }
    }
    loadData();
  }, [urlDatasetId]);

  const handleSelectDataset = async (datasetId: string) => {
    setSelectedDatasetId(datasetId);
    if (!datasetId) {
      setData(defaultCalculations);
      setActiveMetadata({
        name: "Academic Benchmark Dataset",
        weekLabel: "Week 1 (Report)",
        createdAt: "",
      });
      if (typeof window !== "undefined") {
        localStorage.removeItem("bq_printers_active_dataset_id");
        localStorage.removeItem("bq_printers_active_dataset_data");
      }
      return;
    }

    try {
      const details = await getDatasetById(datasetId);
      if (details && details.calculations) {
        setData(details.calculations);
        setActiveMetadata({
          name: details.dataset?.dataset_name || "Selected Dataset",
          weekLabel: details.dataset?.week_label || "",
          createdAt: details.dataset?.created_at || "",
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("bq_printers_active_dataset_id", datasetId);
        }
      }
    } catch (err) {
      console.error("Failed to switch dataset:", err);
    }
  };

  const rates = data?.duration_adjusted_rates || {
    "9 AM–11 AM": 36.71,
    "11 AM–1 PM": 52.0,
    "1 PM–4 PM": 19.9,
    "4 PM–6 PM": 12.86,
  };

  // Find slot with highest arrival rate
  const rateEntries = Object.entries(rates) as [string, number][];
  const peakSlotName = rateEntries.length > 0
    ? rateEntries.reduce((max, curr) => (curr[1] > max[1] ? curr : max))[0]
    : "11 AM–1 PM";

  // Service handling calculations
  const serviceTotals = data?.service_totals || {
    "B&W Printing": 918,
    "Colour Printing": 319,
    Binding: 107,
    Photocopying: 496,
  };

  const handlingAssumptions = data?.staff_metrics?.assumptions?.handling_times_min || {
    "B&W Printing": 2.0,
    "Colour Printing": 4.0,
    Binding: 8.0,
    Photocopying: 2.0,
  };

  const services = [
    { name: "B&W Printing", defaultTime: 2 },
    { name: "Colour Printing", defaultTime: 4 },
    { name: "Binding", defaultTime: 8 },
    { name: "Photocopying", defaultTime: 2 },
  ];

  const breakdown = services.map((s) => {
    const orders = Number(serviceTotals[s.name] ?? 0);
    const timeMin = Number(handlingAssumptions[s.name] ?? s.defaultTime);
    const totalMins = orders * timeMin;
    const totalHrs = totalMins / 60.0;
    return {
      name: s.name,
      orders,
      time: `${timeMin} min/order`,
      mins: Math.round(totalMins),
      hrs: totalHrs,
    };
  });

  const totalOrders = breakdown.reduce((acc, row) => acc + row.orders, 0);
  const totalLaborMins = breakdown.reduce((acc, row) => acc + row.mins, 0);
  const totalLaborHrs = totalLaborMins / 60.0;

  // Equipment & workload metrics
  const hpMetrics = data?.printer_metrics?.hp_laser_303dw;
  const canonMetrics = data?.printer_metrics?.canon_pixma_g670;
  const staffMetrics = data?.staff_metrics;

  return (
    <div className="app-container">
      <Sidebar />

      <main className="main-wrapper">
        <TopHeader lastUpdated={formatAnalysisTime(activeMetadata.createdAt)} />

        <div className="dashboard-content animate-fade-in" style={{ maxWidth: "1200px" }}>
          {/* Active Dataset Identity Banner & Switcher */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 20px",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Database size={18} color="#e11d48" />
              <div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Active Analytics Dataset
                </span>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                  {activeMetadata.name} {activeMetadata.weekLabel ? `(${activeMetadata.weekLabel})` : ""} —{" "}
                  <span style={{ color: "#e11d48" }}>{totalOrders.toLocaleString()} total orders</span>
                </div>
              </div>
            </div>

            {/* Switch Dataset Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                Switch Dataset:
              </span>
              <select
                value={selectedDatasetId}
                onChange={(e) => handleSelectDataset(e.target.value)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#0f172a",
                  background: "#f8fafc",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="">Academic Benchmark Dataset (Default)</option>
                {datasetList.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.dataset_name} ({ds.week_label || "Week"}) — {ds.total_demand} orders
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
              Operational Analytics &amp; Service Intensities
            </h1>
            <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
              Detailed rate-adjusted workloads, equipment load analysis, and labor hours allocation.
            </p>
          </div>

          {/* Section 1: Time Slot Duration-Adjusted Rate Comparison */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Clock size={18} color="#e11d48" />
                Duration-Adjusted Customer Arrival Rates
              </h3>
            </div>
            <p style={{ fontSize: "13px", color: "#475569", marginBottom: "16px", lineHeight: "1.5" }}>
              Because time slots have unequal lengths (1 PM–4 PM is 3 hours while others are 2 hours), comparing raw orders can be misleading. Duration-adjusted rates measure customer intensity per operational hour:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
              {[
                { slot: "9 AM–11 AM", hours: 2, key: "9 AM–11 AM" },
                { slot: "11 AM–1 PM", hours: 2, key: "11 AM–1 PM" },
                { slot: "1 PM–4 PM", hours: 3, key: "1 PM–4 PM" },
                { slot: "4 PM–6 PM", hours: 2, key: "4 PM–6 PM" },
              ].map((item) => {
                const rate = rates[item.key] ?? rates[item.slot] ?? 0;
                const isPeak = item.slot === peakSlotName || item.key === peakSlotName;
                return (
                  <div
                    key={item.slot}
                    style={{
                      background: isPeak ? "#fff1f2" : "#f8fafc",
                      border: isPeak ? "1px solid #fecdd3" : "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>{item.slot}</div>
                    <div style={{ fontSize: "26px", fontWeight: "800", color: isPeak ? "#e11d48" : "#0f172a", margin: "6px 0" }}>
                      {rate.toFixed(2)} <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>req/hr</span>
                    </div>
                    <div style={{ fontSize: "11px", color: isPeak ? "#e11d48" : "#94a3b8", fontWeight: isPeak ? "600" : "400" }}>
                      {isPeak ? "★ Peak Demand Slot" : `Slot Duration: ${item.hours} Hours`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Service Handling Labor Analysis */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Users size={18} color="#e11d48" />
                Service-Wise Staff Handling Minutes
              </h3>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th style={{ textAlign: "center" }}>Weekly Order Count</th>
                    <th style={{ textAlign: "center" }}>Assumed Handling Time</th>
                    <th style={{ textAlign: "right" }}>Total Labor Minutes</th>
                    <th style={{ textAlign: "right" }}>Total Labor Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((row) => (
                    <tr key={row.name}>
                      <td style={{ fontWeight: "700" }}>{row.name}</td>
                      <td style={{ textAlign: "center", fontFamily: "var(--font-mono)" }}>{row.orders.toLocaleString()}</td>
                      <td style={{ textAlign: "center", color: "#64748b" }}>{row.time}</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: "600" }}>{row.mins.toLocaleString()} min</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: "700", color: "#e11d48" }}>{row.hrs.toFixed(2)} hrs</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td>Total Order Handling</td>
                    <td style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: "700" }}>{totalOrders.toLocaleString()}</td>
                    <td style={{ textAlign: "center" }}>—</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: "700" }}>{totalLaborMins.toLocaleString()} min</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: "700", color: "#e11d48" }}>{totalLaborHrs.toFixed(2)} hrs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Operational Capacity & Workload Allocation */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {/* HP Laser 303dw */}
            <div className="card" style={{ padding: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <Printer size={18} color="#e11d48" />
                <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                  HP Laser 303dw
                </h4>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
                {hpMetrics?.load_ratio_percent ? `${hpMetrics.load_ratio_percent}%` : "2.41%"}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                Capacity Load Ratio ({hpMetrics?.estimated_pages?.toLocaleString() || "2,732"} est. pages)
              </div>
            </div>

            {/* Canon PIXMA MegaTank G670 */}
            <div className="card" style={{ padding: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <Printer size={18} color="#e11d48" />
                <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                  Canon PIXMA G670
                </h4>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
                {canonMetrics?.load_ratio_percent ? `${canonMetrics.load_ratio_percent}%` : "1.11%"}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                Capacity Load Ratio ({canonMetrics?.estimated_pages?.toLocaleString() || "1,041"} est. pages)
              </div>
            </div>

            {/* Staff Availability & Utilization */}
            <div className="card" style={{ padding: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <Users size={18} color="#e11d48" />
                <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                  Staff Labor Utilization
                </h4>
              </div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
                {staffMetrics?.weekly_utilization_percent ? `${staffMetrics.weekly_utilization_percent}%` : `${((totalLaborHrs / 189) * 100).toFixed(1)}%`}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                {totalLaborHrs.toFixed(1)} hrs utilized / 189 scheduled hrs
              </div>
            </div>
          </div>

          {/* Section 4: Slot Resource Capacity & Bottlenecks */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Users size={18} color="#e11d48" />
                Time-Slot Resource Capacity &amp; Bottleneck Analysis
              </h3>
              {data?.checkin_summary && (
                <span className="badge-tag" style={{ background: "#ecfdf5", color: "#065f46" }}>
                  <CheckCircle size={12} />
                  Calibrated to Shop Check-in ({data.checkin_summary.staff_present} Staff, {data.checkin_summary.working_printers === "all" ? "All Printers" : data.checkin_summary.working_printers})
                </span>
              )}
            </div>

            <p style={{ fontSize: "13px", color: "#475569", marginBottom: "16px", lineHeight: "1.5" }}>
              Compares staff capacity against daily customer workload and printer throughput for every 2-hour or 3-hour operating slot:
            </p>

            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time Slot</th>
                    <th style={{ textAlign: "center" }}>Slot Length</th>
                    <th style={{ textAlign: "center" }}>Staff Capacity</th>
                    <th style={{ textAlign: "center" }}>Avg Workload</th>
                    <th style={{ textAlign: "center" }}>Staff Utilization</th>
                    <th style={{ textAlign: "center" }}>Workload Status</th>
                    <th style={{ textAlign: "right" }}>Tighter Bottleneck</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.slot_capacity_analysis || [
                    { slot_label: "9 AM–11 AM", duration_hours: 2, staff_capacity_hours: 2, workload_hours: 1.63, staff_utilization_percent: 81.5, is_overloaded: false, is_underused: false, extra_staff_hours_needed: 0, bottleneck: "Staff (81.5% utilized)" },
                    { slot_label: "11 AM–1 PM", duration_hours: 2, staff_capacity_hours: 2, workload_hours: 2.31, staff_utilization_percent: 115.5, is_overloaded: true, is_underused: false, extra_staff_hours_needed: 0.31, bottleneck: "Staff (115.5% utilized)" },
                    { slot_label: "1 PM–4 PM", duration_hours: 3, staff_capacity_hours: 3, workload_hours: 1.33, staff_utilization_percent: 44.3, is_overloaded: false, is_underused: false, extra_staff_hours_needed: 0, bottleneck: "Staff (44.3% utilized)" },
                    { slot_label: "4 PM–6 PM", duration_hours: 2, staff_capacity_hours: 2, workload_hours: 0.57, staff_utilization_percent: 28.5, is_overloaded: false, is_underused: true, extra_staff_hours_needed: 0, bottleneck: "Staff (28.5% utilized)" }
                  ]).map((slotItem: any) => (
                    <tr key={slotItem.slot_label}>
                      <td style={{ fontWeight: "700" }}>{slotItem.slot_label}</td>
                      <td style={{ textAlign: "center", color: "#64748b" }}>{slotItem.duration_hours} hrs</td>
                      <td style={{ textAlign: "center", fontFamily: "var(--font-mono)" }}>
                        {slotItem.staff_capacity_hours.toFixed(2)} hrs
                      </td>
                      <td style={{ textAlign: "center", fontFamily: "var(--font-mono)" }}>
                        {slotItem.workload_hours.toFixed(2)} hrs
                      </td>
                      <td style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: "700", color: slotItem.is_overloaded ? "#dc2626" : (slotItem.is_underused ? "#d97706" : "#059669") }}>
                        {slotItem.staff_utilization_percent.toFixed(1)}%
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {slotItem.is_overloaded ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: "#fef2f2", color: "#dc2626", fontSize: "11px", fontWeight: "700" }}>
                            <AlertTriangle size={12} /> Overloaded (+{slotItem.extra_staff_hours_needed.toFixed(2)} hrs needed)
                          </span>
                        ) : slotItem.is_underused ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: "#fffbeb", color: "#b45309", fontSize: "11px", fontWeight: "700" }}>
                            <Info size={12} /> Under-used (&lt;30%)
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: "#ecfdf5", color: "#059669", fontSize: "11px", fontWeight: "700" }}>
                            <CheckCircle size={12} /> Balanced
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "600", fontSize: "12px", color: slotItem.bottleneck_type === "printer" ? "#e11d48" : "#0f172a" }}>
                        {slotItem.bottleneck}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Beginner-Friendly Formulas Guide */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "20px 24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Info size={16} color="#e11d48" />
              <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                Operational Capacity &amp; Bottleneck Formulas Explained
              </h4>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "12px", color: "#475569", lineHeight: "1.5" }}>
              <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <strong style={{ color: "#0f172a", display: "block", marginBottom: "4px" }}>
                  1. Staff Capacity &amp; Workload
                </strong>
                <div>• <strong>Staff Capacity per Slot</strong> = Staff Present × Slot Hours × Productive Factor (1.0).</div>
                <div>• <strong>Workload per Slot</strong> = Sum of (Jobs in slot × Average handling minutes) ÷ 60.</div>
                <div>• <strong>Staff Utilization %</strong> = (Slot Workload Hours ÷ Staff Capacity Hours) × 100%.</div>
                <div style={{ marginTop: "4px", color: "#64748b" }}>
                  Slots exceeding 100% flag <em>Overloaded</em> and display extra staff hours required to prevent queues.
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <strong style={{ color: "#0f172a", display: "block", marginBottom: "4px" }}>
                  2. Equipment Throughput &amp; Bottlenecks
                </strong>
                <div>• <strong>Printer Capacity per Slot</strong> = Working Printers × Rated Pages/Hour × Slot Hours.</div>
                <div>• <strong>Printer Issue Rule</strong> = Only operational printers provide capacity. If neither printer works, printer capacity is treated as 0.</div>
                <div>• <strong>Binding Limit</strong> = Manual staff handling time limits binding, not printers.</div>
                <div>• <strong>Tighter Bottleneck</strong> = Flags whichever resource (staff labor or printer throughput) reaches its capacity limit first.</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "30px", textAlign: "center" }}>Loading Operational Analytics...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
