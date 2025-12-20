import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateAnalysisRequest, type AnalysisSession } from "@shared/routes";
import { useLocation } from "wouter";

// Helper to validate API responses against Zod schemas
// In a real app, this would wrap the fetch calls, but here we trust the backend types via shared schema
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, credentials: "include" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${res.status}`);
  }
  return res.json();
}

// GET /api/analysis/:id
export function useAnalysis(id: number | null) {
  return useQuery({
    queryKey: [api.analysis.get.path, id],
    queryFn: async () => {
      if (!id) throw new Error("ID required");
      const url = buildUrl(api.analysis.get.path, { id });
      const data = await fetchJson<AnalysisSession>(url);
      
      // We parse it to ensure it matches our expectations (optional but good practice)
      return api.analysis.get.responses[200].parse(data);
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Poll if pending
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 1000 : false;
    },
  });
}

// POST /api/analysis
export function useCreateAnalysis() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (data: CreateAnalysisRequest) => {
      // Validate input before sending (client-side validation)
      const validated = api.analysis.create.input.parse(data);
      
      const res = await fetch(api.analysis.create.path, {
        method: api.analysis.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create analysis session");
      }

      return api.analysis.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      // Navigate to the result page immediately
      setLocation(`/analysis/${data.id}`);
    },
  });
}

// Hooks for download URLs (not strictly fetching data, but useful helpers)
export function useDownloadUrls(id: number) {
  return {
    reportUrl: buildUrl(api.analysis.downloadReport.path, { id }),
    pdbUrl: buildUrl(api.analysis.downloadPdb.path, { id }),
  };
}
