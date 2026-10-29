import test from 'node:test';
import assert from 'node:assert/strict';
import { orderSchema, enquirySchema } from '../lib/validation';
const order = {
  name: 'Ada Okafor',
  email: 'ADA@example.com',
  phone: '+2348012345678',
  services: ['vehicle-licence'],
  vehicleType: 'Car',
  make: 'Toyota Corolla',
  plate: 'AAA 123 AB',
  delivery: 'collection',
  channel: 'both',
  consent: true
};
test('normalizes customer emails for order lookup', () => {
  assert.equal(orderSchema.parse(order).email, 'ada@example.com');
});
test('delivery requires an address; empty services and missing consent are rejected', () => {
  assert.equal(orderSchema.safeParse({
    ...order,
    delivery: 'delivery',
    address: ''
  }).success, false);
  assert.equal(orderSchema.safeParse({
    ...order,
    services: []
  }).success, false);
  assert.equal(orderSchema.safeParse({
    ...order,
    consent: false
  }).success, false);
});
test('fleet enquiries require a company and positive vehicle count', () => {
  const lead = {
    name: order.name,
    email: order.email,
    phone: order.phone,
    kind: 'fleet',
    consent: true
  };
  assert.equal(enquirySchema.safeParse(lead).success, false);
  assert.equal(enquirySchema.safeParse({
    ...lead,
    company: 'Unilever',
    fleetSize: 30
  }).success, true);
  assert.equal(enquirySchema.safeParse({
    ...lead,
    company: 'Unilever',
    fleetSize: 0
  }).success, false);
});
