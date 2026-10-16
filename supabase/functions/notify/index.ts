// Korte melding naar de andere familieleden. Geen medische details:
// dit verschijnt op het vergrendelscherm.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const TEAM = "team@triageve.app";
const TEXTS: Record<string, (person: string) => string> = {
  chat: (person) => `${person}: nieuw bericht`,
  diary: (person) => `${person}: belangrijk in het dagboek`,
  status: () => "Let op: status Eef is zorgelijk",
  agenda: (person) => `${person}: afspraak gewijzigd`,
  task: (person) => `${person}: een taak voor je`,
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  if (!publicKey || !privateKey) {
    return Response.json({ skipped: "vapid" }, { headers: cors });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || userData.user?.email !== TEAM) {
    return Response.json({ error: "niet ingelogd" }, { status: 401, headers: cors });
  }

  const body = await req.json().catch(() => ({}));
  const person = String(body.person || "Iemand");
  const kind = String(body.kind || "chat");
  const text = (TEXTS[kind] ?? TEXTS.chat)(person);
  const { data: subs, error } = await supabase.from("triageve_push_subscriptions").select("*");
  if (error) return Response.json({ error: error.message }, { status: 500, headers: cors });

  webpush.setVapidDetails("mailto:bzijffers@gmail.com", publicKey, privateKey);
  let sent = 0;
  for (const sub of subs ?? []) {
    if (sub.person === person) continue;
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: "triagEve", body: text, url: "./#home" }),
      );
      sent += 1;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("triageve_push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
  return Response.json({ sent }, { headers: cors });
});
