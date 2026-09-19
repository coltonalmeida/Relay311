import test from 'node:test';
import assert from 'node:assert/strict';
import { StructuredReportSchema } from '../../shared/schemas.js';
import { processTranscript } from './transcriptProcessor.js';

test('classifies a pothole report as actionable and conforms to shared schema', () => {
  const report = processTranscript('There is a large pothole at 5 Main Street');
  assert.equal(report.actionable, true);
  assert.equal(report.category, 'roads');
  assert.deepEqual(StructuredReportSchema.parse(report), report);
});

test('classifies an information request as non-actionable', () => {
  const report = processTranscript('What time does city hall open?');
  assert.equal(report.actionable, false);
  assert.equal(report.category, 'general-information');
  assert.deepEqual(StructuredReportSchema.parse(report), report);
});
