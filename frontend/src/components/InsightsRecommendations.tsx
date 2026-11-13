"use client";

import { Lightbulb } from "lucide-react";

interface Recommendation {
  id: number;
  title: string;
  description: string;
  category?: string;
  priority?: string;
}

interface InsightsRecommendationsProps {
  recommendations: Recommendation[];
}

export default function InsightsRecommendations({
  recommendations,
}: InsightsRecommendationsProps) {
  const displayRecs = recommendations.length > 0 ? recommendations : [
    {
      id: 1,
      title: "Stock More B&W Paper & Ink",
      description: "B&W Printing accounts for 49.04% of total demand. Ensure adequate stock of B&W paper and ink, especially before peak hours (11 AM – 1 PM).",
    },
    {
      id: 2,
      title: "Plan Staff for Midday Rush",
      description: "The busiest time slot is 11 AM – 1 PM. Schedule extra staff and keep printers ready during this period.",
    },
    {
      id: 3,
      title: "Prepare for Colour Printing Growth",
      description: "Colour Printing demand is 18.75%. Consider increasing colour paper stock and checking ink levels regularly.",
    },
    {
      id: 4,
      title: "Optimize Resources",
      description: "Binding and Photocopying have lower demand. You can adjust staff and machine usage to save costs during off-peak hours.",
    },
  ];

  return (
    <div className="insights-card">
      <div className="insights-header">
        <Lightbulb size={20} color="#e11d48" />
        <span>Insights & Recommendations</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {displayRecs.slice(0, 4).map((rec) => (
          <div key={rec.id} className="insight-item">
            <div className="insight-number">{rec.id}</div>
            <div className="insight-content">
              <h4>{rec.title}</h4>
              <p>{rec.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
