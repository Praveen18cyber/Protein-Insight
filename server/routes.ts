import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { parsePDB, analyzeInteractions, calculateBindingAffinityIndex, generateInteractionCSV, generateInterProteinCSV, generateIntraProteinCSV, generateStructureCSV, fetchPDBMetadata } from "./services/pdb";
import { z } from "zod";
import { analysisSessions, proteinMetadata, interactionTypeCounts, chainPairStats, type AnalysisResult } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Create Analysis with Single Protein
  app.post(api.analysis.create.path, async (req, res) => {
    try {
      const input = req.body;
      let pdbContent = input.proteinContent;

      if (!pdbContent && input.proteinSource.pdbId) {
        try {
          const pdbIdUpper = input.proteinSource.pdbId.toUpperCase();
          const fetchUrl = `https://files.rcsb.org/download/${pdbIdUpper}.pdb`;
          const rcsbRes = await fetch(fetchUrl);
          if (!rcsbRes.ok) throw new Error(`HTTP ${rcsbRes.status}`);
          pdbContent = await rcsbRes.text();
        } catch (error) {
          return res.status(400).json({ message: `Could not fetch PDB ID ${input.proteinSource.pdbId}` });
        }
      }

      if (!pdbContent) return res.status(400).json({ message: "No PDB content" });

      const atoms = parsePDB(pdbContent, input.proteinSource.name);
      if (atoms.length === 0) return res.status(400).json({ message: "Invalid PDB content" });

      const result = analyzeInteractions({ [input.proteinSource.name]: atoms });
      result.bindingAffinity = calculateBindingAffinityIndex(result);

      // 1. Ensure Protein Metadata exists
      let proteinId: number;
      const existingProtein = input.proteinSource.pdbId ? await db.select().from(proteinMetadata).where(eq(proteinMetadata.pdbId, input.proteinSource.pdbId.toUpperCase())).limit(1) : [];
      
      if (existingProtein.length > 0) {
        proteinId = existingProtein[0].id;
      } else {
        let meta: any = null;
        if (input.proteinSource.pdbId) {
          meta = await fetchPDBMetadata(input.proteinSource.pdbId);
        }

        const [newProtein] = await db.insert(proteinMetadata).values({
          pdbId: input.proteinSource.pdbId?.toUpperCase(),
          name: input.proteinSource.name,
          sourceType: input.proteinSource.pdbId ? 'rcsb' : 'upload',
          resolution: meta?.resolution ? parseFloat(meta.resolution) : null,
          organism: meta?.organism || null,
          method: meta?.method || null,
          year: meta?.year || null,
          metadata: meta || null,
          pdbContent: pdbContent, // Store content for visualization
        }).returning();
        proteinId = newProtein.id;
      }

      // 2. Save Analysis Session
      const [session] = await db.insert(analysisSessions).values({
        proteinId,
        title: input.title,
        status: "completed",
        resultSummary: result,
      }).returning();

      // 3. Save Interaction Type Counts
      const typeCounts: Record<string, number> = {};
      result.interactions.forEach(i => {
        typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
      });

      await Promise.all(Object.entries(typeCounts).map(([type, count]) => 
        db.insert(interactionTypeCounts).values({
          sessionId: session.id,
          interactionType: type,
          interactionCount: count,
        })
      ));

      // 4. Save Chain Pair Stats
      if (result.chainInteractionSummary) {
        await Promise.all(result.chainInteractionSummary.map(stat => 
          db.insert(chainPairStats).values({
            sessionId: session.id,
            chainA: stat.chainA,
            chainB: stat.chainB,
            interCount: stat.interCount,
            intraCount: stat.intraCount,
          })
        ));
      }

      res.status(201).json({ ...session, result: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Get Analysis
  app.get(api.analysis.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const [session] = await db.select().from(analysisSessions).where(eq(analysisSessions.id, id));
    if (!session) return res.status(404).json({ message: "Not found" });

    // Include protein metadata for the frontend structure viewer
    let [protein] = await db.select().from(proteinMetadata).where(eq(proteinMetadata.id, session.proteinId!)).limit(1);

    // Backfill metadata if missing and it's an RCSB source
    if (protein && !protein.method && protein.pdbId && protein.sourceType === 'rcsb') {
      try {
        const meta = await fetchPDBMetadata(protein.pdbId);
        if (meta) {
          const [updatedProtein] = await db.update(proteinMetadata)
            .set({
              resolution: meta.resolution ? parseFloat(meta.resolution as any) : null,
              organism: meta.organism,
              method: meta.method,
              year: meta.year,
              metadata: meta
            })
            .where(eq(proteinMetadata.id, protein.id))
            .returning();
          protein = updatedProtein;
        }
      } catch (e) {
        console.error("Failed to backfill metadata:", e);
      }
    }

    const result = session.resultSummary as any;
    // Optimization: Truncate for UI
    if (result && Array.isArray(result.interactions) && result.interactions.length > 1000) {
      result.fullInteractionsCount = result.interactions.length;
      result.interactions = result.interactions.slice(0, 1000);
    }
    
    res.json({ ...session, proteinMetadata: protein, result });
  });

  // Download Inter-Protein Interactions CSV
  app.get(api.analysis.downloadInterProtein.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const session = await storage.getAnalysisSession(id);
    if (!session || !session.resultSummary) {
      return res.status(404).json({ message: "Analysis session or result not found" });
    }

    const result = session.resultSummary as unknown as AnalysisResult;
    const csv = generateInterProteinCSV(result.interactions);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`analysis_${id}_inter-protein.csv`);
    res.send(csv);
  });

  // Download Intra-Protein Interactions CSV
  app.get(api.analysis.downloadIntraProtein.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const session = await storage.getAnalysisSession(id);
    if (!session || !session.resultSummary) {
      return res.status(404).json({ message: "Analysis session or result not found" });
    }

    const result = session.resultSummary as unknown as AnalysisResult;
    const csv = generateIntraProteinCSV(result.interactions);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`analysis_${id}_intra-protein.csv`);
    res.send(csv);
  });

  // Download Structure/Coordinates CSV
  app.get(api.analysis.downloadStructure.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const session = await storage.getAnalysisSession(id);
    if (!session) {
      return res.status(404).json({ message: "Not found" });
    }

    const protein = await db.select().from(proteinMetadata).where(eq(proteinMetadata.id, session.proteinId!)).limit(1);
    if (protein.length === 0) return res.status(404).json({ message: "Protein metadata not found" });

    const source = protein[0];
    const allAtoms: any[] = [];

    try {
      let content: string;
      
      if (source.pdbId) {
        const rcsbRes = await fetch(`https://files.rcsb.org/download/${source.pdbId.toUpperCase()}.pdb`);
        if (!rcsbRes.ok) throw new Error("Failed to fetch");
        content = await rcsbRes.text();
      } else {
        return res.status(400).json({ message: "Cannot generate structure CSV for uploaded files" });
      }

      const atoms = parsePDB(content, source.name);
      allAtoms.push(...atoms);

      if (allAtoms.length === 0) {
        return res.status(400).json({ message: "No structure data available" });
      }

      const csv = generateStructureCSV(allAtoms);
      res.header('Content-Type', 'text/csv');
      res.attachment(`analysis_${id}_structure.csv`);
      res.send(csv);
    } catch (e) {
      res.status(500).json({ message: "Failed to generate structure CSV" });
    }
  });

  app.post("/api/compare", async (req, res) => {
    try {
      const input = req.body;
      const fetchPDB = async (pdbId: string) => {
        const response = await fetch(`https://files.rcsb.org/download/${pdbId.toUpperCase()}.pdb`);
        if (!response.ok) throw new Error(`Could not fetch PDB ${pdbId}`);
        return response.text();
      };

      const [contentA, contentB] = await Promise.all([
        fetchPDB(input.sourceA.pdbId),
        fetchPDB(input.sourceB.pdbId)
      ]);

      const atomsA = parsePDB(contentA, input.sourceA.name);
      const atomsB = parsePDB(contentB, input.sourceB.name);

      const resultA = analyzeInteractions({ [input.sourceA.name]: atomsA });
      const resultB = analyzeInteractions({ [input.sourceB.name]: atomsB });

      resultA.bindingAffinity = calculateBindingAffinityIndex(resultA);
      resultB.bindingAffinity = calculateBindingAffinityIndex(resultB);

      const baiA = resultA.bindingAffinity?.bindingAffinityIndex || 0;
      const baiB = resultB.bindingAffinity?.bindingAffinityIndex || 0;

      const deltaBAI = baiA - baiB;
      const percentDiff = baiB !== 0 ? (deltaBAI / baiB) * 100 : 0;

      res.json({
        resultA,
        resultB,
        contentA,
        contentB,
        comparison: {
          deltaBAI,
          percentDiff,
          winner: baiA >= baiB ? 'A' : 'B'
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
