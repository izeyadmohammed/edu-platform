import { store, supabase } from './config.js';

export function initDark() {
  const theme = localStorage.getItem('theme');
  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function toggleDark() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}

export async function getSettings() {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
  if (data) {
    store.settings = data;
    document.getElementById('page-title').textContent = data.platform_name || 'منصة التعليم';
  }
}

export function toast(msg, type = 'info') {
  const colors = { info: 'bg-blue-600', success: 'bg-green-500', error: 'bg-red-500', warn: 'bg-yellow-500' };
  const el = document.createElement('div');
  el.className = `${colors[type] || colors.info} text-white px-6 py-3 rounded-lg shadow-2xl transition-fade max-w-sm font-bold animate-fade-up`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export function modal({ title = '', body = '', actions = '' }) {
  const root = document.getElementById('modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-up';
  wrap.innerHTML = `<div class="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto">
    <div class="flex items-center justify-between p-5 border-b border-border">
      <h3 class="font-extrabold text-xl text-main">${title}</h3>
      <button data-close class="text-muted hover:text-red-500 text-2xl">&times;</button>
    </div>
    <div class="p-5">${body}</div>
    ${actions ? `<div class="p-5 border-t border-border flex justify-end gap-3">${actions}</div>` : ''}
  </div>`;
  root.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.querySelector('[data-close]').onclick = close;
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  return { close, root: wrap };
}

export async function renderHeader() {
  const h = document.getElementById('app-header');
  if (!h) return;
  if (!store.settings) await getSettings();
  
  const p = store.profile;
  const unread = (store.notifications || []).filter(n => !n.read).length;
  const platformName = store.settings?.platform_name || 'منصة التعليم';
  const logoUrl = store.settings?.logo_url;
  const supportNum = store.settings?.support_whatsapp;
  const devNum = store.settings?.developer_whatsapp;
  const isDark = document.documentElement.classList.contains('dark');

  h.className = 'glass-header sticky top-0 z-[800]';
  h.innerHTML = `<div class="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
    <a href="#/home" class="flex items-center gap-3 text-2xl font-black text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">
      ${logoUrl ? `<img src="${logoUrl}" class="w-10 h-10 rounded-xl object-cover">` : `<i class="fa-solid fa-cube text-blue-500"></i>`}
      <span>${platformName}</span>
    </a>
    
    <nav class="hidden md:flex items-center gap-6 text-sm font-bold text-muted">
      <a href="#/home" class="hover:text-primary transition">الرئيسية</a>
      <a href="#/courses" class="hover:text-primary transition">الكورسات</a>
      <a href="#/teachers" class="hover:text-primary transition">المدرسون</a>
      ${p && p.role === 'student' ? `<a href="#/student" class="hover:text-primary transition">حسابي</a>` : ''}
      ${p && (p.role === 'teacher' || p.role === 'assistant') ? `<a href="#/teacher" class="hover:text-primary transition">لوحة المعلم</a>` : ''}
      ${p && p.role === 'super_admin' ? `<a href="#/admin" class="hover:text-primary transition">لوحة المالك</a>` : ''}
    </nav>

    <div class="flex items-center gap-2 md:gap-3">
      <button id="dark-toggle" class="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/10 transition text-main">
        <i class="fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}"></i>
      </button>

      ${supportNum ? `
        <a href="https://wa.me/${supportNum}" target="_blank" class="px-3 py-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 text-xs md:text-sm font-bold transition flex items-center gap-2">
          <i class="fa-brands fa-whatsapp text-lg"></i> <span class="hidden sm:inline">الدعم</span>
        </a>
      ` : ''}

      ${devNum ? `
        <a href="https://wa.me/${devNum}" target="_blank" class="px-3 py-2 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 text-xs md:text-sm font-bold transition flex items-center gap-2">
          <i class="fa-solid fa-code text-lg"></i> <span class="hidden sm:inline">المطور</span>
        </a>
      ` : ''}

      ${p ? `
        <a href="#/notifications" class="relative w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/10 transition text-main">
          <i class="fa-regular fa-bell"></i>
          ${unread ? `<span class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white dark:border-gray-900">${unread}</span>` : ''}
        </a>
        <button id="logout-btn" class="px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs md:text-sm font-bold transition">خروج</button>
      ` : `
        <a href="#/login" class="px-3 md:px-5 py-2 rounded-lg text-main font-bold hover:text-primary transition text-sm">دخول</a>
        <a href="#/signup" class="btn-primary text-xs md:text-sm px-3 md:px-5">حساب جديد</a>
      `}
    </div>
  </div>`;
  
  h.querySelector('#dark-toggle').onclick = () => { toggleDark(); renderHeader(); };
  const lo = h.querySelector('#logout-btn');
  if (lo) lo.onclick = async () => {
    await supabase.auth.signOut();
    location.hash = '#/home';
    location.reload();
  };
}

// ... (renderFooter و setLoading زي ما هم)
