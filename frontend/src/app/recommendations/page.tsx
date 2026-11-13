"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import InsightsRecommendations from "@/components/InsightsRecommendations";
import { Database } from "lucide-react";
import { listSavedDatasets, getDatasetById } from "@/lib/api";

const defaultRecs = [
  {
    id: 1,
    title: "Stock More B&W Paper & Ink",
    description:
      "B&W Printing accounts for 49.89% of total demand. Ensure adequate stock of B&W paper and ink, especially before peak hours (11 AM – 1 PM).",
    category: "Inventory",
    priority: "High" as const,
  },
  {
    id: 2,
    title: "Plan Staff for Midday Rush",
    description:
      "The busiest time slot is 11 AM – 1 PM with a peak rate of 52.0 orders/hr. Schedule extra staff and keep high-speed printers pre-warmed during this period.",
    category: "Staffing",
    priority: "High" as const,
  },
  {
    id: 3,
    title: "Prepare for Colour Printing Growth",
    description:
      "Colour Printing represents 17.34% of volume but higher margin. Ensure Canon PIXMA MegaTank G670 ink tanks are regularly replenished.",
    category: "Operations",
    priority: "Medium" as const,
  },
  {
    id: 4,
    title: "Batch Low-Priority Binding in Afternoon",
    description:
      "Binding demand accounts for 5.82% of requests. Batch heavy spiral/comb binding during the 4 PM – 6 PM lull (12.86 orders/hr) to avoid operator bottlenecks.",
    category: "Workload",
    priority: "Low" as const,
  },
  {
    id: 5,
    title: "Footfall-Driven Cross-Service Marketing",
    description:
      "Principal Component Analysis shows 94.47% variance explained by a single dominant factor with positive loadings across all four services, confirming all services rise and fall together with general customer footfall.",
    category: "Marketing",
    priority: "Medium" as const,
  },
];

function RecommendationsContent() {
  const searchParams = useSearchParams();
  const urlDatasetId = searchParams ? searchParams.get("datasetId") : null;

  const [recommendations, setRecommendations] = useState<any[]>(defaultRecs);
  const [datasetList, setDatasetList] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [activeMetadata, setActiveMetadata] = useState<{
    name: string;
    weekLabel: string;
  }>({
    name: "Academic Benchmark Dataset",
    weekLabel: "Week 1 (Report)",
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

        if (targetId && storedData && (storedData.dataset_id === targetId || targetId === "local-preview-id")) {
          setSelectedDatasetId(targetId);
          if (storedData.calculations?.recommendations?.length) {
            setRecommendations(storedData.calculations.recommendations);
          }
          setActiveMetadata({
            name: storedData.dataset_name || "Uploaded Dataset",
            weekLabel: storedData.week_label || "Analyzed Week",
          });
          return;
        }

        if (targetId && datasets.some((d: any) => d.id === targetId)) {
          setSelectedDatasetId(targetId);
          const details = await getDatasetById(targetId);
          if (details?.calculations?.recommendations?.length) {
            setRecommendations(details.calculations.recommendations);
            setActiveMetadata({
              name: details.dataset?.dataset_name || "Saved Dataset",
              weekLabel: details.dataset?.week_label || "",
            });
            return;
          }
        }

        if (storedData && storedData.calculations?.recommendations?.length) {
          setSelectedDatasetId(storedData.dataset_id || "");
          setRecommendations(storedData.calculations.recommendations);
          setActiveMetadata({
            name: storedData.dataset_name || "Uploaded Dataset",
            weekLabel: storedData.week_label || "Analyzed Week",
          });
        }
      } catch (err) {
        console.error("Failed to load recommendations:", err);
      }
    }
    loadData();
  }, [urlDatasetId]);

  const handleSelectDataset = async (datasetId: string) => {
    setSelectedDatasetId(datasetId);
    if (!datasetId) {
      setRecommendations(defaultRecs);
      setActiveMetadata({
        name: "Academic Benchmark Dataset",
        weekLabel: "Week 1 (Report)",
      });
      return;
    }

    try {
      const details = await getDatasetById(datasetId);
      if (details?.calculations?.recommendations?.length) {
        setRecommendations(details.calculations.recommendations);
        setActiveMetadata({
          name: details.dataset?.dataset_name || "Selected Dataset",
          weekLabel: details.dataset?.week_label || "",
        });
      }
    } catch (err) {
      console.error("Failed to switch dataset:", err);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-wrapper">
        <TopHeader lastUpdated="Today" />
        <div style={{ padding: "28px 36px 60px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
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
                  Active Dataset Recommendations
                </span>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                  {activeMetadata.name} {activeMetadata.weekLabel ? `(${activeMetadata.weekLabel})` : ""}
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

          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
              Actionable Business Recommendations
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
              Synthesized from your 7-day demand matrix, time slot arrival rates, and machine capacity ratios.
            </p>
          </div>
          <InsightsRecommendations recommendations={recommendations} />
        </div>
      </main>
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "30px", textAlign: "center" }}>Loading Recommendations...</div>}>
      <RecommendationsContent />
    </Suspense>
  );
}
