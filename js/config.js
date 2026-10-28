import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
export const SUPABASE_URL = 'https://pephaughlgezamtzphkt.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_UzP993xPgfG_cdLb-Lzw8g_byTBa6HF';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
export const store = { user:null, profile:null, courses:[], lectures:[], teachers:[], notifications:[], loaded:false };
export async function loadAllData() {
  try {
    const { data: courses } = await supabase.from('courses').select('*').order('created_at',{ascending:false});
    const { data: lectures } = await supabase.from('lectures').select('*').order('created_at',{ascending:false});
    const { data: teachers } = await supabase.from('profiles').select('*').eq('role','teacher');
    store.courses=courses||[]; store.lectures=lectures||[]; store.teachers=teachers||[];
    if (store.user) {
      const { data: n } = await supabase.from('notifications').select('*').eq('user_id',store.user.id).order('created_at',{ascending:false}).limit(30);
      store.notifications=n||[];
    }
    store.loaded=true;
  } catch(e){ console.error('loadAllData',e); }
}
export async function refreshCourses(){ const {data}=await supabase.from('courses').select('*').order('created_at',{ascending:false}); store.courses=data||[]; return store.courses; }
export async function refreshLectures(){ const {data}=await supabase.from('lectures').select('*').order('created_at',{ascending:false}); store.lectures=data||[]; return store.lectures; }
