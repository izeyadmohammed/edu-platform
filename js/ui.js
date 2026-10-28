import { store, supabase } from './config.js';

// دالة لجلب الإعدادات
async function getSettings() {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
  if (data) {
    store.settings = data;
    document.getElementById('page-title').textContent = data.platform_name;
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
    <div class="flex items-center justify-between p-5 border-b border-white/10">
      <h3 class="font-extrabold text-xl">${title}</h3>
      <button data-close class="text-gray-400 hover:text-red-500 text-2xl">&times;</button>
    </div>
    <div class="p-5">${body}</div>
    ${actions ? `<div class="p-5 border-t border-white/10 flex justify-end gap-3">${actions}</div>` : ''}
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
  
  // جلب الإعدادات لو مش محملة
  if (!store.settings) await getSettings();
  
  const p = store.profile;
  const unread = (store.notifications || []).filter(n => !n.read).length;
  const platformName = store.settings?.platform_name || 'منصة التعليم';
  const logoUrl = store.settings?.logo_url;

  h.className = 'glass-header sticky top-0 z-[800]';
  h.innerHTML = `<div class="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
    <a href="#/home" class="flex items-center gap-3 text-2xl font-black text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">
      ${logoUrl ? `<img src="${logoUrl}" class="w-10 h-10 rounded-xl object-cover">` : `<i class="fa-solid fa-cube text-blue-500"></i>`}
      <span>${platformName}</span>
    </a>
    
    <nav class="hidden md:flex items-center gap-6 text-sm font-bold text-gray-300">
      <a href="#/home" class="hover:text-white transition">الرئيسية</a>
      <a href="#/courses" class="hover:text-white transition">الكورسات</a>
      <a href="#/teachers" class="hover:text-white transition">المدرسون</a>
      ${p && p.role === 'student' ? `<a href="#/student" class="hover:text-white transition">حسابي</a>` : ''}
      ${p && p.role === 'teacher' ? `<a href="#/teacher" class="hover:text-white transition text-blue-400">لوحة المدرس</a>` : ''}
      ${p && p.role === 'super_admin' ? `<a href="#/admin" class="hover:text-white transition text-purple-400">لوحة المالك</a>` : ''}
    </nav>

    <div class="flex items-center gap-3">
      ${p ? `
        <a href="#/notifications" class="relative w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/10 transition">
          <i class="fa-regular fa-bell text-gray-300"></i>
          ${unread ? `<span class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-gray-900">${unread}</span>` : ''}
        </a>
        <button id="logout-btn" class="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-bold transition">خروج</button>
      ` : `
        <a href="#/login" class="px-5 py-2 rounded-lg text-white font-bold hover:text-blue-400 transition">دخول</a>
        <a href="#/signup" class="btn-primary text-sm">حساب جديد</a>
      `}
    </div>
  </div>`;
  
  const lo = h.querySelector('#logout-btn');
  if (lo) lo.onclick = async () => {
    await supabase.auth.signOut();
    location.hash = '#/home';
    location.reload();
  };
}

export function renderFooter() {
  const f = document.getElementById('app-footer');
  if (!f) return;
  f.className = 'border-t border-white/5 py-8 mt-12 bg-black/20';
  f.innerHTML = `<div class="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
    <div class="flex items-center gap-2 font-bold text-gray-400">
      <i class="fa-solid fa-cube text-blue-500"></i> منصة التعليم
    </div>
    <div class="flex gap-4 font-bold text-xs">
      <a href="#" class="hover:text-white transition">شروط الاستخدام</a>
      <a href="#" class="hover:text-white transition">سياسة الخصوصية</a>
      <a href="#" class="hover:text-white transition">سياسة الاسترجاع</a>
    </div>
    <p>&copy; ${new Date().getFullYear()} جميع الحقوق محفوظة</p>
  </div>`;
}

export function setLoading(el = document.getElementById('app-main'), msg = 'جاري التحميل...') {
  if (!el) return;
  el.innerHTML = `<div class="flex flex-col items-center justify-center py-32 text-gray-400 animate-fade-up">
    <div class="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
    <p class="font-bold">${msg}</p>
  </div>`;
}

export function initDark() {}
export function toggleDark() {}
