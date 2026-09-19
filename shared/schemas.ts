import { z } from 'zod';

export const StructuredReportSchema = z.object({
  intent: z.string().min(1),
  category: z.string().min(1),
  subtype: z.string().min(1),
  summary: z.string().min(1),
  actionable: z.boolean(),
  confidence: z.number().min(0).max(1),
  location: z.object({
    raw: z.string(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional()
  }).strict(),
  observations: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()]))
}).strict();

export type StructuredReport = z.infer<typeof StructuredReportSchema>;

export const CreateCallSchema = z.object({
  externalCallId: z.string().trim().min(1).max(200),
  transcript: z.string().trim().min(1),
  startedAt: z.string().datetime({ offset: true }).optional(),
  durationSeconds: z.number().int().nonnegative().optional()
}).strict();
export type CreateCallInput = z.infer<typeof CreateCallSchema>;

export const RecordTypeSchema = z.enum(['incident', 'information']);
export const CallStatusSchema = z.enum(['processing', 'processed', 'failed']);
export const IncidentStatusSchema = z.enum(['pending', 'approved', 'dismissed']);

export type CallRecord = {
  id: string;
  externalCallId: string;
  transcript: string;
  startedAt: string | null;
  durationSeconds: number | null;
  processingStatus: z.infer<typeof CallStatusSchema>;
  recordType: z.infer<typeof RecordTypeSchema> | null;
  report: StructuredReport | null;
  incidentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IncidentRecord = {
  id: string;
  callId: string;
  status: z.infer<typeof IncidentStatusSchema>;
  category: string;
  subtype: string;
  summary: string;
  location: StructuredReport['location'];
  observations: StructuredReport['observations'];
  confidence: number;
  createdAt: string;
  updatedAt: string;
};
