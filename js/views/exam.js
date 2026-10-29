import { supabase, store } from '../config.js';
import { escapeHtml, watermark, lockExamPage } from '../utils.js';
import { toast } from '../ui.js';

export default async function examView(el, params) {
  const [lectureId, examId] = params;

  const { data: existing } = await supabase.from('exam_submissions')
    .select('*').eq('student_id', store.profile.id)
    .eq('lecture_id', lectureId).eq('exam_id', examId).eq('type', 'mcq').maybeSingle();
  
  if (existing) {
    el.innerHTML = `
      <div class="glass-card max-w-lg mx-auto p-8 text-center animate-fade-up">
        <i class="fa-solid fa-circle-check text-green-500 text-6xl mb-4"></i>
        <h2 class="text-2xl font-bold mb-2 text-main">لقد سلّمت هذا الامتحان بالفعل</h2>
        <p class="text-lg mb-6 text-muted">الدرجة: <strong class="text-primary text-2xl">${existing.score ?? '-'} / ${existing.total ?? '-'}</strong></p>
        <a href="#/courses/${lectureId}" class="btn-primary">رجوع للكورس</a>
      </div>`;
    return;
  }

  const { data: lecture } = await supabase.from('lectures').select('*').eq('id', lectureId).single();
  const exam = (lecture?.mcq_exams || []).find(x => x.id === examId);
  if (!exam) { el.innerHTML = `<p class="text-center py-10 text-red-500">الامتحان غير موجود</p>`; return; }

  lockExamPage();
  let current = 0;
  const answers = new Array(exam.questions.length).fill(null);
  let timeLeft = (exam.duration || 10) * 60;
  let isSubmitted = false;
  let exitWarnings = 0;

  el.innerHTML = `
    <div class="max-w-3xl mx-auto relative animate-fade-up" id="exam-wrap">
      <div class="glass-card p-6 relative">
        <div class="flex justify-between items-center mb-6 border-b border-border pb-4">
          <h1 class="text-xl font-black text-main">${escapeHtml(exam.title)}</h1>
          <div class="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg font-black border border-red-500/20" id="timer">--:--</div>
        </div>
        <div class="mb-6">
          <div class="bg-black/5 dark:bg-white/5 rounded-full h-2 overflow-hidden">
            <div id="progress" class="bg-primary h-full transition-all duration-300" style="width:0%"></div>
          </div>
          <p class="text-sm text-muted mt-2 font-bold" id="qcount"></p>
        </div>
        
        <div id="question" class="min-h-[200px]"></div>
        
        <div class="flex justify-between items-center mt-8 pt-4 border-t border-border">
          <button id="prev" class="px-5 py-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-sm font-bold transition text-main">السابق</button>
          <div class="flex gap-2">
            <button id="skip" class="px-5 py-2 rounded-lg bg-yellow-500/10 text-yellow-600 text-sm font-bold hover:bg-yellow-500/20 transition">تخطي</button>
            <button id="next" class="px-5 py-2 rounded-lg bg-blue-500/10 text-blue-500 text-sm font-bold hover:bg-blue-500/20 transition">التالي</button>
            <button id="submit" class="btn-accent text-sm">تسليم نهائي</button>
          </div>
        </div>
      </div>
    </div>`;

  watermark(el.querySelector('#exam-wrap'), store.profile.name + ' - ' + (store.profile.phone||''));

  const qbox = el.querySelector('#question');
  const timer = el.querySelector('#timer');
  const progress = el.querySelector('#progress');
  const qcount = el.querySelector('#qcount');

  function render() {
    const q = exam.questions[current];
    qcount.textContent = `السؤال ${current + 1} من ${exam.questions.length}`;
    progress.style.width = `${((current + 1) / exam.questions.length) * 100}%`;
    
    qbox.innerHTML = `
      ${q.image ? `<img src="${q.image}" class="max-h-48 rounded-lg mb-4 border border-border">` : ''}
      <h2 class="font-bold text-lg mb-6 leading-relaxed text-main">${escapeHtml(q.questionText)}</h2>
      <div class="space-y-3">
        ${q.options.map((o, i) => `
          <label class="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${answers[current] === i ? 'border-blue-500 bg-blue-500/10' : 'border-border hover:bg-black/5 dark:hover:bg-white/5'}">
            <input type="radio" name="ans" ${answers[current] === i ? 'checked' : ''} value="${i}" onchange="window.__pick(${i})" class="w-4 h-4 accent-blue-500">
            <span class="font-bold text-main">${escapeHtml(o.text)}</span>
          </label>`).join('')}
      </div>`;
    window.__pick = (i) => { answers[current] = i; render(); };
  }
  render();

  el.querySelector('#prev').onclick = () => { if (current > 0) { current--; render(); } };
  el.querySelector('#next').onclick = () => { if (current < exam.questions.length - 1) { current++; render(); } };
  el.querySelector('#skip').onclick = () => { if (current < exam.questions.length - 1) { current++; render(); } };
  el.querySelector('#submit').onclick = () => { if(confirm('هل أنت متأكد من تسليم الامتحان؟')) submitExam(); };

  const intv = setInterval(() => {
    timeLeft--;
    const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    timer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (timeLeft <= 0) { clearInterval(intv); submitExam(true); }
  }, 1000);

  const visibilityHandler = () => {
    if (document.hidden && !isSubmitted) {
      exitWarnings++;
      if (exitWarnings === 1) alert('تحذير: لقد خرجت من صفحة الامتحان. المرة القادمة سيتم تسليم الامتحان تلقائياً!');
      else { alert('لقد خرجت مرة أخرى. سيتم تسليم الامتحان الآن.'); submitExam(true); }
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  async function submitExam(force = false) {
    if (isSubmitted) return;
    isSubmitted = true;
    clearInterval(intv);
    document.removeEventListener('visibilitychange', visibilityHandler);

    try {
      const res = await fetch(`https://pephaughlgezamtzphkt.supabase.co/functions/v1/submit_exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecture_id: lectureId,
          exam_id: examId,
          answers: answers,
          student_id: store.profile.id,
          student_name: store.profile.name
        })
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'فشل التسليم');
      
      el.innerHTML = `
        <div class="glass-card max-w-lg mx-auto p-8 text-center animate-fade-up">
          <i class="fa-solid fa-circle-check text-green-500 text-6xl mb-4"></i>
          <h2 class="text-2xl font-bold mb-2 text-main">${force ? 'تم التسليم التلقائي' : 'تم التسليم بنجاح'}</h2>
          <p class="text-lg mb-6 text-muted">درجتك: <strong class="text-primary text-3xl">${out.score} / ${out.total}</strong></p>
          <a href="#/courses/${lecture.course_id}" class="btn-primary">رجوع للكورس</a>
        </div>`;
    } catch (e) { toast(e.message, 'error'); isSubmitted = false; }
  }
}
