import test from 'node:test';
import assert from 'node:assert/strict';
import { StructuredReportSchema } from '../../shared/schemas.js';
import { parseGeminiResponse, processTranscriptMock } from './transcriptProcessor.js';

test('classifies a pothole report as actionable and conforms to shared schema', () => {
  const report = processTranscriptMock('There is a large pothole at 5 Main Street');
  assert.equal(report.actionable, true);
  assert.equal(report.category, 'roads');
  assert.deepEqual(StructuredReportSchema.parse(report), report);
});

test('classifies an information request as non-actionable', () => {
  const report = processTranscriptMock('What time does city hall open?');
  assert.equal(report.actionable, false);
  assert.equal(report.category, 'general-information');
  assert.deepEqual(StructuredReportSchema.parse(report), report);
});

test('classifies water and utility reports for offline development', () => {
  assert.equal(processTranscriptMock('A water main leak is flooding the road').category, 'water');
  assert.equal(processTranscriptMock('The streetlight is broken and there is an outage').category, 'utilities');
});

test('does not classify a parking information question as actionable', () => {
  assert.equal(processTranscriptMock('What are the parking hours on Sunday?').actionable, false);
});

test('validates a structured Gemini response', () => {
  const report = parseGeminiResponse(JSON.stringify({
    intent: 'Report pothole', category: 'roads', subtype: 'pothole',
    summary: 'A pothole was reported on Main Street.', actionable: true,
    confidence: 0.95, location: { raw: 'Main Street' }, observations: { laneBlocked: false },
  }));
  assert.equal(report.location.raw, 'Main Street');
});

test('rejects a semantically invalid Gemini response', () => {
  assert.throws(() => parseGeminiResponse(JSON.stringify({ actionable: 'yes' })));
});
