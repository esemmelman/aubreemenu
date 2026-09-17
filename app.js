const API = 'https://fgomaujsdblpzxhnnqrg.supabase.co/functions/v1/aubreemenu-api';
const subjects = ['Spanish','English','Physical Sciences','U.S. History','Culinary'];
const colors = ['#356946','#275b89','#71549b','#986018','#a34354'];
const $ = id => document.getElementById(id);
let items = [], passcode = '', editing = null, deleting = null;
const selections = new Map();
async function api(action, data = {}) {
  const response = await fetch(API, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data,...(action === 'list' ? {} : {passcode})}),signal:AbortSignal.timeout(20000)});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unable to complete this request. Please try again.');
  return result;
}
function button(text, fn, cls='') { const b=document.createElement('button');b.textContent=text;b.className=cls;b.onclick=fn;return b; }
function render() {
  $('menus').replaceChildren();
  subjects.forEach((subject,index) => {
    const card=document.createElement('section');card.className='subject';card.style.setProperty('--accent',colors[index]);
    const heading=document.createElement('h2');heading.id=`subject-${index}`;heading.textContent=subject;card.append(heading);
    const rows=items.filter(i=>i.subject===subject);
    if(passcode){
      const list=document.createElement('select');list.size=5;list.setAttribute('aria-labelledby',heading.id);
      rows.forEach(item=>{const option=new Option(item.name,item.id);list.add(option)});
      if(selections.has(subject)) list.value=selections.get(subject);
      if(list.selectedIndex<0 && rows.length) list.selectedIndex=0;
      const selected=()=>rows.find(i=>i.id===list.value);
      list.onchange=()=>{selections.set(subject,list.value)};
      card.append(list);
      const admin=document.createElement('div');admin.className='admin-actions';admin.append(button('Add item',()=>edit(subject)),button('Edit selected',()=>{if(selected())edit(subject,selected())}),button('Delete selected',()=>{if(selected()){deleting=selected();$('delete-description').textContent=`Delete “${deleting.name}” from ${subject}?`;$('delete-error').textContent='';$('delete-dialog').showModal()}}));admin.children[1].disabled=admin.children[2].disabled=!rows.length;card.append(admin);
    }else{
      const list=document.createElement('ul');list.className='subject-links';list.setAttribute('aria-labelledby',heading.id);
      rows.forEach(item=>{const li=document.createElement('li');const link=document.createElement('a');link.textContent=item.name;link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';li.append(link);list.append(li)});
      card.append(list);
    }
    if(!rows.length){const p=document.createElement('p');p.className='empty';p.textContent='No links yet. An admin can add them.';card.append(p)}
    $('menus').append(card);
  });
  $('admin').textContent=passcode?'Lock admin':'Admin';
}
async function refresh(){ $('refresh').disabled=true;try{items=await api('list');render();$('status').textContent=passcode?'Select an item to edit or delete.':''}catch(e){$('status').textContent=`Could not load menus. ${e.message}`;if(!$('menus').children.length)render()}finally{$('refresh').disabled=false} }
function edit(subject,item=null){editing={subject,id:item?.id};$('editor-title').textContent=`${item?'Edit':'Add'} item · ${subject}`;$('item-name').value=item?.name||'';$('item-url').value=item?.url||'';$('edit-error').textContent='';$('editor').showModal();$('item-name').focus()}
$('admin').onclick=()=>{if(passcode){passcode='';render();$('status').textContent='Admin editing is locked.'}else{$('passcode').value='';$('login-error').textContent='';$('login').showModal();$('passcode').focus()}};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
async function submit(event,errorId,work){event.preventDefault();const b=event.submitter;b.disabled=true;$(errorId).textContent='';try{await work()}catch(e){$(errorId).textContent=e.message}finally{b.disabled=false}}
$('login-form').onsubmit=e=>submit(e,'login-error',async()=>{passcode=$('passcode').value;try{await api('login')}catch(err){passcode='';throw err}finally{$('passcode').value=''}$('login').close();render();$('status').textContent='Admin editing is unlocked. Lock admin when finished.'});
$('item-form').onsubmit=e=>submit(e,'edit-error',async()=>{const name=$('item-name').value.trim();const url=$('item-url').value.trim();if(!name)throw Error('Enter an item name.');if(!['http:','https:'].includes(new URL(url).protocol))throw Error('Use an http:// or https:// URL.');await api(editing.id?'update':'add',{...editing,name,url});$('editor').close();await refresh()});
$('delete-form').onsubmit=e=>submit(e,'delete-error',async()=>{await api('delete',{id:deleting.id});$('delete-dialog').close();await refresh()});
$('refresh').onclick=refresh;
try{const size=localStorage.getItem('aubreemenu-text-size');if(['28','34','42'].includes(size)){$('text-size').value=size;document.documentElement.style.fontSize=`${size}px`}}catch{}
$('text-size').onchange=e=>{document.documentElement.style.fontSize=`${e.target.value}px`;try{localStorage.setItem('aubreemenu-text-size',e.target.value)}catch{}};
refresh();
