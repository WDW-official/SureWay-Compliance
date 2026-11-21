export const services = [{
  id: 'vehicle-licence',
  name: 'Vehicle licence',
  description: 'Keep your vehicle licence up to date.',
  category: 'Essentials',
  fee: [2700, 3300, 4200],
  charge: 2500,
  icon: 'document',
  timeframe: '2–3 working days'
}, {
  id: 'roadworthiness',
  name: 'Roadworthiness certificate',
  description: 'Renew your roadworthiness documentation.',
  category: 'Essentials',
  fee: [6100, 6800, 14300],
  charge: 2500,
  icon: 'car',
  timeframe: '3–5 working days'
}, {
  id: 'proof-of-ownership',
  name: 'Proof of ownership',
  description: 'Get your vehicle ownership documentation sorted.',
  category: 'Essentials',
  fee: 1200,
  charge: 2500,
  icon: 'person',
  timeframe: '2–3 working days'
}, {
  id: 'hackney',
  name: 'Hackney permit',
  description: 'Permit processing for eligible commercial vehicles.',
  category: 'Commercial',
  fee: [7500, 7500, 9500],
  charge: 0,
  icon: 'shield',
  timeframe: '3–5 working days'
}, {
  id: 'tint',
  name: 'Tint permit',
  description: 'For factory-fitted or non-factory tint.',
  category: 'Permits',
  fee: 40000,
  charge: 5000,
  icon: 'shield',
  timeframe: 'Subject to approval'
}, {
  id: 'cmr',
  name: 'Central Motor Registry',
  description: 'Central Motor Registry document processing.',
  category: 'Permits',
  fee: 7000,
  charge: 2500,
  icon: 'document',
  timeframe: '3–5 working days'
}, {
  id: 'heavy-duty-permit',
  name: 'Heavy duty permit',
  description: 'Get help processing a heavy duty permit.',
  category: 'Commercial',
  fee: 8000,
  charge: 2500,
  icon: 'truck'
}, {
  id: 'speed-limiter',
  name: 'Speed limiter',
  description: 'Get help arranging a vehicle speed limiter.',
  category: 'Commercial',
  fee: 20000,
  charge: 2500,
  icon: 'gauge'
}] as const;
export const vehicleTypes = ['Car', 'SUV', 'Pickup', 'Truck / van', 'Bus', 'Other / not sure'] as const;
export type VehicleType = typeof vehicleTypes[number];
export type Delivery = 'delivery' | 'collection';
export type Insurance = { kind: 'third-party' } | { kind: 'comprehensive'; vehicleValue: number };
export const LAGOS_DELIVERY_FEE = 5000;
export const THIRD_PARTY_PREMIUM = 15000;
export const COMPREHENSIVE_PERCENT = 5;
export const insuranceLabels = {
  'third-party': 'Third-party insurance',
  comprehensive: 'Comprehensive insurance'
} as const;

export function servicesForVehicle(vehicle: VehicleType) {
  if (vehicle === 'Other / not sure') return [];
  const priceIndex = vehicle === 'Car' ? 0 : vehicle === 'SUV' ? 1 : 2;
  return services.map(service => ({
    ...service,
    fee: typeof service.fee === 'number' ? service.fee : service.fee[priceIndex]
  }));
}

export function validVehicleValue(value: number) {
  const kobo = Math.round(value * 100);
  return Number.isSafeInteger(kobo) && Number(value.toFixed(2)) === value &&
    Math.round(kobo / (100 / COMPREHENSIVE_PERCENT)) > 0;
}

export function calculatePricing(ids: string[], delivery: Delivery, vehicle: VehicleType = 'Car', insurance?: Insurance) {
  if (vehicle === 'Other / not sure' && (ids.length || insurance)) throw new Error('Choose a vehicle category for an online order.');
  const catalog = servicesForVehicle(vehicle);
  const items = [...new Set(ids)].map(id => {
    const service = catalog.find(s => s.id === id);
    if (!service) throw new Error('Unknown service for this vehicle');
    return { id: service.id, name: service.name, fee: service.fee, charge: service.charge };
  });
  if (insurance?.kind === 'comprehensive' && !validVehicleValue(insurance.vehicleValue)) {
    throw new Error('Enter a valid vehicle value for comprehensive insurance.');
  }
  const premiumKobo = insurance?.kind === 'third-party' ? THIRD_PARTY_PREMIUM * 100 :
    insurance?.kind === 'comprehensive' ? Math.round(Math.round(insurance.vehicleValue * 100) / (100 / COMPREHENSIVE_PERCENT)) : 0;
  const documents = items.reduce((sum, item) => sum + item.fee, 0);
  const charges = items.reduce((sum, item) => sum + item.charge, 0);
  const vat = Math.round(charges * 0.075 * 100) / 100;
  const shipping = items.length && delivery === 'delivery' ? LAGOS_DELIVERY_FEE : 0;
  return {
    items,
    documents,
    charges,
    premium: premiumKobo / 100,
    vat,
    shipping,
    total: (Math.round((documents + charges + vat + shipping) * 100) + premiumKobo) / 100
  };
}

export const permitIds = ['cmr', 'tint'] as const;
export type PermitId = typeof permitIds[number];
export const requestKinds = ['new', 'renewal'] as const;
export type RequestKinds = Partial<Record<PermitId, typeof requestKinds[number]>>;
export const uploadKinds = ['vehicle-licence', 'proof-of-ownership', 'other'] as const;
export type UploadKind = typeof uploadKinds[number];
export const uploadKindLabels: Record<UploadKind, string> = {
  'vehicle-licence': 'Vehicle licence',
  'proof-of-ownership': 'Proof of ownership',
  other: 'Other document'
};

export function requiredPermitUploads(ids: readonly string[], requests: RequestKinds) {
  const permits = permitIds.filter(id => ids.includes(id));
  const kinds = permits.some(id => requests[id] === 'new')
    ? (['vehicle-licence'] as const)
    : (['vehicle-licence', 'proof-of-ownership'] as const);
  return { permits, kinds };
}
export const money = (amount: number, decimals = false) => new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: decimals ? 2 : 0,
  maximumFractionDigits: 2
}).format(amount);
export const statuses = ['payment_pending', 'paid', 'processing', 'soft_copies_ready', 'ready_for_collection', 'out_for_delivery', 'completed'] as const;
export const statusLabels: Record<string, string> = {
  payment_pending: 'Awaiting payment',
  paid: 'Payment received',
  processing: 'In progress',
  soft_copies_ready: 'Soft copies ready',
  ready_for_collection: 'Ready for collection',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed'
};
