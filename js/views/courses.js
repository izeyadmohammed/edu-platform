import { supabase, store } from '../config.js';
import { escapeHtml, formatMoney } from '../utils.js';
import { toast } from '../ui.js';

export default async function coursesView(el, params) {
  if (params && params[0]) return courseDetail(el, params[0]);
  return courseList(el);
}

function courseList(el) {
  const p = store.profile;
  let list = store.courses;
  if (p?.role === 'student' && p.grade) list = list.filter(c => c.grade === p.grade);
  
  el.innerHTML = `
    <div class="mb-8 animate-fade-up">
      <h2 class="text-3xl font-black mb-2 text-main">
        ${p?.role === 'student' ? 'كورسات ' + escapeHtml(p.grade || 'صفك') : 'تصفح'} 
        <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">الكورسات</span>
      </h2>
    </div>
    ${list.length === 0 ? `<div class="glass-card p-12 text-center text-muted">لا توجد كورسات متاحة حالياً</div>` : ''}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
      ${list.map(c => `
        <a href="#/courses/${c.id}" class="glass-card overflow-hidden group">
          <div class="h-48 bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
            ${c.image ? `<img src="${escapeHtml(c.image)}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">` : `<div class="w-full h-full flex items-center justify-center text-5xl text-gray-400"><i class="fa-solid fa-book-open"></i></div>`}
            <div class="absolute top-3 right-3 bg-white/80 dark:bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-border text-main">${escapeHtml(c.grade || 'عام')}</div>
          </div>
          <div class="p-5">
            <h3 class="font-extrabold text-lg mb-2 truncate group-hover:text-primary transition text-main">${escapeHtml(c.title)}</h3>
            <div class="flex items-center justify-between mt-4">
              <span class="text-primary font-black text-xl">${formatMoney(c.price)}</span>
              <span class="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition text-main"><i class="fa-solid fa-arrow-left text-xs"></i></span>
            </div>
          </div>
        </a>
      `).join('')}
    </div>`;
}

async function courseDetail(el, id) {
  const { data: course, error } = await supabase.from('courses').select('*').eq('id', id).single();
  if (error || !course) { el.innerHTML = `<p class="text-center py-10 text-red-500">الكورس غير موجود</p>`; return; }
  
  const { data: lectures } = await supabase.from('lectures').select('*').eq('course_id', id).order('created_at');
  const p = store.profile;
  const enrolled = p?.enrolled_courses?.includes(id);

  let progressMap = {};
  let subs = [];
  if (enrolled && p) {
    const { data: prog } = await supabase.from('student_progress').select('*').eq('student_id', p.id);
    if (prog) prog.forEach(x => progressMap[x.lecture_id] = x);
    const { data: s } = await supabase.from('exam_submissions').select('*').eq('student_id', p.id);
    if (s) subs = s;
  }

  let previousCompleted = true;

  el.innerHTML = `
    <div class="animate-fade-up">
      <div class="glass-card p-8 mb-8 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div class="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          <div class="w-full md:w-1/3 h-48 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 shrink-0">
             ${course.image ? `<img src="${escapeHtml(course.image)}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-6xl text-gray-400"><i class="fa-solid fa-book-open"></i></div>`}
          </div>
          <div class="flex-1">
            <span class="inline-block py-1 px-3 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold mb-3 border border-blue-500/20">${escapeHtml(course.grade)}</span>
            <h1 class="text-3xl font-black mb-3 text-main">${escapeHtml(course.title)}</h1>
            <p class="text-muted mb-6 leading-relaxed">${escapeHtml(course.description || 'لا يوجد وصف')}</p>
            <div class="flex items-center gap-4">
              <span class="text-2xl font-black text-primary">${formatMoney(course.price)}</span>
              ${enrolled || course.price === 0
                ? `<span class="px-6 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg font-bold"><i class="fa-solid fa-check mr-2"></i> ${enrolled ? 'مشترك' : 'مجاني'}</span>` 
                : `<button id="enroll-btn" class="btn-primary shadow-lg shadow-primary/20">اشترك الآن</button>`}
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mb-4 mt-12">
        <h2 class="text-2xl font-black text-main">محتوى الكورس</h2>
        <span class="text-sm font-bold text-muted bg-black/5 dark:bg-white/5 px-3 py-1 rounded-lg">${lectures?.length || 0} محاضرة</span>
      </div>

      <div class="space-y-4">
        ${(lectures || []).map((l, i) => {
          const isLocked = enrolled && !previousCompleted && p.role === 'student';
          const prog = progressMap[l.id] || {};
          
          let statusIcon = '';
          let statusColor = 'text-muted';
          if (prog.exam_submitted || (l.mcq_exams.length === 0 && l.essay_exams.length === 0 && prog.video_watched)) {
             statusIcon = '<i class="fa-solid fa-circle-check text-green-500"></i>';
             statusColor = 'text-green-500';
          }

          const content = `
            <div class="glass-card overflow-hidden ${isLocked ? 'opacity-60 grayscale' : ''}">
              <button class="w-full px-6 py-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition text-right" ${!isLocked ? `onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.fa-chevron-down').classList.toggle('rotate-180')"` : ''}>
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full ${statusColor} bg-black/5 dark:bg-white/5 flex items-center justify-center font-black shrink-0">
                    ${isLocked ? '<i class="fa-solid fa-lock text-sm"></i>' : (statusIcon || (i+1))}
                  </div>
                  <div>
                    <h3 class="font-bold text-lg text-main">${escapeHtml(l.title)}</h3>
                    <p class="text-xs text-muted mt-1">${isLocked ? 'أكمل المحاضرة السابقة لفتحها' : `${(l.videos||[]).length} فيديو • ${(l.pdfs||[]).length} مذكرة`}</p>
                  </div>
                </div>
                ${!isLocked ? '<i class="fa-solid fa-chevron-down text-muted transition-transform duration-300"></i>' : ''}
              </button>
              ${!isLocked ? `
                <div class="hidden border-t border-border bg-black/5 dark:bg-black/20">
                  <div class="p-6">
                     <a href="#/lesson/${l.id}" class="block p-4 rounded-lg bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 border border-border transition">
                       <div class="flex items-center justify-between">
                          <div class="flex items-center gap-3">
                            <i class="fa-solid fa-circle-play text-primary text-xl"></i>
                            <span class="font-bold text-main">ابدأ المحاضرة</span>
                          </div>
                          <i class="fa-solid fa-arrow-left text-muted"></i>
                       </div>
                     </a>
                  </div>
                </div>
              ` : ''}
            </div>
          `;

          // شروط الفتح: 60% للامتحان و 80% للواجب
          if (enrolled && p.role === 'student') {
            const hasEssay = l.essay_exams?.length > 0;
            const hasMcq = l.mcq_exams?.length > 0;
            const essayScore = subs.find(s => s.lecture_id === l.id && s.type === 'essay')?.grade || 0;
            const mcqScore = subs.find(s => s.lecture_id === l.id && s.type === 'mcq')?.grade || 0;
            
            const essayPass = !hasEssay || (essayScore >= 80);
            const mcqPass = !hasMcq || (mcqScore >= 60);
            
            previousCompleted = prog.video_watched && essayPass && mcqPass;
          }

          return content;
        }).join('') || '<div class="glass-card p-8 text-center text-muted">لا توجد محاضرات مضافة بعد</div>'}
      </div>
    </div>
  `;

  const eb = el.querySelector('#enroll-btn');
  if (eb) {
    eb.onclick = async () => {
      if (!store.profile) { toast('سجّل دخول أولاً', 'warn'); location.hash = '#/login'; return; }
      
      // لو الكورس مجاني (سعره 0)، اشترك تلقائياً
      if (course.price === 0) {
        try {
          // نضيف الكورس لقائمة اشتراكاته بدون خصم رصيد
          const { error } = await supabase.from('profiles').update({
            enrolled_courses: [...(store.profile.enrolled_courses || []), id]
          }).eq('id', store.profile.id);
          if (error) throw new Error(error.message);
          toast('تم فتح الكورس بنجاح', 'success');
          const { loadProfile } = await import('../auth.js'); await loadProfile();
          location.reload();
        } catch (err) { toast(err.message, 'error'); }
        return;
      }

      // الكورسات المدفوعة: نستخدم دالة enroll_course
      try {
        const { error } = await supabase.rpc('enroll_course', { course_id_input: id });
        if (error) throw new Error(error.message);
        toast('تم الاشتراك بنجاح', 'success');
        const { loadProfile } = await import('../auth.js'); await loadProfile();
        location.reload();
      } catch (err) { toast(err.message, 'error'); }
    };
  }
}
