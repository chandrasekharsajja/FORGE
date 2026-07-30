/**
 * @apps/unified-ide - Input validation middleware using Zod schemas
 * 
 Provides automatic request body validation with comprehensive error handling.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export interface ValidationOptions<T extends z.ZodAny> {
  schema: T;
  passthrough?: boolean; // Allow extra fields not in schema
  stripUnknown?: boolean; // Remove unknown fields
}

// Utility to convert Zod error to human-readable message
function formatZodErrors(errors: z.ZodError): string {
  return errors.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
}

/** Create a validation middleware function */
export function createValidationMiddleware<Z extends z.ZodAny>(options: ValidationOptions<Z>) {
  const { schema, passthrough = false, stripUnknown = false } = options;
  
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      
      // Parse and validate
      const parseResult = schema.parseSafe(body);
      
      if (!parseResult.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Validation failed', 
            details: formatZodErrors(parseResult.error) 
          }, 
          { status: 400 }
        );
      }
      
      // Apply stripping or passthrough as configured
      let parsedData = parseResult.data;
      if (stripUnknown && !passthrough) {
        // Remove fields not defined in schema (simplified - would need full schema analysis)
        parsedData = JSON.parse(JSON.stringify(parsedData)); // Deep clone to strip undefined props
      }
      
      // Attach validated data to request object
      (req as any).validatedBody = parsedData;
      
      return { success: true, data: parsedData };
    } catch (error) {
      console.error('Request parsing error:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid request payload' },
        { status: 400 }
      );
    }
  };
}

/** Route handler decorator with validation */
export function withValidation<Handler extends (req: NextRequest, validatedBody: unknown) => Promise<Response>>(
  schema: z.ZodAny,
  handler: Handler
) {
  const validate = createValidationMiddleware({ schema });
  
  return async (req: NextRequest) => {
    const validationResult = await validate(req);
    
    if (!validationResult.success) {
      return validationResult.response || NextResponse.json(
        { success: false, error: 'Request validation failed' },
        { status: 400 }
      );
    }

    // Call handler with validated body
    return handler(req, validationResult.data);
  };
}

// Common validation helpers
export const validatePayload = <T>(input: unknown, schema: z.ZodType<T>): { success: boolean; data: T | null; error?: string } => {
  try {
    const result = schema.safeParse(input);
    if (!result.success) {
      return { success: false, data: null, error: formatZodErrors(result.error) };
    }
    return { success: true, data: result.result };
  } catch (err) {
    return { success: false, data: null, error: String(err) };
  }
};

export type ValidatedRequest<T> = NextRequest & { validatedBody: T };

// Export common built-in validators
export const createPayloadValidator = <T>(schema: z.ZodType<T>) => ({
  validate: (input: unknown) => validatePayload(input, schema),
  createMiddleware: () => createValidationMiddleware({ schema }),
});

export default createValidationMiddleware;