"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import KpiCards from "@/components/KpiCards";
import DemandByServiceChart from "@/components/DemandByServiceChart";
import DemandByTimeSlotChart from "@/components/DemandByTimeSlotChart";
import WeeklyTrendChart from "@/components/WeeklyTrendChart";
import DemandMatrixTable from "@/components/DemandMatrixTable";
import ServiceBreakdownTable from "@/components/ServiceBreakdownTable";
import KeyStatisticsCard from "@/components/KeyStatisticsCard";
import InsightsRecommendations from "@/components/InsightsRecommendations";
import OperationalCapacityCards from "@/components/OperationalCapacityCards";
import UploadModal from "@/components/UploadModal";
import { listSavedDatasets, getDatasetById } from "@/lib/api";
import { DEFAULT_BENCHMARK_CALCULATIONS as defaultCalculations } from "@/lib/constants";
import { Database, FileSpreadsheet, AlertTriangle } from "lucide-react";

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

function DashboardContent() {
  const searchParams = useSearchParams();
  const urlDatasetId = searchParams ? searchParams.get("datasetId") : null;

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [_loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [datasetList, setDatasetList] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [activeMetadata, setActiveMetadata] = useState<{
    name: string;
    weekLabel: string;
    createdAt: string;
    source: "upload" | "supabase" | "default";
  }>({
    name: "Academic Benchmark Dataset",
    weekLabel: "Week 1 (Oct 2026)",
    createdAt: "Academic Report Benchmark",
    source: "default",
  });

  useEffect(() => {
    async function initDashboard() {
      setLoading(true);
      try {
        // Fetch fresh list of datasets with cache disabled
        const datasets = await listSavedDatasets();
        setDatasetList(datasets);

        // Determine target dataset: URL param > localStorage > datasets[0]
        const storedId = typeof window !== "undefined" ? localStorage.getItem("bq_printers_active_dataset_id") : null;
        let storedData: any = null;
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem("bq_printers_active_dataset_data") : null;
          if (raw) storedData = JSON.parse(raw);
        } catch { }

        const targetId = urlDatasetId || storedId;

        // If targetId matches storedData, load it immediately
        if (targetId && storedData && (storedData.dataset_id === targetId || targetId === "local-preview-id")) {
          setSelectedDatasetId(targetId);
          setDashboardData(storedData.calculations);
          setActiveMetadata({
            name: storedData.dataset_name || "Uploaded Dataset",
            weekLabel: storedData.week_label || "Analyzed Week",
            createdAt: storedData.created_at || new Date().toISOString(),
            source: "upload",
          });
          setLoading(false);
          return;
        }

        // If targetId exists in database, fetch exact dataset details
        if (targetId && datasets.some((d: any) => d.id === targetId)) {
          setSelectedDatasetId(targetId);
          const details = await getDatasetById(targetId);
          if (details && details.calculations) {
            setDashboardData(details.calculations);
            setActiveMetadata({
              name: details.dataset?.dataset_name || "Saved Dataset",
              weekLabel: details.dataset?.week_label || "",
              createdAt: details.dataset?.created_at || "",
              source: "supabase",
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("bq_printers_active_dataset_id", targetId);
            }
            setLoading(false);
            return;
          }
        }

        // Fallback to latest dataset in Supabase if any exist
        if (datasets.length > 0) {
          const latest = datasets[0];
          setSelectedDatasetId(latest.id);
          const details = await getDatasetById(latest.id);
          if (details && details.calculations) {
            setDashboardData(details.calculations);
            setActiveMetadata({
              name: details.dataset?.dataset_name || latest.dataset_name,
              weekLabel: details.dataset?.week_label || latest.week_label || "",
              createdAt: details.dataset?.created_at || latest.created_at || "",
              source: "supabase",
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("bq_printers_active_dataset_id", latest.id);
            }
          } else {
            setDashboardData(defaultCalculations);
          }
        } else {
          setDashboardData(defaultCalculations);
        }
      } catch (err) {
        console.error("Failed to load initial dataset:", err);
        setDashboardData(defaultCalculations);
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, [urlDatasetId]);

  const handleSelectDataset = async (id: string) => {
    setSelectedDatasetId(id);
    if (!id) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("bq_printers_active_dataset_id");
        localStorage.removeItem("bq_printers_active_dataset_data");
      }
      setDashboardData(defaultCalculations);
      setActiveMetadata({
        name: "Academic Benchmark Dataset",
        weekLabel: "Week 1 (Oct 2026)",
        createdAt: "Academic Report Benchmark",
        source: "default",
      });
      return;
    }

    try {
      setLoading(true);
      const details = await getDatasetById(id);
      if (details && details.calculations) {
        setDashboardData(details.calculations);
        setActiveMetadata({
          name: details.dataset?.dataset_name || "Selected Dataset",
          weekLabel: details.dataset?.week_label || "",
          createdAt: details.dataset?.created_at || "",
          source: "supabase",
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("bq_printers_active_dataset_id", id);
          localStorage.setItem("bq_printers_active_dataset_data", JSON.stringify(details));
        }
      }
    } catch (err) {
      console.error("Error loading selected dataset:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (uploadRes: any) => {
    if (uploadRes && uploadRes.calculations) {
      setDashboardData(uploadRes.calculations);
      if (uploadRes.dataset_id) {
        setSelectedDatasetId(uploadRes.dataset_id);
        if (typeof window !== "undefined") {
          localStorage.setItem("bq_printers_active_dataset_id", uploadRes.dataset_id);
          localStorage.setItem("bq_printers_active_dataset_data", JSON.stringify(uploadRes));
        }
      }
      setActiveMetadata({
        name: uploadRes.dataset_name || "Uploaded Dataset",
        weekLabel: uploadRes.week_label || "Analyzed Week",
        createdAt: uploadRes.created_at || new Date().toISOString(),
        source: "upload",
      });
      // Refresh database list with fresh no-cache fetch
      listSavedDatasets().then(setDatasetList).catch(console.error);
    }
  };

  const normalize = (raw: any) => {
    if (!raw) return defaultCalculations;
    const total =
      raw.total_weekly_demand ??
      (raw.service_totals
        ? Object.values(raw.service_totals).reduce((a: any, b: any) => a + Number(b), 0)
        : defaultCalculations.total_weekly_demand);
    const avgDaily =
      raw.average_daily_demand ??
      (total ? Number((total / 7).toFixed(2)) : defaultCalculations.average_daily_demand);

    let topService = raw.top_service;
    if (!topService && raw.service_totals) {
      const sorted = Object.entries(raw.service_totals).sort(
        (a: any, b: any) => (b[1] as number) - (a[1] as number)
      );
      if (sorted.length > 0) {
        topService = {
          name: sorted[0][0],
          total_demand: sorted[0][1],
          percentage: total ? Number((((sorted[0][1] as number) / total) * 100).toFixed(2)) : 0,
        };
      }
    }

    let peakSlot = raw.peak_time_slot;
    if (!peakSlot && raw.timeslot_totals) {
      const sorted = Object.entries(raw.timeslot_totals).sort(
        (a: any, b: any) => (b[1] as number) - (a[1] as number)
      );
      if (sorted.length > 0) {
        peakSlot = {
          label: sorted[0][0],
          total_demand: sorted[0][1],
          rate_per_hour: raw.duration_adjusted_rates?.[sorted[0][0]] ?? 0,
        };
      }
    }

    let advanced = raw.advanced_analysis;
    if (!advanced) {
      advanced = {
        matrix_rank: raw.matrix_rank ?? 7,
        mean_vector: raw.mean_vector ?? defaultCalculations.advanced_analysis.mean_vector,
        covariance_matrix: raw.covariance_matrix ?? defaultCalculations.advanced_analysis.covariance_matrix,
        correlation_matrix: raw.correlation_matrix ?? defaultCalculations.advanced_analysis.correlation_matrix,
        eigenvalues: raw.eigenvalues ?? defaultCalculations.advanced_analysis.eigenvalues,
        eigenvectors: raw.eigenvectors ?? defaultCalculations.advanced_analysis.eigenvectors,
        variance_explained: raw.variance_explained ?? defaultCalculations.advanced_analysis.variance_explained,
        dominant_direction: raw.dominant_direction ?? defaultCalculations.advanced_analysis.dominant_direction,
      };
    }

    return {
      ...defaultCalculations,
      ...raw,
      total_weekly_demand: total,
      average_daily_demand: avgDaily,
      top_service: topService ?? defaultCalculations.top_service,
      peak_time_slot: peakSlot ?? defaultCalculations.peak_time_slot,
      advanced_analysis: advanced,
    };
  };

  const calc = normalize(dashboardData);

  // Derive previous dataset in history for week-over-week comparison
  const previousWeekDemand = (() => {
    if (!datasetList || datasetList.length === 0) return null;

    if (!selectedDatasetId) {
      // Academic benchmark is the baseline
      return null;
    }

    const currentIndex = datasetList.findIndex((d) => d.id === selectedDatasetId);
    if (currentIndex >= 0) {
      if (currentIndex + 1 < datasetList.length) {
        return datasetList[currentIndex + 1]?.total_demand ?? null;
      }
      // Earliest saved dataset compares against benchmark (1,840) if different
      if (defaultCalculations?.total_weekly_demand && calc.total_weekly_demand !== defaultCalculations.total_weekly_demand) {
        return defaultCalculations.total_weekly_demand;
      }
      return null;
    }

    // Unsaved local preview compares against latest saved dataset in list
    if (datasetList.length > 0) {
      return datasetList[0]?.total_demand ?? null;
    }
    return null;
  })();

  const leastSlot = (() => {
    if (!calc.timeslot_totals) return { label: "4 PM–6 PM", total_demand: 180 };
    const entries = Object.entries(calc.timeslot_totals) as [string, number][];
    if (entries.length === 0) return { label: "4 PM–6 PM", total_demand: 180 };
    const min = entries.reduce((prev, curr) => (Number(curr[1]) < Number(prev[1]) ? curr : prev));
    return { label: min[0], total_demand: Number(min[1]) };
  })();

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar onOpenUpload={() => setIsUploadOpen(true)} />

      {/* Main Page Area */}
      <main className="main-wrapper">
        <TopHeader onOpenUpload={() => setIsUploadOpen(true)} lastUpdated={formatAnalysisTime(activeMetadata.createdAt)} />

        <div className="dashboard-content animate-fade-in">
          {/* Active Dataset Identity Banner & Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#ffffff",
              padding: "12px 20px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: activeMetadata.source === "default" ? "#f1f5f9" : "#ffe4e6",
                  color: activeMetadata.source === "default" ? "#475569" : "#e11d48",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {activeMetadata.source === "default" ? <Database size={18} /> : <FileSpreadsheet size={18} />}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
                    {activeMetadata.name}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "2px", fontSize: "11px", color: "#64748b", flexWrap: "wrap" }}>
                  {activeMetadata.weekLabel && <span>Period: {activeMetadata.weekLabel}</span>}
                  <span>•</span>
                  <span>Analyzed: {formatAnalysisTime(activeMetadata.createdAt)}</span>
                  <span>•</span>
                  <span>Total Demand: <strong>{calc.total_weekly_demand.toLocaleString()}</strong> orders</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", fontSize: "11px", color: "#334155", flexWrap: "wrap" }}>
                  <span>Shop Status Check-in:</span>
                  <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                    Staff: <strong>{calc?.checkin_summary?.staff_present ?? dashboardData?.assumptions?.staff_count ?? 1} present</strong>
                  </span>
                  <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                    Printers: <strong>{calc?.checkin_summary?.printer_status_text || (dashboardData?.assumptions?.working_printers === "all" ? "All operational" : dashboardData?.assumptions?.working_printers || "Standard")}</strong>
                  </span>
                </div>
                {dashboardData?.default_checkin_note && (
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", padding: "4px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <AlertTriangle size={12} color="#d97706" />
                    <span>{dashboardData.default_checkin_note}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Dataset Selector Dropdown */}
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

          {/* Row 1: KPI Stats Cards */}
          <KpiCards
            totalDemand={calc.total_weekly_demand}
            averageDailyDemand={calc.average_daily_demand}
            peakTimeSlot={calc.peak_time_slot}
            topService={calc.top_service}
            previousWeekDemand={previousWeekDemand}
          />

          {/* Row 2: 3 Visual Charts */}
          <div className="charts-grid-3">
            <DemandByServiceChart
              totalDemand={calc.total_weekly_demand}
              serviceTotals={calc.service_totals}
              servicePercentages={calc.service_percentages}
            />
            <DemandByTimeSlotChart
              timeslotTotals={calc.timeslot_totals}
              durationAdjustedRates={calc.duration_adjusted_rates}
            />
            <WeeklyTrendChart dailyTotals={calc.daily_totals || []} />
          </div>

          {/* Row 3: Tables & Key Statistics */}
          <div className="tables-grid-3">
            <DemandMatrixTable
              weeklyMatrix={calc.weekly_matrix}
              timeslotTotals={calc.timeslot_totals}
            />
            <ServiceBreakdownTable
              totalDemand={calc.total_weekly_demand}
              serviceTotals={calc.service_totals}
              servicePercentages={calc.service_percentages}
            />
            <KeyStatisticsCard
              peakSlot={calc.peak_time_slot}
              topService={calc.top_service}
              leastSlot={leastSlot}
              estimatedPages={
                (calc.printer_metrics?.hp_laser_303dw?.estimated_pages || 0) +
                (calc.printer_metrics?.canon_pixma_g670?.estimated_pages || 0) +
                (calc.printer_metrics?.photocopying_standalone?.estimated_pages || 0)
              }
            />
          </div>

          {/* Row 4: Equipment Capacity & Labor Utilization */}
          <OperationalCapacityCards
            printerMetrics={calc.printer_metrics}
            staffMetrics={calc.staff_metrics}
          />

          {/* Row 5: Business Recommendations */}
          <InsightsRecommendations recommendations={calc.recommendations} />
        </div>
      </main>

      {/* Upload Modal Popup */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
