import { 
  analysisSessions, 
  type AnalysisSession, 
  type CreateAnalysisRequest,
  proteinMetadata,
  interactionTypeCounts,
  chainPairStats
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getAnalysisSession(id: number): Promise<AnalysisSession | undefined>;
  createProteinMetadata(protein: any): Promise<ProteinMetadata>;
  getProteinMetadataByPdbId(pdbId: string): Promise<ProteinMetadata | undefined>;
  createAnalysisSession(session: any): Promise<AnalysisSession>;
  updateAnalysisSessionStatus(id: number, status: string, resultSummary?: any): Promise<void>;
  listAnalysisSessions(): Promise<AnalysisSession[]>;
}

export class DatabaseStorage implements IStorage {
  async getAnalysisSession(id: number): Promise<AnalysisSession | undefined> {
    const [session] = await db.select().from(analysisSessions).where(eq(analysisSessions.id, id));
    return session;
  }

  async createProteinMetadata(protein: any): Promise<ProteinMetadata> {
    const [newProtein] = await db.insert(proteinMetadata).values(protein).returning();
    return newProtein;
  }

  async getProteinMetadataByPdbId(pdbId: string): Promise<ProteinMetadata | undefined> {
    const [protein] = await db.select().from(proteinMetadata).where(eq(proteinMetadata.pdbId, pdbId));
    return protein;
  }

  async createAnalysisSession(session: any): Promise<AnalysisSession> {
    const [newSession] = await db.insert(analysisSessions).values(session).returning();
    return newSession;
  }

  async updateAnalysisSessionStatus(id: number, status: string, resultSummary?: any): Promise<void> {
    await db.update(analysisSessions)
      .set({ status, resultSummary })
      .where(eq(analysisSessions.id, id));
  }

  async listAnalysisSessions(): Promise<AnalysisSession[]> {
    return await db.select().from(analysisSessions).orderBy(analysisSessions.createdAt);
  }
}

export const storage = new DatabaseStorage();
