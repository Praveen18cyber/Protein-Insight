import { analysisSessions, type AnalysisSession, type CreateAnalysisRequest } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createAnalysisSession(session: CreateAnalysisRequest): Promise<AnalysisSession>;
  getAnalysisSession(id: number): Promise<AnalysisSession | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createAnalysisSession(session: CreateAnalysisRequest): Promise<AnalysisSession> {
    const { fileContent, ...dbSession } = session; 
    // We don't save the raw fileContent string in the DB row directly if it's huge, 
    // but the Schema has a 'result' jsonb column which will store the ANALYSIS result.
    // The request 'session' object here comes from the route handler AFTER analysis is done,
    // so it should contain the 'result'.
    
    // Wait, the CreateAnalysisRequest type in schema.ts has 'fileContent' (optional).
    // But 'insertAnalysisSessionSchema' excludes 'result'.
    // We need to be able to insert the result.
    
    // Let's refine: The caller (route) will prepare the object to insert.
    // We will cast/manipulate as needed.
    
    const [created] = await db.insert(analysisSessions).values({
        ...dbSession,
        // Ensure result is cast correctly if passed in dbSession (it might be strict due to Zod omission)
        // actually dbsession is strictly typed to the InsertSchema which omits result.
        // We need to allow passing result. 
        // Let's rely on the fact that I can pass extra props to drizzle insert if I cast or if I change the input type here.
    } as any).returning();
    return created;
  }

  async getAnalysisSession(id: number): Promise<AnalysisSession | undefined> {
    const [session] = await db.select().from(analysisSessions).where(eq(analysisSessions.id, id));
    return session;
  }
}

export const storage = new DatabaseStorage();
