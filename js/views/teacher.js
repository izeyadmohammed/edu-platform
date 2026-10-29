import { supabase, store, refreshCourses, refreshLectures } from '../config.js';
import { escapeHtml, uid, formatMoney } from '../utils.js';
import { toast, modal } from '../ui.js';
import { openLectureEditor } from './lesson.js';

export default async function teacherView(el) {
  const p = store.profile;
  if (!p || (p.role !== 'teacher' && p.role !== 'super_admin')) {
    el.innerHTML = `<p class="text-center py-10 text-red-400">غير مصرح</p>`; return;
  }
  
  const myCourses = store.courses.filter(c => c.teacher_id === p.id || p.role === 'super_admin');
  
  // جلب إحصائيات الطلاب المشتركين في كورسات المدرس
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
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black">لوحة <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">المدرس</span></h1>
      <button id="add-course" class="btn-primary text-sm px-4 py-2"><i class="fa-solid fa-plus mr-2"></i> إضافة كورس</button>
    </div>
    
    <div class="grid grid-cols-1 gap-6 animate-fade-up">
      <!-- الكورسات والمحاضرات -->
      <div class="space-y-4">
        ${myCourses.map(c => {
          const courseLectures = store.lectures.filter(l => l.course_id === c.id);
          return `
            <div class="glass-card overflow-hidden">
              <div class="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.arrow').classList.toggle('rotate-180')">
                <div class="flex items-center gap-4">
                  ${c.image ? `<img src="${c.image}" class="w-16 h-16 rounded-lg object-cover">` : `<div class="w-16 h-16 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl"><i class="fa-solid fa-book"></i></div>`}
                  <div>
                    <h3 class="font-bold text-lg">${escapeHtml(c.title)}</h3>
                    <p class="text-sm text-gray-400">${escapeHtml(c.grade)} • ${formatMoney(c.price)} • ${courseLectures.length} محاضرة</p>
                  </div>
                </div>
                <i class="fa-solid fa-chevron-down arrow text-gray-400 transition-transform duration-300"></i>
              </div>
              <div class="hidden border-t border-white/10 bg-black/20 p-4">
                <div class="flex justify-between items-center mb-3">
                  <h4 class="font-bold text-sm text-gray-400">المحاضرات:</h4>
                  <div class="flex gap-2">
                    <button data-add-lect="${c.id}" class="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/30"><i class="fa-solid fa-plus"></i> إضافة محاضرة</button>
                    <button data-del-course="${c.id}" class="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30"><i class="fa-solid fa-trash"></i> حذف الكورس</button>
                  </div>
                </div>
                <div class="space-y-2">
                  ${courseLectures.map(l => `
                    <div class="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                      <div>
                        <p class="font-bold text-sm">${escapeHtml(l.title)}</p>
                        <p class="text-xs text-gray-500">${(l.videos||[]).length} فيديو • ${(l.pdfs||[]).length} مذكرة</p>
                      </div>
                      <div class="flex gap-2">
                        <button data-edit-lect="${l.id}" class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold hover:bg-yellow-500/30">تعديل</button>
                        <button data-del-lect="${l.id}" class="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold hover:bg-red-500/30">حذف</button>
                      </div>
                    </div>
                  `).join('') || '<p class="text-gray-500 text-sm text-center py-2">لا توجد محاضرات في هذا الكورس بعد</p>'}
                </div>
              </div>
            </div>
          `;
        }).join('') || '<div class="glass-card p-8 text-center text-gray-400">لا توجد كورسات. أضف كورسك الأول!</div>'}
      </div>

      <!-- إحصائيات الطلاب -->
      <div class="glass-card p-6">
        <h3 class="font-bold text-lg mb-4">إحصائيات الطلاب المشتركين معي (${myStudentsStats.length})</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          ${myStudentsStats.map(s => `
            <div class="p-3 rounded-lg bg-white/5 border border-white/5">
              <div class="flex justify-between items-center mb-2">
                <p class="font-bold text-sm">${escapeHtml(s.name)}</p>
                <span class="text-xs text-gray-500" dir="ltr">${escapeHtml(s.phone || '')}</span>
              </div>
              <div class="flex gap-3 text-xs">
                <span class="text-blue-400 font-bold"><i class="fa-solid fa-video"></i> ${s.videos} فيديو</span>
                <span class="text-purple-400 font-bold"><i class="fa-solid fa-list-check"></i> ${s.exams} امتحان</span>
              </div>
            </div>
          `).join('') || '<p class="text-gray-500 text-sm col-span-3 text-center py-4">لا يوجد طلاب مشتركين في كورساتك حتى الآن</p>'}
        </div>
      </div>
    </div>
  `;

  // --- إضافة كورس جديد ---
  el.querySelector('#add-course').onclick = () => {
    const grades = ['الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'];
    const m = modal({
      title: 'إضافة كورس جديد', 
      body: `
        <div class="space-y-3">
          <input id="t" placeholder="عنوان الكورس" class="input-field">
          <select id="g" class="input-field">
            <option value="">اختر الصف</option>
            ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
          </select>
          <input id="pr" type="number" placeholder="السعر (ج.م)" class="input-field">
          <textarea id="d" placeholder="وصف الكورس" class="input-field"></textarea>
          <div>
            <label class="block text-sm font-bold mb-2">صورة الكورس</label>
            <div class="flex items-center gap-3">
              <div id="course-img-prev" class="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden border border-white/10">
                <i class="fa-solid fa-image text-gray-600"></i>
              </div>
              <input type="file" id="course-img" accept="image/*" class="text-sm w-full file:bg-blue-500/10 file:text-blue-400 file:border-0 file:rounded-lg file:px-3 file:py-1">
            </div>
          </div>
        </div>`,
      actions: `<button id="sb" class="btn-primary w-full">إضافة الكورس</button>`
    });

    let imgUrl = '';
    m.root.querySelector('#course-img').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      toast('جاري رفع الصورة...', 'info');
      const fileName = `course_${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('images').upload(fileName, file);
      if (error) { toast('فشل رفع الصورة', 'error'); return; }
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      imgUrl = data.publicUrl;
      m.root.querySelector('#course-img-prev').innerHTML = `<img src="${imgUrl}" class="w-full h-full object-cover">`;
      toast('تم رفع الصورة', 'success');
    };

    m.root.querySelector('#sb').onclick = async () => {
      try {
        const { error } = await supabase.from('courses').insert({
          id: 'course_'+Date.now(), teacher_id: p.id,
          title: m.root.querySelector('#t').value,
          grade: m.root.querySelector('#g').value,
          price: +m.root.querySelector('#pr').value || 0,
          description: m.root.querySelector('#d').value,
          image: imgUrl
        });
        if (error) throw new Error(error.message);
        toast('تمت إضافة الكورس', 'success'); m.close(); await refreshCourses(); location.reload();
      } catch (e) { toast(e.message, 'error'); }
    };
  };

  // --- إضافة محاضرة للكورس الصح ---
  el.querySelectorAll('[data-add-lect]').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const m = modal({
        title: 'إضافة محاضرة',
        body: `<input id="lt" placeholder="عنوان المحاضرة" class="input-field">`,
        actions: `<button id="lsb" class="btn-accent w-full">إضافة</button>`
      });
      m.root.querySelector('#lsb').onclick = async () => {
        try {
          const { error } = await supabase.from('lectures').insert({
            id: 'lect_'+Date.now(), 
            course_id: b.dataset.addLect,
            teacher_id: p.id,
            title: m.root.querySelector('#lt').value, 
            videos: [], pdfs: [], mcq_exams: [], essay_exams: []
          });
          if (error) throw new Error(error.message);
          toast('تمت', 'success'); m.close(); await refreshLectures(); location.reload();
        } catch (e) { toast(e.message, 'error'); }
      };
    };
  });

  el.querySelectorAll('[data-del-course]').forEach(b => {
    b.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('حذف الكورس وكل محاضراته؟')) return;
      await supabase.from('courses').delete().eq('id', b.dataset.delCourse);
      toast('تم', 'success'); await refreshCourses(); location.reload();
    };
  });

  el.querySelectorAll('[data-del-lect]').forEach(b => {
    b.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('حذف المحاضرة؟')) return;
      await supabase.from('lectures').delete().eq('id', b.dataset.delLect);
      toast('تم', 'success'); await refreshLectures(); location.reload();
    };
  });

  el.querySelectorAll('[data-edit-lect]').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const lect = store.lectures.find(x => x.id === b.dataset.editLect);
      if (lect) openLectureEditor(lect);
    };
  });
}
