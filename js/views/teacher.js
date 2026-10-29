import { supabase, store, refreshCourses, refreshLectures } from '../config.js';
import { escapeHtml, uid, formatMoney } from '../utils.js';
import { toast, modal } from '../ui.js';
import { openLectureEditor } from './lesson.js';

export default async function teacherView(el) {
  const p = store.profile;
  if (!p || (p.role !== 'teacher' && p.role !== 'assistant' && p.role !== 'super_admin')) {
    el.innerHTML = `<p class="text-center py-10 text-red-500">غير مصرح</p>`; return;
  }
  
  let myCourses = [];
  if (p.role === 'assistant') {
    myCourses = store.courses.filter(c => c.teacher_id === p.teacher_id);
  } else {
    myCourses = store.courses.filter(c => c.teacher_id === p.id || p.role === 'super_admin');
  }

  let myStudentsStats = [];
  if (myCourses.length > 0 && p.role !== 'assistant') {
    const courseIds = myCourses.map(c => c.id);
    const { data: students } = await supabase.from('profiles')
      .select('id, name, phone, enrolled_courses')
      .eq('role', 'student')
      .overlaps('enrolled_courses', courseIds);
    
    if (students) {
      for (const s of students) {
        const { count: vids } = await supabase.from('student_progress').select('*', { count: 'exact', head: true }).eq('student_id', s.id).eq('video_watched', true);
        const { count: exms } = await supabase.from('exam_submissions').select('*', { count: 'exact', head: true }).eq('student_id', s.id).eq('type', 'mcq');
        myStudentsStats.push({ ...s, videos: vids || 0, exams: exms || 0 });
      }
    }
  }

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <div class="flex items-center gap-4">
        <div class="relative w-14 h-14">
          <div class="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/30">
            ${p.image ? `<img src="${p.image}" class="w-full h-full object-cover">` : `<div class="w-full h-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xl font-black">${(p.name||'?').charAt(0)}</div>`}
          </div>
          <button id="upload-teacher-profile" class="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] border-2 border-white dark:border-gray-900"><i class="fa-solid fa-camera"></i></button>
        </div>
        <h1 class="text-3xl font-black text-main">لوحة <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">${p.role === 'assistant' ? 'المساعد' : 'المدرس'}</span></h1>
      </div>
      <div class="flex gap-2">
        ${(p.role === 'teacher' || p.role === 'super_admin') ? `<button id="add-assistant" class="px-4 py-2 bg-purple-500/10 text-purple-500 rounded-lg text-sm font-bold border border-purple-500/20"><i class="fa-solid fa-user-plus mr-1"></i> إضافة مساعد</button>` : ''}
        <button id="add-course" class="btn-primary text-sm px-4 py-2"><i class="fa-solid fa-plus mr-2"></i> إضافة كورس</button>
      </div>
    </div>
    
    <div class="grid grid-cols-1 gap-6 animate-fade-up">
      <div class="space-y-4">
        ${myCourses.map(c => {
          const courseLectures = store.lectures.filter(l => l.course_id === c.id);
          return `
            <div class="glass-card overflow-hidden">
              <div class="flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.arrow').classList.toggle('rotate-180')">
                <div class="flex items-center gap-4">
                  ${c.image ? `<img src="${c.image}" class="w-16 h-16 rounded-lg object-cover">` : `<div class="w-16 h-16 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-2xl"><i class="fa-solid fa-book"></i></div>`}
                  <div>
                    <h3 class="font-bold text-lg text-main">${escapeHtml(c.title)}</h3>
                    <p class="text-sm text-muted">${escapeHtml(c.grade)} • ${formatMoney(c.price)} • ${courseLectures.length} محاضرة</p>
                  </div>
                </div>
                <i class="fa-solid fa-chevron-down arrow text-muted transition-transform duration-300"></i>
              </div>
              <div class="hidden border-t border-border bg-black/5 dark:bg-black/20 p-4">
                <div class="flex justify-between items-center mb-3">
                  <h4 class="font-bold text-sm text-muted">المحاضرات:</h4>
                  <button data-add-lect="${c.id}" class="px-3 py-1 bg-green-500/10 text-green-500 rounded-lg text-xs font-bold border border-green-500/20"><i class="fa-solid fa-plus"></i> إضافة محاضرة</button>
                </div>
                <div class="space-y-2">
                  ${courseLectures.map(l => `
                    <div class="flex justify-between items-center p-3 rounded-lg bg-white dark:bg-white/5 border border-border">
                      <div>
                        <p class="font-bold text-sm text-main">${escapeHtml(l.title)}</p>
                        <p class="text-xs text-muted">${(l.videos||[]).length} فيديو • ${(l.pdfs||[]).length} مذكرة</p>
                      </div>
                      <div class="flex gap-2">
                        <button data-edit-lect="${l.id}" class="px-3 py-1 bg-yellow-500/10 text-yellow-600 rounded text-xs font-bold border border-yellow-500/20">تعديل</button>
                        <button data-del-lect="${l.id}" class="px-3 py-1 bg-red-500/10 text-red-500 rounded text-xs font-bold border border-red-500/20">حذف</button>
                      </div>
                    </div>
                  `).join('') || '<p class="text-muted text-sm text-center py-2">لا توجد محاضرات</p>'}
                </div>
              </div>
            </div>
          `;
        }).join('') || '<div class="glass-card p-8 text-center text-muted">لا توجد كورسات.</div>'}
      </div>

      ${p.role !== 'assistant' ? `
        <div class="glass-card p-6">
          <h3 class="font-bold text-lg mb-4 text-main">إحصائيات الطلاب (${myStudentsStats.length})</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            ${myStudentsStats.map(s => `
              <div class="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-border">
                <p class="font-bold text-sm text-main">${escapeHtml(s.name)}</p>
                <div class="flex gap-3 text-xs mt-1">
                  <span class="text-blue-500 font-bold"><i class="fa-solid fa-video"></i> ${s.videos}</span>
                  <span class="text-purple-500 font-bold"><i class="fa-solid fa-list-check"></i> ${s.exams}</span>
                </div>
              </div>
            `).join('') || '<p class="text-muted text-sm col-span-3 text-center">لا يوجد طلاب</p>'}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // رفع صورة المدرس
  el.querySelector('#upload-teacher-profile').onclick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      toast('جاري رفع الصورة...', 'info');
      const fileName = `profile_${p.id}_${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('images').upload(fileName, file);
      if (error) { toast('فشل الرفع', 'error'); return; }
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      await supabase.from('profiles').update({ image: data.publicUrl }).eq('id', p.id);
      toast('تم تحديث الصورة', 'success'); location.reload();
    };
    fileInput.click();
  };

  const aBtn = el.querySelector('#add-assistant');
  if (aBtn) {
    aBtn.onclick = () => {
      const m = modal({
        title: 'إضافة مساعد جديد',
        body: `
          <div class="space-y-3">
            <input id="a-name" placeholder="اسم المساعد" class="input-field">
            <input id="a-phone" placeholder="رقم الهاتف" class="input-field" dir="ltr">
            <input id="a-pass" type="password" placeholder="كلمة المرور (افتراضي 12345678)" class="input-field" dir="ltr">
          </div>`,
        actions: `<button id="save-assistant" class="btn-primary w-full">إضافة المساعد</button>`
      });
      m.root.querySelector('#save-assistant').onclick = async () => {
        const name = m.root.querySelector('#a-name').value;
        const phone = m.root.querySelector('#a-phone').value;
        const pass = m.root.querySelector('#a-pass').value;
        if (!name || !phone) { toast('الاسم والرقم مطلوبين', 'warn'); return; }
        try {
          const res = await fetch(`https://pephaughlgezamtzphkt.supabase.co/functions/v1/create_assistant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, password: pass, teacher_id: p.id })
          });
          const out = await res.json();
          if (!res.ok) throw new Error(out.error || 'فشل الاتصال');
          toast('تم إنشاء المساعد. الباسورد: ' + out.default_password, 'success');
          m.close();
        } catch (e) { toast(e.message, 'error'); }
      };
    };
  }

  el.querySelector('#add-course').onclick = () => {
    const grades = ['الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'];
    const m = modal({
      title: 'إضافة كورس جديد', 
      body: `
        <div class="space-y-3">
          <input id="t" placeholder="عنوان الكورس" class="input-field">
          <select id="g" class="input-field">
            <option value="">اختر الصف</option>
            ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
          </select>
          <input id="pr" type="number" placeholder="السعر (ج.م)" class="input-field">
          <textarea id="d" placeholder="وصف الكورس" class="input-field"></textarea>
          <div>
            <label class="block text-sm font-bold mb-2 text-main">صورة الكورس</label>
            <div class="flex items-center gap-3">
              <div id="course-img-prev" class="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-border">
                <i class="fa-solid fa-image text-muted"></i>
              </div>
              <input type="file" id="course-img" accept="image/*" class="text-sm w-full file:bg-blue-500/10 file:text-blue-500 file:border-0 file:rounded-lg file:px-3 file:py-1">
            </div>
          </div>
        </div>`,
      actions: `<button id="sb" class="btn-primary w-full">إضافة الكورس</button>`
    });

    let imgUrl = '';
    m.root.querySelector('#course-img').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      toast('جاري رفع الصورة...', 'info');
      const fileName = `course_${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('images').upload(fileName, file);
      if (error) { toast('فشل رفع الصورة', 'error'); return; }
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      imgUrl = data.publicUrl;
      m.root.querySelector('#course-img-prev').innerHTML = `<img src="${imgUrl}" class="w-full h-full object-cover">`;
      toast('تم رفع الصورة', 'success');
    };

    m.root.querySelector('#sb').onclick = async () => {
      try {
        const { error } = await supabase.from('courses').insert({
          id: 'course_'+Date.now(), 
          teacher_id: p.role === 'assistant' ? p.teacher_id : p.id,
          title: m.root.querySelector('#t').value,
          grade: m.root.querySelector('#g').value,
          price: +m.root.querySelector('#pr').value || 0,
          description: m.root.querySelector('#d').value,
          image: imgUrl
        });
        if (error) throw new Error(error.message);
        toast('تمت إضافة الكورس', 'success'); m.close(); await refreshCourses(); location.reload();
      } catch (e) { toast(e.message, 'error'); }
    };
  };

  el.querySelectorAll('[data-add-lect]').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const m = modal({
        title: 'إضافة محاضرة',
        body: `<input id="lt" placeholder="عنوان المحاضرة" class="input-field">`,
        actions: `<button id="lsb" class="btn-accent w-full">إضافة</button>`
      });
      m.root.querySelector('#lsb').onclick = async () => {
        try {
          const { error } = await supabase.from('lectures').insert({
            id: 'lect_'+Date.now(), course_id: b.dataset.addLect,
            teacher_id: p.role === 'assistant' ? p.teacher_id : p.id,
            title: m.root.querySelector('#lt').value, 
            videos: [], pdfs: [], mcq_exams: [], essay_exams: []
          });
          if (error) throw new Error(error.message);
          toast('تمت', 'success'); m.close(); await refreshLectures(); location.reload();
        } catch (e) { toast(e.message, 'error'); }
      };
    };
  });

  el.querySelectorAll('[data-del-lect]').forEach(b => {
    b.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('حذف المحاضرة؟')) return;
      await supabase.from('lectures').delete().eq('id', b.dataset.delLect);
      toast('تم', 'success'); await refreshLectures(); location.reload();
    };
  });

  el.querySelectorAll('[data-edit-lect]').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const lect = store.lectures.find(x => x.id === b.dataset.editLect);
      if (lect) openLectureEditor(lect);
    };
  });
}
