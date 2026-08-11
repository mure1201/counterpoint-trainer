
const APP_VERSION="0.5.0";
const $=id=>document.getElementById(id), cfC=$("cantusCanvas"), cpC=$("counterCanvas");
const cfX=cfC.getContext("2d"), cpX=cpC.getContext("2d");

const LINE=18, TOP=78, LEFT=66, RIGHT=16, C4Y=TOP+LINE*5, LEDGER_HALF=15;
let mode="1:2", selected=null, drag=false;
let cantus=[0,1,3,2,1,0].map(step=>({step,rest:false}));
let counter=[];
function resetCounter(){counter=(mode==="1:2"?[4,5,5,6,7,5,4,3,3,2,1,7]:[4,5,6,5,4,3]).map(step=>({step,rest:false}));}
resetCounter();

function resize(c){const r=devicePixelRatio||1,b=c.getBoundingClientRect();c.width=b.width*r;c.height=b.height*r;c.getContext("2d").setTransform(r,0,0,r,0,0)}
function y(step){return C4Y-step*(LINE/2)}
function stepFromY(v){return Math.max(-8,Math.min(22,Math.round((C4Y-v)/(LINE/2))))}
function x(i,n,w){return LEFT+(w-LEFT-RIGHT)*(i+.5)/n}
function idx(px,n,w){return Math.max(0,Math.min(n-1,Math.floor(((px-LEFT)/(w-LEFT-RIGHT))*n)))}
function noteName(step){const N=["C","D","E","F","G","A","B"],o=Math.floor(step/7),i=((step%7)+7)%7;return N[i]+(4+o)}
function midi(step){const B=[60,62,64,65,67,69,71],o=Math.floor(step/7),i=((step%7)+7)%7;return B[i]+o*12}
function clef(ctx){ctx.save();ctx.font="78px 'Times New Roman',serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#111";ctx.fillText("𝄞",LEFT-27,TOP+LINE*2.15);ctx.restore()}
function whole(ctx,px,py){ctx.save();ctx.translate(px,py);ctx.rotate(-.28);ctx.strokeStyle="#111";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,10,6.5,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
function half(ctx,px,py){whole(ctx,px,py);ctx.fillStyle="#111";ctx.fillRect(px+7,py-34,1.6,34)}
function ledgerLines(ctx,px,step){
  const bottomLineStep=2, topLineStep=10;ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=1.35;
  if(step<bottomLineStep){for(let s=0;s>=step;s-=2){if(s<bottomLineStep){const ly=y(s);ctx.beginPath();ctx.moveTo(px-LEDGER_HALF,ly);ctx.lineTo(px+LEDGER_HALF,ly);ctx.stroke()}}}
  if(step>topLineStep){for(let s=12;s<=step;s+=2){const ly=y(s);ctx.beginPath();ctx.moveTo(px-LEDGER_HALF,ly);ctx.lineTo(px+LEDGER_HALF,ly);ctx.stroke()}}
  ctx.restore();
}
function draw(ctx,c,notes,slots,type,editable){
  const w=c.clientWidth,h=c.clientHeight;ctx.clearRect(0,0,w,h);ctx.strokeStyle="#111";ctx.fillStyle="#111";ctx.lineWidth=1;
  for(let i=0;i<5;i++){const yy=TOP+i*LINE;ctx.beginPath();ctx.moveTo(LEFT,yy);ctx.lineTo(w-RIGHT,yy);ctx.stroke()}
  clef(ctx);
  const m=Math.max(1,Math.floor(notes.length/slots));ctx.save();ctx.globalAlpha=.28;ctx.strokeStyle="#666";
  for(let i=0;i<=m;i++){const xx=LEFT+(w-LEFT-RIGHT)*i/m;ctx.beginPath();ctx.moveTo(xx,TOP);ctx.lineTo(xx,TOP+LINE*4);ctx.stroke()}ctx.restore();
  notes.forEach((n,i)=>{const xx=x(i,notes.length,w);if(n.rest){ctx.font="24px serif";ctx.fillStyle="#111";ctx.fillText("𝄽",xx-7,TOP+LINE*2+7);return}
    const yy=y(n.step);ledgerLines(ctx,xx,n.step);
    if(editable&&selected===i){ctx.strokeStyle="#0a84ff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(xx,yy,17,0,Math.PI*2);ctx.stroke();ctx.strokeStyle="#111";ctx.lineWidth=1}
    type==="whole"?whole(ctx,xx,yy):half(ctx,xx,yy);
  });
}
function redraw(){resize(cfC);resize(cpC);draw(cfX,cfC,cantus,1,"whole",false);draw(cpX,cpC,counter,mode==="1:2"?2:1,mode==="1:2"?"half":"whole",true);$("selectedPitch").textContent=selected==null?"未選択":counter[selected].rest?"休符":noteName(counter[selected].step)}
function point(e,c){const r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
cpC.addEventListener("pointerdown",e=>{drag=true;const p=point(e,cpC);selected=idx(p.x,counter.length,cpC.clientWidth);counter[selected].step=stepFromY(p.y);counter[selected].rest=false;redraw();e.preventDefault()});
cpC.addEventListener("pointermove",e=>{if(!drag||selected==null)return;const p=point(e,cpC);counter[selected].step=stepFromY(p.y);counter[selected].rest=false;redraw();e.preventDefault()});
cpC.addEventListener("pointerup",()=>drag=false);cpC.addEventListener("pointercancel",()=>drag=false);
$("upBtn").onclick=()=>{if(selected==null)return;counter[selected].step=Math.min(22,counter[selected].step+1);counter[selected].rest=false;redraw()};
$("downBtn").onclick=()=>{if(selected==null)return;counter[selected].step=Math.max(-8,counter[selected].step-1);counter[selected].rest=false;redraw()};
$("restBtn").onclick=()=>{if(selected==null)return;counter[selected].rest=true;redraw()};
function setMode(m){mode=m;selected=null;resetCounter();$("mode12Btn").classList.toggle("active",m==="1:2");$("mode11Btn").classList.toggle("active",m==="1:1");$("modeHelp").textContent=m==="1:2"?"定旋律は全音符、対旋律は二分音符で入力します。":"定旋律・対旋律とも全音符で、1対1として入力します。";redraw()}
$("mode12Btn").onclick=()=>setMode("1:2");$("mode11Btn").onclick=()=>setMode("1:1");
$("resetBtn").onclick=()=>{resetCounter();selected=null;redraw()};$("clearBtn").onclick=()=>{counter.forEach(n=>n.rest=true);selected=null;redraw()};
function analyze(){let out=[];if(mode==="1:1"){for(let i=0;i<cantus.length;i++){if(counter[i].rest)continue;const s=Math.abs(midi(counter[i].step)-midi(cantus[i].step))%12;const ok=[0,3,4,7,8,9].includes(s);out.push({sev:ok?"good":"error",title:"和声音程",loc:`第${i+1}小節`,msg:ok?"基本的な協和音程として扱えます。":"音程を確認してください。"})}}else{for(let m=0;m<cantus.length;m++){const cp=counter[m*2];if(cp.rest)continue;const s=Math.abs(midi(cp.step)-midi(cantus[m].step))%12;const ok=[0,3,4,7,8,9].includes(s);out.push({sev:ok?"good":"error",title:"強拍の和声音程",loc:`第${m+1}小節・強拍`,msg:ok?"強拍の基本和声音程として扱えます。":"強拍の音程を確認してください。"})}}return out}
$("analyzeBtn").onclick=()=>{const a=analyze(),r=$("results");r.innerHTML="";a.forEach(v=>{const d=document.createElement("div");d.className=`result ${v.sev}`;d.innerHTML=`<b>${v.title}</b><div class="muted">${v.loc}</div><div>${v.msg}</div>`;r.appendChild(d)});$("summaryBadge").textContent=`${a.length}件`};
window.addEventListener("load",redraw);window.addEventListener("resize",redraw);

// ---- 自動更新 ----
let waitingWorker=null;
function showUpdate(worker){waitingWorker=worker;$("updateBtn").hidden=false}
$("updateBtn").onclick=()=>{
  if(waitingWorker){waitingWorker.postMessage({type:"SKIP_WAITING"});}
};

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./service-worker.js",{updateViaCache:"none"}).then(reg=>{
    reg.update();
    if(reg.waiting) showUpdate(reg.waiting);
    reg.addEventListener("updatefound",()=>{
      const nw=reg.installing;
      if(!nw)return;
      nw.addEventListener("statechange",()=>{
        if(nw.state==="installed" && navigator.serviceWorker.controller){
          showUpdate(nw);
        }
      });
    });
    // 画面復帰時にも最新版を確認
    document.addEventListener("visibilitychange",()=>{
      if(document.visibilityState==="visible") reg.update();
    });
  }).catch(()=>{});

  let refreshing=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(refreshing)return;
    refreshing=true;
    location.reload();
  });
}
