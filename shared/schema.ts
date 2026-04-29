import { pgTable, text, serial, integer, doublePrecision, timestamp, jsonb, primaryKey, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === 1. PROTEIN METADATA ===
// Purpose: Stores basic information about analyzed PDB structures.
export const proteinMetadata = pgTable("protein_metadata", {
  id: serial("id").primaryKey(),
  pdbId: text("pdb_id").unique(), // RCSB PDB Identifier
  name: text("name").notNull(),   // Common or systematic name
  sourceType: text("source_type").notNull(), // 'rcsb' or 'upload'
  resolution: doublePrecision("resolution"), // X-ray resolution if available
  organism: text("organism"),
  method: text("method"),
  year: integer("year"),
  metadata: jsonb("metadata"), // Full JSON for chains, uniprot, etc.
  pdbContent: text("pdb_content"), // Added for visualization of uploaded files
  createdAt: timestamp("created_at").defaultNow(),
});

// === 2. ANALYSIS SESSIONS ===
// Purpose: Tracks individual analysis runs for reproducibility.
export const analysisSessions = pgTable("analysis_sessions", {
  id: serial("id").primaryKey(),
  proteinId: integer("protein_id").references(() => proteinMetadata.id),
  title: text("title").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  config: jsonb("config"), // Future scope: Analysis parameters
  resultSummary: jsonb("result_summary"), // Summary-level interaction data
  createdAt: timestamp("created_at").defaultNow(),
});

// === 3. INTERACTION TYPE COUNTS ===
// Purpose: Categorized counts for scientific statistical breakdown.
export const interactionTypeCounts = pgTable("interaction_type_counts", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => analysisSessions.id).notNull(),
  interactionType: text("interaction_type").notNull(), // H-Bond, Salt Bridge, etc.
  interactionCount: integer("interaction_count").notNull(),
});

// === 4. CHAIN PAIR STATISTICS ===
// Purpose: Detailed metrics for chain-to-chain interactions.
export const chainPairStats = pgTable("chain_pair_stats", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => analysisSessions.id).notNull(),
  chainA: text("chain_a").notNull(),
  chainB: text("chain_b").notNull(),
  interCount: integer("inter_count").notNull(),
  intraCount: integer("intra_count").notNull(),
  avgDistance: doublePrecision("avg_distance"),
});

// === FUTURE SCOPE: MUTATION IMPACTS (STUB) ===
export const mutationImpacts = pgTable("mutation_impacts", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => analysisSessions.id).notNull(),
  residuePosition: integer("residue_position").notNull(),
  originalResidue: text("original_residue").notNull(),
  mutantResidue: text("mutant_residue").notNull(),
  predictedDeltaG: doublePrecision("predicted_delta_g"),
});

// === BASE SCHEMAS ===
export const insertAnalysisSessionSchema = createInsertSchema(analysisSessions).omit({ 
  id: true, 
  createdAt: true, 
  status: true,
  resultSummary: true,
});

export const insertProteinMetadataSchema = createInsertSchema(proteinMetadata).omit({
  id: true,
  createdAt: true,
});

// === TYPES ===
export type ProteinMetadata = typeof proteinMetadata.$inferSelect;
export type AnalysisSession = typeof analysisSessions.$inferSelect & {
  proteinMetadata?: ProteinMetadata;
  result?: any;
};
export type InteractionTypeCount = typeof interactionTypeCounts.$inferSelect;
export type ChainPairStat = typeof chainPairStats.$inferSelect;

export const ProteinSourceSchema = z.object({
  name: z.string(),
  pdbId: z.string().optional(),
  filename: z.string().optional(),
});

// Existing contract types maintained for API compatibility
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
  proteinA: z.string(),
  proteinB: z.string(),
  chainA: z.string(),
  chainB: z.string(),
  residueA: z.string(),
  residueB: z.string(),
  atomA: z.string(),
  atomB: z.string(),
  distance: z.number(),
  type: InteractionTypeSchema,
  isIntraMolecular: z.boolean(),
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
  chains: z.array(z.any()),
  interactions: z.array(InteractionSchema),
  fullInteractionsCount: z.number().optional(),
  interactionDensity: z.record(z.string(), z.array(z.any())).optional(),
  chainInteractionSummary: z.array(z.any()).optional(),
  bindingAffinity: z.object({
    bindingAffinityIndex: z.number(),
    bindingCategory: z.string(),
    featureContributions: z.record(z.string(), z.number()),
  }).nullable().optional(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type Interaction = z.infer<typeof InteractionSchema>;
export type CreateAnalysisRequest = {
  title: string;
  proteinSource: { name: string; pdbId?: string; filename?: string };
  proteinContent: string;
};

export type CompareAnalysisRequest = {
  title: string;
  sourceA: { name: string; pdbId?: string; content: string };
  sourceB: { name: string; pdbId?: string; content: string };
};
