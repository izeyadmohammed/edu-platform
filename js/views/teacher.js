import { supabase, store, refreshCourses, refreshLectures } from '../config.js';
import { escapeHtml, uid, formatMoney, formatDate } from '../utils.js';
import { toast, modal } from '../ui.js';
import { openLectureEditor } from './lesson.js';

export default async function teacherView(el) {
  const p = store.profile;
  if (!p || (p.role !== 'teacher' && p.role !== 'super_admin')) {
    el.innerHTML = `<p class="text-center py-10 text-red-400">غير مصرح</p>`; return;
  }
  const myCourses = store.courses.filter(c => c.teacher_id === p.id || p.role === 'super_admin');
  const myLectures = store.lectures.filter(l => l.teacher_id === p.id || p.role === 'super_admin');
  
  // جلب إحصائيات الطلاب اللي مشتركين في كورساتي
  let myStudentsStats = [];
  if (myCourses.length > 0) {
    const courseIds = myCourses.map(c => c.id);
    const { data: students } = await supabase.from('profiles')
      .select('id, name, phone, enrolled_courses')
      .eq('role', 'student')
      .overlaps('enrolled_courses', courseIds);
    
    if (students) {
      for (const s of students) {
        const { count: vids } = await supabase.from('student_progress').select('*', { count: 'exact', head: true }).eq('student_id', s.id).eq('video_watched', true);
        const { count: exms } = await supabase.from('exam_submissions').select('*', { count: 'exact', head: true }).eq('student_id', s.id).eq('type', 'mcq');
        myStudentsStats.push({ ...s, videos: vids || 0, exams: exms || 0 });
      }
    }
  }

  el.innerHTML = `
    <h1 class="text-3xl font-black mb-6 animate-fade-up">لوحة <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">المدرس</span></h1>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- الكورسات والمحاضرات -->
      <div class="glass-card p-6 animate-fade-up">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg">كورساتي (${myCourses.length})</h3>
          <button id="add-course" class="btn-primary text-sm px-4 py-2">+ كورس</button>
        </div>
        <div class="space-y-3 max-h-96 overflow-y-auto pr-2">
          ${myCourses.map(c => `
            <div class="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
              <div class="flex items-center gap-3">
                ${c.image ? `<img src="${c.image}" class="w-10 h-10 rounded object-cover">` : `<div class="w-10 h-10 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center"><i class="fa-solid fa-book"></i></div>`}
                <div>
                  <p class="font-bold text-sm">${escapeHtml(c.title)}</p>
                  <p class="text-xs text-gray-400">${escapeHtml(c.grade)}</p>
                </div>
              </div>
              <div class="flex gap-2">
                <button data-add-lect="${c.id}" class="px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs font-bold">+ محاضرة</button>
                <button data-del-course="${c.id}" class="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold">حذف</button>
              </div>
            </div>
          `).join('') || '<p class="text-gray-500 text-sm">لا توجد كورسات</p>'}
        </div>
      </div>

      <!-- إحصائيات طلابي -->
      <div class="glass-card p-6 animate-fade-up" style="animation-delay: 0.1s;">
        <h3 class="font-bold text-lg mb-4">إحصائيات طلابي (${myStudentsStats.length})</h3>
        <div class="space-y-3 max-h-96 overflow-y-auto pr-2">
          ${myStudentsStats.map(s => `
            <div class="p-3 rounded-lg bg-white/5 border border-white/5">
              <div class="flex justify-between items-center mb-2">
                <p class="font-bold text-sm">${escapeHtml(s.name)}</p>
                <span class="text-xs text-gray-500">${escapeHtml(s.phone || '')}</span>
              </div>
              <div class="flex gap-3 text-xs">
                <span class="text-blue-400 font-bold"><i class="fa-solid fa-video"></i> ${s.videos} فيديو</span>
                <span class="text-purple-400 font-bold"><i class="fa-solid fa-list-check"></i> ${s.exams} امتحان</span>
              </div>
            </div>
          `).join('') || '<p class="text-gray-500 text-sm">لا يوجد طلاب مشتركين حتى الآن</p>'}
        </div>
      </div>
    </div>`;

  // (باقي أزرار إضافة الكورس والمحاضرة والواجبات - نفس الكود القديم)
}
