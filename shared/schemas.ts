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

const NormalizedCreateCallSchema = z.object({
  externalCallId: z.string().trim().min(1).max(200),
  transcript: z.string().trim().min(1),
  startedAt: z.string().datetime({ offset: true }).optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  provider: z.string().trim().min(1).max(50).optional(),
  providerRecordId: z.string().trim().min(1).max(200).optional(),
  phoneNumberId: z.string().trim().min(1).max(200).optional(),
  assistantId: z.string().trim().min(1).max(200).optional(),
  providerStatus: z.string().trim().min(1).max(100).optional(),
  endedReason: z.string().trim().min(1).max(200).optional(),
  providerCreatedAt: z.string().datetime({ offset: true }).optional(),
  endedAt: z.string().datetime({ offset: true }).optional(),
  receivedAt: z.string().datetime({ offset: true }).optional(),
  textFile: z.string().trim().min(1).max(500).optional()
}).strict();

export const VapiCallPayloadSchema = z.object({
  id: z.string().trim().min(1).max(200).optional(),
  provider: z.literal('vapi').default('vapi'),
  callId: z.string().trim().min(1).max(200),
  phoneNumberId: z.string().trim().min(1).max(200).optional(),
  assistantId: z.string().trim().min(1).max(200).optional(),
  status: z.string().trim().min(1).max(100).optional(),
  endedReason: z.string().trim().min(1).max(200).optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  startedAt: z.string().datetime({ offset: true }).optional(),
  endedAt: z.string().datetime({ offset: true }).optional(),
  receivedAt: z.string().datetime({ offset: true }).optional(),
  transcript: z.string().trim().min(1),
  messages: z.array(z.unknown()).optional(),
  textFile: z.string().trim().min(1).max(500).optional()
}).passthrough();

export const CreateCallSchema = z.union([NormalizedCreateCallSchema, VapiCallPayloadSchema]).transform(input => {
  if ('externalCallId' in input) return input;
  const duration = input.startedAt && input.endedAt
    ? Math.max(0, Math.round((Date.parse(input.endedAt) - Date.parse(input.startedAt)) / 1000))
    : undefined;
  return NormalizedCreateCallSchema.parse({
    externalCallId: input.callId,
    transcript: input.transcript,
    startedAt: input.startedAt,
    durationSeconds: duration,
    provider: input.provider,
    providerRecordId: input.id,
    phoneNumberId: input.phoneNumberId,
    assistantId: input.assistantId,
    providerStatus: input.status,
    endedReason: input.endedReason,
    providerCreatedAt: input.createdAt,
    endedAt: input.endedAt,
    receivedAt: input.receivedAt,
    textFile: input.textFile
  });
});
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
  provider: string | null;
  providerRecordId: string | null;
  phoneNumberId: string | null;
  assistantId: string | null;
  providerStatus: string | null;
  endedReason: string | null;
  providerCreatedAt: string | null;
  endedAt: string | null;
  receivedAt: string | null;
  textFile: string | null;
  processingStatus: z.infer<typeof CallStatusSchema>;
  processingError: string | null;
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
