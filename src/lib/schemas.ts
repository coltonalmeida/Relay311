import { z } from "zod";

export const CategorySchema = z.enum([
  "pothole",
  "water",
  "tree",
  "dumping",
  "streetlight",
  "noise",
  "graffiti",
  "vehicle",
  "other",
]);
export type Category = z.infer<typeof CategorySchema>;

export const PrioritySchema = z.enum(["critical", "high", "medium", "low"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const IncidentStatusSchema = z.enum([
  "new",
  "in_review",
  "assigned",
  "resolved",
  "dismissed",
]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

export const RecordTypeSchema = z.enum(["incident", "information"]);
export type RecordType = z.infer<typeof RecordTypeSchema>;

export const CallProcessingStatusSchema = z.enum(["processing", "processed", "failed"]);
export type CallProcessingStatus = z.infer<typeof CallProcessingStatusSchema>;

export const StructuredReportSchema = z
  .object({
    intent: z.string().min(1),
    category: CategorySchema,
    subtype: z.string().min(1),
    summary: z.string().min(1),
    actionable: z.boolean(),
    confidence: z.number().min(0).max(1),
    location: z
      .object({
        raw: z.string(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
      })
      .strict(),
    observations: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])),
  })
  .strict();
export type StructuredReport = z.infer<typeof StructuredReportSchema>;

export const TranscriptMessageSchema = z.object({
  role: z.enum(["assistant", "user"]),
  text: z.string(),
  partial: z.boolean().optional(),
});
export type TranscriptMessage = z.infer<typeof TranscriptMessageSchema>;

export const CreateCallInputSchema = z
  .object({
    externalCallId: z.string().trim().min(1).max(200),
    transcript: z.string().trim().min(1),
    messages: z.array(TranscriptMessageSchema).default([]),
    callerPhone: z.string().trim().min(1).max(50).nullable().optional(),
    startedAt: z.string().datetime({ offset: true }).optional(),
    endedAt: z.string().datetime({ offset: true }).optional(),
    durationSeconds: z.number().int().nonnegative().optional(),
    provider: z.string().trim().min(1).max(50).optional(),
    providerRecordId: z.string().trim().min(1).max(200).optional(),
    phoneNumberId: z.string().trim().min(1).max(200).optional(),
    assistantId: z.string().trim().min(1).max(200).optional(),
    providerStatus: z.string().trim().min(1).max(100).optional(),
    endedReason: z.string().trim().min(1).max(200).optional(),
    textFile: z.string().trim().min(1).max(500).optional(),
  })
  .strict();
export type CreateCallInput = z.infer<typeof CreateCallInputSchema>;

export type CallRecord = {
  id: string;
  externalCallId: string;
  transcript: string;
  messages: TranscriptMessage[];
  callerPhone: string | null;
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
  processingStatus: CallProcessingStatus;
  processingError: string | null;
  recordType: RecordType | null;
  report: StructuredReport | null;
  incidentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IncidentRecord = {
  id: string;
  callId: string;
  status: IncidentStatus;
  title: string;
  category: Category;
  subtype: string;
  summary: string;
  priority: Priority;
  assignee: string | null;
  location: StructuredReport["location"];
  observations: StructuredReport["observations"];
  confidence: number;
  createdAt: string;
  updatedAt: string;
};

export const OPEN_INCIDENT_STATUSES: IncidentStatus[] = ["new", "in_review", "assigned"];
