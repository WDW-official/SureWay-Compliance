# SureWay workflow assessment and delivery plan

Reviewed: 27 October 2026. Scope: local application source, TypeScript checking, and existing automated tests. External providers, deployment, and browser workflows were not tested. “Implemented” below means present in source, not verified in production.

## Proposed flow compared with the app

| Proposed step | Current coverage | Remaining work |
| --- | --- | --- |
| Receive requests through website or WhatsApp | Partial. Website checkout and fleet/registration/support enquiry forms exist. WhatsApp integration sends outgoing notifications. | Incoming WhatsApp webhook, message-to-request workflow, staff inbox, and request source tracking. Gmail intake is also absent if retained from current operations. |
| Create/link client, vehicle, and order | Partial. Orders store contact details and one vehicle directly. | Reusable client/company and vehicle records; fleet vehicle lists; enquiry-to-order conversion; links across repeat orders. |
| Confirm services and pricing | Partial. Six services, server-calculated pricing, order review, and a fleet/registration enquiry route exist. | Formal quotations, multiple vehicles, negotiated corporate pricing, quote versions, acceptance, and approved tariff management. Vehicle type currently does not affect price. |
| Receive Paystack payment or corporate approval/PO | Partial. Paystack initialization, verification, signed webhook handling, and amount/currency checks exist. | Corporate billing route, PO upload/reference, approval evidence, credit terms, and permission to process approved corporate orders without marking them paid. |
| Assign processing and track progress | Partial. Staff can change order status and customers can track it. | Assigned staff/vendor, work items per vehicle/service, instructions, deadlines, vendor costs/payments, and overdue work views. |
| Receive and store completed documents | Implemented at order level. Staff can upload PDF/JPG/PNG files to authenticated Cloudinary storage. | Explicit vehicle/service links, document type, issue/expiry dates, versions, and vendor handover records. |
| Check and approve documents for release | Missing as a distinct controlled step. | Draft/review/approved/rejected/released states, reviewer identity, checks against required services, and server-enforced release rules. |
| Automatically send soft copies by WhatsApp/email | Implemented in source. Status changes queue messages with document links; retries use a scheduled endpoint. | Trigger document delivery only after approval, record provider delivery/failure callbacks, and provide controlled resends. Existing “sent” state reflects provider API acceptance, not confirmed customer receipt. |
| Track delivery and corporate invoicing | Partial. Delivery/collection selection, address, and manual status changes exist. | Courier/job assignment, dispatch reference, proof of delivery/collection, invoices, due dates, partial payments, balances, and follow-up. |
| Update expiry dates and schedule renewal reminders | Missing. | Per-document expiry history, renewal dashboard, scheduled reminders, suppression/deduplication, and renewal order creation. |

## Priority correction: document release

`app/api/admin/orders/route.ts` appends uploaded documents and includes the entire document list in every status notification. `app/api/orders/track/route.ts` returns every stored completed document, regardless of review or release status. Merely adding an approval button would leave both release paths open.

Introduce document review/release metadata and filter customer downloads and notifications on the server. Require all required documents to be approved before a full release, or explicitly authorize and record partial release. Uploading or rejecting a document must not send its link to a customer. Keep staff access available for review. Identify any existing unreviewed documents before migration.

## Delivery sequence

### 1. Establish records, staff identity, and workflow rules

- Add clients, company contacts, vehicles, and service-level order items. Support multiple vehicles per corporate order and stable client/vehicle identifiers.
- Build a spreadsheet import with a mapping preview, row validation, duplicate review, and an import report. Preserve existing order references, payment evidence, and document links when linking old orders.
- Add individual staff accounts, permissions for operations/review/finance, and an audit log for approvals, assignments, dates, and payment changes.
- Separate processing status, financial status, document approval, and delivery status. Define allowed transitions server-side. Processing eligibility should be verified payment OR approved corporate authorization; a PO must not imply payment received.
- Implement the release correction above before wider operational use.

Acceptance: import a client with several vehicles, link a repeat order without duplicating records, and prove that an unapproved file is absent from tracking and all customer notifications. Unauthorized users cannot approve or release documents.

### 2. Complete request intake, quotations, and corporate authorization

- Add a staff request inbox and manual entry so phone, Gmail, and WhatsApp requests can be captured immediately with a source and attachments.
- Convert enquiries into linked quotes/orders without retyping contact details.
- Add a verified incoming WhatsApp webhook and deduplicate provider message IDs. Link known contacts conservatively and leave uncertain matches for staff review. Request missing vehicle/service details through a guided flow or staff handoff.
- Add versioned quotes with line items per vehicle/service, approved pricing, validity dates, and an acceptance record. Freeze the accepted price used for payment and billing.
- Offer Paystack payment or a corporate account route with PO evidence, authorized approval, and payment terms. Reuse existing payment verification for prepaid orders.

Acceptance: a website request and a WhatsApp request each produce one linked order. A corporate PO can authorize processing while the balance remains unpaid. A duplicate webhook does not create another request or authorization.

### 3. Manage vendor work and document review

- Add vendors, assignees, instructions, work items, target dates, and processing progress per service and vehicle.
- Record vendor charges, payment approvals, payment evidence, and outstanding balances. Start with recording payments made externally; automated vendor payouts would require separate implementation.
- Capture completed files with document type, vehicle/service, issue date, expiry date where applicable, and version. Check vehicle identity, required documents, legibility, and dates during review; record rejection reasons and rework.
- Release approved versions and enqueue email/WhatsApp notifications through the existing durable queue. Make release and queue creation recoverable together so a failed write cannot silently lose a notification.

Acceptance: assign work, record a vendor payment, reject an incorrect file, replace it, and release only the approved version. Repeated release requests do not create duplicate delivery jobs.

### 4. Complete delivery and corporate billing

- Track original-document dispatch/collection separately from soft-copy release, including courier, reference, recipient, dates, and receipt evidence.
- Generate invoices from accepted order items; record PO reference, invoice number, due date, partial payments, balance, and overdue follow-up. Keep vendor expenses separate from customer receivables.
- Add finance views for unbilled work, unpaid/part-paid invoices, overdue balances, and vendor obligations.

Acceptance: an order can be delivered while its corporate invoice remains unpaid. Partial payment reduces the correct balance without changing the recorded delivery or document history.

### 5. Automate renewals and validate the complete flow

- Update vehicle document history from approved documents, using explicit expiry dates rather than assuming every document has a one-year validity. Preserve previous versions and handle documents without expiry dates.
- Add configurable reminder intervals, for example 30/14/7 days before expiry, subject to business confirmation. Use a scheduled job and deduplicate by document/version, reminder interval, recipient, and channel.
- Suppress obsolete reminders after renewal, respect contact preferences, and prevent multiple active renewal orders for the same document cycle. Reuse linked vehicle/service details when creating a renewal quote/order.
- Add dashboard views for expiring vehicles, work awaiting review, delayed vendor tasks, failed notifications, outstanding deliveries, and overdue invoices.
- Test the full flow in provider test environments, configure scheduler/credentials, and pilot with a small imported fleet before broad rollout.

Acceptance: simulated dates trigger each reminder once; approving a replacement expiry cancels old reminders. Verify both a prepaid retail order and a corporate fleet order through intake, approval, processing, release, delivery, billing, and renewal.

## Validation and planning inputs

- `npm run typecheck`: passed.
- `npm test`: all 8 existing tests passed. These cover pricing and input validation; they do not establish integration or workflow correctness.
- No application behavior changed during this assessment. This file is the implementation handoff.
- Before estimating delivery dates, confirm the spreadsheet columns/sample, approval roles, vendor payment practice, corporate credit rules, price variations, document requirements, delivery process, and reminder intervals. Implementation can follow the sequence above while these are resolved.
- Production readiness still needs a build, browser checks, configured MongoDB/Cloudinary/Paystack/Resend/WhatsApp, and a running notification scheduler. No live-service success is claimed here.

## Source references

- `components/platform.tsx`: customer ordering, enquiry forms, tracking, and browser-only preview mode.
- `app/admin/page.tsx`: staff orders, enquiries, notifications, status updates, and document uploads.
- `lib/validation.ts`, `app/api/orders/route.ts`: current contact and single-vehicle order structure.
- `lib/catalog.ts`: service prices, totals, and status labels.
- `lib/paystack.ts`, `app/api/payments/*`: checkout, payment verification, and settlement.
- `lib/files.ts`: private uploads and signed downloads.
- `app/api/admin/orders/route.ts`, `app/api/orders/track/route.ts`: document release paths.
- `lib/notifications.ts`, `app/api/jobs/notifications/route.ts`: outgoing notifications and retry worker.
- `lib/server.ts`: MongoDB access, shared administrator session, and live-mode prerequisites.
