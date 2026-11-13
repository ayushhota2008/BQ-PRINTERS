"use client";

interface DemandByTimeSlotChartProps {
  timeslotTotals: Record<string, number>;
  durationAdjustedRates: Record<string, number>;
}

export default function DemandByTimeSlotChart({
  timeslotTotals,
  durationAdjustedRates,
}: DemandByTimeSlotChartProps) {
  const slots = [
    { label: "9 AM – 11 AM", key: "9 AM–11 AM", fallback: "9 AM - 11 AM" },
    { label: "11 AM – 1 PM", key: "11 AM–1 PM", fallback: "11 AM - 1 PM" },
    { label: "1 PM – 4 PM", key: "1 PM–4 PM", fallback: "1 PM - 4 PM" },
    { label: "4 PM – 6 PM", key: "4 PM–6 PM", fallback: "4 PM - 6 PM" },
  ];

  const maxVal = 800;

  return (
    <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="card-header">
        <h3 className="card-title">Demand by Time Slot</h3>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        {/* Bars Container */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: "170px", paddingBottom: "10px", borderBottom: "1px solid #e2e8f0" }}>
          {slots.map((s) => {
            const count = timeslotTotals[s.key] ?? timeslotTotals[s.fallback] ?? 0;
            const rate = durationAdjustedRates[s.key] ?? durationAdjustedRates[s.fallback] ?? 0;
            const barHeightPct = Math.min(100, Math.max(10, (count / maxVal) * 100));

            return (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "56px",
                  height: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>
                  {count}
                </span>
                <div
                  style={{
                    width: "36px",
                    height: `${barHeightPct}%`,
                    backgroundColor: "#e11d48",
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.4s ease",
                  }}
                  title={`${s.label}: ${count} total requests (${rate} req/hr duration-adjusted)`}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div style={{ display: "flex", justifyContent: "space-around", paddingTop: "8px" }}>
          {slots.map((s) => (
            <span key={s.label} style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", width: "56px", textAlign: "center" }}>
              {s.label}
            </span>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "6px", fontSize: "11px", color: "#94a3b8" }}>
          Time Slot (Hover for hourly rate)
        </div>
      </div>
    </div>
  );
}
