import type { Atom, Interaction, AnalysisResult } from "@shared/schema";

// 1. PDB STRUCTURE EXTRACTION
export function parsePDB(content: string): Atom[] {
  const atoms: Atom[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
      // PDB Fixed Width Format
      // https://www.wwpdb.org/documentation/file-format-content/format33/sect9.html#ATOM
      const atom: Atom = {
        serial: parseInt(line.substring(6, 11).trim()),
        name: line.substring(12, 16).trim(),
        altLoc: line.substring(16, 17).trim(),
        resName: line.substring(17, 20).trim(),
        chainID: line.substring(21, 22).trim(),
        resSeq: parseInt(line.substring(22, 26).trim()),
        iCode: line.substring(26, 27).trim(),
        x: parseFloat(line.substring(30, 38).trim()),
        y: parseFloat(line.substring(38, 46).trim()),
        z: parseFloat(line.substring(46, 54).trim()),
        occupancy: parseFloat(line.substring(54, 60).trim()) || 0,
        tempFactor: parseFloat(line.substring(60, 66).trim()) || 0,
        element: line.substring(76, 78).trim(),
        charge: line.substring(78, 80).trim(),
      };
      atoms.push(atom);
    }
  }
  return atoms;
}

// 2. PROTEIN–PROTEIN INTERACTION DETECTION
export function analyzeInteractions(atoms: Atom[]): AnalysisResult {
  const interactions: Interaction[] = [];
  const atomsByChain: Record<string, Atom[]> = {};

  // Group by chain
  for (const atom of atoms) {
    if (!atomsByChain[atom.chainID]) {
      atomsByChain[atom.chainID] = [];
    }
    atomsByChain[atom.chainID].push(atom);
  }

  const chains = Object.keys(atomsByChain);
  const chainMetrics: AnalysisResult['chains'] = chains.map(id => ({
    chainId: id,
    residueCount: new Set(atomsByChain[id].map(a => a.resSeq)).size,
    atomCount: atomsByChain[id].length,
    interactingResidues: 0 // Will calculate below
  }));

  const interactingResiduesByChain: Record<string, Set<number>> = {};
  chains.forEach(c => interactingResiduesByChain[c] = new Set());

  // Pairwise chain analysis
  for (let i = 0; i < chains.length; i++) {
    for (let j = i + 1; j < chains.length; j++) {
      const chainA = chains[i];
      const chainB = chains[j];
      const atomsA = atomsByChain[chainA];
      const atomsB = atomsByChain[chainB];

      // Brute force optimized (bounding box check could be added for speed)
      for (const a of atomsA) {
        // Skip Hydrogens for performance in rough contact detection if needed, but keeping for H-bonds
        // Let's keep all.
        
        for (const b of atomsB) {
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dz = a.z - b.z;
          const distSq = dx*dx + dy*dy + dz*dz;

          // 5 Angstrom cutoff (squared is 25)
          if (distSq <= 25) {
            const distance = Math.sqrt(distSq);
            
            // 3. INTERACTION TYPE CLASSIFICATION (Simplified)
            let type: Interaction["type"] = "Other";
            
            // Heuristics
            const isHydrophobic = (res: string) => ['ALA','VAL','LEU','ILE','MET','PHE','TRP','PRO'].includes(res);
            const isCharged = (res: string) => ['ARG','LYS','ASP','GLU','HIS'].includes(res);
            
            if (distance < 3.5) {
               // Potential H-bond or Salt Bridge
               if ((a.element === 'N' || a.element === 'O') && (b.element === 'N' || b.element === 'O')) {
                 type = "Hydrogen Bond";
               } else if (isCharged(a.resName) && isCharged(b.resName)) {
                 type = "Salt Bridge";
               } else {
                 type = "Van der Waals";
               }
            } else {
               if (isHydrophobic(a.resName) && isHydrophobic(b.resName)) {
                 type = "Hydrophobic";
               } else {
                 type = "Van der Waals";
               }
            }

            interactions.push({
              id: `${a.serial}-${b.serial}`,
              proteinA: chainA,
              proteinB: chainB,
              residueA: `${a.resName} ${a.resSeq}`,
              residueB: `${b.resName} ${b.resSeq}`,
              atomA: `${a.name} (${a.element})`,
              atomB: `${b.name} (${b.element})`,
              distance,
              type
            });

            interactingResiduesByChain[chainA].add(a.resSeq);
            interactingResiduesByChain[chainB].add(b.resSeq);
          }
        }
      }
    }
  }

  // Update metrics
  chainMetrics.forEach(m => {
    m.interactingResidues = interactingResiduesByChain[m.chainId].size;
  });

  return {
    summary: {
      chains,
      totalInteractions: interactions.length
    },
    chains: chainMetrics,
    interactions
  };
}

export function generateInteractionCSV(interactions: Interaction[]): string {
  const header = "Protein_A_Chain,Residue_A,Atom_A,Protein_B_Chain,Residue_B,Atom_B,Interaction_Type,Distance_Angstrom\n";
  const rows = interactions.map(i => 
    `${i.proteinA},"${i.residueA}","${i.atomA}",${i.proteinB},"${i.residueB}","${i.atomB}",${i.type},${i.distance.toFixed(3)}`
  ).join('\n');
  return header + rows;
}

export function generatePdbCSV(atoms: Atom[]): string {
  const header = "Chain,Residue,Residue_Seq,Atom_Name,Atom_Serial,X,Y,Z,Element,Occupancy,B_Factor\n";
  const rows = atoms.map(a => 
    `${a.chainID},${a.resName},${a.resSeq},${a.name},${a.serial},${a.x},${a.y},${a.z},${a.element},${a.occupancy},${a.tempFactor}`
  ).join('\n');
  return header + rows;
}
