
const APP_VERSION="0.9.0";
const $=id=>document.getElementById(id), cfC=$("cantusCanvas"), cpC=$("counterCanvas");
const cfX=cfC.getContext("2d"), cpX=cpC.getContext("2d");
const LINE=18, TOP=78, LEFT=68, RIGHT=16, C4Y=TOP+LINE*5, LEDGER_HALF=15;
let mode="1:2", selected=null, drag=false;

let cantus=[0,1,3,2,1,0].map(step=>({step,acc:0,rest:false}));
let counter=[];
function resetCounter(){counter=(mode==="1:2"?[4,5,5,6,7,5,4,3,3,2,1,7]:[4,5,6,5,4,3]).map(step=>({step,acc:0,rest:false}));}
resetCounter();

function resize(c){const r=devicePixelRatio||1,b=c.getBoundingClientRect();c.width=b.width*r;c.height=b.height*r;c.getContext("2d").setTransform(r,0,0,r,0,0)}
function y(step){return C4Y-step*(LINE/2)}
function stepFromY(v){return Math.max(-8,Math.min(22,Math.round((C4Y-v)/(LINE/2))))}
function x(i,n,w){return LEFT+(w-LEFT-RIGHT)*(i+.5)/n}
function idx(px,n,w){return Math.max(0,Math.min(n-1,Math.floor(((px-LEFT)/(w-LEFT-RIGHT))*n)))}
function baseName(step){const N=["C","D","E","F","G","A","B"],o=Math.floor(step/7),i=((step%7)+7)%7;return {letter:N[i],octave:4+o}}
function noteNameObj(n){const b=baseName(n.step),a=n.acc===1?"♯":n.acc===-1?"♭":"";return `${b.letter}${a}${b.octave}`}
function baseMidi(step){const B=[60,62,64,65,67,69,71],o=Math.floor(step/7),i=((step%7)+7)%7;return B[i]+o*12}
function midi(n){return baseMidi(n.step)+n.acc}

function clef(ctx){ctx.save();ctx.font="80px 'Times New Roman',serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#111";ctx.fillText("𝄞",LEFT-20,TOP+LINE*2.12);ctx.restore()}
function drawOpenNoteHead(ctx,px,py,w=10,h=6.3){
  ctx.save();ctx.translate(px,py);ctx.rotate(-0.28);ctx.lineWidth=1.9;ctx.strokeStyle="#111";ctx.fillStyle="#fff";
  ctx.beginPath();ctx.ellipse(0,0,w,h,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
}
function whole(ctx,px,py){drawOpenNoteHead(ctx,px,py,10,6.3)}
function half(ctx,px,py){
  drawOpenNoteHead(ctx,px,py,9.4,6.1);
  ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(px+7.2,py);ctx.lineTo(px+7.2,py-34);ctx.stroke();ctx.restore();
}
function drawHalfRest(ctx,px){const midLine=TOP+LINE*2;ctx.save();ctx.fillStyle="#111";ctx.fillRect(px-7,midLine-5,14,6);ctx.restore();}
function drawWholeRest(ctx,px){const line4=TOP+LINE*3;ctx.save();ctx.fillStyle="#111";ctx.fillRect(px-7,line4,14,6);ctx.restore();}
function ledgerLines(ctx,px,step){const bottomLineStep=2,topLineStep=10;ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=1.35;
  if(step<bottomLineStep){for(let s=0;s>=step;s-=2){if(s<bottomLineStep){const ly=y(s);ctx.beginPath();ctx.moveTo(px-LEDGER_HALF,ly);ctx.lineTo(px+LEDGER_HALF,ly);ctx.stroke()}}}
  if(step>topLineStep){for(let s=12;s<=step;s+=2){const ly=y(s);ctx.beginPath();ctx.moveTo(px-LEDGER_HALF,ly);ctx.lineTo(px+LEDGER_HALF,ly);ctx.stroke()}}
  ctx.restore()}
function accidental(ctx,px,py,acc){if(acc===0)return;ctx.save();ctx.fillStyle="#111";ctx.font="26px serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(acc===1?"♯":"♭",px-18,py);ctx.restore()}
function draw(ctx,c,notes,slots,type,editable){
  const w=c.clientWidth,h=c.clientHeight;ctx.clearRect(0,0,w,h);ctx.strokeStyle="#111";ctx.fillStyle="#111";ctx.lineWidth=1;
  for(let i=0;i<5;i++){const yy=TOP+i*LINE;ctx.beginPath();ctx.moveTo(LEFT,yy);ctx.lineTo(w-RIGHT,yy);ctx.stroke()} clef(ctx);
  const m=Math.max(1,Math.floor(notes.length/slots));ctx.save();ctx.globalAlpha=.28;ctx.strokeStyle="#666";
  for(let i=0;i<=m;i++){const xx=LEFT+(w-LEFT-RIGHT)*i/m;ctx.beginPath();ctx.moveTo(xx,TOP);ctx.lineTo(xx,TOP+LINE*4);ctx.stroke()}ctx.restore();
  notes.forEach((n,i)=>{const xx=x(i,notes.length,w);if(n.rest){type==="whole"?drawWholeRest(ctx,xx):drawHalfRest(ctx,xx);return}
    const yy=y(n.step);ledgerLines(ctx,xx,n.step);accidental(ctx,xx,yy,n.acc);
    if(editable&&selected===i){ctx.strokeStyle="#0a84ff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(xx,yy,17,0,Math.PI*2);ctx.stroke();ctx.strokeStyle="#111";ctx.lineWidth=1}
    type==="whole"?whole(ctx,xx,yy):half(ctx,xx,yy)})}
function redraw(){resize(cfC);resize(cpC);draw(cfX,cfC,cantus,1,"whole",false);draw(cpX,cpC,counter,mode==="1:2"?2:1,mode==="1:2"?"half":"whole",true);$("selectedPitch").textContent=selected==null?"未選択":counter[selected].rest?"休符":noteNameObj(counter[selected])}
function point(e,c){const r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}

cpC.addEventListener("pointerdown",e=>{drag=true;const p=point(e,cpC);selected=idx(p.x,counter.length,cpC.clientWidth);counter[selected].step=stepFromY(p.y);counter[selected].rest=false;redraw();e.preventDefault()})
cpC.addEventListener("pointermove",e=>{if(!drag||selected==null)return;const p=point(e,cpC);counter[selected].step=stepFromY(p.y);counter[selected].rest=false;redraw();e.preventDefault()})
cpC.addEventListener("pointerup",()=>drag=false);cpC.addEventListener("pointercancel",()=>drag=false);
$("upBtn").onclick=()=>{if(selected==null)return;counter[selected].step=Math.min(22,counter[selected].step+1);redraw()}
$("downBtn").onclick=()=>{if(selected==null)return;counter[selected].step=Math.max(-8,counter[selected].step-1);redraw()}
$("sharpBtn").onclick=()=>{if(selected==null)return;counter[selected].acc=1;redraw()}
$("flatBtn").onclick=()=>{if(selected==null)return;counter[selected].acc=-1;redraw()}
$("naturalBtn").onclick=()=>{if(selected==null)return;counter[selected].acc=0;redraw()}
$("restBtn").onclick=()=>{if(selected==null)return;counter[selected].rest=true;redraw()}

function setMode(m){mode=m;selected=null;resetCounter();$("mode12Btn").classList.toggle("active",m==="1:2");$("mode11Btn").classList.toggle("active",m==="1:1");$("modeHelp").textContent=m==="1:2"?"定旋律は全音符、対旋律は二分音符で入力します。強拍・弱拍・完全5度/8度の連続を判定します。":"定旋律・対旋律とも全音符で、1対1として入力します。";redraw()}
$("mode12Btn").onclick=()=>setMode("1:2");$("mode11Btn").onclick=()=>setMode("1:1");
$("resetBtn").onclick=()=>{resetCounter();selected=null;redraw()};$("clearBtn").onclick=()=>{counter.forEach(n=>n.rest=true);selected=null;redraw()};

function isConsonant(cf,cp){const s=Math.abs(midi(cp)-midi(cf))%12;return [0,3,4,7,8,9].includes(s)}
function melodicStep(a,b){return Math.abs(b.step-a.step)===1}
function sameDirection(a,b,c){const d1=Math.sign(b.step-a.step),d2=Math.sign(c.step-b.step);return d1!==0&&d1===d2}
function neighborShape(a,b,c){return melodicStep(a,b)&&melodicStep(b,c)&&a.step===c.step}
function passingShape(a,b,c){return melodicStep(a,b)&&melodicStep(b,c)&&sameDirection(a,b,c)}
function finding(sev,title,loc,msg){return {sev,title,loc,msg}}

function verticalInterval(cf,cp){return Math.abs(midi(cp)-midi(cf))%12}
function motionType(cf1,cp1,cf2,cp2){
  const dcf=midi(cf2)-midi(cf1), dcp=midi(cp2)-midi(cp1);
  if(dcf===0&&dcp===0)return "静止";
  if(dcf===0||dcp===0)return "斜行";
  if(Math.sign(dcf)!==Math.sign(dcp))return "反行";
  return "同方向進行";
}
function isP5(v){return v===7}
function isP8(v){return v===0}

function analyzeContinuity12(){
  const out=[];
  for(let slot=1;slot<counter.length;slot++){
    const cp1=counter[slot-1], cp2=counter[slot];
    if(!cp1||!cp2||cp1.rest||cp2.rest)continue;
    const cf1=cantus[Math.floor((slot-1)/2)], cf2=cantus[Math.floor(slot/2)];
    const i1=verticalInterval(cf1,cp1), i2=verticalInterval(cf2,cp2);
    const mt=motionType(cf1,cp1,cf2,cp2);
    const label1=((slot-1)%2===0)?"強拍":"弱拍";
    const label2=(slot%2===0)?"強拍":"弱拍";
    const loc=`位置${slot}(${label1}) → ${slot+1}(${label2})`;

    if(isP5(i1)&&isP5(i2)){
      out.push(finding(mt==="反行"?"caution":"error","完全5度の連続",loc,
        `完全5度が連続しています。声部進行は「${mt}」です。弱拍を含むため、教本の例外条件も確認してください。`));
    }
    if(isP8(i1)&&isP8(i2)){
      out.push(finding(mt==="反行"?"caution":"error","完全8度の連続",loc,
        `完全8度が連続しています。声部進行は「${mt}」です。弱拍を含むため、教本の例外条件も確認してください。`));
    }
  }
  return out;
}

function analyzeOneToOne(){
  const out=[];
  for(let i=0;i<cantus.length;i++){
    if(counter[i].rest)continue;
    const ok=isConsonant(cantus[i],counter[i]);
    out.push(finding(ok?"good":"error","和声音程",`第${i+1}小節`,ok?"基本的な協和音程として扱えます。":"音程を確認してください。"))
  }
  for(let i=1;i<counter.length;i++){
    if(counter[i-1].rest||counter[i].rest)continue;
    const a=verticalInterval(cantus[i-1],counter[i-1]),b=verticalInterval(cantus[i],counter[i]);
    const mt=motionType(cantus[i-1],counter[i-1],cantus[i],counter[i]);
    if(isP5(a)&&isP5(b))out.push(finding(mt==="反行"?"caution":"error","完全5度の連続",`第${i}→${i+1}小節`,`完全5度が連続しています。声部進行は「${mt}」です。`));
    if(isP8(a)&&isP8(b))out.push(finding(mt==="反行"?"caution":"error","完全8度の連続",`第${i}→${i+1}小節`,`完全8度が連続しています。声部進行は「${mt}」です。`));
  }
  return out;
}

function analyzeOneToTwo(){
  const out=[];
  for(let m=0;m<cantus.length;m++){
    const cf=cantus[m], strong=counter[m*2], weak=counter[m*2+1];

    if(strong&&!strong.rest){
      const ok=isConsonant(cf,strong);
      out.push(finding(ok?"good":"error","強拍の和声音程",`第${m+1}小節・強拍`,ok?"強拍の基本和声音程として扱えます。":"強拍では基本的に協和音程を確認してください。"))
    }

    if(!weak||weak.rest)continue;
    if(isConsonant(cf,weak)){
      out.push(finding("good","弱拍の協和音程",`第${m+1}小節・弱拍`,"弱拍は協和音程として扱えます。"))
    }else{
      const prev=strong, next=(m+1<cantus.length)?counter[(m+1)*2]:null;
      if(!prev||prev.rest||!next||next.rest){
        out.push(finding("info","弱拍の不協和音程",`第${m+1}小節・弱拍`,"前後音が不足しているため、経過音・刺繍音としての自動判定は保留します。"))
      }else if(passingShape(prev,weak,next)){
        out.push(finding("good","弱拍の経過音",`第${m+1}小節・弱拍`,"不協和音程ですが、順次進行による経過音候補として成立しています。"))
      }else if(neighborShape(prev,weak,next)){
        out.push(finding("good","弱拍の刺繍音",`第${m+1}小節・弱拍`,"不協和音程ですが、刺繍音候補として成立しています。"))
      }else{
        out.push(finding("error","弱拍の不協和音程",`第${m+1}小節・弱拍`,"経過音または刺繍音としての順次進行条件を満たしていません。"))
      }
    }
  }
  out.push(...analyzeContinuity12());
  return out;
}

function analyze(){return mode==="1:1"?analyzeOneToOne():analyzeOneToTwo()}
$("analyzeBtn").onclick=()=>{
  const a=analyze(),r=$("results");r.innerHTML="";
  if(!a.length){r.innerHTML='<p class="muted">判定対象がありません。</p>';return}
  a.forEach(v=>{const d=document.createElement("div");d.className=`result ${v.sev}`;d.innerHTML=`<b>${v.title}</b><div class="loc">${v.loc}</div><div>${v.msg}</div>`;r.appendChild(d)});
  const errors=a.filter(v=>v.sev==="error").length,cautions=a.filter(v=>v.sev==="caution").length;
  $("summaryBadge").textContent=errors?`要修正 ${errors}件`:cautions?`注意 ${cautions}件`:"判定完了"
}

window.addEventListener("load",redraw);window.addEventListener("resize",redraw);

// auto update
let waitingWorker=null;
function showUpdate(worker){waitingWorker=worker;$("updateBtn").hidden=false}
$("updateBtn").onclick=()=>{if(waitingWorker)waitingWorker.postMessage({type:"SKIP_WAITING"})}
if("serviceWorker"in navigator){
  navigator.serviceWorker.register("./service-worker.js",{updateViaCache:"none"}).then(reg=>{
    reg.update();if(reg.waiting)showUpdate(reg.waiting);
    reg.addEventListener("updatefound",()=>{const nw=reg.installing;if(!nw)return;nw.addEventListener("statechange",()=>{if(nw.state==="installed"&&navigator.serviceWorker.controller)showUpdate(nw)})});
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")reg.update()})
  }).catch(()=>{});
  let refreshing=false;navigator.serviceWorker.addEventListener("controllerchange",()=>{if(refreshing)return;refreshing=true;location.reload()})
}
