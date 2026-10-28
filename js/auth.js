import { supabase, store, loadAllData } from './config.js';
export function phoneToEmail(phone){return `${phone.replace(/\s/g,'')}@edu.local`;}
export async function login(phone,password){
  const {data,error}=await supabase.auth.signInWithPassword({email:phoneToEmail(phone),password});
  if(error)throw new Error('رقم أو كلمة مرور غير صحيحة');
  return data.user;
}
export async function signup({name,phone,parent_phone,grade,password}){
  const email=phoneToEmail(phone);
  const {data,error}=await supabase.auth.signUp({email,password,options:{data:{name,phone,parent_phone,grade,role:'student'}}});
  if(error)throw new Error(error.message);
  try{await supabase.auth.signInWithPassword({email,password});}catch{}
  return data.user;
}
export async function logout(){await supabase.auth.signOut();store.user=null;store.profile=null;}
export async function loadProfile(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){store.user=null;store.profile=null;return null;}
  store.user=user;
  const {data,error}=await supabase.from('profiles').select('*').eq('id',user.id).single();
  if(error){console.warn('profile err',error);return null;}
  store.profile=data;return data;
}
export function roleHomePath(role){
  if(role==='super_admin')return '#/admin';
  if(role==='teacher')return '#/teacher';
  return '#/student';
}
export async function bootstrapAuth(){await loadProfile();await loadAllData();}
