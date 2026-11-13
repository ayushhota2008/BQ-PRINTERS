"use client";

import { Printer, Users, CheckCircle, AlertTriangle } from "lucide-react";
import { formatInteger } from "@/lib/format";

interface PrinterMetrics {
  hp_laser_303dw: {
    model_name: string;
    rated_ppm: number;
    weekly_capacity: number;
    estimated_pages: number;
    load_ratio_percent: number;
    status: string;
  };
  canon_pixma_g670: {
    model_name: string;
    rated_ipm: number;
    weekly_capacity: number;
    estimated_pages: number;
    load_ratio_percent: number;
    status: string;
  };
  photocopying_standalone?: {
    estimated_pages: number;
    weekly_orders: number;
  };
}

interface StaffMetrics {
  scheduled_availability_weekly_hours: number;
  actual_available_weekly_hours: number;
  total_workload_hours: number;
  total_workload_minutes: number;
  weekly_utilization_percent: number;
  daily_breakdown: Array<{
    day_name: string;
    staff_present: number;
    operating_hours: number;
    workload_hours: number;
    utilization_percent: number;
    is_overloaded: boolean;
  }>;
}

interface OperationalCardsProps {
  printerMetrics?: PrinterMetrics;
  staffMetrics?: StaffMetrics;
}

export default function OperationalCapacityCards({
  printerMetrics,
  staffMetrics,
}: OperationalCardsProps) {
  const hp = printerMetrics?.hp_laser_303dw || {
    model_name: "HP Laser 303dw",
    rated_ppm: 30,
    weekly_capacity: 113400,
    estimated_pages: 3672,
    load_ratio_percent: 3.24,
    status: "Optimal",
  };

  const canon = printerMetrics?.canon_pixma_g670 || {
    model_name: "Canon PIXMA MegaTank G670",
    rated_ipm: 3.9,
    weekly_capacity: 14742,
    estimated_pages: 957,
    load_ratio_percent: 6.49,
    status: "Optimal",
  };

  const staff = staffMetrics || {
    scheduled_availability_weekly_hours: 189,
    actual_available_weekly_hours: 189,
    total_workload_hours: 82.67,
    total_workload_minutes: 4960,
    weekly_utilization_percent: 43.74,
    daily_breakdown: [],
  };

  const isHpBroken = hp.weekly_capacity === 0 || hp.status?.toLowerCase().includes("out of service");
  const isCanonBroken = canon.weekly_capacity === 0 || canon.status?.toLowerCase().includes("out of service");
  const hasZeroStaff = (staff.actual_available_weekly_hours ?? 0) === 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
      {/* Printer Capacity Evaluation */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Printer size={18} color="#e11d48" />
            Printer Capacity & Equipment Load
          </h3>
          {isHpBroken && isCanonBroken ? (
            <span className="badge-tag" style={{ background: "#fef2f2", color: "#dc2626" }}>
              <AlertTriangle size={12} />
              Neither Printer Working
            </span>
          ) : isHpBroken || isCanonBroken ? (
            <span className="badge-tag" style={{ background: "#fffbeb", color: "#d97706" }}>
              <AlertTriangle size={12} />
              Operating on 1 Printer Only
            </span>
          ) : (
            <span className="badge-tag" style={{ background: "#ecfdf5", color: "#059669" }}>
              <CheckCircle size={12} />
              Rated Capacity Sufficient
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* HP Laser 303dw */}
          <div style={{ padding: "12px", border: isHpBroken ? "1px solid #fecdd3" : "1px solid #f1f5f9", borderRadius: "8px", background: isHpBroken ? "#fff1f2" : "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <div>
                <strong style={{ fontSize: "13px", color: "#0f172a" }}>{hp.model_name}</strong>
                <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "8px" }}>
                  {isHpBroken ? "(Broken / Out of Service)" : `(B&W Printing @ ${hp.rated_ppm} ppm)`}
                </span>
              </div>
              <span style={{ fontSize: "12px", fontWeight: "700", color: isHpBroken ? "#dc2626" : "#e11d48" }}>
                {isHpBroken ? "Out of Service" : `${(hp.load_ratio_percent ?? 0).toFixed(2)}% Load`}
              </span>
            </div>
            <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "9999px", overflow: "hidden" }}>
              <div style={{ width: isHpBroken ? "100%" : `${Math.max(4, hp.load_ratio_percent ?? 0)}%`, height: "100%", background: isHpBroken ? "#dc2626" : "#e11d48", borderRadius: "9999px" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              <span>Est. Demand: <strong>{formatInteger(hp.estimated_pages)} pages</strong></span>
              <span>Capacity: <strong>{isHpBroken ? "0 pages/wk" : `${formatInteger(hp.weekly_capacity)} pages/wk`}</strong></span>
            </div>
          </div>

          {/* Canon PIXMA MegaTank G670 */}
          <div style={{ padding: "12px", border: isCanonBroken ? "1px solid #fecdd3" : "1px solid #f1f5f9", borderRadius: "8px", background: isCanonBroken ? "#fff1f2" : "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <div>
                <strong style={{ fontSize: "13px", color: "#0f172a" }}>{canon.model_name}</strong>
                <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "8px" }}>
                  {isCanonBroken ? "(Broken / Out of Service)" : `(Colour Printing @ ${canon.rated_ipm} ipm)`}
                </span>
              </div>
              <span style={{ fontSize: "12px", fontWeight: "700", color: isCanonBroken ? "#dc2626" : "#0f172a" }}>
                {isCanonBroken ? "Out of Service" : `${(canon.load_ratio_percent ?? 0).toFixed(2)}% Load`}
              </span>
            </div>
            <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "9999px", overflow: "hidden" }}>
              <div style={{ width: isCanonBroken ? "100%" : `${Math.max(4, canon.load_ratio_percent ?? 0)}%`, height: "100%", background: isCanonBroken ? "#dc2626" : "#0f172a", borderRadius: "9999px" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              <span>Est. Demand: <strong>{formatInteger(canon.estimated_pages)} images</strong></span>
              <span>Capacity: <strong>{isCanonBroken ? "0 images/wk" : `${formatInteger(canon.weekly_capacity)} images/wk`}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Availability & Utilization */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Users size={18} color="#e11d48" />
            Staff Availability & Workload Ratio
          </h3>
          <span
            className="badge-tag"
            style={{
              background: hasZeroStaff ? "#fffbeb" : (staff.weekly_utilization_percent > 100 ? "#fef2f2" : "#eff6ff"),
              color: hasZeroStaff ? "#d97706" : (staff.weekly_utilization_percent > 100 ? "#dc2626" : "#2563eb"),
            }}
          >
            {hasZeroStaff ? "0 Staff Present" : `${(staff.weekly_utilization_percent ?? 0).toFixed(1)}% Utilization`}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {hasZeroStaff && (
            <div style={{ padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", color: "#b45309", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertTriangle size={14} color="#d97706" />
              <span>No staff present today. Utilization can&apos;t be calculated; capacity is treated as 0.</span>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", textAlign: "center" }}>
            <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Scheduled Hours</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
                {staff.actual_available_weekly_hours ?? 0} hrs
              </div>
            </div>
            <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Order Handling</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
                {(staff.total_workload_hours ?? 0).toFixed(1)} hrs
              </div>
            </div>
            <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Workload Minutes</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#e11d48", marginTop: "2px" }}>
                {formatInteger(staff.total_workload_minutes)} min
              </div>
            </div>
          </div>

          <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.4" }}>
            Staff capacity = staff present × daily operating hours. Workload uses standard handling times: 2 min (B&W &amp; Photocopying), 4 min (Colour), 8 min (Binding).
          </div>
        </div>
      </div>
    </div>
  );
}
