import { useRoute } from "wouter";
import { useAnalysis, useDownloadUrls } from "@/hooks/use-analysis";
import { NGLViewer } from "@/components/NGLViewer";
import { InteractionTable } from "@/components/InteractionTable";
import { InteractionCharts } from "@/components/Charts";
import { Loader2, Download, AlertCircle, Share2, ArrowLeft, Dna } from "lucide-react";
import { Link } from "wouter";
import { AnalysisResult } from "@shared/schema";

export default function AnalysisResultPage() {
  const [match, params] = useRoute("/analysis/:id");
  const id = match ? parseInt(params.id) : null;
  
  const { data: session, isLoading, error } = useAnalysis(id);
  const { reportUrl, pdbUrl } = useDownloadUrls(id || 0);

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="text-xl font-semibold">Analyzing Structure...</h2>
          <p className="text-muted-foreground">Calculating atomic interactions and surface areas.</p>
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
          <p className="text-muted-foreground mb-6">
            We couldn't process this structure. It might contain non-standard residues or missing chain information.
          </p>
          <Link href="/" className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
             Try Another Structure
          </Link>
        </div>
      </div>
    );
  }

  // Safe cast because our DB stores jsonb, but we know the shape from Zod
  const result = session.result as unknown as AnalysisResult;

  // Wait for processing
  if (session.status === 'pending' || session.status === 'processing') {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <h2 className="text-xl font-semibold">Processing {session.title}...</h2>
            <div className="w-64 h-2 bg-muted rounded-full overflow-hidden mx-auto">
                <div className="h-full bg-primary animate-[shimmer_2s_infinite] w-1/2 rounded-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 skew-x-12 translate-x-full animate-[shimmer_1.5s_infinite]" />
                </div>
            </div>
            <p className="text-muted-foreground text-sm">This may take up to 30 seconds for large complexes.</p>
          </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
       {/* Header */}
       <header className="border-b border-border bg-white sticky top-0 z-40">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-muted rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div className="flex flex-col">
                <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                    {session.title}
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                        Complete
                    </span>
                </h1>
                <p className="text-xs text-muted-foreground font-mono">
                    Session ID: {session.id} • {new Date(session.createdAt!).toLocaleDateString()}
                </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <a 
                href={reportUrl} 
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white hover:bg-muted/50 text-sm font-medium transition-colors"
             >
                <Download className="w-4 h-4" />
                CSV Report
             </a>
             <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors">
                <Share2 className="w-4 h-4" />
                Share
             </button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col h-[calc(100vh-64px)]">
         {/* Stats Row */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
            <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                <div className="text-sm text-muted-foreground mb-1">Total Interactions</div>
                <div className="text-2xl font-bold font-mono">{result?.summary.totalInteractions}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                <div className="text-sm text-muted-foreground mb-1">Interacting Chains</div>
                <div className="text-2xl font-bold font-mono">{result?.summary.chains.length}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                <div className="text-sm text-muted-foreground mb-1">Source</div>
                <div className="text-2xl font-bold font-mono truncate">{session.pdbId || 'Upload'}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                <div className="text-sm text-muted-foreground mb-1">Primary Chain</div>
                <div className="text-2xl font-bold font-mono text-primary">
                    {result?.chains[0]?.chainId || '-'}
                </div>
            </div>
         </div>

         {/* Main Split View */}
         <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
             {/* Left Col: 3D Viewer & Charts */}
             <div className="flex flex-col gap-6 min-h-0 overflow-y-auto pr-2">
                 <div className="bg-white rounded-2xl border border-border shadow-sm p-1 h-[500px] shrink-0">
                    <NGLViewer 
                        pdbId={session.pdbId} 
                        // If we had the raw content from upload, we'd need to fetch it separately or embed it.
                        // For this MVP, let's assume if pdbId exists we use it, otherwise we might need an endpoint to get the file content
                        // In a real app: GET /api/analysis/:id/pdb -> returns text
                        // For now we'll rely on pdbId or if uploaded, we should have probably stored it or sent it back.
                        // Wait! NGLViewer needs content. The `useAnalysis` hook returns the session object. 
                        // The session object in DB has `originalFilename` but not the content in the main select usually unless we add it.
                        // Let's assume for now we use the /api/analysis/:id/pdb endpoint to fetch content for the viewer if pdbId is missing.
                        pdbContent={null} // We will load via effect below if needed
                        className="w-full h-full"
                    />
                    {/* HACK: NGLViewer component above handles fetching if pdbContent is passed. 
                        We need a way to fetch the PDB content if it was an upload.
                        Let's wrap NGLViewer with a small fetcher for uploaded files.
                    */}
                    <ViewerFetcher sessionId={session.id} pdbId={session.pdbId} />
                 </div>
                 
                 <div className="shrink-0">
                     <InteractionCharts interactions={result?.interactions || []} />
                 </div>
             </div>

             {/* Right Col: Table */}
             <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col min-h-0">
                 <div className="p-4 border-b border-border">
                     <h3 className="font-semibold flex items-center gap-2">
                         <Dna className="w-4 h-4 text-primary" />
                         Interaction List
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

// Helper to fetch PDB content for uploaded files
function ViewerFetcher({ sessionId, pdbId }: { sessionId: number, pdbId: string | null }) {
    const [content, setContent] = React.useState<string | null>(null);
    const { pdbUrl } = useDownloadUrls(sessionId);

    React.useEffect(() => {
        if (!pdbId) {
            fetch(pdbUrl).then(r => r.text()).then(setContent);
        }
    }, [pdbId, pdbUrl]);

    if (pdbId) return <NGLViewer pdbId={pdbId} className="w-full h-full" />;
    if (!content) return <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    
    return <NGLViewer pdbContent={content} className="w-full h-full" />;
}

import React from "react";
