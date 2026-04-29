import { useEffect, useRef, useState, memo } from "react";
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
  highlightResidues?: Array<{ chainId: string; residueSeq: number }>;
  colorScheme?: string;
}

function NGLViewerComponent({ proteins = [], className, highlightResidues = [], colorScheme }: NGLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const componentsRef = useRef<any[]>([]);

  // Initialize Stage
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const stage = new NGL.Stage(containerRef.current, {
        backgroundColor: "white",
        tooltip: true,
        sampleLevel: -1, // Disable supersampling for better performance
        antialias: false, // Disable anti-aliasing during interaction
      });
      
      stageRef.current = stage;
      
      // Optimize rendering for performance
      stage.setQuality("medium");

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
    const colors = colorScheme ? [colorScheme] : [
      "spectrum",
      "bfactor",
      "chainid",
      "residueindex",
      "hydrophobicity"
    ];

    Promise.all(
      proteins.map((protein, idx) => {
        const colorScheme = colors[idx % colors.length];
        
        if (!protein.pdbId && !protein.pdbContent) {
          console.error(`Protein ${idx} has no pdbId or pdbContent`);
          return Promise.reject(new Error("No content or ID"));
        }

        const loadPromise = protein.pdbContent
          ? stage.loadFile(new Blob([protein.pdbContent], { type: 'text/plain' }), { ext: "pdb" })
          : protein.pdbId
          ? (() => {
              const pdbId = protein.pdbId.trim().toUpperCase();
              console.log(`NGLViewer: Loading PDB from RCSB: rcsb://${pdbId}`);
              return stage.loadFile(`rcsb://${pdbId}`);
            })()
          : Promise.reject(new Error("No content or ID"));

        return loadPromise
          .then((component: any) => {
            console.log(`NGLViewer: Successfully loaded ${protein.name}`);
            // Add cartoon representation with medium quality
            component.addRepresentation("cartoon", {
              colorScheme: colorScheme,
              quality: "medium",
              aspectRatio: 5.0
            });
            
            // Add simple ball+stick for heteroatoms (lighter than licorice)
            component.addRepresentation("ball+stick", {
              sele: "hetero",
              colorScheme: "element",
              scale: 0.8,
              aspectRatio: 1.0
            });

            componentsRef.current.push(component);
            successCount++;
            setLoadedCount(successCount);
            return true;
          })
          .catch((err: any) => {
            console.error(`Failed to load ${protein.name}:`, err?.message || err);
            hasError = true;
            return false;
          });
      })
    ).then(() => {
      setLoading(false);
      if (successCount === 0) {
        setError("Failed to load any protein structures");
      } else if (successCount < proteins.length) {
        // Some loaded, some failed - just show what we have
        setTimeout(() => stage.autoView(), 100);
      } else {
        // All loaded successfully
        setTimeout(() => stage.autoView(), 100);
      }
    }).catch((err: any) => {
      console.error("NGLViewer Promise.all error:", err);
      setError("Failed to load protein structures");
      setLoading(false);
    });

  }, [proteins]);

  // Update highlighted residues
  useEffect(() => {
    if (!stageRef.current || componentsRef.current.length === 0) {
      console.log("NGLViewer: Skipping highlight - stage or components not ready", {
        hasStage: !!stageRef.current,
        componentCount: componentsRef.current.length,
      });
      return;
    }

    console.log("NGLViewer: Processing highlight for", highlightResidues.length, "residues", highlightResidues);

    // Clear existing highlight representations
    componentsRef.current.forEach(comp => {
      if (!comp.reprList) return;
      const reprsToRemove = comp.reprList.filter((r: any) => r.name === "highlight-interface");
      reprsToRemove.forEach((repr: any) => {
        try {
          comp.removeRepresentation(repr);
          console.log("NGLViewer: Removed highlight representation");
        } catch (e) {
          console.log("NGLViewer: Error removing representation", e);
        }
      });
    });

    // Add highlight only if toggled on
    if (highlightResidues.length > 0) {
      componentsRef.current.forEach(component => {
        try {
          // Use NGL's proper selection syntax: "resno 1 or resno 2 or ..."
          const selectionString = highlightResidues
            .map(r => `resno ${r.residueSeq}`)
            .join(" or ");
          
          console.log("NGLViewer: Adding highlight with selection:", selectionString);
          
          if (selectionString) {
            // Use ball+stick representation with hotpink color for clear visibility
            component.addRepresentation("ball+stick", {
              sele: selectionString,
              colorScheme: "uniform",
              color: "hotpink",
              name: "highlight-interface",
            });
            console.log("NGLViewer: Highlight representation added successfully");
          }
        } catch (err) {
          console.log("NGLViewer: Error adding highlight", err);
        }
      });
    }
  }, [highlightResidues]);

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

export const NGLViewer = memo(NGLViewerComponent);
