export const refundLabels: Record<string, string> = {
  review: 'Payment awaiting refund review',
  submitting: 'Refund awaiting confirmation',
  pending: 'Refund pending',
  processed: 'Refund processed',
  failed: 'Refund needs attention',
  'needs-attention': 'Refund needs attention'
};

export function refundPausesFulfillment(refund: { status: string; amountKobo: number } | undefined, total: number) {
  return !!refund && (
    ['submitting', 'pending', 'needs-attention'].includes(refund.status) ||
    (refund.status === 'processed' && refund.amountKobo >= Math.round(total * 100))
  );
}
