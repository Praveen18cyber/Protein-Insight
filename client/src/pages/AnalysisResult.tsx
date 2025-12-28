import { AnalysisResult } from "@shared/schema";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface ChainInteractionSummaryProps {
  data?: AnalysisResult["chainInteractionSummary"];
}

export function ChainInteractionSummary({ data }: ChainInteractionSummaryProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No chain interaction data</div>;
  }

  return (
    <div className="w-full space-y-2">
      <div className="text-sm font-semibold text-muted-foreground px-2 py-1">Chain Pair Interactions</div>
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {data.map((item, idx) => {
          const rowKey = `${item.chainA}-${item.chainB}`;
          const isExpanded = expandedRow === rowKey;

          return (
            <div key={idx} className="border border-border rounded-lg bg-white overflow-hidden">
              <button
                onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-sm"
              >
                <div className="flex items-center gap-3 flex-1 text-left">
                  <div className="flex-1">
                    <div className="font-mono text-xs font-semibold text-foreground">
                      {item.chainA} ↔ {item.chainB}
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div className="text-right">
                      <div className="text-muted-foreground">Total</div>
                      <div className="font-semibold text-foreground">{item.totalCount}</div>
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="px-4 py-3 bg-muted/30 border-t border-border grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold mb-1">Intra-Chain</div>
                    <div className="text-lg font-bold text-orange-600">{item.intraCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold mb-1">Inter-Chain</div>
                    <div className="text-lg font-bold text-blue-600">{item.interCount}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
