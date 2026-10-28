import { store } from './config.js';
import { toast, setLoading } from './ui.js';
import { roleHomePath } from './auth.js';

const routes = {
  '#/home': () => import('./views/home.js'),
  '#/login': () => import('./views/auth-views.js'),
  '#/signup': () => import('./views/auth-views.js'),
  '#/courses': () => import('./views/courses.js'),
  '#/courses/:id': () => import('./views/courses.js'),
  '#/lesson/:id': () => import('./views/lesson.js'),
  '#/teachers': () => import('./views/teachers.js'),
  '#/teachers/:id': () => import('./views/teachers.js'),
  '#/student': () => import('./views/student.js'),
  '#/teacher': () => import('./views/teacher.js'),
  '#/admin': () => import('./views/admin.js'),
  '#/exam/:lectureId/:examId': () => import('./views/exam.js'),
  '#/assignment/:lectureId/:examId': () => import('./views/assignment.js'),
  '#/notifications': () => import('./views/home.js'),
  '#/policy/:type': () => import('./views/policy.js'),
};

function matchRoute(hash) {
  for (const pat of Object.keys(routes)) {
    const regex = new RegExp('^' + pat.replace(/:[^/]+/g, '([^/]+)') + '$');
    const m = hash.match(regex);
    if (m) return { loader: routes[pat], params: m.slice(1), pattern: pat };
  }
  return null;
}

function guard(pattern) {
  const role = store.profile?.role;
  const privateRoutes = ['#/student', '#/teacher', '#/admin', '#/exam/:lectureId/:examId', '#/assignment/:lectureId/:examId'];
  const needsAuth = privateRoutes.some(p => pattern.startsWith(p.split('/:')[0]));
  if (needsAuth && !store.profile) { toast('يجب تسجيل الدخول', 'warn'); return '#/login'; }
  if (pattern === '#/admin' && role !== 'super_admin') { toast('غير مصرح', 'error'); return roleHomePath(role); }
  if (pattern === '#/teacher' && role !== 'teacher' && role !== 'super_admin') { toast('غير مصرح', 'error'); return roleHomePath(role); }
  if (pattern === '#/student' && role !== 'student') { toast('غير مصرح', 'error'); return roleHomePath(role); }
  return null;
}

export async function route() {
  const hash = location.hash || '#/home';
  const m = matchRoute(hash);
  const main = document.getElementById('app-main');
  if (!m) { main.innerHTML = `<div class="text-center py-20"><h2 class="text-2xl font-bold">404</h2></div>`; return; }
  const redirect = guard(m.pattern);
  if (redirect) { location.hash = redirect; return; }
  setLoading(main);
  try {
    const mod = await m.loader();
    main.innerHTML = '';
    main.classList.add('transition-fade');
    await mod.default(main, m.params);
    setTimeout(() => main.classList.remove('transition-fade'), 300);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    console.error('route', e);
    main.innerHTML = `<div class="text-center py-20 text-red-400"><p>خطأ: ${e.message}</p></div>`;
  }
}
