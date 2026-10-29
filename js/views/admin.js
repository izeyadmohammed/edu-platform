import { supabase, store } from '../config.js';
import { escapeHtml, uid, formatMoney } from '../utils.js';
import { toast, modal } from '../ui.js';

export default async function adminView(el) {
  if (store.profile?.role !== 'super_admin') { el.innerHTML = `<p class="text-center py-10 text-red-400">غير مصرح</p>`; return; }
  
  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
  const { data: stats } = await supabase.rpc('get_students_stats');
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

    <div class="grid grid-cols-1 gap-6 animate-fade-up">
      <div class="glass-card p-6 overflow-x-auto">
        <h3 class="font-bold text-lg mb-4">إدارة الطلاب</h3>
        <table class="w-full text-right text-sm">
          <thead class="bg-white/5 text-gray-400">
            <tr>
              <th class="p-3 rounded-r-lg">الطالب</th>
              <th class="p-3">الصف</th>
              <th class="p-3">المحفظة</th>
              <th class="p-3">الأجهزة</th>
              <th class="p-3 rounded-l-lg">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${(stats || []).map(s => {
              const studentData = students.find(x => x.id === s.student_id) || {};
              const isBlocked = studentData.isblocked;
              return `
              <tr class="border-b border-white/5 hover:bg-white/5 transition">
                <td class="p-3">
                  <p class="font-bold">${escapeHtml(s.student_name)} ${isBlocked ? '<span class="text-red-400 text-xs">(محظور)</span>' : ''}</p>
                  <p class="text-xs text-gray-500" dir="ltr">${escapeHtml(s.student_phone || '')}</p>
                </td>
                <td class="p-3 text-gray-400">${escapeHtml(s.student_grade || '-')}</td>
                <td class="p-3 font-bold text-green-400">${formatMoney(studentData.wallet || 0)}</td>
                <td class="p-3 font-bold text-purple-400">${studentData.max_devices || 1}</td>
                <td class="p-3">
                  <div class="flex gap-1 justify-end">
                    <button data-edit="${s.student_id}" class="w-8 h-8 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"><i class="fa-solid fa-pen text-xs"></i></button>
                    <button data-charge="${s.student_id}" class="w-8 h-8 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"><i class="fa-solid fa-plus text-xs"></i></button>
                    <button data-block="${s.student_id}" data-blk="${isBlocked}" class="w-8 h-8 rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"><i class="fa-solid ${isBlocked ? 'fa-unlock' : 'fa-ban'} text-xs"></i></button>
                    <button data-delu="${s.student_id}" class="w-8 h-8 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"><i class="fa-solid fa-trash text-xs"></i></button>
                  </div>
                </td>
              </tr>`;
            }).join('') || '<tr><td colspan="5" class="text-center p-4 text-gray-500">لا يوجد طلاب</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="glass-card p-6">
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

  // --- إعدادات المنصة الكاملة ---
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

          <h4 class="font-bold text-green-400 mt-6 mb-2">أرقام التواصل</h4>
          <div>
            <label class="block text-sm font-bold mb-1">رقم الواتساب للدعم</label>
            <input id="support-whatsapp" value="${escapeHtml(s.support_whatsapp || '')}" class="input-field" dir="ltr">
          </div>
          <div>
            <label class="block text-sm font-bold mb-1">رقم الواتساب للمطور</label>
            <input id="developer-whatsapp" value="${escapeHtml(s.developer_whatsapp || '')}" class="input-field" dir="ltr">
          </div>

          <h4 class="font-bold text-blue-400 mt-6 mb-2">روابط التواصل الاجتماعي</h4>
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
      const fileName = `logo_${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('images').upload(fileName, file);
      if (error) { toast('فشل الرفع', 'error'); return; }
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      newLogoUrl = data.publicUrl;
      m.root.querySelector('#logo-prev').innerHTML = `<img src="${newLogoUrl}" class="w-full h-full object-cover">`;
    };

    m.root.querySelector('#save-settings').onclick = async () => {
      const updates = {
        platform_name: m.root.querySelector('#platform-name').value,
        logo_url: newLogoUrl,
        support_whatsapp: m.root.querySelector('#support-whatsapp').value,
        developer_whatsapp: m.root.querySelector('#developer-whatsapp').value,
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
      toast('تم الحفظ', 'success'); m.close(); location.reload();
    };
  };

  // باقي أزرار الطلاب (تعديل، شحن، حظر، حذف) - شغالة زي ما هي
  el.querySelectorAll('[data-edit]').forEach(b => {
    b.onclick = () => {
      const s = profiles.find(x => x.id === b.dataset.edit);
      const m = modal({
        title: 'تعديل بيانات الطالب',
        body: `
          <div class="space-y-3">
            <input id="e-name" value="${escapeHtml(s.name)}" placeholder="الاسم" class="input-field">
            <input id="e-phone" value="${escapeHtml(s.phone || '')}" placeholder="رقم الهاتف" class="input-field" dir="ltr">
            <input id="e-parent" value="${escapeHtml(s.parent_phone || '')}" placeholder="رقم ولي الأمر" class="input-field" dir="ltr">
            <input id="e-grade" value="${escapeHtml(s.grade || '')}" placeholder="الصف" class="input-field">
            <input id="e-pass" type="password" placeholder="كلمة مرور جديدة (اتركها فاضية للتجاهل)" class="input-field">
            <input id="e-devices" type="number" value="${s.max_devices || 1}" placeholder="عدد الأجهزة" class="input-field">
          </div>`,
        actions: `<button id="save" class="btn-primary w-full">حفظ التعديلات</button>`
      });
      
      m.root.querySelector('#save').onclick = async () => {
        try {
          const updates = {
            name: m.root.querySelector('#e-name').value,
            phone: m.root.querySelector('#e-phone').value,
            parent_phone: m.root.querySelector('#e-parent').value,
            grade: m.root.querySelector('#e-grade').value,
            max_devices: +m.root.querySelector('#e-devices').value || 1
          };
          const newPass = m.root.querySelector('#e-pass').value;
          
          const { error } = await supabase.from('profiles').update(updates).eq('id', s.id);
          if (error) throw new Error(error.message);

          if (newPass.length >= 8) {
            const res = await fetch(`https://pephaughlgezamtzphkt.supabase.co/functions/v1/admin_update_user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: s.id, new_password: newPass })
            });
            const out = await res.json();
            if (!res.ok) throw new Error('فشل تغيير الباسورد: ' + (out.error || 'خطأ'));
          }
          
          toast('تم الحفظ بنجاح', 'success');
          m.close(); location.reload();
        } catch (err) { toast(err.message, 'error'); }
      };
    };
  });

  el.querySelectorAll('[data-charge]').forEach(b => {
    b.onclick = () => {
      const m = modal({
        title: 'تعديل رصيد المحفظة',
        body: `<input id="amt" type="number" placeholder="المبلغ (سالب للخصم)" class="input-field">`,
        actions: `<button id="cb" class="btn-accent w-full">تنفيذ</button>`
      });
      m.root.querySelector('#cb').onclick = async () => {
        const amt = +m.root.querySelector('#amt').value;
        if (!amt) return;
        const targetId = b.dataset.charge;
        const { data: prof } = await supabase.from('profiles').select('wallet').eq('id', targetId).single();
        await supabase.from('profiles').update({ wallet: (+prof.wallet || 0) + amt }).eq('id', targetId);
        await supabase.from('transactions').insert({ id: uid(), user_id: targetId, type: amt > 0 ? 'credit' : 'debit', amount: Math.abs(amt), note: 'تعديل يدوي من المالك' });
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
      if (!confirm('حذف الطالب نهائياً؟')) return;
      const { error } = await supabase.from('profiles').delete().eq('id', b.dataset.delu);
      if (error) toast(error.message, 'error'); else { toast('حذف', 'success'); location.reload(); }
    };
  });

  el.querySelector('#gen-codes').onclick = () => {
    const m = modal({
      title: 'توليد أكواد شحن',
      body: `<input id="gc-amt" type="number" placeholder="قيمة كل كود" class="input-field mb-2"><input id="gc-cnt" type="number" placeholder="العدد" value="5" class="input-field">`,
      actions: `<button id="gcb" class="btn-primary w-full">توليد</button>`
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
