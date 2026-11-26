'use client';

import Image from 'next/image';
import brandMark from '@/app/icon.png';
import chooseDocuments from '@/assets/how-choose-documents.webp';
import processDocuments from '@/assets/how-process-documents.webp';
import receiveDocuments from '@/assets/how-receive-documents.webp';
import heroPhoto from '@/assets/hero-photo.webp';
import heroDocuments from '@/assets/hero-documents.webp';
import heroNumberPlate from '@/assets/hero-number-plate.webp';
import registrationDocuments from '@/assets/registration-documents.webp';
import BrandLogo, { ModalLogo } from '@/components/brand-logo';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, FileText, ShieldCheck, CarFront, Truck, UserRound, UsersRound, ShoppingCart, Menu, X, Plus, Minus, MapPin, Mail, MessageCircle, Headset, PhoneCall, Gauge, LockKeyhole, UploadCloud, Search, CircleHelp, Building2, Sparkles, Package, PackageCheck, LoaderCircle, CheckCircle2, Download } from 'lucide-react';
import {
  services, vehicleTypes, servicesForVehicle, calculatePricing, money, statusLabels,
  LAGOS_DELIVERY_FEE, THIRD_PARTY_PREMIUM, COMPREHENSIVE_PERCENT, insuranceLabels,
  requiredPermitUploads, uploadKinds, uploadKindLabels, validVehicleValue,
  type Delivery, type VehicleType, type Insurance, type RequestKinds, type UploadKind
} from '@/lib/catalog';
type Panel = 'checkout' | 'fleet' | 'registration' | 'support' | 'track' | null;
type CheckoutFile = { file: File; documentType: UploadKind };
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
const faq = [['Do I need an account to order?', 'No account needed. Select your documents, share your vehicle and contact details, and pay securely. Keep your order reference to track progress.'], ["What is included in the price?", 'Your document fees, our processing charge, 7.5% VAT on the service charge, and any delivery fee are shown separately before payment. Collection is free.'], ['How do I receive my documents?', `We share soft copies by email and/or WhatsApp. Choose delivery within Lagos for ${money(LAGOS_DELIVERY_FEE)}, or collect the originals for free. Our team will confirm the collection location when they are ready.`], ['Can you help with a company fleet?', 'Yes. We support organizations. Send us your fleet size and usual document requirements, and our team will get in touch to arrange the service.']];
const serviceIcons = {
  document: FileText,
  car: CarFront,
  person: UserRound,
  shield: ShieldCheck,
  truck: Truck,
  gauge: Gauge
};
const steps = [
  {
    image: chooseDocuments,
    title: 'Choose your documents',
    body: 'Select the documents you need, share your vehicle details, and upload existing documents if required. Review all charges before paying.'
  },
  {
    image: processDocuments,
    title: 'Leave the processing with us',
    body: 'Our team handles your request and checks the completed documents. You can track your order along the way.'
  },
  {
    image: receiveDocuments,
    title: 'Soft copies. Then the originals.',
    body: 'You’ll receive soft copies by email or WhatsApp once your documents are ready. Processing times vary by document. We’ll then arrange Lagos delivery, or you can pick up the originals.'
  }
];
const supportPhone = '+2348078672176';
export default function Platform() {
  const [selected, setSelected] = useState<string[]>([]),
    [vehicle, setVehicle] = useState<VehicleType>('Car'),
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
    [files, setFiles] = useState<CheckoutFile[]>([]),
    [consent, setConsent] = useState(false),
    [query, setQuery] = useState(''),
    [faqOpen, setFaqOpen] = useState<number | null>(null),
    [toast, setToast] = useState('');
  const [trackResult, setTrackResult] = useState<Record<string, unknown> | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [insuranceKind, setInsuranceKind] = useState<Insurance['kind'] | ''>('');
  const [vehicleValue, setVehicleValue] = useState('');
  const [requests, setRequests] = useState<RequestKinds>({});
  const [documentsBelongToVehicle, setDocumentsBelongToVehicle] = useState(false);
  const uploadCache = useRef(new WeakMap<File, { token: string; expiresAt: number }>());
  const pendingOrder = useRef<{ payload: string; reference: string; accessToken: string } | null>(null);
  const insurance: Insurance | undefined = insuranceKind === 'third-party' ? { kind: insuranceKind } :
    insuranceKind === 'comprehensive' && validVehicleValue(Number(vehicleValue))
      ? { kind: insuranceKind, vehicleValue: Number(vehicleValue) } : undefined;
  const hasDocuments = selected.length > 0;
  const needsDelivery = hasDocuments && delivery === 'delivery';
  const totals = calculatePricing(selected, delivery, vehicle, insurance);
  const { permits, kinds: requiredUploadKinds } = requiredPermitUploads(selected, requests);
  const uploadRequirement = requiredUploadKinds.length === 1
    ? 'Upload the Vehicle Licence for this vehicle.'
    : 'Upload Proof of Ownership or the Vehicle Licence for this vehicle.';
  const hasRequiredUpload = files.some(file => requiredUploadKinds.some(kind => kind === file.documentType));
  useEffect(() => {
    fetch('/api/config').then(r => r.ok ? r.json() : null).then(c => {
      if (c) setDemo(c.demo);
    }).catch(() => {});
    try {
      const saved = JSON.parse(localStorage.getItem('sureway-cart') || 'null');
      if (saved) {
        const savedVehicle: VehicleType = vehicleTypes.includes(saved.vehicle) ? saved.vehicle : 'Car';
        const available = servicesForVehicle(savedVehicle);
        setSelected(saved.selected.filter((id: string) => available.some(s => s.id === id)));
        setVehicle(savedVehicle);
        if (savedVehicle !== 'Other / not sure') {
          if (saved.insuranceKind === 'third-party' || saved.insuranceKind === 'comprehensive') setInsuranceKind(saved.insuranceKind);
          if (typeof saved.vehicleValue === 'string') setVehicleValue(saved.vehicleValue);
        }
        setDelivery(saved.delivery === 'collection' ? 'collection' : 'delivery');
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('sureway-cart', JSON.stringify({
        selected,
        vehicle,
        delivery,
        insuranceKind,
        vehicleValue
      }));
    } catch {}
  }, [selected, vehicle, delivery, insuranceKind, vehicleValue]);
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
  useEffect(() => {
    if (panel === 'checkout') closeRef.current?.closest('.modal')?.scrollTo(0, 0);
  }, [step, panel]);
  function toggle(id: string) {
    setSelected(s => s.includes(id) ? s.filter(v => v !== id) : [...s, id]);
    if (id === 'cmr' || id === 'tint') {
      setRequests(previous => ({ ...previous, [id]: undefined }));
    }
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
  function selectVehicle(nextVehicle: VehicleType) {
    if (vehicle === nextVehicle) return;
    setVehicle(nextVehicle);
    setFiles([]);
    setDocumentsBelongToVehicle(false);
    if (nextVehicle === 'Other / not sure') {
      if (selected.length || insuranceKind) setToast('Cart cleared. Contact us for a quote for this vehicle.');
      setSelected([]);
      setInsuranceKind('');
      setRequests({});
    } else {
      const available = servicesForVehicle(nextVehicle);
      const nextSelected = selected.filter(id => available.some(service => service.id === id));
      if (nextSelected.length !== selected.length) {
        setSelected(nextSelected);
        setToast('Heavy Duty Permit removed. It is available for buses, trucks and vans.');
      }
    }
  }
  function checkout() {
    if (insuranceKind === 'comprehensive' && !insurance) {
      const input = document.getElementById('insurance-value');
      if (input) input.focus();
      else {
        setCategory('All services');
        scrollServices();
      }
      setToast('Enter your vehicle value to calculate the comprehensive premium.');
      return;
    }
    if (!hasDocuments && !insurance) {
      scrollServices();
      setToast('Choose a document or an insurance option to get started.');
      return;
    }
    open('checkout');
  }
  function field(key: keyof Customer, value: string) {
    if ((key === 'plate' || key === 'make') && value !== customer[key]) {
      setFiles([]);
      setDocumentsBelongToVehicle(false);
    }
    setCustomer(c => ({
      ...c,
      [key]: value
    }));
  }
  function documentStepError() {
    if (!permits.length) return '';
    if (permits.some(id => !requests[id])) return 'Choose new or renewal for every CMR or Tint Permit request.';
    if (!hasRequiredUpload) return uploadRequirement;
    if (!documentsBelongToVehicle) return 'Confirm the uploaded documents belong to this vehicle.';
    return '';
  }
  async function pay() {
    const uploadError = documentStepError();
    if (uploadError) {
      setStep(2);
      setError(uploadError);
      return;
    }
    const permitRequests = Object.fromEntries(permits.map(id => [id, requests[id]]));
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
          delivery: hasDocuments ? delivery : 'collection',
          insurance,
          requests: permitRequests,
          pricing: totals,
          total: totals.total,
          status: 'payment_pending',
          createdAt: new Date().toISOString()
        };
        const orders = JSON.parse(localStorage.getItem('sureway-demo-orders') || '[]');
        localStorage.setItem('sureway-demo-orders', JSON.stringify([...orders, order]));
        setSuccess(reference);
        return;
      }
      const uploads = [];
      for (const { file, documentType } of files) {
        let cached = uploadCache.current.get(file);
        if (!cached || cached.expiresAt < Date.now()) {
          const form = new FormData();
          form.append('file', file);
          const res = await fetch('/api/uploads', { method: 'POST', body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Upload failed');
          cached = { token: String(data.token), expiresAt: Date.now() + 55 * 60 * 1000 };
          uploadCache.current.set(file, cached);
        }
        uploads.push({ token: cached.token, documentType });
      }
      const payload = JSON.stringify({
        ...customer,
        services: selected,
        vehicleType: vehicle,
        delivery: hasDocuments ? delivery : 'collection',
        requests: permitRequests,
        insurance,
        uploads,
        documentsBelongToVehicle,
        quotedTotalKobo: Math.round(totals.total * 100),
        consent
      });
      let order = pendingOrder.current;
      if (!order || order.payload !== payload) {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not create your order');
        order = { payload, reference: data.reference, accessToken: data.accessToken };
        pendingOrder.current = order;
      }
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
  const visible = servicesForVehicle(vehicle).filter(s => (category === 'All services' || s.category === category) && (s.name + ' ' + s.description).toLowerCase().includes(query.toLowerCase()));
  return <>
 <div className="announcement"><span>Soft copies first. Hard copies delivered across Lagos.</span><a href="#how-it-works">See how it works <ArrowRight size={12} /></a></div>
 <header className="header"><div className="container header-inner"><BrandLogo /><nav aria-label="Main navigation"><a href="#services">Our services</a><a href="#how-it-works">How it works</a><button onClick={() => open('fleet')}>For organizations</button></nav><div className="header-actions"><button className="cart-button" onClick={checkout} aria-label={`Open order, ${selected.length} documents`}><ShoppingCart size={21} strokeWidth={1.5} /><span>{selected.length}</span></button><button className="button button-small desktop-start" onClick={scrollServices}>Get started <ArrowUpRight size={15} /></button><button className="menu-button" onClick={() => setMenu(true)} aria-label="Open menu"><Menu /></button></div></div></header>
 <main>
 <section className="container hero" aria-label="Vehicle documents made simple">
  <div className="hero-main">
   <Image className="hero-photo" src={heroPhoto} alt="" fill sizes="(max-width: 850px) 100vw, 55vw" preload />
   <div className="eyebrow light"><span className="status-dot" /> Lagos · Vehicle document services</div>
   <h1>Your<br /><span>Vehicle<br />Documents</span>.<br />Handled.</h1>
   <p><strong>Less stress. More peace of mind.</strong> From renewals to new registrations, we take care of the details.</p>
   <button className="button hero-cta" onClick={scrollServices}>Sort my documents <ArrowUpRight size={19} /></button>
   <div className="hero-links">
    <button onClick={() => open('fleet')}>I manage a fleet <ArrowUpRight size={15} /></button>
    <button onClick={() => open('support')}>Get support <ArrowUpRight size={15} /></button>
   </div>
  </div>
  <div className="hero-tiles">
   <button className="feature-tile" onClick={scrollServices}>
    <span className="tile-icon"><FileText /></span>
    <span className="tile-value">{services.length} Essential<br />Documents</span>
    <span className="tile-label">Vehicle document services</span>
    <Image className="tile-art" src={heroDocuments} alt="" sizes="(max-width: 850px) 44vw, 24vw" />
    <span className="tile-link">Explore services <ArrowUpRight size={15} /></span>
   </button>
   <button className="feature-tile" onClick={() => open('registration')}>
    <span className="tile-icon"><CarFront /></span>
    <span className="tile-value">New<br />wheels?</span>
    <span className="tile-label">New vehicle registration</span>
    <Image className="tile-art" src={heroNumberPlate} alt="" sizes="(max-width: 850px) 44vw, 24vw" />
    <span className="tile-link">Let’s get you registered <ArrowUpRight size={15} /></span>
   </button>
   <div className="feature-tile support-tile">
    <span className="tile-icon"><Headset /></span>
    <span className="tile-value">Need help?</span>
    <span className="tile-label">Contact us now</span>
    <div className="tile-contact">
     <a className="tile-whatsapp" href={`https://wa.me/${supportPhone.slice(1)}`}><MessageCircle size={23} />WhatsApp</a>
     <a href={`tel:${supportPhone}`}><PhoneCall size={23} />Call us</a>
    </div>
   </div>
   <button className="feature-tile fleet-tile" onClick={() => open('fleet')}>
    <span className="tile-icon"><UsersRound /></span>
    <span className="tile-value">The whole<br />fleet.</span>
    <span className="tile-label">Vehicle document <br className="mobile-break" /> for Fleets</span>
    <span className="tile-link">Talk to our team <ArrowUpRight size={15} /></span>
   </button>
  </div>
 </section>
 <div className="container">
  <ul className="promise-strip" role="list" aria-label="Service benefits">
   <li><Check aria-hidden="true" /><span>Renewals &amp; new registrations</span></li>
   <li><Mail aria-hidden="true" /><span>Soft copies by email &amp; WhatsApp</span></li>
   <li><Package aria-hidden="true" /><strong>Delivery for {money(LAGOS_DELIVERY_FEE)} in Lagos or free collection</strong></li>
  </ul>
 </div>
 <section className="container services-section" id="services"><div className="section-heading"><div><div className="eyebrow">01 / FOR INDIVIDUALS</div><h2>Vehicle documents<br className="mobile-break" /> we provide.</h2><p>Choose your vehicle, select your documents, and see exactly what you’ll pay.</p></div><span className="section-note"><span className="status-dot" /> Clear fees. No guesswork.</span></div>
 <div className="vehicle-select">
  <span>Your vehicle type</span>
  <div role="group" aria-label="Vehicle type">
   {vehicleTypes.map(type => (
    <button key={type} onClick={() => selectVehicle(type)} className={vehicle === type ? 'active' : ''} aria-pressed={vehicle === type}>
     {type === 'Car' && <CarFront size={16} aria-hidden="true" />}{type}
    </button>
   ))}
  </div>
 </div>
 <div className="services-layout">
  <div className="catalog">
   <div className="category-tabs" role="group" aria-label="Service category">
    {['All services', 'Essentials', 'Permits', 'Commercial', 'Registration'].map(c => (
      <button key={c} className={category === c ? 'active' : ''} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
    ))}
   </div>
   <div className="search-field">
    <Search size={17} aria-hidden="true" />
    <input type="search" aria-label="Search services" placeholder="Find a document…" value={query} onChange={e => setQuery(e.target.value)} />
    {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={15} /></button>}
   </div>
   {category !== 'Registration' && (vehicle === 'Other / not sure' ? (
    <div className="empty-search">
     <h3>Need help choosing a vehicle category?</h3>
     <p>Tell us about your vehicle and the documents you need for a quote.</p>
     <button className="text-link" onClick={() => open('support')}>Request a quote <ArrowRight size={15} /></button>
    </div>
   ) : (
    <div className="service-grid">
     {visible.map(service => {
       const Icon = serviceIcons[service.icon];
       const isSelected = selected.includes(service.id);
       return (
        <button key={service.id} className={isSelected ? 'service-card selected' : 'service-card'} onClick={() => toggle(service.id)} aria-pressed={isSelected}>
         <div className="service-card-top">
          <span className="service-icon"><Icon size={24} strokeWidth={1.6} aria-hidden="true" /></span>
          <span className="select-indicator" aria-hidden="true">{isSelected ? <Check size={15} /> : <Plus size={15} />}</span>
         </div>
         <h3>{service.name}</h3>
         <p>{service.description}
          {(service.id === 'cmr' || service.id === 'tint') && <small className="service-requirement">New: Vehicle Licence. Renewal: Vehicle Licence or Proof of Ownership.</small>}
         </p>
         <div className="service-pricing">
          <span><strong>{money(service.fee)}</strong><small>Document fee</small></span>
          <span><b>{service.charge ? `+ ${money(service.charge)}` : money(0)}</b><small>Service charge</small></span>
         </div>
        </button>
       );
     })}
     {!visible.length && (
      <div className="empty-search">
       <Search size={28} />
       <h3>No documents found</h3>
       <p>Try another name or view all our services.</p>
       <button className="text-link" onClick={() => {
         setCategory('All services');
         setQuery('');
       }}>View all services <ArrowRight size={15} /></button>
      </div>
     )}
    </div>
   ))}
   {category !== 'Registration' && vehicle !== 'Other / not sure' && <section className="insurance-card" aria-labelledby="insurance-title">
    <div className="insurance-intro">
     <span className="tile-icon"><ShieldCheck aria-hidden="true" /></span>
     <div><h3 id="insurance-title">Motor Vehicle Insurance</h3><p>Choose cover for your vehicle.</p></div>
    </div>
    <div className="insurance-options" role="group" aria-label="Insurance options">
     <button type="button" aria-pressed={insuranceKind === 'third-party'} onClick={() => setInsuranceKind(insuranceKind === 'third-party' ? '' : 'third-party')}>
      <span>Third-party insurance</span><strong>{money(THIRD_PARTY_PREMIUM)}</strong><small>Per vehicle</small>
     </button>
     <button type="button" aria-pressed={insuranceKind === 'comprehensive'} onClick={() => setInsuranceKind(insuranceKind === 'comprehensive' ? '' : 'comprehensive')}>
      <span>Comprehensive insurance</span><strong>{COMPREHENSIVE_PERCENT}%</strong><small>of vehicle value</small>
     </button>
    </div>
    {insuranceKind === 'comprehensive' && <div className="insurance-value">
     <label>Vehicle value (₦)<input id="insurance-value" type="number" min="0.10" step="0.01" inputMode="decimal" placeholder="e.g. 10000000" value={vehicleValue} onChange={event => setVehicleValue(event.target.value)} /></label>
     <p aria-live="polite">{insurance ? <>Estimated premium <strong>{money(totals.premium, totals.premium % 1 !== 0)}</strong></> : 'Enter the current value to calculate your premium.'}</p>
    </div>}
   </section>}
   <div className="registration-card">
    <div className="registration-art" aria-hidden="true">
     <Image src={registrationDocuments} alt="" fill sizes="(max-width: 640px) min(72vw, 380px), 520px" />
    </div>
    <span className="tile-icon"><CarFront aria-hidden="true" /></span>
    <h3>New plates for your new vehicle.</h3>
    <p>Get your number plates, vehicle licence, proof of ownership and other required vehicle documents through SureWay Compliance.</p>
    <button className="button" onClick={() => open('registration')}>Request registration <ArrowUpRight size={17} /></button>
   </div>
   <p className="price-note"><CircleHelp size={14} /> Document fees, service charges, VAT and delivery are shown separately.</p>
 </div>
 <aside className="order-summary" aria-label="Your order">
  <div className="order-title"><h3>Your order</h3><span>{totals.items.length + (insuranceKind ? 1 : 0)} selected</span></div>
  {vehicle !== 'Other / not sure' && <p className="order-vehicle">Vehicle category <strong>{vehicle}</strong></p>}
  {hasDocuments || insuranceKind ? (
   <div className="order-items">
    {totals.items.map(item => <div className="order-item" key={item.id}>
     <span>{item.name}<small>{money(item.fee)} document fee · {money(item.charge)} service charge</small></span>
     <button onClick={() => toggle(item.id)} aria-label={`Remove ${item.name}`}><X size={16} /></button>
    </div>)}
    {insuranceKind && <div className="order-item">
     <span>{insuranceLabels[insuranceKind]}<small>{insurance ? money(totals.premium, true) : 'Enter your vehicle value'}</small></span>
     <button onClick={() => setInsuranceKind('')} aria-label="Remove insurance"><X size={16} /></button>
    </div>}
   </div>
  ) : <div className="empty-order"><span><FileText size={28} strokeWidth={1.2} /></span><p>Start your order</p><small>Select documents or insurance for your vehicle.</small></div>}
  {hasDocuments && <div className="delivery-toggle" role="group" aria-label="Receive hard copies">
   <button className={delivery === 'delivery' ? 'active' : ''} aria-pressed={delivery === 'delivery'} onClick={() => setDelivery('delivery')}><Truck size={13} /> Delivery · {money(LAGOS_DELIVERY_FEE)}</button>
   <button className={delivery === 'collection' ? 'active' : ''} aria-pressed={delivery === 'collection'} onClick={() => setDelivery('collection')}>Collection · Free</button>
  </div>}
  <dl className="order-costs">
   <div><dt>Document fees</dt><dd>{money(totals.documents)}</dd></div>
   <div><dt>Service charges</dt><dd>{money(totals.charges)}</dd></div>
   {insurance && <div><dt>Insurance premium</dt><dd>{money(totals.premium, true)}</dd></div>}
   <div><dt>VAT on service charges (7.5%)</dt><dd>{money(totals.vat, true)}</dd></div>
   {hasDocuments && <div><dt>{needsDelivery ? 'Lagos delivery' : 'Collection'}</dt><dd>{needsDelivery ? money(totals.shipping) : 'Free'}</dd></div>}
  </dl>
  <div className="order-total"><span>{insuranceKind && !insurance ? 'Subtotal before insurance' : 'Total to pay'}</span><strong>{money(totals.total, totals.total % 1 !== 0)}</strong></div>
  <button className="button" onClick={checkout}>Continue to vehicle details <ArrowRight size={16} /></button>
  <p className="secure-note"><LockKeyhole size={11} /> Review everything before you pay</p>
  <div className="paystack-note"><span className="paystack-bars"><i /><i /><i /><i /></span><span>Secured by <b>paystack</b></span></div>
 </aside>
 </div>
 </section>
 <section className="how-section" id="how-it-works" aria-labelledby="how-heading">
  <div className="container">
   <h2 id="how-heading">Paperwork, without<br />the runaround.</h2>
   <ol className="steps-grid" role="list">
    {steps.map((step, index) => (
     <li className="step-card" key={step.title}>
      <div className="step-copy">
       <span className="step-number" aria-hidden="true">0{index + 1}</span>
       <h3>{step.title}</h3>
       <p>{step.body}</p>
      </div>
      <Image className="step-image" src={step.image} alt="" sizes="(max-width: 640px) 32vw, 180px" />
     </li>
    ))}
   </ol>
  </div>
 </section>
 <section className="container fleet-section" id="organizations"><div className="fleet-copy"><div className="eyebrow light">03 / FOR ORGANIZATIONS</div><h2>One vehicle or <br className="mobile-break" /> a whole fleet.<br /><span>You’re in good hands.</span></h2><p>Keep your team moving while we handle the paperwork. Get coordinated document processing and a real person to help with your requirements.</p><button className="button" onClick={() => open('fleet')}>Let’s talk about your fleet <ArrowUpRight size={17} /></button><div className="fleet-trust">Supporting organizations including <b>Unilever</b></div></div><div className="fleet-visual" aria-hidden="true"><div className="fleet-visual-header"><Image className="mini-logo" src={brandMark} alt="" width={24} height={24} /><b>A clearer road ahead.</b><span className="fleet-dots">•••</span></div><div className="fleet-visual-title"><span>YOUR FLEET, TAKEN CARE OF</span><ShieldCheck size={20} /></div>{[{
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
 <section className="container faq-section"><div className="faq-intro"><div className="eyebrow">GOOD QUESTIONS. STRAIGHT ANSWERS.</div><h2>A few things<br />you might be wondering.</h2><p>Need a hand with something else? We’re happy to help.</p><button className="text-link" onClick={() => open('support')}>Talk to our team <ArrowUpRight size={16} /></button></div><div className="faq-list">{faq.map(([question, answer], i) => <div className={'faq-item ' + (faqOpen === i ? 'open' : '')} key={question}><button aria-expanded={faqOpen === i} aria-controls={`faq-${i}`} onClick={() => setFaqOpen(faqOpen === i ? null : i)}>{question}{faqOpen === i ? <Minus size={18} /> : <Plus size={18} />}</button><div id={`faq-${i}`} hidden={faqOpen !== i}><p>{answer}</p></div></div>)}</div></section>
 <div className="container final-cta"><div><span className="eyebrow">LET’S GET YOU ROAD-READY</span><h2>Your next journey starts here.</h2></div><button className="button" onClick={scrollServices}>Sort my documents <ArrowUpRight size={17} /></button></div>
 </main>
 <footer><div className="container footer-main"><div><BrandLogo footer /><p>A little less paperwork.<br />A little more peace of mind.</p></div><div className="footer-links"><a href="#services">Our services</a><a href="#how-it-works">How it works</a><button onClick={() => open('fleet')}>For organizations</button></div><div className="footer-links"><button onClick={() => open('track')}>Track your order</button><button onClick={() => open('support')}>Get support</button><span><MapPin size={13} /> Lagos, Nigeria</span></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} SureWay Compliance. All rights reserved.</span><span>Made for the road ahead. <ArrowUpRight size={12} /></span></div></footer>
 <button className="chat-button" onClick={() => open('support')} aria-label="Get help"><MessageCircle size={24} /><span className="chat-notification" /></button>
 {toast && <div className="toast" role="status"><CircleHelp size={18} />{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={16} /></button></div>}
 {demo && <div className="preview-badge"><span className="status-dot" /> Preview mode <span>·</span> No live payments</div>}
 {menu && <div className="modal-backdrop mobile-menu-backdrop" onClick={() => setMenu(false)}><div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation" onClick={e => e.stopPropagation()}><div className="modal-top"><BrandLogo /><button ref={closeRef} onClick={() => setMenu(false)} aria-label="Close menu"><X /></button></div><h3>Vehicle documents</h3><div className="mobile-menu-feature"><button onClick={() => {
            setCategory('Essentials');
            scrollServices();
          }}><FileText size={18} /> Vehicle renewals <small>Essentials</small></button><button onClick={() => {
            setCategory('Permits');
            scrollServices();
          }}><Check size={18} /> Permits & certificates</button><button onClick={() => open('registration')}><Plus size={18} /> New vehicle registration</button></div><button onClick={scrollServices}>All services <ArrowUpRight size={16} /></button><a href="#how-it-works" onClick={() => setMenu(false)}>How it works <ArrowUpRight size={16} /></a><button onClick={() => open('fleet')}>For organizations <ArrowUpRight size={16} /></button><button onClick={() => open('track')}>Track your order <ArrowUpRight size={16} /></button><button onClick={() => open('support')}>Get support <ArrowUpRight size={16} /></button><button className="button" onClick={() => open('support')}>Talk to our team <ArrowRight size={17} /></button></div></div>}
 {panel && <div className="modal-backdrop" onClick={() => !busy && setPanel(null)}><section className={'modal ' + (panel === 'checkout' ? 'checkout-modal' : '')} role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={e => e.stopPropagation()}><div className="modal-top"><ModalLogo /><button ref={closeRef} onClick={() => setPanel(null)} disabled={busy} aria-label="Close dialog"><X size={22} /></button></div>
 {success ? <div className="success-panel"><h2 id="modal-title" className="modal-heading">
  <span className="success-icon" aria-hidden="true"><CheckCheck size={34} /></span>
  {success === 'enquiry' ? demo ? 'Your enquiry is ready.' : 'We’ll take it from here.' : 'Your preview order is ready.'}
 </h2><p>{demo ? success === 'enquiry' ? 'Saved in this browser for this preview. This enquiry has not been sent to the SureWay team.' : 'No payment has been taken and no request has been sent. Your preview order is saved in this browser.' : 'Our team has received your enquiry and will contact you to discuss the next steps.'}</p>{success !== 'enquiry' && <div className="reference-box"><small>YOUR ORDER REFERENCE</small><strong>{success}</strong><button className="text-link" onClick={() => {
              navigator.clipboard?.writeText(success);
              setToast('Order reference copied');
            }}>Copy reference</button></div>}<button className="button" onClick={() => setPanel(null)}>Back to SureWay <ArrowRight size={17} /></button></div> : panel === 'checkout' ? <><h2 id="modal-title">Let’s get your documents sorted.</h2><p className="modal-description">Just a few details, and we’ll take it from here.</p><div className="checkout-steps">{['Your details', 'Documents', 'Review & pay'].map((label, i) => <span key={label} aria-current={step === i + 1 ? 'step' : undefined} className={step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}><i>{step > i + 1 ? <Check size={12} /> : i + 1}</i>{label}</span>)}</div>
 {step === 1 && <form className="checkout-details" onSubmit={event => {
   event.preventDefault();
   setError('');
   setStep(2);
 }}>
  <div className="form-section-label">Your contact details</div>
  <div className="form-grid">
   <label>Full name<input required autoComplete="name" value={customer.name} onChange={event => field('name', event.target.value)} placeholder="Your full name" minLength={2} maxLength={100} /></label>
   <label>Email address<input required type="email" autoComplete="email" value={customer.email} onChange={event => field('email', event.target.value)} placeholder="you@example.com" /></label>
   <label>Phone / WhatsApp number<input required type="tel" autoComplete="tel" pattern="[+0-9 ]{10,20}" value={customer.phone} onChange={event => field('phone', event.target.value)} placeholder="+234 800 000 0000" /></label>
   <label>Receive soft copies via<select value={customer.channel} onChange={event => field('channel', event.target.value)}><option value="both">Email &amp; WhatsApp</option><option value="email">Email only</option><option value="whatsapp">WhatsApp only</option></select></label>
  </div>
  <div className="form-section-label">Your vehicle · {vehicle}</div>
  <div className="form-grid">
   <label>Vehicle make &amp; model<input required minLength={2} maxLength={100} value={customer.make} onChange={event => field('make', event.target.value)} placeholder="e.g. Toyota Corolla 2020" /></label>
   <label>Registration / plate number<input required minLength={3} maxLength={30} value={customer.plate} onChange={event => field('plate', event.target.value.toUpperCase())} placeholder="e.g. AAA 123 AB" /></label>
   {needsDelivery && <label className="full-label">Delivery address in Lagos<textarea required minLength={10} maxLength={500} autoComplete="street-address" value={customer.address} onChange={event => field('address', event.target.value)} placeholder="Street address, area and nearest landmark" /><small>Delivery is currently available within Lagos only.</small></label>}
  </div>
  {permits.length > 0 && <>
   <div className="form-section-label">Permit requests</div>
   <div className="form-grid">
    {permits.map(id => <label key={id}>{id === 'cmr' ? 'Central Motor Registry (CMR)' : 'Tint Permit'}
     <select required value={requests[id] ?? ''} onChange={event => {
       setRequests(previous => ({ ...previous, [id]: event.target.value === 'new' ? 'new' : event.target.value === 'renewal' ? 'renewal' : undefined }));
       setDocumentsBelongToVehicle(false);
     }}><option value="">Choose request type</option><option value="new">New</option><option value="renewal">Renewal</option></select>
    </label>)}
   </div>
   <p className="modal-footnote">{permits.every(id => requests[id]) ? uploadRequirement : 'New requests require the Vehicle Licence. Renewals require the Vehicle Licence or Proof of Ownership.'}</p>
  </>}
  <button className="button full-width" type="submit">Continue to documents <ArrowRight size={17} /></button>
 </form>}
 {step === 2 && <div>
  <div className="upload-intro"><FileText size={23} /><div><h3>Your existing documents</h3><p>{permits.length ? uploadRequirement : 'Upload any relevant documents you’d like our team to review.'}</p></div></div>
  <label className="upload-zone"><UploadCloud size={29} /><b>Choose files to upload</b><span>PDF, JPG or PNG · up to 10 MB each · 10 files maximum</span>
   <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={event => {
     const next = Array.from(event.currentTarget.files || []);
     event.currentTarget.value = '';
     if (next.some(file => !/\.(pdf|jpe?g|png)$/i.test(file.name) || !file.size || file.size > 10 * 1024 * 1024)) {
       setError('Choose non-empty PDF, JPG or PNG files up to 10 MB each.');
       return;
     }
     if (files.length + next.length > 10) {
       setError('Upload a maximum of 10 files.');
       return;
     }
     setError('');
     setDocumentsBelongToVehicle(false);
     setFiles(previous => [...previous, ...next.map(file => ({ file, documentType: 'other' as const }))]);
   }} />
  </label>
  <div className="file-list">{files.map(({file, documentType}, index) => <div className="checkout-file" key={index}>
   <FileText size={17} /><span>{file.name}<small>{(file.size / 1024).toFixed(0)} KB</small></span>
   {permits.length > 0 && <select aria-label={`Document type for ${file.name}`} value={documentType} onChange={event => {
     const kind = event.target.value as UploadKind;
     setFiles(previous => previous.map((entry, i) => i === index ? { ...entry, documentType: kind } : entry));
     setDocumentsBelongToVehicle(false);
     setError('');
   }}>{uploadKinds.map(kind => <option key={kind} value={kind}>{uploadKindLabels[kind]}</option>)}</select>}
   <button onClick={() => {
     setFiles(previous => previous.filter((_, i) => i !== index));
     setDocumentsBelongToVehicle(false);
     setError('');
   }} aria-label={`Remove ${file.name}`}><X size={16} /></button>
  </div>)}</div>
  {permits.length > 0 && <label className="checkbox-label"><input type="checkbox" checked={documentsBelongToVehicle} onChange={event => {
    setDocumentsBelongToVehicle(event.target.checked);
    setError('');
  }} /><span>I confirm the supporting documents belong to {customer.plate}.</span></label>}
  <div className="info-box"><ShieldCheck size={18} /><span>{permits.length ? 'Your documents are kept private. Add and identify the required document before continuing.' : 'Your documents are kept private. You may continue without optional uploads.'}</span></div>
  <div className="modal-actions">
   <button className="back-button" onClick={() => { setError(''); setStep(1); }}><ChevronLeft size={16} /> Back</button>
   <button className="button" onClick={() => {
     const message = documentStepError();
     setError(message);
     if (!message) setStep(3);
   }}>Review your order <ArrowRight size={17} /></button>
  </div>
 </div>}
 {step === 3 && <div>
  <div className="review-contact"><span><b>{customer.name}</b><small>{customer.email} · {customer.phone}</small></span><button className="text-link" onClick={() => setStep(1)}>Edit</button></div>
  <div className="review-vehicle"><CarFront size={20} /><span>{customer.make} <b>{customer.plate}</b></span><small>{vehicle}</small></div>
  <div className="review-items">{totals.items.map(item => <div key={item.id}>
   <span>{item.name}{(item.id === 'cmr' || item.id === 'tint') && ` · ${requests[item.id] === 'new' ? 'New' : 'Renewal'}`}<small>{money(item.fee)} document fee · {money(item.charge)} service charge</small></span>
   <b>{money(item.fee + item.charge)}</b>
  </div>)}</div>
  <dl className="review-totals">
   <div><dt>Document fees</dt><dd>{money(totals.documents)}</dd></div>
   <div><dt>Service charges</dt><dd>{money(totals.charges)}</dd></div>
   {insurance && <div><dt>{insuranceLabels[insurance.kind]} premium</dt><dd>{money(totals.premium, true)}</dd></div>}
   <div><dt>VAT on service charges (7.5%)</dt><dd>{money(totals.vat, true)}</dd></div>
   {hasDocuments && <div><dt>{needsDelivery ? 'Lagos delivery' : 'Free collection'}</dt><dd>{money(totals.shipping)}</dd></div>}
   <div className="review-total"><dt>Total to pay</dt><dd>{money(totals.total, true)}</dd></div>
  </dl>
  <div className="info-box"><PackageCheck size={18} /><span>
   {hasDocuments && <>{needsDelivery ? customer.address : 'We’ll confirm the collection point when your documents are ready.'}<br /></>}
   Soft copies via {customer.channel === 'both' ? 'email & WhatsApp' : customer.channel} · {files.length} file{files.length === 1 ? '' : 's'} attached
  </span></div>
  <label className="checkbox-label"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>{demo ? 'I confirm my details are correct and agree to save this preview in my browser.' : 'I confirm my details are correct and consent to SureWay storing my details and files in Google Drive and sending request updates by email and WhatsApp.'}</span></label>
  {demo && <div className="demo-notice">This is a preview. Your details stay in this browser and no payment will be taken. Fees are illustrative until confirmed by SureWay.</div>}
  <div className="modal-actions">
   <button className="back-button" onClick={() => { setError(''); setStep(2); }} disabled={busy}><ChevronLeft size={16} /> Back</button>
   <button className="button" onClick={pay} disabled={!consent || busy}>{busy ? <LoaderCircle size={18} className="spin" /> : <LockKeyhole size={15} />} {demo ? 'Create preview order' : `Pay ${money(totals.total, true)}`}<ArrowRight size={16} /></button>
  </div>
  {!demo && <p className="modal-footnote">You’ll be redirected to Paystack to complete your payment securely.</p>}
 </div>}

 </> : panel === 'track' ? <><h2 id="modal-title" className="modal-heading">
  <span className="modal-feature-icon" aria-hidden="true"><PackageCheck size={26} /></span>
  A quick check on your order.
 </h2><p className="modal-description">Enter the reference and email you used when ordering.</p><form onSubmit={track} className="stacked-form"><label>Order reference<input name="reference" required placeholder="SW-…" autoComplete="off" /></label><label>Email address<input name="email" type="email" required placeholder="you@example.com" /></label><button className="button" disabled={busy}>{busy ? <LoaderCircle size={18} className="spin" /> : <Search size={17} />} Find my order</button></form>{trackResult && <div className="tracking-result"><span className="tracking-status"><span className="status-dot" />{statusLabels[String(trackResult.status)] || 'Received'}</span><h3>{String(trackResult.reference)}</h3><p>{String(trackResult.make)} · {String(trackResult.plate)}</p><b>{money(Number(trackResult.total), true)}</b><div className="tracking-timeline">{['paid', 'processing', 'soft_copies_ready', 'completed'].map((status, i) => <div key={status} className={['paid', 'processing', 'soft_copies_ready', 'ready_for_collection', 'out_for_delivery', 'completed'].indexOf(String(trackResult.status)) >= ['paid', 'processing', 'soft_copies_ready', 'ready_for_collection', 'out_for_delivery', 'completed'].indexOf(status) ? 'done' : ''}><span>{i + 1}</span>{statusLabels[status]}</div>)}</div>{Array.isArray(trackResult.documents) && trackResult.documents.map((doc: {
              name: string;
              url: string;
            }, i: number) => <a key={i} className="document-download" href={doc.url} target="_blank" rel="noreferrer"><Download size={16} />{doc.name}</a>)}</div>}{demo && <p className="modal-footnote">Preview orders are available only in the browser where they were created.</p>}</> : <><h2 id="modal-title" className="modal-heading">
  <span className="modal-feature-icon" aria-hidden="true">{panel === 'fleet' ? <Building2 size={26} /> : panel === 'registration' ? <CarFront size={26} /> : <MessageCircle size={26} />}</span>
  {panel === 'fleet' ? 'Let’s keep your fleet moving.' : panel === 'registration' ? 'New vehicle. Fresh start.' : 'A real person. Ready to help.'}
 </h2><p className="modal-description">{panel === 'fleet' ? 'Tell us a little about your organization. Our team will follow up to discuss your requirements and arrange the service.' : panel === 'registration' ? 'Share your details and tell us about your vehicle. We’ll get in touch with the requirements and a clear quote.' : 'Send us your question and our team will get back to you.'}</p><form onSubmit={enquiry} className="enquiry-form"><div className="form-grid"><label>Your name<input required name="name" autoComplete="name" minLength={2} maxLength={100} placeholder="Full name" /></label><label>{panel === 'fleet' ? 'Work email' : 'Email address'}<input required name="email" type="email" autoComplete="email" placeholder="you@example.com" /></label><label>Phone / WhatsApp<input required name="phone" type="tel" pattern="[+0-9 ]{10,20}" placeholder="+234 800 000 0000" /></label>{panel === 'fleet' && <><label>Organization<input required name="company" maxLength={150} placeholder="e.g. Unilever" /></label><label className="full-label">Number of vehicles<input required name="fleetSize" type="number" min="1" max="100000" placeholder="e.g. 25" /></label></>}</div>{panel === 'fleet' && <fieldset className="document-checkboxes"><legend>Which documents do you typically need?</legend>{services.map(s => <label key={s.id}><input name="documents" type="checkbox" value={s.name} />{s.name}</label>)}</fieldset>}<label className="full-label">{panel === 'registration' ? 'Tell us about your vehicle' : panel === 'support' ? 'How can we help?' : 'Anything else we should know?'}<textarea name="message" required={panel !== 'fleet'} minLength={panel !== 'fleet' ? 5 : 0} maxLength={3000} placeholder={panel === 'registration' ? 'Make, model, year, imported or locally purchased, and any documents you already have…' : panel === 'support' ? 'Your question or order reference…' : 'Your requirements, locations, or preferred time to call…'} /></label><label className="checkbox-label"><input name="consent" type="checkbox" required /><span>I agree to SureWay storing these details in Google Drive and contacting me about this request by email and WhatsApp.</span></label>{demo && <div className="demo-notice">Preview mode: this enquiry is saved in your browser and is not sent to the team.</div>}<button className="button full-width" disabled={busy}>{busy ? <LoaderCircle size={18} className="spin" /> : null}{demo ? 'Preview enquiry' : panel === 'registration' ? 'Request my registration quote' : 'Send to the SureWay team'}<ArrowRight size={17} /></button></form></>}
 {error && <div className="form-error" role="alert"><CircleHelp size={17} />{error}</div>}
 </section></div>}
 </>;
}
