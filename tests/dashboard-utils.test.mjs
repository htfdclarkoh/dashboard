import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventKey, escapeHtml, getPostStatus, isContentExpired } from '../shared/dashboard-utils.mjs';

test('escapes dynamic dashboard content', () => {
  assert.equal(escapeHtml('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
});

test('classifies scheduled content', () => {
  const now = new Date('2026-08-17T12:00:00');
  assert.equal(getPostStatus({ postDate:'2026-08-18T12:00:00' }, now), 'upcoming');
  assert.equal(getPostStatus({ postDate:'2026-08-01', removeDate:'2026-08-16' }, now), 'expired');
  assert.equal(getPostStatus({ postDate:'2026-08-01', removeDate:'2026-08-18' }, now), 'active');
  assert.equal(getPostStatus({ postDate:'2026-08-01', removeDate:'2026-08-17' }, now), 'active');
});

test('expires managed slides at the end of the selected day', () => {
  assert.equal(isContentExpired('2026-08-16', new Date('2026-08-17T00:00:00')), true);
  assert.equal(isContentExpired('2026-08-17', new Date('2026-08-17T12:00:00')), false);
});

test('uses stable alert identifiers', () => {
  assert.equal(buildEventKey({ incidentId:'26-123' }), '26-123');
});
