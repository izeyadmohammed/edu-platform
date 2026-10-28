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
  const lectureIds = myLectures.map(l => l.id);
  const { data: subs } = await supabase.from('exam_submissions')
    .select('*').eq('type','essay')
    .in('lecture_id', lectureIds.length ? lectureIds : ['-'])
    .order('submitted_at', { ascending: false });

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
                  <p class="text-xs text-gray-400">${escapeHtml(c.grade)} - ${formatMoney(c.price)}</p>
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
                  <button data-edit-lect="${l.id}" class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">تعديل</button>
                  <button data-del-lect="${l.id}" class="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold">حذف</button>
                </div>
              </div>`;
          }).join('') || '<p class="text-gray-500 text-sm">لا توجد محاضرات</p>'}
        </div>
      </div>

      <div class="glass-card p-6 lg:col-span-2 animate-fade-up" style="animation-delay: 0.2s;">
        <h3 class="font-bold text-lg mb-4">واجبات للتصحيح (${subs?.length || 0})</h3>
        <div class="space-y-3">
          ${(subs||[]).map(s => `
            <div class="p-4 rounded-lg bg-white/5 border border-white/5">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <p class="font-bold">${escapeHtml(s.student_name)}</p>
                  <p class="text-xs text-gray-400">${formatDate(s.submitted_at)} • ${escapeHtml(s.status)}</p>
                </div>
                ${s.status === 'جاري التصحيح' 
                  ? `<button data-grade="${s.id}" class="btn-primary text-xs px-3 py-1">تصحيح</button>` 
                  : `<span class="text-green-400 font-bold text-sm">${s.grade ?? ''}</span>`}
              </div>
              <p class="bg-black/30 p-3 rounded text-sm whitespace-pre-wrap">${escapeHtml(s.answer||'')}</p>
            </div>
          `).join('') || '<p class="text-gray-500 text-sm">لا توجد واجبات</p>'}
        </div>
      </div>
    </div>`;

  // --- إضافة كورس مع صورة ---
  el.querySelector('#add-course').onclick = () => { /* نفس الكود القديم */ };
  el.querySelectorAll('[data-del-course]').forEach(b => { /* ... */ });
  el.querySelectorAll('[data-add-lect]').forEach(b => { /* ... */ });
  el.querySelectorAll('[data-del-lect]').forEach(b => { /* ... */ });
  
  // فتح محرر المحاضرة (اللي فيه إضافة الصور للأسئلة)
  el.querySelectorAll('[data-edit-lect]').forEach(b => {
    b.onclick = () => {
      const lect = store.lectures.find(x => x.id === b.dataset.editLect);
      if (lect) openLectureEditor(lect);
    };
  });

  el.querySelectorAll('[data-grade]').forEach(b => {
    b.onclick = () => {
      const s = subs.find(x => x.id === b.dataset.grade);
      const m = modal({
        title: 'تصحيح الواجب',
        body: `
          <p class="text-sm mb-4 bg-black/30 p-3 rounded whitespace-pre-wrap">${escapeHtml(s.answer||'')}</p>
          <label class="text-sm font-bold">الدرجة</label>
          <input id="gr" type="number" class="input-field mb-3">
          <label class="text-sm font-bold">ملاحظة</label>
          <textarea id="nt" class="input-field"></textarea>`,
        actions: `<button id="grs" class="btn-primary">حفظ</button>`
      });
      m.root.querySelector('#grs').onclick = async () => {
        const { error } = await supabase.from('exam_submissions').update({
          grade: +m.root.querySelector('#gr').value,
          teacher_note: m.root.querySelector('#nt').value,
          status: 'تم التصحيح'
        }).eq('id', s.id);
        if (error) toast(error.message, 'error');
        else { toast('تم', 'success'); m.close(); location.reload(); }
      };
    };
  });
}
