'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, Clock3, FileText, ShieldCheck, CarFront, Truck, UsersRound, ShoppingCart, Menu, X, Plus, Minus, MapPin, Mail, MessageCircle, LockKeyhole, UploadCloud, Search, CircleHelp, Building2, Sparkles, PackageCheck, LoaderCircle, CheckCircle2, Download } from 'lucide-react';
import { services, vehicleTypes, calculatePricing, money, statusLabels, type Delivery } from '@/lib/catalog';
type Panel = 'checkout' | 'fleet' | 'registration' | 'support' | 'track' | null;
type Customer = {
  name: string;
  email: string;
  phone: string;
  make: string;
  plate: string;
  address: string;
  channel: string;
};
const initialCustomer: Customer = {
  name: '',
  email: '',
  phone: '',
  make: '',
  plate: '',
  address: '',
  channel: 'both'
};
const faq = [['Do I need an account to order?', 'No account needed. Select your documents, share your vehicle and contact details, and pay securely. Keep your order reference to track progress.'], ["What is included in the price?", 'Your document fees, our processing charge, 7.5% VAT on the service charge, and any delivery fee are shown separately before payment. Collection is free.'], ['How do I receive my documents?', 'We share soft copies by email and/or WhatsApp. Choose delivery within Lagos for ₦5,000, or collect the originals for free. Our team will confirm the collection location when they are ready.'], ['Can you help with a company fleet?', 'Yes. We support organizations, including Unilever. Send us your fleet size and usual document requirements, and our team will get in touch to arrange the service.']];
function Logo() {
  return <a href="#" className="brand" aria-label="SureWay home"><span className="brand-mark"><Check strokeWidth={1.8} /></span><span>SureWay<small>COMPLIANCE</small></span></a>;
}
function ServiceIcon({
  kind
}: {
  kind: string;
}) {
  return kind === 'shield' ? <ShieldCheck size={23} strokeWidth={1.4} /> : kind === 'car' ? <CarFront size={23} strokeWidth={1.4} /> : <FileText size={23} strokeWidth={1.4} />;
}
export default function Platform() {
  const [selected, setSelected] = useState<string[]>([]),
    [vehicle, setVehicle] = useState<string>('Car'),
    [category, setCategory] = useState('All services'),
    [delivery, setDelivery] = useState<Delivery>('delivery');
  const [menu, setMenu] = useState(false),
    [panel, setPanel] = useState<Panel>(null),
    [step, setStep] = useState(1),
    [demo, setDemo] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  const [customer, setCustomer] = useState<Customer>(initialCustomer),
    [files, setFiles] = useState<File[]>([]),
    [consent, setConsent] = useState(false),
    [query, setQuery] = useState(''),
    [faqOpen, setFaqOpen] = useState<number | null>(null),
    [toast, setToast] = useState('');
  const [trackResult, setTrackResult] = useState<Record<string, unknown> | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const totals = calculatePricing(selected, delivery),
    chosen = services.filter(s => selected.includes(s.id));
  useEffect(() => {
    fetch('/api/config').then(r => r.ok ? r.json() : null).then(c => {
      if (c) setDemo(c.demo);
    }).catch(() => {});
    try {
      const saved = JSON.parse(localStorage.getItem('sureway-cart') || 'null');
      if (saved) {
        setSelected(saved.selected.filter((id: string) => services.some(s => s.id === id)));
        setVehicle(saved.vehicle || 'Car');
        setDelivery(saved.delivery === 'collection' ? 'collection' : 'delivery');
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('sureway-cart', JSON.stringify({
        selected,
        vehicle,
        delivery
      }));
    } catch {}
  }, [selected, vehicle, delivery]);
  useEffect(() => {
    if (!panel && !menu) return;
    const active = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPanel(null);
        setMenu(false);
      }
      if (e.key === 'Tab') {
        const root = document.querySelector('[role="dialog"]');
        const focusable = root?.querySelectorAll<HTMLElement>('button:not(:disabled),a,input,select,textarea');
        if (!focusable?.length) return;
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', key);
      active?.focus();
    };
  }, [panel, menu]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  function toggle(id: string) {
    setSelected(s => s.includes(id) ? s.filter(v => v !== id) : [...s, id]);
  }
  function open(p: Panel) {
    setPanel(p);
    setMenu(false);
    setStep(1);
    setError('');
    setSuccess('');
    setTrackResult(null);
  }
  function scrollServices() {
    setMenu(false);
    document.getElementById('services')?.scrollIntoView({
      behavior: 'smooth'
    });
  }
  function checkout() {
    if (!selected.length) {
      scrollServices();
      setToast('Choose at least one document to get started.');
      return;
    }
    open('checkout');
  }
  function field(key: keyof Customer, value: string) {
    setCustomer(c => ({
      ...c,
      [key]: value
    }));
  }
  async function pay() {
    setError('');
    setBusy(true);
    try {
      if (demo) {
        const reference = 'SW-DEMO-' + Date.now().toString(36).toUpperCase();
        const order = {
          reference,
          email: customer.email,
          name: customer.name,
          vehicleType: vehicle,
          make: customer.make,
          plate: customer.plate,
          services: selected,
          delivery,
          total: totals.total,
          status: 'payment_pending',
          createdAt: new Date().toISOString()
        };
        const orders = JSON.parse(localStorage.getItem('sureway-demo-orders') || '[]');
        localStorage.setItem('sureway-demo-orders', JSON.stringify([...orders, order]));
        setSuccess(reference);
        return;
      }
      const uploadIds: string[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/uploads', {
          method: 'POST',
          body: form
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        uploadIds.push(data.token);
      }
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...customer,
          services: selected,
          vehicleType: vehicle,
          delivery,
          uploads: uploadIds,
          consent
        })
      });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error || 'Could not create your order');
      const payment = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reference: order.reference,
          accessToken: order.accessToken
        })
      });
      const result = await payment.json();
      if (!payment.ok) throw new Error(result.error || 'Could not start payment');
      window.location.assign(result.authorizationUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function enquiry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const data = {
      kind: panel,
      name: form.get('name'),
      email: form.get('email'),
      phone: form.get('phone'),
      company: form.get('company') || '',
      fleetSize: form.get('fleetSize') || undefined,
      documents: form.getAll('documents'),
      message: form.get('message') || '',
      consent: form.get('consent') === 'on'
    };
    try {
      if (demo) {
        const leads = JSON.parse(localStorage.getItem('sureway-demo-enquiries') || '[]');
        localStorage.setItem('sureway-demo-enquiries', JSON.stringify([...leads, {
          ...data,
          createdAt: new Date().toISOString()
        }]));
        setSuccess('enquiry');
      } else {
        const res = await fetch('/api/enquiries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        setSuccess('enquiry');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your enquiry. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function track(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setTrackResult(null);
    const data = new FormData(e.currentTarget);
    const reference = String(data.get('reference')).trim(),
      email = String(data.get('email')).trim();
    try {
      if (demo) {
        const orders = JSON.parse(localStorage.getItem('sureway-demo-orders') || '[]');
        const order = orders.find((o: {
          reference: string;
          email: string;
        }) => o.reference.toLowerCase() === reference.toLowerCase() && o.email.toLowerCase() === email.toLowerCase());
        if (!order) throw new Error('No preview order matches these details. Check the reference and email.');
        setTrackResult(order);
      } else {
        const response = await fetch('/api/orders/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reference,
            email
          })
        });
        const order = await response.json();
        if (!response.ok) throw new Error(order.error);
        setTrackResult(order);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not find your order');
    } finally {
      setBusy(false);
    }
  }
  const visible = services.filter(s => (category === 'All services' || s.category === category) && (s.name + ' ' + s.description).toLowerCase().includes(query.toLowerCase()));
  return <>
 <div className="announcement"><Sparkles size={12} /><span>Soft copies first. Hard copies delivered across Lagos.</span><a href="#how-it-works">See how it works <ArrowRight size={12} /></a></div>
 <header className="header"><div className="container header-inner"><Logo /><nav aria-label="Main navigation"><a href="#services">Our services</a><a href="#how-it-works">How it works</a><button onClick={() => open('fleet')}>For organizations</button></nav><div className="header-actions"><button className="cart-button" onClick={checkout} aria-label={`Open order, ${selected.length} documents`}><ShoppingCart size={21} strokeWidth={1.5} /><span>{selected.length}</span></button><button className="button button-small desktop-start" onClick={scrollServices}>Get started <ArrowUpRight size={15} /></button><button className="menu-button" onClick={() => setMenu(true)} aria-label="Open menu"><Menu /></button></div></div></header>
 <main>
 <section className="container hero" aria-label="Vehicle documents made simple">
  <div className="hero-main"><div className="hero-grid" /><div className="eyebrow light"><span className="status-dot" /> LAGOS · VEHICLE DOCUMENT SERVICES</div><h1>Your documents.<br /><span>Handled.</span></h1><p>Less paperwork. More peace of mind.<br className="desktop-break" /> From renewals to new registrations, we take care of the details.</p><button className="button hero-cta" onClick={scrollServices}>Sort my documents <ArrowUpRight size={19} /></button><div className="hero-links"><button onClick={() => open('fleet')}>I manage a fleet <ArrowUpRight size={14} /></button><button onClick={() => open('support')}>Get support <ArrowUpRight size={14} /></button></div><div className="hero-bottom"><ShieldCheck size={15} /><span>A little less admin. A lot more road ahead.</span></div>
  </div>
  <div className="hero-tiles">
   <button className="feature-tile green" onClick={scrollServices}><span className="tile-icon"><FileText /></span><span className="tile-value">6 essentials</span><span className="tile-label">VEHICLE DOCUMENT SERVICES</span><span className="tile-link">Explore services <ArrowUpRight size={15} /></span></button>
   <button className="feature-tile blue" onClick={() => open('registration')}><span className="tile-icon"><CarFront /></span><span className="tile-value">New wheels?</span><span className="tile-label">NEW VEHICLE REGISTRATION</span><span className="tile-link">Let’s get you registered <ArrowUpRight size={15} /></span></button>
   <button className="feature-tile purple" onClick={() => {
            setDelivery('delivery');
            scrollServices();
          }}><span className="tile-icon"><Truck /></span><span className="tile-value">₦5,000</span><span className="tile-label">DELIVERY ACROSS LAGOS</span><span className="tile-link">Or collect for free <ArrowUpRight size={15} /></span></button>
   <button className="feature-tile gold" onClick={() => open('fleet')}><span className="tile-icon"><UsersRound /></span><span className="tile-value">The whole fleet.</span><span className="tile-label">SUPPORT FOR ORGANIZATIONS</span><span className="tile-link">Talk to our team <ArrowUpRight size={15} /></span></button>
  </div>
 </section>
 <div className="container"><div className="promise-strip"><span><CheckCheck size={17} /> Renewals & new registrations</span><span><Mail size={16} /> Soft copies by email & WhatsApp</span><span><PackageCheck size={17} /> Delivery or free collection</span><span className="promise-tag"><ShieldCheck size={16} /> One less thing to worry about.</span></div></div>
 <section className="container services-section" id="services"><div className="section-heading"><div><div className="eyebrow">01 / FOR INDIVIDUALS</div><h2>What can we take<br className="mobile-break" /> off your plate?</h2><p>Choose your vehicle, select your documents, and see exactly what you’ll pay.</p></div><span className="section-note"><span className="status-dot" /> Clear fees. No guesswork.</span></div>
 <div className="vehicle-select"><span>Your vehicle type</span><div role="group" aria-label="Vehicle type">{vehicleTypes.map(v => <button key={v} onClick={() => setVehicle(v)} className={vehicle === v ? 'active' : ''}>{v === 'Car' ? <CarFront size={16} /> : null}{v}</button>)}</div></div>
 <div className="services-layout"><div className="catalog"><div className="catalog-toolbar"><div className="category-tabs" role="group" aria-label="Service category">{['All services', 'Essentials', 'Permits', 'Commercial', 'Registration'].map(c => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div><button className="search-toggle" onClick={() => document.getElementById('service-search')?.focus()} aria-label="Search services"><Search size={18} /></button></div><label className="search-field"><Search size={16} /><input id="service-search" placeholder="Find a document…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={15} /></button>}</label>
 {category === 'Registration' ? <div className="registration-card"><span className="tile-icon"><CarFront /></span><h3>A fresh start for your new vehicle.</h3><p>Get help with your first registration, number plates and ownership documents. Tell us about your vehicle for a tailored quote.</p><button className="button" onClick={() => open('registration')}>Request registration <ArrowUpRight size={17} /></button></div> : <div className="service-grid">{visible.map(s => <button key={s.id} className={'service-card ' + (selected.includes(s.id) ? 'selected' : '')} onClick={() => toggle(s.id)} aria-pressed={selected.includes(s.id)}><div className="service-card-top"><span className="service-icon"><ServiceIcon kind={s.icon} /></span><span className="select-indicator">{selected.includes(s.id) ? <Check size={14} /> : <Plus size={15} />}</span></div><h3>{s.name}</h3><p>{s.description}</p><div className="service-pricing"><span><strong>{money(s.fee)}</strong><small>Document fee</small></span><span><b>+ {money(s.charge)}</b><small>Service charge</small></span></div></button>)}{!visible.length && <div className="empty-search"><Search size={28} /><h3>No documents found</h3><p>Try another name or view all our services.</p><button className="text-link" onClick={() => {
                  setCategory('All services');
                  setQuery('');
                }}>View all services <ArrowRight size={15} /></button></div>}</div>}
 <div className="registration-nudge"><span className="nudge-icon"><CarFront size={20} /></span><span><b>Registering a new vehicle?</b><small>We’ll help you get road-ready from the start.</small></span><button onClick={() => open('registration')}>Let’s talk <ArrowUpRight size={17} /></button></div><p className="price-note"><CircleHelp size={14} /> Document fees, service charges, VAT and delivery are shown separately.</p>
 </div>
 <aside className="order-summary" aria-label="Your order"><div className="order-title"><h3>Your order</h3><span>{selected.length} selected</span></div>{chosen.length ? <div className="order-items">{chosen.map(s => <div className="order-item" key={s.id}><span>{s.name}<small>{vehicle}</small></span><button onClick={() => toggle(s.id)} aria-label={`Remove ${s.name}`}><X size={16} /></button></div>)}</div> : <div className="empty-order"><span><FileText size={28} strokeWidth={1.2} /></span><p>A little less paperwork<br />starts here.</p><small>Select the documents you need<br />and we’ll take it from there.</small></div>}
 <div className="delivery-toggle" role="group" aria-label="Receive hard copies"><button className={delivery === 'delivery' ? 'active' : ''} onClick={() => setDelivery('delivery')}><Truck size={13} /> Delivery · ₦5,000</button><button className={delivery === 'collection' ? 'active' : ''} onClick={() => setDelivery('collection')}>Collection · Free</button></div><dl className="order-costs"><div><dt>Document fees</dt><dd>{money(totals.documents)}</dd></div><div><dt>Service charges</dt><dd>{money(totals.charges)}</dd></div><div><dt>VAT on service charges (7.5%)</dt><dd>{money(totals.vat, true)}</dd></div><div><dt>{delivery === 'delivery' ? 'Lagos delivery' : 'Collection'}</dt><dd>{delivery === 'collection' ? 'Free' : money(totals.shipping)}</dd></div></dl><div className="order-total"><span>Total to pay</span><strong>{money(totals.total, totals.total % 1 !== 0)}</strong></div><button className="button" onClick={checkout}>Continue to vehicle details <ArrowRight size={16} /></button><p className="secure-note"><LockKeyhole size={11} /> Review everything before you pay</p><div className="paystack-note"><span className="paystack-bars"><i /><i /><i /><i /></span><span>Secured by <b>paystack</b></span></div></aside></div>
 </section>
 <section className="how-section" id="how-it-works"><div className="container"><div className="section-heading"><div><div className="eyebrow">02 / A LITTLE LESS LIFE ADMIN</div><h2>Paperwork, without<br />the runaround.</h2></div><p className="heading-aside">Three simple steps.<br />We’ll take it from there.</p></div><div className="steps-grid">{[{
              number: '01',
              icon: <FileText />,
              title: 'Choose your documents',
              body: 'Select your services, share your vehicle details, and upload your existing papers. Review every charge before paying.'
            }, {
              number: '02',
              icon: <Clock3 />,
              title: 'Leave the processing with us',
              body: 'Our team handles your request and checks the completed documents. You can track your order along the way.'
            }, {
              number: '03',
              icon: <PackageCheck />,
              title: 'Soft copies. Then originals.',
              body: 'Receive your soft copies by email or WhatsApp. We’ll arrange Lagos delivery or get your originals ready for collection.'
            }].map(s => <div className="step-card" key={s.number}><div><span>{s.number}</span>{s.icon}</div><h3>{s.title}</h3><p>{s.body}</p></div>)}</div></div></section>
 <section className="container fleet-section" id="organizations"><div className="fleet-copy"><div className="eyebrow light">03 / FOR ORGANIZATIONS</div><h2>One vehicle or a whole fleet.<br /><span>You’re in good hands.</span></h2><p>Keep your team moving while we handle the paperwork. Get coordinated document processing and a real person to help with your requirements.</p><button className="button" onClick={() => open('fleet')}>Let’s talk about your fleet <ArrowUpRight size={17} /></button><div className="fleet-trust">Supporting organizations including <b>Unilever</b></div></div><div className="fleet-visual" aria-hidden="true"><div className="fleet-visual-header"><span className="mini-logo"><Check size={16} /></span><b>A clearer road ahead.</b><span className="fleet-dots">•••</span></div><div className="fleet-visual-title"><span>YOUR FLEET, TAKEN CARE OF</span><ShieldCheck size={20} /></div>{[{
            icon: <CarFront />,
            name: 'Vehicle renewals',
            sub: 'Keep every vehicle up to date',
            tag: 'Handled'
          }, {
            icon: <FileText />,
            name: 'Permits & certificates',
            sub: 'The right papers for every journey',
            tag: 'Handled'
          }, {
            icon: <UsersRound />,
            name: 'Your dedicated team',
            sub: 'Real people, a direct conversation',
            tag: 'Here for you'
          }].map(r => <div className="fleet-row" key={r.name}><span className="fleet-row-icon">{r.icon}</span><span><b>{r.name}</b><small>{r.sub}</small></span><span className="fleet-row-status"><Check size={11} />{r.tag}</span></div>)}<div className="fleet-visual-bottom"><span className="status-dot" /> Less chasing. More doing.</div></div></section>
 <section className="container faq-section"><div className="faq-intro"><div className="eyebrow">GOOD QUESTIONS. STRAIGHT ANSWERS.</div><h2>A few things<br />you might be wondering.</h2><p>Need a hand with something else?<br />We’re happy to help.</p><button className="text-link" onClick={() => open('support')}>Talk to our team <ArrowUpRight size={16} /></button></div><div className="faq-list">{faq.map(([question, answer], i) => <div className={'faq-item ' + (faqOpen === i ? 'open' : '')} key={question}><button aria-expanded={faqOpen === i} aria-controls={`faq-${i}`} onClick={() => setFaqOpen(faqOpen === i ? null : i)}>{question}{faqOpen === i ? <Minus size={18} /> : <Plus size={18} />}</button><div id={`faq-${i}`} hidden={faqOpen !== i}><p>{answer}</p></div></div>)}</div></section>
 <div className="container final-cta"><div><span className="eyebrow">LET’S GET YOU ROAD-READY</span><h2>Your next journey starts here.</h2></div><button className="button" onClick={scrollServices}>Sort my documents <ArrowUpRight size={17} /></button></div>
 </main>
 <footer><div className="container footer-main"><div><Logo /><p>A little less paperwork.<br />A little more peace of mind.</p></div><div className="footer-links"><a href="#services">Our services</a><a href="#how-it-works">How it works</a><button onClick={() => open('fleet')}>For organizations</button></div><div className="footer-links"><button onClick={() => open('track')}>Track your order</button><button onClick={() => open('support')}>Get support</button><span><MapPin size={13} /> Lagos, Nigeria</span></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} SureWay Compliance. All rights reserved.</span><span>Made for the road ahead. <ArrowUpRight size={12} /></span></div></footer>
 <button className="chat-button" onClick={() => open('support')} aria-label="Get help"><MessageCircle size={24} /><span className="chat-notification" /></button>
 {toast && <div className="toast" role="status"><CircleHelp size={18} />{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={16} /></button></div>}
 {demo && <div className="preview-badge"><span className="status-dot" /> Preview mode <span>·</span> No live payments</div>}
 {menu && <div className="modal-backdrop mobile-menu-backdrop" onClick={() => setMenu(false)}><div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation" onClick={e => e.stopPropagation()}><div className="modal-top"><Logo /><button ref={closeRef} onClick={() => setMenu(false)} aria-label="Close menu"><X /></button></div><h3>Vehicle documents</h3><div className="mobile-menu-feature"><button onClick={() => {
            setCategory('Essentials');
            scrollServices();
          }}><FileText size={18} /> Vehicle renewals <small>Essentials</small></button><button onClick={() => {
            setCategory('Permits');
            scrollServices();
          }}><Check size={18} /> Permits & certificates</button><button onClick={() => open('registration')}><Plus size={18} /> New vehicle registration</button></div><button onClick={scrollServices}>All services <ArrowUpRight size={16} /></button><a href="#how-it-works" onClick={() => setMenu(false)}>How it works <ArrowUpRight size={16} /></a><button onClick={() => open('fleet')}>For organizations <ArrowUpRight size={16} /></button><button onClick={() => open('track')}>Track your order <ArrowUpRight size={16} /></button><button onClick={() => open('support')}>Get support <ArrowUpRight size={16} /></button><button className="button" onClick={() => open('support')}>Talk to our team <ArrowRight size={17} /></button></div></div>}
 {panel && <div className="modal-backdrop" onClick={() => !busy && setPanel(null)}><section className={'modal ' + (panel === 'checkout' ? 'checkout-modal' : '')} role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={e => e.stopPropagation()}><div className="modal-top"><span className="eyebrow">SUREWAY COMPLIANCE</span><button ref={closeRef} onClick={() => setPanel(null)} disabled={busy} aria-label="Close dialog"><X size={22} /></button></div>
 {success ? <div className="success-panel"><span className="success-icon"><CheckCheck size={34} /></span><div className="eyebrow">{demo ? 'PREVIEW COMPLETE' : 'YOU’RE ALL SET'}</div><h2 id="modal-title">{success === 'enquiry' ? demo ? 'Your enquiry is ready.' : 'We’ll take it from here.' : 'Your preview order is ready.'}</h2><p>{demo ? success === 'enquiry' ? 'Saved in this browser for this preview. This enquiry has not been sent to the SureWay team.' : 'No payment has been taken and no request has been sent. Your preview order is saved in this browser.' : 'Our team has received your enquiry and will contact you to discuss the next steps.'}</p>{success !== 'enquiry' && <div className="reference-box"><small>YOUR ORDER REFERENCE</small><strong>{success}</strong><button className="text-link" onClick={() => {
              navigator.clipboard?.writeText(success);
              setToast('Order reference copied');
            }}>Copy reference</button></div>}<button className="button" onClick={() => setPanel(null)}>Back to SureWay <ArrowRight size={17} /></button></div> : panel === 'checkout' ? <><h2 id="modal-title">Let’s get your documents sorted.</h2><p className="modal-description">Just a few details, and we’ll take it from here.</p><div className="checkout-steps">{['Your details', 'Documents', 'Review & pay'].map((label, i) => <span key={label} className={step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}><i>{step > i + 1 ? <Check size={12} /> : i + 1}</i>{label}</span>)}</div>
 {step === 1 && <form onSubmit={e => {
            e.preventDefault();
            setError('');
            setStep(2);
          }}><div className="form-section-label">YOUR CONTACT DETAILS</div><div className="form-grid"><label>Full name<input required autoComplete="name" value={customer.name} onChange={e => field('name', e.target.value)} placeholder="Your full name" minLength={2} maxLength={100} /></label><label>Email address<input required type="email" autoComplete="email" value={customer.email} onChange={e => field('email', e.target.value)} placeholder="you@example.com" /></label><label>Phone / WhatsApp number<input required type="tel" autoComplete="tel" pattern="[+0-9 ]{10,20}" value={customer.phone} onChange={e => field('phone', e.target.value)} placeholder="+234 800 000 0000" /></label><label>Receive soft copies via<select value={customer.channel} onChange={e => field('channel', e.target.value)}><option value="both">Email & WhatsApp</option><option value="email">Email only</option><option value="whatsapp">WhatsApp only</option></select></label></div><div className="form-section-label">YOUR VEHICLE</div><div className="form-grid"><label>Vehicle make & model<input required minLength={2} maxLength={100} value={customer.make} onChange={e => field('make', e.target.value)} placeholder="e.g. Toyota Corolla 2020" /></label><label>Registration / plate number<input required minLength={3} maxLength={30} value={customer.plate} onChange={e => field('plate', e.target.value.toUpperCase())} placeholder="e.g. AAA 123 AB" /></label></div>{delivery === 'delivery' && <label className="full-label">Delivery address in Lagos<textarea required minLength={10} maxLength={500} autoComplete="street-address" value={customer.address} onChange={e => field('address', e.target.value)} placeholder="Street address, area and nearest landmark" /><small>Delivery is currently available within Lagos only.</small></label>}<button className="button full-width" type="submit">Continue to documents <ArrowRight size={17} /></button></form>}
 {step === 2 && <div><div className="upload-intro"><FileText size={23} /><div><h3>Your existing documents</h3><p>Upload clear copies of your current vehicle licence, ownership papers or relevant permits.</p></div></div><label className="upload-zone"><UploadCloud size={29} /><b>Choose files to upload</b><span>PDF, JPG or PNG · up to 10 MB each · 10 files maximum</span><input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={e => {
                const next = Array.from(e.target.files || []);
                if (next.some(f => f.size > 10 * 1024 * 1024)) {
                  setError('Each file must be 10 MB or smaller.');
                  return;
                }
                if (files.length + next.length > 10) {
                  setError('Upload a maximum of 10 files.');
                  return;
                }
                setError('');
                setFiles(prev => [...prev, ...next]);
              }} /></label><div className="file-list">{files.map((f, i) => <div key={i}><FileText size={17} /><span>{f.name}<small>{(f.size / 1024).toFixed(0)} KB</small></span><button onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}><X size={16} /></button></div>)}</div><div className="info-box"><ShieldCheck size={18} /><span>Your documents are kept private. If a document is missing, you can continue and our team will follow up.</span></div><div className="modal-actions"><button className="back-button" onClick={() => setStep(1)}><ChevronLeft size={16} /> Back</button><button className="button" onClick={() => {
                setError('');
                setStep(3);
              }}>Review your order <ArrowRight size={17} /></button></div></div>}
 {step === 3 && <div><div className="review-contact"><span><b>{customer.name}</b><small>{customer.email} · {customer.phone}</small></span><button className="text-link" onClick={() => setStep(1)}>Edit</button></div><div className="review-vehicle"><CarFront size={20} /><span>{customer.make} <b>{customer.plate}</b></span><small>{vehicle}</small></div><div className="review-items">{chosen.map(s => <div key={s.id}><span>{s.name}</span><b>{money(s.fee + s.charge)}</b></div>)}</div><dl className="review-totals"><div><dt>Document fees</dt><dd>{money(totals.documents)}</dd></div><div><dt>Service charges</dt><dd>{money(totals.charges)}</dd></div><div><dt>VAT on service charges (7.5%)</dt><dd>{money(totals.vat, true)}</dd></div><div><dt>{delivery === 'delivery' ? 'Lagos delivery' : 'Free collection'}</dt><dd>{money(totals.shipping)}</dd></div><div className="review-total"><dt>Total to pay</dt><dd>{money(totals.total, true)}</dd></div></dl><div className="info-box"><PackageCheck size={18} /><span>{delivery === 'delivery' ? customer.address : 'We’ll confirm the collection point when your documents are ready.'}<br />Soft copies via {customer.channel === 'both' ? 'email & WhatsApp' : customer.channel} · {files.length} file{files.length === 1 ? '' : 's'} attached</span></div><label className="checkbox-label"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>I confirm my details are correct and consent to SureWay using them to process this request and contact me about my documents.</span></label>{demo && <div className="demo-notice">This is a preview. Your details stay in this browser and no payment will be taken. Fees are illustrative until confirmed by SureWay.</div>}<div className="modal-actions"><button className="back-button" onClick={() => setStep(2)} disabled={busy}><ChevronLeft size={16} /> Back</button><button className="button" onClick={pay} disabled={!consent || busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <LockKeyhole size={15} />} {demo ? 'Create preview order' : `Pay ${money(totals.total, true)}`}<ArrowRight size={16} /></button></div>{!demo && <p className="modal-footnote">You’ll be redirected to Paystack to complete your payment securely.</p>}</div>}
 </> : panel === 'track' ? <><span className="modal-feature-icon"><PackageCheck size={26} /></span><h2 id="modal-title">A quick check on your order.</h2><p className="modal-description">Enter the reference and email you used when ordering.</p><form onSubmit={track} className="stacked-form"><label>Order reference<input name="reference" required placeholder="SW-…" autoComplete="off" /></label><label>Email address<input name="email" type="email" required placeholder="you@example.com" /></label><button className="button" disabled={busy}>{busy ? <LoaderCircle size={18} className="spin" /> : <Search size={17} />} Find my order</button></form>{trackResult && <div className="tracking-result"><span className="tracking-status"><span className="status-dot" />{statusLabels[String(trackResult.status)] || 'Received'}</span><h3>{String(trackResult.reference)}</h3><p>{String(trackResult.make)} · {String(trackResult.plate)}</p><b>{money(Number(trackResult.total), true)}</b><div className="tracking-timeline">{['paid', 'processing', 'soft_copies_ready', 'completed'].map((status, i) => <div key={status} className={['paid', 'processing', 'soft_copies_ready', 'ready_for_collection', 'out_for_delivery', 'completed'].indexOf(String(trackResult.status)) >= ['paid', 'processing', 'soft_copies_ready', 'ready_for_collection', 'out_for_delivery', 'completed'].indexOf(status) ? 'done' : ''}><span>{i + 1}</span>{statusLabels[status]}</div>)}</div>{Array.isArray(trackResult.documents) && trackResult.documents.map((doc: {
              name: string;
              url: string;
            }, i: number) => <a key={i} className="document-download" href={doc.url} target="_blank" rel="noreferrer"><Download size={16} />{doc.name}</a>)}</div>}{demo && <p className="modal-footnote">Preview orders are available only in the browser where they were created.</p>}</> : <><span className="modal-feature-icon">{panel === 'fleet' ? <Building2 size={26} /> : panel === 'registration' ? <CarFront size={26} /> : <MessageCircle size={26} />}</span><h2 id="modal-title">{panel === 'fleet' ? 'Let’s keep your fleet moving.' : panel === 'registration' ? 'New vehicle. Fresh start.' : 'A real person. Ready to help.'}</h2><p className="modal-description">{panel === 'fleet' ? 'Tell us a little about your organization. Our team will follow up to discuss your requirements and arrange the service.' : panel === 'registration' ? 'Share your details and tell us about your vehicle. We’ll get in touch with the requirements and a clear quote.' : 'Send us your question and our team will get back to you.'}</p><form onSubmit={enquiry} className="enquiry-form"><div className="form-grid"><label>Your name<input required name="name" autoComplete="name" minLength={2} maxLength={100} placeholder="Full name" /></label><label>{panel === 'fleet' ? 'Work email' : 'Email address'}<input required name="email" type="email" autoComplete="email" placeholder="you@example.com" /></label><label>Phone / WhatsApp<input required name="phone" type="tel" pattern="[+0-9 ]{10,20}" placeholder="+234 800 000 0000" /></label>{panel === 'fleet' && <><label>Organization<input required name="company" maxLength={150} placeholder="e.g. Unilever" /></label><label className="full-label">Number of vehicles<input required name="fleetSize" type="number" min="1" max="100000" placeholder="e.g. 25" /></label></>}</div>{panel === 'fleet' && <fieldset className="document-checkboxes"><legend>Which documents do you typically need?</legend>{services.map(s => <label key={s.id}><input name="documents" type="checkbox" value={s.name} />{s.name}</label>)}</fieldset>}<label className="full-label">{panel === 'registration' ? 'Tell us about your vehicle' : panel === 'support' ? 'How can we help?' : 'Anything else we should know?'}<textarea name="message" required={panel !== 'fleet'} minLength={panel !== 'fleet' ? 5 : 0} maxLength={3000} placeholder={panel === 'registration' ? 'Make, model, year, imported or locally purchased, and any documents you already have…' : panel === 'support' ? 'Your question or order reference…' : 'Your requirements, locations, or preferred time to call…'} /></label><label className="checkbox-label"><input name="consent" type="checkbox" required /><span>I agree to SureWay using these details to contact me about this request.</span></label>{demo && <div className="demo-notice">Preview mode: this enquiry is saved in your browser and is not sent to the team.</div>}<button className="button full-width" disabled={busy}>{busy ? <LoaderCircle size={18} className="spin" /> : null}{demo ? 'Preview enquiry' : panel === 'registration' ? 'Request my registration quote' : 'Send to the SureWay team'}<ArrowRight size={17} /></button></form></>}
 {error && <div className="form-error" role="alert"><CircleHelp size={17} />{error}</div>}
 </section></div>}
 </>;
}
