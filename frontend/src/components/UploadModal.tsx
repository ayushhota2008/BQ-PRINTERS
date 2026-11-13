"use client";

import { useState, useRef } from "react";
import { X, UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { analyzeCsvFile, fetchSampleCsv, previewUploadedFile, PreviewResponse } from "@/lib/api";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [weekLabel, setWeekLabel] = useState("");
  const [saveToSupabase, setSaveToSupabase] = useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  const triggerValidationPreview = async (selectedFile: File) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setPreviewLoading(true);
    setError(null);
    setErrorDetails([]);
    setPreviewData(null);

    try {
      const res = await previewUploadedFile(selectedFile, undefined, controller.signal);
      setPreviewData(res);
      setError(null);
      setErrorDetails([]);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setPreviewData(null);
      setError(err.message || "Failed to validate file structure.");
      setErrorDetails(err.details || []);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSelectedFile = (selected: File) => {
    const ext = selected.name.toLowerCase();
    if (!ext.endsWith(".csv") && !ext.endsWith(".xlsx")) {
      setError(`Unsupported file format for '${selected.name}'. Please choose a .csv or .xlsx file.`);
      setFile(null);
      setPreviewData(null);
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setError(`File size exceeds 5 MB limit (${(selected.size / (1024 * 1024)).toFixed(2)} MB).`);
      setFile(null);
      setPreviewData(null);
      return;
    }

    setFile(selected);
    if (!datasetName) {
      setDatasetName(selected.name.replace(/\.[^/.]+$/, ""));
    }
    setError(null);
    setErrorDetails([]);
    triggerValidationPreview(selected);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      if (e.dataTransfer.files.length > 1) {
        setError("Please upload a single file (.csv or .xlsx).");
        return;
      }
      if (e.dataTransfer.files[0]) {
        handleSelectedFile(e.dataTransfer.files[0]);
      }
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    setError(null);
    setErrorDetails([]);
    try {
      const csvContent = await fetchSampleCsv();
      const sampleBlob = new Blob([csvContent], { type: "text/csv" });
      const sampleFile = new File([sampleBlob], "academic_project_dataset.csv", { type: "text/csv" });
      handleSelectedFile(sampleFile);
      setDatasetName("Academic Benchmark Week");
      setWeekLabel("Week 1 (Oct 2026)");
    } catch {
      setError("Failed to fetch academic benchmark sample.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select or drop a CSV or Excel (.xlsx) file to analyze.");
      return;
    }

    if (previewLoading) {
      setError("Please wait for file validation to complete.");
      return;
    }

    if (error || !previewData?.ok) {
      setError("Cannot submit file with validation errors. Please fix the issue and try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let assumptionsPayload: any = { notes };
      try {
        const stored = localStorage.getItem("bq_printers_assumptions");
        if (stored) {
          assumptionsPayload = { ...JSON.parse(stored), notes };
        }
      } catch {}

      const res = await analyzeCsvFile(
        file,
        datasetName || "Uploaded Week Demand",
        weekLabel || "Recorded Week",
        saveToSupabase,
        assumptionsPayload,
        undefined,
        notes
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("bq_printers_active_dataset_id", res.dataset_id);
        localStorage.setItem("bq_printers_active_dataset_data", JSON.stringify(res));
      }
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to process file. Ensure required columns and 7-day data format.");
      setErrorDetails(err.details || []);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleModalClose}>
      <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>Upload Weekly Demand Dataset</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Supports .csv and .xlsx. Validates structure, executes matrix algebra, and saves to Supabase.
            </p>
          </div>
          <button
            onClick={handleModalClose}
            style={{ background: "#f1f5f9", padding: "6px", borderRadius: "50%", color: "#64748b", border: "none", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 14px",
              background: "#fef2f2",
              border: "1px solid #fecdd3",
              borderRadius: "8px",
              color: "#991b1b",
              fontSize: "12px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} color="#dc2626" />
              <span style={{ fontWeight: "600" }}>{error}</span>
            </div>
            {errorDetails && errorDetails.length > 0 && (
              <ul style={{ margin: "6px 0 0 0", paddingLeft: "24px", fontSize: "11px", color: "#b91c1c" }}>
                {errorDetails.slice(0, 3).map((d, i) => (
                  <li key={i}>
                    {d.row ? `Row ${d.row}: ` : ""}{d.column ? `[${d.column}] ` : ""}{d.problem || ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Dropzone */}
          <div
            className={`dropzone ${isDragOver ? "active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ cursor: "pointer" }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: file ? (error ? "#fef2f2" : "#ecfdf5") : "#fff1f2",
                  color: file ? (error ? "#dc2626" : "#059669") : "#e11d48",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {previewLoading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : file ? (
                  error ? <AlertCircle size={24} /> : <CheckCircle size={24} />
                ) : (
                  <UploadCloud size={24} />
                )}
              </div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                  {file ? file.name : "Click to upload or drag & drop CSV / XLSX"}
                </p>
                <p style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB ${previewData ? `• ${previewData.format.toUpperCase()} (${previewData.valid_row_count} rows, ${previewData.weekly_demand} orders)` : ""}`
                    : "Columns: Day, Service, 9-11, 11-1, 1-4, 4-6 (Max 5 MB)"}
                </p>
              </div>
            </div>
          </div>

          {/* Verification Badge inside modal if valid */}
          {previewData && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                fontSize: "11px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                ✓ <strong>{previewData.valid_row_count}</strong> of <strong>{previewData.source_row_count}</strong> rows validated ({previewData.format.toUpperCase()}{previewData.sheet_used ? ` - Sheet: "${previewData.sheet_used}"` : ""})
              </span>
              <span>Total Demand: <strong>{previewData.weekly_demand}</strong> orders</span>
            </div>
          )}

          {/* Quick sample button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Don&apos;t have a file ready?</span>
            <button
              type="button"
              onClick={handleLoadSample}
              className="btn-secondary"
              style={{ fontSize: "11px", padding: "4px 10px" }}
              disabled={loading || previewLoading}
            >
              <FileSpreadsheet size={13} color="#e11d48" />
              <span>Load Academic Benchmark Dataset (1-Click)</span>
            </button>
          </div>

          {/* Form fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                Dataset Name
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="e.g. October Week 3 Demand"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                Week / Date Label
              </label>
              <input
                type="text"
                value={weekLabel}
                onChange={(e) => setWeekLabel(e.target.value)}
                placeholder="e.g. Oct 15 - Oct 21, 2026"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Operational Notes */}
          <div>
            <label
              htmlFor="modal-operational-notes"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#334155",
                marginBottom: "6px",
              }}
            >
              Operational Notes (Optional)
            </label>
            <textarea
              id="modal-operational-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document any special events, equipment maintenance, or attendance deviations..."
              style={{
                width: "100%",
                minHeight: "80px",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                lineHeight: "1.4",
                color: "#0f172a",
                outline: "none",
                background: "#ffffff",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              id="saveDb"
              checked={saveToSupabase}
              onChange={(e) => setSaveToSupabase(e.target.checked)}
              style={{ accentColor: "#e11d48", width: "16px", height: "16px" }}
            />
            <label htmlFor="saveDb" style={{ fontSize: "12px", color: "#334155", cursor: "pointer" }}>
              Save dataset, raw observations &amp; mathematical models to Supabase PostgreSQL
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button type="button" onClick={handleModalClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || previewLoading || !file || !!error || !previewData?.ok}
              className="btn-primary"
              style={{
                opacity: loading || previewLoading || !file || !!error || !previewData?.ok ? 0.6 : 1,
                cursor: loading || previewLoading || !file || !!error || !previewData?.ok ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Calculating Mathematics...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Analyze &amp; View Dashboard</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
