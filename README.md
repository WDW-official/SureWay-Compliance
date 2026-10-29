# SureWay Compliance

A responsive vehicle-document platform built with **Next.js App Router, TypeScript, Tailwind CSS, MongoDB, Cloudinary and Paystack**. The green-and-white layout follows the supplied SureWay references.

## Run locally

Requires Node.js 20.9+ and npm. In this directory:

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. `/admin` is the protected staff workspace.

Without the required configuration, the customer website runs in **clearly labelled preview mode**. Cart selections, preview orders and preview enquiries are kept in that browser's localStorage. Preview submissions are not sent to the team and cannot charge a card. A preview order can be tracked using its reference and the same email in the same browser.

## Customer experience

- Choose a vehicle type and select from vehicle licence, roadworthiness, proof of ownership, Hackney permit, tint permit and Central Motor Registry.
- Filter by category and search on mobile.
- See document fees, service charges, 7.5% VAT on service charges and delivery separately.
- Choose Lagos delivery for ₦5,000 or free collection.
- Supply contact/vehicle details and optionally upload existing PDF, JPG or PNG documents.
- Review the full order and proceed to hosted Paystack checkout.
- Track an order by random reference and matching email. Completed documents have expiring authenticated Cloudinary download links.
- Request new registration, fleet service, or support through a short enquiry form.

## Staff experience

At `/admin`, sign in with the configured password. Staff can review the latest 200 orders and enquiries, retrieve supporting files, update paid orders, attach completed documents, and mark enquiries contacted or resolved. Pending email/WhatsApp delivery jobs are visible. Payment-pending orders cannot be marked paid by staff; Paystack verification controls payment confirmation.

## Production setup

1. Deploy the complete Next.js app to a **Node.js host** with MongoDB TCP access, such as Vercel or a Node container. This is a full-stack app and is not a static export. Standard Cloudflare Workers/Sites hosting does not provide the raw MongoDB TCP access this application requires.
2. Set every value in `.env.example` through the host's secret manager. Never commit credentials. Set `APP_URL` to the canonical HTTPS origin. A strong `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` are required.
3. Configure a MongoDB database and allow access from the application host. Unique order/reference indexes and expiring rate-limit indexes are created automatically on the first database connection. Keep regular backups and set your organization's retention policy.
4. Use a Cloudinary account that supports authenticated raw assets. Files are uploaded with random IDs as `authenticated`, not public assets. Downloads are signed and expire after 24 hours. Customers can obtain fresh links through order tracking. Uploaded but abandoned files remain in Cloudinary; apply a retention/cleanup policy before production use.
5. Add a Paystack **test** secret key initially. In Paystack, set the webhook to `https://YOUR_DOMAIN/api/payments/webhook`. The callback is `https://YOUR_DOMAIN/payment/return`. Payment initialization and amount calculations occur server-side. Payment verification checks status, reference, amount in kobo and NGN currency. Webhooks are authenticated with HMAC-SHA512; repeated success events use idempotent notification keys.
6. Configure Resend, verify your sending domain and set `EMAIL_FROM` and `TEAM_EMAIL`. Enquiries are stored before team notifications are queued, so staff can recover them even if a delivery provider fails.
7. Configure Meta WhatsApp Cloud API and an approved **utility template** with two body text parameters: notification subject, and notification body/document links. The recipient must be able to receive that approved template. International phone format is recommended; a leading Nigerian `0` is converted to `234` for sending. The customer's chosen channel controls delivery of completed documents. Transactional payment confirmation is emailed.
8. Schedule an authenticated POST to `/api/jobs/notifications` every minute using `Authorization: Bearer YOUR_CRON_SECRET`. The durable MongoDB queue retries pending jobs up to ten attempts; failed provider configuration is shown in the staff workspace. Delivery uses a lease to avoid simultaneous processing. Provider timeouts can still lead to duplicate WhatsApp messages; Resend requests use idempotency keys.
9. **Confirm pricing before launch.** `lib/catalog.ts` uses the six fees and ₦5,000 delivery fee in the supplied screenshots. These prices are not independently verified regulatory tariffs. Prices currently apply uniformly to vehicle types; implement and approve a vehicle-specific tariff table if required. Registration has no invented fixed price: the team quotes it directly. Set `PRICING_CONFIRMED=true` only once the business approves fees and eligibility.
10. Complete the launch checks below. The site switches out of preview only when all required live-service variables are present and pricing is confirmed.

## Validation

```sh
npm run typecheck
npm test
npm run build
npm start
```

Launch checks: test a successful and cancelled Paystack transaction, confirm webhook replay does not duplicate the payment state, verify uploads and private file links, complete an order through the staff workspace, verify customer email/WhatsApp delivery, submit a fleet enquiry and confirm team receipt, and check desktop/mobile keyboard navigation. Credentials were not supplied with the request, so external-service integration checks must use your test accounts.

## Operations and limits

The current staff login is a single shared password with an eight-hour signed HTTP-only session. Add individual staff identities and audit attribution if the team requires role-based access. Secure cookies require HTTPS in production. Mutating browser endpoints check the canonical request origin. MongoDB rate limiting protects login, order creation, uploads and tracking; configure your hosting proxy to provide a trusted client IP header. Tracking requires both a high-entropy order reference and the email; treat both as private. Staff sees the latest 200 records; add pagination when needed. Notification job execution requires an external scheduler.

The collection point, regulatory eligibility, processing timelines and delivery coordination are confirmed directly by the team. The app does not claim a guaranteed completion date. The Unilever reference comes from the project brief; no additional customer logos or testimonials are invented.

## Project structure

- `components/platform.tsx`: responsive customer website and request flows.
- `app/admin/page.tsx`: staff workspace.
- `app/api/`: orders, enquiries, file uploads, payments, admin and notifications.
- `lib/catalog.ts`: service catalogue and server-shared pricing.
- `lib/validation.ts`: request validation.
- `lib/server.ts`: MongoDB access, sessions, rate limiting and readiness.
- `lib/files.ts`: authenticated Cloudinary storage.
- `lib/paystack.ts`: server-side payment verification.
- `lib/notifications.ts`: durable email/WhatsApp delivery queue.
- `tests/pricing.test.ts`: pricing and validation checks.
