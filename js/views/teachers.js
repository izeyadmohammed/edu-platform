import { supabase, store } from '../config.js';
import { escapeHtml, formatMoney } from '../utils.js';

export default async function teachersView(el, params) {
  if (params && params[0]) return teacherCourses(el, params[0]);
  el.innerHTML = `
    <div class="mb-8 animate-fade-up">
      <h2 class="text-3xl font-black mb-2 text-main">المدرسون</h2>
      <p class="text-muted">تعرف على نخبة من أفضل المدرسين</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
      ${store.teachers.map(t => `
        <a href="#/teachers/${t.id}" class="glass-card p-6 text-center group">
          <div class="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-primary/20 group-hover:border-primary transition">
            ${t.image ? `<img src="${t.image}" class="w-full h-full object-cover">` : `<div class="w-full h-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-4xl font-black">${(t.name||'?').charAt(0)}</div>`}
          </div>
          <h3 class="font-bold text-lg text-main mb-1">${escapeHtml(t.name)}</h3>
          <p class="text-sm text-muted">${escapeHtml(t.grade || '')}</p>
        </a>
      `).join('') || '<p class="text-muted text-center">لا يوجد مدرسون</p>'}
    </div>`;
}

async function teacherCourses(el, id) {
  const { data: teacher } = await supabase.from('profiles').select('*').eq('id', id).single();
  let courses = store.courses.filter(c => c.teacher_id === id);
  const p = store.profile;
  
  if (p?.role === 'student' && p.grade) courses = courses.filter(c => c.grade === p.grade);

  el.innerHTML = `
    <div class="glass-card p-6 mb-8 flex items-center gap-6 animate-fade-up">
      <div class="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 shrink-0">
        ${teacher?.image ? `<img src="${teacher.image}" class="w-full h-full object-cover">` : `<div class="w-full h-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-4xl font-black">${(teacher?.name||'?').charAt(0)}</div>`}
      </div>
      <div>
        <h2 class="text-3xl font-black text-main mb-2">${escapeHtml(teacher?.name || 'المدرس')}</h2>
        <p class="text-muted font-bold">${escapeHtml(teacher?.grade || '')}</p>
      </div>
    </div>
    
    ${courses.length === 0 
      ? `<div class="glass-card p-12 text-center text-muted"><i class="fa-solid fa-box-open text-5xl mb-4 opacity-50"></i><p class="text-lg font-bold">لا توجد كورسات متاحة لصفك حالياً من هذا المدرس</p></div>` 
      : `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
          ${courses.map(c => `
            <a href="#/courses/${c.id}" class="glass-card overflow-hidden group">
              <div class="h-40 bg-gray-200 dark:bg-gray-800 overflow-hidden">
                ${c.image ? `<img src="${escapeHtml(c.image)}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">` : `<div class="w-full h-full flex items-center justify-center text-5xl text-gray-400"><i class="fa-solid fa-book"></i></div>`}
              </div>
              <div class="p-4">
                <p class="font-bold text-main truncate">${escapeHtml(c.title)}</p>
                <p class="text-sm text-muted">${escapeHtml(c.grade)}</p>
                <p class="text-primary font-bold">${formatMoney(c.price)}</p>
              </div>
            </a>`).join('')}
        </div>`}
  `;
}
