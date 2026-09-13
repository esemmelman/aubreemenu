const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const subjects = ['Spanish','English','Physical Sciences','U.S. History','Culinary'];
const encoder = new TextEncoder();
const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), b=>b.toString(16).padStart(2,'0')).join('');
async function db(path: string, method='GET', body?: unknown) {
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const response=await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok) throw Error('Database request failed');
 return response.status===204?null:await response.json();
}
Deno.serve(async req=>{
 const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  const raw=await req.text();if(raw.length>8192)return reply({error:'Request too large'},413);
  let body;try{body=JSON.parse(raw)}catch{return reply({error:'Invalid request'},400)}
  if(!body || typeof body!=='object')return reply({error:'Invalid request'},400);
  const {action}=body;
  if(action==='list')return reply(await db('aubreemenu_items_v1?select=id,subject,name,url&order=name.asc'));
  if(!['login','add','update','delete'].includes(action))return reply({error:'Unknown action'},400);
  if(typeof body.passcode!=='string'||!body.passcode||body.passcode.length>100)return reply({error:'Admin passcode required'},401);
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
  const rateKey=hex(await crypto.subtle.digest('SHA-256',encoder.encode(`aubreemenu:${ip}`)));
  if(!await db('rpc/aubreemenu_check_rate_v1','POST',{p_key:rateKey}))return reply({error:'Too many attempts. Please wait 15 minutes.'},429);
  const [config]=await db('aubreemenu_admin_v1?id=eq.1&select=salt,hash');
  if(!config)throw Error('Admin is not configured');
  const material=await crypto.subtle.importKey('raw',encoder.encode(body.passcode),'PBKDF2',false,['deriveBits']);
  const hash=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(config.salt),iterations:210000,hash:'SHA-256'},material,256));
  let difference=hash.length^config.hash.length;for(let i=0;i<hash.length;i++)difference|=hash.charCodeAt(i)^config.hash.charCodeAt(i);
  if(difference)return reply({error:'Incorrect passcode.'},401);
  // Successful authentication clears this caller's failed-attempt counter.
  await db(`aubreemenu_attempts_v1?key=eq.${rateKey}`,'DELETE');
  if(action==='login')return reply({ok:true});
  if(action!=='add' && (typeof body.id!=='string'|| !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)))return reply({error:'Invalid item'},400);
  if(action==='delete'){const rows=await db(`aubreemenu_items_v1?id=eq.${body.id}`,'DELETE');return rows.length?reply({ok:true}):reply({error:'Item no longer exists. Refresh the menus.'},404)}
  const name=typeof body.name==='string'?body.name.trim():'';
  const url=typeof body.url==='string'?body.url.trim():'';
  let validUrl=false;try{validUrl=['http:','https:'].includes(new URL(url).protocol)&&! /\s/.test(url)}catch{}
  if(!subjects.includes(body.subject)||!name||name.length>160||!validUrl||url.length>2048)return reply({error:'Enter a name and a valid http:// or https:// URL.'},400);
  const row={subject:body.subject,name,url};
  const rows=await db(action==='add'?'aubreemenu_items_v1':`aubreemenu_items_v1?id=eq.${body.id}`,action==='add'?'POST':'PATCH',row);
  return rows.length?reply(rows[0]):reply({error:'Item no longer exists. Refresh the menus.'},404);
 }catch(error){console.error(error instanceof Error?error.message:'Request failed');return reply({error:'Unable to complete the request. Please try again.'},500)}
});
