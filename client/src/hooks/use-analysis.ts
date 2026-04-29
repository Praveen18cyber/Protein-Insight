import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useLocation } from "wouter";
import type { AnalysisSession, ProteinSource } from "@shared/schema";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, credentials: "include" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${res.status}`);
  }
  return res.json();
}

export function useAnalysis(id: number | null) {
  return useQuery({
    queryKey: [api.analysis.get.path, id],
    queryFn: async () => {
      if (!id) throw new Error("ID required");
      const url = buildUrl(api.analysis.get.path, { id });
      return await fetchJson<AnalysisSession & { result: any }>(url);
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 1000 : false;
    },
  });
}

export interface CreateAnalysisRequest {
  title: string;
  proteinSource: ProteinSource;
  proteinContent: string;
}

export function useCreateAnalysis() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (data: CreateAnalysisRequest) => {
      const res = await fetch(api.analysis.create.path, {
        method: api.analysis.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create analysis session");
      }

      return await res.json();
    },
    onSuccess: (data) => {
      setLocation(`/analysis/${data.id}`);
    },
  });
}

export function useDownloadUrls(id: number) {
  return {
    interProteinUrl: buildUrl(api.analysis.downloadInterProtein.path, { id }),
    intraProteinUrl: buildUrl(api.analysis.downloadIntraProtein.path, { id }),
    structureUrl: buildUrl(api.analysis.downloadStructure.path, { id }),
  };
}
