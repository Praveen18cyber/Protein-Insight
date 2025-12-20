import { z } from 'zod';
import { insertAnalysisSessionSchema, analysisSessions, AnalysisResultSchema } from './schema';

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
        fileContent: z.string().optional(), // Raw PDB text content
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
        200: z.custom<typeof analysisSessions.$inferSelect>(), // Returns the session with the 'result' JSONB
        404: errorSchemas.notFound,
      },
    },
    downloadReport: {
      method: 'GET' as const,
      path: '/api/analysis/:id/report',
      responses: {
        200: z.string(), // CSV content
        404: errorSchemas.notFound,
      },
    },
    downloadPdb: {
        method: 'GET' as const,
        path: '/api/analysis/:id/pdb',
        responses: {
            200: z.string(), // PDB text content
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
