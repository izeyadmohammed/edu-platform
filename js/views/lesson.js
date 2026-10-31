import { supabase, store, refreshLectures } from '../config.js';
import { escapeHtml, watermark, youtubeEmbed, uid } from '../utils.js';
import { toast, modal } from '../ui.js';

export default async function lessonView(el, params) {
  const lectureId = params[0];
  const { data: lecture, error } = await supabase.from('lectures').select('*').eq('id', lectureId).single();
  if (error || !lecture) { el.innerHTML = `<p class="text-center py-10 text-red-500">المحاضرة غير موجودة</p>`; return; }
  
  const p = store.profile;
  const canEdit = p && (p.role === 'super_admin' || p.id === lecture.teacher_id || (p.role === 'assistant' && p.teacher_id === lecture.teacher_id));

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
          ${canEdit ? `<button id="edit-btn" class="px-4 py-2 bg-yellow-500/10 text-yellow-600 rounded-lg text-sm font-bold border border-yellow-500/20"><i class="fa-solid fa-pen"></i> تعديل</button>` : ''}
        </div>

        <div class="space-y-8">
          ${(lecture.videos||[]).map(v => `
            <div class="rounded-xl overflow-hidden bg-black shadow-2xl relative">
              <!-- حاوية الفيديو -->
              <div class="relative w-full aspect-video overflow-hidden bg-black" id="vid-container-${v.id}">
                <div class="video-wrapper absolute inset-0 w-full h-full" id="vid-wrap-${v.id}">
                  <iframe 
                    class="absolute w-[110%] h-[130%] -top-[15%] -left-[5%]" 
                    src="${youtubeEmbed(v.url)}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1" 
                    frameborder="0" 
                    allow="autoplay; encrypted-media; fullscreen" 
                    allowfullscreen>
                  </iframe>
                </div>
              </div>
              <!-- شريط التحكم اللي تحت الفيديو -->
              <div class="p-3 bg-gray-900 flex justify-between items-center">
                 <p class="font-bold text-white text-sm">${escapeHtml(v.title)}</p>
                 <button data-fullscreen="${v.id}" class="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition flex items-center gap-2">
                   <i class="fa-solid fa-expand"></i> تكبير الشاشة
                 </button>
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

  

  // تفعيل زرار التكبير
  el.querySelectorAll('[data-fullscreen]').forEach(btn => {
    btn.onclick = () => {
      const containerId = btn.dataset.fullscreen;
      const container = el.querySelector(`#vid-container-${containerId}`);
      if (container) {
        if (container.requestFullscreen) container.requestFullscreen();
        else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
        else if (container.msRequestFullscreen) container.msRequestFullscreen();
      }
    };
  });


  


  // إضافة العلامة المائية بحركة عشوائية
  if (p?.role === 'student') {
    (lecture.videos||[]).forEach(v => {
      const wrap = el.querySelector(`#vid-wrap-${v.id}`);
      if (wrap) {
        wrap.style.position = 'relative';
        wrap.style.overflow = 'hidden';
        
        const layer = document.createElement('div');
        layer.className = 'watermark-layer';
        const span = document.createElement('span');
        span.className = 'watermark-item';
        span.textContent = p.name + ' - ' + (p.phone||'');
        layer.appendChild(span);
        wrap.appendChild(layer);

        // حركة عشوائية كل 3 ثواني
        setInterval(() => {
          const top = Math.random() * 80; // من 0% لـ 80%
          const left = Math.random() * 80; // من 0% لـ 80%
          span.style.top = top + '%';
          span.style.left = left + '%';
        }, 3000); // كل 3 ثواني
      }
    });
  }

  if (canEdit) {
    el.querySelector('#edit-btn').onclick = () => openLectureEditor(lecture);
  }
}



// دالة تعديل المحاضرة


// ==========================================
// دالة تعديل المحاضرة (النسخة المطورة)
// ==========================================


// ==========================================
// محرر المحاضرة (النسخة النهائية مع زر رفع الصور)
// ==========================================
export async function openLectureEditor(lecture) {
  const local = JSON.parse(JSON.stringify({ 
    videos: lecture.videos || [], 
    pdfs: lecture.pdfs || [], 
    mcq_exams: lecture.mcq_exams || [], 
    essay_exams: lecture.essay_exams || [] 
  }));

  const m = modal({ 
    title: 'تعديل محتوى المحاضرة', 
    body: `
      <div class="flex gap-2 mb-4 border-b border-border pb-2 overflow-x-auto">
        <button data-tab="videos" class="tab-btn px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-bold whitespace-nowrap">فيديوهات</button>
        <button data-tab="pdfs" class="tab-btn px-4 py-2 rounded-lg bg-black/5 dark:bg-white/5 text-muted text-sm font-bold whitespace-nowrap">مذكرات</button>
        <button data-tab="mcq" class="tab-btn px-4 py-2 rounded-lg bg-black/5 dark:bg-white/5 text-muted text-sm font-bold whitespace-nowrap">MCQ</button>
        <button data-tab="essay" class="tab-btn px-4 py-2 rounded-lg bg-black/5 dark:bg-white/5 text-muted text-sm font-bold whitespace-nowrap">واجبات</button>
      </div>
      <div id="tab-content"></div>`,
    actions: `<button id="cancel" class="px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg font-bold text-main">إلغاء</button><button id="save" class="btn-primary">حفظ التغييرات</button>` 
  });
  
  const content = m.root.querySelector('#tab-content');
  let currentTab = 'videos';

  function renderTab() {
    if (currentTab === 'videos') {
      content.innerHTML = `
        ${local.videos.map((v, i) => `
          <div class="grid grid-cols-2 gap-2 mb-2 items-end">
            <input data-i="${i}" data-f="title" value="${escapeHtml(v.title)}" placeholder="العنوان" class="input-field text-sm">
            <div class="flex gap-1">
              <input data-i="${i}" data-f="url" value="${escapeHtml(v.url)}" placeholder="YouTube URL" class="input-field text-sm">
              <button data-del="videos" data-i="${i}" class="px-3 text-red-500">✕</button>
            </div>
          </div>`).join('')}
        <button id="add-videos" class="text-blue-500 text-sm font-bold mt-2">+ إضافة فيديو</button>`;
    } else if (currentTab === 'pdfs') {
      content.innerHTML = `
        ${local.pdfs.map((v, i) => `
          <div class="grid grid-cols-2 gap-2 mb-2">
            <input data-i="${i}" data-f="title" value="${escapeHtml(v.title)}" placeholder="العنوان" class="input-field text-sm">
            <div class="flex gap-1">
              <input data-i="${i}" data-f="url" value="${escapeHtml(v.url)}" placeholder="PDF URL" class="input-field text-sm">
              <button data-del="pdfs" data-i="${i}" class="px-3 text-red-500">✕</button>
            </div>
          </div>`).join('')}
        <button id="add-pdfs" class="text-blue-500 text-sm font-bold mt-2">+ إضافة مذكرة</button>`;
    } else if (currentTab === 'mcq') {
      content.innerHTML = `
        ${local.mcq_exams.map((ex, ei) => `
          <div class="border border-border rounded-xl p-4 mb-3">
            <div class="flex gap-2 mb-2">
              <input data-exam="${ei}" data-f="title" value="${escapeHtml(ex.title)}" placeholder="عنوان الامتحان" class="input-field text-sm flex-1">
              <input data-exam="${ei}" data-f="duration" type="number" value="${ex.duration||''}" placeholder="دقيقة" class="input-field text-sm w-24">
              <button data-del="mcq" data-i="${ei}" class="px-3 text-red-500">✕</button>
            </div>
            ${(ex.questions||[]).map((q, qi) => `
              <div class="bg-black/5 dark:bg-black/20 p-3 rounded-lg mb-3">
                <div class="flex gap-2 mb-2 items-start">
                  <input data-exam="${ei}" data-q="${qi}" data-f="questionText" value="${escapeHtml(q.questionText)}" placeholder="نص السؤال" class="input-field text-sm flex-1">
                  <div class="flex gap-1 shrink-0">
                    <label class="cursor-pointer bg-blue-500/10 text-blue-500 rounded px-2 py-2 text-sm flex items-center justify-center" title="رفع صورة من المعرض">
                      <i class="fa-solid fa-image"></i>
                      <input type="file" class="hidden" data-img-exam="${ei}" data-img-q="${qi}" accept="image/*">
                    </label>
                    <label class="cursor-pointer bg-green-500/10 text-green-500 rounded px-2 py-2 text-sm flex items-center justify-center" title="تصوير السؤال بالكاميرا">
                      <i class="fa-solid fa-camera"></i>
                      <input type="file" class="hidden" data-cam-exam="${ei}" data-cam-q="${qi}" accept="image/*" capture="environment">
                    </label>
                  </div>
                </div>
                ${q.image ? `<img src="${q.image}" class="h-16 rounded mb-2 border border-border object-contain">` : ''}
                ${(q.options||[]).map((o, oi) => `
                  <div class="flex gap-2 items-center mb-2">
                    <input type="radio" name="correct_${ei}_${qi}" ${q.correctIndex===oi?'checked':''} data-exam="${ei}" data-q="${qi}" data-correct="${oi}" class="accent-blue-500">
                    <input data-exam="${ei}" data-q="${qi}" data-opt="${oi}" value="${escapeHtml(o.text)}" placeholder="خيار" class="input-field text-sm">
                    <button data-del-opt="${ei}_${qi}_${oi}" class="text-red-500">✕</button>
                  </div>`).join('')}
                <div class="flex gap-2 mt-1">
                  <button data-add-opt="${ei}_${qi}" class="text-blue-500 text-xs font-bold">+ خيار</button>
                  <button data-copy-q="${ei}_${qi}" class="text-green-500 text-xs font-bold">📋 نسخ السؤال</button>
                </div>
              </div>
            `).join('')}
            <button data-add-q="${ei}" class="text-blue-500 text-xs font-bold mt-1">+ سؤال</button>
          </div>`).join('')}
        <button id="add-mcq" class="text-blue-500 text-sm font-bold mt-2">+ إضافة امتحان MCQ</button>`;
    } else {
      content.innerHTML = `
        ${local.essay_exams.map((ex, i) => `
          <div class="border border-border rounded-xl p-4 mb-3">
            <div class="flex gap-2 mb-2">
              <input data-essay="${i}" data-f="title" value="${escapeHtml(ex.title)}" placeholder="العنوان" class="input-field text-sm">
              <input data-essay="${i}" data-f="duration" type="number" value="${ex.duration||''}" placeholder="دقيقة" class="input-field text-sm w-24">
              <button data-del="essay" data-i="${i}" class="px-3 text-red-500">✕</button>
            </div>
            <textarea data-essay="${i}" data-f="question" placeholder="نص السؤال" class="input-field text-sm h-20">${escapeHtml(ex.question)}</textarea>
          </div>`).join('')}
        <button id="add-essay" class="text-blue-500 text-sm font-bold mt-2">+ إضافة واجب</button>`;
    }
    bindTabEvents();
  }

  function bindTabEvents() {
    // رفع الصور
    // رفع من المعرض
    content.querySelectorAll('input[data-img-exam]').forEach(inp => {
      inp.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        toast('جاري رفع الصورة...', 'info');
        const fileName = `q_${Date.now()}_${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('images').upload(fileName, file);
        if (error) { toast('فشل الرفع', 'error'); return; }
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        const ei = +inp.dataset.imgExam;
        const qi = +inp.dataset.imgQ;
        local.mcq_exams[ei].questions[qi].image = data.publicUrl;
        toast('تم الرفع', 'success');
        renderTab();
      };
    });
    
    // تصوير بالكاميرا
    content.querySelectorAll('input[data-cam-exam]').forEach(inp => {
      inp.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        toast('جاري رفع الصورة...', 'info');
        const fileName = `cam_${Date.now()}_${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('images').upload(fileName, file);
        if (error) { toast('فشل الرفع', 'error'); return; }
        const { data } = await supabase.storage.from('images').getPublicUrl(fileName);
        const ei = +inp.dataset.camExam;
        const qi = +inp.dataset.camQ;
        local.mcq_exams[ei].questions[qi].image = data.publicUrl;
        toast('تم التصوير بنجاح', 'success');
        renderTab();
      };
    });
    
    // نسخ سؤال
    content.querySelectorAll('[data-copy-q]').forEach(b => {
      b.onclick = () => {
        const [ei, qi] = b.dataset.copyQ.split('_').map(Number);
        const q = JSON.parse(JSON.stringify(local.mcq_exams[ei].questions[qi]));
        local.mcq_exams[ei].questions.push(q);
        renderTab();
      };
    });

    content.querySelectorAll('[data-f]').forEach(inp => { 
      inp.oninput = () => {
        const ei = inp.dataset.exam, qi = inp.dataset.q, i = inp.dataset.i, f = inp.dataset.f;
        if (inp.dataset.essay !== undefined) local.essay_exams[+inp.dataset.essay][f] = inp.value;
        else if (ei !== undefined) { if (qi !== undefined) local.mcq_exams[+ei].questions[+qi][f] = inp.value; else local.mcq_exams[+ei][f] = inp.value; }
        else if (i !== undefined) local[currentTab === 'videos' ? 'videos' : 'pdfs'][+i][f] = inp.value;
      };
    });
    
    content.querySelectorAll('[data-opt]').forEach(inp => { inp.oninput = () => { local.mcq_exams[+inp.dataset.exam].questions[+inp.dataset.q].options[+inp.dataset.opt].text = inp.value; }; });
    content.querySelectorAll('[data-correct]').forEach(r => { r.onchange = () => { local.mcq_exams[+r.dataset.exam].questions[+r.dataset.q].correctIndex = +r.dataset.correct; }; });
    content.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => { const t = b.dataset.del, i = +b.dataset.i; if (t === 'videos') local.videos.splice(i,1); if (t === 'pdfs') local.pdfs.splice(i,1); if (t === 'mcq') local.mcq_exams.splice(i,1); if (t === 'essay') local.essay_exams.splice(i,1); renderTab(); }; });
    content.querySelectorAll('[data-del-opt]').forEach(b => { b.onclick = () => { const [ei,qi,oi] = b.dataset.delOpt.split('_').map(Number); local.mcq_exams[ei].questions[qi].options.splice(oi,1); renderTab(); }; });
    content.querySelectorAll('[data-add-opt]').forEach(b => { b.onclick = () => { const [ei,qi] = b.dataset.addOpt.split('_').map(Number); local.mcq_exams[ei].questions[qi].options.push({text:''}); renderTab(); }; });
    content.querySelectorAll('[data-add-q]').forEach(b => { b.onclick = () => { const ei = +b.dataset.addQ; local.mcq_exams[ei].questions.push({questionText:'', options:[{text:''},{text:''}], correctIndex:0}); renderTab(); }; });
    const av = content.querySelector('#add-videos'); if (av) av.onclick = () => { local.videos.push({id: uid(), title:'', url:''}); renderTab(); };
    const ap = content.querySelector('#add-pdfs'); if (ap) ap.onclick = () => { local.pdfs.push({id: uid(), title:'', url:''}); renderTab(); };
    const am = content.querySelector('#add-mcq'); if (am) am.onclick = () => { local.mcq_exams.push({id: uid(), title:'', duration: 10, questions: []}); renderTab(); };
    const ae = content.querySelector('#add-essay'); if (ae) ae.onclick = () => { local.essay_exams.push({id: uid(), title:'', question:'', duration: 30}); renderTab(); };
  }

  m.root.querySelectorAll('.tab-btn').forEach(b => { 
    b.onclick = () => { 
      m.root.querySelectorAll('.tab-btn').forEach(x => { x.className = 'tab-btn px-4 py-2 rounded-lg bg-black/5 dark:bg-white/5 text-muted text-sm font-bold whitespace-nowrap'; }); 
      b.className = 'tab-btn px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-bold whitespace-nowrap'; 
      currentTab = b.dataset.tab; renderTab(); 
    }; 
  });
  renderTab();
  
  m.root.querySelector('#cancel').onclick = () => m.close();
  m.root.querySelector('#save').onclick = async () => {
    try {
      const { error } = await supabase.from('lectures').update({ 
        videos: local.videos, 
        pdfs: local.pdfs, 
        mcq_exams: local.mcq_exams, 
        essay_exams: local.essay_exams 
      }).eq('id', lecture.id);
      if (error) throw new Error(error.message);
      toast('تم الحفظ بنجاح', 'success'); m.close(); await refreshLectures(); location.reload();
    } catch (e) { toast(e.message, 'error'); }
  };
}
