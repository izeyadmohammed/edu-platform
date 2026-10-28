import { supabase, store, refreshCourses } from '../config.js';
import { escapeHtml, uid, formatMoney, formatDate } from '../utils.js';
import { toast, modal } from '../ui.js';
import { SUPABASE_URL } from '../config.js';

export default async function adminView(el) {
  if (store.profile?.role !== 'super_admin') {
    el.innerHTML = `<p class="text-center py-10 text-red-600">غير مصرح</p>`; return;
  }
  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  const { data: codes } = await supabase.from('codes').select('*').order('created_at', { ascending: false }).limit(50);
  const students = (profiles || []).filter(p => p.role === 'student');
  const teachers = (profiles || []).filter(p => p.role === 'teacher');
  const totalWallet = students.reduce((s, p) => s + (+p.wallet || 0), 0);

  el.innerHTML = `
    <h1 class="text-2xl font-extrabold mb-5">لوحة المالك</h1>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      ${statCard('fa-users', 'الطلاب', students.length, 'blue')}
      ${statCard('fa-user-tie', 'المدرسون', teachers.length, 'green')}
      ${statCard('fa-book', 'الكورسات', store.courses.length, 'purple')}
      ${statCard('fa-wallet', 'إجمالي المحافظ', formatMoney(totalWallet), 'orange')}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow">
        <h3 class="font-bold mb-3">الطلاب (${students.length})</h3>
        <div class="space-y-2 max-h-96 overflow-y-auto">
          ${students.map(s => `
            <div class="flex justify-between items-center p-2 border-b border-gray-100 dark:border-slate-700">
              <div>
                <p class="font-bold text-sm">${escapeHtml(s.name)} ${s.isblocked ? '<span class="text-red-600">(محظور)</span>' : ''}</p>
                <p class="text-xs text-gray-500">${escapeHtml(s.phone || '')} • ${formatMoney(s.wallet)}</p>
              </div>
              <div class="flex gap-1">
                <button data-charge="${s.id}" class="px-2 py-1 bg-green-600 text-white rounded text-xs">شحن</button>
                <button data-block="${s.id}" data-blk="${s.isblocked}" class="px-2 py-1 bg-yellow-500 text-white rounded text-xs">${s.isblocked ? 'فك' : 'حظر'}</button>
                <button data-delu="${s.id}" class="px-2 py-1 bg-red-600 text-white rounded text-xs">حذف</button>
              </div>
            </div>`).join('') || '<p class="text-gray-500">لا يوجد</p>'}
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold">المدرسون (${teachers.length})</h3>
          <button id="add-teacher" class="px-3 py-1 bg-blue-600 text-white rounded text-sm">+ مدرس</button>
        </div>
        <div class="space-y-2">
          ${teachers.map(t => `
            <div class="p-2 border-b border-gray-100 dark:border-slate-700">
              <p class="font-bold text-sm">${escapeHtml(t.name)}</p>
              <p class="text-xs text-gray-500">${escapeHtml(t.phone || '')} • ${escapeHtml(t.grade || '')}</p>
            </div>`).join('') || '<p class="text-gray-500">لا يوجد</p>'}
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow lg:col-span-2">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold">أكواد الشحن</h3>
          <button id="gen-codes" class="px-3 py-1 bg-purple-600 text-white rounded text-sm">توليد أكواد</button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
          ${(codes || []).map(c => `
            <div class="p-2 bg-gray-50 dark:bg-slate-900 rounded text-xs flex justify-between">
              <span class="font-mono">${escapeHtml(c.code)}</span>
              <span class="${c.used ? 'text-red-600' : 'text-green-600'}">${formatMoney(c.amount)} ${c.used ? '✓' : ''}</span>
            </div>`).join('') || '<p class="text-gray-500">لا توجد أكواد</p>'}
        </div>
      </div>
    </div>`;

  // شحن يدوي
  el.querySelectorAll('[data-charge]').forEach(b => {
    b.onclick = () => {
      const m = modal({
        title: 'شحن يدوي',
        body: `<input id="amt" type="number" placeholder="المبلغ" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700">`,
        actions: `<button id="cb" class="px-4 py-2 bg-green-600 text-white rounded font-bold">شحن</button>`
      });
      m.root.querySelector('#cb').onclick = async () => {
        const amt = +m.root.querySelector('#amt').value;
        if (!amt) return;
        const targetId = b.dataset.charge;
        const { data: prof } = await supabase.from('profiles').select('wallet').eq('id', targetId).single();
        await supabase.from('profiles').update({ wallet: (+prof.wallet || 0) + amt }).eq('id', targetId);
        await supabase.from('transactions').insert({ id: uid(), user_id: targetId, type: 'credit', amount: amt, note: 'شحن يدوي' });
        toast('تم', 'success'); m.close(); location.reload();
      };
    };
  });

  // حظر / فك حظر
  el.querySelectorAll('[data-block]').forEach(b => {
    b.onclick = async () => {
      const blk = b.dataset.blk === 'true';
      await supabase.from('profiles').update({ isblocked: !blk }).eq('id', b.dataset.block);
      toast('تم', 'success'); location.reload();
    };
  });

  // حذف مستخدم
  el.querySelectorAll('[data-delu]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('حذف المستخدم نهائياً؟')) return;
      const { error } = await supabase.from('profiles').delete().eq('id', b.dataset.delu);
      if (error) toast(error.message, 'error');
      else { toast('حذف', 'success'); location.reload(); }
    };
  });

  // إضافة مدرس (بدون توكن)
  el.querySelector('#add-teacher').onclick = () => {
    const m = modal({
      title: 'إضافة مدرس',
      body: `
        <div class="space-y-2">
          <input id="tn" placeholder="الاسم" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700">
          <input id="tp" placeholder="رقم الهاتف" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700">
          <input id="tg" placeholder="الصف" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700">
          <input id="tpw" type="password" placeholder="كلمة مرور (افتراضي 123456)" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700">
        </div>`,
      actions: `<button id="tb" class="px-4 py-2 bg-blue-600 text-white rounded font-bold">إضافة</button>`
    });
    m.root.querySelector('#tb').onclick = async () => {
      const body = {
        phone: m.root.querySelector('#tp').value,
        name: m.root.querySelector('#tn').value,
        grade: m.root.querySelector('#tg').value,
        password: m.root.querySelector('#tpw').value || '123456'
      };
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/create_teacher`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error || 'فشل الاتصال');
        toast('تم إنشاء المدرس. كلمة المرور: ' + out.default_password, 'success');
        m.close(); location.reload();
      } catch (e) { toast(e.message, 'error'); }
    };
  };

  // توليد أكواد
  el.querySelector('#gen-codes').onclick = () => {
    const m = modal({
      title: 'توليد أكواد شحن',
      body: `
        <input id="gc-amt" type="number" placeholder="قيمة كل كود" class="w-full px-3 py-2 border rounded mb-2 dark:bg-slate-900 dark:border-slate-700">
        <input id="gc-cnt" type="number" placeholder="العدد" value="5" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700">`,
      actions: `<button id="gcb" class="px-4 py-2 bg-purple-600 text-white rounded font-bold">توليد</button>`
    });
    m.root.querySelector('#gcb').onclick = async () => {
      const amt = +m.root.querySelector('#gc-amt').value;
      const cnt = +m.root.querySelector('#gc-cnt').value || 1;
      if (!amt) return;
      const rows = [];
      for (let i = 0; i < cnt; i++) {
        rows.push({ id: uid(), code: 'EDU-' + Math.random().toString(36).slice(2, 10).toUpperCase(), amount: amt });
      }
      const { error } = await supabase.from('codes').insert(rows);
      if (error) toast(error.message, 'error');
      else { toast('تم', 'success'); m.close(); location.reload(); }
    };
  };
}

function statCard(icon, label, val, color) {
  const colors = {
    blue: 'from-blue-500 to-indigo-600',
    green: 'from-green-500 to-emerald-600',
    purple: 'from-purple-500 to-pink-600',
    orange: 'from-orange-500 to-red-600'
  };
  return `<div class="bg-gradient-to-br ${colors[color]} text-white rounded-xl p-4 shadow">
    <i class="fa-solid ${icon} text-2xl mb-2"></i>
    <p class="text-2xl font-extrabold">${val}</p>
    <p class="text-xs opacity-90">${label}</p>
  </div>`;
}
