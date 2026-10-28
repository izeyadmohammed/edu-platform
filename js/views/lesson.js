import { supabase, store, refreshLectures } from '../config.js';
import { escapeHtml, watermark, youtubeEmbed, uid } from '../utils.js';
import { toast, modal } from '../ui.js';
export default async function lessonView(el, params) {
  const lectureId = params[0];
  const { data: lecture, error } = await supabase.from('lectures').select('*').eq('id', lectureId).single();
  if (error || !lecture) { el.innerHTML = `<p class="text-center py-10 text-red-600">المحاضرة غير موجودة</p>`; return; }
  const { data: course } = await supabase.from('courses').select('*').eq('id', lecture.course_id).single();
  const p = store.profile;
  const canEdit = p && (p.role === 'super_admin' || p.id === lecture.teacher_id);
  el.innerHTML = `<div class="flex items-center gap-2 mb-3 text-sm"><a href="#/courses/${lecture.course_id}" class="text-blue-600 hover:underline"><i class="fa-solid fa-arrow-right"></i> ${escapeHtml(course?.title || 'الكورس')}</a></div>
    <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow relative" id="lesson-wrap">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2"><h1 class="text-2xl font-extrabold">${escapeHtml(lecture.title)}</h1>
      ${canEdit ? `<button id="edit-btn" class="px-3 py-1 bg-yellow-500 text-white rounded text-sm"><i class="fa-solid fa-pen"></i> تعديل المحتوى</button>` : ''}</div>
      <section class="mb-6"><h2 class="text-lg font-bold mb-2"><i class="fa-solid fa-video text-blue-600"></i> الفيديوهات</h2>
        <div class="space-y-3">${(lecture.videos||[]).map(v => `<div class="rounded-lg overflow-hidden bg-black"><iframe class="w-full aspect-video" src="${youtubeEmbed(v.url)}" frameborder="0" allowfullscreen></iframe><p class="p-2 text-sm bg-gray-100 dark:bg-slate-700">${escapeHtml(v.title)}</p></div>`).join('') || '<p class="text-gray-500 text-sm">لا توجد فيديوهات</p>'}</div></section>
      <section class="mb-6"><h2 class="text-lg font-bold mb-2"><i class="fa-solid fa-file-pdf text-red-600"></i> المذكرات</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${(lecture.pdfs||[]).map(pdf => `<a target="_blank" href="${escapeHtml(pdf.url)}" class="flex items-center gap-2 p-3 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"><i class="fa-solid fa-file-pdf text-red-500"></i><span class="text-sm">${escapeHtml(pdf.title)}</span></a>`).join('') || '<p class="text-gray-500 text-sm">لا توجد مذكرات</p>'}</div></section>
      <section class="mb-6"><h2 class="text-lg font-bold mb-2"><i class="fa-solid fa-list-check text-purple-600"></i> اختبارات MCQ</h2>
        <div class="space-y-2">${(lecture.mcq_exams||[]).map(ex => `<div class="flex items-center justify-between p-3 bg-gray-100 dark:bg-slate-700 rounded-lg"><span>${escapeHtml(ex.title)} (${ex.questions?.length || 0} سؤال)</span><a href="#/exam/${lecture.id}/${ex.id}" class="px-3 py-1 bg-purple-600 text-white rounded text-sm">ابدأ</a></div>`).join('') || '<p class="text-gray-500 text-sm">لا توجد اختبارات</p>'}</div></section>
      <section><h2 class="text-lg font-bold mb-2"><i class="fa-solid fa-pen-to-square text-orange-600"></i> الواجبات</h2>
        <div class="space-y-2">${(lecture.essay_exams||[]).map(ex => `<div class="flex items-center justify-between p-3 bg-gray-100 dark:bg-slate-700 rounded-lg"><span>${escapeHtml(ex.title)}</span><a href="#/assignment/${lecture.id}/${ex.id}" class="px-3 py-1 bg-orange-600 text-white rounded text-sm">فتح</a></div>`).join('') || '<p class="text-gray-500 text-sm">لا توجد واجبات</p>'}</div></section>
    </div>`;
  if (p?.role === 'student') watermark(el.querySelector('#lesson-wrap'), p.name + ' - ' + (p.phone||''));
  if (canEdit) el.querySelector('#edit-btn').onclick = () => openLectureEditor(lecture);
}
export async function openLectureEditor(lecture) {
  const local = JSON.parse(JSON.stringify({ videos: lecture.videos || [], pdfs: lecture.pdfs || [], mcq_exams: lecture.mcq_exams || [], essay_exams: lecture.essay_exams || [] }));
  const m = modal({ title: 'تعديل محتوى المحاضرة', body: `<div class="flex gap-2 mb-3 border-b dark:border-slate-700 pb-2">
      <button data-tab="videos" class="tab-btn px-3 py-1 rounded bg-blue-600 text-white">فيديوهات</button>
      <button data-tab="pdfs" class="tab-btn px-3 py-1 rounded bg-gray-200 dark:bg-slate-700">مذكرات</button>
      <button data-tab="mcq" class="tab-btn px-3 py-1 rounded bg-gray-200 dark:bg-slate-700">MCQ</button>
      <button data-tab="essay" class="tab-btn px-3 py-1 rounded bg-gray-200 dark:bg-slate-700">واجبات</button></div><div id="tab-content"></div>`,
    actions: `<button id="cancel" class="px-4 py-2 bg-gray-300 dark:bg-slate-700 rounded">إلغاء</button><button id="save" class="px-4 py-2 bg-blue-600 text-white rounded font-bold">حفظ</button>` });
  const content = m.root.querySelector('#tab-content');
  let currentTab = 'videos';
  function renderTab() {
    if (currentTab === 'videos') {
      content.innerHTML = `${local.videos.map((v, i) => `<div class="grid grid-cols-2 gap-2 mb-2 items-end"><input data-i="${i}" data-f="title" value="${escapeHtml(v.title)}" placeholder="العنوان" class="px-2 py-1 border rounded dark:bg-slate-900 dark:border-slate-700"><div class="flex gap-1"><input data-i="${i}" data-f="url" value="${escapeHtml(v.url)}" placeholder="YouTube URL" class="flex-1 px-2 py-1 border rounded dark:bg-slate-900 dark:border-slate-700"><button data-del="videos" data-i="${i}" class="px-2 text-red-600">✕</button></div></div>`).join('')}<button id="add-videos" class="text-blue-600 text-sm">+ إضافة فيديو</button>`;
    } else if (currentTab === 'pdfs') {
      content.innerHTML = `${local.pdfs.map((v, i) => `<div class="grid grid-cols-2 gap-2 mb-2"><input data-i="${i}" data-f="title" value="${escapeHtml(v.title)}" placeholder="العنوان" class="px-2 py-1 border rounded dark:bg-slate-900 dark:border-slate-700"><div class="flex gap-1"><input data-i="${i}" data-f="url" value="${escapeHtml(v.url)}" placeholder="PDF URL" class="flex-1 px-2 py-1 border rounded dark:bg-slate-900 dark:border-slate-700"><button data-del="pdfs" data-i="${i}" class="px-2 text-red-600">✕</button></div></div>`).join('')}<button id="add-pdfs" class="text-blue-600 text-sm">+ إضافة مذكرة</button>`;
    } else if (currentTab === 'mcq') {
      content.innerHTML = `${local.mcq_exams.map((ex, ei) => `<div class="border rounded p-2 mb-3 dark:border-slate-700"><div class="flex gap-1 mb-2"><input data-exam="${ei}" data-f="title" value="${escapeHtml(ex.title)}" placeholder="عنوان الامتحان" class="flex-1 px-2 py-1 border rounded dark:bg-slate-900 dark:border-slate-700"><input data-exam="${ei}" data-f="duration" type="number" value="${ex.duration||''}" placeholder="دقيقة" class="w-20 px-2 py-1 border rounded dark:bg-slate-900 dark:border-slate-700"><button data-del="mcq" data-i="${ei}" class="px-2 text-red-600">✕</button></div>${(ex.questions||[]).map((q, qi) => `<div class="bg-gray-50 dark:bg-slate-900 p-2 rounded mb-1"><input data-exam="${ei}" data-q="${qi}" data-f="questionText" value="${escapeHtml(q.questionText)}" placeholder="نص السؤال" class="w-full px-2 py-1 border rounded mb-1 dark:bg-slate-800 dark:border-slate-700">${(q.options||[]).map((o, oi) => `<div class="flex gap-1 items-center mb-1"><input type="radio" name="correct_${ei}_${qi}" ${q.correctIndex===oi?'checked':''} data-exam="${ei}" data-q="${qi}" data-correct="${oi}"><input data-exam="${ei}" data-q="${qi}" data-opt="${oi}" value="${escapeHtml(o.text)}" placeholder="خيار" class="flex-1 px-2 py-1 border rounded text-sm dark:bg-slate-800 dark:border-slate-700"><button data-del-opt="${ei}_${qi}_${oi}" class="text-red-600">✕</button></div>`).join('')}<button data-add-opt="${ei}_${qi}" class="text-blue-600 text-xs">+ خيار</button></div>`).join('')}<button data-add-q="${ei}" class="text-blue-600 text-xs mt-1">+ سؤال</button></div>`).join('')}<button id="add-mcq" class="text-blue-600 text-sm">+ إضافة امتحان MCQ</button>`;
    } else {
      content.innerHTML = `${local.essay_exams.map((ex, i) => `<div class="border rounded p-2 mb-2 dark:border-slate-700"><div class="flex gap-1 mb-1"><input data-essay="${i}" data-f="title" value="${escapeHtml(ex.title)}" placeholder="العنوان" class="flex-1 px-2 py-1 border rounded dark:bg-slate-900 dark:border-slate-700"><button data-del="essay" data-i="${i}" class="px-2 text-red-600">✕</button></div><textarea data-essay="${i}" data-f="question" placeholder="نص السؤال" class="w-full px-2 py-1 border rounded dark:bg-slate-900 dark:border-slate-700">${escapeHtml(ex.question)}</textarea></div>`).join('')}<button id="add-essay" class="text-blue-600 text-sm">+ إضافة واجب</button>`;
    }
    bindTabEvents();
  }
  function bindTabEvents() {
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
  m.root.querySelectorAll('.tab-btn').forEach(b => { b.onclick = () => { m.root.querySelectorAll('.tab-btn').forEach(x => { x.className = 'tab-btn px-3 py-1 rounded bg-gray-200 dark:bg-slate-700'; }); b.className = 'tab-btn px-3 py-1 rounded bg-blue-600 text-white'; currentTab = b.dataset.tab; renderTab(); }; });
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
