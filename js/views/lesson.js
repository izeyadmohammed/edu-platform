import { supabase, store, refreshLectures } from '../config.js';
import { escapeHtml, watermark, youtubeEmbed, uid } from '../utils.js';
import { toast, modal } from '../ui.js';

export default async function lessonView(el, params) {
  const lectureId = params[0];
  const { data: lecture, error } = await supabase.from('lectures').select('*').eq('id', lectureId).single();
  if (error || !lecture) { el.innerHTML = `<p class="text-center py-10 text-red-400">المحاضرة غير موجودة</p>`; return; }
  
  const p = store.profile;
  if (p.role === 'student') {
    // تسجيل إن الطالب دخل وشاهد المحاضرة
    const { data: prog } = await supabase.from('student_progress').select('id').eq('student_id', p.id).eq('lecture_id', lectureId).single();
    if (!prog) {
      await supabase.from('student_progress').insert({ student_id: p.id, lecture_id: lectureId, video_watched: true });
    } else {
      await supabase.from('student_progress').update({ video_watched: true, updated_at: new Date() }).eq('id', prog.id);
    }
  }

  el.innerHTML = `
    <div class="animate-fade-up max-w-5xl mx-auto">
      <div class="glass-card p-8 relative" id="lesson-wrap">
        <div class="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
          <h1 class="text-3xl font-black">${escapeHtml(lecture.title)}</h1>
        </div>

        <div class="space-y-8">
          ${(lecture.videos||[]).map(v => `
            <div class="rounded-xl overflow-hidden bg-black/50 border border-white/5">
              <iframe class="w-full aspect-video" src="${youtubeEmbed(v.url)}" frameborder="0" allowfullscreen></iframe>
              <p class="p-4 font-bold bg-white/5">${escapeHtml(v.title)}</p>
            </div>
          `).join('')}

          ${(lecture.pdfs||[]).length ? `
            <div>
              <h3 class="text-xl font-bold mb-4"><i class="fa-solid fa-file-pdf text-red-400 ml-2"></i> المذكرات</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${(lecture.pdfs||[]).map(pdf => `
                  <a target="_blank" href="${escapeHtml(pdf.url)}" class="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-red-500/30 transition">
                    <i class="fa-solid fa-file-pdf text-red-400 text-xl"></i>
                    <span class="font-bold text-sm">${escapeHtml(pdf.title)}</span>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  if (p?.role === 'student') watermark(el.querySelector('#lesson-wrap'), p.name + ' - ' + (p.phone||''));
}

export async function openLectureEditor(lecture) { /* ... */ }
