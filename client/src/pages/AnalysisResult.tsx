import { useRoute } from "wouter";
import { useAnalysis, useDownloadUrls } from "@/hooks/use-analysis";
import { NGLViewer } from "@/components/NGLViewer";
import { InteractionTable } from "@/components/InteractionTable";
import { InteractionCharts } from "@/components/Charts";
import { Loader2, Download, AlertCircle, ArrowLeft, Dna, Zap, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";
import { AnalysisResult } from "@shared/schema";
import React from "react";

export default function AnalysisResultPage() {
  const [match, params] = useRoute("/analysis/:id");
  const id = match ? parseInt(params.id) : null;
  
  const { data: session, isLoading, error } = useAnalysis(id);
  const { reportUrl, structureUrl } = useDownloadUrls(id || 0);

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="text-xl font-semibold">Analyzing Structures...</h2>
          <p className="text-muted-foreground">Computing intra and inter-protein interactions.</p>
        </div>
      </div>
    );
  }

  if (error || session.status === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md p-8 bg-white rounded-2xl border border-destructive/20 shadow-lg text-center">
          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4 text-destructive">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-destructive mb-2">Analysis Failed</h2>
          <p className="text-muted-foreground mb-6">Could not process the structures provided.</p>
          <Link href="/" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium">
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  const result = session.result as unknown as AnalysisResult;

  if (session.status === 'pending' || session.status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="text-xl font-semibold">Processing...</h2>
          <div className="w-64 h-2 bg-muted rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-primary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-white sticky top-0 z-40">
        <div className="max-w-full px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold text-lg flex items-center gap-2">
                {session.title}
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">
                  Complete
                </span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">Session {session.id}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <a 
              href={reportUrl}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white hover:bg-muted/50 text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Report
            </a>
            <a 
              href={structureUrl}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white hover:bg-muted/50 text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Structure
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 shrink-0">
          <StatCard 
            label="Total Interactions" 
            value={result?.summary.totalInteractions || 0}
            icon={<Zap className="w-4 h-4" />}
          />
          <StatCard 
            label="Inter-Protein" 
            value={result?.summary.interProteinInteractions || 0}
            icon={<LinkIcon className="w-4 h-4" />}
            highlight
          />
          <StatCard 
            label="Intra-Protein" 
            value={result?.summary.intraProteinInteractions || 0}
            icon={<Dna className="w-4 h-4" />}
          />
          <StatCard 
            label="Proteins" 
            value={result?.summary.totalProteins || 0}
          />
          <StatCard 
            label="Chains" 
            value={result?.summary.totalChains || 0}
          />
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          <div className="flex flex-col gap-6 min-h-0 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-1 h-96 shrink-0">
              <NGLViewer 
                proteins={(session.proteinSources as any[]).map(s => ({
                  pdbId: s.pdbId,
                  name: s.name
                }))}
                className="w-full h-full"
              />
            </div>
            
            <div className="shrink-0">
              <InteractionCharts interactions={result?.interactions || []} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col min-h-0">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <Dna className="w-4 h-4 text-primary" />
                Interactions ({result?.interactions.length || 0})
              </h3>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <InteractionTable data={result?.interactions || []} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: number; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border shadow-sm ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-border'}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className={highlight ? 'text-blue-600' : 'text-primary'}>{icon}</span>}
        <div className={`text-xs font-medium ${highlight ? 'text-blue-600' : 'text-muted-foreground'}`}>{label}</div>
      </div>
      <div className={`text-2xl font-bold font-mono ${highlight ? 'text-blue-700' : 'text-foreground'}`}>{value}</div>
    </div>
  );
}
