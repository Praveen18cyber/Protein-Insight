import { analysisSessions, type AnalysisSession, type CreateAnalysisRequest } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createAnalysisSession(session: CreateAnalysisRequest): Promise<AnalysisSession>;
  getAnalysisSession(id: number): Promise<AnalysisSession | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createAnalysisSession(session: CreateAnalysisRequest): Promise<AnalysisSession> {
    const { proteinContents, proteinSources, ...dbSession } = session;
    
    const [created] = await db.insert(analysisSessions).values({
      ...dbSession,
    } as any).returning();
    return created;
  }

  async getAnalysisSession(id: number): Promise<AnalysisSession | undefined> {
    const [session] = await db.select().from(analysisSessions).where(eq(analysisSessions.id, id));
    return session;
  }
}

export const storage = new DatabaseStorage();
