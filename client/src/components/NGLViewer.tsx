import { useEffect, useRef, useState } from "react";
// @ts-ignore - ngl doesn't have official types yet
import * as NGL from "ngl";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";

interface ProteinToLoad {
  pdbId?: string;
  pdbContent?: string;
  name: string;
}

interface NGLViewerProps {
  proteins?: ProteinToLoad[];
  className?: string;
}

export function NGLViewer({ proteins = [], className }: NGLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

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
        try { stage.dispose(); } catch (e) {}
      };
    } catch (err) {
      console.error("NGL Init Error:", err);
      setError("Failed to initialize 3D viewer");
    }
  }, []);

  // Load All Structures
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !proteins || proteins.length === 0) return;

    setLoading(true);
    setError(null);
    setLoadedCount(0);

    stage.removeAllComponents();

    let successCount = 0;
    let hasError = false;

    // Color schemes for different proteins
    const colors = [
      "spectrum",
      "bfactor",
      "chainid",
      "residueindex",
      "hydrophobicity"
    ];

    Promise.all(
      proteins.map((protein, idx) => {
        const colorScheme = colors[idx % colors.length];
        
        const loadPromise = protein.pdbContent
          ? stage.loadFile(new Blob([protein.pdbContent], { type: 'text/plain' }), { ext: "pdb" })
          : protein.pdbId
          ? stage.loadFile(`rcsb://${protein.pdbId}`)
          : Promise.reject(new Error("No content or ID"));

        return loadPromise
          .then((component: any) => {
            // Add cartoon representation
            component.addRepresentation("cartoon", {
              colorScheme: colorScheme,
              quality: "high"
            });
            
            // Add licorice for heteroatoms
            component.addRepresentation("licorice", {
              sele: "hetero",
              colorScheme: "element"
            });

            successCount++;
            setLoadedCount(successCount);
            return true;
          })
          .catch((err: any) => {
            console.error(`Failed to load ${protein.name}:`, err);
            hasError = true;
            return false;
          });
      })
    ).then(() => {
      if (successCount > 0) {
        // Auto-fit view to all loaded structures
        setTimeout(() => stage.autoView(), 100);
        setLoading(false);
      } else {
        setError("Failed to load any protein structures");
        setLoading(false);
      }
    });

  }, [proteins]);

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
          <span className="font-medium text-muted-foreground">
            Loading structures... {loadedCount}/{proteins.length}
          </span>
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
          {proteins.length > 0 ? `${proteins.length} structures` : 'Structure Viewer'}
        </div>
      </div>
    </div>
  );
}
