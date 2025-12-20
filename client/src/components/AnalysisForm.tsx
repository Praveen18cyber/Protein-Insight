import { useState, useRef } from "react";
import { useCreateAnalysis } from "@/hooks/use-analysis";
import { Upload, Search, FileText, Loader2, Atom } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

export function AnalysisForm() {
  const [mode, setMode] = useState<"pdb" | "upload">("pdb");
  const [pdbId, setPdbId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createAnalysis = useCreateAnalysis();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (mode === "pdb") {
        if (pdbId.length !== 4) {
          toast({
            title: "Invalid PDB ID",
            description: "Please enter a valid 4-character PDB ID (e.g., 1CRN)",
            variant: "destructive",
          });
          return;
        }

        await createAnalysis.mutateAsync({
          title: `Analysis of PDB ${pdbId.toUpperCase()}`,
          pdbId: pdbId.toUpperCase(),
          status: "pending"
        });
      } else {
        if (!file) {
          toast({
            title: "No file selected",
            description: "Please upload a .pdb file to continue",
            variant: "destructive",
          });
          return;
        }

        const text = await file.text();
        await createAnalysis.mutateAsync({
          title: `Analysis of ${file.name}`,
          originalFilename: file.name,
          fileContent: text,
          status: "pending"
        });
      }
    } catch (error) {
      toast({
        title: "Error starting analysis",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-card border border-border rounded-2xl shadow-xl shadow-primary/5 p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary/10 p-3 rounded-xl">
            <Atom className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">New Analysis</h2>
            <p className="text-muted-foreground text-sm">Analyze protein-protein interactions</p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="flex bg-muted p-1 rounded-xl mb-8 relative">
          <button
            onClick={() => setMode("pdb")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              mode === "pdb" 
                ? "bg-white text-primary shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            PDB ID
          </button>
          <button
            onClick={() => setMode("upload")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              mode === "upload" 
                ? "bg-white text-primary shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upload File
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === "pdb" ? (
            <div className="space-y-3">
              <label className="text-sm font-medium ml-1">PDB Accession Code</label>
              <div className="relative group">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="e.g. 1CRN, 4HHB"
                  maxLength={4}
                  value={pdbId}
                  onChange={(e) => setPdbId(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase placeholder:normal-case font-mono"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground ml-1">Fetches structure directly from RCSB PDB.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-sm font-medium ml-1">Structure File (.pdb)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                  ${file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdb,.ent"
                  className="hidden"
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="font-medium text-foreground">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-xs text-destructive hover:underline mt-2"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="w-10 h-10 mb-2 opacity-50" />
                    <span className="font-medium">Click to upload or drag & drop</span>
                    <span className="text-xs">Supports .pdb files</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={createAnalysis.isPending || (mode === "pdb" ? !pdbId : !file)}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {createAnalysis.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Initializing...
              </>
            ) : (
              <>Run Analysis</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
