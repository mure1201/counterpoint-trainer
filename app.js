
const $ = (id)=>document.getElementById(id);

const cantusCanvas = $("cantusCanvas");
const counterCanvas = $("counterCanvas");
const ctxCF = cantusCanvas.getContext("2d");
const ctxCP = counterCanvas.getContext("2d");

const LINE_SPACING = 18;
const TOP = 55;
const LEFT = 18;
const RIGHT = 18;
const C4_Y = TOP + LINE_SPACING * 5;
const MIN_STEP = -2;
const MAX_STEP = 16;

let cantus = [0,1,3,2,1,0].map(step=>({step,rest:false}));
let counter = [4,5,5,6,7,5,4,3,3,2,1,7].map(step=>({step,rest:false}));
let selectedIndex = null;
let dragging = false;
let deferredPrompt = null;

function resizeCanvas(canvas){
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio,0,0,ratio,0,0);
}

function stepToName(step){
  const names=["C","D","E","F","G","A","B"];
  const octaveOffset = Math.floor(step/7);
  const idx = ((step%7)+7)%7;
  const octave = 4 + octaveOffset;
  return `${names[idx]}${octave}`;
}
function stepToMidi(step){
  const base=[60,62,64,65,67,69,71];
  const octaveOffset=Math.floor(step/7);
  const idx=((step%7)+7)%7;
  return base[idx] + octaveOffset*12;
}
function yForStep(step){ return C4_Y - step*(LINE_SPACING/2); }
function stepFromY(y){
  return Math.max(MIN_STEP,Math.min(MAX_STEP,Math.round((C4_Y-y)/(LINE_SPACING/2))));
}
function xForIndex(index,count,width){
  const usable=width-LEFT-RIGHT;
  return LEFT + usable*(index+0.5)/count;
}
function indexFromX(x,count,width){
  const usable=width-LEFT-RIGHT;
  return Math.max(0,Math.min(count-1,Math.floor(((x-LEFT)/usable)*count)));
}
function cssPoint(evt,canvas){
  const r=canvas.getBoundingClientRect();
  const p=evt.touches ? evt.touches[0] : evt;
  return {x:p.clientX-r.left,y:p.clientY-r.top};
}

function drawStaff(ctx,width,height,notes,slotsPerMeasure,editable){
  ctx.clearRect(0,0,width,height);
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  ctx.strokeStyle = dark ? "#f2f2f7" : "#1c1c1e";
  ctx.fillStyle = dark ? "#f2f2f7" : "#1c1c1e";
  ctx.lineWidth=1;

  for(let i=0;i<5;i++){
    const y=TOP+i*LINE_SPACING;
    ctx.beginPath();ctx.moveTo(LEFT,y);ctx.lineTo(width-RIGHT,y);ctx.stroke();
  }
  const measures=Math.max(1,Math.floor(notes.length/slotsPerMeasure));
  ctx.strokeStyle = dark ? "#636366" : "#aeaeb2";
  for(let i=0;i<=measures;i++){
    const x=LEFT+(width-LEFT-RIGHT)*i/measures;
    ctx.beginPath();ctx.moveTo(x,TOP);ctx.lineTo(x,TOP+LINE_SPACING*4);ctx.stroke();
  }

  notes.forEach((n,i)=>{
    const x=xForIndex(i,notes.length,width);
    if(n.rest){
      ctx.fillStyle = dark ? "#f2f2f7" : "#1c1c1e";
      ctx.font="24px serif";
      ctx.fillText("𝄽",x-8,TOP+LINE_SPACING*2+8);
      return;
    }
    const y=yForStep(n.step);

    // ledger
    const bottom=TOP+LINE_SPACING*4;
    if(y>bottom+LINE_SPACING/2){
      const count=Math.max(1,Math.floor((y-bottom)/LINE_SPACING));
      ctx.strokeStyle=dark ? "#f2f2f7" : "#1c1c1e";
      for(let j=1;j<=count;j++){
        const ly=bottom+j*LINE_SPACING;
        ctx.beginPath();ctx.moveTo(x-14,ly);ctx.lineTo(x+14,ly);ctx.stroke();
      }
    }

    if(editable && selectedIndex===i){
      ctx.strokeStyle="#0a84ff";ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.stroke();
    }

    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(-0.3);
    ctx.fillStyle=dark ? "#f2f2f7" : "#1c1c1e";
    ctx.beginPath();ctx.ellipse(0,0,9,6,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.fillRect(x+7,y-32,1.5,32);
  });
}

function redraw(){
  resizeCanvas(cantusCanvas); resizeCanvas(counterCanvas);
  drawStaff(ctxCF,cantusCanvas.clientWidth,cantusCanvas.clientHeight,cantus,1,false);
  drawStaff(ctxCP,counterCanvas.clientWidth,counterCanvas.clientHeight,counter,2,true);
  if(selectedIndex==null) $("selectedPitch").textContent="未選択";
  else $("selectedPitch").textContent=counter[selectedIndex].rest ? "休符" : stepToName(counter[selectedIndex].step);
}

function pickOrMove(point){
  const i=indexFromX(point.x,counter.length,counterCanvas.clientWidth);
  selectedIndex=i;
  counter[i].step=stepFromY(point.y);
  counter[i].rest=false;
  redraw();
}

counterCanvas.addEventListener("pointerdown",e=>{
  counterCanvas.setPointerCapture?.(e.pointerId);
  dragging=true; pickOrMove(cssPoint(e,counterCanvas)); e.preventDefault();
});
counterCanvas.addEventListener("pointermove",e=>{
  if(!dragging || selectedIndex==null) return;
  const p=cssPoint(e,counterCanvas);
  counter[selectedIndex].step=stepFromY(p.y);
  counter[selectedIndex].rest=false;
  redraw(); e.preventDefault();
});
counterCanvas.addEventListener("pointerup",e=>{ dragging=false; e.preventDefault(); });
counterCanvas.addEventListener("pointercancel",()=>dragging=false);

$("upBtn").onclick=()=>{
  if(selectedIndex==null)return;
  counter[selectedIndex].step=Math.min(MAX_STEP,counter[selectedIndex].step+1);
  counter[selectedIndex].rest=false; redraw();
};
$("downBtn").onclick=()=>{
  if(selectedIndex==null)return;
  counter[selectedIndex].step=Math.max(MIN_STEP,counter[selectedIndex].step-1);
  counter[selectedIndex].rest=false; redraw();
};
$("restBtn").onclick=()=>{
  if(selectedIndex==null)return;
  counter[selectedIndex].rest=true; redraw();
};
$("resetBtn").onclick=()=>{
  cantus=[0,1,3,2,1,0].map(step=>({step,rest:false}));
  counter=[4,5,5,6,7,5,4,3,3,2,1,7].map(step=>({step,rest:false}));
  selectedIndex=null; $("results").innerHTML='<p class="muted">「この対旋律を添削」を押すと結果を表示します。</p>';
  $("summaryBadge").textContent="未判定"; redraw();
};
$("clearBtn").onclick=()=>{
  counter.forEach(n=>n.rest=true);selectedIndex=null;redraw();
};

function finding(severity,title,location,message){
  return {severity,title,location,message};
}
function analyze(){
  const out=[];

  // 強拍の基本和声音程
  for(let m=0;m<cantus.length;m++){
    const cp=counter[m*2], cf=cantus[m];
    if(cp.rest||cf.rest) continue;
    const semis=Math.abs(stepToMidi(cp.step)-stepToMidi(cf.step))%12;
    const allowed=[0,3,4,7,8,9].includes(semis);
    out.push(finding(
      allowed?"good":"error",
      "強拍の和声音程",
      `第${m+1}小節・強拍`,
      allowed ? "強拍の基本和声音程として扱えます。" : "強拍の基本和声音程として要確認です。"
    ));
  }

  // 5度/8度連続 簡易
  for(let i=1;i<counter.length;i++){
    const a=counter[i-1], b=counter[i];
    if(a.rest||b.rest)continue;
    const cfa=cantus[Math.floor((i-1)/2)], cfb=cantus[Math.floor(i/2)];
    const int1=Math.abs(stepToMidi(a.step)-stepToMidi(cfa.step))%12;
    const int2=Math.abs(stepToMidi(b.step)-stepToMidi(cfb.step))%12;
    if(int1===7&&int2===7){
      out.push(finding("caution","完全5度の連続",`位置${i}→${i+1}`,"完全5度が連続しています。声部進行と例外条件を確認してください。"));
    }
    if(int1===0&&int2===0){
      out.push(finding("caution","完全8度の連続",`位置${i}→${i+1}`,"完全8度が連続しています。声部進行と例外条件を確認してください。"));
    }
  }

  // 同方向の順次進行（暫定）
  let runDir=0, run=0, start=0;
  function flush(end){
    if(run>=4) out.push(finding("avoid","同方向の順次進行",`位置${start+1}～${end+1}`,"同方向への順次進行が長く続いています。"));
  }
  for(let i=1;i<counter.length;i++){
    if(counter[i-1].rest||counter[i].rest){flush(i-1);run=0;runDir=0;continue;}
    const d=counter[i].step-counter[i-1].step;
    const dir=Math.sign(d);
    if(Math.abs(d)===1 && dir!==0){
      if(dir===runDir)run++;
      else{flush(i-1);runDir=dir;run=1;start=i-1;}
    }else{flush(i-1);run=0;runDir=0;}
  }
  flush(counter.length-1);

  return out;
}
function renderResults(items){
  const r=$("results");r.innerHTML="";
  if(items.length===0){
    r.innerHTML='<p class="muted">現在の簡易判定では問題を検出しませんでした。</p>';
    $("summaryBadge").textContent="問題なし";
    return;
  }
  const problems=items.filter(x=>["error","avoid","caution"].includes(x.severity)).length;
  $("summaryBadge").textContent=`注意 ${problems}件`;
  items.forEach(x=>{
    const div=document.createElement("div");
    div.className=`result ${x.severity}`;
    const sym={error:"✕",avoid:"△",caution:"!",good:"✓",info:"i"}[x.severity]||"○";
    div.innerHTML=`<div class="result-head"><span>${sym}</span><span>${x.title}</span></div>
      <div class="loc">${x.location}</div><p>${x.message}</p>`;
    r.appendChild(div);
  });
}
$("analyzeBtn").onclick=()=>renderResults(analyze());

window.addEventListener("resize",redraw);
window.addEventListener("load",redraw);

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
}

window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();deferredPrompt=e;$("installBtn").hidden=false;
});
$("installBtn").onclick=async()=>{
  if(!deferredPrompt)return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt=null;$("installBtn").hidden=true;
};
