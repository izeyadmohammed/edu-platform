import { supabase, store } from '../config.js';
import { escapeHtml, lockExamPage, watermark } from '../utils.js';
import { toast } from '../ui.js';

export default async function assignmentView(el, params) {
  const [lectureId, examId] = params;
  
  const { data: existing } = await supabase.from('exam_submissions')
    .select('*').eq('student_id', store.profile.id)
    .eq('lecture_id', lectureId).eq('exam_id', examId).eq('type','essay').maybeSingle();
  
  if (existing) {
    el.innerHTML = `
      <div class="glass-card max-w-lg mx-auto p-8 text-center animate-fade-up">
        <i class="fa-solid fa-circle-check text-green-400 text-6xl mb-4"></i>
        <h2 class="text-2xl font-bold mb-2">تم التسليم مسبقاً</h2>
        <p class="text-gray-400 mb-2">الحالة: <strong class="text-white">${escapeHtml(existing.status)}</strong></p>
        ${existing.status === 'تم التصحيح' ? `<p class="text-green-400 font-black text-2xl mb-4">الدرجة: ${existing.grade ?? '-'}</p>` : ''}
        ${existing.teacher_note ? `<p class="text-sm bg-white/5 p-3 rounded-lg mb-4 text-gray-300">ملاحظة المدرس: ${escapeHtml(existing.teacher_note)}</p>` : ''}
        <a href="#/courses/${lectureId}" class="btn-primary">رجوع للكورس</a>
      </div>`;
    return;
  }

  const { data: lecture } = await supabase.from('lectures').select('*').eq('id', lectureId).single();
  const ex = (lecture?.essay_exams || []).find(x => x.id === examId);
  if (!ex) { el.innerHTML = `<p class="text-center py-10 text-red-400">الواجب غير موجود</p>`; return; }

  lockExamPage();
  let timeLeft = (ex.duration || 30) * 60;
  let isSubmitted = false;
  let exitWarnings = 0;

  el.innerHTML = `
    <div class="glass-card max-w-3xl mx-auto p-8 relative animate-fade-up" id="assign-wrap">
      <div class="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <h1 class="text-xl font-black">${escapeHtml(ex.title)}</h1>
        <div class="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-black border border-red-500/30" id="timer">--:--</div>
      </div>
      
      ${ex.image ? `<img src="${ex.image}" class="max-h-64 rounded-lg mb-4 border border-white/10">` : ''}
      <p class="text-gray-300 mb-6 leading-relaxed whitespace-pre-wrap">${escapeHtml(ex.question)}</p>
      
      <textarea id="ans" rows="8" placeholder="اكتب إجابتك هنا..." class="input-field mb-6"></textarea>
      
      <button id="sub" class="btn-accent w-full py-3">تسليم الواجب</button>
    </div>`;

  watermark(el.querySelector('#assign-wrap'), store.profile.name + ' - ' + (store.profile.phone||''));
  const timer = el.querySelector('#timer');

  const intv = setInterval(() => {
    timeLeft--;
    const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    timer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (timeLeft <= 0) { clearInterval(intv); submit(true); }
  }, 1000);

  const visibilityHandler = () => {
    if (document.hidden && !isSubmitted) {
      exitWarnings++;
      if (exitWarnings === 1) {
        alert('تحذير: لقد خرجت من صفحة الواجب. المرة القادمة سيتم التسليم تلقائياً!');
      } else {
        alert('لقد خرجت مرة أخرى. سيتم تسليم الواجب الآن.');
        submit(true);
      }
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  async function submit(force = false) {
    if (isSubmitted) return;
    const answer = el.querySelector('#ans').value.trim();
    if (!force && answer.length < 5) { toast('الإجابة قصيرة جداً', 'warn'); return; }
    
    isSubmitted = true;
    clearInterval(intv);
    document.removeEventListener('visibilitychange', visibilityHandler);

    try {
      await supabase.from('exam_submissions').insert({
        id: 'sub_' + Date.now(), type: 'essay',
        student_id: store.profile.id, student_name: store.profile.name,
        course_id: lecture.course_id, lecture_id: lectureId, exam_id: examId,
        answer: answer || '(تم التسليم تلقائياً - لم يتم كتابة إجابة)', status: 'جاري التصحيح'
      });
      
      const { data: prog } = await supabase.from('student_progress').select('id').eq('student_id', store.profile.id).eq('lecture_id', lectureId).single();
      if (prog) await supabase.from('student_progress').update({ assignment_submitted: true }).eq('id', prog.id);
      else await supabase.from('student_progress').insert({ student_id: store.profile.id, lecture_id: lectureId, assignment_submitted: true });

      toast(force ? 'تم التسليم التلقائي' : 'تم تسليم الواجب', 'success');
      location.hash = `#/courses/${lecture.course_id}`;
    } catch (e) { toast(e.message, 'error'); }
  }

  el.querySelector('#sub').onclick = () => { if(confirm('تأكيد تسليم الواجب؟')) submit(); };
}
