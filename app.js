
const months=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
let current=new Date()

function init(){

const m=document.getElementById("month")
const y=document.getElementById("year")

months.forEach((mo,i)=>{
let o=document.createElement("option")
o.value=i
o.text=mo
m.appendChild(o)
})

for(let i=2023;i<=2035;i++){
let o=document.createElement("option")
o.value=i
o.text=i
y.appendChild(o)
}

m.value=current.getMonth()
y.value=current.getFullYear()

m.onchange=render
y.onchange=render

render()
loadExpenses()

}

function prevMonth(){
current.setMonth(current.getMonth()-1)
sync()
render()
}

function nextMonth(){
current.setMonth(current.getMonth()+1)
sync()
render()
}

function sync(){
document.getElementById("month").value=current.getMonth()
document.getElementById("year").value=current.getFullYear()
}

function render(){

const m=parseInt(document.getElementById("month").value)
const y=parseInt(document.getElementById("year").value)

const cal=document.getElementById("calendar")
cal.innerHTML=""

const first=new Date(y,m,1).getDay()
const days=new Date(y,m+1,0).getDate()

for(let i=0;i<first;i++) cal.innerHTML+="<div></div>"

for(let d=1;d<=days;d++){

let div=document.createElement("div")
div.className="day "+randomShift()
div.innerHTML=d

cal.appendChild(div)

}

}

function randomShift(){
const s=["M","T","N","L","P"]
return s[Math.floor(Math.random()*s.length)]
}

function showPage(p){

document.querySelectorAll(".page").forEach(e=>e.classList.add("hidden"))
document.getElementById(p).classList.remove("hidden")

}

let expenses=[]

function addExpense(){

let n=document.getElementById("name").value
let a=document.getElementById("amount").value
let d=document.getElementById("date").value
let p=document.getElementById("person").value

expenses.push({n,a,d,p})

localStorage.setItem("expenses",JSON.stringify(expenses))

loadExpenses()

}

function loadExpenses(){

expenses=JSON.parse(localStorage.getItem("expenses")||"[]")

const list=document.getElementById("expenseList")
if(!list) return

list.innerHTML=""

expenses.forEach(e=>{

let li=document.createElement("li")
li.textContent=`${e.d} - ${e.n} - ${e.a}€ (${e.p})`
list.appendChild(li)

})

}

init()
