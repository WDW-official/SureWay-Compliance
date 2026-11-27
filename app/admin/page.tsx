'use client';

import BrandLogo, { ModalLogo } from '@/components/brand-logo';
import { refundLabels, refundPausesFulfillment } from '@/lib/refunds';
import { useState, useEffect, type FormEvent } from 'react';
import { ArrowUpRight, LogOut, LoaderCircle, PackageCheck, UsersRound, Mail, FileText, RefreshCw } from 'lucide-react';
import { money, statusLabels, statuses, insuranceLabels, uploadKindLabels, type Insurance, type RequestKinds, type UploadKind, type calculatePricing } from '@/lib/catalog';
type Archive = {
  submissionState?: string;
  submissionAttempts?: number;
  submissionError?: string;
  driveFolderId?: string;
};
function ArchiveStatus({ record }: { record: Archive }) {
  if (!record.submissionState) return null;
  return <p>{record.driveFolderId ? <a href={`https://drive.google.com/drive/folders/${encodeURIComponent(record.driveFolderId)}`} target="_blank" rel="noreferrer">Open Google Drive folder ↗</a> : `Google Drive: ${(record.submissionAttempts || 0) >= 10 ? 'needs attention' : record.submissionState}`}{record.submissionError && <small>{record.submissionError}</small>}</p>;
}
type Order = Archive & {
  _id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  make: string;
  vehicleType?: string;
  insurance?: Insurance;
  requests?: RequestKinds;
  pricing?: ReturnType<typeof calculatePricing>;
  plate: string;
  delivery: string;
  address: string;
  total: number;
  createdAt: string;
  paidAt?: string;
  paystackTransactionId?: string;
  documentsCreatedAt?: string;
  refund?: { reference: string; status: string; amountKobo: number; reason: string };
  documents: {
    name: string;
    url: string;
  }[];
  uploads: {
    documentType?: UploadKind;
    name: string;
    url: string;
  }[];
};
type Lead = Archive & {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  fleetSize?: number;
  kind: string;
  documents: string[];
  message: string;
  status: string;
  createdAt: string;
};
type Job = {
  key: string;
  subject: string;
  lastError: string;
  attempts: number;
};
export default function Admin() {
  const [logged, setLogged] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [orders, setOrders] = useState<Order[]>([]),
    [leads, setLeads] = useState<Lead[]>([]),
    [jobs, setJobs] = useState<Job[]>([]),
    [tab, setTab] = useState('orders'),
    [active, setActive] = useState<Order | null>(null),
    [password, setPassword] = useState('');
  async function load() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/orders');
      if (res.status === 401) {
        setLogged(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLogged(true);
      setOrders(data);
      const leadRes = await fetch('/api/admin/enquiries');
      const leadData = await leadRes.json();
      if (!leadRes.ok) throw new Error(leadData.error);
      setLeads(leadData.enquiries);
      setJobs(leadData.notifications);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load workspace');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPassword('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }
  async function updateOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        body: new FormData(e.currentTarget)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActive(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }
  async function orderAction(path: 'refund' | 'documents-created', input: Record<string, unknown>) {
    if (!active || busy) return;
    setBusy(true);
    setError('');
    const reference = active.reference;
    try {
      const response = await fetch('/api/admin/orders/' + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, ...input })
      });
      const data = await response.json();
      const { error, ...changes } = data;
      setActive(order => order?.reference === reference ? { ...order, ...changes } : order);
      if (!response.ok) throw new Error(error);
      setOrders(orders => orders.map(order => order.reference === reference ? { ...order, ...changes } : order));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update the order.');
    } finally {
      setBusy(false);
    }
  }
  async function updateLead(id: string, status: string) {
    setError('');
    try {
      const res = await fetch('/api/admin/enquiries', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          status
        })
      });
      if (!res.ok) throw new Error('Could not update enquiry');
      await load();
    } catch (e) {
      setError(String(e));
    }
  }
  return <div className="admin-app"><header className="admin-header"><BrandLogo href="/" /><a href="/" className="text-link">View website <ArrowUpRight size={14} /></a>{logged && <button onClick={async () => {
        await fetch('/api/admin/logout', {
          method: 'POST'
        });
        setLogged(false);
      }} className="text-link"><LogOut size={15} /> Sign out</button>}</header>{!logged ? <main className="admin-login"><div className="eyebrow">SUREWAY TEAM ACCESS</div><h1>A clearer view of the work ahead.</h1><p>Sign in to manage orders and enquiries.</p><form onSubmit={login}><label>Workspace password<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label><button className="button full-width" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : null} Sign in securely</button></form></main> : <main className="admin-main"><div className="admin-title"><div><div className="eyebrow">YOUR OPERATIONS, IN ONE PLACE</div><h1>Let’s keep things moving.</h1></div><button className="button" onClick={load} disabled={busy}><RefreshCw size={15} className={busy ? 'spin' : ''} /> Refresh</button></div><div className="admin-stats"><div><PackageCheck /><b>{orders.filter(o => !['completed', 'payment_pending', 'cancelled'].includes(o.status)).length}</b><span>Active paid orders</span></div><div><UsersRound /><b>{leads.filter(l => l.status === 'new').length}</b><span>New enquiries</span></div><div><Mail /><b>{jobs.length}</b><span>Pending notifications</span></div></div><div className="admin-tabs">{['orders', 'enquiries', 'notifications'].map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>{tab === 'orders' ? <div className="admin-table"><table><thead><tr><th>Reference / customer</th><th>Vehicle</th><th>Amount</th><th>Status</th><th /></tr></thead><tbody>{orders.map(o => <tr key={o._id}><td><b>{o.reference}</b><small>{o.name} · {o.email}</small></td><td>{o.make}<small>{o.plate}</small></td><td>{money(o.total, true)}</td><td><span className="admin-status">{statusLabels[o.status]}</span></td><td><button className="text-link" onClick={() => setActive(o)}>Manage <ArrowUpRight size={14} /></button></td></tr>)}</tbody></table>{!orders.length && <p className="admin-empty">New orders will appear here.</p>}</div> : tab === 'enquiries' ? <div className="admin-leads">{leads.map(l => <article key={l._id}><div className="eyebrow">{l.kind.toUpperCase()} ENQUIRY · {new Date(l.createdAt).toLocaleDateString()}</div><h3>{l.company || l.name}</h3><p>{l.name} · {l.fleetSize ? `${l.fleetSize} vehicles` : ''}</p><p><a href={'mailto:' + l.email}>{l.email}</a> · <a href={'tel:' + l.phone}>{l.phone}</a></p><p>{l.documents.join(', ')}</p><p className="lead-message">{l.message}</p><ArchiveStatus record={l} /><select aria-label="Enquiry status" value={l.status} onChange={e => updateLead(l._id, e.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="resolved">Resolved</option></select></article>)}{!leads.length && <p className="admin-empty">Fleet, registration and support enquiries will appear here.</p>}</div> : <div className="admin-leads">{jobs.map(j => <article key={j.key}><h3>{j.subject}</h3><p>{j.lastError || 'Queued for delivery'}</p><small>{j.attempts} delivery attempt(s)</small></article>)}{!jobs.length && <p className="admin-empty">All notifications have been delivered.</p>}</div>}</main>}{error && <div className="admin-error" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div>}{active && <div className="modal-backdrop" onClick={() => setActive(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="order-title" onClick={e => e.stopPropagation()}><div className="modal-top"><ModalLogo /><button onClick={() => setActive(null)} aria-label="Close">×</button></div><h2 id="order-title">{active.reference}</h2><p className="modal-description">{active.name} · {active.email}<br />{active.phone}<br />{active.make} · {active.plate}{active.vehicleType && ` · ${active.vehicleType}`}<br />{active.insurance && active.pricing?.items?.length === 0 ? 'Digital insurance order' : active.delivery === 'delivery' ? active.address : 'Free collection'}</p><ArchiveStatus record={active} />
<div className="review-items">
 {active.pricing?.items?.map(item => <div key={item.id}>
  <span>{item.name}{(item.id === 'cmr' || item.id === 'tint') && active.requests?.[item.id] && ` · ${active.requests[item.id]}`}</span>
  <b>{money(item.fee)} + {money(item.charge)}</b>
 </div>)}
 {active.insurance && <div>
  <span>{insuranceLabels[active.insurance.kind]}{active.insurance.kind === 'comprehensive' && ` · Vehicle value ${money(active.insurance.vehicleValue, true)}`}</span>
  <b>{money(active.pricing?.premium ?? 0, true)}</b>
 </div>}
</div>
<div className="admin-documents">{[...active.uploads, ...active.documents].map((file: Order['uploads'][number], i) => <a href={file.url} target="_blank" rel="noreferrer" key={i}><FileText size={15} />{file.name}{file.documentType && ` · ${uploadKindLabels[file.documentType]}`}<ArrowUpRight size={13} /></a>)}</div>
{['paid', 'processing'].includes(active.status) && !refundPausesFulfillment(active.refund, active.total) && !active.documentsCreatedAt && !active.documents.length &&
  <button className="text-link" type="button" disabled={busy} onClick={() => orderAction('documents-created', {})}>Mark documents created</button>}
{active.documentsCreatedAt && <p className="modal-footnote">Document creation recorded.</p>}
{active.paidAt && active.paystackTransactionId && <section className="admin-refund" aria-label="Refund">
  <h3>Exceptional refund</h3>
  {active.refund ? <>
    <p>{refundLabels[active.refund.status]} · {money(active.refund.amountKobo / 100, true)}</p>
    <p className="modal-footnote">{active.refund.reference}</p>
    {active.refund.status !== 'processed' &&
      <button className="text-link" type="button" disabled={busy} onClick={() => orderAction('refund', { action: 'refresh' })}>Check status with Paystack</button>}
  </> : <form className="stacked-form" onSubmit={event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void orderAction('refund', {
      action: 'refund',
      amountKobo: Math.round(Number(form.get('amount')) * 100),
      reason: form.get('reason')
    });
  }}>
    <label>Refund amount (₦)<input name="amount" type="number" min="0.01" max={active.total} step="0.01" defaultValue={active.total} required /></label>
    <label>Reason for the exception<textarea name="reason" minLength={10} maxLength={250} required /></label>
    <button className="button" disabled={busy}>Submit refund to Paystack</button>
  </form>}
</section>}
{active.status === 'cancelled' ? <div className="info-box">This order was cancelled. Fulfillment has stopped.</div> : refundPausesFulfillment(active.refund, active.total) ? <div className="info-box">Fulfillment is paused for this refund.</div> : active.status === 'payment_pending' ? <div className="info-box">Awaiting verified Paystack payment. Processing can begin after payment is confirmed.</div> : <form onSubmit={updateOrder} className="stacked-form"><input type="hidden" name="reference" value={active.reference} /><label>Update status<select name="status" defaultValue={active.status === 'paid' ? 'processing' : active.status}>{statuses.filter(s => !['paid', 'payment_pending'].includes(s) && !(active.insurance && active.pricing?.items?.length === 0 && ['out_for_delivery', 'ready_for_collection'].includes(s))).map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label><label>Attach a completed document<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" /></label><p className="modal-footnote">Status updates are queued for email and the customer’s selected WhatsApp channel. File links expire after 24 hours; customers can obtain fresh links through order tracking.</p><button className="button" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : null}Save & notify customer</button></form>}</section></div>}</div>;
}
