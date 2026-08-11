
const APP_VERSION="1.0.0";
const $=id=>document.getElementById(id);
const cfC=$("cantusCanvas"), cpC=$("counterCanvas");
const cfX=cfC.getContext("2d"), cpX=cpC.getContext("2d");

const LINE=18, TOP=78;
const STAFF_LEFT=22;      // 五線そのものの開始位置
const NOTE_LEFT=78;       // 音符開始位置（ト音記号ぶんを確保）
const RIGHT=16;
const C4Y=TOP+LINE*5, LEDGER_HALF=15;
let mode="1:2", selected=null, drag=false;
let audioCtx=null, activeNodes=[];

// 練習用の定旋律（教本の譜例そのものではなく、アプリ練習用）
const PROBLEMS=[
  {name:"問題 1　C major・6小節", steps:[0,1,3,2,1,0]},
  {name:"問題 2　C major・7小節", steps:[0,2,3,4,2,1,0]},
  {name:"問題 3　C major・8小節", steps:[0,1,2,4,3,2,1,0]},
  {name:"問題 4　C major・8小節", steps:[0,2,4,3,5,3,1,0]},
  {name:"問題 5　C major・9小節", steps:[0,1,3,4,5,4,2,1,0]},
  {name:"問題 6　C major・9小節", steps:[0,2,1,3,5,4,3,1,0]},
  {name:"問題 7　C major・10小節",steps:[0,1,3,5,4,2,3,2,1,0]},
  {name:"問題 8　C major・10小節",steps:[0,2,4,5,3,1,2,3,1,0]},
  {name:"問題 9　C major・8小節", steps:[0,3,2,4,5,3,1,0]},
  {name:"問題10　C major・9小節", steps:[0,1,4,3,2,5,3,1,0]},
  {name:"問題11　C major・10小節",steps:[0,2,3,1,4,5,3,2,1,0]},
  {name:"問題12　C major・10小節",steps:[0,1,2,5,4,3,5,2,1,0]}
];
let problemIndex=0;
let cantus=[], counter=[];

function noteObj(step,acc=0,rest=false){return {step,acc,rest}}
function loadProblem(index, keepFirstSample=false){
  problemIndex=(index+PROBLEMS.length)%PROBLEMS.length;
  cantus=PROBLEMS[problemIndex].steps.map(s=>noteObj(s));
  const slots=mode==="1:2"?cantus.length*2:cantus.length;
  counter=Array.from({length:slots},()=>noteObj(4,0,true));
  if(keepFirstSample && problemIndex===0){
    const sample=mode==="1:2"?[4,5,5,6,7,5,4,3,3,2,1,7]:[4,5,6,5,4,3];
    sample.slice(0,slots).forEach((s,i)=>counter[i]=noteObj(s));
  }
  selected=null;
  $("problemSelect").value=String(problemIndex);
  $("problemCount").textContent=`${problemIndex+1} / ${PROBLEMS.length}`;
  $("results").innerHTML='<p class="muted">「この対旋律を添削」を押すと結果を表示します。</p>';
  $("summaryBadge").textContent="未判定";
  redraw();
}
function populateProblems(){
  PROBLEMS.forEach((p,i)=>{
    const o=document.createElement("option");o.value=String(i);o.textContent=p.name;$("problemSelect").appendChild(o);
  });
}
populateProblems();
loadProblem(0,true);

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

// 五線はト音記号の後ろを通る
function clef(ctx){
  ctx.save();
  ctx.font="82px 'Times New Roman',serif";
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#111";
  ctx.fillText("𝄞",48,TOP+LINE*2.12);
  ctx.restore();
}
function drawOpenNoteHead(ctx,px,py,w=10,h=6.3){
  ctx.save();ctx.translate(px,py);ctx.rotate(-0.28);
  ctx.lineWidth=1.9;ctx.strokeStyle="#111";ctx.fillStyle="#fff";
  ctx.beginPath();ctx.ellipse(0,0,w,h,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
}
function whole(ctx,px,py){drawOpenNoteHead(ctx,px,py,10,6.3)}

// 中央線より上なら符尾を下、下なら上
function half(ctx,px,py,step){
  drawOpenNoteHead(ctx,px,py,9.4,6.1);
  const middleLineStep=6; // B4（五線中央線）
  const stemDown=step>=middleLineStep;
  ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=1.6;ctx.beginPath();
  if(stemDown){
    ctx.moveTo(px-7.2,py);ctx.lineTo(px-7.2,py+34);
  }else{
    ctx.moveTo(px+7.2,py);ctx.lineTo(px+7.2,py-34);
  }
  ctx.stroke();ctx.restore();
}
function drawHalfRest(ctx,px){
  const middle=TOP+LINE*2;
  ctx.save();ctx.fillStyle="#111";
  ctx.fillRect(px-7,middle-6,14,6);ctx.restore();
}
function drawWholeRest(ctx,px){
  const fourth=TOP+LINE*3;
  ctx.save();ctx.fillStyle="#111";
  ctx.fillRect(px-7,fourth,14,6);ctx.restore();
}
function ledgerLines(ctx,px,step){
  ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=1.35;
  if(step<2){
    for(let s=0;s>=step;s-=2){
      const ly=y(s);ctx.beginPath();ctx.moveTo(px-LEDGER_HALF,ly);ctx.lineTo(px+LEDGER_HALF,ly);ctx.stroke();
    }
  }
  if(step>10){
    for(let s=12;s<=step;s+=2){
      const ly=y(s);ctx.beginPath();ctx.moveTo(px-LEDGER_HALF,ly);ctx.lineTo(px+LEDGER_HALF,ly);ctx.stroke();
    }
  }
  ctx.restore();
}
function accidental(ctx,px,py,acc){
  if(acc===0)return;
  ctx.save();ctx.fillStyle="#111";ctx.font="25px Georgia,serif";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText(acc===1?"♯":"♭",px-18,py);ctx.restore();
}
// 音符が「線上」にある場合、音符頭の中央を線が通るよう最後に重ね描き
function centerLineThroughNote(ctx,px,step){
  if(step>=2 && step<=10 && step%2===0){
    const py=y(step);ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(px-10.8,py);ctx.lineTo(px+10.8,py);ctx.stroke();ctx.restore();
  }else if(step<2 && step%2===0){
    const py=y(step);ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=1.35;
    ctx.beginPath();ctx.moveTo(px-LEDGER_HALF,py);ctx.lineTo(px+LEDGER_HALF,py);ctx.stroke();ctx.restore();
  }else if(step>10 && step%2===0){
    const py=y(step);ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=1.35;
    ctx.beginPath();ctx.moveTo(px-LEDGER_HALF,py);ctx.lineTo(px+LEDGER_HALF,py);ctx.stroke();ctx.restore();
  }
}
function draw(ctx,c,notes,slots,type,editable){
  const w=c.clientWidth,h=c.clientHeight;
  ctx.clearRect(0,0,w,h);ctx.strokeStyle="#111";ctx.fillStyle="#111";ctx.lineWidth=1;

  // 五線を先に描き、その上へト音記号を重ねる
  for(let i=0;i<5;i++){
    const yy=TOP+i*LINE;ctx.beginPath();ctx.moveTo(STAFF_LEFT,yy);ctx.lineTo(w-RIGHT,yy);ctx.stroke();
  }
  clef(ctx);

  const m=Math.max(1,Math.floor(notes.length/slots));
  ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle="#666";
  for(let i=0;i<=m;i++){
    const xx=NOTE_LEFT+(w-NOTE_LEFT-RIGHT)*i/m;
    ctx.beginPath();ctx.moveTo(xx,TOP);ctx.lineTo(xx,TOP+LINE*4);ctx.stroke();
  }
  ctx.restore();

  notes.forEach((n,i)=>{
    const xx=x(i,notes.length,w);
    if(n.rest){
      type==="whole"?drawWholeRest(ctx,xx):drawHalfRest(ctx,xx);return;
    }
    const yy=y(n.step);
    ledgerLines(ctx,xx,n.step);
    accidental(ctx,xx,yy,n.acc);

    if(editable&&selected===i){
      ctx.strokeStyle="#0a84ff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(xx,yy,17,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle="#111";ctx.lineWidth=1;
    }

    type==="whole"?whole(ctx,xx,yy):half(ctx,xx,yy,n.step);
    centerLineThroughNote(ctx,xx,n.step);
  });
}
function redraw(){
  resize(cfC);resize(cpC);
  draw(cfX,cfC,cantus,1,"whole",false);
  draw(cpX,cpC,counter,mode==="1:2"?2:1,mode==="1:2"?"half":"whole",true);
  $("selectedPitch").textContent=selected==null?"未選択":counter[selected].rest?"休符":noteNameObj(counter[selected]);
}
function point(e,c){const r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}

cpC.addEventListener("pointerdown",e=>{
  drag=true;const p=point(e,cpC);selected=idx(p.x,counter.length,cpC.clientWidth);
  counter[selected].step=stepFromY(p.y);counter[selected].rest=false;redraw();e.preventDefault();
});
cpC.addEventListener("pointermove",e=>{
  if(!drag||selected==null)return;const p=point(e,cpC);
  counter[selected].step=stepFromY(p.y);counter[selected].rest=false;redraw();e.preventDefault();
});
cpC.addEventListener("pointerup",()=>drag=false);cpC.addEventListener("pointercancel",()=>drag=false);

$("upBtn").onclick=()=>{if(selected==null)return;counter[selected].step=Math.min(22,counter[selected].step+1);counter[selected].rest=false;redraw()};
$("downBtn").onclick=()=>{if(selected==null)return;counter[selected].step=Math.max(-8,counter[selected].step-1);counter[selected].rest=false;redraw()};
$("sharpBtn").onclick=()=>{if(selected==null)return;counter[selected].acc=1;counter[selected].rest=false;redraw()};
$("flatBtn").onclick=()=>{if(selected==null)return;counter[selected].acc=-1;counter[selected].rest=false;redraw()};
$("naturalBtn").onclick=()=>{if(selected==null)return;counter[selected].acc=0;counter[selected].rest=false;redraw()};
$("restBtn").onclick=()=>{if(selected==null)return;counter[selected].rest=true;redraw()};

function setMode(m){
  mode=m;selected=null;
  $("mode12Btn").classList.toggle("active",m==="1:2");$("mode11Btn").classList.toggle("active",m==="1:1");
  $("modeHelp").textContent=m==="1:2"?"定旋律は全音符、対旋律は二分音符で入力します。":"定旋律・対旋律とも全音符で、1対1として入力します。";
  loadProblem(problemIndex,false);
}
$("mode12Btn").onclick=()=>setMode("1:2");$("mode11Btn").onclick=()=>setMode("1:1");
$("problemSelect").onchange=e=>loadProblem(Number(e.target.value),false);
$("prevProblemBtn").onclick=()=>loadProblem(problemIndex-1,false);
$("nextProblemBtn").onclick=()=>loadProblem(problemIndex+1,false);
$("resetBtn").onclick=()=>loadProblem(problemIndex,false);
$("clearBtn").onclick=()=>{counter.forEach(n=>n.rest=true);selected=null;redraw()};

// ---------- Playback ----------
function ensureAudio(){
  if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==="suspended")audioCtx.resume();
  return audioCtx;
}
function stopPlayback(){
  activeNodes.forEach(n=>{try{n.stop()}catch(e){}});
  activeNodes=[];
}
function scheduleTone(note,start,dur,gainValue=0.10,type="sine"){
  if(!note||note.rest)return;
  const ac=ensureAudio(), osc=ac.createOscillator(), g=ac.createGain();
  const freq=440*Math.pow(2,(midi(note)-69)/12);
  osc.type=type;osc.frequency.setValueAtTime(freq,start);
  g.gain.setValueAtTime(0.0001,start);
  g.gain.exponentialRampToValueAtTime(gainValue,start+0.015);
  g.gain.setValueAtTime(gainValue,Math.max(start+0.02,start+dur-0.04));
  g.gain.exponentialRampToValueAtTime(0.0001,start+dur);
  osc.connect(g).connect(ac.destination);
  osc.start(start);osc.stop(start+dur+0.02);activeNodes.push(osc);
}
function playCantus(){
  stopPlayback();const ac=ensureAudio(),unit=0.48,start=ac.currentTime+0.05;
  cantus.forEach((n,i)=>scheduleTone(n,start+i*unit*2,unit*1.9,0.10,"sine"));
}
function playBoth(){
  stopPlayback();const ac=ensureAudio(),unit=0.48,start=ac.currentTime+0.05;
  if(mode==="1:2"){
    cantus.forEach((n,i)=>scheduleTone(n,start+i*unit*2,unit*1.9,0.075,"sine"));
    counter.forEach((n,i)=>scheduleTone(n,start+i*unit,unit*0.92,0.075,"triangle"));
  }else{
    cantus.forEach((n,i)=>scheduleTone(n,start+i*unit,unit*0.92,0.075,"sine"));
    counter.forEach((n,i)=>scheduleTone(n,start+i*unit,unit*0.92,0.075,"triangle"));
  }
}
$("playCantusBtn").onclick=playCantus;
$("playBothBtn").onclick=playBoth;
$("stopBtn").onclick=stopPlayback;

// ---------- Analysis ----------
function isConsonant(cf,cp){const s=Math.abs(midi(cp)-midi(cf))%12;return [0,3,4,7,8,9].includes(s)}
function melodicStep(a,b){return Math.abs(b.step-a.step)===1}
function sameDirection(a,b,c){const d1=Math.sign(b.step-a.step),d2=Math.sign(c.step-b.step);return d1!==0&&d1===d2}
function neighborShape(a,b,c){return melodicStep(a,b)&&melodicStep(b,c)&&a.step===c.step}
function passingShape(a,b,c){return melodicStep(a,b)&&melodicStep(b,c)&&sameDirection(a,b,c)}
function finding(sev,title,loc,msg){return {sev,title,loc,msg}}
function verticalInterval(cf,cp){return Math.abs(midi(cp)-midi(cf))%12}
function motionType(cf1,cp1,cf2,cp2){
  const dcf=midi(cf2)-midi(cf1),dcp=midi(cp2)-midi(cp1);
  if(dcf===0&&dcp===0)return "静止";if(dcf===0||dcp===0)return "斜行";
  if(Math.sign(dcf)!==Math.sign(dcp))return "反行";return "同方向進行";
}
function isP5(v){return v===7}function isP8(v){return v===0}

function analyzeContinuity12(){
  const out=[];
  for(let slot=1;slot<counter.length;slot++){
    const cp1=counter[slot-1],cp2=counter[slot];if(!cp1||!cp2||cp1.rest||cp2.rest)continue;
    const cf1=cantus[Math.floor((slot-1)/2)],cf2=cantus[Math.floor(slot/2)];
    const i1=verticalInterval(cf1,cp1),i2=verticalInterval(cf2,cp2),mt=motionType(cf1,cp1,cf2,cp2);
    const l1=((slot-1)%2===0)?"強拍":"弱拍",l2=(slot%2===0)?"強拍":"弱拍",loc=`位置${slot}(${l1}) → ${slot+1}(${l2})`;
    if(isP5(i1)&&isP5(i2))out.push(finding(mt==="反行"?"caution":"error","完全5度の連続",loc,`完全5度が連続しています。声部進行は「${mt}」です。`));
    if(isP8(i1)&&isP8(i2))out.push(finding(mt==="反行"?"caution":"error","完全8度の連続",loc,`完全8度が連続しています。声部進行は「${mt}」です。`));
  }
  return out;
}
function analyzeOneToOne(){
  const out=[];
  for(let i=0;i<cantus.length;i++){
    if(counter[i].rest)continue;const ok=isConsonant(cantus[i],counter[i]);
    out.push(finding(ok?"good":"error","和声音程",`第${i+1}小節`,ok?"基本的な協和音程として扱えます。":"音程を確認してください。"));
  }
  return out;
}
function analyzeOneToTwo(){
  const out=[];
  for(let m=0;m<cantus.length;m++){
    const cf=cantus[m],strong=counter[m*2],weak=counter[m*2+1];
    if(strong&&!strong.rest){
      const ok=isConsonant(cf,strong);
      out.push(finding(ok?"good":"error","強拍の和声音程",`第${m+1}小節・強拍`,ok?"強拍の基本和声音程として扱えます。":"強拍では基本的に協和音程を確認してください。"));
    }
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
function analyze(){return mode==="1:1"?analyzeOneToOne():analyzeOneToTwo()}
$("analyzeBtn").onclick=()=>{
  const a=analyze(),r=$("results");r.innerHTML="";
  if(!a.length){r.innerHTML='<p class="muted">判定対象がありません。</p>';return}
  a.forEach(v=>{const d=document.createElement("div");d.className=`result ${v.sev}`;d.innerHTML=`<b>${v.title}</b><div class="loc">${v.loc}</div><div>${v.msg}</div>`;r.appendChild(d)});
  const errors=a.filter(v=>v.sev==="error").length,cautions=a.filter(v=>v.sev==="caution").length;
  $("summaryBadge").textContent=errors?`要修正 ${errors}件`:cautions?`注意 ${cautions}件`:"判定完了";
};

window.addEventListener("load",redraw);window.addEventListener("resize",redraw);

// auto update
let waitingWorker=null;
function showUpdate(worker){waitingWorker=worker;$("updateBtn").hidden=false}
$("updateBtn").onclick=()=>{if(waitingWorker)waitingWorker.postMessage({type:"SKIP_WAITING"})}
if("serviceWorker"in navigator){
  navigator.serviceWorker.register("./service-worker.js",{updateViaCache:"none"}).then(reg=>{
    reg.update();if(reg.waiting)showUpdate(reg.waiting);
    reg.addEventListener("updatefound",()=>{const nw=reg.installing;if(!nw)return;nw.addEventListener("statechange",()=>{if(nw.state==="installed"&&navigator.serviceWorker.controller)showUpdate(nw)})});
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")reg.update()});
  }).catch(()=>{});
  let refreshing=false;navigator.serviceWorker.addEventListener("controllerchange",()=>{if(refreshing)return;refreshing=true;location.reload()});
}
