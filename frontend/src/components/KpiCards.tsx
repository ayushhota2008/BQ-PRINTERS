"use client";

import { BarChart2, Calendar, Clock, Printer, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { formatInteger } from "@/lib/format";

interface KpiCardsProps {
  totalDemand: number;
  averageDailyDemand: number;
  peakTimeSlot: {
    label: string;
    total_demand: number;
    rate_per_hour?: number;
  };
  topService: {
    name: string;
    total_demand: number;
    percentage: number;
  };
  previousWeekDemand?: number | null;
}

export default function KpiCards({
  totalDemand,
  averageDailyDemand,
  peakTimeSlot,
  topService,
  previousWeekDemand,
}: KpiCardsProps) {
  const hasComparison = typeof previousWeekDemand === "number" && previousWeekDemand > 0;
  const pctChange = hasComparison
    ? ((totalDemand - previousWeekDemand) / previousWeekDemand) * 100
    : null;

  const renderComparisonBadge = (isDailyAvg: boolean = false) => {
    // If no previous dataset in history, show truthful 7-day period label
    if (pctChange === null) {
      return (
        <span className="badge-neutral">
          <Calendar size={11} />
          {isDailyAvg ? "7-day average" : "7-day baseline"}
        </span>
      );
    }

    if (Math.abs(pctChange) < 0.05) {
      return (
        <span className="badge-neutral">
          <Minus size={12} />
          0% vs. previous week
        </span>
      );
    }

    if (pctChange > 0) {
      const formatted = Math.abs(pctChange) >= 10 ? pctChange.toFixed(0) : pctChange.toFixed(1);
      return (
        <span className="badge-growth">
          <ArrowUpRight size={12} />
          +{formatted}% vs. previous week
        </span>
      );
    }

    const formatted = Math.abs(pctChange) >= 10 ? Math.abs(pctChange).toFixed(0) : Math.abs(pctChange).toFixed(1);
    return (
      <span className="badge-decline">
        <ArrowDownRight size={12} />
        -{formatted}% vs. previous week
      </span>
    );
  };

  return (
    <div className="kpi-grid">
      {/* 1. Total Demand */}
      <div className="kpi-card">
        <div className="kpi-card-top">
          <span className="kpi-label">Total Demand (Weekly)</span>
          <div className="kpi-icon-wrapper">
            <BarChart2 size={20} />
          </div>
        </div>
        <div>
          <div className="kpi-value">{formatInteger(totalDemand)}</div>
          <div style={{ marginTop: "6px" }}>
            {renderComparisonBadge(false)}
          </div>
        </div>
      </div>

      {/* 2. Average Daily Demand */}
      <div className="kpi-card">
        <div className="kpi-card-top">
          <span className="kpi-label">Average Daily Demand</span>
          <div className="kpi-icon-wrapper">
            <Calendar size={20} />
          </div>
        </div>
        <div>
          <div className="kpi-value">
            {typeof averageDailyDemand === "number"
              ? averageDailyDemand.toFixed(2)
              : totalDemand
              ? (totalDemand / 7).toFixed(2)
              : "0.00"}
          </div>
          <div style={{ marginTop: "6px" }}>
            {renderComparisonBadge(true)}
          </div>
        </div>
      </div>

      {/* 3. Peak Time Slot */}
      <div className="kpi-card">
        <div className="kpi-card-top">
          <span className="kpi-label">Peak Time Slot</span>
          <div className="kpi-icon-wrapper">
            <Clock size={20} />
          </div>
        </div>
        <div>
          <div className="kpi-value" style={{ fontSize: "22px" }}>
            {peakTimeSlot?.label || "11 AM – 1 PM"}
          </div>
          <div className="kpi-subtext" style={{ marginTop: "6px" }}>
            ({peakTimeSlot?.total_demand ?? 0} requests)
          </div>
        </div>
      </div>

      {/* 4. Top Service */}
      <div className="kpi-card">
        <div className="kpi-card-top">
          <span className="kpi-label">Top Service</span>
          <div className="kpi-icon-wrapper">
            <Printer size={20} />
          </div>
        </div>
        <div>
          <div className="kpi-value" style={{ fontSize: "22px" }}>
            {topService?.name || "B&W Printing"}
          </div>
          <div className="kpi-subtext" style={{ marginTop: "6px" }}>
            {typeof topService?.percentage === "number"
              ? topService.percentage.toFixed(2)
              : "0.00"}
            % of total demand
          </div>
        </div>
      </div>
    </div>
  );
}
