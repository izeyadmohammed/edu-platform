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
  if (p?.role === 'student' && p.grade) {
    const filtered = list.filter(c => c.grade === p.grade);
    if (filtered.length) list = filtered;
  }
  
  el.innerHTML = `
    <div class="mb-8 animate-fade-up">
      <h2 class="text-3xl font-black mb-2">تصفح <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">الكورسات</span></h2>
      <p class="text-gray-400">اختر الكورس المناسب لك وابدأ رحلة التعلم</p>
    </div>
    
    ${list.length === 0 ? `<div class="glass-card p-12 text-center text-gray-400">لا توجد كورسات</div>` : ''}
    
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
      ${list.map(c => `
        <a href="#/courses/${c.id}" class="glass-card overflow-hidden group">
          <div class="h-48 bg-gray-800 relative overflow-hidden">
            ${c.image ? `<img src="${escapeHtml(c.image)}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">` : `<div class="w-full h-full flex items-center justify-center text-5xl text-gray-600"><i class="fa-solid fa-book-open"></i></div>`}
            <div class="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">${escapeHtml(c.grade || 'عام')}</div>
          </div>
          <div class="p-5">
            <h3 class="font-extrabold text-lg mb-2 truncate group-hover:text-blue-400 transition">${escapeHtml(c.title)}</h3>
            <div class="flex items-center justify-between mt-4">
              <span class="text-blue-400 font-black text-xl">${formatMoney(c.price)}</span>
              <span class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 transition"><i class="fa-solid fa-arrow-left text-xs"></i></span>
            </div>
          </div>
        </a>
      `).join('')}
    </div>
  `;
}

async function courseDetail(el, id) {
  const { data: course, error } = await supabase.from('courses').select('*').eq('id', id).single();
  if (error || !course) { el.innerHTML = `<p class="text-center py-10 text-red-400">الكورس غير موجود</p>`; return; }
  
  const { data: teacher } = await supabase.from('profiles').select('*').eq('id', course.teacher_id).single();
  const { data: lectures } = await supabase.from('lectures').select('*').eq('course_id', id).order('created_at');
  const p = store.profile;
  const enrolled = p?.enrolled_courses?.includes(id);

  el.innerHTML = `
    <div class="animate-fade-up">
      <!-- Course Header -->
      <div class="glass-card p-8 mb-8 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div class="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          <div class="w-full md:w-1/3 h-48 rounded-xl overflow-hidden bg-gray-800 shrink-0">
             ${course.image ? `<img src="${escapeHtml(course.image)}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-6xl text-gray-600"><i class="fa-solid fa-book-open"></i></div>`}
          </div>
          <div class="flex-1">
            <span class="inline-block py-1 px-3 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-3 border border-blue-500/30">${escapeHtml(course.grade)}</span>
            <h1 class="text-3xl font-black mb-3">${escapeHtml(course.title)}</h1>
            <p class="text-gray-400 mb-6 leading-relaxed">${escapeHtml(course.description || 'لا يوجد وصف')}</p>
            <div class="flex items-center gap-4">
              <span class="text-2xl font-black text-blue-400">${formatMoney(course.price)}</span>
              ${enrolled 
                ? `<span class="px-6 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg font-bold"><i class="fa-solid fa-check mr-2"></i> مشترك</span>` 
                : `<button id="enroll-btn" class="btn-primary shadow-lg shadow-blue-500/20">اشترك الآن</button>`}
            </div>
          </div>
        </div>
      </div>

      <!-- Lectures Accordion -->
      <div class="flex items-center justify-between mb-4 mt-12">
        <h2 class="text-2xl font-black">محتوى الكورس</h2>
        <span class="text-sm font-bold text-gray-400 bg-white/5 px-3 py-1 rounded-lg">${lectures?.length || 0} محاضرة</span>
      </div>

      <div class="space-y-4">
        ${(lectures || []).map((l, i) => `
          <div class="glass-card overflow-hidden">
            <!-- Lecture Header (Click to Expand) -->
            <button class="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition text-right" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.fa-chevron-down').classList.toggle('rotate-180')">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black shrink-0">${i+1}</div>
                <div>
                  <h3 class="font-bold text-lg">${escapeHtml(l.title)}</h3>
                  <p class="text-xs text-gray-400 mt-1">
                    ${(l.videos||[]).length} فيديو • ${(l.pdfs||[]).length} مذكرة • ${(l.mcq_exams||[]).length + (l.essay_exams||[]).length} امتحان
                  </p>
                </div>
              </div>
              <i class="fa-solid fa-chevron-down text-gray-400 transition-transform duration-300"></i>
            </button>

            <!-- Lecture Content (Hidden by default) -->
            <div class="hidden border-t border-white/5 bg-black/20">
              ${(enrolled || l.is_preview || p?.role === 'super_admin' || p?.role === 'teacher') ? `
                <div class="p-6 space-y-4">
                  
                  <!-- Videos -->
                  ${(l.videos||[]).map(v => `
                    <div class="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-blue-500/30 transition">
                      <div class="flex items-center gap-3">
                        <i class="fa-solid fa-circle-play text-blue-400 text-xl"></i>
                        <span class="font-bold text-sm">${escapeHtml(v.title)}</span>
                      </div>
                      <a href="#/lesson/${l.id}" class="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-bold hover:bg-blue-500/30 transition">مشاهدة</a>
                    </div>
                  `).join('')}

                  <!-- PDFs -->
                  ${(l.pdfs||[]).map(pdf => `
                    <div class="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-red-500/30 transition">
                      <div class="flex items-center gap-3">
                        <i class="fa-solid fa-file-pdf text-red-400 text-xl"></i>
                        <span class="font-bold text-sm">${escapeHtml(pdf.title)}</span>
                      </div>
                      <a href="${escapeHtml(pdf.url)}" target="_blank" class="px-4 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-bold hover:bg-red-500/30 transition">تحميل</a>
                    </div>
                  `).join('')}

                  <!-- Exams -->
                  ${(l.mcq_exams||[]).map(ex => `
                    <div class="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-purple-500/30 transition">
                      <div class="flex items-center gap-3">
                        <i class="fa-solid fa-list-check text-purple-400 text-xl"></i>
                        <span class="font-bold text-sm">${escapeHtml(ex.title)}</span>
                      </div>
                      <a href="#/exam/${l.id}/${ex.id}" class="px-4 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-bold hover:bg-purple-500/30 transition">ابدأ</a>
                    </div>
                  `).join('')}

                  <!-- Assignments -->
                  ${(l.essay_exams||[]).map(ex => `
                    <div class="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-orange-500/30 transition">
                      <div class="flex items-center gap-3">
                        <i class="fa-solid fa-pen-to-square text-orange-400 text-xl"></i>
                        <span class="font-bold text-sm">${escapeHtml(ex.title)}</span>
                      </div>
                      <a href="#/assignment/${l.id}/${ex.id}" class="px-4 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-bold hover:bg-orange-500/30 transition">فتح</a>
                    </div>
                  `).join('')}

                  ${!(l.videos?.length || l.pdfs?.length || l.mcq_exams?.length || l.essay_exams?.length) ? '<p class="text-center text-gray-500 text-sm py-4">لا يوجد محتوى في هذه المحاضرة بعد</p>' : ''}
                </div>
              ` : `
                <div class="p-8 text-center text-gray-400">
                  <i class="fa-solid fa-lock text-3xl mb-3 opacity-50"></i>
                  <p>يجب الاشتراك في الكورس للوصول إلى محتوى هذه المحاضرة</p>
                </div>
              `}
            </div>
          </div>
        `).join('') || '<div class="glass-card p-8 text-center text-gray-400">لا توجد محاضرات مضافة بعد</div>'}
      </div>
    </div>
  `;

  const eb = el.querySelector('#enroll-btn');
  if (eb) eb.onclick = async () => {
    if (!store.profile) { toast('سجّل دخول أولاً', 'warn'); location.hash = '#/login'; return; }
    try {
      const { error } = await supabase.rpc('enroll_course', { course_id_input: id });
      if (error) throw new Error(error.message);
      toast('تم الاشتراك بنجاح', 'success');
      const { loadProfile } = await import('../auth.js'); await loadProfile();
      location.reload();
    } catch (err) { toast(err.message, 'error'); }
  };
}
