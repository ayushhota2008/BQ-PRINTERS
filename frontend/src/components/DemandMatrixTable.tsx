"use client";

interface DemandMatrixTableProps {
  weeklyMatrix: number[][];
  timeslotTotals: Record<string, number>;
}

export default function DemandMatrixTable({
  weeklyMatrix,
  timeslotTotals,
}: DemandMatrixTableProps) {
  const serviceRows = ["B&W Printing", "Colour Printing", "Binding", "Photocopying"];
  const colLabels = ["9 AM – 11 AM", "11 AM – 1 PM", "1 PM – 4 PM", "4 PM – 6 PM"];
  const colKeys = ["9 AM–11 AM", "11 AM–1 PM", "1 PM–4 PM", "4 PM–6 PM"];

  const totals = colKeys.map(
    (k) => timeslotTotals[k] ?? timeslotTotals[k.replace("–", " - ")] ?? 0
  );

  return (
    <div className="card" style={{ height: "100%" }}>
      <div className="card-header">
        <h3 className="card-title">Demand (Weekly)</h3>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              {colLabels.map((l) => (
                <th key={l} style={{ textAlign: "center" }}>
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {serviceRows.map((sName, rIdx) => {
              const rowValues = weeklyMatrix[rIdx] || [0, 0, 0, 0];
              return (
                <tr key={sName}>
                  <td style={{ fontWeight: "600" }}>{sName}</td>
                  {rowValues.map((val, cIdx) => (
                    <td key={cIdx} style={{ textAlign: "center" }}>
                      {val}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="total-row">
              <td style={{ fontWeight: "700" }}>Total</td>
              {totals.map((tot, idx) => (
                <td key={idx} style={{ textAlign: "center", fontWeight: "700" }}>
                  {tot}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
