import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePricing, servicesForVehicle } from '../lib/catalog.ts';

test('prices every document for each supported vehicle category', () => {
  const expected = [
    ['vehicle-licence', [4000, 5000, 8000], 3000],
    ['roadworthiness', [10500, 12500, 20500], 3000],
    ['proof-of-ownership', [2500, 2500, 2500], 3000],
    ['hackney', [10000, 10000, 10000], 3000],
    ['tint', [40000, 40000, 40000], 5000],
    ['cmr', [9000, 9000, 9000], 3000],
    ['speed-limiter', [20000, 20000, 20000], 3000]
  ] as const;
  const vehicles = [['Car', 0], ['SUV', 1], ['Pickup', 2], ['Truck / van', 2], ['Bus', 2]] as const;
  for (const [vehicle, priceIndex] of vehicles) {
    const catalog = servicesForVehicle(vehicle);
    const hasHeavyDuty = vehicle === 'Bus' || vehicle === 'Truck / van';
    assert.equal(catalog.length, expected.length + Number(hasHeavyDuty));
    for (const [id, fees, charge] of expected) {
      const [item] = calculatePricing([id], 'collection', vehicle).items;
      assert.equal(item.fee, fees[priceIndex], `${vehicle}: ${id} fee`);
      assert.equal(item.charge, charge, `${vehicle}: ${id} service charge`);
    }
    if (hasHeavyDuty) {
      const [item] = calculatePricing(['heavy-duty-permit'], 'collection', vehicle).items;
      assert.equal(item.fee, 15000);
      assert.equal(item.charge, 3000);
    } else {
      assert.throws(() => calculatePricing(['heavy-duty-permit'], 'collection', vehicle), /Unknown service/);
    }
  }
  assert.deepEqual(servicesForVehicle('Other / not sure'), []);
  assert.throws(() => calculatePricing(['vehicle-licence'], 'delivery', 'Other / not sure'), /vehicle category/);
});

test('collection removes delivery and switching vehicle changes the selected item price', () => {
  assert.equal(calculatePricing(['vehicle-licence'], 'delivery', 'Car').total, 12225);
  assert.equal(calculatePricing(['vehicle-licence'], 'collection', 'Car').total, 7225);
  assert.equal(calculatePricing(['vehicle-licence'], 'collection', 'SUV').total, 8225);
  assert.equal(calculatePricing(['vehicle-licence'], 'collection', 'Bus').total, 11225);
});

test('an empty order incurs no delivery charge and duplicate IDs do not inflate the total', () => {
  assert.equal(calculatePricing([], 'delivery').total, 0);
  assert.equal(calculatePricing(['vehicle-licence', 'vehicle-licence'], 'delivery').total, 12225);
  assert.throws(() => calculatePricing(['client-invented-price'], 'delivery'), /Unknown/);
});

test('insurance does not contribute to service VAT or trigger delivery by itself', () => {
  assert.equal(calculatePricing([], 'delivery', 'SUV', { kind: 'third-party' }).total, 15000);
  const cover = { kind: 'comprehensive', vehicleValue: 10_000_000 } as const;
  assert.equal(calculatePricing([], 'delivery', 'Car', cover).total, 500000);
  const combined = calculatePricing(['vehicle-licence', 'tint'], 'collection', 'Car', cover);
  assert.equal(combined.premium, 500000);
  assert.equal(combined.vat, 600);
  assert.equal(combined.total, 552600);
  assert.equal(calculatePricing([], 'collection', 'Car', { kind: 'comprehensive', vehicleValue: 100.10 }).premium, 5.01);
  assert.throws(() => calculatePricing([], 'collection', 'Car', { kind: 'comprehensive', vehicleValue: 0 }), /vehicle value/);
});
