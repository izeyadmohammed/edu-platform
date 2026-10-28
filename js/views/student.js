import { supabase, store } from '../config.js';
import { escapeHtml, formatMoney, formatDate } from '../utils.js';
import { toast, modal } from '../ui.js';

export default async function studentView(el) {
  const p = store.profile;
  if (!p) { el.innerHTML = `<p class="text-center">سجّل دخول</p>`; return; }
  
  // جلب الإحصائيات
  const { data: progress } = await supabase.from('student_progress').select('*').eq('student_id', p.id);
  const { data: txs } = await supabase.from('transactions').select('*').eq('user_id', p.id).order('created_at', { ascending: false }).limit(20);
  const { data: subs } = await supabase.from('exam_submissions').select('*').eq('student_id', p.id).order('submitted_at', { ascending: false });

  const videosCount = (progress || []).filter(x => x.video_watched).length;
  const examsCount = (subs || []).filter(x => x.type === 'mcq').length;
  const assignmentsCount = (subs || []).filter(x => x.type === 'essay').length;

  el.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-up">
      <!-- بطاقة الطالب -->
      <div class="glass-card p-6 col-span-1 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
        <div class="relative z-10">
          <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-lg shadow-blue-500/30">
            <i class="fa-solid fa-user text-white"></i>
          </div>
          <h2 class="text-2xl font-black mb-1">${escapeHtml(p.name)}</h2>
          <p class="text-sm text-gray-400 mb-1">${escapeHtml(p.phone||'')}</p>
          <p class="text-sm text-gray-400 mb-4">${escapeHtml(p.grade||'')}</p>
          
          <div class="bg-black/30 p-4 rounded-xl border border-white/5">
            <p class="text-xs text-gray-400 mb-1">رصيد المحفظة</p>
            <p class="text-3xl font-black text-green-400">${formatMoney(p.wallet)}</p>
          </div>
        </div>
      </div>

      <!-- إحصائيات التقدم -->
      <div class="glass-card p-6 col-span-2">
        <h3 class="font-bold text-lg mb-4">تقدمي الدراسي</h3>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
            <i class="fa-solid fa-book-open text-2xl text-blue-400 mb-2"></i>
            <p class="text-2xl font-black text-white">${(p.enrolled_courses||[]).length}</p>
            <p class="text-xs text-gray-400 font-bold">كورس مشترك</p>
          </div>
          <div class="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
            <i class="fa-solid fa-video text-2xl text-green-400 mb-2"></i>
            <p class="text-2xl font-black text-white">${videosCount}</p>
            <p class="text-xs text-gray-400 font-bold">فيديو تمت مشاهدته</p>
          </div>
          <div class="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
            <i class="fa-solid fa-list-check text-2xl text-purple-400 mb-2"></i>
            <p class="text-2xl font-black text-white">${examsCount}</p>
            <p class="text-xs text-gray-400 font-bold">امتحان تم حله</p>
          </div>
        </div>
      </div>

      <!-- أدوات سريعة -->
      <div class="glass-card p-6 col-span-2">
        <h3 class="font-bold text-lg mb-4">أدوات سريعة</h3>
        <div class="grid grid-cols-2 gap-3">
          <button id="charge" class="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition text-right font-bold">
            <i class="fa-solid fa-wallet text-xl"></i> شحن المحفظة
          </button>
          <a href="#/courses" class="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition font-bold">
            <i class="fa-solid fa-book text-xl"></i> كورساتي
          </a>
        </div>
      </div>

      <!-- المعاملات والدرجات -->
      <div class="glass-card p-6 col-span-1">
        <h3 class="font-bold text-lg mb-4">آخر المعاملات</h3>
        ${(txs||[]).length === 0 ? '<p class="text-gray-500 text-sm text-center py-4">لا توجد معاملات</p>' : `
          <div class="space-y-2">
            ${txs.map(t => `
              <div class="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5 text-sm">
                <div>
                  <p class="font-bold">${escapeHtml(t.note||'-')}</p>
                  <p class="text-xs text-gray-500">${formatDate(t.created_at)}</p>
                </div>
                <span class="${t.type==='credit'?'text-green-400':'text-red-400'} font-black">
                  ${t.type==='credit'?'+':'-'}${formatMoney(t.amount)}
                </span>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <div class="glass-card p-6 col-span-2">
        <h3 class="font-bold text-lg mb-4">سجل الدرجات والواجبات</h3>
        ${(subs||[]).length === 0 ? '<p class="text-gray-500 text-sm text-center py-4">لا توجد درجات</p>' : `
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${subs.map(s => `
              <div class="p-3 rounded-lg bg-white/5 border border-white/5 text-sm">
                <div class="flex justify-between items-start mb-2">
                  <p class="font-bold">${escapeHtml(s.type==='mcq'?'اختبار MCQ':'واجب')}</p>
                  <span class="px-2 py-1 rounded text-xs ${s.status === 'تم التصحيح' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}">${escapeHtml(s.status)}</span>
                </div>
                <div class="flex justify-between items-end">
                  <p class="text-xs text-gray-500">${formatDate(s.submitted_at)}</p>
                  <span class="font-black text-lg text-blue-400">${s.grade ?? '-'} ${s.total?(' / '+s.total):''}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  // ... (زرار الشحن وتغيير الباسورد - نفس الكود القديم)
}
