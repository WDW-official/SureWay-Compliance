const cancellationWindowMs = 15 * 60 * 1000;
export const cancellableStatuses = ['payment_pending', 'paid', 'processing'];
export const issuanceStatuses = ['soft_copies_ready', 'ready_for_collection', 'out_for_delivery', 'completed'];

type CancellationOrder = {
  status: string;
  createdAt?: Date;
  documentsCreatedAt?: Date;
  documents?: unknown[];
  history?: { status: string }[];
};

export function cancellationDeadline(order: CancellationOrder, now = Date.now()) {
  if (!cancellableStatuses.includes(order.status) || order.documentsCreatedAt || order.documents?.length ||
      order.history?.some(entry => issuanceStatuses.includes(entry.status))) return null;
  const deadline = (order.createdAt?.getTime() ?? Number.NaN) + cancellationWindowMs;
  return deadline > now ? new Date(deadline) : null;
}

export function cancellationFilter(now = new Date()) {
  return {
    status: { $in: cancellableStatuses },
    createdAt: { $gt: new Date(now.getTime() - cancellationWindowMs) },
    documentsCreatedAt: null,
    'documents.0': { $exists: false },
    'history.status': { $nin: issuanceStatuses }
  };
}
