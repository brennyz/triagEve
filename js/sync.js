import { $, db, store, loaders, realtime, afterLoad } from './core.js';

export async function reloadAll() {
  await Promise.all(loaders.map((fn) => fn()));
  afterLoad.forEach((fn) => fn());
}

export function subscribe() {
  if (!db) return;
  if (store.channel) db.removeChannel(store.channel);
  let ch = db.channel('triageve');
  for (const { table, handler } of realtime) {
    ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, handler);
  }
  store.channel = ch.subscribe((status) => {
    $('#conn').classList.toggle('online', status === 'SUBSCRIBED');
  });
  if (store.activeTab && !db) $('#conn').classList.remove('online');
}
