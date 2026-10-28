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
  
  // فلترة صارمة: لو طالب، اعرض كورسات صفه فقط
  if (p?.role === 'student' && p.grade) {
    list = list.filter(c => c.grade === p.grade);
  }
  
  el.innerHTML = `
    <div class="mb-8 animate-fade-up">
      <h2 class="text-3xl font-black mb-2">
        ${p?.role === 'student' ? 'كورسات ' + escapeHtml(p.grade || 'صفك') : 'تصفح'} 
        <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">الكورسات</span>
      </h2>
    </div>
    
    ${list.length === 0 ? `<div class="glass-card p-12 text-center text-gray-400">لا توجد كورسات متاحة حالياً</div>` : ''}
    
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
      ${list.map(c => `
        <a href="#/courses/${c.id}" class="glass-card overflow-hidden group">
          <div class="h-48 bg-gray-800 relative overflow-hidden">
            ${c.image ? `<img src="${escapeHtml(c.image)}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">` : `<div class="w-full h-full flex items-center justify-center text-5xl text-gray-600"><i class="fa-solid fa-book-open"></i></div>`}
            <div class="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">${escapeHtml(c.grade || 'عام')}</div>
          </div>
          <div class="p-5">
            <h3 class="font-extrabold text-lg mb-2 truncate group-hover:text-blue-400 transition">${escapeHtml(c.title)}</h3>
            <div class="flex items-center justify-between mt-4">
              <span class="text-blue-400 font-black text-xl">${formatMoney(c.price)}</span>
              <span class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 transition"><i class="fa-solid fa-arrow-left text-xs"></i></span>
            </div>
          </div>
        </a>
      `).join('')}
    </div>
  `;
}

async function courseDetail(el, id) {
  // ... (باقي كود تفاصيل الكورس زي ما هو)
  const { data: course, error } = await supabase.from('courses').select('*').eq('id', id).single();
  if (error || !course) { el.innerHTML = `<p class="text-center py-10 text-red-400">الكورس غير موجود</p>`; return; }
  
  // ... (الكود زي ما هو من هنا لتحت)
  el.innerHTML = `<div class="glass-card p-8 text-center">صفحة تفاصيل الكورس</div>`;
}
