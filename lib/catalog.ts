export const services = [{
  id: 'vehicle-licence',
  name: 'Vehicle licence',
  description: 'Keep your vehicle licence up to date.',
  category: 'Essentials',
  fee: 4000,
  charge: 2500,
  icon: 'document',
  timeframe: '2–3 working days'
}, {
  id: 'roadworthiness',
  name: 'Roadworthiness certificate',
  description: 'Renew your roadworthiness documentation.',
  category: 'Essentials',
  fee: 10500,
  charge: 2500,
  icon: 'shield',
  timeframe: '3–5 working days'
}, {
  id: 'proof-of-ownership',
  name: 'Proof of ownership',
  description: 'Get your vehicle ownership documentation sorted.',
  category: 'Essentials',
  fee: 2500,
  charge: 2500,
  icon: 'document',
  timeframe: '2–3 working days'
}, {
  id: 'hackney',
  name: 'Hackney permit',
  description: 'Permit processing for eligible commercial vehicles.',
  category: 'Commercial',
  fee: 7000,
  charge: 2500,
  icon: 'car',
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
  fee: 9000,
  charge: 2500,
  icon: 'document',
  timeframe: '3–5 working days'
}] as const;
export const vehicleTypes = ['Car', 'SUV', 'Pickup', 'Truck / van', 'Bus', 'Other / not sure'] as const;
export type Delivery = 'delivery' | 'collection';
export function calculatePricing(ids: string[], delivery: Delivery) {
  const unique = [...new Set(ids)];
  const selected = unique.map(id => {
    const service = services.find(s => s.id === id);
    if (!service) throw new Error('Unknown service');
    return service;
  });
  const documents = selected.reduce((sum, s) => sum + s.fee, 0);
  const charges = selected.reduce((sum, s) => sum + s.charge, 0);
  const vat = Math.round(charges * 0.075 * 100) / 100;
  const shipping = selected.length && delivery === 'delivery' ? 5000 : 0;
  return {
    documents,
    charges,
    vat,
    shipping,
    total: documents + charges + vat + shipping
  };
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
