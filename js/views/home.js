import { store } from '../config.js';
import { escapeHtml, formatMoney } from '../utils.js';

export default async function homeView(el) {
  const profile = store.profile;
  let courses = store.courses;
  
  if (profile?.role === 'student' && profile.grade) {
    const filtered = courses.filter(c => c.grade === profile.grade);
    if (filtered.length) courses = filtered;
  }

  el.innerHTML = `
    <!-- Hero Section -->
    <section class="relative overflow-hidden rounded-3xl mb-12 p-10 md:p-16 border border-white/10 bg-gradient-to-br from-blue-900/40 to-purple-900/40 animate-fade-up">
      <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      <div class="relative z-10 max-w-3xl">
        <span class="inline-block py-1 px-3 rounded-full bg-blue-500/20 text-blue-300 text-sm font-bold mb-6 border border-blue-500/30">
          <i class="fa-solid fa-sparkles mr-2"></i> المرحلة القادمة من التعليم
        </span>
        <h1 class="text-4xl md:text-6xl font-black mb-6 leading-tight">
          تعلّم بذكاء،<br>
          <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">وابني مستقبلك</span>
        </h1>
        <p class="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
          منصة تعليمية متكاملة تجمع أفضل المدرسين وأحدث الكورسات في مكان واحد.
        </p>
        <div class="flex flex-wrap gap-4">
          <a href="#/courses" class="btn-primary text-lg px-8 py-3 rounded-xl shadow-lg shadow-blue-500/30">تصفح الكورسات</a>
          ${!profile ? `<a href="#/signup" class="btn-accent text-lg px-8 py-3 rounded-xl shadow-lg shadow-green-500/30">سجّل الآن مجاناً</a>` : ''}
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
      ${statCard('fa-book', 'الكورسات', store.courses.length, 'text-blue-400')}
      ${statCard('fa-user-tie', 'المدرسون', store.teachers.length, 'text-green-400')}
      ${statCard('fa-play-circle', 'المحاضرات', store.lectures.length, 'text-purple-400')}
      ${statCard('fa-clock', 'دعم متواصل', '24/7', 'text-orange-400')}
    </section>

    <!-- Courses Section -->
    <section>
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-3xl font-black">أحدث <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">الكورسات</span></h2>
        <a href="#/courses" class="text-sm font-bold text-blue-400 hover:text-blue-300 transition">عرض الكل <i class="fa-solid fa-arrow-left mr-1"></i></a>
      </div>
      
      ${courses.length === 0 ? `<div class="glass-card p-12 text-center text-gray-400">لا توجد كورسات متاحة حالياً</div>` : ''}
      
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        ${courses.slice(0, 9).map(c => `
          <a href="#/courses/${c.id}" class="glass-card overflow-hidden group">
            <div class="h-48 bg-gray-800 relative overflow-hidden">
              ${c.image 
                ? `<img src="${escapeHtml(c.image)}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">` 
                : `<div class="w-full h-full flex items-center justify-center text-5xl text-gray-600"><i class="fa-solid fa-book-open"></i></div>`
              }
              <div class="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                ${escapeHtml(c.grade || 'عام')}
              </div>
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
    </section>
  `;
}

function statCard(icon, label, val, colorClass) {
  return `<div class="glass-card p-5 flex items-center gap-4">
    <div class="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
      <i class="fa-solid ${icon} text-2xl ${colorClass}"></i>
    </div>
    <div>
      <p class="text-2xl font-black">${val}</p>
      <p class="text-xs font-bold text-gray-400">${label}</p>
    </div>
  </div>`;
}
