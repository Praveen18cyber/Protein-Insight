import { AnalysisForm } from "@/components/AnalysisForm";
import { Dna, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <Dna className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">BioInteract</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="https://rcsb.org" target="_blank" rel="noreferrer" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              RCSB PDB
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Documentation
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Research Grade Analysis
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            Protein-Protein Interaction <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Structural Analysis</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
            Upload a PDB file or enter an accession code to instantly visualize interfaces, 
            calculate bond distances, and classify interaction types with scientific precision.
          </p>
        </div>

        <div className="relative z-10 w-full mb-20">
          <AnalysisForm />
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
            {[
                { title: "3D Visualization", desc: "Interactive NGL viewer with chain-specific coloring and surface rendering." },
                { title: "Interaction Profiling", desc: "Classify H-bonds, Salt Bridges, and Hydrophobic contacts automatically." },
                { title: "Export Ready", desc: "Download comprehensive CSV reports for your publications." }
            ].map((f, i) => (
                <div key={i} className="p-6 rounded-2xl bg-white border border-border shadow-sm hover:border-primary/50 transition-colors">
                    <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                    <p className="text-muted-foreground text-sm">{f.desc}</p>
                </div>
            ))}
        </div>
      </main>

      <footer className="border-t border-border bg-white py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 BioInteract Platform. For Research Use Only.</p>
        </div>
      </footer>
    </div>
  );
}
