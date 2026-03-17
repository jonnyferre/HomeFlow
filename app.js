
'use strict';

const $=(s,el=document)=>el.querySelector(s);
const uid=()=>Math.random().toString(16).slice(2)+Date.now().toString(16);
const pad2=n=>String(n).padStart(2,'0');
const fmtISO=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const parseISO=s=>{const [y,m,d]=String(s||'').split('-').map(Number); if(!y||!m||!d) return null; const dt=new Date(y,m-1,d); return isNaN(dt.getTime())?null:dt;};
const dayUTC=d=>Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000);
const money=n=>Number(n||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const monthName=m=>['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

const COLORS={L:'#16a34a',M:'#ea580c',T:'#2563eb',N:'#7c3aed',P:'#dc2626',V:'#c0841a',X:'#eab308'};
const CAT_ICONS={'Vivienda':'🏠','Supermercado':'🛒','Comida':'🛒','Gasolina':'⛽','Coche':'🚗','Ocio':'🎉','Nómina':'💼','Ahorro':'💾','Internet':'📶','Seguro':'🛡️','Otros':'📦'};
const KEY='homeflow_real_v1';

const DEFAULT={
  ui:{welcomed:false,area:'home',jonnyTab:'trabajo',hogarTab:'economia',workMode:'combo',homeMonth:{year:2026,month:2},economyMonth:{year:2026,month:2},allocationMode:'disponible'},
  work:{
    people:{jonny:{name:'Jonny',salaryMode:'horas',hourly:14,irpf:12,extraRate:15,veladaRate:18},angela:{name:'Angela',salaryMode:'fijo',fixedSalary:1400}},
    shifts:[
      {id:'L',name:'Libre',color:COLORS.L,hours:0},{id:'M',name:'Mañana',color:COLORS.M,hours:8},
      {id:'T',name:'Tarde',color:COLORS.T,hours:8},{id:'N',name:'Noche',color:COLORS.N,hours:8},
      {id:'P',name:'Partido',color:COLORS.P,hours:12},{id:'V',name:'Velada',color:COLORS.V,hours:0},
      {id:'X',name:'Vacaciones',color:COLORS.X,hours:0}
    ],
    contracts:[
      {id:uid(),person:'jonny',name:'Contrato Jonny',start:'2026-03-01',end:'',rotationStart:'2026-03-01',rotationEnabled:true,pattern:['M','M','M','M','M','M','L','T','T','T','T','T','T','L','N','N','N','N','N','N','L']},
      {id:uid(),person:'angela',name:'Contrato Angela',start:'2026-03-01',end:'',rotationStart:'2026-03-01',rotationEnabled:true,pattern:['T','T','T','T','L','L','M','M','P','P','L','L','N','N']}
    ],
    overrides:{}
  },
  economy:{
    movements:[
      {id:uid(),date:'2026-03-01',name:'Nómina Jonny',amount:1950,type:'ingreso',owner:'jonny',category:'Nómina'},
      {id:uid(),date:'2026-03-02',name:'Nómina Angela',amount:1400,type:'ingreso',owner:'angela',category:'Nómina'},
      {id:uid(),date:'2026-03-03',name:'Alquiler',amount:900,type:'gasto',owner:'hogar',category:'Vivienda'},
      {id:uid(),date:'2026-03-04',name:'Supermercado',amount:86,type:'gasto',owner:'hogar',category:'Supermercado'},
      {id:uid(),date:'2026-03-05',name:'Gasolina Jonny',amount:45,type:'gasto',owner:'jonny',category:'Gasolina'},
      {id:uid(),date:'2026-03-06',name:'Internet',amount:38,type:'gasto',owner:'hogar',category:'Internet'},
      {id:uid(),date:'2026-03-08',name:'Seguro coche',amount:220,type:'gasto',owner:'jonny',category:'Seguro'},
      {id:uid(),date:'2026-03-09',name:'Comida Angela',amount:24,type:'gasto',owner:'angela',category:'Comida'}
    ],
    budgets:[
      {id:uid(),category:'Supermercado',limit:400},{id:uid(),category:'Gasolina',limit:150},
      {id:uid(),category:'Ocio',limit:200},{id:uid(),category:'Vivienda',limit:1100}
    ],
    housing:{estimated:{alquiler:900,luz:80,agua:30,internet:38,supermercado:400,otros:100},manual:{jonny:60,angela:40}}
  },
  agenda:{
    personal:[{id:uid(),title:'Dentista Jonny',date:'2026-03-12',notes:'18:00'}],
    hogar:[{id:uid(),title:'ITV coche',date:'2026-03-21',notes:'09:00'}]
  }
};

function merge(a,b){if(Array.isArray(a)||Array.isArray(b)) return b??a; if(typeof a==='object'&&typeof b==='object'&&a&&b){for(const k of Object.keys(b)) a[k]=k in a?merge(a[k],b[k]):b[k]; return a;} return b===undefined?a:b;}
function load(){try{const raw=localStorage.getItem(KEY); if(!raw) return structuredClone(DEFAULT); return merge(structuredClone(DEFAULT),JSON.parse(raw));}catch(e){return structuredClone(DEFAULT);}}
let state=load();
function save(){localStorage.setItem(KEY,JSON.stringify(state));}

function el(tag,attrs={},children=[]){const n=document.createElement(tag); for(const [k,v] of Object.entries(attrs)){if(k==='class') n.className=v; else if(k==='text') n.textContent=v; else if(k==='html') n.innerHTML=v; else if(k.startsWith('on')&&typeof v==='function') n.addEventListener(k.slice(2).toLowerCase(),v); else if(v!==undefined&&v!==null) n.setAttribute(k,v);} (Array.isArray(children)?children:[children]).forEach(c=>{if(c==null) return; n.appendChild(typeof c==='string'?document.createTextNode(c):c);}); return n;}
function toast(msg){const t=$('#toast'); t.textContent=msg; t.classList.remove('hidden'); clearTimeout(toast._tm); toast._tm=setTimeout(()=>t.classList.add('hidden'),1600);}
function openModal(title,bodyNodes=[],footNodes=[]){$('#modalTitle').textContent=title; const b=$('#modalBody'),f=$('#modalFoot'); b.innerHTML=''; f.innerHTML=''; bodyNodes.forEach(x=>b.appendChild(x)); footNodes.forEach(x=>f.appendChild(x)); $('#modalOverlay').classList.remove('hidden');}
function closeModal(){$('#modalOverlay').classList.add('hidden');}
function fieldText(label,value='',placeholder=''){const input=el('input',{class:'input',value,placeholder}); return {wrap:el('div',{class:'field'},[el('label',{text:label}),input]),input};}
function fieldNumber(label,value='',placeholder='',step='0.01'){const input=el('input',{class:'input',type:'number',value,placeholder,step}); return {wrap:el('div',{class:'field'},[el('label',{text:label}),input]),input};}
function fieldDate(label,value=''){const input=el('input',{class:'input',type:'date',value}); return {wrap:el('div',{class:'field'},[el('label',{text:label}),input]),input};}
function fieldSelect(label,value,options){const select=el('select',{class:'select'}); options.forEach(o=>{const op=el('option',{value:o.value,text:o.label}); if(String(o.value)===String(value)) op.selected=true; select.appendChild(op);}); return {wrap:el('div',{class:'field'},[el('label',{text:label}),select]),select};}
function btn(text,kind='ghost',onClick=null){const b=el('button',{class:kind,text}); if(onClick) b.onclick=onClick; return b;}

function shiftById(id){return state.work.shifts.find(s=>s.id===id)||null;}
function personCfg(id){return state.work.people[id]||null;}
function activeContract(person,iso){const d=parseISO(iso); if(!d) return null; const td=dayUTC(d); let best=null; state.work.contracts.filter(c=>c.person===person).forEach(c=>{const s=parseISO(c.start),e=c.end?parseISO(c.end):null; if(!s) return; const ts=dayUTC(s),te=e?dayUTC(e):1e12; if(td>=ts&&td<=te){if(!best||ts>=dayUTC(parseISO(best.start))) best=c;}}); return best;}
function autoShift(person,iso){const c=activeContract(person,iso); if(!c||!c.rotationEnabled||!c.pattern?.length) return null; const rs=parseISO(c.rotationStart),d=parseISO(iso); if(!rs||!d) return null; const diff=dayUTC(d)-dayUTC(rs); return c.pattern[((diff%c.pattern.length)+c.pattern.length)%c.pattern.length];}
function override(person,iso){return state.work.overrides?.[iso]?.[person]||null;}
function shiftFor(person,iso){const ov=override(person,iso); return ov?.shiftId || autoShift(person,iso);}
function hoursFor(person,iso){const ov=override(person,iso); const sh=shiftById(shiftFor(person,iso)); return Number(ov?.hours ?? sh?.hours ?? 0);}
function monthSummary(person,year,month){let hours=0,extras=0,veladas=0; for(let d=1;;d++){const dt=new Date(year,month,d); if(dt.getMonth()!==month) break; const iso=fmtISO(dt); const ov=override(person,iso); const sh=shiftById(shiftFor(person,iso)); hours += Number(ov?.hours ?? sh?.hours ?? 0); extras += Number(ov?.extras ?? 0); veladas += Number(ov?.veladas ?? 0);} const cfg=personCfg(person); let net=0; if(cfg.salaryMode==='fijo') net=Number(cfg.fixedSalary||0); else {const gross=hours*Number(cfg.hourly||0)+extras*Number(cfg.extraRate||0)+veladas*Number(cfg.veladaRate||0); net=gross*(1-Number(cfg.irpf||0)/100);} return {hours,extras,veladas,net};}
function monthMovements(year,month,owner){return state.economy.movements.filter(m=>{const d=parseISO(m.date); return d&&d.getFullYear()===year&&d.getMonth()===month&&(owner?m.owner===owner:true);});}
function monthlyIncome(owner,year,month){return monthMovements(year,month,owner).filter(m=>m.type==='ingreso').reduce((s,m)=>s+Math.abs(Number(m.amount||0)),0);}
function monthlyExpense(owner,year,month){return monthMovements(year,month,owner).filter(m=>m.type==='gasto').reduce((s,m)=>s+Math.abs(Number(m.amount||0)),0);}
function monthlyAvailable(owner,year,month){return monthlyIncome(owner,year,month)-monthlyExpense(owner,year,month);}
function housingTotal(){return Object.values(state.economy.housing.estimated).reduce((s,v)=>s+Number(v||0),0);}
function allocation(year,month){const total=housingTotal(); if(state.ui.allocationMode==='manual') return {jonny:total*Number(state.economy.housing.manual.jonny||0)/100, angela:total*Number(state.economy.housing.manual.angela||0)/100}; const base=state.ui.allocationMode==='ingresos'?{jonny:monthlyIncome('jonny',year,month),angela:monthlyIncome('angela',year,month)}:{jonny:monthlyAvailable('jonny',year,month),angela:monthlyAvailable('angela',year,month)}; const sum=Math.max(0,base.jonny)+Math.max(0,base.angela); if(sum<=0) return {jonny:0,angela:0}; return {jonny:total*(Math.max(0,base.jonny)/sum), angela:total*(Math.max(0,base.angela)/sum)};}

function topbar(sub){return el('div',{class:'topbar'},[el('div',{class:'topbar-inner'},[el('div',{class:'top-left'},[state.ui.area==='home'?null:el('button',{class:'icon-btn',text:'←',onClick:()=>{state.ui.area='home';save();render();}}),el('div',{},[el('div',{class:'brand-title',text:'HomeFlow'}),el('div',{class:'brand-sub',text:sub})])]),el('div',{class:'top-right'},[el('button',{class:'icon-btn',text:'＋',onClick:quickAdd}),el('button',{class:'icon-btn',text:'⚙',onClick:openSettings})])])]);}
function kpi(label,value,note){return el('div',{class:'kpi'},[el('div',{class:'kpi-label',text:label}),el('div',{class:'kpi-value',text:value}),el('div',{class:'kpi-note',text:note})]);}
function segmented(items,active,cb){return el('div',{class:'segmented'},items.map(([id,label])=>el('button',{class:active===id?'active':'',text:label,onClick:()=>cb(id)})));}

function render(){
  const app=$('#app'); app.innerHTML='';
  if(!state.ui.welcomed){ app.appendChild(renderWelcome()); return; }
  if(state.ui.area==='home') app.appendChild(renderHome());
  if(state.ui.area==='jonny') app.appendChild(renderJonny());
  if(state.ui.area==='hogar') app.appendChild(renderHogar());
}
function renderWelcome(){
  const tile=(title,text,icon)=>el('div',{class:'home-tile'},[el('div',{class:'home-icon',text:icon}),el('div',{},[el('div',{class:'home-title',text:title}),el('div',{class:'home-text',text:text})])]);
  const start=btn('Empezar','primary');
  start.onclick=()=>{state.ui.welcomed=true; save(); render();};
  return el('div',{class:'screen'},[el('div',{class:'hero'},[
    el('div',{class:'card'},[el('div',{class:'card-body'},[
      el('div',{class:'brand-title',text:'HomeFlow'}),
      el('div',{class:'card-sub',text:'Trabajo, hogar y gastos bien ordenados.'}),
      el('div',{class:'home-grid'},[tile('Jonny','Tu espacio personal.','👤'),tile('Hogar','Lo compartido con Angela.','🏠')]),
      el('div',{class:'hr'}), start
    ])]),
    el('div',{class:'card'},[el('div',{class:'card-body'},[
      el('div',{class:'card-title',text:'Base visual'}),
      el('div',{class:'card-sub',text:'Clara, elegante, sin basura visual.'}),
      el('div',{class:'kpi-grid',style:'margin-top:16px'},[
        kpi('Trabajo','Claro','Calendario grande'),
        kpi('Economía','Limpia','Ingreso verde / gasto rojo'),
        kpi('Hogar','Justo','Reparto equitativo'),
        kpi('Agenda','Simple','Solo lo útil')
      ])
    ])])
  ])]);
}

function renderHome(){
  const y=state.ui.economyMonth.year,m=state.ui.economyMonth.month;
  const allocRec=allocation(y,m);
  const hours=monthSummary('jonny',state.ui.homeMonth.year,state.ui.homeMonth.month).hours;
  const tile=(title,text,icon,click)=>el('div',{class:'home-tile',onClick:click},[el('div',{class:'home-icon',text:icon}),el('div',{},[el('div',{class:'home-title',text:title}),el('div',{class:'home-text',text:text})])]);
  return el('div',{},[
    topbar('Inicio'),
    el('div',{class:'screen'},[el('div',{class:'hero'},[
      el('div',{class:'card'},[el('div',{class:'card-body'},[
        el('div',{class:'card-title',text:'HomeFlow'}),
        el('div',{class:'card-sub',text:'Elige dónde quieres entrar.'}),
        el('div',{class:'home-grid'},[
          tile('Jonny','Trabajo, economía, agenda y ajustes personales.','👤',()=>{state.ui.area='jonny';save();render();}),
          tile('Hogar','Economía compartida, agenda común y calendario conjunto.','🏠',()=>{state.ui.area='hogar';save();render();})
        ])
      ])]),
      el('div',{class:'card'},[el('div',{class:'card-body'},[
        el('div',{class:'card-title',text:'Resumen rápido'}),
        el('div',{class:'kpi-grid',style:'margin-top:16px'},[
          kpi('Horas mes',hours.toFixed(2),'Trabajo Jonny'),
          kpi('Saldo personal',money(monthlyAvailable('jonny',y,m)),'Disponible'),
          kpi('Saldo hogar',money(monthlyAvailable('hogar',y,m)),'Compartido'),
          kpi('Coste vivienda',money(housingTotal()),`${money(allocRec.jonny)} / ${money(allocRec.angela)}`)
        ])
      ])])
    ])])
  ]);
}
function bottomNav(items,active,onPick){return el('div',{class:'bottom-nav'},items.map(([id,icon,label])=>el('button',{class:active===id?'active':'',onClick:()=>onPick(id)},[el('div',{class:'nav-ico',text:icon}),el('div',{class:'nav-label',text:label})])));}
function renderJonny(){
  const map={trabajo:'Tu trabajo',economia:'Tu economía',agenda:'Tu agenda',ajustes:'Tus ajustes'};
  const body=el('div',{class:'screen'});
  if(state.ui.jonnyTab==='trabajo') body.appendChild(renderTrabajo());
  if(state.ui.jonnyTab==='economia') body.appendChild(renderEconomiaPersonal());
  if(state.ui.jonnyTab==='agenda') body.appendChild(renderAgenda('personal'));
  if(state.ui.jonnyTab==='ajustes') body.appendChild(renderAjustes());
  return el('div',{},[
    topbar(map[state.ui.jonnyTab]),
    body,
    bottomNav([['trabajo','🗓','Trabajo'],['economia','💶','Economía'],['agenda','📌','Agenda'],['ajustes','⚙','Ajustes']], state.ui.jonnyTab, id=>{state.ui.jonnyTab=id;save();render();})
  ]);
}
function renderHogar(){
  const map={economia:'Economía hogar',agenda:'Agenda hogar',calendario:'Calendario conjunto',metas:'Metas comunes'};
  const body=el('div',{class:'screen'});
  if(state.ui.hogarTab==='economia') body.appendChild(renderEconomiaHogar());
  if(state.ui.hogarTab==='agenda') body.appendChild(renderAgenda('hogar'));
  if(state.ui.hogarTab==='calendario') body.appendChild(renderCalendarioConjunto());
  if(state.ui.hogarTab==='metas') body.appendChild(renderMetas());
  return el('div',{},[
    topbar(map[state.ui.hogarTab]),
    body,
    bottomNav([['economia','💶','Economía'],['agenda','📌','Agenda'],['calendario','🗓','Calendario'],['metas','🎯','Metas']], state.ui.hogarTab, id=>{state.ui.hogarTab=id;save();render();})
  ]);
}
function monthNav(key){
  const f=state.ui[key];
  const month=el('select',{class:'select'});
  for(let i=0;i<12;i++){const op=el('option',{value:i,text:monthName(i)}); if(i===f.month) op.selected=true; month.appendChild(op);}
  const year=el('select',{class:'select'});
  for(let y=2023;y<=2035;y++){const op=el('option',{value:y,text:String(y)}); if(y===f.year) op.selected=true; year.appendChild(op);}
  month.onchange=()=>{f.month=Number(month.value);save();render();}
  year.onchange=()=>{f.year=Number(year.value);save();render();}
  return el('div',{class:'calendar-nav'},[
    btn('◀','ghost',()=>{let m=f.month-1,y=f.year;if(m<0){m=11;y--}f.month=m;f.year=y;save();render();}),
    month, year,
    btn('▶','ghost',()=>{let m=f.month+1,y=f.year;if(m>11){m=0;y++}f.month=m;f.year=y;save();render();})
  ]);
}

function renderTrabajo(){
  const y=state.ui.homeMonth.year,m=state.ui.homeMonth.month, s=monthSummary('jonny',y,m);
  return el('div',{},[
    el('div',{class:'card'},[el('div',{class:'card-body'},[
      el('div',{class:'kpi-grid'},[
        kpi('Horas',s.hours.toFixed(2),'Mes actual'),
        kpi('Extras',s.extras.toFixed(2),'Horas extra'),
        kpi('Veladas',s.veladas.toFixed(2),'Marcadas'),
        kpi('Estimación',money(s.net),'Nómina estimada')
      ]),
      el('div',{class:'hr'}),
      el('div',{class:'calendar-toolbar'},[
        monthNav('homeMonth'),
        el('div',{class:'row'},[
          segmented([['combo','Híbrido'],['mes','Mes']], state.ui.workMode, id=>{state.ui.workMode=id;save();render();}),
          btn('Contratos','ghost',openContracts),
          btn('Turnos','ghost',openShifts)
        ])
      ]),
      renderWorkMonth(y,m,'jonny'),
      state.ui.workMode==='combo' ? renderTimeline('jonny',y,m) : null
    ])])
  ]);
}
function renderWorkMonth(year,month,scope){
  const head=el('div',{class:'calendar-head'},['L','M','X','J','V','S','D'].map(x=>el('div',{text:x})));
  const grid=el('div',{class:'calendar-grid'});
  const first=new Date(year,month,1), days=new Date(year,month+1,0).getDate(), offset=(first.getDay()+6)%7, prevLast=new Date(year,month,0).getDate();
  for(let i=0;i<42;i++){
    const dayNum=i-offset+1; let yy=year,mm=month,dd=dayNum,muted=false;
    if(dayNum<=0){muted=true;mm=month-1;yy=year;if(mm<0){mm=11;yy--}dd=prevLast+dayNum;}
    else if(dayNum>days){muted=true;mm=month+1;yy=year;if(mm>11){mm=0;yy++}dd=dayNum-days;}
    const iso=`${yy}-${pad2(mm+1)}-${pad2(dd)}`; grid.appendChild(dayCell(iso,dd,muted,scope));
  }
  return el('div',{},[head,grid]);
}
function dayCell(iso,dd,muted,scope){
  const cell=el('div',{class:`day-cell ${muted?'muted':''}`,onClick:()=>openDayEditor(iso,scope)});
  const id=shiftFor(scope,iso); const sh=shiftById(id);
  cell.appendChild(el('div',{class:'day-top'},[el('div',{class:'day-num',text:String(dd)}), sh?el('div',{class:'shift-box',style:`background:${sh.color}`,text:sh.id}):el('div',{})]));
  cell.appendChild(el('div',{class:'day-meta',text:`${hoursFor(scope,iso)}h`}));
  return cell;
}
function renderTimeline(person,year,month){
  const tl=el('div',{class:'timeline'});
  let count=0;
  for(let d=1;;d++){
    const dt=new Date(year,month,d); if(dt.getMonth()!==month) break;
    const iso=fmtISO(dt), sh=shiftById(shiftFor(person,iso)); if(!sh) continue;
    tl.appendChild(el('div',{class:'timeline-item'},[el('div',{class:'title',text:`${iso} · ${sh.name}`}),el('div',{class:'meta',text:`${hoursFor(person,iso)}h`})]));
    count++; if(count===5) break;
  }
  return el('div',{},[el('div',{class:'card-title',text:'Detalle rápido'}),el('div',{class:'card-sub',text:'Vista tipo timeline de próximos turnos.'}),tl]);
}
function renderEconomiaPersonal(){
  const y=state.ui.economyMonth.year,m=state.ui.economyMonth.month, list=monthMovements(y,m,'jonny').sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return el('div',{},[
    el('div',{class:'card'},[el('div',{class:'card-body'},[
      el('div',{class:'calendar-toolbar'},[monthNav('economyMonth')]),
      el('div',{class:'kpi-grid'},[
        kpi('Saldo total',money(monthlyAvailable('jonny',y,m)),'Personal'),
        kpi('Ingresos mes',money(monthlyIncome('jonny',y,m)),'Jonny'),
        kpi('Gastos mes',money(monthlyExpense('jonny',y,m)),'Jonny'),
        kpi('Nómina estimada',money(monthSummary('jonny',state.ui.homeMonth.year,state.ui.homeMonth.month).net),'Trabajo')
      ])
    ])]),
    el('div',{class:'card'},[el('div',{class:'card-body'},[
      el('div',{class:'row spread'},[el('div',{},[el('div',{class:'card-title',text:'Movimientos'}),el('div',{class:'card-sub',text:'Privados de Jonny'})]),btn('Nuevo movimiento','primary',()=>openMovementEditor('jonny'))]),
      el('div',{class:'hr'}),
      list.length?el('div',{class:'list'},list.map(renderMovementItem)):el('div',{class:'empty',text:'Sin movimientos este mes'})
    ])])
  ]);
}
function renderEconomiaHogar(){
  const y=state.ui.economyMonth.year,m=state.ui.economyMonth.month, list=monthMovements(y,m,'hogar').sort((a,b)=>String(b.date).localeCompare(String(a.date))), a=allocation(y,m);
  return el('div',{},[
    el('div',{class:'card'},[el('div',{class:'card-body'},[
      el('div',{class:'calendar-toolbar'},[
        monthNav('economyMonth'),
        segmented([['disponible','Por saldo disponible'],['ingresos','Por ingresos'],['manual','Manual']], state.ui.allocationMode, id=>{state.ui.allocationMode=id;save();render();})
      ]),
      el('div',{class:'kpi-grid'},[
        kpi('Saldo hogar',money(monthlyAvailable('hogar',y,m)),'Compartido'),
        kpi('Gastos hogar',money(monthlyExpense('hogar',y,m)),'Mes actual'),
        kpi('Vivienda',money(housingTotal()),'Coste mensual'),
        kpi('Aporte sugerido',`${money(a.jonny)} / ${money(a.angela)}`,'Jonny / Angela')
      ])
    ])]),
    el('div',{class:'card'},[el('div',{class:'card-body'},[
      el('div',{class:'tabs'},[
        el('button',{class:'active',text:'Movimientos'}),
        el('button',{text:'Vivienda',onClick:openHousing}),
        el('button',{text:'Presupuesto',onClick:openBudgets}),
        el('button',{text:'Calendario gastos',onClick:openExpenseHeat})
      ]),
      list.length?el('div',{class:'list'},list.map(renderMovementItem)):el('div',{class:'empty',text:'Sin movimientos'})
    ])])
  ]);
}
function renderMovementItem(m){
  const icon=CAT_ICONS[m.category]||'📦', cls=m.type==='ingreso'?'money-green':'money-red';
  return el('div',{class:'list-item'},[
    el('div',{class:'list-main'},[
      el('div',{class:'list-title',html:`<span>${icon}</span> ${m.name}`}),
      el('div',{class:'list-meta',text:`${m.date} · ${m.category} · ${m.owner}`})
    ]),
    el('div',{class:'list-right'},[
      el('div',{class:cls,text:`${m.type==='ingreso'?'+':'-'} ${money(Math.abs(Number(m.amount||0)))}`}),
      btn('Editar','ghost',()=>openMovementEditor(m.owner,m))
    ])
  ]);
}
function renderAgenda(kind){
  const items=kind==='personal'?state.agenda.personal:state.agenda.hogar;
  return el('div',{class:'card'},[el('div',{class:'card-body'},[
    el('div',{class:'row spread'},[el('div',{},[el('div',{class:'card-title',text:kind==='personal'?'Agenda Jonny':'Agenda Hogar'}),el('div',{class:'card-sub',text:'Eventos sencillos y claros'})]),btn('Nuevo evento','primary',()=>openEvent(kind))]),
    el('div',{class:'hr'}),
    items.length?el('div',{class:'list'},items.map(ev=>el('div',{class:'list-item'},[
      el('div',{class:'list-main'},[el('div',{class:'list-title',text:ev.title}),el('div',{class:'list-meta',text:`${ev.date}${ev.notes?' · '+ev.notes:''}`})]),
      el('div',{class:'list-right'},[btn('Editar','ghost',()=>openEvent(kind,ev))])
    ]))):el('div',{class:'empty',text:'Sin eventos'})
  ])]);
}
function renderCalendarioConjunto(){
  const y=state.ui.homeMonth.year,m=state.ui.homeMonth.month;
  return el('div',{},[
    el('div',{class:'card'},[el('div',{class:'card-body'},[
      el('div',{class:'calendar-toolbar'},[
        monthNav('homeMonth'),
        el('div',{class:'small',text:'Vista conjunta Jonny / Angela'})
      ]),
      renderDualMonth(y,m)
    ])])
  ]);
}
function renderDualMonth(year,month){
  const head=el('div',{class:'calendar-head'},['L','M','X','J','V','S','D'].map(x=>el('div',{text:x})));
  const grid=el('div',{class:'calendar-grid'});
  const first=new Date(year,month,1), days=new Date(year,month+1,0).getDate(), offset=(first.getDay()+6)%7, prevLast=new Date(year,month,0).getDate();
  for(let i=0;i<42;i++){
    const dayNum=i-offset+1; let yy=year,mm=month,dd=dayNum,muted=false;
    if(dayNum<=0){muted=true;mm=month-1;yy=year;if(mm<0){mm=11;yy--}dd=prevLast+dayNum;}
    else if(dayNum>days){muted=true;mm=month+1;yy=year;if(mm>11){mm=0;yy++}dd=dayNum-days;}
    const iso=`${yy}-${pad2(mm+1)}-${pad2(dd)}`;
    const j=shiftById(shiftFor('jonny',iso)), a=shiftById(shiftFor('angela',iso));
    const cell=el('div',{class:`day-cell ${muted?'muted':''}`,onClick:()=>openDayEditor(iso,'jonny')},[
      el('div',{class:'day-top'},[
        el('div',{class:'day-num',text:String(dd)}),
        el('div',{class:'shift-dual'},[
          el('span',{text:`J:${j?.id||'-'}`,style:`color:${j?.color||'#94a3b8'}`}),
          el('span',{text:`A:${a?.id||'-'}`,style:`color:${a?.color||'#94a3b8'}`})
        ])
      ]),
      el('div',{class:'day-meta'},[el('div',{text:`J ${hoursFor('jonny',iso)}h`}),el('div',{text:`A ${hoursFor('angela',iso)}h`})])
    ]);
    grid.appendChild(cell);
  }
  return el('div',{},[head,grid]);
}
function renderMetas(){
  return el('div',{class:'card'},[el('div',{class:'card-body'},[
    el('div',{class:'card-title',text:'Metas comunes'}),
    el('div',{class:'callout',style:'margin-top:14px'},[
      el('div',{class:'list-title',text:'Mudanza / vivienda'}),
      el('div',{class:'list-meta',text:'Base lista para añadir objetivos de ahorro más adelante.'})
    ])
  ])]);
}
function renderAjustes(){
  const j=personCfg('jonny'), a=personCfg('angela');
  return el('div',{},[
    el('div',{class:'card'},[el('div',{class:'card-body'},[
      el('div',{class:'card-title',text:'Configuración de cobro'}),
      el('div',{class:'form-grid'},[
        el('div',{class:'callout'},[
          el('div',{class:'list-title',text:'Jonny · por horas'}),
          el('div',{class:'small',text:`${j.hourly} €/h · IRPF ${j.irpf}% · Extra ${j.extraRate} €/h · Velada ${j.veladaRate} €/h`}),
          btn('Editar Jonny','ghost',()=>openSalaryEditor('jonny'))
        ]),
        el('div',{class:'callout'},[
          el('div',{class:'list-title',text:'Angela · sueldo fijo'}),
          el('div',{class:'small',text:`${money(a.fixedSalary)} / mes`}),
          btn('Editar Angela','ghost',()=>openSalaryEditor('angela'))
        ])
      ]),
      el('div',{class:'hr'}),
      el('div',{class:'card-title',text:'Privacidad y compartido'}),
      el('div',{class:'small',text:'La idea correcta es: cada uno tiene su app privada y luego un hogar compartido por invitación. Esta versión ya está organizada así, pero todavía no sincroniza entre móviles.'})
    ])])
  ]);
}

function openSalaryEditor(person){
  const p=JSON.parse(JSON.stringify(personCfg(person)));
  const mode=fieldSelect('Tipo',p.salaryMode,[{value:'horas',label:'Por horas'},{value:'fijo',label:'Sueldo fijo'}]);
  const hourly=fieldNumber('€/hora',p.hourly||0,'0,00');
  const irpf=fieldNumber('IRPF (%)',p.irpf||0,'0','1');
  const extra=fieldNumber('Extra €/h',p.extraRate||0,'0,00');
  const vel=fieldNumber('Velada €/h',p.veladaRate||0,'0,00');
  const fixed=fieldNumber('Sueldo mensual fijo',p.fixedSalary||0,'0,00');
  openModal(`Editar ${personCfg(person).name}`,[
    mode.wrap,
    el('div',{class:'form-grid'},[hourly.wrap,irpf.wrap]),
    el('div',{class:'form-grid'},[extra.wrap,vel.wrap]),
    fixed.wrap
  ],[
    btn('Cancelar','ghost',closeModal),
    btn('Guardar','primary',()=>{
      p.salaryMode=mode.select.value;
      p.hourly=Number(hourly.input.value||0);
      p.irpf=Number(irpf.input.value||0);
      p.extraRate=Number(extra.input.value||0);
      p.veladaRate=Number(vel.input.value||0);
      p.fixedSalary=Number(fixed.input.value||0);
      state.work.people[person]=p; save(); closeModal(); render();
    })
  ]);
}

function openMovementEditor(owner='jonny',mov=null){
  const m=mov?{...mov}:{id:uid(),date:fmtISO(new Date()),name:'',amount:0,type:'gasto',owner,category:'Otros'};
  const date=fieldDate('Fecha',m.date), name=fieldText('Concepto',m.name,'Ej: Nómina'), amount=fieldNumber('Importe',m.amount,'0,00');
  const type=fieldSelect('Tipo',m.type,[{value:'ingreso',label:'Ingreso'},{value:'gasto',label:'Gasto'}]);
  const cat=fieldSelect('Categoría',m.category,Object.keys(CAT_ICONS).map(k=>({value:k,label:`${CAT_ICONS[k]} ${k}`})));
  openModal(mov?'Editar movimiento':'Nuevo movimiento',[
    el('div',{class:'form-grid'},[date.wrap,type.wrap]),
    name.wrap,
    el('div',{class:'form-grid'},[amount.wrap,cat.wrap])
  ],[
    btn('Cancelar','ghost',closeModal),
    mov?btn('Borrar','danger',()=>{state.economy.movements=state.economy.movements.filter(x=>x.id!==mov.id);save();closeModal();render();}):null,
    btn('Guardar','primary',()=>{
      m.date=date.input.value; m.name=name.input.value.trim(); m.amount=Number(amount.input.value||0); m.type=type.select.value; m.category=cat.select.value;
      if(!m.date||!m.name) return toast('Completa fecha y concepto');
      if(mov){ const i=state.economy.movements.findIndex(x=>x.id===mov.id); state.economy.movements[i]=m; } else state.economy.movements.push(m);
      save(); closeModal(); render();
    })
  ].filter(Boolean));
}
function openEvent(kind,ev=null){
  const e=ev?{...ev}:{id:uid(),title:'',date:fmtISO(new Date()),notes:''};
  const title=fieldText('Título',e.title,'Ej: ITV coche'), date=fieldDate('Fecha',e.date), notes=fieldText('Notas',e.notes,'Hora o detalle');
  openModal(ev?'Editar evento':'Nuevo evento',[title.wrap,date.wrap,notes.wrap],[
    btn('Cancelar','ghost',closeModal),
    ev?btn('Borrar','danger',()=>{state.agenda[kind]=state.agenda[kind].filter(x=>x.id!==ev.id);save();closeModal();render();}):null,
    btn('Guardar','primary',()=>{
      e.title=title.input.value.trim(); e.date=date.input.value; e.notes=notes.input.value.trim();
      if(!e.title||!e.date) return toast('Completa título y fecha');
      if(ev){ const i=state.agenda[kind].findIndex(x=>x.id===ev.id); state.agenda[kind][i]=e; } else state.agenda[kind].push(e);
      save(); closeModal(); render();
    })
  ].filter(Boolean));
}
function openHousing(){
  const h=JSON.parse(JSON.stringify(state.economy.housing));
  const keys=Object.keys(h.estimated);
  const fields=keys.map(k=>fieldNumber(k[0].toUpperCase()+k.slice(1),h.estimated[k],'0,00'));
  const mj=fieldNumber('Manual Jonny (%)',h.manual.jonny,'0','1'), ma=fieldNumber('Manual Angela (%)',h.manual.angela,'0','1');
  openModal('Vivienda',[
    el('div',{class:'form-grid-3'},fields.map(f=>f.wrap)),
    el('div',{class:'hr'}),
    el('div',{class:'small',text:'Solo se usa si eliges reparto manual.'}),
    el('div',{class:'form-grid'},[mj.wrap,ma.wrap])
  ],[
    btn('Cancelar','ghost',closeModal),
    btn('Guardar','primary',()=>{
      keys.forEach((k,i)=>h.estimated[k]=Number(fields[i].input.value||0));
      h.manual.jonny=Number(mj.input.value||0); h.manual.angela=Number(ma.input.value||0);
      state.economy.housing=h; save(); closeModal(); render();
    })
  ]);
}
function openBudgets(){
  const list=el('div',{class:'list'}, state.economy.budgets.map(b=>{
    const spent=state.economy.movements.filter(m=>m.type==='gasto'&&m.category===b.category).reduce((s,m)=>s+Math.abs(Number(m.amount||0)),0);
    const pct=b.limit>0?clamp(spent/b.limit*100,0,100):0;
    return el('div',{class:'list-item'},[
      el('div',{class:'list-main'},[
        el('div',{class:'list-title',text:b.category}),
        el('div',{class:'list-meta',text:`${money(spent)} / ${money(b.limit)}`}),
        el('div',{class:'progress'},[el('span',{style:`width:${pct}%`})])
      ]),
      btn('Editar','ghost',()=>{const nv=prompt('Límite',b.limit); if(nv!==null){b.limit=Number(nv||b.limit); save(); closeModal(); openBudgets(); render();}})
    ]);
  }));
  openModal('Presupuesto',[list],[btn('Cerrar','primary',closeModal)]);
}
function openExpenseHeat(){
  const y=state.ui.economyMonth.year,m=state.ui.economyMonth.month;
  const dayTotal=iso=>state.economy.movements.filter(x=>x.type==='gasto'&&x.date===iso).reduce((s,m)=>s+Math.abs(Number(m.amount||0)),0);
  const days=new Date(y,m+1,0).getDate(), max=Math.max(1,...Array.from({length:days},(_,i)=>dayTotal(`${y}-${pad2(m+1)}-${pad2(i+1)}`)));
  const head=el('div',{class:'calendar-head'},['L','M','X','J','V','S','D'].map(x=>el('div',{text:x})));
  const grid=el('div',{class:'heat-grid'});
  const first=new Date(y,m,1), offset=(first.getDay()+6)%7, prevLast=new Date(y,m,0).getDate();
  for(let i=0;i<42;i++){
    const dayNum=i-offset+1; let yy=y,mm=m,dd=dayNum,muted=false;
    if(dayNum<=0){muted=true;mm=m-1;yy=y;if(mm<0){mm=11;yy--}dd=prevLast+dayNum;}
    else if(dayNum>days){muted=true;mm=m+1;yy=y;if(mm>11){mm=0;yy++}dd=dayNum-days;}
    const iso=`${yy}-${pad2(mm+1)}-${pad2(dd)}`, total=dayTotal(iso), pct=clamp(total/max*100,0,100), color=total===0?'#e2e8f0':pct<34?'#93c5fd':pct<67?'#fb923c':'#ef4444';
    grid.appendChild(el('div',{class:`heat-cell ${muted?'muted':''}`},[
      el('div',{class:'day-top'},[el('div',{class:'day-num',text:String(dd)}),el('div',{class:'badge',text:money(total)})]),
      el('div',{class:'heatbar'},[el('span',{style:`width:${pct}%;background:${color}`})]),
      el('div',{class:'small',text:`${state.economy.movements.filter(x=>x.type==='gasto'&&x.date===iso).length} mov.`})
    ]));
  }
  openModal('Calendario de gastos',[head,grid],[btn('Cerrar','primary',closeModal)]);
}
function openDayEditor(iso,person){
  const ov=override(person,iso)||{};
  const sh=fieldSelect('Turno',shiftFor(person,iso)||'',state.work.shifts.map(s=>({value:s.id,label:`${s.id} · ${s.name}`})));
  const h=fieldNumber('Horas',hoursFor(person,iso),'0','0.25');
  const notes=fieldText('Nota',ov.notes||'','');
  openModal(`Editar día ${iso}`,[sh.wrap,h.wrap,notes.wrap],[
    btn('Cancelar','ghost',closeModal),
    btn('Guardar','primary',()=>{
      state.work.overrides[iso]=state.work.overrides[iso]||{};
      state.work.overrides[iso][person]={shiftId:sh.select.value,hours:Number(h.input.value||0),notes:notes.input.value||''};
      save(); closeModal(); render();
    })
  ]);
}
function openSettings(){
  openModal('Ajustes',[
    el('div',{class:'callout'},[
      el('div',{class:'list-title',text:'Privado + compartido'}),
      el('div',{class:'small',text:'La idea correcta es esta: tú tienes tu parte privada, Angela la suya, y luego existe Hogar como espacio compartido. Para que se sincronice entre ambos móviles hará falta una base de datos compartida, por ejemplo Firebase.'})
    ])
  ],[
    btn('Reset total','danger',()=>{if(confirm('¿Borrar todos los datos?')){localStorage.removeItem(KEY); location.reload();}}),
    btn('Cerrar','primary',closeModal)
  ]);
}
function quickAdd(){
  if(state.ui.area==='jonny' && state.ui.jonnyTab==='economia') return openMovementEditor('jonny');
  if(state.ui.area==='hogar' && state.ui.hogarTab==='economia') return openMovementEditor('hogar');
  if(state.ui.area==='jonny' && state.ui.jonnyTab==='agenda') return openEvent('personal');
  if(state.ui.area==='hogar' && state.ui.hogarTab==='agenda') return openEvent('hogar');
  if(state.ui.area==='jonny' && state.ui.jonnyTab==='trabajo') return openContracts();
}

document.addEventListener('DOMContentLoaded',()=>{
  $('#modalClose').onclick=closeModal;
  $('#modalOverlay').addEventListener('click',e=>{ if(e.target===$('#modalOverlay')) closeModal(); });
  render();
});
