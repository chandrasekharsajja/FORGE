/**
 * @sajja/forge-contracts - Zod schema definitions for request/response validation
 * 
 Provides type-safe validation schemas used across the platform for input sanitization.
 */

import { z } from 'zod';

// Common response shape
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  timestamp: z.string().optional(),
});

// Mission input/output schemas
export const MissionCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  goal: z.string().min(1, 'Goal is required').max(5000),
  organizationId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  deadline: z.string().datetime().optional(),
});

export const MissionUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  goal: z.string().max(5000).optional(),
  status: z.enum(['draft', 'planning', 'executing', 'verified', 'completed', 'failed']).optional(),
});

// Tool call schema
export const ToolCallSchema = z.object({
  name: z.string().min(1, 'Tool name required'),
  arguments: z.record(z.unknown()).optional(),
});

// Prompt template schema
export const TemplateCreateSchema = z.object({
  name: z.string().min(1, 'Template name required').max(100),
  version: z.number().int().positive('Version must be positive'),
  template: z.string().min(1, 'Template content required'),
  role: z.enum(['planner', 'coder', 'reviewer', 'tester', 'system']),
  description: z.string().max(500).optional(),
});

// Authentication schema
export const AuthCredentialsSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const JwtPayloadSchema = z.object({
  sub: z.string('User ID required'),
  orgId: z.string().optional('Organization ID optional'),
  wsId: z.string().optional('Workspace ID optional'),
  role: z.enum(['admin', 'editor', 'viewer', 'guest']).default('viewer'),
  permissions: z.array(z.string()).default([]),
  iat: z.number(),
  exp: z.number(),
});

// Artifact types
export const ArtifactTypeSchema = z.enum([
  'code',
  'prd',
  'diagram',
  'test_report',
  'spec',
  'architecture',
]).strip();

export const ArtifactSchema = z.object({
  id: z.string().uuid().optional(),
  missionId: z.string(),
  type: ArtifactTypeSchema,
  version: z.number().int().positive('Version must be positive'),
  uri: z.string().url().min(1, 'URI required'),
  title: z.string().min(1, 'Title required').max(200),
  description: z.string().max(1000).optional(),
  author: z.string().max(100).optional(),
  createdAt: z.string().datetime(),
  signature: z.string().optional(),
});

// Workspace repository schema
export const RepoInfoSchema = z.object({
  name: z.string().min(1, 'Repo name required').max(100),
  url: z.string().url().optional(),
  branch: z.string().optional(),
  localPath: z.string().optional(),
  status: z.enum(['active', 'stale', 'error']).optional(),
  lastSync: z.string().datetime().optional(),
});

export const WorkspaceConfigSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Workspace name required').max(200),
  organizationId: z.string(),
  description: z.string().max(500).optional(),
  repos: z.array(RepoInfoSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

// Policy rule schema
export const PolicyRuleSchema = z.object({
  id: z.string().min(1, 'Rule ID required'),
  name: z.string().min(1, 'Rule name required'),
  enforce: z.function().args(z.string(), z.object()).returns(z.object({ allowed: z.boolean() }).optional()),
});

// Agent role schema
export const AgentRoleSchema = z.enum(['planner', 'coder', 'reviewer', 'tester', 'archivist']);

// Streaming response schema
export const StreamChunkSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const StreamingResponseSchema = z.object({
  success: z.boolean(),
  chunks: z.array(StreamChunkSchema),
  finalAnswer: z.string().optional(),
  modelUsed: z.string().optional(),
  processingTimeMs: z.number().int().optional(),
  timestamp: z.string().datetime(),
});

// Error response schema
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string().min(1, 'Error message required'),
  code: z.string().min(1, 'Error code required'),
  details: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
});

// Export all schemas for consumer packages
export {
  ApiResponseSchema,
  MissionCreateSchema,
  MissionUpdateSchema,
  ToolCallSchema,
  TemplateCreateSchema,
  AuthCredentialsSchema,
  JwtPayloadSchema,
  ArtifactSchema,
  WorkspaceConfigSchema,
  PolicyRuleSchema,
  AgentRoleSchema,
  StreamingResponseSchema,
  ErrorResponseSchema,
};

// Type exports from zod types
export type ApiResponseType = z.infer<typeof ApiResponseSchema>;
export type MissionCreateType = z.infer<typeof MissionCreateSchema>;
export type MissionUpdateType = z.infer<typeof MissionUpdateSchema>;
export type ToolCallType = z.infer<typeof ToolCallSchema>;
export type TemplateCreateType = z.infer<typeof TemplateCreateSchema>;
export type AuthCredentialsType = z.infer<typeof AuthCredentialsSchema>;
export type JwtPayloadType = z.infer<typeof JwtPayloadSchema>;
export type ArtifactType = z.infer<typeof ArtifactSchema>;
export type WorkspaceConfigType = z.infer<typeof WorkspaceConfigSchema>;
export type PolicyRuleType = z.infer<typeof PolicyRuleSchema>;
export type AgentRoleType = z.infer<typeof AgentRoleSchema>;
export type StreamingResponseType = z.infer<typeof StreamingResponseSchema>;
export type ErrorResponseType = z.infer<typeof ErrorResponseSchema>;

export default {
  name: 'validation-schemas',
  version: '1.0.0',
};