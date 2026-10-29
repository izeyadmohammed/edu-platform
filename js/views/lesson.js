import { supabase, store } from '../config.js';
import { escapeHtml, watermark, youtubeEmbed } from '../utils.js';
import { toast } from '../ui.js';

export default async function lessonView(el, params) {
  const lectureId = params[0];
  const { data: lecture, error } = await supabase.from('lectures').select('*').eq('id', lectureId).single();
  if (error || !lecture) { el.innerHTML = `<p class="text-center py-10 text-red-500">المحاضرة غير موجودة</p>`; return; }
  
  const p = store.profile;
  if (p.role === 'student') {
    const { data: prog } = await supabase.from('student_progress').select('id').eq('student_id', p.id).eq('lecture_id', lectureId).single();
    if (!prog) await supabase.from('student_progress').insert({ student_id: p.id, lecture_id: lectureId, video_watched: true });
    else await supabase.from('student_progress').update({ video_watched: true, updated_at: new Date() }).eq('id', prog.id);
  }

  el.innerHTML = `
    <div class="animate-fade-up max-w-5xl mx-auto">
      <div class="glass-card p-8 relative" id="lesson-wrap">
        <div class="flex items-center justify-between mb-8 pb-6 border-b border-border">
          <h1 class="text-3xl font-black text-main">${escapeHtml(lecture.title)}</h1>
        </div>

        <div class="space-y-8">
          ${(lecture.videos||[]).map(v => `
            <div class="rounded-xl overflow-hidden bg-black shadow-2xl relative">
              
              <!-- مشغل الفيديو -->
              <div class="relative w-full aspect-video overflow-hidden bg-black">
                <iframe 
                  class="absolute w-full h-full top-0 left-0" 
                  src="${youtubeEmbed(v.url)}?rel=0&modestbranding=1&showinfo=0" 
                  frameborder="0" 
                  allow="autoplay; encrypted-media" 
                  allowfullscreen>
                </iframe>
              </div>

              <div class="p-4 bg-gray-900">
                 <p class="font-bold text-white">${escapeHtml(v.title)}</p>
              </div>
            </div>
          `).join('')}
          
          ${(lecture.pdfs||[]).length ? `
            <div>
              <h3 class="text-xl font-bold mb-4 text-main"><i class="fa-solid fa-file-pdf text-red-500 ml-2"></i> المذكرات</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${(lecture.pdfs||[]).map(pdf => `
                  <a target="_blank" href="${escapeHtml(pdf.url)}" class="flex items-center gap-3 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-border hover:border-red-500/30 transition">
                    <i class="fa-solid fa-file-pdf text-red-500 text-xl"></i>
                    <span class="font-bold text-sm text-main">${escapeHtml(pdf.title)}</span>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${(lecture.essay_exams||[]).length ? `
            <div>
              <h3 class="text-xl font-bold mb-4 text-main"><i class="fa-solid fa-pen-to-square text-orange-500 ml-2"></i> الواجبات</h3>
              <div class="space-y-3">
                ${(lecture.essay_exams||[]).map(ex => `
                  <div class="flex items-center justify-between p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                    <span class="font-bold text-main">${escapeHtml(ex.title)}</span>
                    <a href="#/assignment/${lecture.id}/${ex.id}" class="btn-accent text-sm px-4 py-1.5">فتح الواجب</a>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${(lecture.mcq_exams||[]).length ? `
            <div>
              <h3 class="text-xl font-bold mb-4 text-main"><i class="fa-solid fa-list-check text-purple-500 ml-2"></i> الامتحانات</h3>
              <div class="space-y-3">
                ${(lecture.mcq_exams||[]).map(ex => `
                  <div class="flex items-center justify-between p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <span class="font-bold text-main">${escapeHtml(ex.title)}</span>
                    <a href="#/exam/${lecture.id}/${ex.id}" class="btn-primary text-sm px-4 py-1.5">ابدأ الامتحان</a>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // إضافة العلامة المائية المتحركة
  if (p?.role === 'student') {
    const wrap = el.querySelector('#lesson-wrap');
    if (wrap) watermark(wrap, p.name + ' - ' + (p.phone||''));
  }
}
