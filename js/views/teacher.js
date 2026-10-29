import { supabase, store, refreshCourses, refreshLectures } from '../config.js';
import { escapeHtml, uid, formatMoney, formatDate } from '../utils.js';
import { toast, modal } from '../ui.js';
import { openLectureEditor } from './lesson.js';

export default async function teacherView(el) {
  const p = store.profile;
  if (!p || (p.role !== 'teacher' && p.role !== 'super_admin')) {
    el.innerHTML = `<p class="text-center py-10 text-red-400">غير مصرح</p>`; return;
  }
  const myCourses = store.courses.filter(c => c.teacher_id === p.id || p.role === 'super_admin');
  const myLectures = store.lectures.filter(l => l.teacher_id === p.id || p.role === 'super_admin');
  
  el.innerHTML = `
    <h1 class="text-3xl font-black mb-6 animate-fade-up">لوحة <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">المدرس</span></h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <div class="glass-card p-6 animate-fade-up">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg">كورساتي (${myCourses.length})</h3>
          <button id="add-course" class="btn-primary text-sm px-4 py-2">+ كورس</button>
        </div>
        <div class="space-y-3 max-h-96 overflow-y-auto pr-2">
          ${myCourses.map(c => `
            <div class="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
              <div class="flex items-center gap-3">
                ${c.image ? `<img src="${c.image}" class="w-10 h-10 rounded object-cover">` : `<div class="w-10 h-10 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center"><i class="fa-solid fa-book"></i></div>`}
                <div>
                  <p class="font-bold text-sm">${escapeHtml(c.title)}</p>
                  <p class="text-xs text-gray-400">${escapeHtml(c.grade)}</p>
                </div>
              </div>
              <div class="flex gap-2">
                <button data-add-lect="${c.id}" class="px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs font-bold hover:bg-green-500/30">+ محاضرة</button>
                <button data-del-course="${c.id}" class="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold hover:bg-red-500/30">حذف</button>
              </div>
            </div>
          `).join('') || '<p class="text-gray-500 text-sm">لا توجد كورسات</p>'}
        </div>
      </div>

      <div class="glass-card p-6 animate-fade-up" style="animation-delay: 0.1s;">
        <h3 class="font-bold text-lg mb-4">محاضراتي (${myLectures.length})</h3>
        <div class="space-y-3 max-h-96 overflow-y-auto pr-2">
          ${myLectures.map(l => {
            const c = store.courses.find(x => x.id === l.course_id);
            return `
              <div class="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                <div>
                  <p class="font-bold text-sm">${escapeHtml(l.title)}</p>
                  <p class="text-xs text-gray-400">${escapeHtml(c?.title||'-')}</p>
                </div>
                <div class="flex gap-2">
                  <button data-edit-lect="${l.id}" class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold hover:bg-yellow-500/30">تعديل</button>
                  <button data-del-lect="${l.id}" class="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold hover:bg-red-500/30">حذف</button>
                </div>
              </div>`;
          }).join('') || '<p class="text-gray-500 text-sm">لا توجد محاضرات</p>'}
        </div>
      </div>

    </div>`;

  // إضافة كورس (مع قائمة اختيارات للصف)
  el.querySelector('#add-course').onclick = () => {
    const grades = ['الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'];
    const m = modal({
      title: 'إضافة كورس', body: `
        <div class="space-y-3">
          <input id="t" placeholder="عنوان الكورس" class="input-field">
          <select id="g" class="input-field">
            <option value="">اختر الصف</option>
            ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
          </select>
          <input id="pr" type="number" placeholder="السعر" class="input-field">
          <textarea id="d" placeholder="الوصف" class="input-field"></textarea>
        </div>`,
      actions: `<button id="sb" class="btn-primary">إضافة</button>`
    });
    m.root.querySelector('#sb').onclick = async () => {
      try {
        const { error } = await supabase.from('courses').insert({
          id: 'course_'+Date.now(), teacher_id: p.id,
          title: m.root.querySelector('#t').value,
          grade: m.root.querySelector('#g').value,
          price: +m.root.querySelector('#pr').value || 0,
          description: m.root.querySelector('#d').value,
          image: ''
        });
        if (error) throw new Error(error.message);
        toast('تمت الإضافة', 'success'); m.close(); await refreshCourses(); location.reload();
      } catch (e) { toast(e.message, 'error'); }
    };
  };

  el.querySelectorAll('[data-del-course]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('حذف الكورس؟')) return;
      await supabase.from('courses').delete().eq('id', b.dataset.delCourse);
      toast('تم', 'success'); await refreshCourses(); location.reload();
    };
  });

  el.querySelectorAll('[data-add-lect]').forEach(b => {
    b.onclick = () => {
      const m = modal({
        title: 'إضافة محاضرة',
        body: `<input id="lt" placeholder="عنوان المحاضرة" class="input-field">`,
        actions: `<button id="lsb" class="btn-accent">إضافة</button>`
      });
      m.root.querySelector('#lsb').onclick = async () => {
        try {
          const { error } = await supabase.from('lectures').insert({
            id: 'lect_'+Date.now(), course_id: b.dataset.addLect, teacher_id: p.id,
            title: m.root.querySelector('#lt').value, videos: [], pdfs: [], mcq_exams: [], essay_exams: []
          });
          if (error) throw new Error(error.message);
          toast('تمت', 'success'); m.close(); await refreshLectures(); location.reload();
        } catch (e) { toast(e.message, 'error'); }
      };
    };
  });

  el.querySelectorAll('[data-del-lect]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('حذف المحاضرة؟')) return;
      await supabase.from('lectures').delete().eq('id', b.dataset.delLect);
      toast('تم', 'success'); await refreshLectures(); location.reload();
    };
  });

  el.querySelectorAll('[data-edit-lect]').forEach(b => {
    b.onclick = () => {
      const lect = store.lectures.find(x => x.id === b.dataset.editLect);
      if (lect) openLectureEditor(lect);
    };
  });
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
