import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const analysisSessions = pgTable("analysis_sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  pdbId: text("pdb_id"), // if fetched from RCSB
  originalFilename: text("original_filename"), // if uploaded
  proteinName: text("protein_name"),
  createdAt: timestamp("created_at").defaultNow(),
  // Store the full analysis result as JSONB to avoid millions of rows for atoms/interactions
  result: jsonb("result"), 
});

// === BASE SCHEMAS ===
export const insertAnalysisSessionSchema = createInsertSchema(analysisSessions).omit({ 
  id: true, 
  createdAt: true, 
  status: true,
  result: true 
});

// === EXPLICIT API CONTRACT TYPES ===

// Core Data Structures for Analysis
export const AtomSchema = z.object({
  serial: z.number(),
  name: z.string(),
  altLoc: z.string(),
  resName: z.string(),
  chainID: z.string(),
  resSeq: z.number(),
  iCode: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  occupancy: z.number(),
  tempFactor: z.number(),
  element: z.string(),
  charge: z.string().optional(),
});

export const ResidueSchema = z.object({
  resName: z.string(),
  chainID: z.string(),
  resSeq: z.number(),
  atoms: z.array(AtomSchema),
});

export const InteractionTypeSchema = z.enum([
  "Hydrogen Bond",
  "Salt Bridge",
  "Hydrophobic",
  "Van der Waals",
  "Pi-Stacking",
  "Other"
]);

export const InteractionSchema = z.object({
  id: z.string(),
  proteinA: z.string(), // Chain ID
  proteinB: z.string(), // Chain ID
  residueA: z.string(), // e.g., "ALA 123"
  residueB: z.string(), // e.g., "VAL 456"
  atomA: z.string(),
  atomB: z.string(),
  distance: z.number(),
  type: InteractionTypeSchema,
});

export const ChainMetricsSchema = z.object({
  chainId: z.string(),
  residueCount: z.number(),
  atomCount: z.number(),
  interactingResidues: z.number(),
});

export const AnalysisResultSchema = z.object({
  summary: z.object({
    pdbId: z.string().optional(),
    filename: z.string().optional(),
    chains: z.array(z.string()),
    totalInteractions: z.number(),
  }),
  chains: z.array(ChainMetricsSchema),
  interactions: z.array(InteractionSchema),
  // We might include the parsed structure if needed for client-side viz, 
  // but usually client loads the PDB string directly into NGL.
});

export type Atom = z.infer<typeof AtomSchema>;
export type Interaction = z.infer<typeof InteractionSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// Request types
export type CreateAnalysisRequest = z.infer<typeof insertAnalysisSessionSchema> & {
  fileContent?: string; // Optional: Uploaded PDB content
};

// Response types
export type AnalysisSession = typeof analysisSessions.$inferSelect;
