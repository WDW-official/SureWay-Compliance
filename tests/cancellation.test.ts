import test from 'node:test';
import assert from 'node:assert/strict';
import { cancellationDeadline, cancellationFilter } from '../lib/cancellation.ts';

const createdAt = new Date('2026-06-01T12:00:00Z');
const deadline = new Date('2026-06-01T12:15:00Z');
const order = { status: 'paid', createdAt, documents: [] };

test('the cancellation deadline is based on placement time and is exclusive', () => {
  assert.deepEqual(cancellationDeadline(order, deadline.getTime() - 1), deadline);
  assert.equal(cancellationDeadline(order, deadline.getTime()), null);
  assert.equal(cancellationDeadline({ status: 'paid' }, createdAt.getTime()), null);
  assert.deepEqual(cancellationFilter(deadline).createdAt, { $gt: createdAt });
});

test('creation, issuance, prior issuance and terminal states all block cancellation', () => {
  for (const changes of [
    { documentsCreatedAt: createdAt },
    { documents: [{ name: 'licence.pdf' }] },
    { history: [{ status: 'ready_for_collection' }] },
    { status: 'completed' },
    { status: 'cancelled' }
  ]) {
    assert.equal(cancellationDeadline({ ...order, ...changes }, createdAt.getTime()), null);
  }
  const filter = cancellationFilter(createdAt);
  assert.deepEqual(filter['documents.0'], { $exists: false });
  assert.equal(filter.documentsCreatedAt, null);
  assert.ok(filter['history.status'].$nin.includes('soft_copies_ready'));
});
