import { z } from 'zod';
import { insertAnalysisSessionSchema, analysisSessions, AnalysisResultSchema, ProteinSourceSchema } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  analysis: {
    create: {
      method: 'POST' as const,
      path: '/api/analysis',
      input: insertAnalysisSessionSchema.extend({
        proteinSources: z.array(ProteinSourceSchema),
        proteinContents: z.record(z.string(), z.string()), // protein name -> PDB content
      }),
      responses: {
        201: z.custom<typeof analysisSessions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/analysis/:id',
      responses: {
        200: z.custom<typeof analysisSessions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    downloadInterProtein: {
      method: 'GET' as const,
      path: '/api/analysis/:id/download/inter-protein',
      responses: {
        200: z.string(), // CSV content
        404: errorSchemas.notFound,
      },
    },
    downloadIntraProtein: {
      method: 'GET' as const,
      path: '/api/analysis/:id/download/intra-protein',
      responses: {
        200: z.string(), // CSV content
        404: errorSchemas.notFound,
      },
    },
    downloadStructure: {
      method: 'GET' as const,
      path: '/api/analysis/:id/download/structure',
      responses: {
        200: z.string(), // Combined PDB or CSV
        404: errorSchemas.notFound,
      }
    }
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
