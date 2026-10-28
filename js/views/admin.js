import { supabase, store } from '../config.js';
import { escapeHtml, uid, formatMoney } from '../utils.js';
import { toast, modal, renderHeader } from '../ui.js';

export default async function adminView(el) {
  if (store.profile?.role !== 'super_admin') { el.innerHTML = `<p class="text-center py-10 text-red-400">غير مصرح</p>`; return; }
  
  // جلب الإعدادات
  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
  const currentName = settings?.platform_name || 'منصة التعليم الذكي';
  const currentLogo = settings?.logo_url || '';
  
  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  const { data: codes } = await supabase.from('codes').select('*').order('created_at', { ascending: false }).limit(50);
  const students = (profiles || []).filter(p => p.role === 'student');
  const teachers = (profiles || []).filter(p => p.role === 'teacher');
  const totalWallet = students.reduce((s, p) => s + (+p.wallet || 0), 0);

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black">لوحة <span class="text-transparent bg-clip-text bg-gradient-to-l from-purple-400 to-pink-500">المالك</span></h1>
      <button id="settings-btn" class="btn-primary text-sm"><i class="fa-solid fa-gear mr-2"></i> إعدادات المنصة</button>
    </div>
    
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-up">
      ${statCard('fa-users', 'الطلاب', students.length, 'text-blue-400')}
      ${statCard('fa-user-tie', 'المدرسون', teachers.length, 'text-green-400')}
      ${statCard('fa-book', 'الكورسات', store.courses.length, 'text-purple-400')}
      ${statCard('fa-wallet', 'إجمالي المحافظ', formatMoney(totalWallet), 'text-orange-400')}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">
      <div class="glass-card p-6">
        <h3 class="font-bold text-lg mb-4">الطلاب (${students.length})</h3>
        <div class="space-y-3 max-h-96 overflow-y-auto pr-2">
          ${students.map(s => `
            <div class="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
              <div>
                <p class="font-bold text-sm">${escapeHtml(s.name)} ${s.isblocked ? '<span class="text-red-400 text-xs">(محظور)</span>' : ''}</p>
                <p class="text-xs text-gray-400">${escapeHtml(s.phone || '')} • ${formatMoney(s.wallet)}</p>
              </div>
              <div class="flex gap-1">
                <button data-charge="${s.id}" class="w-8 h-8 rounded bg-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500/30"><i class="fa-solid fa-plus text-xs"></i></button>
                <button data-block="${s.id}" data-blk="${s.isblocked}" class="w-8 h-8 rounded bg-yellow-500/20 text-yellow-400 flex items-center justify-center hover:bg-yellow-500/30"><i class="fa-solid fa-ban text-xs"></i></button>
                <button data-delu="${s.id}" class="w-8 h-8 rounded bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30"><i class="fa-solid fa-trash text-xs"></i></button>
              </div>
            </div>
          `).join('') || '<p class="text-gray-500">لا يوجد</p>'}
        </div>
      </div>

      <div class="glass-card p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg">المدرسون (${teachers.length})</h3>
          <button id="add-teacher" class="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold">+ مدرس</button>
        </div>
        <div class="space-y-3">
          ${teachers.map(t => `
            <div class="p-3 rounded-lg bg-white/5 border border-white/5">
              <p class="font-bold text-sm">${escapeHtml(t.name)}</p>
              <p class="text-xs text-gray-400">${escapeHtml(t.phone || '')} • ${escapeHtml(t.grade || '')}</p>
            </div>
          `).join('') || '<p class="text-gray-500">لا يوجد</p>'}
        </div>
      </div>

      <div class="glass-card p-6 lg:col-span-2">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg">أكواد الشحن</h3>
          <button id="gen-codes" class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-bold">توليد أكواد</button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
          ${(codes || []).map(c => `
            <div class="p-3 rounded-lg bg-black/30 border border-white/5 flex justify-between items-center">
              <span class="font-mono text-sm">${escapeHtml(c.code)}</span>
              <span class="${c.used ? 'text-red-400' : 'text-green-400'} text-xs font-bold">${formatMoney(c.amount)}</span>
            </div>
          `).join('') || '<p class="text-gray-500 col-span-4 text-center">لا توجد أكواد</p>'}
        </div>
      </div>
    </div>`;

  // --- إعدادات المنصة ---
  el.querySelector('#settings-btn').onclick = () => {
    const m = modal({
      title: 'إعدادات المنصة',
      body: `
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-bold mb-2">اسم المنصة (يظهر في الهيدر والتاب)</label>
            <input id="platform-name" value="${escapeHtml(currentName)}" class="input-field">
          </div>
          <div>
            <label class="block text-sm font-bold mb-2">لوجو المنصة (صورة)</label>
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center overflow-hidden border border-white/10">
                ${currentLogo ? `<img id="preview-logo" src="${currentLogo}" class="w-full h-full object-cover">` : `<i id="preview-logo-icon" class="fa-solid fa-cube text-2xl text-gray-600"></i>`}
              </div>
              <input type="file" id="logo-upload" accept="image/*" class="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20">
            </div>
          </div>
        </div>`,
      actions: `<button id="save-settings" class="btn-primary">حفظ التغييرات</button>`
    });

    let newLogoUrl = currentLogo;
    m.root.querySelector('#logo-upload').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      toast('جاري رفع الصورة...', 'info');
      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('images').upload(fileName, file);
      if (error) { toast('فشل رفع الصورة', 'error'); return; }
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      newLogoUrl = data.publicUrl;
      
      const prev = m.root.querySelector('#preview-logo');
      const icon = m.root.querySelector('#preview-logo-icon');
      if (prev) prev.src = newLogoUrl;
      else if (icon) { icon.outerHTML = `<img id="preview-logo" src="${newLogoUrl}" class="w-full h-full object-cover">`; }
      toast('تم رفع الصورة', 'success');
    };

    m.root.querySelector('#save-settings').onclick = async () => {
      const name = m.root.querySelector('#platform-name').value;
      const { error } = await supabase.from('settings').update({ platform_name: name, logo_url: newLogoUrl }).eq('id', 1);
      if (error) { toast(error.message, 'error'); return; }
      toast('تم الحفظ بنجاح', 'success'); m.close(); location.reload();
    };
  };

  // --- باقي الأزرار (شحن، حظر، إلخ) ---
  el.querySelectorAll('[data-charge]').forEach(b => {
    b.onclick = () => {
      const m = modal({
        title: 'شحن يدوي', body: `<input id="amt" type="number" placeholder="المبلغ" class="input-field">`,
        actions: `<button id="cb" class="btn-accent">شحن</button>`
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

  el.querySelectorAll('[data-block]').forEach(b => {
    b.onclick = async () => {
      const blk = b.dataset.blk === 'true';
      await supabase.from('profiles').update({ isblocked: !blk }).eq('id', b.dataset.block);
      toast('تم', 'success'); location.reload();
    };
  });

  el.querySelectorAll('[data-delu]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('حذف المستخدم نهائياً؟')) return;
      const { error } = await supabase.from('profiles').delete().eq('id', b.dataset.delu);
      if (error) toast(error.message, 'error'); else { toast('حذف', 'success'); location.reload(); }
    };
  });
  
  el.querySelector('#add-teacher').onclick = () => { toast('يرجى الإضافة من لوحة تحكم سوبابيز حالياً', 'info'); };

  el.querySelector('#gen-codes').onclick = () => {
    const m = modal({
      title: 'توليد أكواد شحن',
      body: `<input id="gc-amt" type="number" placeholder="قيمة كل كود" class="input-field mb-2"><input id="gc-cnt" type="number" placeholder="العدد" value="5" class="input-field">`,
      actions: `<button id="gcb" class="btn-primary">توليد</button>`
    });
    m.root.querySelector('#gcb').onclick = async () => {
      const amt = +m.root.querySelector('#gc-amt').value;
      const cnt = +m.root.querySelector('#gc-cnt').value || 1;
      if (!amt) return;
      const rows = [];
      for (let i = 0; i < cnt; i++) rows.push({ id: uid(), code: 'EDU-' + Math.random().toString(36).slice(2, 10).toUpperCase(), amount: amt });
      const { error } = await supabase.from('codes').insert(rows);
      if (error) toast(error.message, 'error'); else { toast('تم', 'success'); m.close(); location.reload(); }
    };
  };
}

function statCard(icon, label, val, colorClass) {
  return `<div class="glass-card p-5 flex items-center gap-4">
    <div class="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
      <i class="fa-solid ${icon} text-2xl ${colorClass}"></i>
    </div>
    <div>
      <p class="text-2xl font-black">${val}</p>
      <p class="text-xs font-bold text-gray-400">${label}</p>
    </div>
  </div>`;
}
