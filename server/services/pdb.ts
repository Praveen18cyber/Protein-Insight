import type { Atom, Interaction, AnalysisResult, InterfaceResidue } from "@shared/schema";

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

  // Spatial grid for fast neighbor lookup (5Å cutoff = grid cell 5Å)
  const GRID_SIZE = 5;
  const grid: Record<string, Atom[]> = {};
  
  for (const atom of allAtoms) {
    const gridX = Math.floor(atom.x / GRID_SIZE);
    const gridY = Math.floor(atom.y / GRID_SIZE);
    const gridZ = Math.floor(atom.z / GRID_SIZE);
    const key = `${gridX},${gridY},${gridZ}`;
    if (!grid[key]) grid[key] = [];
    grid[key].push(atom);
  }

  // Analyze interactions using spatial grid
  const checked = new Set<string>();
  
  for (const atom_a of allAtoms) {
    const gridX = Math.floor(atom_a.x / GRID_SIZE);
    const gridY = Math.floor(atom_a.y / GRID_SIZE);
    const gridZ = Math.floor(atom_a.z / GRID_SIZE);

    // Check current cell and 26 neighboring cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${gridX + dx},${gridY + dy},${gridZ + dz}`;
          const neighbors = grid[key] || [];

          for (const atom_b of neighbors) {
            // Skip if already checked
            const pairKey = `${Math.min(atom_a.serial, atom_b.serial)}-${Math.max(atom_a.serial, atom_b.serial)}`;
            if (checked.has(pairKey)) continue;
            checked.add(pairKey);

            // Skip same atom
            if (atom_a.serial === atom_b.serial && atom_a.proteinName === atom_b.proteinName) continue;

            const dx = atom_a.x - atom_b.x;
            const dy = atom_a.y - atom_b.y;
            const dz = atom_a.z - atom_b.z;
            const distSq = dx*dx + dy*dy + dz*dz;

            // 5 Angstrom cutoff
            if (distSq <= 25) {
              const distance = Math.sqrt(distSq);
              // Inter-molecular if different proteins OR different chains within same protein
              const isIntra = atom_a.proteinName === atom_b.proteinName && atom_a.chainID === atom_b.chainID;
              
              // Determine interaction type
              let type: Interaction["type"] = "Other";
              
              const isHydrophobic = (res: string) => ['ALA','VAL','LEU','ILE','MET','PHE','TRP','PRO'].includes(res);
              const isCharged = (res: string) => ['ARG','LYS','ASP','GLU','HIS'].includes(res);
              
              if (distance < 3.5) {
                if ((atom_a.element === 'N' || atom_a.element === 'O') && (atom_b.element === 'N' || atom_b.element === 'O')) {
                  type = "Hydrogen Bond";
                } else if (isCharged(atom_a.resName) && isCharged(atom_b.resName)) {
                  type = "Salt Bridge";
                } else {
                  type = "Van der Waals";
                }
              } else {
                if (isHydrophobic(atom_a.resName) && isHydrophobic(atom_b.resName)) {
                  type = "Hydrophobic";
                } else {
                  type = "Van der Waals";
                }
              }

              const interaction: Interaction = {
                id: `${atom_a.serial}-${atom_b.serial}`,
                proteinA: atom_a.proteinName,
                proteinB: atom_b.proteinName,
                chainA: atom_a.chainID,
                chainB: atom_b.chainID,
                residueA: `${atom_a.resName} ${atom_a.resSeq}`,
                residueB: `${atom_b.resName} ${atom_b.resSeq}`,
                atomA: `${atom_a.name} (${atom_a.element})`,
                atomB: `${atom_b.name} (${atom_b.element})`,
                distance,
                type,
                isIntraMolecular: isIntra,
              };

              interactions.push(interaction);

              // Track interacting residues
              const keyA = `${atom_a.proteinName}:${atom_a.chainID}`;
              const keyB = `${atom_b.proteinName}:${atom_b.chainID}`;
              interactingResiduesByChain[keyA]?.add(atom_a.resSeq);
              interactingResiduesByChain[keyB]?.add(atom_b.resSeq);

              // Update metrics
              const metricA = chainMetrics.find(m => m.proteinName === atom_a.proteinName && m.chainId === atom_a.chainID);
              const metricB = chainMetrics.find(m => m.proteinName === atom_b.proteinName && m.chainId === atom_b.chainID);
              if (metricA) {
                if (isIntra) metricA.intraProteinInteractions++;
                else metricA.interProteinInteractions++;
              }
              if (metricB && atom_a.proteinName !== atom_b.proteinName) {
                metricB.interProteinInteractions++;
              }
            }
          }
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

  // 5. Build interface residues data and interaction density
  const interfaceResiduesByChain: Record<string, Map<number, { name: string; types: Set<string> }>> = {};
  const densityByChain: Record<string, Map<number, { name: string; intra: number; inter: number }>> = {};
  
  for (const interaction of interactions) {
    // Track residue A
    const keyA = `${interaction.proteinA}:${interaction.chainA}`;
    if (!interfaceResiduesByChain[keyA]) interfaceResiduesByChain[keyA] = new Map();
    if (!densityByChain[keyA]) densityByChain[keyA] = new Map();
    
    const resSeqA = parseInt(interaction.residueA.split(' ')[1]);
    const resNameA = interaction.residueA.split(' ')[0];
    
    if (!interfaceResiduesByChain[keyA].has(resSeqA)) {
      interfaceResiduesByChain[keyA].set(resSeqA, { name: resNameA, types: new Set() });
    }
    interfaceResiduesByChain[keyA].get(resSeqA)!.types.add(interaction.type);
    
    if (!densityByChain[keyA].has(resSeqA)) {
      densityByChain[keyA].set(resSeqA, { name: resNameA, intra: 0, inter: 0 });
    }
    const densityA = densityByChain[keyA].get(resSeqA)!;
    if (interaction.isIntraMolecular) densityA.intra++;
    else densityA.inter++;

    // Track residue B
    const keyB = `${interaction.proteinB}:${interaction.chainB}`;
    if (!interfaceResiduesByChain[keyB]) interfaceResiduesByChain[keyB] = new Map();
    if (!densityByChain[keyB]) densityByChain[keyB] = new Map();
    
    const resSeqB = parseInt(interaction.residueB.split(' ')[1]);
    const resNameB = interaction.residueB.split(' ')[0];
    
    if (!interfaceResiduesByChain[keyB].has(resSeqB)) {
      interfaceResiduesByChain[keyB].set(resSeqB, { name: resNameB, types: new Set() });
    }
    interfaceResiduesByChain[keyB].get(resSeqB)!.types.add(interaction.type);
    
    if (!densityByChain[keyB].has(resSeqB)) {
      densityByChain[keyB].set(resSeqB, { name: resNameB, intra: 0, inter: 0 });
    }
    const densityB = densityByChain[keyB].get(resSeqB)!;
    if (interaction.isIntraMolecular) densityB.intra++;
    else densityB.inter++;
  }

  // Convert to array format
  const interfaceResidues: Record<string, InterfaceResidue[]> = {};
  for (const [chainKey, residues] of Object.entries(interfaceResiduesByChain)) {
    interfaceResidues[chainKey] = Array.from(residues.entries()).map(([resSeq, data]) => ({
      chainId: chainKey.split(':')[1],
      residueSeq: resSeq,
      residueName: data.name,
      interactionCount: 0,
      interactionTypes: Array.from(data.types),
    }));
  }

  // Convert density to array format
  const interactionDensity: Record<string, Array<{ residueSeq: number; residueName: string; intraCount: number; interCount: number; totalCount: number }>> = {};
  for (const [chainKey, density] of Object.entries(densityByChain)) {
    interactionDensity[chainKey] = Array.from(density.entries()).map(([resSeq, data]) => ({
      residueSeq: resSeq,
      residueName: data.name,
      intraCount: data.intra,
      interCount: data.inter,
      totalCount: data.intra + data.inter,
    })).sort((a, b) => b.totalCount - a.totalCount);
  }

  // 6. Build chain-to-chain interaction summary
  const chainPairMap: Record<string, { intra: number; inter: number }> = {};
  for (const interaction of interactions) {
    const pair = [
      `${interaction.proteinA}:${interaction.chainA}`,
      `${interaction.proteinB}:${interaction.chainB}`,
    ].sort().join(' <-> ');

    if (!chainPairMap[pair]) {
      chainPairMap[pair] = { intra: 0, inter: 0 };
    }

    if (interaction.isIntraMolecular) {
      chainPairMap[pair].intra++;
    } else {
      chainPairMap[pair].inter++;
    }
  }

  const chainInteractionSummary = Object.entries(chainPairMap).map(([pair, counts]) => {
    const [chainA, chainB] = pair.split(' <-> ');
    return {
      chainA,
      chainB,
      intraCount: counts.intra,
      interCount: counts.inter,
      totalCount: counts.intra + counts.inter,
    };
  }).sort((a, b) => b.totalCount - a.totalCount);

  // 7. Limit raw interactions for UI stability (top 1000)
  // We keep the full list for CSV generation, but return a subset for the UI result object
  // if it's too large. However, we'll store the full result in DB for downloads.
  
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
    interactions, // Keep full for now, but we will truncate in the route if needed
    interfaceResidues,
    interactionDensity,
    chainInteractionSummary,
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
