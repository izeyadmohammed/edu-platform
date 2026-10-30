import { supabase, store, loadAllData } from './config.js';

// تسجيل Service Worker للتحديث التلقائي
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('SW registered:', reg);
        // فحص التحديثات كل 30 ثانية
        setInterval(() => reg.update(), 30000);
      })
      .catch(err => console.log('SW registration failed:', err));
  });
  
  // لما الـ Service Worker الجديد يشتغل، اعمل Refresh للصفحة
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
import { bootstrapAuth } from './auth.js';
import { renderHeader, renderFooter, initDark } from './ui.js';
import { route } from './router.js';

async function boot() {
  initDark();
  renderFooter();
  await bootstrapAuth();
  const { getSettings } = await import('./ui.js');
  await getSettings();
  await renderHeader();
  
  supabase.channel('global')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, async () => { await loadAllData(); await renderHeader(); route(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lectures' }, async () => { await loadAllData(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => { await loadAllData(); await renderHeader(); })
    .subscribe();
    
  supabase.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') { await bootstrapAuth(); await renderHeader(); }
    if (event === 'SIGNED_OUT') { store.user = null; store.profile = null; await renderHeader(); }
  });
  
  window.addEventListener('hashchange', route);
  await route();
}
boot().catch(e => { console.error('boot', e); document.getElementById('app-main').innerHTML = `<div class="text-center py-20 text-red-600">خطأ: ${e.message}</div>`; });
