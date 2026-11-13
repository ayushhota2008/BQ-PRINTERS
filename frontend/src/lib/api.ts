const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const API_BASE = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, "")}/api`;

async function getAuthToken(): Promise<string | undefined> {
  return undefined;
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchSampleCsv(): Promise<string> {
  const res = await fetch(`${API_BASE}/sample-dataset?format=csv`);
  const data = await res.json();
  return data.csv;
}

export interface PreviewRow {
  day_number: number;
  day_name: string;
  service: string;
  slot_9_11: number;
  slot_11_1: number;
  slot_1_4: number;
  slot_4_6: number;
}

export interface PreviewWarning {
  row: number;
  message: string;
}

export interface RejectedRow {
  row: number;
  reason: string;
}

export interface PreviewResponse {
  ok: boolean;
  file_name: string;
  format: "csv" | "xlsx";
  sheet_used: string | null;
  source_row_count: number;
  valid_row_count: number;
  normalized_record_count: number;
  weekly_demand: number;
  preview_rows: PreviewRow[];
  warnings: PreviewWarning[];
  rejected_rows: RejectedRow[];
}

export async function previewUploadedFile(
  file: File,
  token?: string,
  signal?: AbortSignal
): Promise<PreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const authToken = token || (await getAuthToken());
  const headers: Record<string, string> = {};
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}/upload/preview`, {
    method: "POST",
    headers,
    body: formData,
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Preview generation failed" }));
    const errorObj: any = new Error(err.message || err.detail || "Upload validation failed");
    errorObj.error_code = err.error_code;
    errorObj.details = err.details;
    throw errorObj;
  }

  return res.json();
}

export async function analyzeCsvFile(
  file: File,
  datasetName?: string,
  weekLabel?: string,
  saveToSupabase: boolean = true,
  assumptions?: any,
  token?: string,
  notes?: string,
  checkin?: any
) {
  const formData = new FormData();
  formData.append("file", file);
  if (datasetName) formData.append("dataset_name", datasetName);
  if (weekLabel) formData.append("week_label", weekLabel);
  const notesVal = notes || assumptions?.notes || assumptions?.operational_notes;
  if (notesVal) formData.append("notes", notesVal);
  formData.append("save_to_supabase", saveToSupabase ? "true" : "false");
  if (assumptions) {
    formData.append("assumptions_json", JSON.stringify(assumptions));
  }
  if (checkin) {
    formData.append("checkin_json", JSON.stringify(checkin));
  }

  const authToken = token || (await getAuthToken());
  const headers: Record<string, string> = {};
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}/analyze-csv`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    const errorObj: any = new Error(err.message || err.detail || "Validation or calculation error");
    errorObj.error_code = err.error_code;
    errorObj.details = err.details;
    throw errorObj;
  }

  return res.json();
}

export async function saveShopCheckin(checkin: any, overwrite: boolean = false) {
  const res = await fetch(`${API_BASE}/checkin?overwrite=${overwrite ? "true" : "false"}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkin),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to save check-in" }));
    throw new Error(err.detail || err.message || "Failed to save check-in");
  }
  return res.json();
}

export async function fetchShopCheckins() {
  const res = await fetch(`${API_BASE}/checkins?_t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchShopCheckinByDate(dateStr: string) {
  const res = await fetch(`${API_BASE}/checkins/${encodeURIComponent(dateStr)}?_t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function listSavedDatasets(token?: string) {
  const authToken = token || (await getAuthToken());
  const headers: Record<string, string> = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE}/datasets?_t=${Date.now()}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getDatasetById(datasetId: string) {
  const headers: Record<string, string> = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
  };
  const res = await fetch(`${API_BASE}/datasets/${encodeURIComponent(datasetId)}?_t=${Date.now()}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Dataset not found");
  return res.json();
}

export async function deleteDatasetById(datasetId: string) {
  const authToken = await getAuthToken();
  const headers: Record<string, string> = {};
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE}/datasets/${datasetId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete dataset");
  return res.json();
}

export async function compareMultipleWeeks(datasetIds: string[]) {
  const res = await fetch(`${API_BASE}/compare-weeks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datasetIds),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Comparison failed" }));
    throw new Error(err.detail || "Failed to compare weeks");
  }
  return res.json();
}
