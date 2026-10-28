import { supabase, store } from '../config.js';
import { escapeHtml, formatMoney, formatDate } from '../utils.js';
import { toast, modal } from '../ui.js';
export default async function studentView(el) {
  const p = store.profile;
  if (!p) { el.innerHTML = `<p class="text-center">سجّل دخول</p>`; return; }
  const { data: txs } = await supabase.from('transactions').select('*').eq('user_id', p.id).order('created_at', { ascending: false }).limit(20);
  const { data: subs } = await supabase.from('exam_submissions').select('*').eq('student_id', p.id).order('submitted_at', { ascending: false });
  el.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
    <div class="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow col-span-1">
      <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl mb-3"><i class="fa-solid fa-user"></i></div>
      <h2 class="text-xl font-extrabold">${escapeHtml(p.name)}</h2>
      <p class="text-sm opacity-90">${escapeHtml(p.phone||'')}</p>
      <p class="text-sm opacity-90">${escapeHtml(p.grade||'')}</p>
      <div class="mt-3 pt-3 border-t border-white/20"><p class="text-xs opacity-80">المحفظة</p><p class="text-2xl font-extrabold">${formatMoney(p.wallet)}</p></div></div>
    <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow col-span-2">
      <h3 class="font-bold mb-3">أدوات سريعة</h3>
      <div class="grid grid-cols-2 gap-2">
        <button id="charge" class="p-3 bg-green-600 text-white rounded-lg font-bold"><i class="fa-solid fa-wallet"></i> شحن المحفظة</button>
        <a href="#/courses" class="p-3 bg-blue-600 text-white rounded-lg font-bold text-center"><i class="fa-solid fa-book"></i> كورساتي</a>
        <button id="pw" class="p-3 bg-purple-600 text-white rounded-lg font-bold"><i class="fa-solid fa-key"></i> تغيير كلمة المرور</button>
        <a href="#/notifications" class="p-3 bg-orange-600 text-white rounded-lg font-bold text-center"><i class="fa-solid fa-bell"></i> الإشعارات</a>
      </div></div></div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow"><h3 class="font-bold mb-3">آخر المعاملات</h3>
        ${(txs||[]).length === 0 ? '<p class="text-gray-500 text-sm">لا توجد معاملات</p>' : `<div class="space-y-2">${txs.map(t => `<div class="flex justify-between items-center p-2 border-b border-gray-100 dark:border-slate-700 text-sm"><div><p>${escapeHtml(t.note||'-')}</p><p class="text-xs text-gray-500">${formatDate(t.created_at)}</p></div><span class="${t.type==='credit'?'text-green-600':'text-red-600'} font-bold">${t.type==='credit'?'+':'-'}${formatMoney(t.amount)}</span></div>`).join('')}</div>`}</div>
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow"><h3 class="font-bold mb-3">درجاتي</h3>
        ${(subs||[]).length === 0 ? '<p class="text-gray-500 text-sm">لا توجد درجات</p>' : `<div class="space-y-2">${subs.map(s => `<div class="flex justify-between items-center p-2 border-b border-gray-100 dark:border-slate-700 text-sm"><div><p>${escapeHtml(s.type==='mcq'?'اختبار MCQ':'واجب')} - ${escapeHtml(s.status)}</p><p class="text-xs text-gray-500">${formatDate(s.submitted_at)}</p></div><span class="font-bold">${s.grade ?? '-'} ${s.total?(' / '+s.total):''}</span></div>`).join('')}</div>`}</div></div>`;
  el.querySelector('#charge').onclick = () => {
    const m = modal({ title: 'شحن المحفظة', body: `<input id="code-inp" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700" placeholder="أدخل كود الشحن">`, actions: `<button id="cbtn" class="px-4 py-2 bg-green-600 text-white rounded font-bold">شحن</button>` });
    m.root.querySelector('#cbtn').onclick = async () => {
      const code = m.root.querySelector('#code-inp').value.trim();
      if (!code) return;
      try { const { error } = await supabase.rpc('redeem_code', { code_input: code }); if (error) throw new Error(error.message); toast('تم الشحن', 'success'); m.close(); const { loadProfile } = await import('../auth.js'); await loadProfile(); location.reload(); } catch (e) { toast(e.message, 'error'); }
    };
  };
  el.querySelector('#pw').onclick = () => {
    const m = modal({ title: 'تغيير كلمة المرور', body: `<input id="np" type="password" placeholder="كلمة المرور الجديدة" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700">`, actions: `<button id="sbtn" class="px-4 py-2 bg-purple-600 text-white rounded font-bold">تغيير</button>` });
    m.root.querySelector('#sbtn').onclick = async () => {
      const np = m.root.querySelector('#np').value;
      if (np.length < 6) { toast('كلمة مرور قصيرة', 'warn'); return; }
      const { error } = await supabase.auth.updateUser({ password: np });
      if (error) toast(error.message, 'error'); else { toast('تم التغيير', 'success'); m.close(); }
    };
  };
}
