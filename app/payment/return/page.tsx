'use client';

import { useEffect, useState } from 'react';
import { CheckCheck, LoaderCircle, CircleHelp, ArrowRight } from 'lucide-react';
export default function PaymentReturn() {
  const [status, setStatus] = useState('loading'),
    [message, setMessage] = useState(''),
    [reference, setReference] = useState('');
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('reference') || new URLSearchParams(window.location.search).get('trxref');
    if (!ref) {
      setStatus('error');
      setMessage('No payment reference was provided.');
      return;
    }
    setReference(ref);
    fetch('/api/payments/verify?reference=' + encodeURIComponent(ref)).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setStatus('success');
    }).catch(e => {
      setStatus('error');
      setMessage(e.message || 'We could not verify your payment yet. Please keep your reference and contact our team.');
    });
  }, []);
  return <main className="payment-page"><div className="payment-card">{status === 'loading' ? <LoaderCircle className="spin" size={40} /> : status === 'success' ? <CheckCheck size={40} /> : <CircleHelp size={40} />}<h1>{status === 'loading' ? 'Checking your payment…' : status === 'success' ? 'Your documents are in good hands.' : 'Let’s check that payment.'}</h1><p>{status === 'success' ? 'Your payment is confirmed. Our team will follow up with the next steps. Keep your reference to track your order.' : message}</p>{reference && <div className="reference-box"><small>YOUR ORDER REFERENCE</small><strong>{reference}</strong></div>}<a className="button" href="/">Back to SureWay <ArrowRight size={17} /></a></div></main>;
}
