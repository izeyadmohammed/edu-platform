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

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">لوحة <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">${p.role === 'assistant' ? 'المساعد' : 'المدرس'}</span></h1>
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
                <div class="flex justify-between items-center mb-3 flex-wrap gap-2">
                  <h4 class="font-bold text-sm text-muted">المحاضرات:</h4>
                  <div class="flex gap-2 flex-wrap">
                    <button data-add-lect="${c.id}" class="px-3 py-1 bg-green-500/10 text-green-500 rounded-lg text-xs font-bold border border-green-500/20"><i class="fa-solid fa-plus"></i> محاضرة</button>
                    <button data-edit-course="${c.id}" class="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-bold border border-blue-500/20"><i class="fa-solid fa-pen"></i> تعديل</button>
                    <button data-del-course="${c.id}" class="px-3 py-1 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold border border-red-500/20"><i class="fa-solid fa-trash"></i> حذف</button>
                  </div>
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
    </div>
  `;

  // إضافة كورس
  el.querySelector('#add-course').onclick = () => {
    const grades = ['الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'];
    const m = modal({
      title: 'إضافة كورس جديد', 
      body: `
        <div class="space-y-3">
          <input id="t" placeholder="عنوان الكورس" class="input-field">
          <select id="g" class="input-field">
            <option value="">اختر الصف</option>
            <option value="كل المراحل">كل المراحل</option>
            ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
          </select>
          <input id="pr" type="number" placeholder="السعر (ج.م)" class="input-field">
          <textarea id="d" placeholder="وصف الكورس" class="input-field"></textarea>
        </div>`,
      actions: `<button id="sb" class="btn-primary w-full">إضافة الكورس</button>`
    });

    m.root.querySelector('#sb').onclick = async () => {
      try {
        const { error } = await supabase.from('courses').insert({
          id: 'course_'+Date.now(), 
          teacher_id: p.role === 'assistant' ? p.teacher_id : p.id,
          title: m.root.querySelector('#t').value,
          grade: m.root.querySelector('#g').value,
          price: +m.root.querySelector('#pr').value || 0,
          description: m.root.querySelector('#d').value,
          image: ''
        });
        if (error) throw new Error(error.message);
        toast('تمت إضافة الكورس', 'success'); m.close(); await refreshCourses(); location.reload();
      } catch (e) { toast(e.message, 'error'); }
    };
  };

  // تعديل كورس
  el.querySelectorAll('[data-edit-course]').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const c = store.courses.find(x => x.id === b.dataset.editCourse);
      if (!c) return;
      
      const grades = ['الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'];
      
      const m = modal({
        title: 'تعديل الكورس', 
        body: `
          <div class="space-y-3">
            <input id="et" value="${escapeHtml(c.title)}" placeholder="عنوان الكورس" class="input-field">
            <select id="eg" class="input-field">
              <option value="كل المراحل" ${c.grade === 'كل المراحل' ? 'selected' : ''}>كل المراحل</option>
              ${grades.map(g => `<option value="${g}" ${c.grade === g ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
            <input id="epr" type="number" value="${c.price}" placeholder="السعر" class="input-field">
            <textarea id="ed" placeholder="الوصف" class="input-field">${escapeHtml(c.description || '')}</textarea>
          </div>`,
        actions: `<button id="esb" class="btn-primary w-full">حفظ التعديلات</button>`
      });

      m.root.querySelector('#esb').onclick = async () => {
        try {
          const { error } = await supabase.from('courses').update({
            title: m.root.querySelector('#et').value,
            grade: m.root.querySelector('#eg').value,
            price: +m.root.querySelector('#epr').value || 0,
            description: m.root.querySelector('#ed').value
          }).eq('id', c.id);
          
          if (error) throw new Error(error.message);
          toast('تم التعديل بنجاح', 'success');
          m.close(); await refreshCourses(); location.reload();
        } catch (err) { toast(err.message, 'error'); }
      };
    };
  });

  // حذف كورس
  el.querySelectorAll('[data-del-course]').forEach(b => {
    b.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('حذف الكورس وكل محاضراته؟')) return;
      await supabase.from('courses').delete().eq('id', b.dataset.delCourse);
      toast('تم', 'success'); await refreshCourses(); location.reload();
    };
  });

  // إضافة محاضرة
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

  // تعديل محاضرة
  el.querySelectorAll('[data-edit-lect]').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const lect = store.lectures.find(x => x.id === b.dataset.editLect);
      if (lect) openLectureEditor(lect);
    };
  });

  // حذف محاضرة
  el.querySelectorAll('[data-del-lect]').forEach(b => {
    b.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('حذف المحاضرة؟')) return;
      await supabase.from('lectures').delete().eq('id', b.dataset.delLect);
      toast('تم', 'success'); await refreshLectures(); location.reload();
    };
  });
}
