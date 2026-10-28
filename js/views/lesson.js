import { supabase, store, refreshLectures } from '../config.js';
import { escapeHtml, watermark, youtubeEmbed, uid } from '../utils.js';
import { toast, modal } from '../ui.js';

export default async function lessonView(el, params) {
  const lectureId = params[0];
  const { data: lecture, error } = await supabase.from('lectures').select('*').eq('id', lectureId).single();
  if (error || !lecture) { el.innerHTML = `<p class="text-center py-10 text-red-400">المحاضرة غير موجودة</p>`; return; }
  
  const { data: course } = await supabase.from('courses').select('*').eq('id', lecture.course_id).single();
  const p = store.profile;
  const canEdit = p && (p.role === 'super_admin' || p.id === lecture.teacher_id);

  el.innerHTML = `
    <div class="animate-fade-up max-w-5xl mx-auto">
      <div class="flex items-center gap-2 mb-6 text-sm font-bold text-gray-400">
        <a href="#/courses/${lecture.course_id}" class="hover:text-blue-400 transition"><i class="fa-solid fa-arrow-right ml-1"></i> ${escapeHtml(course?.title || 'الكورس')}</a>
      </div>

      <div class="glass-card p-8 relative" id="lesson-wrap">
        <div class="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
          <h1 class="text-3xl font-black">${escapeHtml(lecture.title)}</h1>
          ${canEdit ? `<button id="edit-btn" class="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-bold border border-yellow-500/30 hover:bg-yellow-500/30 transition"><i class="fa-solid fa-pen"></i> تعديل</button>` : ''}
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
              <h3 class="text-xl font-bold mb-4"><i class="fa-solid fa-file-pdf text-red-400 ml-2"></i> المذكرات والملفات</h3>
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

  if (p?.role === 'student') {
    watermark(el.querySelector('#lesson-wrap'), p.name + ' - ' + (p.phone||''));
  }
  if (canEdit) {
    el.querySelector('#edit-btn').onclick = () => openLectureEditor(lecture);
  }
}

export async function openLectureEditor(lecture) {
  const local = JSON.parse(JSON.stringify({ videos: lecture.videos || [], pdfs: lecture.pdfs || [], mcq_exams: lecture.mcq_exams || [], essay_exams: lecture.essay_exams || [] }));
  const m = modal({ title: 'تعديل محتوى المحاضرة', body: `<div class="flex gap-2 mb-4 flex-wrap">
      <button data-tab="videos" class="tab-btn px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-bold">فيديوهات</button>
      <button data-tab="pdfs" class="tab-btn px-4 py-2 rounded-lg bg-white/10 text-gray-300 text-sm font-bold">مذكرات</button>
      <button data-tab="mcq" class="tab-btn px-4 py-2 rounded-lg bg-white/10 text-gray-300 text-sm font-bold">MCQ</button>
      <button data-tab="essay" class="tab-btn px-4 py-2 rounded-lg bg-white/10 text-gray-300 text-sm font-bold">واجبات</button></div><div id="tab-content"></div>`,
    actions: `<button id="cancel" class="px-4 py-2 bg-white/10 rounded-lg font-bold">إلغاء</button><button id="save" class="btn-primary">حفظ التغييرات</button>` });
  
  const content = m.root.querySelector('#tab-content');
  let currentTab = 'videos';

  function renderTab() {
    if (currentTab === 'videos') {
      content.innerHTML = `${local.videos.map((v, i) => `<div class="grid grid-cols-2 gap-2 mb-2 items-end"><input data-i="${i}" data-f="title" value="${escapeHtml(v.title)}" placeholder="العنوان" class="input-field text-sm"><div class="flex gap-1"><input data-i="${i}" data-f="url" value="${escapeHtml(v.url)}" placeholder="YouTube URL" class="input-field text-sm"><button data-del="videos" data-i="${i}" class="px-3 text-red-400 hover:bg-red-500/10 rounded">✕</button></div></div>`).join('')}<button id="add-videos" class="text-blue-400 text-sm font-bold mt-2">+ إضافة فيديو</button>`;
    } else if (currentTab === 'pdfs') {
      content.innerHTML = `${local.pdfs.map((v, i) => `<div class="grid grid-cols-2 gap-2 mb-2"><input data-i="${i}" data-f="title" value="${escapeHtml(v.title)}" placeholder="العنوان" class="input-field text-sm"><div class="flex gap-1"><input data-i="${i}" data-f="url" value="${escapeHtml(v.url)}" placeholder="PDF URL" class="input-field text-sm"><button data-del="pdfs" data-i="${i}" class="px-3 text-red-400 hover:bg-red-500/10 rounded">✕</button></div></div>`).join('')}<button id="add-pdfs" class="text-blue-400 text-sm font-bold mt-2">+ إضافة مذكرة</button>`;
    } else if (currentTab === 'mcq') {
      content.innerHTML = `${local.mcq_exams.map((ex, ei) => `<div class="glass-card p-4 mb-3"><div class="flex gap-2 mb-3"><input data-exam="${ei}" data-f="title" value="${escapeHtml(ex.title)}" placeholder="عنوان الامتحان" class="input-field text-sm"><input data-exam="${ei}" data-f="duration" type="number" value="${ex.duration||''}" placeholder="دقيقة" class="input-field text-sm w-24"><button data-del="mcq" data-i="${ei}" class="px-3 text-red-400 hover:bg-red-500/10 rounded">✕</button></div>${(ex.questions||[]).map((q, qi) => `<div class="bg-black/30 p-3 rounded-lg mb-2"><input data-exam="${ei}" data-q="${qi}" data-f="questionText" value="${escapeHtml(q.questionText)}" placeholder="نص السؤال" class="input-field text-sm mb-2">${(q.options||[]).map((o, oi) => `<div class="flex gap-2 items-center mb-2"><input type="radio" name="correct_${ei}_${qi}" ${q.correctIndex===oi?'checked':''} data-exam="${ei}" data-q="${qi}" data-correct="${oi}" class="accent-blue-500"><input data-exam="${ei}" data-q="${qi}" data-opt="${oi}" value="${escapeHtml(o.text)}" placeholder="خيار" class="input-field text-sm"><button data-del-opt="${ei}_${qi}_${oi}" class="text-red-400">✕</button></div>`).join('')}<button data-add-opt="${ei}_${qi}" class="text-blue-400 text-xs font-bold">+ خيار</button></div>`).join('')}<button data-add-q="${ei}" class="text-blue-400 text-xs font-bold mt-1">+ سؤال</button></div>`).join('')}<button id="add-mcq" class="text-blue-400 text-sm font-bold mt-2">+ إضافة امتحان MCQ</button>`;
    } else {
      content.innerHTML = `${local.essay_exams.map((ex, i) => `<div class="glass-card p-4 mb-2"><div class="flex gap-2 mb-2"><input data-essay="${i}" data-f="title" value="${escapeHtml(ex.title)}" placeholder="العنوان" class="input-field text-sm"><button data-del="essay" data-i="${i}" class="px-3 text-red-400">✕</button></div><textarea data-essay="${i}" data-f="question" placeholder="نص السؤال" class="input-field text-sm h-24">${escapeHtml(ex.question)}</textarea></div>`).join('')}<button id="add-essay" class="text-blue-400 text-sm font-bold mt-2">+ إضافة واجب</button>`;
    }
    bindTabEvents();
  }
  
  function bindTabEvents() {
    // ... (نفس منطق الأحداث القديم بدون تغيير)
    content.querySelectorAll('[data-f]').forEach(inp => { inp.oninput = () => {
      const ei = inp.dataset.exam, qi = inp.dataset.q, i = inp.dataset.i, f = inp.dataset.f;
      if (inp.dataset.essay !== undefined) local.essay_exams[+inp.dataset.essay][f] = inp.value;
      else if (ei !== undefined) { if (qi !== undefined) local.mcq_exams[+ei].questions[+qi][f] = inp.value; else local.mcq_exams[+ei][f] = inp.value; }
      else if (i !== undefined) local[currentTab === 'videos' ? 'videos' : 'pdfs'][+i][f] = inp.value;
    };});
    content.querySelectorAll('[data-opt]').forEach(inp => { inp.oninput = () => { local.mcq_exams[+inp.dataset.exam].questions[+inp.dataset.q].options[+inp.dataset.opt].text = inp.value; }; });
    content.querySelectorAll('[data-correct]').forEach(r => { r.onchange = () => { local.mcq_exams[+r.dataset.exam].questions[+r.dataset.q].correctIndex = +r.dataset.correct; }; });
    content.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => { const t = b.dataset.del, i = +b.dataset.i; if (t === 'videos') local.videos.splice(i,1); if (t === 'pdfs') local.pdfs.splice(i,1); if (t === 'mcq') local.mcq_exams.splice(i,1); if (t === 'essay') local.essay_exams.splice(i,1); renderTab(); }; });
    content.querySelectorAll('[data-del-opt]').forEach(b => { b.onclick = () => { const [ei,qi,oi] = b.dataset.delOpt.split('_').map(Number); local.mcq_exams[ei].questions[qi].options.splice(oi,1); renderTab(); }; });
    content.querySelectorAll('[data-add-opt]').forEach(b => { b.onclick = () => { const [ei,qi] = b.dataset.addOpt.split('_').map(Number); local.mcq_exams[ei].questions[qi].options.push({text:''}); renderTab(); }; });
    content.querySelectorAll('[data-add-q]').forEach(b => { b.onclick = () => { const ei = +b.dataset.addQ; local.mcq_exams[ei].questions.push({questionText:'', options:[{text:''},{text:''}], correctIndex:0}); renderTab(); }; });
    const av = content.querySelector('#add-videos'); if (av) av.onclick = () => { local.videos.push({id: uid(), title:'', url:''}); renderTab(); };
    const ap = content.querySelector('#add-pdfs'); if (ap) ap.onclick = () => { local.pdfs.push({id: uid(), title:'', url:''}); renderTab(); };
    const am = content.querySelector('#add-mcq'); if (am) am.onclick = () => { local.mcq_exams.push({id: uid(), title:'', duration: 10, questions: []}); renderTab(); };
    const ae = content.querySelector('#add-essay'); if (ae) ae.onclick = () => { local.essay_exams.push({id: uid(), title:'', question:''}); renderTab(); };
  }

  m.root.querySelectorAll('.tab-btn').forEach(b => { b.onclick = () => { m.root.querySelectorAll('.tab-btn').forEach(x => { x.className = 'tab-btn px-4 py-2 rounded-lg bg-white/10 text-gray-300 text-sm font-bold'; }); b.className = 'tab-btn px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-bold'; currentTab = b.dataset.tab; renderTab(); }; });
  renderTab();
  
  m.root.querySelector('#cancel').onclick = () => m.close();
  m.root.querySelector('#save').onclick = async () => {
    try {
      const { error } = await supabase.from('lectures').update({ videos: local.videos, pdfs: local.pdfs, mcq_exams: local.mcq_exams, essay_exams: local.essay_exams }).eq('id', lecture.id);
      if (error) throw new Error(error.message);
      toast('تم الحفظ', 'success'); m.close(); await refreshLectures(); location.reload();
    } catch (e) { toast(e.message, 'error'); }
  };
}
