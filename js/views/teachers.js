import { supabase, store } from '../config.js';
import { escapeHtml, formatMoney } from '../utils.js';

export default async function teachersView(el, params) {
  if (params && params[0]) return teacherCourses(el, params[0]);
  el.innerHTML = `
    <h2 class="text-2xl font-extrabold mb-4">المدرسون</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${store.teachers.map(t => `
        <a href="#/teachers/${t.id}" class="block bg-white dark:bg-slate-800 rounded-xl p-4 shadow hover:shadow-lg transition">
          <div class="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl mb-2">
            <i class="fa-solid fa-user-tie"></i>
          </div>
          <h3 class="font-bold">${escapeHtml(t.name)}</h3>
          <p class="text-sm text-gray-500">${escapeHtml(t.grade || '')}</p>
        </a>`).join('') || '<p class="text-gray-500">لا يوجد مدرسون</p>'}
    </div>`;
}

async function teacherCourses(el, id) {
  const { data: teacher } = await supabase.from('profiles').select('*').eq('id', id).single();
  const courses = store.courses.filter(c => c.teacher_id === id);
  el.innerHTML = `
    <h2 class="text-2xl font-extrabold mb-2">${escapeHtml(teacher?.name || 'المدرس')}</h2>
    <p class="text-gray-500 mb-4">${escapeHtml(teacher?.grade || '')}</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${courses.map(c => `
        <a href="#/courses/${c.id}" class="block bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden hover:shadow-lg">
          <div class="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl">
            ${c.image ? `<img src="${escapeHtml(c.image)}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-book"></i>`}
          </div>
          <div class="p-3">
            <p class="font-bold truncate">${escapeHtml(c.title)}</p>
            <p class="text-sm text-gray-500">${escapeHtml(c.grade)}</p>
            <p class="text-blue-600 font-bold">${formatMoney(c.price)}</p>
          </div>
        </a>`).join('') || '<p class="text-gray-500">لا يوجد كورسات</p>'}
    </div>`;
}
