import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/badge"; // Using a simple visual for score
import { Zap, ShieldCheck, AlertCircle } from "lucide-react";

interface BindingAffinityProps {
  data?: {
    bindingAffinityIndex: number;
    bindingCategory: string;
    featureContributions: Record<string, number>;
  } | null;
}

export function BindingAffinityWidget({ data }: BindingAffinityProps) {
  if (!data) return null;

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Strong": return "text-green-600 bg-green-50 border-green-200";
      case "Moderate": return "text-blue-600 bg-blue-50 border-blue-200";
      default: return "text-amber-600 bg-orange-50 border-orange-200";
    }
  };

  return (
    <Card className="border-border shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/30 pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Relative Binding Affinity Index (Structure-based)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <span className="text-4xl font-black tracking-tighter text-primary">
              {data.bindingAffinityIndex}
            </span>
            <span className="text-muted-foreground text-xs ml-1">/ 100</span>
          </div>
          <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${getCategoryColor(data.bindingCategory)}`}>
            {data.bindingCategory} Binding
          </div>
        </div>

        <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-primary transition-all duration-1000 ease-out" 
            style={{ width: `${data.bindingAffinityIndex}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          {Object.entries(data.featureContributions).map(([key, val]) => (
            <div key={key} className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border/50">
              <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
              <span className={`font-mono font-bold ${val < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {val > 0 ? '+' : ''}{val}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2 flex gap-2 items-start opacity-70">
          <ShieldCheck className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[9px] text-muted-foreground leading-tight italic">
            Computed using weighted structural features (H-Bonds, Salt Bridges, Hydrophobic effects).
            This is a relative index for structure comparison, not experimental free energy.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
