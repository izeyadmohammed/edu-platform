import { login, signup, roleHomePath } from '../auth.js';
import { toast, modal } from '../ui.js';
export default async function authView(el) {
  const isSignup = location.hash === '#/signup';
  if (isSignup) renderSignup(el); else renderLogin(el);
}
function renderLogin(el) {
  el.innerHTML = `<div class="glass-card max-w-md mx-auto p-8 mt-10 animate-fade-up">
    <h2 class="text-2xl font-extrabold mb-6 text-center">تسجيل الدخول</h2>
    <form id="login-form" class="space-y-4">
      <div><label class="block text-sm font-bold mb-1">رقم الهاتف</label><input name="phone" required type="tel" placeholder="01xxxxxxxxx" class="input-field" dir="ltr"></div>
      <div><label class="block text-sm font-bold mb-1">كلمة المرور</label><input name="password" required type="password" class="input-field" dir="ltr"></div>
      <button class="btn-primary w-full py-3">دخول</button>
      <div class="flex justify-between text-sm mt-4"><a href="#/signup" class="text-blue-400 hover:underline">حساب جديد</a><a href="#" id="forgot" class="text-red-400 hover:underline">نسيت كلمة المرور؟</a></div>
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
    modal({ title: 'استعادة كلمة المرور', body: `<p class="mb-3">تواصل مع الدعم عبر واتساب:</p><a target="_blank" href="https://wa.me/201126346329" class="block text-center py-3 bg-green-500/20 text-green-400 rounded-lg font-bold border border-green-500/30"><i class="fa-brands fa-whatsapp"></i> فتح واتساب</a>` });
  };
}
function renderSignup(el) {
  const grades = ['الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'];
  el.innerHTML = `<div class="glass-card max-w-md mx-auto p-8 mt-10 animate-fade-up">
    <h2 class="text-2xl font-extrabold mb-6 text-center">إنشاء حساب جديد</h2>
    <form id="signup-form" class="space-y-3">
      <input name="name" required placeholder="الاسم الثلاثي" class="input-field">
      <input name="phone" required type="tel" placeholder="رقم الهاتف" class="input-field" dir="ltr">
      <input name="parent_phone" required type="tel" placeholder="رقم ولي الأمر" class="input-field" dir="ltr">
      <select name="grade" required class="input-field">
        <option value="">اختر الصف</option>
        ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
      </select>
      <input name="password" required type="password" minlength="8" placeholder="كلمة المرور (8 أحرف على الأقل)" class="input-field" dir="ltr">
      <button class="btn-primary w-full py-3 mt-2">تسجيل</button>
      <a href="#/login" class="block text-center text-sm text-blue-400 hover:underline mt-3">لدي حساب بالفعل</a>
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
