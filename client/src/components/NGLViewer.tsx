import { useEffect, useRef, useState } from "react";
// @ts-ignore - ngl doesn't have official types yet
import * as NGL from "ngl";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";

interface NGLViewerProps {
  pdbContent?: string | null;
  pdbId?: string | null;
  className?: string;
  interactions?: any[]; // Could pass interactions to visualize later
}

export function NGLViewer({ pdbContent, pdbId, className, interactions }: NGLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize Stage
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const stage = new NGL.Stage(containerRef.current, {
        backgroundColor: "white",
        tooltip: true,
      });
      
      stageRef.current = stage;

      const handleResize = () => stage.handleResize();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        // Clean up stage if method exists in version
        try { stage.dispose(); } catch (e) {}
      };
    } catch (err) {
      console.error("NGL Init Error:", err);
      setError("Failed to initialize 3D viewer");
    }
  }, []);

  // Load Structure
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || (!pdbContent && !pdbId)) return;

    setLoading(true);
    setError(null);

    stage.removeAllComponents();

    const loadPromise = pdbContent
      ? stage.loadFile(new Blob([pdbContent], { type: 'text/plain' }), { ext: "pdb" })
      : stage.loadFile(`rcsb://${pdbId}`);

    loadPromise
      .then((component: any) => {
        // Default representation: Cartoon + Licorice for heteroatoms
        component.addRepresentation("cartoon", {
          colorScheme: "chainid", // Color by chain to see interactions easily
          quality: "high"
        });
        
        component.addRepresentation("licorice", {
          sele: "hetero",
          colorScheme: "element"
        });

        component.autoView();
        
        // If we had coordinates for interactions, we could add shape representations here
        // e.g., drawing lines between interacting atoms
        
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("Structure Load Error:", err);
        setError("Failed to load protein structure");
        setLoading(false);
      });

  }, [pdbContent, pdbId]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-white border border-border shadow-inner ${className} ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : ''}`}>
      <div 
        ref={containerRef} 
        className="w-full h-full min-h-[500px]"
        style={{ cursor: "crosshair" }}
      />
      
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
          <span className="font-medium text-muted-foreground">Rendering structure...</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-destructive/5">
          <div className="text-center p-6 max-w-sm">
            <span className="text-destructive font-bold block mb-2">Error</span>
            <span className="text-muted-foreground">{error}</span>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
         <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg bg-white/90 shadow-md hover:bg-white text-foreground transition-all"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-border text-xs font-mono text-muted-foreground">
          {pdbId ? `PDB: ${pdbId}` : 'Uploaded Structure'}
        </div>
      </div>
    </div>
  );
}
