import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Zap } from "lucide-react";

interface InteractionComparisonProps {
  resultA: any;
  resultB: any;
  pdbA: string;
  pdbB: string;
}

export function InteractionComparison({ resultA, resultB, pdbA, pdbB }: InteractionComparisonProps) {
  // Count interaction types
  const countByType = (interactions: any[]) => {
    const counts: Record<string, number> = {
      "Hydrogen Bond": 0,
      "Salt Bridge": 0,
      "Hydrophobic": 0,
      "Van der Waals": 0,
    };
    
    interactions?.forEach((i: any) => {
      if (counts.hasOwnProperty(i.type)) {
        counts[i.type]++;
      }
    });
    
    return counts;
  };

  const countsA = countByType(resultA?.interactions || []);
  const countsB = countByType(resultB?.interactions || []);

  const chartData = [
    { type: "H-Bonds", A: countsA["Hydrogen Bond"], B: countsB["Hydrogen Bond"] },
    { type: "Salt Bridges", A: countsA["Salt Bridge"], B: countsB["Salt Bridge"] },
    { type: "Hydrophobic", A: countsA["Hydrophobic"], B: countsB["Hydrophobic"] },
    { type: "Van der Waals", A: countsA["Van der Waals"], B: countsB["Van der Waals"] },
  ];

  const totalA = Object.values(countsA).reduce((a, b) => a + b, 0);
  const totalB = Object.values(countsB).reduce((a, b) => a + b, 0);
  const difference = Math.abs(totalA - totalB);

  return (
    <Card className="border-border col-span-1 md:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Interaction Type Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="font-semibold text-blue-900">{totalA}</div>
            <div className="text-xs text-blue-700">{pdbA} Total</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-semibold">{difference}</div>
            <div className="text-xs text-muted-foreground">Difference</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <div className="font-semibold text-orange-900">{totalB}</div>
            <div className="text-xs text-orange-700">{pdbB} Total</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="type" stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
            <YAxis stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
            <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} />
            <Legend />
            <Bar dataKey="A" fill="#3b82f6" name={pdbA} />
            <Bar dataKey="B" fill="#f97316" name={pdbB} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
