
const APP_VERSION="1.9.0";
const $=id=>document.getElementById(id);

const cfC=$("cantusCanvas"), cpC=$("counterCanvas");
const cfX=cfC.getContext("2d"), cpX=cpC.getContext("2d");

const LINE=16, TOP=62;
const STAFF_LEFT=18, NOTE_LEFT=76, RIGHT=12;
const C4Y=TOP+LINE*5, LEDGER_HALF=14;

let mode="1:2", selected=null, drag=false;
let cfVoice="upper";
let selectedModeName="長旋法";
let problemIndex=0, cantus=[], counter=[];
let history=[], future=[];
let audioCtx=null, activeNodes=[];
let tempoBpm=80;

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
  clearFeedback();updateVoiceLayout();redraw();
}

function updateVoiceLayout(){
  const scoreCard=document.querySelector(".score-card");
  const cfTitle=$("cfTitle");
  const cpTitle=$("cpTitle");
  cfTitle.innerHTML=`定旋律 <span class="voice-caption">（${cfVoice==="upper"?"上声":"下声"}）</span>`;
  cpTitle.innerHTML=`対旋律 <span class="voice-caption">（${cfVoice==="upper"?"下声":"上声"}）</span>`;

  const cfCanvas=$("cantusCanvas");
  const cpCanvas=$("counterCanvas");
  const cfHeading=cfCanvas.previousElementSibling;
  const cpHeading=cpCanvas.previousElementSibling;

  if(cfVoice==="upper"){
    scoreCard.insertBefore(cfHeading, scoreCard.firstChild);
    scoreCard.insertBefore(cfCanvas, cpHeading);
  }else{
    scoreCard.insertBefore(cpHeading, scoreCard.firstChild);
    scoreCard.insertBefore(cpCanvas, cfHeading);
  }
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

  // v1.8:
  // v1.7より少し大きく、少し下へ移動。
  // 記号内の3つの主要な交差位置が、上から五線の第2線・第3線・第5線に
  // できるだけ重なるように配置する。
  ctx.font="140px 'Times New Roman', Georgia, serif";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.fillText("𝄞",52,staffTop+LINE*1.68);

  ctx.restore();
}

// 可変太さの白抜き音符頭。
// innerShift の方向で「どちらの対角が太いか」を作る。
function openHead(ctx,px,py,kind){
  ctx.save();
  ctx.translate(px,py);
  ctx.rotate(-0.30);

  // v1.9:
  // 外周は固定したまま、白抜き部分を少し偏心させて
  // 「内側だけ」厚みが変わる伝統的な音符頭へ。
  // 太い部分と細い部分は楕円同士の連続曲線なので滑らかにつながる。
  const rx = kind==="whole" ? 10.3 : 10.0;
  const ry = kind==="whole" ? 6.35 : 6.10;

  // 外側の黒い輪郭
  ctx.fillStyle="#111";
  ctx.beginPath();
  ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);
  ctx.fill();

  // 白抜き。
  // 全音符：右上・左下が太くなるよう左上寄りへ。
  // 二分音符：左上・右下が太くなるよう右下寄りへ。
  const dx = kind==="whole" ? -1.35 : 1.25;
  const dy = kind==="whole" ? -0.80 : 0.78;
  const holeRx = kind==="whole" ? 6.80 : 6.55;
  const holeRy = kind==="whole" ? 3.72 : 3.58;

  ctx.fillStyle="#fff";
  ctx.beginPath();
  ctx.ellipse(dx,dy,holeRx,holeRy,0,0,Math.PI*2);
  ctx.fill();

  // 外周だけごく細く締める
  ctx.strokeStyle="#111";
  ctx.lineWidth=0.65;
  ctx.beginPath();
  ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);
  ctx.stroke();

  ctx.restore();
}
function drawWhole(ctx,px,py){openHead(ctx,px,py,"whole")}
function drawHalf(ctx,px,py,step){
  openHead(ctx,px,py,"half");
  const stemDown=step>=6; // 中央線以上は下向き
  const stemLength=LINE*3; // v1.4: 五線の3段分
  ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=1.7;ctx.beginPath();
  if(stemDown){ctx.moveTo(px-7.7,py);ctx.lineTo(px-7.7,py+stemLength)}
  else{ctx.moveTo(px+7.7,py);ctx.lineTo(px+7.7,py-stemLength)}
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

function operationZoneForNote(n,xx,type){
  const centerY = n.rest ? TOP+LINE*2.35 : y(n.step);
  // 音符頭のまわりだけを操作可能にする。
  // 休符は中央付近の小さな範囲。
  return {
    x:xx-22,
    y:centerY-21,
    w:44,
    h:42,
    cx:xx,
    cy:centerY
  };
}
function roundRectPath(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}
function drawOperationZone(ctx,zone,isSelected){
  ctx.save();
  ctx.fillStyle=isSelected?"rgba(47,128,237,0.11)":"rgba(47,128,237,0.055)";
  ctx.strokeStyle=isSelected?"rgba(47,128,237,0.75)":"rgba(47,128,237,0.32)";
  ctx.lineWidth=isSelected?1.6:1.0;
  roundRectPath(ctx,zone.x,zone.y,zone.w,zone.h,9);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
function pointInZone(p,zone){
  return p.x>=zone.x && p.x<=zone.x+zone.w && p.y>=zone.y && p.y<=zone.y+zone.h;
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

    if(editable){
      const zone=operationZoneForNote(n,xx,type);
      drawOperationZone(ctx,zone,selected===i);
    }

    if(n.rest){
      type==="whole"?drawWholeRest(ctx,xx):drawHalfRest(ctx,xx);
      return;
    }

    const yy=y(n.step);
    ledgerLines(ctx,xx,n.step);
    accidental(ctx,xx,yy,n.acc);

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
  const p=point(e,cpC);
  const i=idx(p.x,counter.length,cpC.clientWidth);
  const xx=x(i,counter.length,cpC.clientWidth);
  const zone=operationZoneForNote(counter[i],xx,mode==="1:2"?"half":"whole");

  // v1.9: 薄青の操作範囲外では音符を動かさない。
  if(!pointInZone(p,zone)){
    return;
  }

  beginEdit();
  selected=i;
  drag=true;

  // 既存の休符を最初に触った時は、その位置を選択するだけ。
  // 休符から音符にしたい場合は音高ボタン等を使用。
  if(!counter[i].rest){
    counter[i].step=stepFromY(p.y);
  }

  redraw();
  e.preventDefault();
});
cpC.addEventListener("pointermove",e=>{
  if(!drag||selected==null)return;
  if(counter[selected].rest)return;
  const p=point(e,cpC);
  counter[selected].step=stepFromY(p.y);
  redraw();
  e.preventDefault();
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
  $("inputTitle").textContent=m==="1:2"?"音の入力（第2類・二分音符）":"音の入力（第1類・全音符）";
  $("restBtn").textContent=m==="1:2"?"𝄽 二分休符":"𝄻 全休符";
  loadProblem(problemIndex);
}
$("mode12Btn").onclick=()=>setMode("1:2");$("mode11Btn").onclick=()=>setMode("1:1");
$("cfUpperBtn").onclick=()=>{
  cfVoice="upper";
  $("cfUpperBtn").classList.add("active");
  $("cfLowerBtn").classList.remove("active");
  updateVoiceLayout();redraw();
};
$("cfLowerBtn").onclick=()=>{
  cfVoice="lower";
  $("cfLowerBtn").classList.add("active");
  $("cfUpperBtn").classList.remove("active");
  updateVoiceLayout();redraw();
};
$("modeSelect").onchange=e=>{
  selectedModeName=e.target.options[e.target.selectedIndex].text;
  clearFeedback();
};

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
function halfBeatSeconds(){return 60/tempoBpm}
function wholeNoteSeconds(){return halfBeatSeconds()*2}
function playCantus(){
  stopPlayback();
  const ac=ensureAudio(),whole=wholeNoteSeconds(),s=ac.currentTime+.05;
  cantus.forEach((n,i)=>scheduleTone(n,s+i*whole,whole*.95,.09,"sine"));
}
function playBoth(){
  stopPlayback();
  const ac=ensureAudio(),half=halfBeatSeconds(),whole=wholeNoteSeconds(),s=ac.currentTime+.05;
  if(mode==="1:2"){
    // 定旋律＝全音符、対旋律＝二分音符2個
    cantus.forEach((n,i)=>scheduleTone(n,s+i*whole,whole*.95,.065,cfVoice==="upper"?"triangle":"sine"));
    counter.forEach((n,i)=>scheduleTone(n,s+i*half,half*.92,.065,cfVoice==="upper"?"sine":"triangle"));
  }else{
    // v1.5: 1:1は両声とも全音符。同一の開始間隔・同一の音価で再生。
    cantus.forEach((n,i)=>scheduleTone(n,s+i*whole,whole*.95,.065,cfVoice==="upper"?"triangle":"sine"));
    counter.forEach((n,i)=>scheduleTone(n,s+i*whole,whole*.95,.065,cfVoice==="upper"?"sine":"triangle"));
  }
}
$("playCantusBtn").onclick=playCantus;$("playBothBtn").onclick=playBoth;$("stopBtn").onclick=stopPlayback;

function setTempo(v){
  tempoBpm=Math.max(40,Math.min(160,Number(v)||80));
  $("tempoSlider").value=tempoBpm;
  $("tempoValue").textContent=`♩=${tempoBpm}`;
}
$("tempoSlider").addEventListener("input",e=>setTempo(e.target.value));
$("tempoDownBtn").onclick=()=>setTempo(tempoBpm-4);
$("tempoUpBtn").onclick=()=>setTempo(tempoBpm+4);
setTempo(80);

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
  const className=mode==="1:2"?"第2類":"第1類";
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

window.addEventListener("load",()=>{redraw()});
window.addEventListener("resize",()=>{redraw()});

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
