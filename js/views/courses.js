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
    const f = list.filter(c => c.grade === p.grade);
    if (f.length) list = f;
  }
  el.innerHTML = `<h2 class="text-2xl font-extrabold mb-4">جميع الكورسات</h2>
    ${list.length === 0 ? `<p class="text-center text-gray-500 py-10">لا توجد كورسات</p>` : ''}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      ${list.map(c => `<a href="#/courses/${c.id}" class="block bg-white dark:bg-slate-800 rounded-xl shadow hover:shadow-lg transition overflow-hidden">
        <div class="h-40 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-5xl overflow-hidden">${c.image ? `<img src="${escapeHtml(c.image)}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-book-open"></i>`}</div>
        <div class="p-4"><h3 class="font-bold mb-1 truncate">${escapeHtml(c.title)}</h3><p class="text-sm text-gray-500 mb-2">${escapeHtml(c.grade || '')}</p>
          <div class="flex justify-between items-center"><span class="text-blue-600 font-bold">${formatMoney(c.price)}</span><span class="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">تفاصيل</span></div>
        </div></a>`).join('')}
    </div>`;
}
async function courseDetail(el, id) {
  const { data: course, error } = await supabase.from('courses').select('*').eq('id', id).single();
  if (error || !course) { el.innerHTML = `<p class="text-center py-10 text-red-600">الكورس غير موجود</p>`; return; }
  const { data: teacher } = await supabase.from('profiles').select('*').eq('id', course.teacher_id).single();
  const { data: lectures } = await supabase.from('lectures').select('*').eq('course_id', id).order('created_at');
  const p = store.profile;
  const enrolled = p?.enrolled_courses?.includes(id);
  el.innerHTML = `<div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
    <div class="h-64 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-7xl">${course.image ? `<img src="${escapeHtml(course.image)}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-book-open"></i>`}</div>
    <div class="p-6">
      <h1 class="text-2xl font-extrabold mb-2">${escapeHtml(course.title)}</h1>
      <p class="text-sm text-gray-500 mb-3">${escapeHtml(course.grade)} • المدرس: ${escapeHtml(teacher?.name || '-')}</p>
      <p class="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">${escapeHtml(course.description || '')}</p>
      <div class="flex flex-wrap gap-3 items-center">
        <span class="text-2xl font-extrabold text-blue-600">${formatMoney(course.price)}</span>
        ${enrolled ? `<span class="px-4 py-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-lg font-bold"><i class="fa-solid fa-check"></i> مشترك</span>` : `<button id="enroll-btn" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold">اشترك الآن</button>`}
      </div></div></div>
    <h2 class="text-xl font-extrabold mt-6 mb-3">المحاضرات (${lectures?.length || 0})</h2>
    <div class="space-y-2">${(lectures || []).map((l, i) => `
      <div class="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between shadow">
        <div class="flex items-center gap-3"><span class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">${i+1}</span>
          <div><p class="font-bold">${escapeHtml(l.title)}</p><p class="text-xs text-gray-500">${(l.videos||[]).length} فيديو • ${(l.pdfs||[]).length} مذكرة • ${(l.mcq_exams||[]).length + (l.essay_exams||[]).length} امتحان</p></div></div>
        ${(enrolled || l.is_preview || p?.role === 'super_admin' || p?.role === 'teacher') ? `<a href="#/lesson/${l.id}" class="px-3 py-1 bg-blue-600 text-white rounded text-sm">فتح</a>` : `<span class="text-xs text-gray-400">🔒 اشترك للوصول</span>`}
      </div>`).join('') || '<p class="text-gray-500">لا توجد محاضرات</p>'}</div>`;
  const eb = el.querySelector('#enroll-btn');
  if (eb) eb.onclick = async () => {
    if (!store.profile) { toast('سجّل دخول أولاً', 'warn'); location.hash = '#/login'; return; }
    try {
      const { error } = await supabase.rpc('enroll_course', { course_id_input: id });
      if (error) throw new Error(error.message);
      toast('تم الاشتراك بنجاح', 'success');
      const { loadProfile } = await import('../auth.js'); await loadProfile();
      const { renderHeader } = await import('../ui.js'); renderHeader();
      location.reload();
    } catch (err) { toast(err.message, 'error'); }
  };
}
