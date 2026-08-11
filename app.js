
const $=id=>document.getElementById(id), cfC=$("cantusCanvas"), cpC=$("counterCanvas");
const cfX=cfC.getContext("2d"), cpX=cpC.getContext("2d");
const LINE=18, TOP=64, LEFT=58, RIGHT=16, C4Y=TOP+LINE*5;
let mode="1:2", selected=null, drag=false;
let cantus=[0,1,3,2,1,0].map(step=>({step,rest:false}));
let counter=[];
function resetCounter(){counter=(mode==="1:2"?[4,5,5,6,7,5,4,3,3,2,1,7]:[4,5,6,5,4,3]).map(step=>({step,rest:false}));}
resetCounter();

function resize(c){const r=devicePixelRatio||1, b=c.getBoundingClientRect();c.width=b.width*r;c.height=b.height*r;c.getContext("2d").setTransform(r,0,0,r,0,0)}
function y(step){return C4Y-step*(LINE/2)} function stepFromY(v){return Math.max(-2,Math.min(16,Math.round((C4Y-v)/(LINE/2))))}
function x(i,n,w){return LEFT+(w-LEFT-RIGHT)*(i+.5)/n} function idx(px,n,w){return Math.max(0,Math.min(n-1,Math.floor(((px-LEFT)/(w-LEFT-RIGHT))*n)))}
function noteName(step){const N=["C","D","E","F","G","A","B"],o=Math.floor(step/7),i=((step%7)+7)%7;return N[i]+(4+o)}
function midi(step){const B=[60,62,64,65,67,69,71],o=Math.floor(step/7),i=((step%7)+7)%7;return B[i]+o*12}

function clef(ctx){ctx.font="62px serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("𝄞",30,TOP+LINE*2)}
function whole(ctx,px,py){ctx.save();ctx.translate(px,py);ctx.rotate(-.28);ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,10,6.5,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
function half(ctx,px,py){whole(ctx,px,py);ctx.fillRect(px+7,py-34,1.6,34)}
function draw(ctx,c,notes,slots,type,editable){
  const w=c.clientWidth,h=c.clientHeight;ctx.clearRect(0,0,w,h);ctx.strokeStyle="#111";ctx.fillStyle="#111";
  for(let i=0;i<5;i++){let yy=TOP+i*LINE;ctx.beginPath();ctx.moveTo(LEFT,yy);ctx.lineTo(w-RIGHT,yy);ctx.stroke()} clef(ctx);
  let m=Math.max(1,Math.floor(notes.length/slots));ctx.globalAlpha=.35;
  for(let i=0;i<=m;i++){let xx=LEFT+(w-LEFT-RIGHT)*i/m;ctx.beginPath();ctx.moveTo(xx,TOP);ctx.lineTo(xx,TOP+LINE*4);ctx.stroke()} ctx.globalAlpha=1;
  notes.forEach((n,i)=>{let xx=x(i,notes.length,w);if(n.rest){ctx.font="24px serif";ctx.fillText("𝄽",xx-7,TOP+LINE*2+7);return}let yy=y(n.step);
    if(editable&&selected===i){ctx.strokeStyle="#0a84ff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(xx,yy,17,0,Math.PI*2);ctx.stroke();ctx.strokeStyle="#111";ctx.lineWidth=1}
    type==="whole"?whole(ctx,xx,yy):half(ctx,xx,yy);
  });
}
function redraw(){resize(cfC);resize(cpC);draw(cfX,cfC,cantus,1,"whole",false);draw(cpX,cpC,counter,mode==="1:2"?2:1,mode==="1:2"?"half":"whole",true);$("selectedPitch").textContent=selected==null?"未選択":counter[selected].rest?"休符":noteName(counter[selected].step)}
function point(e,c){let r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
cpC.addEventListener("pointerdown",e=>{drag=true;let p=point(e,cpC);selected=idx(p.x,counter.length,cpC.clientWidth);counter[selected].step=stepFromY(p.y);counter[selected].rest=false;redraw();e.preventDefault()});
cpC.addEventListener("pointermove",e=>{if(!drag||selected==null)return;let p=point(e,cpC);counter[selected].step=stepFromY(p.y);redraw();e.preventDefault()});
cpC.addEventListener("pointerup",()=>drag=false);cpC.addEventListener("pointercancel",()=>drag=false);
$("upBtn").onclick=()=>{if(selected==null)return;counter[selected].step++;redraw()};$("downBtn").onclick=()=>{if(selected==null)return;counter[selected].step--;redraw()};$("restBtn").onclick=()=>{if(selected==null)return;counter[selected].rest=true;redraw()};
function setMode(m){mode=m;selected=null;resetCounter();$("mode12Btn").classList.toggle("active",m==="1:2");$("mode11Btn").classList.toggle("active",m==="1:1");$("modeHelp").textContent=m==="1:2"?"定旋律は全音符、対旋律は二分音符で入力します。":"定旋律・対旋律とも全音符で、1対1として入力します。";redraw()}
$("mode12Btn").onclick=()=>setMode("1:2");$("mode11Btn").onclick=()=>setMode("1:1");
$("resetBtn").onclick=()=>{resetCounter();selected=null;redraw()};$("clearBtn").onclick=()=>{counter.forEach(n=>n.rest=true);selected=null;redraw()};
function analyze(){let out=[];if(mode==="1:1"){for(let i=0;i<cantus.length;i++){if(counter[i].rest)continue;let s=Math.abs(midi(counter[i].step)-midi(cantus[i].step))%12;let ok=[0,3,4,7,8,9].includes(s);out.push({sev:ok?"good":"error",title:"和声音程",loc:`第${i+1}小節`,msg:ok?"基本的な協和音程として扱えます。":"音程を確認してください。"})}}else{for(let m=0;m<cantus.length;m++){let cp=counter[m*2];if(cp.rest)continue;let s=Math.abs(midi(cp.step)-midi(cantus[m].step))%12;let ok=[0,3,4,7,8,9].includes(s);out.push({sev:ok?"good":"error",title:"強拍の和声音程",loc:`第${m+1}小節・強拍`,msg:ok?"強拍の基本和声音程として扱えます。":"強拍の音程を確認してください。"})}}return out}
$("analyzeBtn").onclick=()=>{let a=analyze(),r=$("results");r.innerHTML="";a.forEach(v=>{let d=document.createElement("div");d.className=`result ${v.sev}`;d.innerHTML=`<b>${v.title}</b><div class="muted">${v.loc}</div><div>${v.msg}</div>`;r.appendChild(d)});$("summaryBadge").textContent=`${a.length}件`};
window.addEventListener("load",redraw);window.addEventListener("resize",redraw);if("serviceWorker"in navigator)navigator.serviceWorker.register("./service-worker.js");
