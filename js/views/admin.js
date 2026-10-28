import { supabase, store } from '../config.js';
import { escapeHtml, uid, formatMoney } from '../utils.js';
import { toast, modal } from '../ui.js';

export default async function adminView(el) {
  if (store.profile?.role !== 'super_admin') { el.innerHTML = `<p class="text-center py-10 text-red-400">غير مصرح</p>`; return; }
  
  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
  const { data: stats } = await supabase.rpc('get_students_stats');
  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  const { data: codes } = await supabase.from('codes').select('*').order('created_at', { ascending: false }).limit(50);
  
  const students = (profiles || []).filter(p => p.role === 'student');
  const teachers = (profiles || []).filter(p => p.role === 'teacher');
  const totalWallet = students.reduce((s, p) => s + (+p.wallet || 0), 0);

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black">لوحة <span class="text-transparent bg-clip-text bg-gradient-to-l from-purple-400 to-pink-500">المالك</span></h1>
      <button id="settings-btn" class="btn-primary text-sm"><i class="fa-solid fa-gear mr-2"></i> إعدادات المنصة</button>
    </div>
    
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-up">
      ${statCard('fa-users', 'الطلاب', students.length, 'text-blue-400')}
      ${statCard('fa-user-tie', 'المدرسون', teachers.length, 'text-green-400')}
      ${statCard('fa-book', 'الكورسات', store.courses.length, 'text-purple-400')}
      ${statCard('fa-wallet', 'إجمالي المحافظ', formatMoney(totalWallet), 'text-orange-400')}
    </div>

    <div class="grid grid-cols-1 gap-6 animate-fade-up">
      <!-- جدول إحصائيات الطلاب -->
      <div class="glass-card p-6 overflow-x-auto">
        <h3 class="font-bold text-lg mb-4">إحصائيات الطلاب التفصيلية</h3>
        <table class="w-full text-right text-sm">
          <thead class="bg-white/5 text-gray-400">
            <tr>
              <th class="p-3 rounded-r-lg">الطالب</th>
              <th class="p-3">الصف</th>
              <th class="p-3">الكورسات</th>
              <th class="p-3">فيديوهات</th>
              <th class="p-3">امتحانات</th>
              <th class="p-3 rounded-l-lg">المحفظة</th>
            </tr>
          </thead>
          <tbody>
            ${(stats || []).map(s => `
              <tr class="border-b border-white/5 hover:bg-white/5 transition">
                <td class="p-3">
                  <p class="font-bold">${escapeHtml(s.student_name)}</p>
                  <p class="text-xs text-gray-500">${escapeHtml(s.student_phone || '')}</p>
                </td>
                <td class="p-3 text-gray-400">${escapeHtml(s.student_grade || '-')}</td>
                <td class="p-3 font-bold text-blue-400">${s.courses_count}</td>
                <td class="p-3 font-bold text-green-400">${s.videos_watched}</td>
                <td class="p-3 font-bold text-purple-400">${s.exams_taken}</td>
                <td class="p-3 font-bold">${formatMoney(students.find(x => x.id === s.student_id)?.wallet || 0)}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="text-center p-4 text-gray-500">لا يوجد طلاب</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- أكواد الشحن -->
      <div class="glass-card p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg">أكواد الشحن</h3>
          <button id="gen-codes" class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-bold">توليد أكواد</button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
          ${(codes || []).map(c => `
            <div class="p-3 rounded-lg bg-black/30 border border-white/5 flex justify-between items-center">
              <span class="font-mono text-sm">${escapeHtml(c.code)}</span>
              <span class="${c.used ? 'text-red-400' : 'text-green-400'} text-xs font-bold">${formatMoney(c.amount)}</span>
            </div>
          `).join('') || '<p class="text-gray-500 col-span-4 text-center">لا توجد أكواد</p>'}
        </div>
      </div>
    </div>`;

  // ... باقي أزرار الإعدادات والأكواد (نفس الكود القديم)
}
