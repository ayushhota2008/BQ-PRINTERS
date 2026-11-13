"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  FileText,
  X,
  Users,
  Wrench,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";
import { analyzeCsvFile, fetchSampleCsv, previewUploadedFile, PreviewResponse } from "@/lib/api";
import { ACADEMIC_SAMPLE_CSV, SHOP_CHECKIN_CONFIG } from "@/lib/constants";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [datasetName, setDatasetName] = useState("Weekly Demand Dataset");
  const [weekLabel, setWeekLabel] = useState("Oct 24 – Oct 30, 2026");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [validationError, setValidationError] = useState<{
    code?: string;
    message: string;
    details?: Array<{ row?: number; column?: string; problem?: string }>;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Shop Status Check-in state
  const [checkinDate, setCheckinDate] = useState<string>("2026-11-13");
  const [staffPresentInput, setStaffPresentInput] = useState<string>("1");
  const [hasPrinterIssue, setHasPrinterIssue] = useState<boolean>(false);
  const [selectedWorkingPrinter, setSelectedWorkingPrinter] = useState<string>("all");

  // Set today's date on client mount to avoid static prerendering mismatch
  useEffect(() => {
    try {
      const today = new Date().toISOString().split("T")[0];
      queueMicrotask(() => setCheckinDate(today));
    } catch {}
  }, []);

  // Validation
  const trimmedStaff = staffPresentInput.trim();
  const parsedStaff = parseInt(trimmedStaff, 10);
  const isStaffValid =
    trimmedStaff !== "" &&
    !isNaN(parsedStaff) &&
    Number.isInteger(Number(trimmedStaff)) &&
    !trimmedStaff.includes(".") &&
    parsedStaff >= 0 &&
    parsedStaff <= SHOP_CHECKIN_CONFIG.max_staff_count;

  const isPrinterSelectionValid =
    !hasPrinterIssue || ["hp_only", "canon_only", "none"].includes(selectedWorkingPrinter);

  const isCheckinValid = Boolean(checkinDate && isStaffValid && isPrinterSelectionValid);

  let checkinValidationMsg: string | null = null;
  if (!checkinDate) {
    checkinValidationMsg = "Please choose a date for this check-in.";
  } else if (trimmedStaff === "") {
    checkinValidationMsg = "Please enter the number of staff members present.";
  } else if (isNaN(parsedStaff) || trimmedStaff.includes(".") || !Number.isInteger(Number(trimmedStaff))) {
    checkinValidationMsg = "Staff count must be a whole number (no decimals or text).";
  } else if (parsedStaff < 0) {
    checkinValidationMsg = "Staff members present cannot be negative.";
  } else if (parsedStaff > SHOP_CHECKIN_CONFIG.max_staff_count) {
    checkinValidationMsg = `Staff members present cannot exceed ${SHOP_CHECKIN_CONFIG.max_staff_count}.`;
  } else if (hasPrinterIssue && !["hp_only", "canon_only", "none"].includes(selectedWorkingPrinter)) {
    checkinValidationMsg = "Please choose which printer can still be used.";
  }

  // Summary text
  let printerSummaryPart = "all printers operational";
  if (hasPrinterIssue) {
    if (selectedWorkingPrinter === "hp_only") {
      printerSummaryPart = "using Printer 1 only";
    } else if (selectedWorkingPrinter === "canon_only") {
      printerSummaryPart = "using Printer 2 only";
    } else if (selectedWorkingPrinter === "none") {
      printerSummaryPart = "neither printer is working (Capacity: 0)";
    }
  }
  const checkinSummary = isStaffValid
    ? `Today: ${parsedStaff} staff, ${printerSummaryPart}.`
    : "Please complete valid check-in inputs.";

  // Trigger shared backend preview with abort protection
  const triggerPreview = async (selectedFile: File) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setPreviewLoading(true);
    setValidationError(null);
    setPreviewData(null);
    setError(null);

    try {
      const res = await previewUploadedFile(selectedFile, undefined, controller.signal);
      setPreviewData(res);
      setValidationError(null);
    } catch (err: any) {
      if (err.name === "AbortError") {
        return;
      }
      setPreviewData(null);
      setValidationError({
        code: err.error_code || "VALIDATION_ERROR",
        message: err.message || "Failed to validate uploaded file.",
        details: err.details || [],
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (!isCheckinValid) {
      setError(checkinValidationMsg || "Please complete the Shop Status Check-in above before uploading data.");
      return;
    }

    const ext = selectedFile.name.toLowerCase();
    if (!ext.endsWith(".csv") && !ext.endsWith(".xlsx")) {
      setError(`Unsupported file format for '${selectedFile.name}'. Only .csv and .xlsx files are supported.`);
      setFile(null);
      setPreviewData(null);
      setValidationError(null);
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError(`File size (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed size of 5 MB.`);
      setFile(null);
      setPreviewData(null);
      setValidationError(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(null);

    const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
    if (datasetName === "Weekly Demand Dataset" || !datasetName.trim()) {
      setDatasetName(baseName);
    }

    triggerPreview(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      validateAndSetFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!isCheckinValid) {
      setError(checkinValidationMsg || "Please complete the Shop Status Check-in above before uploading data.");
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 1) {
      setError("Please upload a single file (.csv or .xlsx).");
      return;
    }

    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      validateAndSetFile(dropped);
    }
  };

  const handleLoadSample = async () => {
    if (!isCheckinValid) {
      setError(checkinValidationMsg || "Please complete the Shop Status Check-in above before loading sample data.");
      return;
    }
    setSampleLoading(true);
    setError(null);
    try {
      let csvContent = "";
      try {
        csvContent = await fetchSampleCsv();
      } catch {
        csvContent = ACADEMIC_SAMPLE_CSV;
      }
      const sampleBlob = new File([csvContent], "academic_benchmark_dataset.csv", {
        type: "text/csv",
      });
      setDatasetName("Academic Benchmark Dataset (7 Days)");
      setWeekLabel("Week 1 (Academic Report Benchmark)");
      validateAndSetFile(sampleBlob);
      setSuccess("Academic report benchmark sample loaded (28 records, 7 days).");
    } catch {
      const sampleBlob = new File([ACADEMIC_SAMPLE_CSV], "academic_benchmark_dataset.csv", {
        type: "text/csv",
      });
      validateAndSetFile(sampleBlob);
      setSuccess("Academic benchmark CSV loaded.");
    } finally {
      setSampleLoading(false);
    }
  };

  const handleClear = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setFile(null);
    setPreviewData(null);
    setValidationError(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isCheckinValid) {
      setError(checkinValidationMsg || "Please complete the Shop Status Check-in above before analyzing.");
      return;
    }

    if (!file) {
      setError("Please choose a CSV or XLSX file to continue.");
      return;
    }

    if (validationError || !previewData?.ok) {
      setError("Cannot submit file with validation errors. Please resolve the issues before analyzing.");
      return;
    }

    setLoading(true);
    try {
      let assumptionsPayload: any = { notes };
      try {
        const stored = localStorage.getItem("bq_printers_assumptions");
        if (stored) {
          assumptionsPayload = { ...JSON.parse(stored), notes };
        }
      } catch {}

      const checkinPayload = {
        checkin_date: checkinDate,
        staff_present: parsedStaff,
        printer_issue: hasPrinterIssue,
        working_printers: hasPrinterIssue ? selectedWorkingPrinter : "all"
      };

      const res = await analyzeCsvFile(
        file,
        datasetName,
        weekLabel,
        true, // saveToSupabase
        assumptionsPayload,
        undefined,
        notes,
        checkinPayload
      );

      // Save active dataset to localStorage so results page immediately receives it
      if (typeof window !== "undefined") {
        localStorage.setItem("bq_printers_active_dataset_id", res.dataset_id);
        localStorage.setItem("bq_printers_active_dataset_data", JSON.stringify(res));
        localStorage.setItem("bq_printers_last_checkin", JSON.stringify(checkinPayload));
      }

      setSuccess("Dataset analyzed and stored in Supabase PostgreSQL successfully! Redirecting to dashboard...");
      setTimeout(() => {
        router.push(`/dashboard?datasetId=${encodeURIComponent(res.dataset_id)}`);
      }, 800);
    } catch (err: any) {
      setError(err.message || "Failed to analyze file. Please verify column headers and structure.");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled =
    loading || previewLoading || !file || !!validationError || !previewData?.ok || !isCheckinValid;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Page Area */}
      <main className="main-wrapper" style={{ position: "relative" }}>
        <TopHeader lastUpdated="Today" />

        <div style={{ padding: "28px 36px 60px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
          {/* Subheader description */}
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>
            Upload your 7-day CSV or Excel (.xlsx) file to run matrix calculations, covariance analysis, printer capacity, and business recommendations.
          </p>

          {/* Form Card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "36px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
            }}
          >
            {error && (
              <div
                style={{
                  padding: "14px 16px",
                  background: "#fef2f2",
                  border: "1px solid #fecdd3",
                  borderRadius: "10px",
                  color: "#991b1b",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "24px",
                }}
              >
                <AlertCircle size={18} color="#dc2626" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: "14px 16px",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "10px",
                  color: "#065f46",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "24px",
                }}
              >
                <CheckCircle size={18} color="#059669" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              {/* Row 1: Dataset Name and Observation Period */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#0f172a",
                      marginBottom: "8px",
                    }}
                  >
                    Dataset Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="Weekly Demand Dataset"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      color: "#0f172a",
                      outline: "none",
                      background: "#ffffff",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#0f172a",
                      marginBottom: "8px",
                    }}
                  >
                    Observation Period *
                  </label>
                  <input
                    type="text"
                    required
                    value={weekLabel}
                    onChange={(e) => setWeekLabel(e.target.value)}
                    placeholder="Oct 24 – Oct 30, 2026"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      color: "#0f172a",
                      outline: "none",
                      background: "#ffffff",
                    }}
                  />
                </div>
              </div>

              {/* Section 1B: Shop Status Check-in */}
              <div
                style={{
                  background: "#f8fafc",
                  border: isCheckinValid ? "1px solid #cbd5e1" : "1px solid #fecdd3",
                  borderRadius: "14px",
                  padding: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Users size={18} color="#e11d48" />
                      <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                        Shop Status Check-in
                      </h3>
                    </div>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", margin: 0 }}>
                      Enter today&apos;s active staffing and printer status before uploading data. All capacity calculations will adjust to this check-in.
                    </p>
                  </div>
                  {isCheckinValid && (
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#059669",
                        background: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        borderRadius: "20px",
                        padding: "4px 12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <CheckCircle size={14} /> Completed
                    </span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  {/* Field 1: Check-in Date */}
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                      Date this status applies to *
                    </label>
                    <input
                      type="date"
                      value={checkinDate}
                      onChange={(e) => setCheckinDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        color: "#0f172a",
                        background: "#ffffff",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Field 2: Staff members present today */}
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                      Staff members present today * (0 – {SHOP_CHECKIN_CONFIG.max_staff_count})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={SHOP_CHECKIN_CONFIG.max_staff_count}
                      step={1}
                      value={staffPresentInput}
                      onChange={(e) => setStaffPresentInput(e.target.value)}
                      placeholder="e.g. 1"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: isStaffValid ? "1px solid #cbd5e1" : "1px solid #f87171",
                        fontSize: "13px",
                        color: "#0f172a",
                        background: "#ffffff",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* 0 Staff Warning Alert */}
                {parsedStaff === 0 && isStaffValid && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "10px 14px",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "8px",
                      color: "#b45309",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AlertTriangle size={16} color="#d97706" />
                    <span>No staff present. Utilization can&apos;t be calculated; capacity is treated as 0.</span>
                  </div>
                )}

                {/* Field 3: Printer Issue Toggle */}
                <div style={{ marginTop: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "8px" }}>
                    Is there any printer issue today? *
                  </label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setHasPrinterIssue(false);
                        setSelectedWorkingPrinter("all");
                      }}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: !hasPrinterIssue ? "2px solid #059669" : "1px solid #cbd5e1",
                        background: !hasPrinterIssue ? "#ecfdf5" : "#ffffff",
                        color: !hasPrinterIssue ? "#065f46" : "#475569",
                        fontSize: "13px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <CheckCircle size={15} color={!hasPrinterIssue ? "#059669" : "#94a3b8"} />
                      No (All printers working)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setHasPrinterIssue(true);
                        if (selectedWorkingPrinter === "all") {
                          setSelectedWorkingPrinter("hp_only");
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: hasPrinterIssue ? "2px solid #e11d48" : "1px solid #cbd5e1",
                        background: hasPrinterIssue ? "#fff1f2" : "#ffffff",
                        color: hasPrinterIssue ? "#9f1239" : "#475569",
                        fontSize: "13px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Wrench size={15} color={hasPrinterIssue ? "#e11d48" : "#94a3b8"} />
                      Yes (Printer issue reported)
                    </button>
                  </div>
                </div>

                {/* Sub-question: Which printer can still be used? */}
                {hasPrinterIssue && (
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "16px",
                      background: "#ffffff",
                      border: "1px solid #fecdd3",
                      borderRadius: "10px",
                    }}
                  >
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#9f1239", marginBottom: "8px" }}>
                      Which printer can still be used? *
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {SHOP_CHECKIN_CONFIG.printers.map((p) => {
                        const isSelected = selectedWorkingPrinter === p.id;
                        return (
                          <label
                            key={p.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "10px 14px",
                              borderRadius: "8px",
                              border: isSelected ? "1.5px solid #e11d48" : "1px solid #e2e8f0",
                              background: isSelected ? "#fff1f2" : "#f8fafc",
                              cursor: "pointer",
                              fontSize: "13px",
                              color: "#0f172a",
                              fontWeight: isSelected ? "700" : "500",
                              transition: "all 0.15s",
                            }}
                          >
                            <input
                              type="radio"
                              name="working_printer_choice"
                              value={p.id}
                              checked={isSelected}
                              onChange={() => setSelectedWorkingPrinter(p.id)}
                              style={{ accentColor: "#e11d48" }}
                            />
                            <div style={{ flex: 1 }}>
                              <span>{p.label}</span>
                              <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "8px" }}>
                                ({p.service} • {p.speed})
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {selectedWorkingPrinter === "none" && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "8px 12px",
                          background: "#fef2f2",
                          border: "1px solid #fecdd3",
                          borderRadius: "6px",
                          color: "#991b1b",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <ShieldAlert size={15} color="#dc2626" />
                        <span>Total printer capacity is 0. All printing orders will be unfulfillable.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Validation Error Message */}
                {checkinValidationMsg && (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "8px 12px",
                      background: "#fef2f2",
                      border: "1px solid #fecdd3",
                      borderRadius: "8px",
                      color: "#991b1b",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AlertCircle size={15} color="#dc2626" />
                    <span>{checkinValidationMsg}</span>
                  </div>
                )}

                {/* Check-in Summary */}
                {isCheckinValid && (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "10px 14px",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "8px",
                      color: "#166534",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle size={16} color="#16a34a" />
                      <span>
                        <strong>Summary:</strong> {checkinSummary}
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#15803d" }}>✓ Upload unlocked</span>
                  </div>
                )}

                {/* Overwrite Confirmation Notice */}
                <div style={{ marginTop: "12px", fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                  <HelpCircle size={13} color="#94a3b8" />
                  <span>Submitting a check-in for an existing date will update that date&apos;s record and preserve past days in history.</span>
                </div>
              </div>

              {/* Section 2: File Upload with Load Sample button */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <label style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                    Demand Dataset (.csv or .xlsx) *
                  </label>

                  <button
                    type="button"
                    onClick={handleLoadSample}
                    disabled={sampleLoading || previewLoading}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "1px solid #fecdd3",
                      background: "#fff1f2",
                      color: "#e11d48",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <FileSpreadsheet size={15} color="#e11d48" />
                    <span>{sampleLoading ? "Loading..." : "Load Academic Report Sample CSV"}</span>
                  </button>
                </div>

                {/* Upload Box (Dashed Container) */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (isCheckinValid) setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${!isCheckinValid ? "#cbd5e1" : isDragOver ? "#e11d48" : "#e2e8f0"}`,
                    borderRadius: "14px",
                    background: !isCheckinValid ? "#f8fafc" : isDragOver ? "#fff1f2" : "#f8fafc",
                    padding: "36px 20px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                    opacity: isCheckinValid ? 1 : 0.65,
                    cursor: isCheckinValid ? "default" : "not-allowed",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: "#ffe4e6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#e11d48",
                      marginBottom: "14px",
                    }}
                  >
                    <UploadCloud size={24} />
                  </div>

                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                    Drag &amp; drop your CSV or Excel (.xlsx) file here, or browse
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "18px" }}>
                    Columns required: Day, Service, 9 AM–11 AM, 11 AM–1 PM, 1 PM–4 PM, 4 PM–6 PM (Max 5 MB)
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
                    <button
                      type="button"
                      disabled={!isCheckinValid}
                      onClick={() => {
                        if (isCheckinValid) fileInputRef.current?.click();
                      }}
                      style={{
                        padding: "9px 20px",
                        borderRadius: "8px",
                        background: isCheckinValid ? "#e11d48" : "#94a3b8",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: "700",
                        border: "none",
                        cursor: isCheckinValid ? "pointer" : "not-allowed",
                        transition: "background 0.2s",
                      }}
                    >
                      Choose File
                    </button>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      {file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : (!isCheckinValid ? "Complete check-in above to enable upload" : "No file chosen")}
                    </span>
                  </div>
                </div>

                {/* Validation & Preview Area */}
                <div style={{ marginTop: "20px" }}>
                  {/* Loading State */}
                  {previewLoading && (
                    <div
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        color: "#475569",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        fontSize: "13px",
                      }}
                    >
                      <Loader2 size={18} className="animate-spin" color="#e11d48" />
                      <span>Validating dataset structure and computing demand preview...</span>
                    </div>
                  )}

                  {/* Validation Error State */}
                  {!previewLoading && validationError && (
                    <div
                      style={{
                        padding: "16px 20px",
                        background: "#fef2f2",
                        border: "1px solid #fecdd3",
                        borderRadius: "12px",
                        color: "#991b1b",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <AlertCircle size={18} color="#dc2626" />
                        <strong style={{ fontSize: "14px" }}>
                          Validation Failed: {validationError.code || "INVALID_DATA"}
                        </strong>
                      </div>
                      <p style={{ fontSize: "13px", marginBottom: validationError.details?.length ? "10px" : "0" }}>
                        {validationError.message}
                      </p>
                      {validationError.details && validationError.details.length > 0 && (
                        <ul style={{ margin: "0", paddingLeft: "20px", fontSize: "12px", color: "#b91c1c" }}>
                          {validationError.details.map((d, i) => (
                            <li key={i}>
                              {d.row ? `Row ${d.row}: ` : ""}{d.column ? `[${d.column}] ` : ""}{d.problem || ""}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Structured Preview Display */}
                  {!previewLoading && previewData && previewData.ok && (
                    <div
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        overflow: "hidden",
                        background: "#ffffff",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      }}
                    >
                      {/* Preview Header */}
                      <div
                        style={{
                          padding: "12px 18px",
                          background: "#f8fafc",
                          borderBottom: "1px solid #e2e8f0",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <FileText size={16} color="#e11d48" />
                          <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                            Dataset Preview &amp; Verification
                          </strong>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              background: "#ecfdf5",
                              color: "#059669",
                              padding: "2px 8px",
                              borderRadius: "9999px",
                            }}
                          >
                            ✓ {previewData.valid_row_count} / {previewData.source_row_count} Source Rows Verified
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              background: "#f1f5f9",
                              color: "#475569",
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              textTransform: "uppercase",
                            }}
                          >
                            {previewData.format}{previewData.sheet_used ? ` • Sheet: "${previewData.sheet_used}"` : ""}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{ fontSize: "12px", color: "#64748b" }}>
                            Validated Weekly Demand:{" "}
                            <strong style={{ color: "#0f172a", fontSize: "13px" }}>
                              {previewData.weekly_demand.toLocaleString()} orders
                            </strong>
                          </span>
                          <button
                            type="button"
                            onClick={handleClear}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "transparent",
                              border: "none",
                              color: "#94a3b8",
                              fontSize: "11px",
                              cursor: "pointer",
                              padding: "4px 8px",
                            }}
                            title="Remove file"
                          >
                            <X size={14} />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>

                      {/* Warnings Banner if any */}
                      {previewData.warnings && previewData.warnings.length > 0 && (
                        <div
                          style={{
                            padding: "10px 16px",
                            background: "#fffbeb",
                            borderBottom: "1px solid #fef3c7",
                            color: "#92400e",
                            fontSize: "12px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700", marginBottom: "4px" }}>
                            <AlertTriangle size={14} color="#d97706" />
                            <span>Parser Warnings ({previewData.warnings.length}):</span>
                          </div>
                          <ul style={{ margin: 0, paddingLeft: "18px" }}>
                            {previewData.warnings.map((w, i) => (
                              <li key={i}>
                                {w.row > 0 ? `Row ${w.row}: ` : ""}{w.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Rejected Rows Banner if any */}
                      {previewData.rejected_rows && previewData.rejected_rows.length > 0 && (
                        <div
                          style={{
                            padding: "10px 16px",
                            background: "#fef2f2",
                            borderBottom: "1px solid #fecdd3",
                            color: "#991b1b",
                            fontSize: "12px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700", marginBottom: "4px" }}>
                            <AlertCircle size={14} color="#dc2626" />
                            <span>Skipped / Rejected Records ({previewData.rejected_rows.length}):</span>
                          </div>
                          <ul style={{ margin: 0, paddingLeft: "18px" }}>
                            {previewData.rejected_rows.map((r, i) => (
                              <li key={i}>
                                {r.row > 0 ? `Row ${r.row}: ` : ""}{r.reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Scrollable Preview Table */}
                      <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                          <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left" }}>
                              <th style={{ padding: "8px 14px", fontWeight: "600" }}>Day</th>
                              <th style={{ padding: "8px 14px", fontWeight: "600" }}>Service</th>
                              <th style={{ padding: "8px 14px", fontWeight: "600", textAlign: "right" }}>9 AM – 11 AM</th>
                              <th style={{ padding: "8px 14px", fontWeight: "600", textAlign: "right" }}>11 AM – 1 PM</th>
                              <th style={{ padding: "8px 14px", fontWeight: "600", textAlign: "right" }}>1 PM – 4 PM</th>
                              <th style={{ padding: "8px 14px", fontWeight: "600", textAlign: "right" }}>4 PM – 6 PM</th>
                              <th style={{ padding: "8px 14px", fontWeight: "700", textAlign: "right", color: "#0f172a" }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.preview_rows.slice(0, 10).map((row, idx) => {
                              const rowTotal = row.slot_9_11 + row.slot_11_1 + row.slot_1_4 + row.slot_4_6;
                              return (
                                <tr
                                  key={idx}
                                  style={{
                                    borderBottom: "1px solid #f1f5f9",
                                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                                  }}
                                >
                                  <td style={{ padding: "8px 14px", fontWeight: "600", color: "#334155" }}>{row.day_name}</td>
                                  <td style={{ padding: "8px 14px", color: "#475569" }}>{row.service}</td>
                                  <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>{row.slot_9_11}</td>
                                  <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>{row.slot_11_1}</td>
                                  <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>{row.slot_1_4}</td>
                                  <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>{row.slot_4_6}</td>
                                  <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: "700", color: "#e11d48", fontFamily: "var(--font-mono, monospace)" }}>{rowTotal}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer Note */}
                      <div
                        style={{
                          padding: "8px 16px",
                          background: "#f8fafc",
                          borderTop: "1px solid #e2e8f0",
                          fontSize: "11px",
                          color: "#64748b",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <span>
                          Showing preview of first {Math.min(10, previewData.preview_rows.length)} of {previewData.normalized_record_count} matrix records ({previewData.valid_row_count} rows passed validation)
                        </span>
                        <span style={{ color: "#059669", fontWeight: "600" }}>
                          ✓ Ready for Mathematical Analysis
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Operational Notes */}
              <div>
                <label
                  htmlFor="operational-notes"
                  style={{
                    display: "block",
                    fontSize: "15px",
                    fontWeight: "500",
                    color: "#0f172a",
                    marginBottom: "8px",
                  }}
                >
                  Operational Notes (Optional)
                </label>
                <textarea
                  id="operational-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Document any special events, equipment maintenance, or attendance deviations..."
                  style={{
                    width: "100%",
                    minHeight: "105px",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    fontSize: "15px",
                    lineHeight: "1.5",
                    color: "#0f172a",
                    outline: "none",
                    background: "#ffffff",
                    resize: "vertical",
                    fontFamily: "inherit",
                    boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.02)",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#be123c";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(190, 18, 60, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(0, 0, 0, 0.02)";
                  }}
                />
              </div>

              {/* Submit Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingTop: "8px" }}>
                <button
                  type="button"
                  onClick={handleClear}
                  className="btn-secondary"
                  style={{ padding: "12px 24px", fontSize: "14px" }}
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="btn-primary"
                  style={{
                    padding: "12px 28px",
                    fontSize: "14px",
                    opacity: isSubmitDisabled ? 0.6 : 1,
                    cursor: isSubmitDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Computing Mathematical Demand Engine...</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze &amp; Save Dataset</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
