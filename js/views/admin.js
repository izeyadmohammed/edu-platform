import { supabase, store } from '../config.js';
import { escapeHtml, uid, formatMoney } from '../utils.js';
import { toast, modal } from '../ui.js';

export default async function adminView(el) {
  if (store.profile?.role !== 'super_admin') { el.innerHTML = `<p class="text-center py-10 text-red-500">غير مصرح</p>`; return; }
  
  const hash = location.hash;
  if (hash === '#/admin/students') return renderStudents(el);
  if (hash === '#/admin/teachers') return renderTeachers(el);
  if (hash === '#/admin/codes') return renderCodes(el);
  return renderDashboard(el);
}

// ==========================================
// 1. لوحة التحكم الرئيسية
// ==========================================
async function renderDashboard(el) {
  const { data: profiles } = await supabase.from('profiles').select('*');
  const students = (profiles || []).filter(p => p.role === 'student');
  const teachers = (profiles || []).filter(p => p.role === 'teacher' || p.role === 'assistant');
  const totalWallet = students.reduce((s, p) => s + (+p.wallet || 0), 0);

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">لوحة <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">المالك</span></h1>
      <button id="settings-btn" class="btn-primary text-sm"><i class="fa-solid fa-gear mr-2"></i> الإعدادات</button>
    </div>
    
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-up">
      ${statCard('fa-users', 'الطلاب', students.length, 'text-blue-500')}
      ${statCard('fa-user-tie', 'المدرسون', teachers.length, 'text-green-500')}
      ${statCard('fa-book', 'الكورسات', store.courses.length, 'text-purple-500')}
      ${statCard('fa-wallet', 'إجمالي المحافظ', formatMoney(totalWallet), 'text-orange-500')}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-up">
      <a href="#/admin/students" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
        <i class="fa-solid fa-users text-4xl text-blue-500 mb-3"></i>
        <h3 class="font-bold text-lg text-main">إدارة الطلاب</h3>
        <p class="text-sm text-muted">تعديل الرصيد، الحظر، البيانات</p>
      </a>
      <a href="#/admin/teachers" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
        <i class="fa-solid fa-chalkboard-user text-4xl text-green-500 mb-3"></i>
        <h3 class="font-bold text-lg text-main">إدارة المدرسين</h3>
        <p class="text-sm text-muted">إضافة مدرسين ومساعدين</p>
      </a>
      <a href="#/admin/codes" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
        <i class="fa-solid fa-ticket text-4xl text-purple-500 mb-3"></i>
        <h3 class="font-bold text-lg text-main">أكواد الشحن</h3>
        <p class="text-sm text-muted">توليد، عرض، حذف الأكواد</p>
      </a>
    </div>
  `;

  el.querySelector('#settings-btn').onclick = () => openSettingsModal();
}

// ==========================================
// 2. الطلاب
// ==========================================
async function renderStudents(el) {
  const { data: stats } = await supabase.rpc('get_students_stats');
  const { data: profiles } = await supabase.from('profiles').select('*');
  const students = (profiles || []).filter(p => p.role === 'student');

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">إدارة <span class="text-blue-500">الطلاب</span></h1>
      <a href="#/admin" class="text-sm font-bold text-muted hover:text-primary"><i class="fa-solid fa-arrow-right"></i> رجوع</a>
    </div>
    <div class="glass-card p-6 overflow-x-auto animate-fade-up">
      <table class="w-full text-right text-sm">
        <thead class="bg-black/5 dark:bg-white/5 text-muted">
          <tr>
            <th class="p-3 rounded-r-lg">الطالب</th>
            <th class="p-3">الصف</th>
            <th class="p-3">المحفظة</th>
            <th class="p-3 rounded-l-lg">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${(stats || []).map(s => {
            const studentData = students.find(x => x.id === s.student_id) || {};
            const isBlocked = studentData.isblocked;
            return `
            <tr class="border-b border-border hover:bg-black/5 dark:hover:bg-white/5 transition">
              <td class="p-3">
                <p class="font-bold text-main">${escapeHtml(s.student_name)} ${isBlocked ? '<span class="text-red-500 text-xs">(محظور)</span>' : ''}</p>
                <p class="text-xs text-muted" dir="ltr">${escapeHtml(s.student_phone || '')}</p>
              </td>
              <td class="p-3 text-muted">${escapeHtml(s.student_grade || '-')}</td>
              <td class="p-3 font-bold text-green-500">${formatMoney(studentData.wallet || 0)}</td>
              <td class="p-3">
                <div class="flex gap-1 justify-end">
                  <button data-edit="${s.student_id}" class="w-8 h-8 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"><i class="fa-solid fa-pen text-xs"></i></button>
                  <button data-charge="${s.student_id}" class="w-8 h-8 rounded bg-green-500/10 text-green-500 hover:bg-green-500/20"><i class="fa-solid fa-plus text-xs"></i></button>
                  <button data-block="${s.student_id}" data-blk="${isBlocked}" class="w-8 h-8 rounded bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"><i class="fa-solid ${isBlocked ? 'fa-unlock' : 'fa-ban'} text-xs"></i></button>
                  <button data-delu="${s.student_id}" class="w-8 h-8 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"><i class="fa-solid fa-trash text-xs"></i></button>
                </div>
              </td>
            </tr>`;
          }).join('') || '<tr><td colspan="4" class="text-center p-4 text-muted">لا يوجد طلاب</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  el.querySelectorAll('[data-edit]').forEach(b => {
    b.onclick = () => openEditStudentModal(profiles.find(x => x.id === b.dataset.edit));
  });
  el.querySelectorAll('[data-charge]').forEach(b => {
    b.onclick = () => openChargeModal(b.dataset.charge);
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
      await supabase.from('profiles').delete().eq('id', b.dataset.delu);
      toast('تم', 'success'); location.reload();
    };
  });
}

// ==========================================
// 3. المدرسين
// ==========================================
async function renderTeachers(el) {
  const { data: profiles } = await supabase.from('profiles').select('*');
  const teachers = (profiles || []).filter(p => p.role === 'teacher' || p.role === 'assistant');

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">إدارة <span class="text-green-500">المدرسين</span></h1>
      <div class="flex gap-2">
        <button id="add-teacher" class="btn-primary text-sm px-4 py-2"><i class="fa-solid fa-plus mr-1"></i> إضافة مدرس</button>
        <a href="#/admin" class="text-sm font-bold text-muted hover:text-primary mt-2"><i class="fa-solid fa-arrow-right"></i> رجوع</a>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
      ${teachers.map(t => `
        <div class="glass-card p-4 flex items-center gap-4">
          <div class="w-14 h-14 rounded-full overflow-hidden bg-blue-500/20 flex items-center justify-center shrink-0">
             ${t.image ? `<img src="${t.image}" class="w-full h-full object-cover">` : `<span class="text-blue-500 font-bold text-xl">${(t.name||'?').charAt(0)}</span>`}
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-main">${escapeHtml(t.name)}</h3>
            <p class="text-xs text-muted">${escapeHtml(t.phone || '')} • ${t.role === 'assistant' ? 'مساعد' : 'مدرس'}</p>
          </div>
          <button data-del-teacher="${t.id}" class="w-8 h-8 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"><i class="fa-solid fa-trash"></i></button>
        </div>
      `).join('') || '<p class="text-muted col-span-2 text-center">لا يوجد مدرسين</p>'}
    </div>
  `;

  el.querySelector('#add-teacher').onclick = () => openAddTeacherModal();
  el.querySelectorAll('[data-del-teacher]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('حذف المدرس؟')) return;
      await supabase.from('profiles').delete().eq('id', b.dataset.delTeacher);
      toast('تم', 'success'); location.reload();
    };
  });
}

// ==========================================
// 4. الأكواد
// ==========================================
async function renderCodes(el) {
  const { data: codes } = await supabase.from('codes').select('*').order('created_at', { ascending: false });

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">أكواد <span class="text-purple-500">الشحن</span></h1>
      <div class="flex gap-2">
        <button id="gen-codes" class="btn-primary text-sm px-4 py-2"><i class="fa-solid fa-plus mr-1"></i> توليد أكواد</button>
        <a href="#/admin" class="text-sm font-bold text-muted hover:text-primary mt-2"><i class="fa-solid fa-arrow-right"></i> رجوع</a>
      </div>
    </div>
    <div class="glass-card p-6 animate-fade-up">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        ${(codes || []).map(c => `
          <div class="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-border flex justify-between items-center">
            <div>
              <p class="font-mono text-sm text-main font-bold">${escapeHtml(c.code)}</p>
              <p class="text-xs text-muted">${c.used ? 'مستخدم' : 'متاح'}</p>
            </div>
            <div class="text-left">
              <p class="font-bold text-green-500">${formatMoney(c.amount)}</p>
              <button data-del-code="${c.id}" class="text-red-500 text-xs mt-1 hover:underline">حذف</button>
            </div>
          </div>
        `).join('') || '<p class="text-muted col-span-3 text-center">لا توجد أكواد</p>'}
      </div>
    </div>
  `;

  el.querySelector('#gen-codes').onclick = () => openGenCodesModal();
  el.querySelectorAll('[data-del-code]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('حذف الكود؟')) return;
      await supabase.from('codes').delete().eq('id', b.dataset.delCode);
      toast('تم', 'success'); location.reload();
    };
  });
}

// ==========================================
// المودالات
// ==========================================
function openSettingsModal() {
  toast('الإعدادات متاحة قريباً', 'info');
}

function openAddTeacherModal() {
  const m = modal({
    title: 'إضافة مدرس جديد',
    body: `
      <div class="space-y-3">
        <input id="t-name" placeholder="اسم المدرس" class="input-field">
        <input id="t-phone" placeholder="رقم الهاتف" class="input-field" dir="ltr">
        <input id="t-pass" type="password" placeholder="كلمة المرور (افتراضي 12345678)" class="input-field" dir="ltr">
      </div>`,
    actions: `<button id="save-teacher" class="btn-primary w-full">إضافة المدرس</button>`
  });
  m.root.querySelector('#save-teacher').onclick = async () => {
    const name = m.root.querySelector('#t-name').value;
    const phone = m.root.querySelector('#t-phone').value;
    const pass = m.root.querySelector('#t-pass').value;
    if (!name || !phone) { toast('الاسم والرقم مطلوبين', 'warn'); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`https://pephaughlgezamtzphkt.supabase.co/functions/v1/create_teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ name, phone, password: pass })
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'فشل الاتصال');
      toast('تم إنشاء المدرس. الباسورد: ' + out.default_password, 'success');
      m.close(); location.reload();
    } catch (e) { toast(e.message, 'error'); }
  };
}

function openGenCodesModal() {
  const m = modal({
    title: 'توليد أكواد شحن',
    body: `
      <input id="gc-amt" type="number" placeholder="قيمة كل كود" class="input-field mb-2">
      <input id="gc-cnt" type="number" placeholder="العدد" value="5" class="input-field">`,
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
}

function openEditStudentModal(s) {
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
}

function openChargeModal(targetId) {
  const m = modal({
    title: 'تعديل رصيد المحفظة',
    body: `<input id="amt" type="number" placeholder="المبلغ (سالب للخصم)" class="input-field">`,
    actions: `<button id="cb" class="btn-accent w-full">تنفيذ</button>`
  });
  m.root.querySelector('#cb').onclick = async () => {
    const amt = +m.root.querySelector('#amt').value;
    if (!amt) return;
    const { data: prof } = await supabase.from('profiles').select('wallet').eq('id', targetId).single();
    await supabase.from('profiles').update({ wallet: (+prof.wallet || 0) + amt }).eq('id', targetId);
    await supabase.from('transactions').insert({ id: uid(), user_id: targetId, type: amt > 0 ? 'credit' : 'debit', amount: Math.abs(amt), note: 'تعديل يدوي من المالك' });
    toast('تم', 'success'); m.close(); location.reload();
  };
}

function statCard(icon, label, val, colorClass) {
  return `<div class="glass-card p-5 flex items-center gap-4">
    <div class="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
      <i class="fa-solid ${icon} text-2xl ${colorClass}"></i>
    </div>
    <div>
      <p class="text-2xl font-black text-main">${val}</p>
      <p class="text-xs font-bold text-muted">${label}</p>
    </div>
  </div>`;
}
