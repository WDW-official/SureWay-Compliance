import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePricing, servicesForVehicle, vehicleTypes } from '../lib/catalog.ts';

test('prices every document for each supported vehicle category', () => {
  const expected = [
    ['vehicle-licence', [2700, 3300, 4200], 2500],
    ['roadworthiness', [6100, 6800, 14300], 2500],
    ['proof-of-ownership', [1200, 1200, 1200], 2500],
    ['hackney', [7500, 7500, 9500], 0],
    ['tint', [40000, 40000, 40000], 5000],
    ['cmr', [7000, 7000, 7000], 2500],
    ['heavy-duty-permit', [8000, 8000, 8000], 2500],
    ['speed-limiter', [20000, 20000, 20000], 2500]
  ] as const;
  for (const [index, vehicle] of vehicleTypes.slice(0, -1).entries()) {
    const catalog = servicesForVehicle(vehicle);
    assert.equal(catalog.length, expected.length);
    for (const [id, fees, charge] of expected) {
      const [item] = calculatePricing([id], 'collection', vehicle).items;
      assert.equal(item.fee, fees[Math.min(index, 2)], `${vehicle}: ${id} fee`);
      assert.equal(item.charge, charge, `${vehicle}: ${id} service charge`);
    }
  }
  assert.deepEqual(servicesForVehicle('Other / not sure'), []);
  assert.throws(() => calculatePricing(['vehicle-licence'], 'delivery', 'Other / not sure'), /vehicle category/);
});

test('collection removes delivery and switching vehicle changes the selected item price', () => {
  assert.equal(calculatePricing(['vehicle-licence'], 'delivery', 'Car').total, 10387.5);
  assert.equal(calculatePricing(['vehicle-licence'], 'collection', 'Car').total, 5387.5);
  assert.equal(calculatePricing(['vehicle-licence'], 'collection', 'SUV').total, 5987.5);
  assert.equal(calculatePricing(['vehicle-licence'], 'collection', 'Bus').total, 6887.5);
});

test('an empty order incurs no delivery charge and duplicate IDs do not inflate the total', () => {
  assert.equal(calculatePricing([], 'delivery').total, 0);
  assert.equal(calculatePricing(['vehicle-licence', 'vehicle-licence'], 'delivery').total, 10387.5);
  assert.throws(() => calculatePricing(['client-invented-price'], 'delivery'), /Unknown/);
});

test('insurance does not contribute to service VAT or trigger delivery by itself', () => {
  assert.equal(calculatePricing([], 'delivery', 'SUV', { kind: 'third-party' }).total, 15000);
  const cover = { kind: 'comprehensive', vehicleValue: 10_000_000 } as const;
  assert.equal(calculatePricing([], 'delivery', 'Car', cover).total, 500000);
  const combined = calculatePricing(['vehicle-licence', 'tint'], 'collection', 'Car', cover);
  assert.equal(combined.premium, 500000);
  assert.equal(combined.vat, 562.5);
  assert.equal(combined.total, 550762.5);
  assert.equal(calculatePricing([], 'collection', 'Car', { kind: 'comprehensive', vehicleValue: 100.10 }).premium, 5.01);
  assert.throws(() => calculatePricing([], 'collection', 'Car', { kind: 'comprehensive', vehicleValue: 0 }), /vehicle value/);
});
