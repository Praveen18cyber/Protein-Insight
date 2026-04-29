import { NGLViewer } from "@/components/NGLViewer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { memo } from "react";

interface StructureViewerProps {
  pdbId: string;
  colorScheme: string;
  onRemove: () => void;
}

const colorSchemes = [
  "spectrum",
  "bfactor",
  "chainid",
  "residueindex",
  "hydrophobicity",
  "temperature",
  "occupancy",
  "value",
  "density",
  "roygbiv"
];

function StructureViewerComponent({ pdbId, colorScheme, onRemove }: StructureViewerProps) {
  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden bg-white border border-border shadow-sm hover:shadow-md transition-shadow">
      {/* Header with PDB ID and remove button */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-foreground">{pdbId}</div>
          <span className="text-xs text-muted-foreground">({colorScheme})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="px-2 h-6 hover:bg-destructive/10 hover:text-destructive"
          data-testid={`button-remove-viewer-${pdbId}`}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Viewer container */}
      <div className="flex-1 min-h-0">
        <NGLViewer
          proteins={[{
            pdbId: pdbId,
            name: pdbId
          }]}
          colorScheme={colorScheme}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

export const StructureViewer = memo(StructureViewerComponent);

export function getColorScheme(index: number): string {
  return colorSchemes[index % colorSchemes.length];
}
