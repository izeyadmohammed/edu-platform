import { supabase, store, refreshCourses, refreshLectures } from '../config.js';
import { escapeHtml, uid, formatMoney, formatDate } from '../utils.js';
import { toast, modal } from '../ui.js';
import { openLectureEditor } from './lesson.js';

export default async function teacherView(el) {
  const p = store.profile;
  if (!p || (p.role !== 'teacher' && p.role !== 'super_admin')) {
    el.innerHTML = `<p class="text-center py-10 text-red-600">غير مصرح</p>`; return;
  }
  const myCourses = store.courses.filter(c => c.teacher_id === p.id || p.role === 'super_admin');
  const myLectures = store.lectures.filter(l => l.teacher_id === p.id || p.role === 'super_admin');
  const lectureIds = myLectures.map(l => l.id);
  const { data: subs } = await supabase.from('exam_submissions')
    .select('*').eq('type','essay')
    .in('lecture_id', lectureIds.length ? lectureIds : ['-'])
    .order('submitted_at', { ascending: false });

  el.innerHTML = `
    <h1 class="text-2xl font-extrabold mb-5">لوحة المدرس</h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold">كورساتي (${myCourses.length})</h3>
          <button id="add-course" class="px-3 py-1 bg-blue-600 text-white rounded text-sm">+ كورس</button>
        </div>
        <div class="space-y-2">
          ${myCourses.map(c => `
            <div class="flex justify-between items-center p-2 border-b border-gray-100 dark:border-slate-700">
              <div>
                <p class="font-bold">${escapeHtml(c.title)}</p>
                <p class="text-xs text-gray-500">${escapeHtml(c.grade)} - ${formatMoney(c.price)}</p>
              </div>
              <div class="flex gap-1">
                <button data-add-lect="${c.id}" class="px-2 py-1 bg-green-600 text-white rounded text-xs">+ محاضرة</button>
                <button data-del-course="${c.id}" class="px-2 py-1 bg-red-600 text-white rounded text-xs">حذف</button>
              </div>
            </div>`).join('') || '<p class="text-gray-500 text-sm">لا توجد كورسات</p>'}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow">
        <h3 class="font-bold mb-3">محاضراتي (${myLectures.length})</h3>
        <div class="space-y-2 max-h-96 overflow-y-auto">
          ${myLectures.map(l => {
            const c = store.courses.find(x => x.id === l.course_id);
            return `<div class="flex justify-between items-center p-2 border-b border-gray-100 dark:border-slate-700">
              <div><p class="font-bold text-sm">${escapeHtml(l.title)}</p><p class="text-xs text-gray-500">${escapeHtml(c?.title||'-')}</p></div>
              <div class="flex gap-1">
                <button data-edit-lect="${l.id}" class="px-2 py-1 bg-yellow-500 text-white rounded text-xs">تعديل</button>
                <button data-del-lect="${l.id}" class="px-2 py-1 bg-red-600 text-white rounded text-xs">حذف</button>
              </div></div>`;
          }).join('') || '<p class="text-gray-500 text-sm">لا توجد محاضرات</p>'}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow lg:col-span-2">
        <h3 class="font-bold mb-3">واجبات للتصحيح (${subs?.length || 0})</h3>
        <div class="space-y-2">
          ${(subs||[]).map(s => `
            <div class="border border-gray-200 dark:border-slate-700 rounded-lg p-3">
              <div class="flex justify-between items-start mb-2">
                <div><p class="font-bold">${escapeHtml(s.student_name)}</p><p class="text-xs text-gray-500">${formatDate(s.submitted_at)} • ${escapeHtml(s.status)}</p></div>
                ${s.status === 'جاري التصحيح' ? `<button data-grade="${s.id}" class="px-3 py-1 bg-blue-600 text-white rounded text-sm">تصحيح</button>` : `<span class="text-green-600 font-bold">${s.grade ?? ''}</span>`}
              </div>
              <p class="bg-gray-50 dark:bg-slate-900 p-2 rounded text-sm whitespace-pre-wrap">${escapeHtml(s.answer||'')}</p>
              ${s.teacher_note?`<p class="text-xs text-blue-600 mt-1">ملاحظتك: ${escapeHtml(s.teacher_note)}</p>`:''}
            </div>`).join('') || '<p class="text-gray-500 text-sm">لا توجد واجبات</p>'}
        </div>
      </div>
    </div>`;

  el.querySelector('#add-course').onclick = () => {
    const m = modal({
      title: 'إضافة كورس', body: `
        <div class="space-y-2">
          <input id="t" placeholder="العنوان" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700">
          <input id="g" placeholder="الصف" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700">
          <input id="pr" type="number" placeholder="السعر" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700">
          <textarea id="d" placeholder="الوصف" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700"></textarea>
          <input id="im" placeholder="رابط الصورة (اختياري)" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700">
        </div>`,
      actions: `<button id="sb" class="px-4 py-2 bg-blue-600 text-white rounded font-bold">إضافة</button>`
    });
    m.root.querySelector('#sb').onclick = async () => {
      try {
        const { error } = await supabase.from('courses').insert({
          id: 'course_'+Date.now(), teacher_id: p.id,
          title: m.root.querySelector('#t').value,
          grade: m.root.querySelector('#g').value,
          price: +m.root.querySelector('#pr').value || 0,
          description: m.root.querySelector('#d').value,
          image: m.root.querySelector('#im').value
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
        body: `<input id="lt" placeholder="عنوان المحاضرة" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700">`,
        actions: `<button id="lsb" class="px-4 py-2 bg-green-600 text-white rounded font-bold">إضافة</button>`
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

  el.querySelectorAll('[data-grade]').forEach(b => {
    b.onclick = () => {
      const s = subs.find(x => x.id === b.dataset.grade);
      const m = modal({
        title: 'تصحيح الواجب',
        body: `
          <p class="text-sm mb-2 bg-gray-50 dark:bg-slate-900 p-2 rounded whitespace-pre-wrap">${escapeHtml(s.answer||'')}</p>
          <label class="text-sm">الدرجة</label>
          <input id="gr" type="number" class="w-full px-3 py-2 border rounded mb-2 dark:bg-slate-900 dark:border-slate-700">
          <label class="text-sm">ملاحظة</label>
          <textarea id="nt" class="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700"></textarea>`,
        actions: `<button id="grs" class="px-4 py-2 bg-blue-600 text-white rounded font-bold">حفظ</button>`
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
