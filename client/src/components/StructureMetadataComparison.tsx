import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

interface StructureMetadataComparisonProps {
  pdbA: string;
  pdbB: string;
  resultA: any;
  resultB: any;
}

export function StructureMetadataComparison({ pdbA, pdbB, resultA, resultB }: StructureMetadataComparisonProps) {
  // Extract scalar values safely
  const getChainCount = (result: any) => result?.summary?.totalChains || "N/A";
  const getAtomCount = (result: any) => result?.summary?.totalAtoms?.toLocaleString() || "N/A";

  const metrics = [
    { label: "PDB ID", keyA: pdbA, keyB: pdbB },
    { label: "Chains", keyA: getChainCount(resultA), keyB: getChainCount(resultB) },
    { label: "Atoms", keyA: getAtomCount(resultA), keyB: getAtomCount(resultB) },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="w-4 h-4" />
          Structure Metadata
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {metrics.map((metric, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-4 text-sm">
              <div className="font-medium text-muted-foreground">{metric.label}</div>
              <div className="flex items-center justify-center px-2 py-1 bg-blue-50 rounded text-blue-900 font-semibold">
                {metric.keyA}
              </div>
              <div className="flex items-center justify-center px-2 py-1 bg-orange-50 rounded text-orange-900 font-semibold">
                {metric.keyB}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
