import { z } from 'zod';
import { services, vehicleTypes } from './catalog';
const phone = z.string().trim().regex(/^\+?[\d\s()-]{10,20}$/, 'Enter a valid phone number').refine(value => { const digits = value.replace(/\D/g, ''); return digits.length >= 10 && digits.length <= 15; }, 'Enter a valid phone number');
const contact = {
  name: z.string().trim().min(2).max(100),
  email: z.email().max(200).transform(value => value.trim().toLowerCase()),
  phone
};
export const orderSchema = z.object({
  ...contact,
  services: z.array(z.enum(services.map(s => s.id))).min(1).max(6),
  vehicleType: z.enum(vehicleTypes),
  make: z.string().trim().min(2).max(100),
  plate: z.string().trim().min(3).max(30),
  delivery: z.enum(['delivery', 'collection']),
  address: z.string().trim().max(500).default(''),
  channel: z.enum(['email', 'whatsapp', 'both']),
  uploads: z.array(z.string().max(1500)).max(10).default([]),
  consent: z.literal(true)
}).refine(v => v.delivery !== 'delivery' || v.address.length >= 10, {
  message: 'Enter a Lagos delivery address',
  path: ['address']
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
