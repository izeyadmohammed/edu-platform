import { supabase, store, refreshCourses } from '../config.js';
import { escapeHtml, uid, formatMoney } from '../utils.js';
import { toast, modal } from '../ui.js';

export default async function adminView(el) {
  if (store.profile?.role !== 'super_admin') { el.innerHTML = `<p class="text-center py-10 text-red-400">غير مصرح</p>`; return; }
  
  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
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
                <button data-charge="${s.id}" class="w-8 h-8 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"><i class="fa-solid fa-plus text-xs"></i></button>
                <button data-block="${s.id}" data-blk="${s.isblocked}" class="w-8 h-8 rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"><i class="fa-solid fa-ban text-xs"></i></button>
                <button data-delu="${s.id}" class="w-8 h-8 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"><i class="fa-solid fa-trash text-xs"></i></button>
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
        <div class="space-y-3 max-h-96 overflow-y-auto pr-2">
          ${teachers.map(t => `
            <div class="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
              <div>
                <p class="font-bold text-sm">${escapeHtml(t.name)}</p>
                <p class="text-xs text-gray-400">${escapeHtml(t.phone || '')} • ${escapeHtml(t.grade || '')}</p>
              </div>
              <div class="flex gap-1">
                <button data-edit-teacher="${t.id}" class="w-8 h-8 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"><i class="fa-solid fa-pen text-xs"></i></button>
                <button data-del-teacher="${t.id}" class="w-8 h-8 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"><i class="fa-solid fa-trash text-xs"></i></button>
              </div>
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

  // --- إعدادات المنصة والسوشيال ميديا ---
  el.querySelector('#settings-btn').onclick = () => {
    const s = settings || {};
    const m = modal({
      title: 'إعدادات المنصة',
      body: `
        <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <h4 class="font-bold text-blue-400 mb-2">الهوية البصرية</h4>
          <div>
            <label class="block text-sm font-bold mb-1">اسم المنصة</label>
            <input id="platform-name" value="${escapeHtml(s.platform_name || '')}" class="input-field">
          </div>
          <div>
            <label class="block text-sm font-bold mb-1">لوجو المنصة</label>
            <div class="flex items-center gap-3">
              <div id="logo-prev" class="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden border border-white/10">
                ${s.logo_url ? `<img src="${s.logo_url}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-cube text-gray-600"></i>`}
              </div>
              <input type="file" id="logo-upload" accept="image/*" class="text-sm w-full file:bg-blue-500/10 file:text-blue-400 file:border-0 file:rounded-lg file:px-3 file:py-1">
            </div>
          </div>

          <h4 class="font-bold text-green-400 mt-6 mb-2">روابط التواصل الاجتماعي</h4>
          ${socialInput('facebook', 'فيسبوك', s.facebook_url, s.show_facebook)}
          ${socialInput('whatsapp', 'واتساب', s.whatsapp_url, s.show_whatsapp)}
          ${socialInput('telegram', 'تيلجرام', s.telegram_url, s.show_telegram)}
          ${socialInput('instagram', 'إنستجرام', s.instagram_url, s.show_instagram)}
          ${socialInput('tiktok', 'تيك توك', s.tiktok_url, s.show_tiktok)}
        </div>`,
      actions: `<button id="save-settings" class="btn-primary w-full">حفظ جميع الإعدادات</button>`
    });

    let newLogoUrl = s.logo_url || '';
    m.root.querySelector('#logo-upload').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      toast('جاري رفع الصورة...', 'info');
      const fileName = `logo_${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('images').upload(fileName, file);
      if (error) { toast('فشل الرفع', 'error'); return; }
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      newLogoUrl = data.publicUrl;
      m.root.querySelector('#logo-prev').innerHTML = `<img src="${newLogoUrl}" class="w-full h-full object-cover">`;
      toast('تم', 'success');
    };

    m.root.querySelector('#save-settings').onclick = async () => {
      const updates = {
        platform_name: m.root.querySelector('#platform-name').value,
        logo_url: newLogoUrl,
        facebook_url: m.root.querySelector('#url-facebook').value,
        whatsapp_url: m.root.querySelector('#url-whatsapp').value,
        telegram_url: m.root.querySelector('#url-telegram').value,
        instagram_url: m.root.querySelector('#url-instagram').value,
        tiktok_url: m.root.querySelector('#url-tiktok').value,
        show_facebook: m.root.querySelector('#show-facebook').checked,
        show_whatsapp: m.root.querySelector('#show-whatsapp').checked,
        show_telegram: m.root.querySelector('#show-telegram').checked,
        show_instagram: m.root.querySelector('#show-instagram').checked,
        show_tiktok: m.root.querySelector('#show-tiktok').checked,
      };
      const { error } = await supabase.from('settings').update(updates).eq('id', 1);
      if (error) { toast(error.message, 'error'); return; }
      toast('تم حفظ الإعدادات', 'success'); m.close(); location.reload();
    };
  };

  // باقي الأزرار (شحن، حظر، حذف طالب)
  el.querySelectorAll('[data-charge]').forEach(b => { /* ... */ });
  el.querySelectorAll('[data-block]').forEach(b => { /* ... */ });
  el.querySelectorAll('[data-delu]').forEach(b => { /* ... */ });

  // تعديل المدرس
  el.querySelectorAll('[data-edit-teacher]').forEach(b => {
    b.onclick = () => {
      const t = teachers.find(x => x.id === b.dataset.editTeacher);
      const m = modal({
        title: 'تعديل المدرس',
        body: `
          <input id="et-name" value="${escapeHtml(t.name)}" placeholder="الاسم" class="input-field mb-2">
          <input id="et-phone" value="${escapeHtml(t.phone || '')}" placeholder="الهاتف" class="input-field mb-2">
          <input id="et-grade" value="${escapeHtml(t.grade || '')}" placeholder="الصف" class="input-field">`,
        actions: `<button id="et-save" class="btn-primary">حفظ</button>`
      });
      m.root.querySelector('#et-save').onclick = async () => {
        const { error } = await supabase.from('profiles').update({
          name: m.root.querySelector('#et-name').value,
          phone: m.root.querySelector('#et-phone').value,
          grade: m.root.querySelector('#et-grade').value,
        }).eq('id', t.id);
        if (error) toast(error.message, 'error');
        else { toast('تم التعديل', 'success'); m.close(); location.reload(); }
      };
    };
  });

  // حذف المدرس
  el.querySelectorAll('[data-del-teacher]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('حذف المدرس نهائياً؟')) return;
      const { error } = await supabase.from('profiles').delete().eq('id', b.dataset.delTeacher);
      if (error) toast(error.message, 'error');
      else { toast('تم الحذف', 'success'); location.reload(); }
    };
  });

  el.querySelector('#add-teacher').onclick = () => { toast('يرجى الإضافة من لوحة تحكم سوبابيز', 'info'); };
  el.querySelector('#gen-codes').onclick = () => { /* ... */ };
}

function socialInput(key, label, val, show) {
  return `<div class="p-3 rounded-lg bg-black/20 border border-white/5 mb-2">
    <div class="flex justify-between items-center mb-2">
      <span class="font-bold text-sm">${label}</span>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" id="show-${key}" class="sr-only peer" ${show ? 'checked' : ''}>
        <div class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
      </label>
    </div>
    <input id="url-${key}" value="${escapeHtml(val || '')}" placeholder="https://..." class="input-field text-xs">
  </div>`;
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
