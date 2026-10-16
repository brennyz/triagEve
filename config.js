// Supabase > Project Settings > API (of "Connect").
// De URL en de publishable/anon key mogen openbaar zijn: de database is
// afgeschermd met Row Level Security en het team-wachtwoord.
window.TRIAGEVE_CONFIG = {
  SUPABASE_URL: 'https://JOUW-PROJECT.supabase.co',
  SUPABASE_KEY: 'JOUW-PUBLISHABLE-OF-ANON-KEY',
  TEAM_EMAIL: 'team@triageve.app',
  // Publieke VAPID-sleutel (fase 12). Privé-sleutel hoort in GitHub secret VAPID_PRIVATE_KEY.
  VAPID_PUBLIC_KEY: '',
};
