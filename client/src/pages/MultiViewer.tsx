import { useState } from "react";
import { useLocation } from "wouter";
import { StructureViewer, getColorScheme } from "@/components/StructureViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, X, Grid3x3, Plus } from "lucide-react";

export default function MultiViewerPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [pdbIds, setPdbIds] = useState<string[]>([""]);

  const handleAddPdb = () => {
    setPdbIds([...pdbIds, ""]);
  };

  const handleRemovePdb = (index: number) => {
    const newIds = pdbIds.filter((_, i) => i !== index);
    setPdbIds(newIds.length === 0 ? [""] : newIds);
  };

  const handlePdbChange = (index: number, value: string) => {
    const newIds = [...pdbIds];
    newIds[index] = value.toUpperCase();
    setPdbIds(newIds);
  };

  const validPdbIds = pdbIds.filter((id) => id.trim().length > 0);

  const handleVisualize = () => {
    if (validPdbIds.length === 0) {
      toast({
        variant: "destructive",
        title: "No PDB IDs",
        description: "Please enter at least one PDB ID.",
      });
      return;
    }
    if (validPdbIds.length > 10) {
      toast({
        variant: "destructive",
        title: "Too Many Structures",
        description: "Maximum 10 structures at a time for performance.",
      });
      return;
    }
  };

  const handleRemoveViewer = (pdbId: string) => {
    const filteredIds = pdbIds.filter(
      (id) => id.trim().toUpperCase() !== pdbId.toUpperCase()
    );
    setPdbIds(filteredIds.length === 0 ? [""] : filteredIds);
  };

  // Responsive grid classes based on number of structures
  const getGridClass = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count <= 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-3";
    return "grid-cols-4";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg flex items-center gap-2">
                <Grid3x3 className="w-5 h-5" />
                Multi-Structure Viewer
              </h1>
              <p className="text-xs text-muted-foreground">Visualize multiple PDB structures simultaneously</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Left Panel - Input */}
        <div className="w-full max-w-xs flex flex-col gap-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Load Structures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {pdbIds.map((id, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="e.g., 1A2B"
                      value={id}
                      onChange={(e) => handlePdbChange(index, e.target.value)}
                      maxLength={4}
                      className="flex-1 text-sm"
                      data-testid={`input-pdb-${index}`}
                    />
                    {pdbIds.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePdb(index)}
                        className="px-2"
                        data-testid={`button-remove-pdb-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full text-sm"
                onClick={handleAddPdb}
                disabled={pdbIds.length >= 10}
                data-testid="button-add-pdb"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Structure
              </Button>

              <Button
                className="w-full"
                onClick={handleVisualize}
                disabled={validPdbIds.length === 0}
                data-testid="button-visualize"
              >
                Visualize {validPdbIds.length > 0 ? `(${validPdbIds.length})` : ""}
              </Button>

              {validPdbIds.length > 0 && (
                <div className="pt-3 border-t border-border space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Structures Loaded
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {validPdbIds.map((id, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {id}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-border space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Info</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Load up to 10 PDB structures from RCSB PDB. Each structure will be displayed with a
                  different color scheme for easy distinction.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Grid of Viewers */}
        <div className="flex-1 flex flex-col gap-4">
          {validPdbIds.length > 0 ? (
            <div className={`grid ${getGridClass(validPdbIds.length)} gap-4 auto-rows-[350px]`}>
              {validPdbIds.map((pdbId, index) => (
                <StructureViewer
                  key={pdbId}
                  pdbId={pdbId}
                  colorScheme={getColorScheme(index)}
                  onRemove={() => handleRemoveViewer(pdbId)}
                />
              ))}
            </div>
          ) : (
            <Card className="flex-1 border-border p-6 flex items-center justify-center">
              <div className="text-center">
                <Grid3x3 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium text-foreground mb-2">
                  No Structures Loaded
                </p>
                <p className="text-muted-foreground">
                  Enter PDB IDs in the left panel to visualize structures
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
