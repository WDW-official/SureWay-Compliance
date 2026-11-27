import 'server-only';

export const policyTitles = {
  'privacy-policy': 'Privacy and Data Protection Policy',
  'terms-of-service': 'Terms of Service',
  'cookie-policy': 'Cookie Policy',
  'refund-and-cancellation-policy': 'Refund and Cancellation Policy'
} as const;

export type PolicySlug = keyof typeof policyTitles;
export const policySlugs = Object.keys(policyTitles) as PolicySlug[];

type ApprovedPolicy = {
  effectiveDate: string;
  sections: { heading: string; paragraphs: string[] }[];
};

// Drafts for SureWay review. Public pages use separate, approved snapshots.
export const draftPolicies: Record<PolicySlug, ApprovedPolicy['sections']> = {
  'privacy-policy': [
    { heading: 'Who we are', paragraphs: [
      'SureWay Compliance operates this website and handles personal information to provide vehicle document services in Nigeria. You can contact us about this policy or your personal information through Get support on the SureWay home page.'
    ] },
    { heading: 'Information we collect and why', paragraphs: [
      'When you order or make an enquiry, we collect the details you submit, such as your name, email, phone number, vehicle make and registration, supporting documents, delivery address, service selections and enquiry details. We use these details to assess and fulfil your request, communicate with you, arrange delivery or collection, and handle support, cancellations and refunds.',
      'Paystack collects payment details through its hosted checkout. SureWay receives the payment reference, amount and status for payment verification and related records. SureWay does not collect your full card number on this site.',
      'We also use technical information, such as request information used for rate limiting, to protect the site and prevent abuse. We process information as needed to provide requested services, meet applicable legal obligations and protect the service, or with consent where consent is required.'
    ] },
    { heading: 'Google Drive and other service providers', paragraphs: [
      'SureWay uses a Google-authorised business account to create a private Drive folder for each submission, save submission details and supporting files, and share access with the email address provided. Customers do not need to authorise access to their own Drive to place an order. We use information accessed through Google APIs to provide and support the disclosed document archive and sharing features. Our use and transfer of Google API data adheres to the Google API Services User Data Policy, including its Limited Use requirements.',
      'We use MongoDB for application records, Cloudinary for uploaded and completed files, Paystack for payments and refunds, Resend for email, and Meta WhatsApp for transactional updates. We may share details necessary for the requested service with relevant issuing authorities, insurers or service partners, and with delivery providers where applicable.',
      'Providers may handle data outside Nigeria. Where cross-border transfers apply, we use safeguards required by applicable data protection law.'
    ] },
    { heading: 'Access, retention and security', paragraphs: [
      'Access to submissions is limited according to the service being provided. Files may be shared through recipient-restricted Drive access or time-limited download links. Keep your order reference and access links private.',
      'We retain information for as long as needed to provide the service, handle disputes, and meet applicable record-keeping obligations. How long we retain a record depends on its purpose and the obligations that apply to it.'
    ] },
    { heading: 'Your choices and rights', paragraphs: [
      'Subject to applicable law, you may request access to or correction of your information, request deletion or restriction, object to certain uses, request portability where applicable, or withdraw consent for processing based on consent. You can use Get support to make a request and may lodge a complaint with the Nigeria Data Protection Commission.'
    ] }
  ],
  'terms-of-service': [
    { heading: 'Using SureWay', paragraphs: [
      'SureWay Compliance helps customers request vehicle document and related services. You must be authorised to submit the vehicle information and supporting documents you provide. Check that the details and documents are accurate and belong to the vehicle before submitting your request.',
      'Some requests require additional documents or approval from an issuing authority or other provider. Estimated processing times depend on the service, the completeness of your submission and any external approvals.'
    ] },
    { heading: 'Pricing and payment', paragraphs: [
      'Review the selected services, document fees, service charges, applicable tax and delivery charge before paying. Payments are made through Paystack. Keep the order reference so you can track the order or contact us about it.'
    ] },
    { heading: 'Document delivery and collection', paragraphs: [
      'We use your contact details to send order updates and share documents, subject to the service and delivery options selected. Where offered, you can request Lagos delivery or arrange collection. Keep your contact details up to date and protect any access links we send you.'
    ] },
    { heading: 'Cancellations, refunds and support', paragraphs: [
      'Our Refund and Cancellation Policy explains how to cancel online and request a review. Your statutory consumer rights continue to apply. To report a service problem or raise a complaint, use Get support on the SureWay home page and include your order reference if you have one.'
    ] },
    { heading: 'Corporate agreements', paragraphs: [
      'Service Level Agreements are available to business customers under separate written agreements agreed during corporate onboarding.'
    ] }
  ],
  'cookie-policy': [
    { heading: 'How we use browser storage', paragraphs: [
      'SureWay uses essential browser storage to remember your cart and cookie preferences. Preview-mode orders and enquiries can also be saved locally in your browser. A session cookie supports staff sign-in. Essential features continue to work when you reject optional cookies.',
      'Paystack operates its own hosted payment page. Its cookie practices are described by Paystack.'
    ] },
    { heading: 'Optional cookies and your choices', paragraphs: [
      'The current SureWay site does not load optional analytics or marketing cookies. Cookie settings lets you accept optional categories, reject them, or choose categories individually. If optional tools are added, they will load only where you have allowed the relevant category.',
      'You can reopen Cookie settings from the footer and change your choice. Clearing your browser storage also clears your saved choice and may remove your cart or preview data.'
    ] }
  ],
  'refund-and-cancellation-policy': [
    { heading: 'Cancelling online', paragraphs: [
      'Use Track your order to find your order and select Cancel order within 15 minutes of placing it. Online cancellation is available only before the requested documents have been created or issued. Once the time limit has passed or document creation is recorded, contact SureWay for assistance.'
    ] },
    { heading: 'Payments and refunds', paragraphs: [
      'Cancellation stops fulfilment. If a payment has been taken, SureWay will review it and determine any refund due. Completed orders are not ordinarily refundable for a change of mind. We review exceptions such as service failures, duplicate payments, or circumstances in which a remedy is required by law.',
      'Where a refund is approved, SureWay submits it through Paystack. The refund may remain pending while the payment provider processes it. Use your order reference to request an update.'
    ] },
    { heading: 'Statutory rights', paragraphs: [
      'The 15-minute limit applies to online self-service cancellation. It does not limit any right to cancel, receive a refund, or obtain another remedy under applicable Nigerian law. Use Get support to request a review outside the online cancellation window or report a service failure.'
    ] }
  ]
};

export const approvedPolicies: Partial<Record<PolicySlug, ApprovedPolicy>> = {};
