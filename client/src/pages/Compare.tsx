import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRightLeft, Zap } from "lucide-react";
import { BindingAffinityWidget } from "@/components/BindingAffinityWidget";
import { InteractionCharts } from "@/components/Charts";
import { NGLViewer } from "@/components/NGLViewer";
import { StructureMetadataComparison } from "@/components/StructureMetadataComparison";
import { InteractionComparison } from "@/components/InteractionComparison";
import { StructureSimilarityMetrics } from "@/components/StructureSimilarityMetrics";
import { ComparisonReport } from "@/components/ComparisonReport";

export default function ComparePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [pdbA, setPdbA] = useState("");
  const [pdbB, setPdbB] = useState("");
  const [results, setResults] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/compare", data);
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data);
      toast({ title: "Comparison Complete", description: "Successfully analyzed both structures." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Comparison Failed", description: "Please check the PDB IDs and try again." });
    }
  });

  const handleCompare = () => {
    if (!pdbA || !pdbB) {
      toast({ variant: "destructive", title: "Missing Input", description: "Please provide both PDB IDs." });
      return;
    }
    mutation.mutate({
      title: `${pdbA} vs ${pdbB} Comparison`,
      sourceA: { name: pdbA, pdbId: pdbA },
      sourceB: { name: pdbB, pdbId: pdbB }
    });
  };

  const getInterfaceResidues = (result: any) => {
    if (!result || !result.interactions) return [];
    const interInteractions = result.interactions.filter((i: any) => !i.isIntraMolecular);
    const residues = new Set<string>();
    interInteractions.forEach((i: any) => {
      // Residue format is "RES SEQ", we need residueSeq as number
      const seqA = parseInt(i.residueA.split(' ')[1]);
      const seqB = parseInt(i.residueB.split(' ')[1]);
      residues.add(`${i.chainA}:${seqA}`);
      residues.add(`${i.chainB}:${seqB}`);
    });
    return Array.from(residues).map(r => {
      const [chainId, residueSeq] = r.split(':');
      return { chainId, residueSeq: parseInt(residueSeq) };
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Structure Comparison</h1>
            <p className="text-muted-foreground">Compare binding affinity and interactions between two structures</p>
          </div>
        </header>

        {!results ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Select Structures to Compare</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>PDB ID A</Label>
                  <Input placeholder="e.g. 1A2B" value={pdbA} onChange={(e) => setPdbA(e.target.value.toUpperCase())} maxLength={4} />
                </div>
                <div className="space-y-2">
                  <Label>PDB ID B</Label>
                  <Input placeholder="e.g. 3C4D" value={pdbB} onChange={(e) => setPdbB(e.target.value.toUpperCase())} maxLength={4} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCompare} disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
                Run Comparison Analysis
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Binding Affinity Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DeltaCard 
                label="Binding Affinity Difference" 
                value={results.comparison.deltaBAI}
                percent={results.comparison.percentDiff}
                unit="BAI Units"
              />
              <Card className="col-span-2 border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Comparison Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium">
                    {results.comparison.winner === 'A' ? pdbA : pdbB} shows stronger predicted binding 
                    ({Math.abs(results.comparison.deltaBAI).toFixed(1)} units higher).
                  </p>
                  <p className="text-sm mt-2 text-primary font-medium">
                    Interface residues (highlighted in pink) contribute disproportionately to binding stability and affinity.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Relative structure-based comparison, not experimental free energy (ΔG).
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Metadata and Similarity Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StructureMetadataComparison 
                pdbA={pdbA}
                pdbB={pdbB}
                resultA={results.resultA}
                resultB={results.resultB}
              />
              <StructureSimilarityMetrics 
                resultA={results.resultA}
                resultB={results.resultB}
                pdbA={pdbA}
                pdbB={pdbB}
              />
            </div>

            {/* Interaction Type Distribution */}
            <InteractionComparison 
              resultA={results.resultA}
              resultB={results.resultB}
              pdbA={pdbA}
              pdbB={pdbB}
            />

            {/* Structure Viewers and Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <h3 className="font-bold text-center py-2 bg-muted rounded-lg flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  {pdbA}
                </h3>
                <Card className="border-border shadow-sm p-1 overflow-hidden">
                  <div className="h-[500px] w-full">
                    <NGLViewer 
                      proteins={[{
                        pdbId: pdbA,
                        pdbContent: results.contentA,
                        name: pdbA
                      }]}
                      highlightResidues={getInterfaceResidues(results.resultA)}
                      className="w-full h-full"
                    />
                  </div>
                </Card>
                <InteractionCharts interactions={results.resultA.interactions} />
                <BindingAffinityWidget data={results.resultA.bindingAffinity} />
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-center py-2 bg-muted rounded-lg flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  {pdbB}
                </h3>
                <Card className="border-border shadow-sm p-1 overflow-hidden">
                  <div className="h-[500px] w-full">
                    <NGLViewer 
                      proteins={[{
                        pdbId: pdbB,
                        pdbContent: results.contentB,
                        name: pdbB
                      }]}
                      highlightResidues={getInterfaceResidues(results.resultB)}
                      className="w-full h-full"
                    />
                  </div>
                </Card>
                <InteractionCharts interactions={results.resultB.interactions} />
                <BindingAffinityWidget data={results.resultB.bindingAffinity} />
              </div>
            </div>

            {/* Export Section */}
            <ComparisonReport pdbA={pdbA} pdbB={pdbB} results={results} />

            <Button variant="outline" className="w-full" onClick={() => setResults(null)}>
              Start New Comparison
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function DeltaCard({ label, value, percent, unit }: { label: string, value: number, percent: number, unit: string }) {
  const isPositive = value > 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold flex items-baseline gap-2">
          {isPositive ? '+' : ''}{value.toFixed(1)}
          <span className="text-xs font-normal text-muted-foreground">{unit}</span>
        </div>
        <div className={`text-sm mt-1 font-semibold ${isPositive ? 'text-green-600' : 'text-blue-600'}`}>
          {Math.abs(percent).toFixed(1)}% difference
        </div>
      </CardContent>
    </Card>
  );
}
