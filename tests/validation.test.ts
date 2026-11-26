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
  consent: true,
  quotedTotalKobo: 722500
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
test('order validation restricts the Heavy Duty Permit to buses, trucks and vans', () => {
  const permitOrder = { ...order, services: ['heavy-duty-permit'], quotedTotalKobo: 1822500 };
  for (const vehicleType of ['Car', 'SUV', 'Pickup', 'Bus', 'Truck / van']) {
    const result = orderSchema.safeParse({ ...permitOrder, vehicleType });
    assert.equal(result.success, vehicleType === 'Bus' || vehicleType === 'Truck / van', vehicleType);
  }
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

test('CMR and tint require a request type, the correct supporting evidence and vehicle confirmation', () => {
  const base = { ...order, services: ['cmr', 'tint'] };
  const licence = { token: 'example-licence', documentType: 'vehicle-licence' };
  const poc = { token: 'example-poc', documentType: 'proof-of-ownership' };
  const mixed = { ...base, requests: { cmr: 'new', tint: 'renewal' }, documentsBelongToVehicle: true };
  assert.equal(orderSchema.safeParse(base).success, false);
  assert.equal(orderSchema.safeParse(mixed).success, false);
  assert.equal(orderSchema.safeParse({ ...mixed, uploads: [poc] }).success, false);
  assert.equal(orderSchema.safeParse({ ...mixed, uploads: [licence], documentsBelongToVehicle: false }).success, false);
  assert.equal(orderSchema.safeParse({ ...mixed, uploads: [licence] }).success, true);
  assert.equal(orderSchema.safeParse({ ...mixed, requests: { cmr: 'renewal', tint: 'renewal' }, uploads: [poc] }).success, true);
});

test('allows insurance alone and rejects invalid values or unpriced vehicles', () => {
  const base = { ...order, services: [], delivery: 'delivery', insurance: { kind: 'third-party' } };
  assert.equal(orderSchema.safeParse(base).success, true);
  assert.equal(orderSchema.safeParse({ ...base, vehicleType: 'Other / not sure' }).success, false);
  for (const vehicleValue of [0, -10, 0.01, 20.001, Number.POSITIVE_INFINITY]) {
    assert.equal(orderSchema.safeParse({ ...base, insurance: { kind: 'comprehensive', vehicleValue } }).success, false);
  }
  assert.equal(orderSchema.safeParse({ ...base, insurance: { kind: 'comprehensive', vehicleValue: 10_000_000 } }).success, true);
});
