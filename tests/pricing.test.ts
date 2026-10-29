import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePricing } from '../lib/catalog.ts';
test('matches the screenshot: licence, service VAT, and Lagos delivery', () => {
  assert.deepEqual(calculatePricing(['vehicle-licence'], 'delivery'), {
    documents: 4000,
    charges: 2500,
    vat: 187.5,
    shipping: 5000,
    total: 11687.5
  });
});
test('collection removes delivery, without changing document or service fees', () => {
  assert.equal(calculatePricing(['vehicle-licence'], 'collection').total, 6687.5);
});
test('an empty order incurs no delivery charge', () => {
  assert.equal(calculatePricing([], 'delivery').total, 0);
});
test('duplicate IDs cannot inflate the amount and unknown IDs are rejected', () => {
  assert.equal(calculatePricing(['vehicle-licence', 'vehicle-licence'], 'delivery').total, 11687.5);
  assert.throws(() => calculatePricing(['client-invented-price'], 'delivery'), /Unknown/);
});
test('VAT applies only to service charges for a multiple-document order', () => {
  assert.deepEqual(calculatePricing(['vehicle-licence', 'tint'], 'collection'), {
    documents: 44000,
    charges: 7500,
    vat: 562.5,
    shipping: 0,
    total: 52062.5
  });
});
