import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { parsePDB, analyzeInteractions, generateInteractionCSV, generateInterProteinCSV, generateIntraProteinCSV, generateStructureCSV } from "./services/pdb";
import { z } from "zod";
import { analysisSessions, AnalysisResultSchema, type ProteinSource } from "@shared/schema";
import { db } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Create Analysis with Single Protein
  app.post(api.analysis.create.path, async (req, res) => {
    try {
      const input = api.analysis.create.input.parse(req.body);

      let pdbContent = input.proteinContent;

      if (!pdbContent && input.proteinSource.pdbId) {
        // Fetch from RCSB
        try {
          const pdbIdUpper = input.proteinSource.pdbId.toUpperCase();
          const fetchUrl = `https://files.rcsb.org/download/${pdbIdUpper}.pdb`;
          console.log(`Fetching PDB: ${fetchUrl}`);
          
          const rcsbRes = await fetch(fetchUrl);
          console.log(`Fetch response status: ${rcsbRes.status}`);
          
          if (!rcsbRes.ok) {
            throw new Error(`HTTP ${rcsbRes.status}: ${rcsbRes.statusText}`);
          }
          
          pdbContent = await rcsbRes.text();
          console.log(`Fetched ${pdbContent.length} bytes for ${pdbIdUpper}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`PDB fetch error for ${input.proteinSource.pdbId}:`, errorMsg);
          return res.status(400).json({ message: `Could not fetch PDB ID ${input.proteinSource.pdbId}: ${errorMsg}` });
        }
      }

      if (!pdbContent) {
        return res.status(400).json({ message: `No PDB content provided` });
      }

      const atoms = parsePDB(pdbContent, input.proteinSource.name);
      console.log(`Parsed ${atoms.length} atoms for ${input.proteinSource.name}`);
      
      if (atoms.length === 0) {
        return res.status(400).json({ message: `Invalid PDB content: No atoms found. File size: ${pdbContent.length} bytes` });
      }

      // Perform Analysis
      console.time('analyzeInteractions');
      const result = analyzeInteractions({ [input.proteinSource.name]: atoms });
      console.timeEnd('analyzeInteractions');

      // Save to DB
      console.log('Saving analysis to database...');
      const [session] = await db.insert(analysisSessions).values({
        title: input.title,
        status: "completed",
        proteinSource: input.proteinSource,
        result: result,
      }).returning();
      console.log('Analysis saved successfully, session ID:', session.id);

      res.status(201).json(session);
    } catch (err) {
      console.error(err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Get Analysis
  app.get(api.analysis.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const session = await storage.getAnalysisSession(id);
    if (!session) {
      return res.status(404).json({ message: "Analysis session not found" });
    }

    // Optimization: Truncate interactions for UI stability if it's a huge result
    if (session.result && typeof session.result === 'object') {
      const result = session.result as any;
      if (Array.isArray(result.interactions) && result.interactions.length > 1000) {
        result.fullInteractionsCount = result.interactions.length;
        result.interactions = result.interactions.slice(0, 1000);
      }
    }
    
    res.json(session);
  });

  // Download Inter-Protein Interactions CSV
  app.get(api.analysis.downloadInterProtein.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const session = await storage.getAnalysisSession(id);
    if (!session || !session.result) {
      return res.status(404).json({ message: "Analysis session or result not found" });
    }

    const result = session.result as unknown as z.infer<typeof AnalysisResultSchema>;
    const csv = generateInterProteinCSV(result.interactions);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`analysis_${id}_inter-protein.csv`);
    res.send(csv);
  });

  // Download Intra-Protein Interactions CSV
  app.get(api.analysis.downloadIntraProtein.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const session = await storage.getAnalysisSession(id);
    if (!session || !session.result) {
      return res.status(404).json({ message: "Analysis session or result not found" });
    }

    const result = session.result as unknown as z.infer<typeof AnalysisResultSchema>;
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

    // Re-fetch and generate structure CSV
    const source = session.proteinSource as unknown as any;
    const allAtoms: any[] = [];

    try {
      let content: string;
      
      if (source.pdbId) {
        const rcsbRes = await fetch(`https://files.rcsb.org/download/${source.pdbId.toUpperCase()}.pdb`);
        if (!rcsbRes.ok) throw new Error("Failed to fetch");
        content = await rcsbRes.text();
      } else {
        // Can't re-fetch uploaded files
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

  return httpServer;
}
