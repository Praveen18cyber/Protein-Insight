import { AnalysisResult } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

interface DensityVisualizationProps {
  data?: AnalysisResult["interactionDensity"];
}

export function DensityVisualization({ data }: DensityVisualizationProps) {
  if (!data || Object.keys(data).length === 0) {
    return <div className="text-center text-muted-foreground py-8">No interaction density data</div>;
  }

  // Get first chain's data for visualization
  const chainKey = Object.keys(data)[0];
  const chainData = data[chainKey]?.slice(0, 15) || []; // Top 15 residues

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chainData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="residueSeq" 
            label={{ value: "Residue Sequence", position: "insideBottomRight", offset: -5 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            label={{ value: "Interaction Count", angle: -90, position: "insideLeft" }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc" }}
            formatter={(value) => value}
            labelFormatter={(label) => `Residue ${label}`}
          />
          <Legend />
          <Bar dataKey="intraCount" stackId="a" fill="#f97316" name="Intra-Protein" />
          <Bar dataKey="interCount" stackId="a" fill="#3b82f6" name="Inter-Protein" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
