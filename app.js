
'use strict';

const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);
const pad2 = (n) => String(n).padStart(2,'0');
const fmtISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const parseISO = (s) => {
  const [y,m,d] = String(s||'').split('-').map(Number);
  if(!y||!m||!d) return null;
  const dt = new Date(y, m-1, d);
  return isNaN(dt.getTime()) ? null : dt;
};
const dayNumUTC = (d) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())/86400000);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const money = (n) => (Number(n||0)).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const monthName = (m) => ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m];
const round2 = (n) => Math.round((Number(n||0)+Number.EPSILON)*100)/100;

const SHIFT_COLORS = {
  L: '#16a34a', // libre verde
  M: '#2563eb', // mañana azul
  T: '#ea580c', // tarde naranja
  N: '#7c3aed', // noche morado
  P: '#dc2626', // partido rojo
  V: '#475569', // velada gris oscuro
  X: '#eab308', // vacaciones amarillo
};

const KEY = 'homeflow_pro_v1';

const DEFAULT = {
  ui: {
    welcomed: false,
    route: 'home',
    workFocus: {year:new Date().getFullYear(), month:new Date().getMonth()},
    agendaFocus: {year:new Date().getFullYear(), month:new Date().getMonth()},
    economyFocus: {year:new Date().getFullYear(), month:new Date().getMonth()},
    workFilter: 'ambos',
    economyTab: 'resumen',
    allocationMode: 'disponible', // ingresos | disponible | manual
  },
  people: [
    {id:'jonny', name:'Jonny', color:'#2563eb'},
    {id:'angela', name:'Angela', color:'#ec4899'}
  ],
  work: {
    shifts: [
      {id:'M', name:'Mañana', color:SHIFT_COLORS.M, hours:8},
      {id:'T', name:'Tarde', color:SHIFT_COLORS.T, hours:8},
      {id:'N', name:'Noche', color:SHIFT_COLORS.N, hours:8},
      {id:'L', name:'Libre', color:SHIFT_COLORS.L, hours:0},
      {id:'P', name:'Partido', color:SHIFT_COLORS.P, hours:12},
      {id:'V', name:'Velada', color:SHIFT_COLORS.V, hours:0},
      {id:'X', name:'Vacaciones', color:SHIFT_COLORS.X, hours:0}
    ],
    payRules: {
      jonny: {hourly: 14, irpf: 12, extraRate: 15, veladaRate: 18},
      angela: {hourly: 10, irpf: 0, extraRate: 10, veladaRate: 0}
    },
    contracts: [
      {
        id: uid(), personId:'jonny', name:'Contrato Jonny',
        start:'2026-03-01', end:'',
        rotationEnabled:true, rotationStart:'2026-03-01',
        pattern:['M','M','M','M','M','M','L','T','T','T','T','T','T','L','N','N','N','N','N','N','L']
      },
      {
        id: uid(), personId:'angela', name:'Contrato Angela',
        start:'2026-03-01', end:'',
        rotationEnabled:true, rotationStart:'2026-03-01',
        pattern:['T','T','T','T','L','L','M','M','M','P','L','L','N','N']
      }
    ],
    overrides: {
      // iso: { jonny:{shiftId, hours, extras, veladas, notes}, angela:{...} }
    }
  },
  economy: {
    accounts: [
      {id:uid(), name:'Cuenta Jonny', owner:'jonny', type:'banco', balance:0},
      {id:uid(), name:'Cuenta Angela', owner:'angela', type:'banco', balance:0},
      {id:uid(), name:'Cuenta conjunta', owner:'compartido', type:'banco', balance:0},
      {id:uid(), name:'Ahorro', owner:'compartido', type:'ahorro', balance:0}
    ],
    movements: [],
    recurring: [],
    credits: [],
    goals: [],
    budgets: [
      {id:uid(), category:'Comida', limit:400},
      {id:uid(), category:'Gasolina', limit:150},
      {id:uid(), category:'Ocio', limit:200},
      {id:uid(), category:'Otros', limit:250}
    ],
    housing: {
      enabled:true,
      estimated:{
        alquiler:900,
        luz:80,
        agua:30,
        internet:40,
        comida:400,
        otros:100
      },
      manualSplit:{jonny:60, angela:40}
    }
  },
  agenda: {
    events:[]
  }
};

function deepMerge(a,b){
  if(b == null) return a;
  if(Array.isArray(a) || Array.isArray(b)) return b ?? a;
  if(typeof a === 'object' && typeof b === 'object'){
    for(const k of Object.keys(b)){
      if(k in a) a[k] = deepMerge(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  }
  return b === undefined ? a : b;
}
function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return structuredClone(DEFAULT);
    return deepMerge(structuredClone(DEFAULT), JSON.parse(raw));
  }catch(e){
    console.warn(e);
    return structuredClone(DEFAULT);
  }
}
let state = loadState();
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }

function normalizeFocus(f){
  const now = new Date();
  const y = Number(f?.year), m = Number(f?.month);
  return {
    year: Number.isFinite(y) && y>=2020 && y<=2100 ? y : now.getFullYear(),
    month: Number.isFinite(m) && m>=0 && m<=11 ? m : now.getMonth()
  }
}
state.ui.workFocus = normalizeFocus(state.ui.workFocus);
state.ui.economyFocus = normalizeFocus(state.ui.economyFocus);
state.ui.agendaFocus = normalizeFocus(state.ui.agendaFocus);
save();

function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._tm);
  toast._tm = setTimeout(()=>t.classList.add('hidden'), 1600);
}

function openModal(title, bodyNodes=[], footNodes=[]){
  $('#modalTitle').textContent = title;
  const body = $('#modalBody');
  const foot = $('#modalFoot');
  body.innerHTML = '';
  foot.innerHTML = '';
  bodyNodes.forEach(n => body.appendChild(n));
  footNodes.forEach(n => foot.appendChild(n));
  $('#modalOverlay').classList.remove('hidden');
}
function closeModal(){ $('#modalOverlay').classList.add('hidden'); }

function button(text, kind='', onClick=null){
  const b = el('button', {class:`btn ${kind}`.trim(), text});
  if(onClick) b.addEventListener('click', onClick);
  return b;
}
function el(tag, attrs={}, children=[]){
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k==='class') n.className = v;
    else if(k==='text') n.textContent = v;
    else if(k==='html') n.innerHTML = v;
    else if(k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else if(v !== undefined && v !== null) n.setAttribute(k, v);
  });
  (Array.isArray(children)?children:[children]).forEach(c=>{
    if(c == null) return;
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return n;
}
function fieldText(label, value='', placeholder=''){
  const input = el('input',{class:'input', value, placeholder});
  return {wrap:el('div',{class:'field'},[el('label',{text:label}), input]), input};
}
function fieldNumber(label, value='', placeholder='', step='0.01'){
  const input = el('input',{class:'input', value, placeholder, type:'number', step});
  return {wrap:el('div',{class:'field'},[el('label',{text:label}), input]), input};
}
function fieldDate(label, value=''){
  const input = el('input',{class:'input', value, type:'date'});
  return {wrap:el('div',{class:'field'},[el('label',{text:label}), input]), input};
}
function fieldSelect(label, value, options=[]){
  const select = el('select',{class:'select'});
  options.forEach(o=>{
    const opt = el('option',{value:o.value, text:o.label});
    if(String(o.value) === String(value)) opt.selected = true;
    select.appendChild(opt);
  });
  return {wrap:el('div',{class:'field'},[el('label',{text:label}), select]), select};
}
function fieldTextarea(label, value=''){
  const input = el('textarea',{class:'textarea'});
  input.value = value;
  return {wrap:el('div',{class:'field'},[el('label',{text:label}), input]), input};
}

function shiftById(id){ return state.work.shifts.find(s=>s.id===id) || null; }
function personById(id){ return state.people.find(p=>p.id===id) || null; }

function activeContract(personId, iso){
  const d = parseISO(iso);
  if(!d) return null;
  const t = dayNumUTC(d);
  let best = null;
  state.work.contracts
    .filter(c=>c.personId===personId)
    .forEach(c=>{
      const s = parseISO(c.start);
      const e = c.end ? parseISO(c.end) : null;
      if(!s) return;
      const ts = dayNumUTC(s);
      const te = e ? dayNumUTC(e) : 10**12;
      if(t >= ts && t <= te){
        if(!best) best = c;
        else if(ts >= dayNumUTC(parseISO(best.start))) best = c;
      }
    });
  return best;
}

function autoShiftFor(personId, iso){
  const c = activeContract(personId, iso);
  if(!c || !c.rotationEnabled) return null;
  const start = parseISO(c.rotationStart);
  const d = parseISO(iso);
  if(!start || !d || !c.pattern?.length) return null;
  const diff = dayNumUTC(d) - dayNumUTC(start);
  const idx = ((diff % c.pattern.length) + c.pattern.length) % c.pattern.length;
  return c.pattern[idx];
}

function overrideFor(personId, iso){
  return state.work.overrides?.[iso]?.[personId] || null;
}

function dayShiftFor(personId, iso){
  const ov = overrideFor(personId, iso);
  if(ov?.shiftId) return ov.shiftId;
  return autoShiftFor(personId, iso);
}

function effectiveHoursFor(personId, iso){
  const ov = overrideFor(personId, iso);
  const sh = shiftById(dayShiftFor(personId, iso));
  return Number(ov?.hours ?? sh?.hours ?? 0);
}

function personMonthWorkSummary(personId, year, month){
  let hours = 0, extras = 0, veladas = 0, gross = 0;
  const rules = state.work.payRules[personId] || {hourly:0, irpf:0, extraRate:0, veladaRate:0};

  for(let d=1;;d++){
    const date = new Date(year, month, d);
    if(date.getMonth() !== month) break;
    const iso = fmtISO(date);
    const ov = overrideFor(personId, iso);
    const shiftId = dayShiftFor(personId, iso);
    const shift = shiftById(shiftId);

    const baseHours = Number(ov?.hours ?? shift?.hours ?? 0);
    const extraHours = Number(ov?.extraHours ?? 0);
    const veladaHours = Number(ov?.veladas ?? 0);

    hours += baseHours;
    extras += extraHours;
    veladas += veladaHours;

    gross += (baseHours * Number(rules.hourly||0))
           + (extraHours * Number(rules.extraRate||0))
           + (veladaHours * Number(rules.veladaRate||0));
  }

  const net = gross * (1 - Number(rules.irpf||0)/100);
  return {hours, extras, veladas, gross, net};
}

function monthlyMovements(year, month){
  return state.economy.movements.filter(m=>{
    const d = parseISO(m.date);
    return d && d.getFullYear()===year && d.getMonth()===month;
  });
}
function movementSignedAmount(m){
  const amt = Number(m.amount||0);
  return m.type==='ingreso' ? Math.abs(amt) : -Math.abs(amt);
}
function monthlyIncomeFor(ownerId, year, month){
  return monthlyMovements(year, month)
    .filter(m=>m.type==='ingreso' && m.owner===ownerId)
    .reduce((s,m)=>s+Math.abs(Number(m.amount||0)),0);
}
function monthlyExpenseFor(ownerId, year, month){
  return monthlyMovements(year, month)
    .filter(m=>m.type==='gasto' && m.owner===ownerId)
    .reduce((s,m)=>s+Math.abs(Number(m.amount||0)),0);
}

function monthlyAvailableFor(ownerId, year, month){
  const income = monthlyIncomeFor(ownerId, year, month);
  const expense = monthlyExpenseFor(ownerId, year, month);
  return income - expense;
}
function housingTotal(){
  return Object.values(state.economy.housing.estimated).reduce((s,v)=>s+Number(v||0),0);
}
function allocationRecommendation(year, month){
  const mode = state.ui.allocationMode;
  const total = housingTotal();
  const incomes = {
    jonny: monthlyIncomeFor('jonny', year, month),
    angela: monthlyIncomeFor('angela', year, month),
  };
  const available = {
    jonny: monthlyAvailableFor('jonny', year, month),
    angela: monthlyAvailableFor('angela', year, month),
  };

  if(mode === 'manual'){
    const j = Number(state.economy.housing.manualSplit.jonny||0);
    const a = Number(state.economy.housing.manualSplit.angela||0);
    return {jonny: round2(total*j/100), angela: round2(total*a/100), mode};
  }

  const base = mode === 'ingresos' ? incomes : available;
  const sum = Math.max(0, Number(base.jonny||0)) + Math.max(0, Number(base.angela||0));
  if(sum <= 0) return {jonny:0, angela:0, mode};

  return {
    jonny: round2(total * (Math.max(0,base.jonny)/sum)),
    angela: round2(total * (Math.max(0,base.angela)/sum)),
    mode
  };
}

function accountBalance(accountId){
  const acc = state.economy.accounts.find(a=>a.id===accountId);
  let bal = Number(acc?.balance||0);
  state.economy.movements.filter(m=>m.accountId===accountId).forEach(m=> bal += movementSignedAmount(m));
  return bal;
}

function ensureWelcome(){
  const welcome = $('#welcome');
  if(state.ui.welcomed){
    welcome.classList.add('hidden');
    $('#shell').classList.remove('hidden');
    return;
  }
  welcome.innerHTML = '';
  const card = el('div',{class:'welcome-card'},[
    el('div',{class:'logo-box'},[
      (() => {
        const house = el('div',{class:'logo-house'});
        house.appendChild(el('div',{class:'door'}));
        return house;
      })()
    ]),
    el('h1',{class:'welcome-title', text:'HomeFlow'}),
    el('div',{class:'welcome-sub', text:'Organiza trabajo, gastos, hogar y agenda en una sola app clara y elegante.'}),
    el('div',{class:'welcome-actions'},[
      button('Empezar','btn--primary', ()=>{
        state.ui.welcomed = true;
        save();
        ensureWelcome();
        render();
      }),
      button('Reset total','btn--danger', ()=>{
        if(confirm('¿Borrar todos los datos?')){
          localStorage.removeItem(KEY);
          location.reload();
        }
      })
    ])
  ]);
  welcome.appendChild(card);
  $('#shell').classList.add('hidden');
}

function setTop(sub){
  $('#brandSub').textContent = sub || 'Gestión de hogar';
}

function routeTo(route){
  state.ui.route = route;
  save();
  render();
}

function renderHome(){
  setTop('Inicio');
  $('#backBtn').classList.add('hidden');
  $('#quickAddBtn').classList.add('hidden');
  const work = personMonthWorkSummary('jonny', state.ui.workFocus.year, state.ui.workFocus.month);
  const ecoY = state.ui.economyFocus.year, ecoM = state.ui.economyFocus.month;
  const alloc = allocationRecommendation(ecoY, ecoM);

  $('#main').innerHTML = '';
  $('#main').appendChild(el('div',{class:'hero'},[
    el('div',{class:'card'},[
      el('div',{class:'card__body'},[
        el('div',{class:'card__title', text:'Bienvenido'}),
        el('div',{class:'card__sub', text:'Todo en orden para casa, trabajo y gastos.'}),
        el('div',{class:'menu-grid'},[
          tile('Trabajo','Turnos, contratos, vacaciones y vista conjunta','🗓',()=>routeTo('work')),
          tile('Economía','Resumen mensual, vivienda, cuentas y calendario de gastos','💶',()=>routeTo('economy')),
          tile('Agenda','Eventos, citas y recordatorios','📌',()=>routeTo('agenda'))
        ])
      ])
    ]),
    el('div',{class:'card'},[
      el('div',{class:'card__body'},[
        el('div',{class:'card__title', text:'Resumen rápido'}),
        el('div',{class:'stats-grid'},[
          kpi('Horas mes', work.hours.toFixed(2), 'Trabajo de Jonny'),
          kpi('Saldo hogar', money(monthlyAvailableFor('jonny', ecoY, ecoM)+monthlyAvailableFor('angela', ecoY, ecoM)), 'Disponible conjunto'),
          kpi('Vivienda', money(housingTotal()), 'Coste mensual'),
          kpi('Aporte sugerido', money(alloc.jonny + alloc.angela), alloc.mode==='disponible'?'Por saldo disponible':alloc.mode==='ingresos'?'Por ingresos':'Manual')
        ])
      ])
    ])
  ]));
}
function tile(title,text,icon,action){
  return el('div',{class:'menu-tile', onClick:action},[
    el('div',{},[
      el('div',{class:'menu-tile__title', text:title}),
      el('div',{class:'menu-tile__text', text:text})
    ]),
    el('div',{class:'menu-tile__icon', text:icon})
  ]);
}
function kpi(label,value,help){
  return el('div',{class:'kpi'},[
    el('div',{class:'kpi__label',text:label}),
    el('div',{class:'kpi__value',text:value}),
    el('div',{class:'kpi__help',text:help})
  ]);
}

function workFilterButtons(){
  const filters = [
    ['jonny','Jonny'],
    ['angela','Angela'],
    ['ambos','Ambos']
  ];
  const wrap = el('div',{class:'segmented'});
  filters.forEach(([id,label])=>{
    const b = el('button',{text:label, class: state.ui.workFilter===id ? 'active':''});
    b.addEventListener('click', ()=>{
      state.ui.workFilter = id; save(); render();
    });
    wrap.appendChild(b);
  });
  return wrap;
}
function monthYearNav(focusKey, rerender){
  const focus = state.ui[focusKey];
  const monthSel = el('select',{class:'select'});
  for(let i=0;i<12;i++){
    const op = el('option',{value:i,text:monthName(i)});
    if(i===focus.month) op.selected = true;
    monthSel.appendChild(op);
  }
  const yearSel = el('select',{class:'select'});
  for(let y=2023;y<=2035;y++){
    const op = el('option',{value:y,text:String(y)});
    if(y===focus.year) op.selected = true;
    yearSel.appendChild(op);
  }
  monthSel.addEventListener('change',()=>{focus.month=Number(monthSel.value); save(); rerender();});
  yearSel.addEventListener('change',()=>{focus.year=Number(yearSel.value); save(); rerender();});
  return el('div',{class:'calendar-toolbar__nav'},[
    button('◀','btn--ghost', ()=>{
      let m = focus.month-1, y = focus.year;
      if(m<0){m=11;y--}
      focus.month=m; focus.year=y; save(); rerender();
    }),
    monthSel,
    yearSel,
    button('▶','btn--ghost', ()=>{
      let m = focus.month+1, y = focus.year;
      if(m>11){m=0;y++}
      focus.month=m; focus.year=y; save(); rerender();
    })
  ]);
}

function renderWork(){
  setTop('Trabajo');
  $('#backBtn').classList.remove('hidden');
  $('#quickAddBtn').classList.remove('hidden');
  const focus = state.ui.workFocus;

  const main = $('#main');
  main.innerHTML = '';

  const sumJonny = personMonthWorkSummary('jonny', focus.year, focus.month);
  const sumAngela = personMonthWorkSummary('angela', focus.year, focus.month);
  const totalNet = sumJonny.net + sumAngela.net;

  main.appendChild(el('div',{class:'card'},[
    el('div',{class:'card__body'},[
      el('div',{class:'stats-grid'},[
        kpi('Horas Jonny', sumJonny.hours.toFixed(2), 'Mes actual'),
        kpi('Horas Angela', sumAngela.hours.toFixed(2), 'Mes actual'),
        kpi('Extras totales', (sumJonny.extras+sumAngela.extras).toFixed(2), 'Horas extra'),
        kpi('Cash neto', money(totalNet), 'Estimado mensual')
      ]),
      el('div',{class:'hr'}),
      el('div',{class:'calendar-toolbar'},[
        monthYearNav('workFocus', render),
        workFilterButtons(),
        el('div',{class:'row'},[
          button('Turnos','btn--ghost', openShiftManager),
          button('Contratos','btn--ghost', openContractsManager)
        ])
      ])
    ])
  ]));

  main.appendChild(el('div',{class:'card'},[
    el('div',{class:'card__body'},[
      renderWorkCalendar(focus.year, focus.month),
      renderLegend()
    ])
  ]));
}

function renderLegend(){
  const wrap = el('div',{class:'legend'});
  state.work.shifts.forEach(s=>{
    wrap.appendChild(el('div',{class:'people-chip'},[
      el('span',{class:'dot', style:`background:${s.color}`}),
      el('span',{text:`${s.id} · ${s.name}`})
    ]));
  });
  return wrap;
}

function renderWorkCalendar(year, month){
  const head = el('div',{class:'calendar-head'},['L','M','X','J','V','S','D'].map(x=>el('div',{text:x})));
  const grid = el('div',{class:'calendar-grid'});
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const offset = (first.getDay()+6)%7;
  const prevLast = new Date(year, month, 0).getDate();

  for(let i=0;i<42;i++){
    const dayNum = i - offset + 1;
    let yy=year, mm=month, dd=dayNum, muted=false;
    if(dayNum<=0){
      muted=true;
      mm = month-1; yy=year;
      if(mm<0){mm=11;yy--}
      dd = prevLast + dayNum;
    }else if(dayNum>daysInMonth){
      muted=true;
      mm = month+1; yy=year;
      if(mm>11){mm=0;yy++}
      dd = dayNum - daysInMonth;
    }
    const iso = `${yy}-${pad2(mm+1)}-${pad2(dd)}`;
    grid.appendChild(renderDayCell(iso, dd, muted));
  }
  return el('div',{},[head, grid]);
}

function shiftChip(personId, iso){
  const shiftId = dayShiftFor(personId, iso);
  const sh = shiftById(shiftId);
  if(!sh) return null;
  return {id:sh.id, color:sh.color};
}
function renderDayCell(iso, dayNum, muted){
  const cell = el('div',{class:`day-cell ${muted?'muted':''}`});
  const top = el('div',{class:'day-top'},[
    el('div',{class:'day-num',text:String(dayNum)})
  ]);

  let content = null;
  const filter = state.ui.workFilter;
  if(filter === 'jonny' || filter === 'angela'){
    const chip = shiftChip(filter, iso);
    if(chip) content = el('div',{class:'day-shift', style:`background:${chip.color}` ,text:chip.id});
  }else{
    const j = shiftChip('jonny', iso);
    const a = shiftChip('angela', iso);
    if(j || a){
      content = el('div',{class:'day-shift dual', style:'background:#f8fafc;color:#0f172a;border:1px solid var(--line)'},[
        j ? el('span',{text:`J:${j.id}`, style:`color:${j.color};font-weight:900`}) : el('span',{text:'J:-', style:'color:#94a3b8'}),
        a ? el('span',{text:`A:${a.id}`, style:`color:${a.color};font-weight:900`}) : el('span',{text:'A:-', style:'color:#94a3b8'})
      ]);
    }
  }

  top.appendChild(content || el('div',{}));
  cell.appendChild(top);

  if(filter === 'ambos'){
    const extra = el('div',{class:'day-mini'},[
      el('div',{text:`J ${effectiveHoursFor('jonny', iso)}h`}),
      el('div',{text:`A ${effectiveHoursFor('angela', iso)}h`})
    ]);
    cell.appendChild(extra);
  }else{
    const h = effectiveHoursFor(filter, iso);
    cell.appendChild(el('div',{class:'day-mini', text:`${h}h`}));
  }
  cell.addEventListener('click', ()=>openDayEditor(iso));
  return cell;
}

function openDayEditor(iso){
  const peopleFields = state.people.map(p=>{
    const ov = overrideFor(p.id, iso) || {};
    const shiftSelect = fieldSelect(`${p.name} · turno`, ov.shiftId||'', [{value:'',label:'(Auto)'}].concat(state.work.shifts.map(s=>({value:s.id,label:`${s.id} · ${s.name}`}))));
    const hours = fieldNumber(`${p.name} · horas`, ov.hours ?? '', 'Auto', '0.25');
    const extras = fieldNumber(`${p.name} · extras`, ov.extraHours ?? 0, '0', '0.25');
    const vel = fieldNumber(`${p.name} · veladas`, ov.veladas ?? 0, '0', '0.25');
    const notes = fieldText(`${p.name} · nota`, ov.notes ?? '', '');
    return {p, shiftSelect, hours, extras, vel, notes};
  });

  const body = [];
  peopleFields.forEach(block=>{
    body.push(el('div',{class:'callout'},[
      el('div',{class:'card__title', text:block.p.name}),
      block.shiftSelect.wrap,
      block.hours.wrap,
      block.extras.wrap,
      block.vel.wrap,
      block.notes.wrap
    ]));
  });

  openModal(`Editar día ${iso}`, body, [
    button('Cancelar','btn--ghost', closeModal),
    button('Borrar cambios','btn--danger', ()=>{
      delete state.work.overrides[iso];
      save(); closeModal(); render();
    }),
    button('Guardar','btn--primary', ()=>{
      state.work.overrides[iso] = state.work.overrides[iso] || {};
      peopleFields.forEach(b=>{
        state.work.overrides[iso][b.p.id] = {
          shiftId: b.shiftSelect.select.value || '',
          hours: b.hours.input.value === '' ? null : Number(b.hours.input.value),
          extraHours: Number(b.extras.input.value||0),
          veladas: Number(b.vel.input.value||0),
          notes: b.notes.input.value||''
        };
      });
      save(); closeModal(); render(); toast('Día guardado');
    })
  ]);
}

function openShiftManager(){
  const list = el('div',{class:'list'});
  state.work.shifts.forEach(s=>{
    list.appendChild(el('div',{class:'list-item'},[
      el('div',{class:'list-item__main'},[
        el('div',{class:'list-item__title', text:`${s.id} · ${s.name}`}),
        el('div',{class:'list-item__meta', text:`Horas: ${s.hours} · Color editable`})
      ]),
      el('div',{class:'list-item__right'},[
        el('input',{type:'color', value:s.color, class:'input', style:'width:56px;padding:4px;min-height:44px'}),
        button('Editar','btn--ghost', ()=>{
          const name = prompt('Nombre', s.name);
          const hours = prompt('Horas', s.hours);
          if(name !== null) s.name = name || s.name;
          if(hours !== null) s.hours = Number(hours||s.hours);
          save(); closeModal(); openShiftManager();
        })
      ])
    ]));
    const colorInput = list.lastChild.querySelector('input[type="color"]');
    colorInput.addEventListener('input', e=>{ s.color = e.target.value; save(); render(); });
  });
  openModal('Gestionar turnos', [list], [button('Cerrar','btn--primary', closeModal)]);
}

function openContractsManager(){
  const wrap = el('div',{class:'list'});
  state.work.contracts
    .sort((a,b)=> String(b.start).localeCompare(String(a.start)))
    .forEach(c=>{
      const person = personById(c.personId);
      wrap.appendChild(el('div',{class:'list-item'},[
        el('div',{class:'list-item__main'},[
          el('div',{class:'list-item__title', text:`${c.name} · ${person?.name||''}`}),
          el('div',{class:'list-item__meta', text:`${c.start}${c.end?' → '+c.end:''} · Patrón: ${c.pattern.join('-')}`})
        ]),
        el('div',{class:'list-item__right'},[
          button('Editar','btn--ghost', ()=>openContractEditor(c)),
          button('Borrar','btn--danger', ()=>{
            if(confirm('¿Borrar contrato?')){
              state.work.contracts = state.work.contracts.filter(x=>x.id!==c.id);
              save(); closeModal(); openContractsManager(); render();
            }
          })
        ])
      ]));
    });

  openModal('Contratos', [wrap.children.length?wrap:el('div',{class:'empty-note',text:'Sin contratos'})], [
    button('Nuevo','btn--primary', ()=>openContractEditor()),
    button('Cerrar','btn--ghost', closeModal)
  ]);
}

function openContractEditor(contract=null){
  const c = contract ? JSON.parse(JSON.stringify(contract)) : {
    id: uid(),
    personId:'jonny',
    name:'',
    start: fmtISO(new Date()),
    end:'',
    rotationEnabled:true,
    rotationStart: fmtISO(new Date()),
    pattern:['M','M','M','M','M','M','L']
  };

  const person = fieldSelect('Persona', c.personId, state.people.map(p=>({value:p.id,label:p.name})));
  const name = fieldText('Nombre', c.name, 'Ej: Contrato fábrica');
  const start = fieldDate('Inicio', c.start);
  const end = fieldDate('Fin (opcional)', c.end || '');
  const rotStart = fieldDate('Fecha inicio patrón', c.rotationStart);
  const enabled = el('label',{class:'people-chip'},[
    el('input',{type:'checkbox'}),
    el('span',{text:'Rotación activada'})
  ]);
  enabled.querySelector('input').checked = !!c.rotationEnabled;

  const patternBox = el('div',{class:'row'});
  const renderPattern = ()=>{
    patternBox.innerHTML = '';
    c.pattern.forEach((id, idx)=>{
      const sh = shiftById(id);
      const chip = el('div',{class:'people-chip'},[
        el('span',{class:'dot', style:`background:${sh?.color||'#cbd5e1'}`}),
        el('span',{text:sh?.name||id}),
        el('span',{text:'×', style:'cursor:pointer;opacity:.7'})
      ]);
      chip.addEventListener('click', ()=>{
        c.pattern.splice(idx,1); renderPattern();
      });
      patternBox.appendChild(chip);
    });
  };
  renderPattern();

  const addRow = el('div',{class:'row'});
  state.work.shifts.forEach(sh=>{
    addRow.appendChild(button(sh.name,'btn--ghost', ()=>{
      c.pattern.push(sh.id); renderPattern();
    }));
  });

  openModal(contract?'Editar contrato':'Nuevo contrato', [
    person.wrap, name.wrap,
    el('div',{class:'form-grid'},[start.wrap,end.wrap]),
    enabled,
    rotStart.wrap,
    el('div',{class:'small', text:'Construye el patrón tocando los botones. Sin escribir letras ni comas.'}),
    addRow,
    button('Vaciar patrón','btn--danger', ()=>{ c.pattern=[]; renderPattern(); }),
    patternBox
  ], [
    button('Cancelar','btn--ghost', closeModal),
    button('Guardar','btn--primary', ()=>{
      c.personId = person.select.value;
      c.name = name.input.value.trim();
      c.start = start.input.value;
      c.end = end.input.value;
      c.rotationEnabled = enabled.querySelector('input').checked;
      c.rotationStart = rotStart.input.value;
      if(!c.name || !c.start) return toast('Completa nombre e inicio');
      if(!c.pattern.length && c.rotationEnabled) return toast('Patrón vacío');
      if(contract){
        const i = state.work.contracts.findIndex(x=>x.id===contract.id);
        state.work.contracts[i] = c;
      }else{
        state.work.contracts.push(c);
      }
      save(); closeModal(); openContractsManager(); render();
    })
  ]);
}

function renderEconomy(){
  setTop('Economía');
  $('#backBtn').classList.remove('hidden');
  $('#quickAddBtn').classList.remove('hidden');
  const focus = state.ui.economyFocus;
  const year = focus.year, month = focus.month;

  const main = $('#main');
  main.innerHTML = '';

  const monthMovs = monthlyMovements(year, month);
  const totalIncome = monthMovs.filter(m=>m.type==='ingreso').reduce((s,m)=>s+Math.abs(Number(m.amount||0)),0);
  const totalExpense = monthMovs.filter(m=>m.type==='gasto').reduce((s,m)=>s+Math.abs(Number(m.amount||0)),0);
  const availableTotal = monthlyAvailableFor('jonny', year, month) + monthlyAvailableFor('angela', year, month);
  const alloc = allocationRecommendation(year, month);

  main.appendChild(el('div',{class:'card'},[
    el('div',{class:'card__body'},[
      el('div',{class:'stats-grid'},[
        kpi('Ingresos mes', money(totalIncome), 'Entradas del mes'),
        kpi('Gastos mes', money(totalExpense), 'Salidas del mes'),
        kpi('Saldo disponible', money(availableTotal), 'Jonny + Angela'),
        kpi('Vivienda', money(housingTotal()), state.ui.allocationMode==='disponible'?'Por saldo disponible':state.ui.allocationMode==='ingresos'?'Por ingresos':'Manual')
      ]),
      el('div',{class:'hr'}),
      el('div',{class:'calendar-toolbar'},[
        monthYearNav('economyFocus', render),
        economyTabs()
      ])
    ])
  ]));

  const tab = state.ui.economyTab;
  if(tab==='resumen') main.appendChild(renderEconomySummary(year, month, alloc));
  if(tab==='movimientos') main.appendChild(renderMovementsPanel(year, month));
  if(tab==='cuentas') main.appendChild(renderAccountsPanel());
  if(tab==='fijos') main.appendChild(renderRecurringPanel());
  if(tab==='vivienda') main.appendChild(renderHousingPanel(year, month, alloc));
  if(tab==='presupuesto') main.appendChild(renderBudgetPanel(year, month));
  if(tab==='gastoscal') main.appendChild(renderExpenseCalendar(year, month));
}

function economyTabs(){
  const tabs = [
    ['resumen','Resumen'],
    ['movimientos','Movimientos'],
    ['cuentas','Cuentas'],
    ['fijos','Fijos'],
    ['vivienda','Vivienda'],
    ['presupuesto','Presupuesto'],
    ['gastoscal','Calendario gastos']
  ];
  const wrap = el('div',{class:'section-tabs'});
  tabs.forEach(([id,label])=>{
    wrap.appendChild(el('button',{class:`section-tab ${state.ui.economyTab===id?'active':''}`, text:label, onClick:()=>{
      state.ui.economyTab = id; save(); render();
    }}));
  });
  return wrap;
}

function renderEconomySummary(year, month, alloc){
  return el('div',{class:'card'},[
    el('div',{class:'card__body'},[
      el('div',{class:'card__title', text:'Resumen del hogar'}),
      el('div',{class:'card__sub', text:'Mes a mes, con visión individual y conjunta.'}),
      el('div',{class:'hr'}),
      el('div',{class:'stats-grid'},[
        kpi('Jonny ingresa', money(monthlyIncomeFor('jonny', year, month)), 'Mes actual'),
        kpi('Angela ingresa', money(monthlyIncomeFor('angela', year, month)), 'Mes actual'),
        kpi('Jonny disponible', money(monthlyAvailableFor('jonny', year, month)), 'Tras sus gastos del mes'),
        kpi('Angela disponible', money(monthlyAvailableFor('angela', year, month)), 'Tras sus gastos del mes')
      ]),
      el('div',{class:'hr'}),
      el('div',{class:'callout'},[
        el('div',{class:'card__title', text:'Aportación recomendada al hogar'}),
        el('div',{class:'small', text:'Puedes calcularla por ingresos, por saldo disponible o manual.'}),
        el('div',{class:'row', style:'margin-top:12px'},[
          el('div',{class:'people-chip'},[el('span',{text:`Jonny: ${money(alloc.jonny)}`})]),
          el('div',{class:'people-chip'},[el('span',{text:`Angela: ${money(alloc.angela)}`})])
        ]),
        el('div',{class:'small', style:'margin-top:10px', text: state.ui.allocationMode==='disponible'
          ? 'Modo actual: saldo disponible de cada uno.'
          : state.ui.allocationMode==='ingresos'
            ? 'Modo actual: ingresos mensuales de cada uno.'
            : 'Modo actual: reparto manual.'})
      ])
    ])
  ]);
}

function renderAccountsPanel(){
  return el('div',{class:'card'},[
    el('div',{class:'card__body'},[
      el('div',{class:'row spread'},[
        el('div',{},[el('div',{class:'card__title',text:'Cuentas'})]),
        button('Nueva cuenta','btn--primary', openAccountEditor)
      ]),
      el('div',{class:'list', style:'margin-top:12px'}, state.economy.accounts.map(a=>
        el('div',{class:'list-item'},[
          el('div',{class:'list-item__main'},[
            el('div',{class:'list-item__title', text:a.name}),
            el('div',{class:'list-item__meta', text:`${a.owner} · ${a.type}`})
          ]),
          el('div',{class:'list-item__right'},[
            el('div',{class:'people-chip'},[el('span',{text:money(accountBalance(a.id))})]),
            button('Editar','btn--ghost', ()=>openAccountEditor(a))
          ])
        ])
      ))
    ])
  ]);
}
function openAccountEditor(acc=null){
  const a = acc ? {...acc} : {id:uid(), name:'', owner:'jonny', type:'banco', balance:0};
  const name = fieldText('Nombre', a.name, 'Ej: Cuenta conjunta');
  const owner = fieldSelect('Titular', a.owner, [
    {value:'jonny',label:'Jonny'},
    {value:'angela',label:'Angela'},
    {value:'compartido',label:'Compartido'}
  ]);
  const type = fieldSelect('Tipo', a.type, [
    {value:'banco',label:'Banco'},
    {value:'ahorro',label:'Ahorro'},
    {value:'efectivo',label:'Efectivo'}
  ]);
  const bal = fieldNumber('Saldo inicial', a.balance, '0,00');
  openModal(acc?'Editar cuenta':'Nueva cuenta', [name.wrap, owner.wrap, type.wrap, bal.wrap], [
    button('Cancelar','btn--ghost', closeModal),
    button('Guardar','btn--primary', ()=>{
      a.name = name.input.value.trim();
      a.owner = owner.select.value;
      a.type = type.select.value;
      a.balance = Number(bal.input.value||0);
      if(!a.name) return toast('Pon un nombre');
      if(acc){
        const i = state.economy.accounts.findIndex(x=>x.id===acc.id);
        state.economy.accounts[i] = a;
      }else state.economy.accounts.push(a);
      save(); closeModal(); render();
    })
  ]);
}

function renderMovementsPanel(year, month){
  const monthMovs = monthlyMovements(year, month).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return el('div',{class:'card'},[
    el('div',{class:'card__body'},[
      el('div',{class:'row spread'},[
        el('div',{class:'card__title', text:'Movimientos'}),
        button('Nuevo movimiento','btn--primary', ()=>openMovementEditor())
      ]),
      monthMovs.length
        ? el('div',{class:'list', style:'margin-top:12px'}, monthMovs.map(m=>
            el('div',{class:'list-item'},[
              el('div',{class:'list-item__main'},[
                el('div',{class:'list-item__title', text:m.name}),
                el('div',{class:'list-item__meta', text:`${m.date} · ${m.owner} · ${m.category}`})
              ]),
              el('div',{class:'list-item__right'},[
                el('div',{class:'people-chip'},[el('span',{text:`${m.type==='gasto'?'-':'+'}${money(Math.abs(Number(m.amount||0)))}`})]),
                button('Editar','btn--ghost', ()=>openMovementEditor(m))
              ])
            ])
          ))
        : el('div',{class:'empty-note',text:'No hay movimientos este mes'})
    ])
  ]);
}
function openMovementEditor(mov=null){
  const m = mov ? {...mov} : {
    id:uid(), date:fmtISO(new Date()), name:'', amount:0, type:'gasto',
    owner:'jonny', category:'Otros', accountId: state.economy.accounts[0]?.id || ''
  };
  const date = fieldDate('Fecha', m.date);
  const name = fieldText('Concepto', m.name, 'Ej: Supermercado');
  const amount = fieldNumber('Importe', m.amount, '0,00');
  const type = fieldSelect('Tipo', m.type, [{value:'gasto',label:'Gasto'},{value:'ingreso',label:'Ingreso'}]);
  const owner = fieldSelect('Persona', m.owner, [
    {value:'jonny',label:'Jonny'},
    {value:'angela',label:'Angela'},
    {value:'compartido',label:'Compartido'}
  ]);
  const category = fieldSelect('Categoría', m.category, [
    'Vivienda','Comida','Gasolina','Ocio','Coche','Ahorro','Otros'
  ].map(x=>({value:x,label:x})));
  const acc = fieldSelect('Cuenta', m.accountId, state.economy.accounts.map(a=>({value:a.id,label:a.name})));
  openModal(mov?'Editar movimiento':'Nuevo movimiento', [
    el('div',{class:'form-grid'},[date.wrap, type.wrap]),
    name.wrap,
    el('div',{class:'form-grid--3 form-grid'},[amount.wrap, owner.wrap, category.wrap]),
    acc.wrap
  ], [
    button('Cancelar','btn--ghost', closeModal),
    mov ? button('Borrar','btn--danger', ()=>{
      state.economy.movements = state.economy.movements.filter(x=>x.id!==mov.id);
      save(); closeModal(); render();
    }) : null,
    button('Guardar','btn--primary', ()=>{
      m.date = date.input.value;
      m.name = name.input.value.trim();
      m.amount = Number(amount.input.value||0);
      m.type = type.select.value;
      m.owner = owner.select.value;
      m.category = category.select.value;
      m.accountId = acc.select.value;
      if(!m.date || !m.name) return toast('Completa fecha y concepto');
      if(mov){
        const i = state.economy.movements.findIndex(x=>x.id===mov.id);
        state.economy.movements[i] = m;
      }else state.economy.movements.push(m);
      save(); closeModal(); render(); toast('Movimiento guardado');
    })
  ].filter(Boolean));
}

function renderRecurringPanel(){
  return el('div',{class:'card'},[
    el('div',{class:'card__body'},[
      el('div',{class:'row spread'},[
        el('div',{class:'card__title',text:'Gastos fijos'}),
        button('Nuevo fijo','btn--primary', ()=>openRecurringEditor())
      ]),
      state.economy.recurring.length
        ? el('div',{class:'list', style:'margin-top:12px'}, state.economy.recurring.map(r=>
            el('div',{class:'list-item'},[
              el('div',{class:'list-item__main'},[
                el('div',{class:'list-item__title', text:r.name}),
                el('div',{class:'list-item__meta', text:`Día ${r.day} · ${money(r.amount)} · ${r.owner}`})
              ]),
              el('div',{class:'list-item__right'},[button('Editar','btn--ghost', ()=>openRecurringEditor(r))])
            ])
          ))
        : el('div',{class:'empty-note',text:'Sin gastos fijos'})
    ])
  ]);
}
function openRecurringEditor(rec=null){
  const r = rec ? {...rec} : {id:uid(), name:'', amount:0, day:1, owner:'compartido', category:'Vivienda'};
  const name = fieldText('Nombre', r.name, 'Ej: Internet');
  const amount = fieldNumber('Importe', r.amount, '0,00');
  const day = fieldNumber('Día del mes', r.day, '1', '1');
  const owner = fieldSelect('Persona', r.owner, [
    {value:'jonny',label:'Jonny'},
    {value:'angela',label:'Angela'},
    {value:'compartido',label:'Compartido'}
  ]);
  const cat = fieldSelect('Categoría', r.category, ['Vivienda','Comida','Gasolina','Ocio','Coche','Otros'].map(x=>({value:x,label:x})));
  openModal(rec?'Editar fijo':'Nuevo fijo', [name.wrap, el('div',{class:'form-grid--4 form-grid'},[amount.wrap,day.wrap,owner.wrap,cat.wrap])], [
    button('Cancelar','btn--ghost', closeModal),
    rec ? button('Borrar','btn--danger', ()=>{state.economy.recurring=state.economy.recurring.filter(x=>x.id!==rec.id);save();closeModal();render();}) : null,
    button('Guardar','btn--primary', ()=>{
      r.name=name.input.value.trim();
      r.amount=Number(amount.input.value||0);
      r.day=Number(day.input.value||1);
      r.owner=owner.select.value;
      r.category=cat.select.value;
      if(!r.name) return toast('Pon nombre');
      if(rec){
        const i = state.economy.recurring.findIndex(x=>x.id===rec.id);
        state.economy.recurring[i]=r;
      } else state.economy.recurring.push(r);
      save(); closeModal(); render();
    })
  ].filter(Boolean));
}

function renderHousingPanel(year, month, alloc){
  const h = state.economy.housing;
  const total = housingTotal();
  const modeButtons = el('div',{class:'segmented'});
  [
    ['disponible','Por saldo disponible'],
    ['ingresos','Por ingresos'],
    ['manual','Manual']
  ].forEach(([id,label])=>{
    modeButtons.appendChild(el('button',{class:state.ui.allocationMode===id?'active':'',text:label,onClick:()=>{
      state.ui.allocationMode=id; save(); render();
    }}));
  });

  return el('div',{class:'card'},[
    el('div',{class:'card__body'},[
      el('div',{class:'row spread'},[
        el('div',{},[
          el('div',{class:'card__title', text:'Vivienda'}),
          el('div',{class:'card__sub', text:'Qué os podéis permitir y cómo repartirlo con equidad.'})
        ]),
        button('Editar vivienda','btn--primary', ()=>openHousingEditor())
      ]),
      el('div',{class:'hr'}),
      modeButtons,
      el('div',{class:'stats-grid', style:'margin-top:14px'},[
        kpi('Coste vivienda', money(total), 'Suma estimada'),
        kpi('Jonny aporta', money(alloc.jonny), 'Recomendación'),
        kpi('Angela aporta', money(alloc.angela), 'Recomendación'),
        kpi('Disponible resto', money((monthlyAvailableFor('jonny',year,month)-alloc.jonny)+(monthlyAvailableFor('angela',year,month)-alloc.angela)), 'Tras vivienda')
      ]),
      el('div',{class:'hr'}),
      el('div',{class:'callout'},[
        el('div',{class:'card__title', text:'Simulador de vivienda'}),
        el('div',{class:'small', text:'Te dice lo que os podéis permitir sin asfixiaros.'}),
        el('div',{class:'small', style:'margin-top:10px', text:`Con el modo actual, os quedarían ${money((monthlyAvailableFor('jonny',year,month)-alloc.jonny)+(monthlyAvailableFor('angela',year,month)-alloc.angela))} tras cubrir la vivienda.`})
      ])
    ])
  ]);
}
function openHousingEditor(){
  const h = JSON.parse(JSON.stringify(state.economy.housing));
  const alquiler = fieldNumber('Alquiler', h.estimated.alquiler);
  const luz = fieldNumber('Luz', h.estimated.luz);
  const agua = fieldNumber('Agua', h.estimated.agua);
  const internet = fieldNumber('Internet', h.estimated.internet);
  const comida = fieldNumber('Comida', h.estimated.comida);
  const otros = fieldNumber('Otros', h.estimated.otros);
  const mj = fieldNumber('Manual Jonny (%)', h.manualSplit.jonny, '', '1');
  const ma = fieldNumber('Manual Angela (%)', h.manualSplit.angela, '', '1');

  openModal('Editar vivienda', [
    el('div',{class:'form-grid--3 form-grid'},[alquiler.wrap,luz.wrap,agua.wrap,internet.wrap,comida.wrap,otros.wrap]),
    el('div',{class:'hr'}),
    el('div',{class:'small', text:'Solo se usa si el reparto está en modo manual.'}),
    el('div',{class:'form-grid'},[mj.wrap,ma.wrap])
  ], [
    button('Cancelar','btn--ghost', closeModal),
    button('Guardar','btn--primary', ()=>{
      h.estimated.alquiler = Number(alquiler.input.value||0);
      h.estimated.luz = Number(luz.input.value||0);
      h.estimated.agua = Number(agua.input.value||0);
      h.estimated.internet = Number(internet.input.value||0);
      h.estimated.comida = Number(comida.input.value||0);
      h.estimated.otros = Number(otros.input.value||0);
      h.manualSplit.jonny = Number(mj.input.value||0);
      h.manualSplit.angela = Number(ma.input.value||0);
      state.economy.housing = h;
      save(); closeModal(); render();
    })
  ]);
}

function renderBudgetPanel(year, month){
  const wrap = el('div',{class:'card'},[
    el('div',{class:'card__body'},[
      el('div',{class:'row spread'},[
        el('div',{class:'card__title',text:'Presupuesto mensual'}),
        button('Editar categorías','btn--primary', ()=>openBudgetEditor())
      ])
    ])
  ]);
  const body = wrap.querySelector('.card__body');
  state.economy.budgets.forEach(b=>{
    const spent = monthlyMovements(year, month)
      .filter(m=>m.type==='gasto' && m.category===b.category)
      .reduce((s,m)=>s+Math.abs(Number(m.amount||0)),0);
    const pct = b.limit > 0 ? clamp((spent/b.limit)*100, 0, 100) : 0;
    body.appendChild(el('div',{class:'list-item', style:'margin-top:10px'},[
      el('div',{class:'list-item__main'},[
        el('div',{class:'list-item__title', text:b.category}),
        el('div',{class:'list-item__meta', text:`${money(spent)} / ${money(b.limit)}`}),
        el('div',{class:'budget-bar'},[el('span',{style:`width:${pct}%`})])
      ])
    ]));
  });
  return wrap;
}
function openBudgetEditor(){
  const list = el('div',{class:'list'});
  state.economy.budgets.forEach(b=>{
    const limit = fieldNumber(b.category, b.limit, '0,00');
    list.appendChild(limit.wrap);
    limit.input.addEventListener('input', ()=>{ b.limit = Number(limit.input.value||0); });
  });
  openModal('Editar presupuesto', [list], [
    button('Cancelar','btn--ghost', closeModal),
    button('Guardar','btn--primary', ()=>{ save(); closeModal(); render(); })
  ]);
}

function renderExpenseCalendar(year, month){
  const head = el('div',{class:'calendar-head'},['L','M','X','J','V','S','D'].map(x=>el('div',{text:x})));
  const grid = el('div',{class:'heatmap'});
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const offset = (first.getDay()+6)%7;
  const prevLast = new Date(year, month, 0).getDate();
  const maxDayExpense = Math.max(1, ...Array.from({length:daysInMonth},(_,i)=>{
    const iso = `${year}-${pad2(month+1)}-${pad2(i+1)}`;
    return dayExpenseTotal(iso);
  }));

  for(let i=0;i<42;i++){
    const dayNum = i - offset + 1;
    let yy=year, mm=month, dd=dayNum, muted=false;
    if(dayNum<=0){
      muted=true;
      mm = month-1; yy=year;
      if(mm<0){mm=11;yy--}
      dd = prevLast + dayNum;
    }else if(dayNum>daysInMonth){
      muted=true;
      mm = month+1; yy=year;
      if(mm>11){mm=0;yy++}
      dd = dayNum - daysInMonth;
    }
    const iso = `${yy}-${pad2(mm+1)}-${pad2(dd)}`;
    const total = dayExpenseTotal(iso);
    const pct = clamp(total/maxDayExpense*100, 0, 100);
    const color = total === 0 ? '#e2e8f0' : pct < 34 ? '#93c5fd' : pct < 67 ? '#fb923c' : '#ef4444';
    const cell = el('div',{class:`day-cell ${muted?'muted':''}`},[
      el('div',{class:'day-top'},[
        el('div',{class:'day-num', text:String(dd)}),
        el('div',{class:'people-chip'},[el('span',{text:money(total)})])
      ]),
      el('div',{class:'heat'},[el('span',{style:`width:${pct}%;background:${color}`})]),
      el('div',{class:'day-mini', text:`${dayExpenseCount(iso)} mov.`})
    ]);
    cell.addEventListener('click', ()=>openDayExpenses(iso));
    grid.appendChild(cell);
  }

  return el('div',{class:'card'},[
    el('div',{class:'card__body'},[
      el('div',{class:'card__title', text:'Calendario de gastos'}),
      el('div',{class:'card__sub', text:'Detecta de un vistazo en qué días se os va más dinero.'}),
      el('div',{class:'hr'}),
      head,
      grid
    ])
  ]);
}
function dayExpenseTotal(iso){
  return state.economy.movements
    .filter(m=>m.type==='gasto' && m.date===iso)
    .reduce((s,m)=>s+Math.abs(Number(m.amount||0)),0);
}
function dayExpenseCount(iso){
  return state.economy.movements.filter(m=>m.type==='gasto' && m.date===iso).length;
}
function openDayExpenses(iso){
  const movs = state.economy.movements.filter(m=>m.date===iso).sort((a,b)=>a.type.localeCompare(b.type));
  openModal(`Gastos del ${iso}`, [
    movs.length
      ? el('div',{class:'list'}, movs.map(m=>
          el('div',{class:'list-item'},[
            el('div',{class:'list-item__main'},[
              el('div',{class:'list-item__title', text:m.name}),
              el('div',{class:'list-item__meta', text:`${m.owner} · ${m.category}`})
            ]),
            el('div',{class:'list-item__right'},[
              el('div',{class:'people-chip'},[el('span',{text:`${m.type==='gasto'?'-':'+'}${money(Math.abs(Number(m.amount||0)))}`})])
            ])
          ])
        ))
      : el('div',{class:'empty-note', text:'Sin movimientos este día'})
  ], [button('Cerrar','btn--primary', closeModal)]);
}

function renderAgenda(){
  setTop('Agenda');
  $('#backBtn').classList.remove('hidden');
  $('#quickAddBtn').classList.remove('hidden');
  const main = $('#main');
  main.innerHTML = '';
  main.appendChild(el('div',{class:'card'},[
    el('div',{class:'card__body'},[
      el('div',{class:'row spread'},[
        el('div',{},[
          el('div',{class:'card__title', text:'Agenda'}),
          el('div',{class:'card__sub', text:'Eventos y recordatorios sencillos.'})
        ]),
        button('Nuevo evento','btn--primary', ()=>openEventEditor())
      ]),
      state.agenda.events.length
        ? el('div',{class:'list', style:'margin-top:12px'}, state.agenda.events.sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(ev=>
            el('div',{class:'list-item'},[
              el('div',{class:'list-item__main'},[
                el('div',{class:'list-item__title', text:ev.title}),
                el('div',{class:'list-item__meta', text:`${ev.date}${ev.time?' · '+ev.time:''}${ev.notes?' · '+ev.notes:''}`})
              ]),
              el('div',{class:'list-item__right'},[
                button('Editar','btn--ghost', ()=>openEventEditor(ev))
              ])
            ])
          ))
        : el('div',{class:'empty-note', text:'Sin eventos todavía'})
    ])
  ]));
}
function openEventEditor(ev=null){
  const e = ev ? {...ev} : {id:uid(), title:'', date:fmtISO(new Date()), time:'', notes:''};
  const title = fieldText('Título', e.title, 'Ej: Dentista');
  const date = fieldDate('Fecha', e.date);
  const time = fieldText('Hora', e.time, 'Ej: 19:00');
  const notes = fieldTextarea('Notas', e.notes);
  openModal(ev?'Editar evento':'Nuevo evento', [title.wrap, el('div',{class:'form-grid'},[date.wrap,time.wrap]), notes.wrap], [
    button('Cancelar','btn--ghost', closeModal),
    ev ? button('Borrar','btn--danger', ()=>{ state.agenda.events=state.agenda.events.filter(x=>x.id!==ev.id); save(); closeModal(); render(); }) : null,
    button('Guardar','btn--primary', ()=>{
      e.title = title.input.value.trim();
      e.date = date.input.value;
      e.time = time.input.value.trim();
      e.notes = notes.input.value.trim();
      if(!e.title || !e.date) return toast('Completa título y fecha');
      if(ev){
        const i = state.agenda.events.findIndex(x=>x.id===ev.id);
        state.agenda.events[i] = e;
      }else state.agenda.events.push(e);
      save(); closeModal(); render();
    })
  ].filter(Boolean));
}

function openSettings(){
  openModal('Ajustes', [
    el('div',{class:'callout'},[
      el('div',{class:'card__title', text:'Sincronización entre móviles'}),
      el('div',{class:'small', text:'Para que lo que meta Angela te salga a ti y viceversa hará falta pasar a base de datos compartida, por ejemplo Firebase. Esta versión guarda todo en el navegador.'})
    ])
  ], [
    button('Reset total','btn--danger', ()=>{
      if(confirm('¿Borrar todos los datos?')){
        localStorage.removeItem(KEY);
        location.reload();
      }
    }),
    button('Cerrar','btn--primary', closeModal)
  ]);
}

function render(){
  ensureWelcome();
  if(!state.ui.welcomed) return;
  $('#shell').classList.remove('hidden');
  const route = state.ui.route;
  if(route==='home') renderHome();
  else if(route==='work') renderWork();
  else if(route==='economy') renderEconomy();
  else if(route==='agenda') renderAgenda();
  else { state.ui.route='home'; save(); renderHome(); }
}

function bind(){
  $('#backBtn').addEventListener('click', ()=>{ state.ui.route='home'; save(); render(); });
  $('#quickAddBtn').addEventListener('click', ()=>{
    if(state.ui.route==='work') openContractsManager();
    else if(state.ui.route==='economy') openMovementEditor();
    else if(state.ui.route==='agenda') openEventEditor();
  });
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#modalClose').addEventListener('click', closeModal);
  $('#modalOverlay').addEventListener('click', e=>{ if(e.target===$('#modalOverlay')) closeModal(); });
}

document.addEventListener('DOMContentLoaded', ()=>{
  bind();
  render();
});
