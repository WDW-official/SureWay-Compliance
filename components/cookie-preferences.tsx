'use client';

import { useEffect, useRef, useState } from 'react';

const storageKey = 'sureway-cookie-preferences-v1';
const settingsEvent = 'sureway-open-cookie-settings';
const rejected = { analytics: false, marketing: false };
const accepted = { analytics: true, marketing: true };
type Preferences = typeof rejected;

export function CookieSettingsButton({ label = 'Cookie settings' }: { label?: string }) {
  return <button type="button" onClick={() => window.dispatchEvent(new Event(settingsEvent))}>{label}</button>;
}

export default function CookiePreferences() {
  const [choice, setChoice] = useState<Preferences | null | undefined>(undefined);
  const [draft, setDraft] = useState(rejected);
  const settings = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      setChoice(typeof stored?.analytics === 'boolean' && typeof stored?.marketing === 'boolean' ? stored : null);
    } catch {
      setChoice(null);
    }
  }, []);

  function save(preferences: Preferences) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      // Apply the choice for this visit if browser storage is unavailable.
    }
    setChoice(preferences);
    settings.current?.close();
  }

  useEffect(() => {
    function open() {
      setDraft(choice ?? rejected);
      if (!settings.current?.open) settings.current?.showModal();
    }
    window.addEventListener(settingsEvent, open);
    return () => window.removeEventListener(settingsEvent, open);
  }, [choice]);

  return <>
    {choice === null && <aside className="cookie-banner" aria-label="Cookie preferences">
      <p><strong>Your cookie choices</strong><br />Essential storage supports features like your cart. You can choose whether to allow optional cookies.</p>
      <div className="cookie-actions">
        <button className="button" type="button" onClick={() => save(accepted)}>Accept optional</button>
        <button className="button" type="button" onClick={() => save(rejected)}>Reject optional</button>
        <CookieSettingsButton label="Manage preferences" />
      </div>
    </aside>}
    <dialog ref={settings} className="modal cookie-dialog" aria-labelledby="cookie-settings-title">
      <h2 id="cookie-settings-title">Cookie settings</h2>
      <p>Essential storage supports site features and remembers your cookie choice.</p>
      <label><input type="checkbox" checked={draft.analytics} onChange={event => setDraft({ ...draft, analytics: event.target.checked })} /> Allow analytics cookies</label>
      <label><input type="checkbox" checked={draft.marketing} onChange={event => setDraft({ ...draft, marketing: event.target.checked })} /> Allow marketing cookies</label>
      <div className="cookie-actions">
        <button className="button" type="button" onClick={() => save(draft)}>Save preferences</button>
        <button type="button" onClick={() => settings.current?.close()}>Close</button>
      </div>
    </dialog>
  </>;
}
