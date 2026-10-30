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
  
  // جلب إجمالي المبيعات (اشتراكات) وإجمالي الشحن
  const { data: transactions } = await supabase.from('transactions').select('*');
  const totalRevenue = (transactions || []).filter(t => t.type === 'debit' && t.note.includes('اشتراك')).reduce((sum, t) => sum + Number(t.amount), 0);
  const totalCredits = (transactions || []).filter(t => t.type === 'credit').reduce((sum, t) => sum + Number(t.amount), 0);
  const students = (profiles || []).filter(p => p.role === 'student');
  const teachers = (profiles || []).filter(p => p.role === 'teacher' || p.role === 'assistant');
  const totalWallet = students.reduce((s, p) => s + (+p.wallet || 0), 0);

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">لوحة <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">المالك</span></h1>
      <button id="settings-btn" class="btn-primary text-sm"><i class="fa-solid fa-gear mr-2"></i> الإعدادات</button>
    </div>
    
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 animate-fade-up">
      ${statCard('fa-users', 'الطلاب', students.length, 'text-blue-500')}
      ${statCard('fa-user-tie', 'المدرسون', teachers.length, 'text-green-500')}
      ${statCard('fa-book', 'الكورسات', store.courses.length, 'text-purple-500')}
      ${statCard('fa-wallet', 'إجمالي المحافظ', formatMoney(totalWallet), 'text-orange-500')}
      ${statCard('fa-chart-line', 'إجمالي الأرباح', formatMoney(totalRevenue), 'text-emerald-500')}
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 animate-fade-up">
      <div class="glass-card p-6 flex items-center gap-4">
        <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <i class="fa-solid fa-money-bill-trend-up text-3xl text-emerald-500"></i>
        </div>
        <div>
          <p class="text-sm font-bold text-muted">إجمالي المبيعات (الاشتراكات)</p>
          <p class="text-3xl font-black text-emerald-500">${formatMoney(totalRevenue)}</p>
        </div>
      </div>
      <div class="glass-card p-6 flex items-center gap-4">
        <div class="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
          <i class="fa-solid fa-arrow-down text-3xl text-blue-500"></i>
        </div>
        <div>
          <p class="text-sm font-bold text-muted">إجمالي الشحن (الأكواد)</p>
          <p class="text-3xl font-black text-blue-500">${formatMoney(totalCredits)}</p>
        </div>
      </div>
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

  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openEditStudentModal(profiles.find(x => x.id === b.dataset.edit)));
  el.querySelectorAll('[data-charge]').forEach(b => b.onclick = () => openChargeModal(b.dataset.charge));
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
// 3. المدرسين (مع التعديل والصورة والمادة)
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
            <p class="text-xs text-muted">${escapeHtml(t.phone || '')} • ${t.role === 'assistant' ? 'مساعد' : (t.grade || 'مدرس')}</p>
          </div>
          <div class="flex gap-2">
             <button data-edit-teacher="${t.id}" class="w-8 h-8 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"><i class="fa-solid fa-pen"></i></button>
             <button data-del-teacher="${t.id}" class="w-8 h-8 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `).join('') || '<p class="text-muted col-span-2 text-center">لا يوجد مدرسين</p>'}
    </div>
  `;

  el.querySelector('#add-teacher').onclick = () => openAddTeacherModal();
  el.querySelectorAll('[data-edit-teacher]').forEach(b => b.onclick = () => openEditTeacherModal(profiles.find(x => x.id === b.dataset.editTeacher)));
  el.querySelectorAll('[data-del-teacher]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('حذف المدرس؟')) return;
      await supabase.from('profiles').delete().eq('id', b.dataset.delTeacher);
      toast('تم', 'success'); location.reload();
    };
  });
}

// ==========================================
// 4. الأكواد (مع الفلترة والنسخ)
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

    <div class="flex gap-2 mb-4 animate-fade-up">
       <button class="filter-btn active-filter px-4 py-2 rounded-lg text-sm font-bold bg-primary text-white" data-filter="all">الكل</button>
       <button class="filter-btn px-4 py-2 rounded-lg text-sm font-bold bg-black/5 dark:bg-white/5 text-muted hover:bg-black/10" data-filter="available">متاح</button>
       <button class="filter-btn px-4 py-2 rounded-lg text-sm font-bold bg-black/5 dark:bg-white/5 text-muted hover:bg-black/10" data-filter="used">مستخدم</button>
    </div>

    <div class="glass-card p-6 animate-fade-up" id="codes-container">
      <!-- سيتم ملؤها بالجافاسكريبت -->
    </div>
  `;

  function displayCodes(filter = 'all') {
    const container = el.querySelector('#codes-container');
    const filtered = (codes || []).filter(c => filter === 'all' ? true : (filter === 'used' ? c.used : !c.used));

    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        ${filtered.map(c => `
          <div class="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-border flex justify-between items-center">
            <div>
              <p class="font-mono text-sm text-main font-bold">${escapeHtml(c.code)}</p>
              <p class="text-xs ${c.used ? 'text-red-500' : 'text-green-500'}">${c.used ? 'مستخدم' : 'متاح'}</p>
            </div>
            <div class="text-left flex flex-col items-end gap-1">
              <p class="font-bold text-green-500">${formatMoney(c.amount)}</p>
              <div class="flex gap-2">
                <button data-copy="${c.code}" class="text-blue-500 text-xs hover:underline"><i class="fa-solid fa-copy"></i> نسخ</button>
                <button data-del-code="${c.id}" class="text-red-500 text-xs hover:underline"><i class="fa-solid fa-trash"></i> حذف</button>
              </div>
            </div>
          </div>
        `).join('') || '<p class="text-muted col-span-3 text-center">لا توجد أكواد في هذا التصنيف</p>'}
      </div>
    `;

    container.querySelectorAll('[data-copy]').forEach(b => {
      b.onclick = () => {
        navigator.clipboard.writeText(b.dataset.copy);
        toast('تم نسخ الكود', 'success');
      };
    });
    container.querySelectorAll('[data-del-code]').forEach(b => {
      b.onclick = async () => {
        if (!confirm('حذف الكود؟')) return;
        await supabase.from('codes').delete().eq('id', b.dataset.delCode);
        toast('تم', 'success'); location.reload();
      };
    });
  }

  el.querySelectorAll('.filter-btn').forEach(b => {
    b.onclick = () => {
      el.querySelectorAll('.filter-btn').forEach(x => {
        x.className = 'filter-btn px-4 py-2 rounded-lg text-sm font-bold bg-black/5 dark:bg-white/5 text-muted hover:bg-black/10';
      });
      b.className = 'filter-btn active-filter px-4 py-2 rounded-lg text-sm font-bold bg-primary text-white';
      displayCodes(b.dataset.filter);
    };
  });

  displayCodes('all');
  el.querySelector('#gen-codes').onclick = () => openGenCodesModal();
}

// ==========================================
// المودالات
// ==========================================
async function openSettingsModal() {
  const { data: s } = await supabase.from('settings').select('*').eq('id', 1).single();
  const m = modal({
    title: 'إعدادات المنصة',
    body: `
      <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        <h4 class="font-bold text-blue-500 mb-2">الهوية البصرية</h4>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">اسم المنصة</label>
          <input id="platform-name" value="${escapeHtml(s?.platform_name || '')}" class="input-field">
        </div>
        
        <h4 class="font-bold text-purple-500 mt-6 mb-2">الصفحة الرئيسية</h4>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">العنوان الرئيسي (Hero Title)</label>
          <input id="hero-title" value="${escapeHtml(s?.hero_title || '')}" class="input-field">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">الوصف (Hero Subtitle)</label>
          <textarea id="hero-subtitle" class="input-field">${escapeHtml(s?.hero_subtitle || '')}</textarea>
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">نص زرار 1</label>
          <input id="hero-btn1" value="${escapeHtml(s?.hero_btn1 || '')}" class="input-field">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">نص زرار 2</label>
          <input id="hero-btn2" value="${escapeHtml(s?.hero_btn2 || '')}" class="input-field">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">لوجو المنصة</label>
          <div class="flex items-center gap-3">
            <div id="logo-prev" class="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-border">
              ${s?.logo_url ? `<img src="${s.logo_url}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-cube text-muted"></i>`}
            </div>
            <input type="file" id="logo-upload" accept="image/*" class="text-sm w-full file:bg-blue-500/10 file:text-blue-500 file:border-0 file:rounded-lg file:px-3 file:py-1">
          </div>
        </div>

        <h4 class="font-bold text-green-500 mt-6 mb-2">بيانات التواصل</h4>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">البريد الإلكتروني</label>
          <input id="contact-email" value="${escapeHtml(s?.contact_email || '')}" class="input-field" dir="ltr" placeholder="email@example.com">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">رقم الهاتف</label>
          <input id="contact-phone" value="${escapeHtml(s?.contact_phone || '')}" class="input-field" dir="ltr" placeholder="01xxxxxxxxx">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">رقم الواتساب للدعم</label>
          <input id="support-whatsapp" value="${escapeHtml(s?.support_whatsapp || '')}" class="input-field" dir="ltr">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">رقم الواتساب للمطور</label>
          <input id="developer-whatsapp" value="${escapeHtml(s?.developer_whatsapp || '')}" class="input-field" dir="ltr">
        </div>

        <h4 class="font-bold text-blue-500 mt-6 mb-2">روابط التواصل الاجتماعي</h4>
        ${socialInput('facebook', 'فيسبوك', s?.facebook_url, s?.show_facebook)}
        ${socialInput('whatsapp', 'واتساب', s?.whatsapp_url, s?.show_whatsapp)}
        ${socialInput('telegram', 'تيلجرام', s?.telegram_url, s?.show_telegram)}
        ${socialInput('instagram', 'إنستجرام', s?.instagram_url, s?.show_instagram)}
        ${socialInput('tiktok', 'تيك توك', s?.tiktok_url, s?.show_tiktok)}
      </div>`,
    actions: `<button id="save-settings" class="btn-primary w-full">حفظ جميع الإعدادات</button>`
  });

  let newLogoUrl = s?.logo_url || '';
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
    const { data: updated, error } = await supabase.from('settings').upsert({ id: 1, ...updates }).select();
    if (error) { toast(error.message, 'error'); return; }
    
    // مسح البيانات القديمة من الذاكرة وإجبار السيرفر على إرسال الجديد
    store.settings = null; 
    const { getSettings, renderHeader, renderFooter } = await import('../ui.js');
    await getSettings(true);
    await renderHeader();
    await renderFooter();
    
    toast('تم الحفظ بنجاح', 'success'); m.close();
    setTimeout(() => window.location.reload(), 500);
  };
}

function openAddTeacherModal() {
  const grades = ['الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي', 'عام'];
  const m = modal({
    title: 'إضافة مدرس جديد',
    body: `
      <div class="space-y-3">
        <input id="t-name" placeholder="اسم المدرس" class="input-field">
        <input id="t-phone" placeholder="رقم الهاتف" class="input-field" dir="ltr">
        <input id="t-pass" type="password" placeholder="كلمة المرور (افتراضي 12345678)" class="input-field" dir="ltr">
        <select id="t-grade" class="input-field">
          <option value="">اختر المادة / الصف</option>
          ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
      </div>`,
    actions: `<button id="save-teacher" class="btn-primary w-full">إضافة المدرس</button>`
  });
  m.root.querySelector('#save-teacher').onclick = async () => {
    const name = m.root.querySelector('#t-name').value;
    const phone = m.root.querySelector('#t-phone').value;
    const pass = m.root.querySelector('#t-pass').value;
    const grade = m.root.querySelector('#t-grade').value;
    if (!name || !phone) { toast('الاسم والرقم مطلوبين', 'warn'); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`https://pephaughlgezamtzphkt.supabase.co/functions/v1/create_teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ name, phone, password: pass, grade })
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'فشل الاتصال');
      toast('تم إنشاء المدرس. الباسورد: ' + out.default_password, 'success');
      m.close(); location.reload();
    } catch (e) { toast(e.message, 'error'); }
  };
}

function openEditTeacherModal(t) {
  const grades = ['الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي', 'عام'];
  const m = modal({
    title: 'تعديل بيانات المدرس',
    body: `
      <div class="space-y-3">
        <input id="et-name" value="${escapeHtml(t.name)}" placeholder="الاسم" class="input-field">
        <input id="et-phone" value="${escapeHtml(t.phone || '')}" placeholder="رقم الهاتف" class="input-field" dir="ltr">
        <select id="et-grade" class="input-field">
          <option value="">اختر المادة / الصف</option>
          ${grades.map(g => `<option value="${g}" ${t.grade === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">صورة المدرس</label>
          <div class="flex items-center gap-3">
            <div id="teach-img-prev" class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-border">
              ${t.image ? `<img src="${t.image}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-muted"></i>`}
            </div>
            <input type="file" id="teach-img" accept="image/*" class="text-sm w-full file:bg-blue-500/10 file:text-blue-500 file:border-0 file:rounded-lg file:px-3 file:py-1">
          </div>
        </div>
      </div>`,
    actions: `<button id="save" class="btn-primary w-full">حفظ التعديلات</button>`
  });

  let newImgUrl = t.image || '';
  m.root.querySelector('#teach-img').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast('جاري رفع الصورة...', 'info');
    const fileName = `teacher_${t.id}_${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('images').upload(fileName, file);
    if (error) { toast('فشل الرفع', 'error'); return; }
    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    newImgUrl = data.publicUrl;
    m.root.querySelector('#teach-img-prev').innerHTML = `<img src="${newImgUrl}" class="w-full h-full object-cover">`;
    toast('تم', 'success');
  };

  m.root.querySelector('#save').onclick = async () => {
    try {
      const updates = {
        name: m.root.querySelector('#et-name').value,
        phone: m.root.querySelector('#et-phone').value,
        grade: m.root.querySelector('#et-grade').value,
        image: newImgUrl
      };
      const { error } = await supabase.from('profiles').update(updates).eq('id', t.id);
      if (error) throw new Error(error.message);
      toast('تم الحفظ بنجاح', 'success');
      m.close(); location.reload();
    } catch (err) { toast(err.message, 'error'); }
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

function socialInput(key, label, val, show) {
  return `<div class="p-3 rounded-lg bg-black/5 dark:bg-black/20 border border-border mb-2">
    <div class="flex justify-between items-center mb-2">
      <span class="font-bold text-sm text-main">${label}</span>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" id="show-${key}" class="sr-only peer" ${show ? 'checked' : ''}>
        <div class="w-9 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
      </label>
    </div>
    <input id="url-${key}" value="${escapeHtml(val || '')}" placeholder="https://..." class="input-field text-xs" dir="ltr">
  </div>`;
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
