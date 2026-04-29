import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp } from "lucide-react";

interface StructureSimilarityMetricsProps {
  resultA: any;
  resultB: any;
  pdbA: string;
  pdbB: string;
}

export function StructureSimilarityMetrics({ resultA, resultB, pdbA, pdbB }: StructureSimilarityMetricsProps) {
  // Calculate similarity metrics
  const getInterChainInteractions = (result: any) => {
    return result?.interactions?.filter((i: any) => !i.isIntraMolecular).length || 0;
  };

  const getIntraChainInteractions = (result: any) => {
    return result?.interactions?.filter((i: any) => i.isIntraMolecular).length || 0;
  };

  const interA = getInterChainInteractions(resultA);
  const interB = getInterChainInteractions(resultB);
  const intraA = getIntraChainInteractions(resultA);
  const intraB = getIntraChainInteractions(resultB);

  const totalA = interA + intraA;
  const totalB = interB + intraB;

  const similarity = totalA > 0 && totalB > 0 
    ? ((Math.min(totalA, totalB) / Math.max(totalA, totalB)) * 100).toFixed(1)
    : "N/A";

  const metrics = [
    { 
      label: "Inter-Chain Interactions", 
      valueA: interA, 
      valueB: interB,
      desc: "Protein-protein interactions"
    },
    { 
      label: "Intra-Chain Interactions", 
      valueA: intraA, 
      valueB: intraB,
      desc: "Within single protein chains"
    },
    { 
      label: "Total Interactions", 
      valueA: totalA, 
      valueB: totalB,
      desc: "All detected interactions"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Interaction Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.map((metric, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase">{metric.label}</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-blue-50 rounded text-center">
                  <div className="font-bold text-blue-900">{metric.valueA}</div>
                  <div className="text-xs text-blue-700">{pdbA}</div>
                </div>
                <div className="p-2 bg-orange-50 rounded text-center">
                  <div className="font-bold text-orange-900">{metric.valueB}</div>
                  <div className="text-xs text-orange-700">{pdbB}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{metric.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Similarity Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Structural Similarity</span>
              <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
                {similarity}%
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all" 
                style={{ width: `${similarity !== "N/A" ? similarity : 0}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Based on interaction count similarity. Higher values indicate more structurally similar binding behavior.
          </p>
          <div className="pt-2 border-t border-border space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{pdbA} Total:</span>
              <span className="font-semibold">{totalA}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{pdbB} Total:</span>
              <span className="font-semibold">{totalB}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
