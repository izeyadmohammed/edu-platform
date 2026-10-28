import { supabase, store } from '../config.js';
import { escapeHtml, lockExamPage } from '../utils.js';
import { toast } from '../ui.js';

export default async function assignmentView(el, params) {
  const [lectureId, examId] = params;

  const { data: existing } = await supabase.from('exam_submissions')
    .select('*').eq('student_id', store.profile.id)
    .eq('lecture_id', lectureId).eq('exam_id', examId).eq('type', 'essay').maybeSingle();
  if (existing) {
    el.innerHTML = `
      <div class="max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
        <i class="fa-solid fa-circle-check text-green-600 text-6xl mb-3"></i>
        <h2 class="text-2xl font-bold mb-2">تم التسليم مسبقاً</h2>
        <p>الحالة: <strong>${escapeHtml(existing.status)}</strong></p>
        ${existing.status === 'تم التصحيح' ? `<p>الدرجة: <strong>${existing.grade ?? '-'}</strong></p>` : ''}
        ${existing.teacher_note ? `<p class="text-sm text-gray-600 mt-2">ملاحظة المدرس: ${escapeHtml(existing.teacher_note)}</p>` : ''}
        <a href="#/home" class="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">رجوع</a>
      </div>`;
    return;
  }

  const { data: lecture } = await supabase.from('lectures').select('*').eq('id', lectureId).single();
  const ex = (lecture?.essay_exams || []).find(x => x.id === examId);
  if (!ex) { el.innerHTML = `<p class="text-center py-10 text-red-600">الواجب غير موجود</p>`; return; }

  lockExamPage();
  el.innerHTML = `
    <div class="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
      <h1 class="text-xl font-extrabold mb-3">${escapeHtml(ex.title)}</h1>
      <p class="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">${escapeHtml(ex.question)}</p>
      <textarea id="ans" rows="8" placeholder="اكتب إجابتك هنا..." class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 mb-4"></textarea>
      <button id="sub" class="w-full py-2 bg-green-600 text-white rounded-lg font-bold">تسليم</button>
    </div>`;

  el.querySelector('#sub').onclick = async () => {
    const answer = el.querySelector('#ans').value.trim();
    if (answer.length < 5) { toast('الإجابة قصيرة جداً', 'warn'); return; }
    if (!confirm('تأكيد التسليم؟')) return;
    try {
      const { error } = await supabase.from('exam_submissions').insert({
        id: 'sub_' + Date.now(), type: 'essay',
        student_id: store.profile.id, student_name: store.profile.name,
        course_id: lecture.course_id, lecture_id: lectureId, exam_id: examId,
        answer, status: 'جاري التصحيح'
      });
      if (error) throw new Error(error.message);
      toast('تم التسليم', 'success');
      location.hash = '#/home';
    } catch (e) { toast(e.message, 'error'); }
  };
}
