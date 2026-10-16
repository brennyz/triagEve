import { $, CFG, db, store, check, toast } from './core.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export async function pingNotify(kind, author = store.me) {
  if (!db) return;
  try {
    await db.functions.invoke('notify', { body: { kind, author } });
  } catch (e) {
    console.warn('notify', e);
  }
}

async function enablePush() {
  const key = CFG.VAPID_PUBLIC_KEY;
  if (!key) {
    toast('Meldingen staan klaar in de code. Bren moet nog de VAPID-sleutels zetten.');
    return;
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    toast('Deze browser ondersteunt geen meldingen.');
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    toast('Meldingen zijn niet toegestaan.');
    return;
  }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });
  const json = sub.toJSON();
  if (!db) {
    toast('Meldingen aan op dit toestel (lokaal).');
    $('#push-status').textContent = 'Aan op dit toestel.';
    return;
  }
  const { error } = await db.from('triageve_push_subscriptions').upsert({
    person: store.me,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  }, { onConflict: 'endpoint' });
  if (check(error, 'Meldingen opslaan')) return;
  toast('Meldingen staan aan.');
  $('#push-status').textContent = 'Aan op dit toestel.';
}

async function disablePush() {
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      if (db) await db.from('triageve_push_subscriptions').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }
  }
  toast('Meldingen staan uit.');
  $('#push-status').textContent = 'Uit.';
}

$('#push-on')?.addEventListener('click', enablePush);
$('#push-off')?.addEventListener('click', disablePush);

export { enablePush, disablePush };
