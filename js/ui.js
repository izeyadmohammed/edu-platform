import { store } from './config.js';
export function toast(msg,type='info'){
  const colors={info:'bg-blue-600',success:'bg-green-600',error:'bg-red-600',warn:'bg-yellow-600'};
  const el=document.createElement('div');
  el.className=`${colors[type]||colors.info} text-white px-4 py-3 rounded-lg shadow-lg transition-fade max-w-xs`;
  el.textContent=msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(()=>el.remove(),3500);
}
export function modal({title='',body='',actions=''}){
  const root=document.getElementById('modal-root');
  const wrap=document.createElement('div');
  wrap.className='fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 p-4 transition-fade';
  wrap.innerHTML=`<div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700"><h3 class="font-bold text-lg">${title}</h3><button data-close class="text-gray-500 hover:text-red-500 text-xl">&times;</button></div>
    <div class="p-4">${body}</div>
    ${actions?`<div class="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">${actions}</div>`:''}
  </div>`;
  root.appendChild(wrap);
  const close=()=>wrap.remove();
  wrap.querySelector('[data-close]').onclick=close;
  wrap.addEventListener('click',e=>{if(e.target===wrap)close();});
  return {close,root:wrap};
}
export function toggleDark(){document.documentElement.classList.toggle('dark');localStorage.setItem('theme',document.documentElement.classList.contains('dark')?'dark':'light');}
export function initDark(){if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark');}
export function renderHeader(){
  const h=document.getElementById('app-header'); if(!h)return;
  const p=store.profile;
  const unread=(store.notifications||[]).filter(n=>!n.read).length;
  h.className='bg-white dark:bg-slate-800 shadow sticky top-0 z-[800]';
  h.innerHTML=`<div class="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
    <a href="#/home" class="flex items-center gap-2 text-xl font-extrabold text-blue-600 dark:text-blue-400"><i class="fa-solid fa-graduation-cap"></i><span>منصة التعليم</span></a>
    <nav class="hidden md:flex items-center gap-4 text-sm font-medium">
      <a href="#/home" class="hover:text-blue-600">الرئيسية</a>
      <a href="#/courses" class="hover:text-blue-600">الكورسات</a>
      <a href="#/teachers" class="hover:text-blue-600">المدرسون</a>
      ${p&&p.role==='student'?`<a href="#/student" class="hover:text-blue-600">حسابي</a>`:''}
      ${p&&p.role==='teacher'?`<a href="#/teacher" class="hover:text-blue-600">لوحة المدرس</a>`:''}
      ${p&&p.role==='super_admin'?`<a href="#/admin" class="hover:text-blue-600">لوحة المالك</a>`:''}
    </nav>
    <div class="flex items-center gap-2">
      <button id="dm-btn" class="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center"><i class="fa-solid fa-moon"></i></button>
      ${p?`<a href="#/notifications" class="relative w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center"><i class="fa-solid fa-bell"></i>${unread?`<span class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">${unread}</span>`:''}</a>
      <button id="logout-btn" class="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold">خروج</button>`:
      `<a href="#/login" class="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">دخول</a>
      <a href="#/signup" class="hidden sm:inline px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-bold">تسجيل</a>`}
    </div>
  </div>`;
  h.querySelector('#dm-btn').onclick=()=>toggleDark();
  const lo=h.querySelector('#logout-btn');
  if(lo)lo.onclick=async()=>{const {supabase}=await import('./config.js');await supabase.auth.signOut();location.hash='#/home';location.reload();};
}
export function renderFooter(){
  const f=document.getElementById('app-footer');if(!f)return;
  f.className='bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 py-6 mt-10';
  f.innerHTML=`<div class="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400"><p class="font-bold mb-1">منصة التعليم الذكي &copy; ${new Date().getFullYear()}</p><p>تعلم بذكاء – طوّر مهاراتك – حقق حلمك</p></div>`;
}
export function setLoading(el=document.getElementById('app-main'),msg='جاري التحميل...'){
  if(!el)return;
  el.innerHTML=`<div class="flex flex-col items-center justify-center py-20 text-gray-500"><i class="fa-solid fa-spinner fa-spin text-4xl mb-3"></i><p>${msg}</p></div>`;
}
