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
      <div class="max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
        <i class="fa-solid fa-circle-check text-green-600 text-6xl mb-3"></i>
        <h2 class="text-2xl font-bold mb-2">لقد سلّمت هذا الامتحان بالفعل</h2>
        <p class="text-lg mb-2">الدرجة: <strong>${existing.score ?? '-'} / ${existing.total ?? '-'}</strong></p>
        <a href="#/home" class="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">رجوع</a>
      </div>`;
    return;
  }

  const { data: lecture } = await supabase.from('lectures').select('*').eq('id', lectureId).single();
  const exam = (lecture?.mcq_exams || []).find(x => x.id === examId);
  if (!exam) { el.innerHTML = `<p class="text-center py-10 text-red-600">الامتحان غير موجود</p>`; return; }

  lockExamPage();
  let current = 0;
  const answers = new Array(exam.questions.length).fill(null);
  let timeLeft = (exam.duration || 10) * 60;

  el.innerHTML = `
    <div class="max-w-3xl mx-auto relative" id="exam-wrap">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 relative">
        <div class="flex justify-between items-center mb-4">
          <h1 class="text-xl font-extrabold">${escapeHtml(exam.title)}</h1>
          <div class="px-3 py-1 bg-red-600 text-white rounded-lg font-bold" id="timer">--:--</div>
        </div>
        <div class="mb-4">
          <div class="bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div id="progress" class="bg-blue-600 h-2 rounded-full transition-all" style="width:0%"></div>
          </div>
          <p class="text-sm text-gray-500 mt-1" id="qcount"></p>
        </div>
        <div id="question"></div>
        <div class="flex justify-between mt-6">
          <button id="prev" class="px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded">السابق</button>
          <div class="flex gap-2">
            <button id="skip" class="px-4 py-2 bg-yellow-500 text-white rounded">تخطي</button>
            <button id="next" class="px-4 py-2 bg-blue-600 text-white rounded">التالي</button>
            <button id="submit" class="px-4 py-2 bg-green-600 text-white rounded font-bold">تسليم</button>
          </div>
        </div>
      </div>
    </div>`;

  watermark(el.querySelector('#exam-wrap'), store.profile.name + ' - ' + (store.profile.phone || ''));

  const qbox = el.querySelector('#question');
  const timer = el.querySelector('#timer');
  const progress = el.querySelector('#progress');
  const qcount = el.querySelector('#qcount');

  function render() {
    const q = exam.questions[current];
    qcount.textContent = `السؤال ${current + 1} من ${exam.questions.length}`;
    progress.style.width = `${((current + 1) / exam.questions.length) * 100}%`;
    qbox.innerHTML = `
      <h2 class="font-bold mb-3">${escapeHtml(q.questionText)}</h2>
      <div class="space-y-2">
        ${q.options.map((o, i) => `
          <label class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 dark:border-slate-600 ${answers[current] === i ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : ''}">
            <input type="radio" name="ans" ${answers[current] === i ? 'checked' : ''} value="${i}" onchange="window.__pick(${i})">
            <span>${escapeHtml(o.text)}</span>
          </label>`).join('')}
      </div>`;
    window.__pick = (i) => { answers[current] = i; render(); };
  }
  render();

  el.querySelector('#prev').onclick = () => { if (current > 0) { current--; render(); } };
  el.querySelector('#next').onclick = () => { if (current < exam.questions.length - 1) { current++; render(); } };
  el.querySelector('#skip').onclick = () => { if (current < exam.questions.length - 1) { current++; render(); } };
  el.querySelector('#submit').onclick = () => submitExam();

  const intv = setInterval(() => {
    timeLeft--;
    const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    timer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (timeLeft <= 0) { clearInterval(intv); submitExam(); }
  }, 1000);

  async function submitExam() {
    clearInterval(intv);
    const unanswered = answers.filter(a => a === null).length;
    if (unanswered > 0 && timeLeft > 0) {
      if (!confirm(`لديك ${unanswered} سؤال غير مجاب. هل تريد التسليم؟`)) return;
    }
    let score = 0;
    exam.questions.forEach((q, i) => { if (answers[i] === q.correctIndex) score++; });
    const payload = {
      id: 'sub_' + Date.now(), type: 'mcq',
      student_id: store.profile.id, student_name: store.profile.name,
      course_id: lecture.course_id, lecture_id: lectureId, exam_id: examId,
      answers, score, total: exam.questions.length,
      status: 'تم التصحيح', grade: score
    };
    try {
      const { error } = await supabase.from('exam_submissions').insert(payload);
      if (error) throw new Error(error.message);
      el.innerHTML = `
        <div class="max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <i class="fa-solid fa-circle-check text-green-600 text-6xl mb-3"></i>
          <h2 class="text-2xl font-bold mb-2">تم التسليم</h2>
          <p class="text-lg">درجتك: <strong>${score} / ${exam.questions.length}</strong></p>
          <a href="#/home" class="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">رجوع</a>
        </div>`;
    } catch (e) { toast(e.message, 'error'); }
  }
}
