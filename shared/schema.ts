import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const analysisSessions = pgTable("analysis_sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  proteinSources: jsonb("protein_sources").notNull(), // Array of {pdbId?, filename?, name?}
  createdAt: timestamp("created_at").defaultNow(),
  result: jsonb("result"), // Full analysis result
});

// === BASE SCHEMAS ===
export const insertAnalysisSessionSchema = createInsertSchema(analysisSessions).omit({ 
  id: true, 
  createdAt: true, 
  status: true,
  result: true,
  proteinSources: true,
});

// === EXPLICIT API CONTRACT TYPES ===

export const ProteinSourceSchema = z.object({
  name: z.string(),
  pdbId: z.string().optional(),
  filename: z.string().optional(),
});

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
  proteinName: z.string(), // Which protein this atom belongs to
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
  proteinA: z.string(), // Protein name
  proteinB: z.string(), // Protein name
  chainA: z.string(), // Chain ID
  chainB: z.string(), // Chain ID
  residueA: z.string(), // e.g., "ALA 123"
  residueB: z.string(), // e.g., "VAL 456"
  atomA: z.string(),
  atomB: z.string(),
  distance: z.number(),
  type: InteractionTypeSchema,
  isIntraMolecular: z.boolean(), // True if same protein, False if between proteins
});

export const ChainMetricsSchema = z.object({
  proteinName: z.string(),
  chainId: z.string(),
  residueCount: z.number(),
  atomCount: z.number(),
  interactingResidues: z.number(),
  intraProteinInteractions: z.number(),
  interProteinInteractions: z.number(),
});

export const AnalysisResultSchema = z.object({
  summary: z.object({
    totalProteins: z.number(),
    totalChains: z.number(),
    totalAtoms: z.number(),
    totalInteractions: z.number(),
    intraProteinInteractions: z.number(),
    interProteinInteractions: z.number(),
  }),
  chains: z.array(ChainMetricsSchema),
  interactions: z.array(InteractionSchema),
});

export type Atom = z.infer<typeof AtomSchema>;
export type Interaction = z.infer<typeof InteractionSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type ProteinSource = z.infer<typeof ProteinSourceSchema>;

// Request types
export type CreateAnalysisRequest = z.infer<typeof insertAnalysisSessionSchema> & {
  proteinSources: ProteinSource[];
  proteinContents: Record<string, string>; // Map protein name -> PDB content
};

// Response types
export type AnalysisSession = typeof analysisSessions.$inferSelect;
