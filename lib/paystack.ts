import 'server-only';
import { db } from './server';
import { notifyPaid } from './notifications';
export async function paystack(path: string, body?: unknown) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    method: body ? 'POST' : 'GET',
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  });
  const json = await response.json();
  if (!response.ok || !json.status) throw new Error('Payment service is temporarily unavailable. Please try again.');
  return json.data;
}
export async function settle(data: Record<string, unknown>) {
  if (data.status !== 'success' || data.currency !== 'NGN') throw new Error('Payment has not been completed.');
  const database = await db();
  const orders = database.collection('orders');
  let order = await orders.findOne({
    reference: data.reference
  });
  if (!order || Number(data.amount) !== Math.round(order.total * 100)) throw new Error('Payment amount does not match this order.');
  const paidAt = new Date();
  const payment = { paidAt, updatedAt: paidAt, paystackTransactionId: String(data.id) };
  if (order.status === 'payment_pending') {
    order = await orders.findOneAndUpdate(
      { _id: order._id, status: 'payment_pending' },
      { $set: { status: 'paid', ...payment } },
      { returnDocument: 'after' }
    ) ?? await orders.findOne({ _id: order._id });
    if (!order) throw new Error('Order not found');
  }
  if (order.status === 'cancelled') {
    await orders.updateOne(
      { _id: order._id, status: 'cancelled', paidAt: null },
      { $set: payment }
    );
    return { reference: order.reference, status: 'cancelled' };
  }
  await notifyPaid(order);
  return {
    reference: order.reference,
    status: order.status
  };
}
