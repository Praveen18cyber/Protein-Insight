import { useRoute } from "wouter";
import { useAnalysis, useDownloadUrls } from "@/hooks/use-analysis";
import { NGLViewer } from "@/components/NGLViewer";
import { InteractionTable } from "@/components/InteractionTable";
import { InteractionCharts } from "@/components/Charts";
import { BindingAffinityWidget } from "@/components/BindingAffinityWidget";
import { DensityVisualization } from "@/components/DensityVisualization";
import { ChainInteractionSummary } from "@/components/ChainInteractionSummary";
import { Loader2, Download, AlertCircle, ArrowLeft, Dna, Zap, Link as LinkIcon, Info, Box, Activity, TrendingUp, Grid3x3 } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AnalysisResult } from "@shared/schema";
import React, { useState, useMemo } from "react";

export default function AnalysisResultPage() {
  const [match, params] = useRoute("/analysis/:id");
  const id = match ? parseInt(params.id) : null;
  const [showDensity, setShowDensity] = useState(false);
  const [activeTab, setActiveTab] = useState<"interactions" | "chains">("interactions");

  const { data: session, isLoading, error } = useAnalysis(id);
  const { interProteinUrl, intraProteinUrl, structureUrl } = useDownloadUrls(id || 0);

  const result = session?.result as unknown as AnalysisResult | undefined;
  
  // Interface residues calculation logic simplified for the new resultSummary structure
  const interfaceResidues = useMemo(() => {
    return []; // Future scope for the redesigned density-based visualization
  }, []);

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
          
          <div className="flex items-center gap-2">
            <a 
              href={interProteinUrl}
              target="_blank"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
              data-testid="button-download-inter"
            >
              <Download className="w-3.5 h-3.5" />
              Inter-Protein
            </a>
            <a 
              href={intraProteinUrl}
              target="_blank"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold transition-colors"
              data-testid="button-download-intra"
            >
              <Download className="w-3.5 h-3.5" />
              Intra-Protein
            </a>
            <a 
              href={structureUrl}
              target="_blank"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-white hover:bg-muted/50 text-sm font-medium transition-colors"
              data-testid="button-download-coords"
            >
              <Download className="w-3.5 h-3.5" />
              Coordinates
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
            testId="stat-total-interactions"
          />
          <StatCard 
            label="Inter-Protein" 
            value={result?.summary.interProteinInteractions || 0}
            icon={<LinkIcon className="w-4 h-4" />}
            highlight
            testId="stat-inter-protein"
          />
          <StatCard 
            label="Intra-Protein" 
            value={result?.summary.intraProteinInteractions || 0}
            icon={<Dna className="w-4 h-4" />}
            testId="stat-intra-protein"
          />
          <StatCard 
            label="Proteins" 
            value={result?.summary.totalProteins || 0}
            testId="stat-proteins"
          />
          <StatCard 
            label="Chains" 
            value={result?.summary.totalChains || 0}
            testId="stat-chains"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Structure Overview */}
          <Card className="hover-elevate transition-all border-border/50">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Info className="w-4 h-4 text-blue-500" />
              </div>
              <CardTitle className="text-sm font-semibold">Structure Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">{session.proteinMetadata?.method || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Resolution</span>
                <span className="font-medium">
                  {session.proteinMetadata?.resolution ? `${session.proteinMetadata.resolution} Å` : "N/A"}
                  {session.proteinMetadata?.resolution && session.proteinMetadata.resolution < 2.0 && (
                    <span className="ml-1 text-[10px] text-green-500 px-1 bg-green-500/10 rounded">High</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Organism</span>
                <span className="font-medium italic">{session.proteinMetadata?.organism || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Year</span>
                <span className="font-medium">{session.proteinMetadata?.year || "N/A"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Complex Type */}
          <Card className="hover-elevate transition-all border-border/50">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Box className="w-4 h-4 text-purple-500" />
              </div>
              <CardTitle className="text-sm font-semibold">Complex Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">
                  {session.result?.summary.totalChains === 4 ? "Heterotetramer" : 
                   session.result?.summary.totalChains === 2 ? "Heterodimer" : 
                   session.result?.summary.totalChains === 1 ? "Monomer" : "Multimer"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Chains</span>
                <span className="font-medium">{session.result?.summary.totalChains || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Atoms</span>
                <span className="font-medium">{session.result?.summary.totalAtoms?.toLocaleString() || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Structure Quality */}
          <Card className="hover-elevate transition-all border-border/50">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Activity className="w-4 h-4 text-green-500" />
              </div>
              <CardTitle className="text-sm font-semibold">Structure Quality</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-green-500 capitalize">{session.status}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Data Source</span>
                <span className="font-medium text-blue-500 uppercase">{session.proteinMetadata?.sourceType}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Metadata</span>
                <Badge variant="outline" className="text-[10px] h-4">
                  {session.proteinMetadata?.metadata ? "Rich" : "Basic"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {(session.proteinMetadata?.metadata as any)?.chains?.map((chain: any, idx: number) => (
            <Card key={idx} className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Chain {chain.id}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  {chain.uniprot && <Badge variant="secondary" className="h-4">UniProt: {chain.uniprot}</Badge>}
                  {chain.organism && <span className="text-muted-foreground">Organism: {chain.organism}</span>}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {chain.description || "Structural component of the protein complex."}
                </p>
              </CardContent>
            </Card>
          )) || result?.chains.map((chain: any, idx: number) => (
            <Card key={idx} className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Chain {chain.chainId}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Residues: {chain.residueCount}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Automatically detected protein chain.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          <div className="flex flex-col gap-6 min-h-0 overflow-y-auto">
            <div className="space-y-2 shrink-0">
              <button
                onClick={() => setShowDensity(!showDensity)}
                data-testid="button-toggle-density"
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
                  showDensity 
                    ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' 
                    : 'bg-white border-border text-foreground hover:bg-muted/50'
                }`}
              >
                {showDensity ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                {showDensity ? 'Showing Interaction Density' : 'Show Interaction Density'}
              </button>
            </div>
            {showDensity ? (
              <div className="bg-white rounded-2xl border border-border shadow-sm p-4 h-96 shrink-0">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  Interaction Density Hotspots
                </h3>
                <DensityVisualization data={result?.interactionDensity} />
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-border shadow-sm p-1 h-96 shrink-0">
                <NGLViewer 
                  proteins={session.proteinMetadata ? [{
                    pdbId: session.proteinMetadata.pdbId || undefined,
                    pdbContent: session.proteinMetadata.pdbContent || undefined,
                    name: session.proteinMetadata.name || "Protein"
                  }] : []}
                  highlightResidues={interfaceResidues}
                  className="w-full h-full"
                />
              </div>
            )}
            
            <div className="shrink-0">
              <BindingAffinityWidget data={result?.bindingAffinity} />
            </div>
            
            <div className="shrink-0">
              <InteractionCharts interactions={result?.interactions || []} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col min-h-0">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("interactions")}
                data-testid="button-tab-interactions"
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === "interactions"
                    ? 'text-primary border-b-2 border-primary -mb-0.5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Interactions
              </button>
              <button
                onClick={() => setActiveTab("chains")}
                data-testid="button-tab-chains"
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "chains"
                    ? 'text-primary border-b-2 border-primary -mb-0.5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
                Chain Pairs
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === "interactions" ? (
                <div className="p-4 overflow-y-auto h-full">
                  <InteractionTable 
                    data={result?.interactions || []} 
                    fullCount={result?.fullInteractionsCount}
                  />
                </div>
              ) : (
                <div className="p-4 overflow-y-auto h-full">
                  <ChainInteractionSummary data={result?.chainInteractionSummary} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, highlight, testId }: { label: string; value: number; icon?: React.ReactNode; highlight?: boolean; testId?: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? 'bg-blue-50 border-blue-100' : 'bg-white border-border'}`} data-testid={testId}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold ${highlight ? 'text-blue-600' : 'text-muted-foreground'}`}>
          {label}
        </span>
        {icon && <span className={highlight ? 'text-blue-600' : 'text-muted-foreground'}>{icon}</span>}
      </div>
      <div className={`text-2xl font-bold ${highlight ? 'text-blue-700' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}
