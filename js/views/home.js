import { store } from '../config.js';
import { escapeHtml, formatMoney } from '../utils.js';
export default async function homeView(el) {
  const profile = store.profile;
  const isStudent = profile?.role === 'student';
  let courses = store.courses;
  if (isStudent && profile.grade) {
    const filtered = courses.filter(c => c.grade === profile.grade);
    if (filtered.length) courses = filtered;
  }
  el.innerHTML = `
    <section class="relative bg-gradient-to-l from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-800 dark:to-indigo-900 rounded-2xl p-8 md:p-12 text-white overflow-hidden mb-8">
      <div class="absolute inset-0 opacity-10 text-[200px] flex items-center justify-center"><i class="fa-solid fa-graduation-cap"></i></div>
      <div class="relative z-10">
        <h1 class="text-3xl md:text-5xl font-extrabold mb-3">تعلّم بذكاء – حقق حلمك</h1>
        <p class="text-lg opacity-90 mb-6">منصة تعليمية متكاملة للطلاب والمدرسين</p>
        <div class="flex flex-wrap gap-3">
          <a href="#/courses" class="px-6 py-3 bg-white text-blue-700 font-bold rounded-lg hover:bg-gray-100">تصفح الكورسات</a>
          ${!profile ? `<a href="#/signup" class="px-6 py-3 bg-green-500 hover:bg-green-600 font-bold rounded-lg">سجّل الآن</a>` : ''}
        </div>
      </div>
    </section>
    <section class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white dark:bg-slate-800 rounded-xl p-4 text-center shadow"><i class="fa-solid fa-book text-blue-600 text-3xl mb-2"></i><p class="text-2xl font-extrabold">${store.courses.length}</p><p class="text-sm text-gray-500">كورس</p></div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-4 text-center shadow"><i class="fa-solid fa-user-tie text-green-600 text-3xl mb-2"></i><p class="text-2xl font-extrabold">${store.teachers.length}</p><p class="text-sm text-gray-500">مدرس</p></div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-4 text-center shadow"><i class="fa-solid fa-play-circle text-purple-600 text-3xl mb-2"></i><p class="text-2xl font-extrabold">${store.lectures.length}</p><p class="text-sm text-gray-500">محاضرة</p></div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-4 text-center shadow"><i class="fa-solid fa-shield-halved text-orange-600 text-3xl mb-2"></i><p class="text-2xl font-extrabold">24/7</p><p class="text-sm text-gray-500">متابعة</p></div>
    </section>
    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-extrabold">${isStudent ? 'كورسات صفك' : 'أحدث الكورسات'}</h2>
        <a href="#/courses" class="text-blue-600 hover:underline text-sm">عرض الكل</a>
      </div>
      ${courses.length === 0 ? `<p class="text-gray-500 text-center py-10">لا توجد كورسات بعد</p>` : ''}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        ${courses.slice(0, 9).map(c => courseCard(c)).join('')}
      </div>
    </section>`;
}
function courseCard(c) {
  return `<a href="#/courses/${c.id}" class="block bg-white dark:bg-slate-800 rounded-xl shadow hover:shadow-lg transition overflow-hidden">
    <div class="h-40 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-5xl overflow-hidden">
      ${c.image ? `<img src="${escapeHtml(c.image)}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-book-open"></i>`}
    </div>
    <div class="p-4">
      <h3 class="font-bold mb-1 truncate">${escapeHtml(c.title)}</h3>
      <p class="text-sm text-gray-500 mb-2">${escapeHtml(c.grade || '')}</p>
      <div class="flex items-center justify-between">
        <span class="text-blue-600 font-bold">${formatMoney(c.price)}</span>
        <span class="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">تفاصيل</span>
      </div>
    </div></a>`;
}
