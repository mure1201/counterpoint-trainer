
const APP_VERSION="1.1.0";
const $=id=>document.getElementById(id);

const cfC=$("cantusCanvas"), cpC=$("counterCanvas");
const cfX=cfC.getContext("2d"), cpX=cpC.getContext("2d");

const LINE=16, TOP=62;
const STAFF_LEFT=18, NOTE_LEFT=76, RIGHT=12;
const C4Y=TOP+LINE*5, LEDGER_HALF=14;

let mode="1:2", selected=null, drag=false;
let problemIndex=0, cantus=[], counter=[];
let history=[], future=[];
let audioCtx=null, activeNodes=[];

const PROBLEMS=[
{name:"問題 1",steps:[0,1,3,2,1,0]},
{name:"問題 2",steps:[0,2,3,4,2,1,0]},
{name:"問題 3",steps:[0,1,2,4,3,2,1,0]},
{name:"問題 4",steps:[0,2,4,3,5,3,1,0]},
{name:"問題 5",steps:[0,1,3,4,5,4,2,1,0]},
{name:"問題 6",steps:[0,2,1,3,5,4,3,1,0]},
{name:"問題 7",steps:[0,1,3,5,4,2,3,2,1,0]},
{name:"問題 8",steps:[0,2,4,5,3,1,2,3,1,0]},
{name:"問題 9",steps:[0,3,2,4,5,3,1,0]},
{name:"問題10",steps:[0,1,4,3,2,5,3,1,0]},
{name:"問題11",steps:[0,2,3,1,4,5,3,2,1,0]},
{name:"問題12",steps:[0,1,2,5,4,3,5,2,1,0]}
];

function noteObj(step,acc=0,rest=false){return {step,acc,rest}}
function cloneCounter(){return counter.map(n=>({...n}))}
function pushHistory(){history.push(cloneCounter());if(history.length>80)history.shift();future=[]}
function undo(){if(!history.length)return;future.push(cloneCounter());counter=history.pop();selected=null;redraw()}
function redo(){if(!future.length)return;history.push(cloneCounter());counter=future.pop();selected=null;redraw()}

function populateProblems(){
  PROBLEMS.forEach((p,i)=>{const o=document.createElement("option");o.value=i;o.textContent=`${i+1} / ${PROBLEMS.length}　${p.name}`;$("problemSelect").appendChild(o)});
}
function loadProblem(i){
  stopPlayback();
  problemIndex=(i+PROBLEMS.length)%PROBLEMS.length;
  cantus=PROBLEMS[problemIndex].steps.map(s=>noteObj(s));
  const slots=mode==="1:2"?cantus.length*2:cantus.length;
  counter=Array.from({length:slots},()=>noteObj(4,0,true));
  selected=null;history=[];future=[];
  $("problemSelect").value=problemIndex;
  $("problemCount").textContent=`${problemIndex+1} / ${PROBLEMS.length}`;
  clearFeedback();redraw();
}
function clearFeedback(){
  $("results").innerHTML='<p class="muted">「採点・添削」を押すと判定結果が表示されます。</p>';
  $("summaryBadge").textContent="未判定";
}

function resize(c){
  const r=devicePixelRatio||1,b=c.getBoundingClientRect();
  c.width=b.width*r;c.height=b.height*r;
  c.getContext("2d").setTransform(r,0,0,r,0,0);
}
function y(step){return C4Y-step*(LINE/2)}
function stepFromY(v){return Math.max(-8,Math.min(22,Math.round((C4Y-v)/(LINE/2))))}
function x(i,n,w){return NOTE_LEFT+(w-NOTE_LEFT-RIGHT)*(i+.5)/n}
function idx(px,n,w){return Math.max(0,Math.min(n-1,Math.floor(((px-NOTE_LEFT)/(w-NOTE_LEFT-RIGHT))*n)))}
function baseName(step){const N=["C","D","E","F","G","A","B"],o=Math.floor(step/7),i=((step%7)+7)%7;return {letter:N[i],octave:4+o}}
function noteNameObj(n){const b=baseName(n.step),a=n.acc===1?"♯":n.acc===-1?"♭":"";return `${b.letter}${a}${b.octave}`}
function baseMidi(step){const B=[60,62,64,65,67,69,71],o=Math.floor(step/7),i=((step%7)+7)%7;return B[i]+o*12}
function midi(n){return baseMidi(n.step)+n.acc}

// --- notation drawing ---
// ト音記号：G線（下から2本目）を中心とするループと、中央付近の交差が五線に自然に重なるサイズ
function drawClef(ctx,staffTop=TOP,staffLeft=STAFF_LEFT){
  ctx.save();
  ctx.fillStyle="#111";
  ctx.font="76px 'Times New Roman', Georgia, serif";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  // G線 = staffTop + 3*LINE。記号の中心を少し上に置き、交差部を五線中央付近へ
  ctx.fillText("𝄞",43,staffTop+LINE*2.25);
  ctx.restore();
}

// 可変太さの白抜き音符頭。
// innerShift の方向で「どちらの対角が太いか」を作る。
function openHead(ctx,px,py,kind){
  ctx.save();
  ctx.translate(px,py);
  ctx.rotate(-0.30);

  // outer
  ctx.fillStyle="#111";
  ctx.beginPath();
  ctx.ellipse(0,0,10.2,6.6,0,0,Math.PI*2);
  ctx.fill();

  // inner hole
  // whole: 右上・左下を太く => 穴を左上→右下方向へ寄せる
  // half : 左上・右下を太く => 穴を右上→左下方向へ寄せる
  const sx = kind==="whole" ? -1.15 : 1.15;
  const sy = kind==="whole" ? -0.75 : 0.75;
  ctx.fillStyle="#fff";
  ctx.beginPath();
  ctx.ellipse(sx,sy,6.3,3.55,0,0,Math.PI*2);
  ctx.fill();

  ctx.restore();
}
function drawWhole(ctx,px,py){openHead(ctx,px,py,"whole")}
function drawHalf(ctx,px,py,step){
  openHead(ctx,px,py,"half");
  const stemDown=step>=6; // 中央線以上は下向き
  ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=1.7;ctx.beginPath();
  if(stemDown){ctx.moveTo(px-7.7,py);ctx.lineTo(px-7.7,py+33)}
  else{ctx.moveTo(px+7.7,py);ctx.lineTo(px+7.7,py-33)}
  ctx.stroke();ctx.restore();
}
function drawHalfRest(ctx,px){
  const line3=TOP+LINE*2;
  ctx.save();ctx.fillStyle="#111";ctx.fillRect(px-7,line3-5.5,14,5.5);ctx.restore();
}
function drawWholeRest(ctx,px){
  const line4=TOP+LINE*3;
  ctx.save();ctx.fillStyle="#111";ctx.fillRect(px-7,line4,14,5.5);ctx.restore();
}
function ledgerLines(ctx,px,step){
  ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=1.3;
  if(step<2){for(let s=0;s>=step;s-=2){const ly=y(s);ctx.beginPath();ctx.moveTo(px-LEDGER_HALF,ly);ctx.lineTo(px+LEDGER_HALF,ly);ctx.stroke()}}
  if(step>10){for(let s=12;s<=step;s+=2){const ly=y(s);ctx.beginPath();ctx.moveTo(px-LEDGER_HALF,ly);ctx.lineTo(px+LEDGER_HALF,ly);ctx.stroke()}}
  ctx.restore();
}
function accidental(ctx,px,py,acc){
  if(acc===0)return;
  ctx.save();ctx.fillStyle="#111";ctx.font="23px Georgia,serif";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText(acc===1?"♯":"♭",px-17,py);ctx.restore();
}
// 線上の音符は、線を最後に描き戻して「中央を線が通る」見た目にする
function lineThroughHead(ctx,px,step){
  if(step%2!==0)return;
  let py=y(step), isLedger=(step<2||step>10);
  ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=isLedger?1.3:1;
  ctx.beginPath();ctx.moveTo(px-(isLedger?LEDGER_HALF:10.8),py);ctx.lineTo(px+(isLedger?LEDGER_HALF:10.8),py);ctx.stroke();ctx.restore();
}
function drawStaff(ctx,c,notes,slots,type,editable){
  const w=c.clientWidth,h=c.clientHeight;ctx.clearRect(0,0,w,h);
  ctx.strokeStyle="#111";ctx.fillStyle="#111";ctx.lineWidth=1;

  for(let i=0;i<5;i++){
    const yy=TOP+i*LINE;ctx.beginPath();ctx.moveTo(STAFF_LEFT,yy);ctx.lineTo(w-RIGHT,yy);ctx.stroke();
  }
  drawClef(ctx);

  const m=Math.max(1,Math.floor(notes.length/slots));
  ctx.save();ctx.globalAlpha=.20;ctx.strokeStyle="#777";
  for(let i=0;i<=m;i++){
    const xx=NOTE_LEFT+(w-NOTE_LEFT-RIGHT)*i/m;
    ctx.beginPath();ctx.moveTo(xx,TOP);ctx.lineTo(xx,TOP+LINE*4);ctx.stroke();
  }
  ctx.restore();

  notes.forEach((n,i)=>{
    const xx=x(i,notes.length,w);
    if(n.rest){type==="whole"?drawWholeRest(ctx,xx):drawHalfRest(ctx,xx);return}

    const yy=y(n.step);
    ledgerLines(ctx,xx,n.step);
    accidental(ctx,xx,yy,n.acc);

    if(editable&&selected===i){
      ctx.strokeStyle="#2f80ed";ctx.lineWidth=2;ctx.beginPath();ctx.arc(xx,yy,16,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle="#111";ctx.lineWidth=1;
    }

    type==="whole"?drawWhole(ctx,xx,yy):drawHalf(ctx,xx,yy,n.step);
    lineThroughHead(ctx,xx,n.step);
  });
}
function redraw(){
  resize(cfC);resize(cpC);
  drawStaff(cfX,cfC,cantus,1,"whole",false);
  drawStaff(cpX,cpC,counter,mode==="1:2"?2:1,mode==="1:2"?"half":"whole",true);
  $("selectedPitch").textContent=selected==null?"未選択":counter[selected].rest?"休符":noteNameObj(counter[selected]);
}

// --- interaction ---
function point(e,c){const r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function beginEdit(){pushHistory();clearFeedback()}
cpC.addEventListener("pointerdown",e=>{
  const p=point(e,cpC);const i=idx(p.x,counter.length,cpC.clientWidth);
  beginEdit();selected=i;drag=true;counter[i].step=stepFromY(p.y);counter[i].rest=false;redraw();e.preventDefault();
});
cpC.addEventListener("pointermove",e=>{
  if(!drag||selected==null)return;const p=point(e,cpC);counter[selected].step=stepFromY(p.y);counter[selected].rest=false;redraw();e.preventDefault();
});
cpC.addEventListener("pointerup",()=>drag=false);cpC.addEventListener("pointercancel",()=>drag=false);

function ensureSelected(){
  if(selected==null){selected=counter.findIndex(n=>n.rest);if(selected<0)selected=0}
}
function applyEdit(fn){ensureSelected();beginEdit();fn(counter[selected]);redraw()}
$("upBtn").onclick=()=>applyEdit(n=>{n.step=Math.min(22,n.step+1);n.rest=false});
$("downBtn").onclick=()=>applyEdit(n=>{n.step=Math.max(-8,n.step-1);n.rest=false});
$("sharpBtn").onclick=()=>applyEdit(n=>{n.acc=1;n.rest=false});
$("flatBtn").onclick=()=>applyEdit(n=>{n.acc=-1;n.rest=false});
$("naturalBtn").onclick=()=>applyEdit(n=>{n.acc=0;n.rest=false});
$("restBtn").onclick=()=>applyEdit(n=>{n.rest=true});
$("undoBtn").onclick=undo;$("redoBtn").onclick=redo;

function buildPitchButtons(){
  const wrap=$("pitchButtons");wrap.innerHTML="";
  const steps=[];
  for(let s=0;s<=11;s++)steps.push(s); // C4〜D5程度
  steps.forEach(s=>{
    const n=noteObj(s),b=document.createElement("button");
    b.textContent=noteNameObj(n);
    b.onclick=()=>applyEdit(x=>{x.step=s;x.acc=0;x.rest=false});
    wrap.appendChild(b);
  });
}
buildPitchButtons();

function setMode(m){
  mode=m;
  $("mode12Btn").classList.toggle("active",m==="1:2");
  $("mode11Btn").classList.toggle("active",m==="1:1");
  $("modeHelp").textContent=m==="1:2"?"定旋律は全音符、対旋律は二分音符で入力します。":"定旋律・対旋律とも全音符で、1対1として入力します。";
  $("inputTitle").textContent=m==="1:2"?"音の入力（対旋律・二分音符）":"音の入力（対旋律・全音符）";
  $("restBtn").textContent=m==="1:2"?"𝄽 二分休符":"𝄻 全休符";
  loadProblem(problemIndex);
}
$("mode12Btn").onclick=()=>setMode("1:2");$("mode11Btn").onclick=()=>setMode("1:1");
$("problemSelect").onchange=e=>loadProblem(Number(e.target.value));
$("prevProblemBtn").onclick=()=>loadProblem(problemIndex-1);
$("nextProblemBtn").onclick=()=>loadProblem(problemIndex+1);
$("resetBtn").onclick=()=>loadProblem(problemIndex);
$("clearBtn").onclick=()=>{pushHistory();counter.forEach(n=>n.rest=true);selected=null;clearFeedback();redraw()};

// --- audio ---
function ensureAudio(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx}
function stopPlayback(){activeNodes.forEach(n=>{try{n.stop()}catch{}});activeNodes=[]}
function scheduleTone(n,start,dur,gainValue=.08,type="sine"){
  if(!n||n.rest)return;const ac=ensureAudio(),o=ac.createOscillator(),g=ac.createGain();
  o.type=type;o.frequency.value=440*Math.pow(2,(midi(n)-69)/12);
  g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(gainValue,start+.015);
  g.gain.setValueAtTime(gainValue,Math.max(start+.02,start+dur-.04));g.gain.exponentialRampToValueAtTime(.0001,start+dur);
  o.connect(g).connect(ac.destination);o.start(start);o.stop(start+dur+.02);activeNodes.push(o);
}
function playCantus(){stopPlayback();const ac=ensureAudio(),u=.48,s=ac.currentTime+.05;cantus.forEach((n,i)=>scheduleTone(n,s+i*u*2,u*1.9,.09,"sine"))}
function playBoth(){stopPlayback();const ac=ensureAudio(),u=.48,s=ac.currentTime+.05;
  if(mode==="1:2"){cantus.forEach((n,i)=>scheduleTone(n,s+i*u*2,u*1.9,.065,"sine"));counter.forEach((n,i)=>scheduleTone(n,s+i*u,u*.92,.065,"triangle"))}
  else{cantus.forEach((n,i)=>scheduleTone(n,s+i*u,u*.92,.065,"sine"));counter.forEach((n,i)=>scheduleTone(n,s+i*u,u*.92,.065,"triangle"))}
}
$("playCantusBtn").onclick=playCantus;$("playBothBtn").onclick=playBoth;$("stopBtn").onclick=stopPlayback;

// --- analysis ---
function isConsonant(cf,cp){const s=Math.abs(midi(cp)-midi(cf))%12;return [0,3,4,7,8,9].includes(s)}
function melodicStep(a,b){return Math.abs(b.step-a.step)===1}
function sameDirection(a,b,c){const d1=Math.sign(b.step-a.step),d2=Math.sign(c.step-b.step);return d1!==0&&d1===d2}
function passingShape(a,b,c){return melodicStep(a,b)&&melodicStep(b,c)&&sameDirection(a,b,c)}
function neighborShape(a,b,c){return melodicStep(a,b)&&melodicStep(b,c)&&a.step===c.step}
function finding(sev,title,loc,msg){return {sev,title,loc,msg}}
function verticalInterval(cf,cp){return Math.abs(midi(cp)-midi(cf))%12}
function motionType(cf1,cp1,cf2,cp2){const a=midi(cf2)-midi(cf1),b=midi(cp2)-midi(cp1);if(a===0&&b===0)return"静止";if(a===0||b===0)return"斜行";return Math.sign(a)!==Math.sign(b)?"反行":"同方向進行"}
function analyzeContinuity12(){
  const out=[];
  for(let slot=1;slot<counter.length;slot++){
    const a=counter[slot-1],b=counter[slot];if(a.rest||b.rest)continue;
    const ca=cantus[Math.floor((slot-1)/2)],cb=cantus[Math.floor(slot/2)],i1=verticalInterval(ca,a),i2=verticalInterval(cb,b),mt=motionType(ca,a,cb,b);
    const l1=((slot-1)%2===0)?"強拍":"弱拍",l2=(slot%2===0)?"強拍":"弱拍",loc=`位置${slot}(${l1}) → ${slot+1}(${l2})`;
    if(i1===7&&i2===7)out.push(finding(mt==="反行"?"caution":"error","完全5度の連続",loc,`完全5度が連続しています。声部進行は「${mt}」です。`));
    if(i1===0&&i2===0)out.push(finding(mt==="反行"?"caution":"error","完全8度の連続",loc,`完全8度が連続しています。声部進行は「${mt}」です。`));
  }
  return out;
}
function analyze(){
  const out=[];
  if(mode==="1:1"){
    counter.forEach((n,i)=>{if(n.rest)return;out.push(finding(isConsonant(cantus[i],n)?"good":"error","和声音程",`第${i+1}小節`,isConsonant(cantus[i],n)?"基本的な協和音程として扱えます。":"音程を確認してください。"))});
    return out;
  }
  for(let m=0;m<cantus.length;m++){
    const cf=cantus[m],strong=counter[m*2],weak=counter[m*2+1];
    if(strong&&!strong.rest)out.push(finding(isConsonant(cf,strong)?"good":"error","強拍の和声音程",`第${m+1}小節・強拍`,isConsonant(cf,strong)?"強拍の基本和声音程として扱えます。":"強拍では基本的に協和音程を確認してください。"));
    if(!weak||weak.rest)continue;
    if(isConsonant(cf,weak))out.push(finding("good","弱拍の協和音程",`第${m+1}小節・弱拍`,"弱拍は協和音程として扱えます。"));
    else{
      const prev=strong,next=(m+1<cantus.length)?counter[(m+1)*2]:null;
      if(!prev||prev.rest||!next||next.rest)out.push(finding("info","弱拍の不協和音程",`第${m+1}小節・弱拍`,"前後音が不足しているため自動判定を保留します。"));
      else if(passingShape(prev,weak,next))out.push(finding("good","弱拍の経過音",`第${m+1}小節・弱拍`,"順次進行による経過音候補として成立しています。"));
      else if(neighborShape(prev,weak,next))out.push(finding("good","弱拍の刺繍音",`第${m+1}小節・弱拍`,"刺繍音候補として成立しています。"));
      else out.push(finding("error","弱拍の不協和音程",`第${m+1}小節・弱拍`,"経過音または刺繍音としての条件を満たしていません。"));
    }
  }
  out.push(...analyzeContinuity12());return out;
}
$("analyzeBtn").onclick=()=>{
  const a=analyze(),r=$("results");r.innerHTML="";
  if(!a.length){r.innerHTML='<p class="muted">判定対象がありません。</p>';$("summaryBadge").textContent="未入力";return}
  a.forEach(v=>{const d=document.createElement("div");d.className=`result ${v.sev}`;d.innerHTML=`<b>${v.title}</b><div class="loc">${v.loc}</div><div>${v.msg}</div>`;r.appendChild(d)});
  const e=a.filter(v=>v.sev==="error").length,c=a.filter(v=>v.sev==="caution").length;
  $("summaryBadge").textContent=e?`要修正 ${e}件`:c?`注意 ${c}件`:"適切";
};

// --- notation guide ---
function guideCanvas(id,kind){
  const c=$(id),ctx=c.getContext("2d"),r=devicePixelRatio||1,b=c.getBoundingClientRect();
  c.width=b.width*r;c.height=b.height*r;ctx.setTransform(r,0,0,r,0,0);
  ctx.clearRect(0,0,b.width,b.height);
  const t=32,l=12,w=b.width-24,sp=12;
  ctx.strokeStyle="#777";ctx.lineWidth=1;
  for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(l,t+i*sp);ctx.lineTo(l+w,t+i*sp);ctx.stroke()}
  const px=b.width/2,py=t+2*sp;
  if(kind==="clef"){
    ctx.font="65px serif";ctx.fillStyle="#111";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("𝄞",px-28,t+2.2*sp);
  }else if(kind==="whole"){
    openHead(ctx,px,py,"whole");lineThroughGuide(ctx,px,py);
  }else if(kind==="half"){
    openHead(ctx,px,py,"half");ctx.strokeStyle="#111";ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(px+7.7,py);ctx.lineTo(px+7.7,py-31);ctx.stroke();lineThroughGuide(ctx,px,py);
  }else if(kind==="rest"){
    ctx.fillStyle="#111";ctx.fillRect(px-7,t+2*sp-5.5,14,5.5);
  }
}
function lineThroughGuide(ctx,px,py){ctx.strokeStyle="#777";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px-11,py);ctx.lineTo(px+11,py);ctx.stroke()}
function redrawGuides(){guideCanvas("guideClef","clef");guideCanvas("guideWhole","whole");guideCanvas("guideHalf","half");guideCanvas("guideRest","rest")}

window.addEventListener("load",()=>{redraw();redrawGuides()});
window.addEventListener("resize",()=>{redraw();redrawGuides()});

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

populateProblems();
loadProblem(0);
