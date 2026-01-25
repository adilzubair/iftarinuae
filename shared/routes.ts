import { z } from 'zod';
import { insertPlaceSchema, insertReviewSchema, places, reviews } from './schema';

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
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  places: {
    list: {
      method: 'GET' as const,
      path: '/api/places',
      responses: {
        200: z.array(z.custom<any>()), // Using any temporarily for composed types, or refine later
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/places/:id',
      responses: {
        200: z.custom<any>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/places',
      input: insertPlaceSchema,
      responses: {
        201: z.custom<typeof places.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  reviews: {
    create: {
      method: 'POST' as const,
      path: '/api/places/:id/reviews',
      input: insertReviewSchema,
      responses: {
        201: z.custom<typeof reviews.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
        409: z.object({ message: z.string() }), // Conflict (already reviewed)
      },
    },
  },
};

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
