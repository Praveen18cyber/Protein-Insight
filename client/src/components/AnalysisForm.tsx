import { useState, useRef } from "react";
import { useCreateAnalysis } from "@/hooks/use-analysis";
import { Upload, Search, FileText, Loader2, Atom, X } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

export function AnalysisForm() {
  const [mode, setMode] = useState<"pdb" | "upload">("pdb");
  const [protein, setProtein] = useState<{ name: string; pdbId?: string; filename?: string; content?: string } | null>(null);
  const [pdbInput, setPdbInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createAnalysis = useCreateAnalysis();
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdb') && !file.name.toLowerCase().endsWith('.ent')) {
        toast({
          title: "Invalid file",
          description: "Only .pdb and .ent files are supported",
          variant: "destructive",
        });
        return;
      }
      
      const content = await file.text();
      setProtein({
        name: file.name.split('.')[0],
        filename: file.name,
        content
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addPdbId = (id: string) => {
    if (id.length !== 4) {
      toast({ title: "Invalid PDB ID", description: "Use 4 characters like 1CRN", variant: "destructive" });
      return;
    }
    setProtein({ name: id.toUpperCase(), pdbId: id.toUpperCase() });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let sourceProtein = protein;
    
    // If PDB mode and no protein added yet, try to add from input
    if (mode === "pdb" && !sourceProtein && pdbInput) {
      if (pdbInput.length !== 4) {
        toast({ title: "Invalid PDB ID", description: "Use 4 characters like 1CRN", variant: "destructive" });
        return;
      }
      sourceProtein = { name: pdbInput.toUpperCase(), pdbId: pdbInput.toUpperCase() };
    }
    
    if (!sourceProtein) {
      toast({
        title: "No protein added",
        description: "Please enter a PDB ID or upload a file",
        variant: "destructive",
      });
      return;
    }

    try {
      await createAnalysis.mutateAsync({
        title: `Analysis: ${sourceProtein.name}`,
        proteinSource: { name: sourceProtein.name, pdbId: sourceProtein.pdbId, filename: sourceProtein.filename },
        proteinContent: sourceProtein.content || ''
      });
      setPdbInput("");
    } catch (error) {
      toast({
        title: "Error starting analysis",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-2xl shadow-xl shadow-primary/5 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary/10 p-3 rounded-xl">
            <Atom className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Protein Structure Analysis</h2>
            <p className="text-muted-foreground text-sm">Upload or enter a protein structure to analyze interactions</p>
          </div>
        </div>

        <div className="flex bg-muted p-1 rounded-xl mb-8">
          <button
            onClick={() => setMode("pdb")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              mode === "pdb" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            PDB ID
          </button>
          <button
            onClick={() => setMode("upload")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              mode === "upload" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            Upload Files
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === "pdb" ? (
            <div className="space-y-3">
              <label className="text-sm font-medium">Enter PDB ID</label>
              <input
                type="text"
                placeholder="e.g. 1CRN"
                maxLength={4}
                id="pdb-input"
                value={pdbInput}
                onChange={(e) => setPdbInput(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase placeholder:normal-case font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pdbInput) {
                    addPdbId(pdbInput);
                    setPdbInput('');
                  }
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-sm font-medium">Upload .pdb File</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  protein ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdb,.ent"
                  className="hidden"
                />
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <span className="font-medium text-sm">Click or drag a file here</span>
                <p className="text-xs text-muted-foreground">Single file only</p>
              </div>
            </div>
          )}

          {/* Protein Selection */}
          {protein && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Selected Protein</h3>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-mono font-semibold text-sm">{protein.name}</div>
                    <div className="text-xs text-muted-foreground">{protein.pdbId || protein.filename}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProtein(null)}
                  className="p-1 hover:bg-background rounded transition-colors"
                  data-testid="button-remove-protein"
                >
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={createAnalysis.isPending || (!protein && !(mode === "pdb" && pdbInput.length === 4))}
            className="w-full py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            data-testid="button-submit-analysis"
          >
            {createAnalysis.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>Analyze Interactions</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
