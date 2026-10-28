import { login, signup, roleHomePath } from '../auth.js';
import { toast, modal } from '../ui.js';
export default async function authView(el) {
  const isSignup = location.hash === '#/signup';
  if (isSignup) renderSignup(el); else renderLogin(el);
}
function renderLogin(el) {
  el.innerHTML = `<div class="max-w-md mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 mt-10">
    <h2 class="text-2xl font-extrabold mb-6 text-center">تسجيل الدخول</h2>
    <form id="login-form" class="space-y-4">
      <div><label class="block text-sm mb-1">رقم الهاتف</label><input name="phone" required type="tel" placeholder="01xxxxxxxxx" class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900"></div>
      <div><label class="block text-sm mb-1">كلمة المرور</label><input name="password" required type="password" class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900"></div>
      <button class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">دخول</button>
      <div class="flex justify-between text-sm"><a href="#/signup" class="text-blue-600 hover:underline">حساب جديد</a><a href="#" id="forgot" class="text-red-600 hover:underline">نسيت كلمة المرور؟</a></div>
    </form></div>`;
  el.querySelector('#login-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await login(fd.get('phone').trim(), fd.get('password'));
      toast('تم الدخول بنجاح', 'success');
      const { store } = await import('../config.js');
      setTimeout(() => { location.hash = roleHomePath(store.profile?.role); }, 200);
    } catch (err) { toast(err.message, 'error'); }
  };
  el.querySelector('#forgot').onclick = (e) => {
    e.preventDefault();
    modal({ title: 'استعادة كلمة المرور', body: `<p class="mb-3">تواصل مع الدعم عبر واتساب:</p><a target="_blank" href="https://wa.me/201126346329" class="block text-center py-3 bg-green-500 text-white rounded-lg font-bold"><i class="fa-brands fa-whatsapp"></i> فتح واتساب</a>` });
  };
}
function renderSignup(el) {
  el.innerHTML = `<div class="max-w-md mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 mt-10">
    <h2 class="text-2xl font-extrabold mb-6 text-center">إنشاء حساب جديد</h2>
    <form id="signup-form" class="space-y-3">
      <input name="name" required placeholder="الاسم الثلاثي" class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900">
      <input name="phone" required type="tel" placeholder="رقم الهاتف" class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900">
      <input name="parent_phone" required type="tel" placeholder="رقم ولي الأمر" class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900">
      <select name="grade" required class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900">
        <option value="">اختر الصف</option><option>الأول الثانوي</option><option>الثاني الثانوي</option><option>الثالث الثانوي</option><option>الأول الإعدادي</option><option>الثاني الإعدادي</option><option>الثالث الإعدادي</option>
      </select>
      <input name="password" required type="password" minlength="6" placeholder="كلمة المرور" class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900">
      <button class="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg">تسجيل</button>
      <a href="#/login" class="block text-center text-sm text-blue-600 hover:underline">لدي حساب بالفعل</a>
    </form></div>`;
  el.querySelector('#signup-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await signup({ name: fd.get('name').trim(), phone: fd.get('phone').trim(), parent_phone: fd.get('parent_phone').trim(), grade: fd.get('grade'), password: fd.get('password') });
      toast('تم التسجيل بنجاح', 'success');
      setTimeout(() => { location.hash = '#/student'; location.reload(); }, 800);
    } catch (err) { toast(err.message, 'error'); }
  };
}
