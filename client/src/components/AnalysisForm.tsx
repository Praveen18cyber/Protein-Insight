import { useState, useRef } from "react";
import { useCreateAnalysis } from "@/hooks/use-analysis";
import { Upload, Search, FileText, Loader2, Atom, X, Plus } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { ProteinSource } from "@shared/schema";

export function AnalysisForm() {
  const [mode, setMode] = useState<"pdb" | "upload">("pdb");
  const [proteins, setProteins] = useState<(ProteinSource & { content?: string })[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createAnalysis = useCreateAnalysis();
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (!file.name.toLowerCase().endsWith('.pdb') && !file.name.toLowerCase().endsWith('.ent')) {
          toast({
            title: "Invalid file",
            description: "Only .pdb and .ent files are supported",
            variant: "destructive",
          });
          continue;
        }
        
        const content = await file.text();
        setProteins(p => [...p, {
          name: file.name.split('.')[0],
          filename: file.name,
          content
        }]);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addPdbId = (id: string) => {
    if (id.length !== 4) {
      toast({ title: "Invalid PDB ID", description: "Use 4 characters like 1CRN", variant: "destructive" });
      return;
    }
    if (proteins.find(p => p.pdbId?.toUpperCase() === id.toUpperCase())) {
      toast({ title: "Already added", description: "This PDB ID is already in the list", variant: "destructive" });
      return;
    }
    setProteins(p => [...p, { name: id.toUpperCase(), pdbId: id.toUpperCase() }]);
  };

  const removeProtein = (idx: number) => {
    setProteins(p => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (proteins.length === 0) {
      toast({
        title: "No proteins added",
        description: "Please add at least one PDB ID or upload a file",
        variant: "destructive",
      });
      return;
    }

    try {
      const proteinContents: Record<string, string> = {};
      const sources: ProteinSource[] = [];

      for (const p of proteins) {
        sources.push({ name: p.name, pdbId: p.pdbId, filename: p.filename });
        if (p.content) {
          proteinContents[p.name] = p.content;
        }
      }

      await createAnalysis.mutateAsync({
        title: `Analysis: ${sources.map(s => s.name).join(', ')}`,
        proteinSources: sources,
        proteinContents
      });
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
            <h2 className="text-2xl font-bold tracking-tight">Multi-Protein Analysis</h2>
            <p className="text-muted-foreground text-sm">Add 2+ proteins to analyze inter-protein interactions</p>
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
              <label className="text-sm font-medium">Add PDB IDs</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 1CRN"
                  maxLength={4}
                  id="pdb-input"
                  className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase placeholder:normal-case font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById("pdb-input") as HTMLInputElement;
                    if (input.value) {
                      addPdbId(input.value);
                      input.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-sm font-medium">Upload .pdb Files</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  proteins.length > 0 ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdb,.ent"
                  multiple
                  className="hidden"
                />
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <span className="font-medium text-sm">Click or drag files here</span>
                <p className="text-xs text-muted-foreground">Multi-select supported</p>
              </div>
            </div>
          )}

          {/* Protein List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Added Proteins ({proteins.length})</h3>
            <div className="space-y-2">
              {proteins.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No proteins added yet</p>
              ) : (
                proteins.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <div>
                        <div className="font-mono font-semibold text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.pdbId || p.filename}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProtein(idx)}
                      className="p-1 hover:bg-background rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={createAnalysis.isPending || proteins.length < 1}
            className="w-full py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
