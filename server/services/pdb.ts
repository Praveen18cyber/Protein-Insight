import type { Atom, Interaction, AnalysisResult } from "@shared/schema";

// 1. PDB STRUCTURE EXTRACTION
export function parsePDB(content: string, proteinName: string): Atom[] {
  const atoms: Atom[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
      // PDB Fixed Width Format
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
        proteinName,
      };
      atoms.push(atom);
    }
  }
  return atoms;
}

// 2. PROTEIN–PROTEIN & INTRA-PROTEIN INTERACTION DETECTION
export function analyzeInteractions(atomsByProtein: Record<string, Atom[]>): AnalysisResult {
  const interactions: Interaction[] = [];
  const allAtoms = Object.values(atomsByProtein).flat();
  const proteins = Object.keys(atomsByProtein);

  // Build chain metrics
  const chainMetrics: AnalysisResult['chains'] = [];
  const interactingResiduesByChain: Record<string, Set<number>> = {};

  for (const proteinName of proteins) {
    const atoms = atomsByProtein[proteinName];
    const chainIds = new Set(atoms.map(a => a.chainID));

    for (const chainId of chainIds) {
      const chainKey = `${proteinName}:${chainId}`;
      interactingResiduesByChain[chainKey] = new Set();
      
      const chainAtoms = atoms.filter(a => a.chainID === chainId);
      chainMetrics.push({
        proteinName,
        chainId,
        residueCount: new Set(chainAtoms.map(a => a.resSeq)).size,
        atomCount: chainAtoms.length,
        interactingResidues: 0,
        intraProteinInteractions: 0,
        interProteinInteractions: 0,
      });
    }
  }

  // Analyze all pairwise interactions (both intra and inter)
  for (let i = 0; i < allAtoms.length; i++) {
    const a = allAtoms[i];
    for (let j = i + 1; j < allAtoms.length; j++) {
      const b = allAtoms[j];
      
      // Skip same atom
      if (a.serial === b.serial && a.proteinName === b.proteinName) continue;

      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const distSq = dx*dx + dy*dy + dz*dz;

      // 5 Angstrom cutoff
      if (distSq <= 25) {
        const distance = Math.sqrt(distSq);
        const isIntra = a.proteinName === b.proteinName;
        
        // Determine interaction type
        let type: Interaction["type"] = "Other";
        
        const isHydrophobic = (res: string) => ['ALA','VAL','LEU','ILE','MET','PHE','TRP','PRO'].includes(res);
        const isCharged = (res: string) => ['ARG','LYS','ASP','GLU','HIS'].includes(res);
        
        if (distance < 3.5) {
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

        const interaction: Interaction = {
          id: `${a.serial}-${b.serial}`,
          proteinA: a.proteinName,
          proteinB: b.proteinName,
          chainA: a.chainID,
          chainB: b.chainID,
          residueA: `${a.resName} ${a.resSeq}`,
          residueB: `${b.resName} ${b.resSeq}`,
          atomA: `${a.name} (${a.element})`,
          atomB: `${b.name} (${b.element})`,
          distance,
          type,
          isIntraMolecular: isIntra,
        };

        interactions.push(interaction);

        // Track interacting residues
        const keyA = `${a.proteinName}:${a.chainID}`;
        const keyB = `${b.proteinName}:${b.chainID}`;
        interactingResiduesByChain[keyA]?.add(a.resSeq);
        interactingResiduesByChain[keyB]?.add(b.resSeq);

        // Update metrics
        const metricA = chainMetrics.find(m => m.proteinName === a.proteinName && m.chainId === a.chainID);
        const metricB = chainMetrics.find(m => m.proteinName === b.proteinName && m.chainId === b.chainID);
        if (metricA) {
          if (isIntra) metricA.intraProteinInteractions++;
          else metricA.interProteinInteractions++;
        }
        if (metricB && a.proteinName !== b.proteinName) {
          metricB.interProteinInteractions++;
        }
      }
    }
  }

  // Update interacting residue counts
  chainMetrics.forEach(m => {
    const key = `${m.proteinName}:${m.chainId}`;
    m.interactingResidues = interactingResiduesByChain[key]?.size || 0;
  });

  const totalInteractions = interactions.length;
  const intraCount = interactions.filter(i => i.isIntraMolecular).length;
  const interCount = totalInteractions - intraCount;

  return {
    summary: {
      totalProteins: proteins.length,
      totalChains: chainMetrics.length,
      totalAtoms: allAtoms.length,
      totalInteractions,
      intraProteinInteractions: intraCount,
      interProteinInteractions: interCount,
    },
    chains: chainMetrics,
    interactions
  };
}

export function generateInteractionCSV(interactions: Interaction[]): string {
  const header = "Protein_A,Chain_A,Residue_A,Atom_A,Protein_B,Chain_B,Residue_B,Atom_B,Type,Distance_Angstrom,Interaction_Category\n";
  const rows = interactions.map(i => {
    const category = i.isIntraMolecular ? "Intra-Protein" : "Inter-Protein";
    return `${i.proteinA},${i.chainA},"${i.residueA}","${i.atomA}",${i.proteinB},${i.chainB},"${i.residueB}","${i.atomB}",${i.type},${i.distance.toFixed(3)},${category}`;
  }).join('\n');
  return header + rows;
}

export function generateInterProteinCSV(interactions: Interaction[]): string {
  const filtered = interactions.filter(i => !i.isIntraMolecular);
  const header = "Protein_A,Chain_A,Residue_A,Atom_A,Protein_B,Chain_B,Residue_B,Atom_B,Type,Distance_Angstrom\n";
  const rows = filtered.map(i => 
    `${i.proteinA},${i.chainA},"${i.residueA}","${i.atomA}",${i.proteinB},${i.chainB},"${i.residueB}","${i.atomB}",${i.type},${i.distance.toFixed(3)}`
  ).join('\n');
  return header + rows;
}

export function generateIntraProteinCSV(interactions: Interaction[]): string {
  const filtered = interactions.filter(i => i.isIntraMolecular);
  const header = "Protein,Chain_A,Chain_B,Residue_A,Atom_A,Residue_B,Atom_B,Type,Distance_Angstrom\n";
  const rows = filtered.map(i => 
    `${i.proteinA},${i.chainA},${i.chainB},"${i.residueA}","${i.atomA}","${i.residueB}","${i.atomB}",${i.type},${i.distance.toFixed(3)}`
  ).join('\n');
  return header + rows;
}

export function generateStructureCSV(atoms: Atom[]): string {
  const header = "Protein,Chain,Residue,Residue_Seq,Atom_Name,Atom_Serial,X,Y,Z,Element,Occupancy,B_Factor\n";
  const rows = atoms.map(a => 
    `${a.proteinName},${a.chainID},${a.resName},${a.resSeq},${a.name},${a.serial},${a.x},${a.y},${a.z},${a.element},${a.occupancy},${a.tempFactor}`
  ).join('\n');
  return header + rows;
}
