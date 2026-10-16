// Supabase > Project Settings > API (of "Connect").
// De URL en de publishable/anon key mogen openbaar zijn: de database is
// afgeschermd met Row Level Security en het team-wachtwoord.
window.TRIAGEVE_CONFIG = {
  SUPABASE_URL: 'https://slddtxwbufoadmvdconz.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZGR0eHdidWZvYWRtdmRjb256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNjc1NDMsImV4cCI6MjEwNzc0MzU0M30.M30IGYTwhNgtesZh7E3ELYwoMrnq6XvbURPlACMhIvo',
  TEAM_EMAIL: 'team@triageve.app',
  // Publieke VAPID-sleutel (fase 12). Privé-sleutel hoort in GitHub secret VAPID_PRIVATE_KEY.
  VAPID_PUBLIC_KEY: '',
};
