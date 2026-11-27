import { z } from 'zod';
import { paystack } from '@/lib/paystack';
import { admin, db, failure, limit, sameOrigin } from '@/lib/server';

const reference = z.string().regex(/^SW-[A-F0-9]{16}$/);
const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('refresh'), reference }),
  z.object({
    action: z.literal('refund'),
    reference,
    reason: z.string().trim().min(10).max(250),
    amountKobo: z.number().int().positive()
  })
]);

type ProviderRefund = {
  id: number;
  transaction: number | { id: number };
  amount: number;
  currency: string;
  status: string;
};

function providerDetails(refund: ProviderRefund) {
  return {
    'refund.providerId': refund.id,
    'refund.status': ['processed', 'failed', 'needs-attention'].includes(refund.status) ? refund.status : 'pending',
    'refund.checkedAt': new Date()
  };
}

function matchesRefund(refund: ProviderRefund, transactionId: string, amountKobo: number) {
  const transaction = typeof refund.transaction === 'object' ? refund.transaction?.id : refund.transaction;
  return String(transaction) === transactionId && refund.currency === 'NGN' && refund.amount === amountKobo;
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await admin();
    await limit(request, 'admin-refund', 12);
    if (!process.env.PAYSTACK_SECRET_KEY) return Response.json({ error: 'Paystack is not configured.' }, { status: 503 });
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: 'Enter a valid refund amount and a reason of 10 to 250 characters.' }, { status: 400 });

    const input = parsed.data;
    const orders = (await db()).collection('orders');
    const order = await orders.findOne({ reference: input.reference });
    if (!order) return Response.json({ error: 'Order not found.' }, { status: 404 });
    if (!order.paidAt || !order.paystackTransactionId) {
      return Response.json({ error: 'Refunds require a verified Paystack payment.' }, { status: 409 });
    }

    if (input.action === 'refund') {
      if (input.amountKobo > Math.round(order.total * 100)) {
        return Response.json({ error: 'The refund amount exceeds the amount paid.' }, { status: 400 });
      }
      const refund = {
        reference: `REFUND-${input.reference}`,
        status: 'submitting',
        amountKobo: input.amountKobo,
        reason: input.reason,
        requestedAt: new Date()
      };
      const claimed = await orders.updateOne(
        { _id: order._id, status: order.status, refund: null },
        { $set: { refund }, $inc: { fulfillmentRevision: 1 } }
      );
      if (!claimed.matchedCount) {
        return Response.json({ error: 'This order changed or already has a refund. Refresh its status before taking further action.' }, { status: 409 });
      }

      try {
        const result: ProviderRefund = await paystack('/refund', {
          transaction: order.paystackTransactionId,
          amount: refund.amountKobo,
          currency: 'NGN',
          merchant_note: refund.reason,
          reference: refund.reference
        });
        if (!matchesRefund(result, order.paystackTransactionId, refund.amountKobo)) {
          throw new Error('Unexpected Paystack refund details.');
        }
        const changes = providerDetails(result);
        await orders.updateOne(
          { _id: order._id, 'refund.reference': refund.reference, 'refund.status': 'submitting' },
          { $set: changes }
        );
      } catch {
        return Response.json({
          refund,
          error: 'Paystack did not confirm the request. Check the refund status or reconcile it in Paystack before taking further action.'
        }, { status: 502 });
      }
    } else {
      if (!order.refund) return Response.json({ error: 'No refund has been requested.' }, { status: 409 });
      if (order.refund.status !== 'processed') {
        const filters = new URLSearchParams({ reference: order.refund.reference, transaction: order.paystackTransactionId });
        const results: ProviderRefund[] = await paystack('/refund?' + filters.toString());
        const result = results.find(item => matchesRefund(item, order.paystackTransactionId, order.refund.amountKobo));
        if (!result) return Response.json({ error: 'Paystack has no matching refund yet. Check the reference in the Paystack dashboard.' }, { status: 409 });
        await orders.updateOne(
          { _id: order._id, 'refund.reference': order.refund.reference, 'refund.status': order.refund.status },
          { $set: providerDetails(result) }
        );
      }
    }

    const updated = await orders.findOne({ _id: order._id }, { projection: { refund: 1 } });
    return Response.json({ refund: updated?.refund });
  } catch (error) {
    return failure(error);
  }
}
