export function escapeHtml(str=''){return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
export function uid(){return 'id_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
export function formatDate(iso){if(!iso)return '';try{return new Date(iso).toLocaleString('ar-EG');}catch{return iso;}}
export function formatMoney(n){return Number(n||0).toLocaleString('ar-EG')+' ج.م';}
export async function compressImage(file,maxW=1000,quality=.75){
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>{const img=new Image();img.onload=()=>{const sc=Math.min(1,maxW/img.width);const c=document.createElement('canvas');c.width=img.width*sc;c.height=img.height*sc;c.getContext('2d').drawImage(img,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',quality));};img.onerror=rej;img.src=e.target.result;};r.onerror=rej;r.readAsDataURL(file);});
}

// تعديل العلامة المائية لتكون مرة واحدة وواضحة
export function watermark(el,text){
  if(!el)return; el.style.position='relative';
  const layer=document.createElement('div'); layer.className='watermark-layer';
  const s=document.createElement('span'); s.className='watermark-item'; s.textContent=text;
  layer.appendChild(s);
  el.appendChild(layer);
}

export function lockExamPage(){
  document.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('copy',e=>e.preventDefault());
  document.addEventListener('cut',e=>e.preventDefault());
  document.addEventListener('keydown',e=>{
    if(e.key==='F12')e.preventDefault();
    if(e.ctrlKey&&e.shiftKey&&['I','J','C'].includes(e.key.toUpperCase()))e.preventDefault();
    if(e.ctrlKey&&e.key.toUpperCase()==='U')e.preventDefault();
    if(e.ctrlKey&&e.key.toUpperCase()==='P')e.preventDefault();
    if(e.key==='PrintScreen'){e.preventDefault();navigator.clipboard?.writeText('').catch(()=>{});}
  });
}
export function youtubeEmbed(url){
  if(!url)return '';
  let id='';
  const m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  if(m)id=m[1];
  return id?`https://www.youtube.com/embed/${id}`:url;
}
