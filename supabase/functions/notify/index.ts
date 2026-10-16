// Stuurt een korte push naar iedereen behalve de schrijver.
// Geen medische details: meldingen staan op het vergrendelscherm.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const TEXTS: Record<string, (author: string) => { title: string; body: string; tab: string }> = {
  chat: (a) => ({ title: 'triagEve', body: `${a}: nieuw bericht`, tab: 'chat' }),
  diary: (a) => ({ title: 'triagEve', body: `${a}: belangrijk dagboekstukje`, tab: 'diary' }),
  status: () => ({ title: 'triagEve', body: 'Let op: status Eef is zorgelijk', tab: 'home' }),
  meeting: (a) => ({ title: 'triagEve', body: `${a}: agenda gewijzigd`, tab: 'meet' }),
  task: (a) => ({ title: 'triagEve', body: `${a}: nieuwe taak`, tab: 'tasks' }),
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' } });
  }
  try {
    const { kind, author } = await req.json();
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    if (!vapidPublic || !vapidPrivate) {
      return json({ ok: false, error: 'VAPID ontbreekt' }, 200);
    }
    webpush.setVapidDetails('mailto:bzijffers@gmail.com', vapidPublic, vapidPrivate);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE') ?? '',
    );
    const { data: subs, error } = await supabase.from('triageve_push_subscriptions').select('*');
    if (error) throw error;
    const payload = TEXTS[kind] ? TEXTS[kind](author || 'Iemand') : { title: 'triagEve', body: 'Nieuw in de app', tab: 'home' };
    const body = JSON.stringify(payload);
    const targets = (subs || []).filter((s: { person: string }) => s.person !== author);
    await Promise.all(targets.map((s: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification({
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      }, body).catch((err: { statusCode?: number }) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          return supabase.from('triageve_push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
      })));
    return json({ ok: true, sent: targets.length });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
