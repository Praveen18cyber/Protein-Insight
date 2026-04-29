import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ComparisonReportProps {
  pdbA: string;
  pdbB: string;
  results: any;
}

export function ComparisonReport({ pdbA, pdbB, results }: ComparisonReportProps) {
  const { toast } = useToast();

  const generateCSVReport = () => {
    if (!results) return;

    const lines: string[] = [];
    lines.push("Structure Comparison Report");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");
    lines.push("COMPARISON SUMMARY");
    lines.push(`Structure A,${pdbA}`);
    lines.push(`Structure B,${pdbB}`);
    lines.push(`Binding Affinity Difference,${results.comparison.deltaBAI.toFixed(2)} BAI Units`);
    lines.push(`Percent Difference,${results.comparison.percentDiff.toFixed(2)}%`);
    lines.push(`Winner,${results.comparison.winner === 'A' ? pdbA : pdbB}`);
    lines.push("");
    
    lines.push("STRUCTURE A METRICS");
    lines.push(`Binding Affinity Index,${results.resultA.bindingAffinity?.bindingAffinityIndex?.toFixed(2) || "N/A"}`);
    lines.push(`Total Interactions,${results.resultA.interactions?.length || 0}`);
    const interA = results.resultA.interactions?.filter((i: any) => !i.isIntraMolecular).length || 0;
    lines.push(`Inter-Chain Interactions,${interA}`);
    lines.push("");

    lines.push("STRUCTURE B METRICS");
    lines.push(`Binding Affinity Index,${results.resultB.bindingAffinity?.bindingAffinityIndex?.toFixed(2) || "N/A"}`);
    lines.push(`Total Interactions,${results.resultB.interactions?.length || 0}`);
    const interB = results.resultB.interactions?.filter((i: any) => !i.isIntraMolecular).length || 0;
    lines.push(`Inter-Chain Interactions,${interB}`);
    lines.push("");

    lines.push("INTERACTION TYPE BREAKDOWN");
    lines.push("Type,Structure A,Structure B");
    const types = ["Hydrogen Bond", "Salt Bridge", "Hydrophobic", "Van der Waals"];
    types.forEach(type => {
      const countA = results.resultA.interactions?.filter((i: any) => i.type === type).length || 0;
      const countB = results.resultB.interactions?.filter((i: any) => i.type === type).length || 0;
      lines.push(`${type},${countA},${countB}`);
    });

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparison_${pdbA}_vs_${pdbB}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({ title: "Report Downloaded", description: "Comparison report saved successfully." });
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Export Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={generateCSVReport} className="w-full" variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download CSV Report
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Export detailed comparison metrics as CSV for further analysis or publication.
        </p>
      </CardContent>
    </Card>
  );
}
