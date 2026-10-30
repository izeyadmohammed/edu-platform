import { supabase, store } from '../config.js';
import { escapeHtml, uid, formatMoney } from '../utils.js';
import { toast, modal } from '../ui.js';

export default async function adminView(el) {
  if (store.profile?.role !== 'super_admin') { el.innerHTML = `<p class="text-center py-10 text-red-500">غير مصرح</p>`; return; }
  
  // قراءة الصفحة المطلوبة من الرابط
  const hash = location.hash;
  if (hash === '#/admin/students') return renderStudents(el);
  if (hash === '#/admin/teachers') return renderTeachers(el);
  if (hash === '#/admin/codes') return renderCodes(el);
  return renderDashboard(el);
}

// ==========================================
// 1. الصفحة الرئيسية (الإحصائيات)
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
      ${statCard('fa-users', 'الطلاب', students.length, 'text-blue-400')}
      ${statCard('fa-user-tie', 'المدرسون', teachers.length, 'text-green-400')}
      ${statCard('fa-book', 'الكورسات', store.courses.length, 'text-purple-400')}
      ${statCard('fa-wallet', 'إجمالي المحافظ', formatMoney(totalWallet), 'text-orange-400')}
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
// 2. صفحة الطلاب
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

  // أحداث الطلاب (نفس الكود القديم)
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
// 3. صفحة المدرسين
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
            <h3 class="font-bold text-main">${escapeHtml(t.name)}</p>
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
// 4. صفحة الأكواد
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
// المودالات (دوال مساعدة)
// ==========================================
function openSettingsModal() { toast('قريباً: إعدادات المنصة', 'info'); }
function openAddTeacherModal() { toast('قريباً: إضافة مدرس', 'info'); }
function openGenCodesModal() { toast('قريباً: توليد أكواد', 'info'); }
function openEditStudentModal(s) { toast('تعديل الطالب: ' + s.name, 'info'); }
function openChargeModal(id) { toast('شحن الطالب', 'info'); }

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
