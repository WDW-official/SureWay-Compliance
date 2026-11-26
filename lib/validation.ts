import { z } from 'zod';
import { requiredPermitUploads, requestKinds, services, uploadKinds, validVehicleValue, vehicleTypes } from './catalog';
const phone = z.string().trim().regex(/^\+?[\d\s()-]{10,20}$/, 'Enter a valid phone number').refine(value => { const digits = value.replace(/\D/g, ''); return digits.length >= 10 && digits.length <= 15; }, 'Enter a valid phone number');
const contact = {
  name: z.string().trim().min(2).max(100),
  email: z.email().max(200).transform(value => value.trim().toLowerCase()),
  phone
};
export const orderSchema = z.object({
  ...contact,
  services: z.array(z.enum(services.map(s => s.id))).max(services.length),
  vehicleType: z.enum(vehicleTypes),
  insurance: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('third-party') }),
    z.object({
      kind: z.literal('comprehensive'),
      vehicleValue: z.number().refine(validVehicleValue, 'Enter a valid vehicle value for comprehensive insurance.')
    })
  ]).optional(),
  requests: z.object({ cmr: z.enum(requestKinds).optional(), tint: z.enum(requestKinds).optional() }).default({}),
  make: z.string().trim().min(2).max(100),
  plate: z.string().trim().min(3).max(30),
  delivery: z.enum(['delivery', 'collection']),
  address: z.string().trim().max(500).default(''),
  channel: z.enum(['email', 'whatsapp', 'both']),
  uploads: z.array(z.object({
    token: z.string().min(1).max(1500),
    documentType: z.enum(uploadKinds)
  })).max(10).default([]),
  documentsBelongToVehicle: z.boolean().default(false),
  quotedTotalKobo: z.number().int().positive(),
  consent: z.literal(true)
}).superRefine((order, context) => {
  const issue = (field: string, message: string) => context.addIssue({ code: 'custom', path: [field], message });
  if (!order.services.length && !order.insurance) issue('services', 'Select at least one document or an insurance option.');
  if (order.vehicleType === 'Other / not sure') issue('vehicleType', 'Choose a vehicle category to order online.');
  if (order.services.length && order.delivery === 'delivery' && order.address.length < 10) {
    issue('address', 'Enter a Lagos delivery address');
  }
  const { permits, kinds } = requiredPermitUploads(order.services, order.requests);
  if (permits.some(id => !order.requests[id])) {
    issue('requests', 'Select new or renewal for every CMR or Tint Permit request.');
  } else if (permits.length) {
    if (!order.uploads.some(file => kinds.some(kind => kind === file.documentType))) {
      issue('uploads', kinds.length === 1 ? 'Upload the Vehicle Licence for this vehicle.' :
        'Upload Proof of Ownership or the Vehicle Licence for this vehicle.');
    } else if (!order.documentsBelongToVehicle) {
      issue('documentsBelongToVehicle', 'Confirm the uploaded documents belong to this vehicle.');
    }
  }
});
export const enquirySchema = z.object({
  ...contact,
  kind: z.enum(['fleet', 'registration', 'support']),
  company: z.string().trim().max(150).default(''),
  fleetSize: z.coerce.number().int().min(1).max(100000).optional(),
  documents: z.array(z.string().max(100)).max(10).default([]),
  message: z.string().trim().max(3000).default(''),
  consent: z.literal(true)
}).refine(v => v.kind !== 'fleet' || v.company.length > 1 && !!v.fleetSize, {
  message: 'Enter your organization and fleet size'
});
