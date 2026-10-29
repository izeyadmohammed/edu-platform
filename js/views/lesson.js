import { supabase, store } from '../config.js';
import { escapeHtml, watermark, youtubeEmbed } from '../utils.js';

export default async function lessonView(el, params) {
  const lectureId = params[0];
  const { data: lecture, error } = await supabase.from('lectures').select('*').eq('id', lectureId).single();
  if (error || !lecture) { el.innerHTML = `<p class="text-center py-10 text-red-500">المحاضرة غير موجودة</p>`; return; }
  
  const p = store.profile;
  if (p.role === 'student') {
    const { data: prog } = await supabase.from('student_progress').select('id').eq('student_id', p.id).eq('lecture_id', lectureId).single();
    if (!prog) await supabase.from('student_progress').insert({ student_id: p.id, lecture_id: lectureId, video_watched: true });
    else await supabase.from('student_progress').update({ video_watched: true }).eq('id', prog.id);
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
              
              <!-- حاوية الفيديو المقصوص -->
              <div class="relative w-full aspect-video overflow-hidden bg-black" id="vid-wrap-${v.id}">
                <iframe 
                  class="absolute w-[120%] h-[140%] -top-[20%] -left-[10%]" 
                  src="${youtubeEmbed(v.url)}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&disablekb=1" 
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
              <h3 class="text-xl font-bold mb-4 text-main">المذكرات</h3>
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
          
          ${(lecture.mcq_exams||[]).length ? `
            <div>
              <h3 class="text-xl font-bold mb-4 text-main">الامتحانات</h3>
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

  // إضافة العلامة المائية فوق الفيديو
  if (p?.role === 'student') {
    (lecture.videos||[]).forEach(v => {
      const wrap = el.querySelector(`#vid-wrap-${v.id}`);
      if (wrap) watermark(wrap, p.name + ' - ' + (p.phone||''));
    });
  }
}
