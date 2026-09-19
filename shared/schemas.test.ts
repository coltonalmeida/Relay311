import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateCallSchema } from './schemas.js';

test('normalizes Colton Vapi output into the backend call input', () => {
  const parsed = CreateCallSchema.parse({
    id: 'vapi-provider-record',
    provider: 'vapi',
    callId: 'vapi-call-id',
    phoneNumberId: 'phone-id',
    assistantId: 'assistant-id',
    status: 'ended',
    endedReason: 'assistant-said-end-call-phrase',
    createdAt: '2026-09-19T16:42:31.050Z',
    startedAt: '2026-09-19T16:42:31.313Z',
    endedAt: '2026-09-19T16:43:57.943Z',
    receivedAt: '2026-09-19T16:44:08.293Z',
    transcript: 'Caller reports a damaged sidewalk slab.',
    messages: [{ role: 'user', text: 'A damaged sidewalk slab.' }],
    textFile: 'vapi-call-id.txt',
    futureVapiField: 'accepted for forward compatibility'
  });

  assert.equal(parsed.externalCallId, 'vapi-call-id');
  assert.equal(parsed.durationSeconds, 87);
  assert.equal(parsed.provider, 'vapi');
  assert.equal(parsed.providerRecordId, 'vapi-provider-record');
  assert.equal(parsed.providerStatus, 'ended');
  assert.equal(parsed.endedReason, 'assistant-said-end-call-phrase');
  assert.equal('messages' in parsed, false);
});

test('continues to accept the normalized development payload', () => {
  const parsed = CreateCallSchema.parse({
    externalCallId: 'manual-test-call',
    transcript: 'What time does city hall open?',
    durationSeconds: 12
  });

  assert.equal(parsed.externalCallId, 'manual-test-call');
  assert.equal(parsed.provider, undefined);
});

test('rejects a Vapi payload without a transcript', () => {
  assert.throws(() => CreateCallSchema.parse({ provider: 'vapi', callId: 'missing-transcript' }));
});
