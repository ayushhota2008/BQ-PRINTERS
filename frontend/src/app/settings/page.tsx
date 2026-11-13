"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import { Save, CheckCircle, RotateCcw } from "lucide-react";

export default function SettingsPage() {
  const [staffCount, setStaffCount] = useState(3);
  const [dailyHours, setDailyHours] = useState(9.0);
  const [hpPpm, setHpPpm] = useState(30.0);
  const [canonIpm, setCanonIpm] = useState(3.9);

  const [bwPages, setBwPages] = useState(4);
  const [colourPages, setColourPages] = useState(3);
  const [photoPages, setPhotoPages] = useState(5);

  const [bwTime, setBwTime] = useState(2.0);
  const [colourTime, setColourTime] = useState(4.0);
  const [bindTime, setBindTime] = useState(8.0);
  const [photoTime, setPhotoTime] = useState(2.0);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("bq_printers_assumptions");
      if (stored) {
        const p = JSON.parse(stored);
        queueMicrotask(() => {
          if (p.staff_count !== undefined) setStaffCount(p.staff_count);
          if (p.daily_operating_hours !== undefined) setDailyHours(p.daily_operating_hours);
          if (p.hp_rated_ppm !== undefined) setHpPpm(p.hp_rated_ppm);
          if (p.canon_rated_ipm !== undefined) setCanonIpm(p.canon_rated_ipm);
          if (p.pages_per_order) {
            if (p.pages_per_order.bw !== undefined) setBwPages(p.pages_per_order.bw);
            if (p.pages_per_order.colour !== undefined) setColourPages(p.pages_per_order.colour);
            if (p.pages_per_order.photocopying !== undefined) setPhotoPages(p.pages_per_order.photocopying);
          }
          if (p.handling_time_min) {
            if (p.handling_time_min.bw !== undefined) setBwTime(p.handling_time_min.bw);
            if (p.handling_time_min.colour !== undefined) setColourTime(p.handling_time_min.colour);
            if (p.handling_time_min.binding !== undefined) setBindTime(p.handling_time_min.binding);
            if (p.handling_time_min.photocopying !== undefined) setPhotoTime(p.handling_time_min.photocopying);
          }
        });
      }
    } catch {}
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const config = {
      staff_count: staffCount,
      daily_operating_hours: dailyHours,
      hp_rated_ppm: hpPpm,
      canon_rated_ipm: canonIpm,
      pages_per_order: { bw: bwPages, colour: colourPages, photocopying: photoPages, binding: 0 },
      handling_time_min: { bw: bwTime, colour: colourTime, binding: bindTime, photocopying: photoTime },
    };
    localStorage.setItem("bq_printers_assumptions", JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setStaffCount(3);
    setDailyHours(9.0);
    setHpPpm(30.0);
    setCanonIpm(3.9);
    setBwPages(4);
    setColourPages(3);
    setPhotoPages(5);
    setBwTime(2.0);
    setColourTime(4.0);
    setBindTime(8.0);
    setPhotoTime(2.0);
    localStorage.removeItem("bq_printers_assumptions");
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="app-container">
      <Sidebar />

      <main className="main-wrapper">
        <TopHeader />

        <div className="dashboard-content animate-fade-in" style={{ maxWidth: "1000px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
              Shop Assumptions &amp; Equipment Settings
            </h1>
            <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
              Configure printer manufacturer ratings, staff counts, and service handling standards used by the Python math engine.
            </p>
          </div>

          {saved && (
            <div
              style={{
                padding: "12px 16px",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "8px",
                color: "#065f46",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <CheckCircle size={16} color="#059669" />
              <span>Assumptions successfully saved! Future CSV uploads will use these parameters.</span>
            </div>
          )}

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Staff & Hours */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: "16px" }}>
                Staff Attendance &amp; Operating Hours
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Standard Staff Members Count (Baseline)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={staffCount}
                    onChange={(e) => setStaffCount(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Report standard: 3 staff members</span>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Daily Operating Hours (9 AM – 6 PM)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    value={dailyHours}
                    onChange={(e) => setDailyHours(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Report standard: 9 hours per day</span>
                </div>
              </div>
            </div>

            {/* Printer Rated Speeds */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: "16px" }}>
                Printer Equipment Manufacturer Specifications
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    HP Laser 303dw Rated Speed (Pages Per Minute)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={hpPpm}
                    onChange={(e) => setHpPpm(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>30 ppm = 1,800 pages/hour</span>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Canon PIXMA MegaTank G670 (Images Per Minute)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={canonIpm}
                    onChange={(e) => setCanonIpm(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>3.9 ipm = 234 images/hour</span>
                </div>
              </div>
            </div>

            {/* Pages Per Order */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: "16px" }}>
                Estimated Pages Per Customer Order (Planning Assumptions)
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    B&amp;W Printing
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bwPages}
                    onChange={(e) => setBwPages(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Report baseline: 4 pages</span>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Colour Printing
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={colourPages}
                    onChange={(e) => setColourPages(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Report baseline: 3 pages</span>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Photocopying
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={photoPages}
                    onChange={(e) => setPhotoPages(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Report baseline: 5 pages</span>
                </div>
              </div>
            </div>

            {/* Handling times */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: "16px" }}>
                Staff Handling Times (Minutes Per Order)
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    B&amp;W Printing
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={bwTime}
                    onChange={(e) => setBwTime(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>2 minutes</span>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Colour Printing
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={colourTime}
                    onChange={(e) => setColourTime(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>4 minutes</span>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Binding
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={bindTime}
                    onChange={(e) => setBindTime(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>8 minutes</span>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Photocopying
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={photoTime}
                    onChange={(e) => setPhotoTime(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>2 minutes</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button type="button" onClick={handleReset} className="btn-secondary">
                <RotateCcw size={14} />
                <span>Reset to Report Defaults</span>
              </button>
              <button type="submit" className="btn-primary">
                <Save size={16} />
                <span>Save Operational Assumptions</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
