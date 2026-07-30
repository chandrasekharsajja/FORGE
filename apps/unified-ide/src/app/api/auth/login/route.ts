/**
 * /api/auth/login - Authentication endpoint for user login
 * 
 Handles credential verification and token issuance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthStrategy } from '@/lib/auth-strategy';
import { createMemoryService } from '@platform/memory-service';
import { getWorkspaceService } from '@platform/workspace-service';

// Validation schemas
import { AuthCredentialsSchema } from '@sajja/contracts'; // From validation-schemas.ts

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input using Zod schema
    const validated = AuthCredentialsSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials', details: validated.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = validated.data;

    // TODO: Implement actual authentication against identity provider
    // For now, simulate successful auth with mock user data
    
    // In production, validate credentials against database/user store
    // const user = await verifyCredentials(email, password);
    
    // Mock user for demonstration
    const mockUser = {
      id: 'user-123',
      email,
      name: 'Developer User',
      organizationId: 'org-test-456',
      role: 'editor',
      permissions: ['create_mission', 'execute_mission', 'view_workspace', 'manage_settings'],
    };

    // Create auth strategy with configuration (secret from environment/secrets manager)
    const authStrategy = createAuthStrategy({
      accessTokenExpiresIn: '15m',
      refreshTokenExpiresIn: '7d',
      secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    });

    // Generate tokens
    const { accessToken, refreshToken, session } = await authStrategy.generateTokens(
      {
        sub: mockUser.id,
        orgId: mockUser.organizationId,
        wsId: undefined,
        role: mockUser.role,
        permissions: mockUser.permissions,
      },
      request.headers.get('x-forwarded-for') || request.remoteAddress,
      request.headers.get('user-agent') || ''
    );

    // Save session to memory service
    const memoryService = createMemoryService({ postgresHost: 'localhost', postgresPort: 5432 });
    await memoryService.storeUserPreference(`auth:${session.id}`, session);

    // Return tokens in HTTP-only cookies (secure practice) + JSON response
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          permissions: mockUser.permissions,
        },
        session: {
          id: session.id,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
        },
      },
    });

    // Set secure HTTP-only cookies for tokens (production should do this)
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 900, // 15 minutes
      path: '/',
      sameSite: 'strict',
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 604800, // 7 days
      path: '/api/auth/refresh',
      sameSite: 'strict',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET health check for auth service
export async function GET() {
  return NextResponse.json({ 
    success: true,
    service: 'auth-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}