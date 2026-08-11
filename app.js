
const APP_VERSION="1.19.0";
const $=id=>document.getElementById(id);

const cfC=$("cantusCanvas"), cpC=$("counterCanvas");
const cfX=cfC.getContext("2d"), cpX=cpC.getContext("2d");

const LINE=16, TOP=62;
const STAFF_LEFT=18, NOTE_LEFT=76, RIGHT=12;
const C4Y=TOP+LINE*5, LEDGER_HALF=14;
let measureWidth=150; // v1.12: 110 / 150 / 200 px から選択

let mode="1:2", selected=null, drag=false;
let cfVoice="upper";
let selectedModeName="長旋法";
let problemIndex=0, cantus=[], counter=[];
let history=[], future=[];
let audioCtx=null, activeNodes=[];
let tempoBpm=80;

const PROBLEM_BANK={
  major:{
    upper:[
      {name:"長旋法・上声 1",steps:[0, 1, 3, 2, 1, 0]},
      {name:"長旋法・上声 2",steps:[0, 2, 3, 4, 2, 1, 0]},
      {name:"長旋法・上声 3",steps:[0, 1, 2, 4, 3, 2, 1, 0]},
      {name:"長旋法・上声 4",steps:[0, 2, 4, 3, 5, 3, 1, 0]},
      {name:"長旋法・上声 5",steps:[0, 1, 3, 4, 5, 4, 2, 1, 0]},
      {name:"長旋法・上声 6",steps:[0, 2, 1, 3, 5, 4, 3, 1, 0]},
      {name:"長旋法・上声 7",steps:[0, 1, 2, 3, 5, 4, 3, 2, 0]},
      {name:"長旋法・上声 8",steps:[0, 2, 3, 5, 4, 3, 1, 2, 0]},
      {name:"長旋法・上声 9",steps:[0, 1, 3, 2, 4, 5, 3, 2, 1, 0]},
      {name:"長旋法・上声 10",steps:[0, 2, 4, 5, 3, 4, 2, 1, 0]}
    ],
    lower:[
      {name:"長旋法・下声 1",steps:[7, 6, 4, 5, 6, 7]},
      {name:"長旋法・下声 2",steps:[7, 5, 4, 3, 5, 6, 7]},
      {name:"長旋法・下声 3",steps:[7, 6, 5, 3, 4, 5, 6, 7]},
      {name:"長旋法・下声 4",steps:[7, 5, 3, 4, 2, 4, 6, 7]},
      {name:"長旋法・下声 5",steps:[7, 6, 4, 3, 2, 3, 5, 6, 7]},
      {name:"長旋法・下声 6",steps:[7, 5, 6, 4, 2, 3, 4, 6, 7]},
      {name:"長旋法・下声 7",steps:[7, 6, 5, 4, 2, 3, 4, 5, 7]},
      {name:"長旋法・下声 8",steps:[7, 5, 4, 2, 3, 4, 6, 5, 7]},
      {name:"長旋法・下声 9",steps:[7, 6, 4, 5, 3, 2, 4, 5, 6, 7]},
      {name:"長旋法・下声 10",steps:[7, 5, 3, 2, 4, 3, 5, 6, 7]}
    ]
  },
  minor:{
    upper:[
      {name:"短旋法・上声 1",steps:[0, 2, 1, 3, 2, 0]},
      {name:"短旋法・上声 2",steps:[0, 1, 3, 4, 2, 1, 0]},
      {name:"短旋法・上声 3",steps:[0, 2, 4, 3, 1, 2, 0]},
      {name:"短旋法・上声 4",steps:[0, 1, 4, 3, 2, 1, 0]},
      {name:"短旋法・上声 5",steps:[0, 2, 3, 5, 4, 2, 1, 0]},
      {name:"短旋法・上声 6",steps:[0, 1, 3, 2, 4, 3, 1, 0]},
      {name:"短旋法・上声 7",steps:[0, 2, 3, 4, 2, 3, 1, 0]},
      {name:"短旋法・上声 8",steps:[0, 1, 2, 4, 3, 5, 2, 1, 0]},
      {name:"短旋法・上声 9",steps:[0, 2, 4, 3, 5, 4, 2, 1, 0]},
      {name:"短旋法・上声 10",steps:[0, 1, 3, 4, 2, 3, 2, 1, 0]}
    ],
    lower:[
      {name:"短旋法・下声 1",steps:[7, 5, 6, 4, 5, 7]},
      {name:"短旋法・下声 2",steps:[7, 6, 4, 3, 5, 6, 7]},
      {name:"短旋法・下声 3",steps:[7, 5, 3, 4, 6, 5, 7]},
      {name:"短旋法・下声 4",steps:[7, 6, 3, 4, 5, 6, 7]},
      {name:"短旋法・下声 5",steps:[7, 5, 4, 2, 3, 5, 6, 7]},
      {name:"短旋法・下声 6",steps:[7, 6, 4, 5, 3, 4, 6, 7]},
      {name:"短旋法・下声 7",steps:[7, 5, 4, 3, 5, 4, 6, 7]},
      {name:"短旋法・下声 8",steps:[7, 6, 5, 3, 4, 2, 5, 6, 7]},
      {name:"短旋法・下声 9",steps:[7, 5, 3, 4, 2, 3, 5, 6, 7]},
      {name:"短旋法・下声 10",steps:[7, 6, 4, 3, 5, 4, 5, 6, 7]}
    ]
  },
  dorian:{
    upper:[
      {name:"ドリア旋法・上声 1",steps:[0, 1, 3, 2, 4, 2, 1, 0]},
      {name:"ドリア旋法・上声 2",steps:[0, 2, 3, 5, 4, 3, 1, 0]},
      {name:"ドリア旋法・上声 3",steps:[0, 1, 2, 4, 5, 3, 2, 0]},
      {name:"ドリア旋法・上声 4",steps:[0, 2, 4, 3, 1, 2, 1, 0]},
      {name:"ドリア旋法・上声 5",steps:[0, 1, 3, 5, 4, 2, 3, 1, 0]},
      {name:"ドリア旋法・上声 6",steps:[0, 2, 1, 3, 4, 5, 3, 1, 0]},
      {name:"ドリア旋法・上声 7",steps:[0, 1, 2, 3, 5, 4, 2, 1, 0]},
      {name:"ドリア旋法・上声 8",steps:[0, 2, 4, 5, 3, 2, 4, 1, 0]},
      {name:"ドリア旋法・上声 9",steps:[0, 1, 3, 2, 5, 4, 3, 1, 0]},
      {name:"ドリア旋法・上声 10",steps:[0, 2, 3, 4, 2, 1, 3, 1, 0]}
    ],
    lower:[
      {name:"ドリア旋法・下声 1",steps:[7, 6, 4, 5, 3, 5, 6, 7]},
      {name:"ドリア旋法・下声 2",steps:[7, 5, 4, 2, 3, 4, 6, 7]},
      {name:"ドリア旋法・下声 3",steps:[7, 6, 5, 3, 2, 4, 5, 7]},
      {name:"ドリア旋法・下声 4",steps:[7, 5, 3, 4, 6, 5, 6, 7]},
      {name:"ドリア旋法・下声 5",steps:[7, 6, 4, 2, 3, 5, 4, 6, 7]},
      {name:"ドリア旋法・下声 6",steps:[7, 5, 6, 4, 3, 2, 4, 6, 7]},
      {name:"ドリア旋法・下声 7",steps:[7, 6, 5, 4, 2, 3, 5, 6, 7]},
      {name:"ドリア旋法・下声 8",steps:[7, 5, 3, 2, 4, 5, 3, 6, 7]},
      {name:"ドリア旋法・下声 9",steps:[7, 6, 4, 5, 2, 3, 4, 6, 7]},
      {name:"ドリア旋法・下声 10",steps:[7, 5, 4, 3, 5, 6, 4, 6, 7]}
    ]
  },
  phrygian:{
    upper:[
      {name:"フリギア旋法・上声 1",steps:[0, 1, 3, 2, 1, 0]},
      {name:"フリギア旋法・上声 2",steps:[0, 2, 4, 3, 2, 1, 0]},
      {name:"フリギア旋法・上声 3",steps:[0, 1, 2, 4, 3, 1, 0]},
      {name:"フリギア旋法・上声 4",steps:[0, 1, 3, 4, 2, 1, 0]},
      {name:"フリギア旋法・上声 5",steps:[0, 2, 3, 5, 4, 2, 1, 0]},
      {name:"フリギア旋法・上声 6",steps:[0, 1, 2, 3, 5, 3, 1, 0]},
      {name:"フリギア旋法・上声 7",steps:[0, 2, 4, 5, 3, 2, 1, 0]},
      {name:"フリギア旋法・上声 8",steps:[0, 1, 3, 2, 4, 3, 1, 0]},
      {name:"フリギア旋法・上声 9",steps:[0, 2, 3, 4, 5, 3, 2, 1, 0]},
      {name:"フリギア旋法・上声 10",steps:[0, 1, 2, 4, 5, 4, 2, 1, 0]}
    ],
    lower:[
      {name:"フリギア旋法・下声 1",steps:[7, 6, 4, 5, 6, 7]},
      {name:"フリギア旋法・下声 2",steps:[7, 5, 3, 4, 5, 6, 7]},
      {name:"フリギア旋法・下声 3",steps:[7, 6, 5, 3, 4, 6, 7]},
      {name:"フリギア旋法・下声 4",steps:[7, 6, 4, 3, 5, 6, 7]},
      {name:"フリギア旋法・下声 5",steps:[7, 5, 4, 2, 3, 5, 6, 7]},
      {name:"フリギア旋法・下声 6",steps:[7, 6, 5, 4, 2, 4, 6, 7]},
      {name:"フリギア旋法・下声 7",steps:[7, 5, 3, 2, 4, 5, 6, 7]},
      {name:"フリギア旋法・下声 8",steps:[7, 6, 4, 5, 3, 4, 6, 7]},
      {name:"フリギア旋法・下声 9",steps:[7, 5, 4, 3, 2, 4, 5, 6, 7]},
      {name:"フリギア旋法・下声 10",steps:[7, 6, 5, 3, 2, 3, 5, 6, 7]}
    ]
  },
  lydian:{
    upper:[
      {name:"リディア旋法・上声 1",steps:[0, 2, 3, 4, 2, 1, 0]},
      {name:"リディア旋法・上声 2",steps:[0, 1, 3, 5, 4, 2, 0]},
      {name:"リディア旋法・上声 3",steps:[0, 2, 4, 3, 5, 3, 1, 0]},
      {name:"リディア旋法・上声 4",steps:[0, 1, 2, 4, 5, 3, 2, 0]},
      {name:"リディア旋法・上声 5",steps:[0, 2, 3, 5, 4, 3, 1, 0]},
      {name:"リディア旋法・上声 6",steps:[0, 1, 3, 4, 2, 3, 1, 0]},
      {name:"リディア旋法・上声 7",steps:[0, 2, 4, 5, 3, 2, 1, 0]},
      {name:"リディア旋法・上声 8",steps:[0, 1, 2, 3, 5, 4, 2, 1, 0]},
      {name:"リディア旋法・上声 9",steps:[0, 2, 3, 4, 5, 3, 2, 0]},
      {name:"リディア旋法・上声 10",steps:[0, 1, 3, 5, 4, 3, 2, 1, 0]}
    ],
    lower:[
      {name:"リディア旋法・下声 1",steps:[7, 5, 4, 3, 5, 6, 7]},
      {name:"リディア旋法・下声 2",steps:[7, 6, 4, 2, 3, 5, 7]},
      {name:"リディア旋法・下声 3",steps:[7, 5, 3, 4, 2, 4, 6, 7]},
      {name:"リディア旋法・下声 4",steps:[7, 6, 5, 3, 2, 4, 5, 7]},
      {name:"リディア旋法・下声 5",steps:[7, 5, 4, 2, 3, 4, 6, 7]},
      {name:"リディア旋法・下声 6",steps:[7, 6, 4, 3, 5, 4, 6, 7]},
      {name:"リディア旋法・下声 7",steps:[7, 5, 3, 2, 4, 5, 6, 7]},
      {name:"リディア旋法・下声 8",steps:[7, 6, 5, 4, 2, 3, 5, 6, 7]},
      {name:"リディア旋法・下声 9",steps:[7, 5, 4, 3, 2, 4, 5, 7]},
      {name:"リディア旋法・下声 10",steps:[7, 6, 4, 2, 3, 4, 5, 6, 7]}
    ]
  },
  mixolydian:{
    upper:[
      {name:"ミクソリディア旋法・上声 1",steps:[0, 1, 3, 2, 4, 2, 0]},
      {name:"ミクソリディア旋法・上声 2",steps:[0, 2, 3, 5, 4, 2, 1, 0]},
      {name:"ミクソリディア旋法・上声 3",steps:[0, 1, 2, 4, 3, 2, 0]},
      {name:"ミクソリディア旋法・上声 4",steps:[0, 2, 4, 3, 5, 3, 1, 0]},
      {name:"ミクソリディア旋法・上声 5",steps:[0, 1, 3, 4, 5, 3, 2, 0]},
      {name:"ミクソリディア旋法・上声 6",steps:[0, 2, 1, 3, 5, 4, 2, 0]},
      {name:"ミクソリディア旋法・上声 7",steps:[0, 1, 2, 3, 5, 4, 2, 1, 0]},
      {name:"ミクソリディア旋法・上声 8",steps:[0, 2, 4, 5, 3, 2, 1, 0]},
      {name:"ミクソリディア旋法・上声 9",steps:[0, 1, 3, 2, 4, 5, 3, 1, 0]},
      {name:"ミクソリディア旋法・上声 10",steps:[0, 2, 3, 4, 2, 3, 1, 0]}
    ],
    lower:[
      {name:"ミクソリディア旋法・下声 1",steps:[7, 6, 4, 5, 3, 5, 7]},
      {name:"ミクソリディア旋法・下声 2",steps:[7, 5, 4, 2, 3, 5, 6, 7]},
      {name:"ミクソリディア旋法・下声 3",steps:[7, 6, 5, 3, 4, 5, 7]},
      {name:"ミクソリディア旋法・下声 4",steps:[7, 5, 3, 4, 2, 4, 6, 7]},
      {name:"ミクソリディア旋法・下声 5",steps:[7, 6, 4, 3, 2, 4, 5, 7]},
      {name:"ミクソリディア旋法・下声 6",steps:[7, 5, 6, 4, 2, 3, 5, 7]},
      {name:"ミクソリディア旋法・下声 7",steps:[7, 6, 5, 4, 2, 3, 5, 6, 7]},
      {name:"ミクソリディア旋法・下声 8",steps:[7, 5, 3, 2, 4, 5, 6, 7]},
      {name:"ミクソリディア旋法・下声 9",steps:[7, 6, 4, 5, 3, 2, 4, 6, 7]},
      {name:"ミクソリディア旋法・下声 10",steps:[7, 5, 4, 3, 5, 4, 6, 7]}
    ]
  },
  aeolian:{
    upper:[
      {name:"エオリア旋法・上声 1",steps:[0, 2, 1, 3, 2, 0]},
      {name:"エオリア旋法・上声 2",steps:[0, 1, 3, 4, 2, 1, 0]},
      {name:"エオリア旋法・上声 3",steps:[0, 2, 4, 3, 2, 1, 0]},
      {name:"エオリア旋法・上声 4",steps:[0, 1, 2, 4, 3, 1, 0]},
      {name:"エオリア旋法・上声 5",steps:[0, 2, 3, 5, 4, 2, 1, 0]},
      {name:"エオリア旋法・上声 6",steps:[0, 1, 3, 2, 4, 3, 1, 0]},
      {name:"エオリア旋法・上声 7",steps:[0, 2, 4, 5, 3, 2, 1, 0]},
      {name:"エオリア旋法・上声 8",steps:[0, 1, 2, 3, 5, 3, 2, 0]},
      {name:"エオリア旋法・上声 9",steps:[0, 2, 3, 4, 2, 3, 1, 0]},
      {name:"エオリア旋法・上声 10",steps:[0, 1, 3, 4, 5, 4, 2, 1, 0]}
    ],
    lower:[
      {name:"エオリア旋法・下声 1",steps:[7, 5, 6, 4, 5, 7]},
      {name:"エオリア旋法・下声 2",steps:[7, 6, 4, 3, 5, 6, 7]},
      {name:"エオリア旋法・下声 3",steps:[7, 5, 3, 4, 5, 6, 7]},
      {name:"エオリア旋法・下声 4",steps:[7, 6, 5, 3, 4, 6, 7]},
      {name:"エオリア旋法・下声 5",steps:[7, 5, 4, 2, 3, 5, 6, 7]},
      {name:"エオリア旋法・下声 6",steps:[7, 6, 4, 5, 3, 4, 6, 7]},
      {name:"エオリア旋法・下声 7",steps:[7, 5, 3, 2, 4, 5, 6, 7]},
      {name:"エオリア旋法・下声 8",steps:[7, 6, 5, 4, 2, 4, 5, 7]},
      {name:"エオリア旋法・下声 9",steps:[7, 5, 4, 3, 5, 4, 6, 7]},
      {name:"エオリア旋法・下声 10",steps:[7, 6, 4, 3, 2, 3, 5, 6, 7]}
    ]
  }
};

const MODE_LABELS={major:"長旋法",minor:"短旋法",dorian:"ドリア旋法",phrygian:"フリギア旋法",lydian:"リディア旋法",mixolydian:"ミクソリディア旋法",aeolian:"エオリア旋法"};
function currentProblemKey(){
  const modeValue=$("modeSelect")?.value || "major";
  return PROBLEM_BANK[modeValue] ? modeValue : "major";
}
function currentProblems(){
  return PROBLEM_BANK[currentProblemKey()][cfVoice] || [];
}

function noteObj(step,acc=0,rest=false,empty=false){return {step,acc,rest,empty}}
function cloneCounter(){return counter.map(n=>({...n}))}
function pushHistory(){history.push(cloneCounter());if(history.length>80)history.shift();future=[]}
function undo(){if(!history.length)return;future.push(cloneCounter());counter=history.pop();selected=null;redraw()}
function redo(){if(!future.length)return;history.push(cloneCounter());counter=future.pop();selected=null;redraw()}

function populateProblems(){
  const sel=$("problemSelect");
  sel.innerHTML="";
  const list=currentProblems();
  list.forEach((p,i)=>{
    const o=document.createElement("option");
    o.value=i;
    o.textContent=`${i+1} / ${list.length}　${p.name}`;
    sel.appendChild(o);
  });
  $("problemSetSummary").textContent=`${MODE_LABELS[currentProblemKey()]}・定旋律${cfVoice==="upper"?"上声":"下声"}用　${list.length}問`;
}
function loadProblem(i){
  stopPlayback();
  const list=currentProblems();
  if(!list.length)return;

  problemIndex=(i+list.length)%list.length;
  cantus=list[problemIndex].steps.map(s=>noteObj(s));

  const slots=mode==="1:2"?cantus.length*2:cantus.length;
  counter=Array.from({length:slots},()=>noteObj(4,0,false,true));

  selected=null;history=[];future=[];
  populateProblems();
  $("problemSelect").value=problemIndex;
  $("problemCount").textContent=`${problemIndex+1} / ${list.length}`;

  clearFeedback();
  updateVoiceLayout();
  redraw();
}

function updateVoiceLayout(){
  const cfTitle=$("cfTitle");
  const cpTitle=$("cpTitle");
  const cfBlock=$("cfBlock");
  const cpBlock=$("cpBlock");

  cfTitle.innerHTML=`定旋律 <span class="voice-caption">（${cfVoice==="upper"?"上声":"下声"}）</span>`;
  cpTitle.innerHTML=`対旋律 <span class="voice-caption">（${cfVoice==="upper"?"下声":"上声"}）</span>`;

  // DOMを移動せず、flex orderだけで上下を切替。
  // これによりcanvas wrapperの参照が壊れない。
  if(cfVoice==="upper"){
    cfBlock.style.order="1";
    cpBlock.style.order="2";
  }else{
    cpBlock.style.order="1";
    cfBlock.style.order="2";
  }
}

function clearFeedback(){
  $("results").innerHTML='<p class="muted">「採点・添削」を押すと判定結果が表示されます。</p>';
  $("summaryBadge").textContent="未判定";
}

function setCanvasWidth(c,measureCount){
  const wrap=c.parentElement;
  const viewport=Math.max(320,wrap?.clientWidth||window.innerWidth||320);
  const logicalWidth=Math.max(viewport+2,NOTE_LEFT+RIGHT+measureCount*measureWidth);

  c.dataset.logicalWidth=String(logicalWidth);
  c.style.width=`${logicalWidth}px`;
  c.style.height="220px";
  c.style.display="block";

  if(wrap){
    wrap.style.minHeight="220px";
    wrap.style.height="220px";
  }
}
function resize(c){
  const dpr=window.devicePixelRatio||1;
  const logicalWidth=Number(c.dataset.logicalWidth)||Math.max(320,c.parentElement?.clientWidth||320);
  const logicalHeight=220;

  c.width=Math.round(logicalWidth*dpr);
  c.height=Math.round(logicalHeight*dpr);

  c.style.width=`${logicalWidth}px`;
  c.style.height=`${logicalHeight}px`;

  const ctx=c.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
function y(step){return C4Y-step*(LINE/2)}
function stepFromY(v){return Math.max(-8,Math.min(22,Math.round((C4Y-v)/(LINE/2))))}
function x(i,n,w){return NOTE_LEFT+(w-NOTE_LEFT-RIGHT)*(i+.5)/n}
function idx(px,n,w){return Math.max(0,Math.min(n-1,Math.floor(((px-NOTE_LEFT)/(w-NOTE_LEFT-RIGHT))*n)))}
function baseName(step){const N=["C","D","E","F","G","A","B"],o=Math.floor(step/7),i=((step%7)+7)%7;return {letter:N[i],octave:4+o}}
function noteNameObj(n){const b=baseName(n.step),a=n.acc===1?"♯":n.acc===-1?"♭":"";return `${b.letter}${a}${b.octave}`}
function baseMidi(step){const B=[60,62,64,65,67,69,71],o=Math.floor(step/7),i=((step%7)+7)%7;return B[i]+o*12}
function midiBase(n){return baseMidi(n.step)+n.acc}
function voiceOctaveSemitones(voice){return voice==="upper"?12:0}
function cfVoiceName(){return cfVoice==="upper"?"upper":"lower"}
function cpVoiceName(){return cfVoice==="upper"?"lower":"upper"}
function midiCantus(n){return midiBase(n)+voiceOctaveSemitones(cfVoiceName())}
function midiCounter(n){return midiBase(n)+voiceOctaveSemitones(cpVoiceName())}
function noteX(i,n,w,type){
  if(type!=="whole")return x(i,n,w);
  const slotW=(w-NOTE_LEFT-RIGHT)/n;
  return NOTE_LEFT+slotW*i+slotW*0.32;
}

// 可変太さの白抜き音符頭。
// innerShift の方向で「どちらの対角が太いか」を作る。
function openHead(ctx,px,py,kind){
  ctx.save();
  ctx.translate(px,py);

  // v1.10:
  // 考え方を単純化し、黒い楕円の中を白い楕円で抜く。
  // 外側の黒楕円は一定。違いは白い楕円の傾きのみ。
  //
  // 全音符：白い楕円が左肩上がり（／）
  // 二分音符：白い楕円が右肩上がり（＼）

  const outerRx = kind==="whole" ? 10.4 : 10.0;
  const outerRy = kind==="whole" ? 6.35 : 6.05;
  const outerAngle = -0.10; // 外形はほぼ水平に近く保つ

  ctx.fillStyle="#111";
  ctx.beginPath();
  ctx.ellipse(0,0,outerRx,outerRy,outerAngle,0,Math.PI*2);
  ctx.fill();

  // 白抜きの楕円を明確に傾ける。
  // Canvasでは正の角度が時計回り方向。
  const holeAngle = kind==="whole" ? -0.48 : 0.48;
  const holeRx = kind==="whole" ? 6.75 : 6.45;
  const holeRy = kind==="whole" ? 3.45 : 3.35;

  ctx.fillStyle="#fff";
  ctx.beginPath();
  ctx.ellipse(0,0,holeRx,holeRy,holeAngle,0,Math.PI*2);
  ctx.fill();

  // 外周は細く締める
  ctx.strokeStyle="#111";
  ctx.lineWidth=0.7;
  ctx.beginPath();
  ctx.ellipse(0,0,outerRx,outerRy,outerAngle,0,Math.PI*2);
  ctx.stroke();

  ctx.restore();
}
function drawWhole(ctx,px,py){openHead(ctx,px,py,"whole")}
function drawHalf(ctx,px,py,step){
  openHead(ctx,px,py,"half");

  const stemDown=step>=6; // 中央線以上は下向き
  const stemLength=LINE*3; // 五線の3段分

  // v1.10: 棒を音符頭から少し外側へ。
  // 上向きは右外側、下向きは左外側。
  const stemXOffset=8.9;

  ctx.save();
  ctx.strokeStyle="#111";
  ctx.lineWidth=1.7;
  ctx.beginPath();

  if(stemDown){
    ctx.moveTo(px-stemXOffset,py+0.4);
    ctx.lineTo(px-stemXOffset,py+stemLength);
  }else{
    ctx.moveTo(px+stemXOffset,py-0.4);
    ctx.lineTo(px+stemXOffset,py-stemLength);
  }

  ctx.stroke();
  ctx.restore();
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

function editableZone(canvasWidth){
  const top=Math.max(8,TOP-LINE*1.85);
  const bottom=Math.min(212,TOP+LINE*6.15);
  return {
    x:Math.max(6,NOTE_LEFT-10),
    y:top,
    w:Math.max(120,canvasWidth-(NOTE_LEFT-10)-RIGHT-6),
    h:bottom-top
  };
}
function drawEditableZone(ctx,canvasWidth){
  const z=editableZone(canvasWidth);
  ctx.save();
  ctx.fillStyle="rgba(47,128,237,0.065)";
  ctx.strokeStyle="rgba(47,128,237,0.28)";
  ctx.lineWidth=1.1;
  roundRectPath(ctx,z.x,z.y,z.w,z.h,12);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
function pointInEditableZone(p,canvasWidth){
  const z=editableZone(canvasWidth);
  return p.x>=z.x && p.x<=z.x+z.w && p.y>=z.y && p.y<=z.y+z.h;
}

function drawStaff(ctx,c,notes,slots,type,editable){
  const w=c.clientWidth,h=c.clientHeight;ctx.clearRect(0,0,w,h);
  ctx.strokeStyle="#111";ctx.fillStyle="#111";ctx.lineWidth=1;

  if(editable){
    try{
      drawEditableZone(ctx,w);
    }catch(err){
      console.error("editable zone draw error",err);
    }
  }

  for(let i=0;i<5;i++){
    const yy=TOP+i*LINE;ctx.beginPath();ctx.moveTo(STAFF_LEFT,yy);ctx.lineTo(w-RIGHT,yy);ctx.stroke();
  }
  drawClef(ctx);

  const m=Math.max(1,Math.floor(notes.length/slots));
  const usableW=w-NOTE_LEFT-RIGHT;

  // v1.17 小節番号
  ctx.save();
  ctx.fillStyle="#666";
  ctx.font="11px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
  ctx.textAlign="left";
  ctx.textBaseline="bottom";
  for(let i=0;i<m;i++){
    const leftX=NOTE_LEFT+usableW*i/m;
    ctx.fillText(String(i+1),leftX+5,TOP-7);
  }
  ctx.restore();

  // 1小節目の左側には小節線を引かない。
  // 内部小節線のみ描く。
  ctx.save();
  ctx.strokeStyle="rgba(70,70,70,0.38)";
  ctx.lineWidth=1;
  for(let i=1;i<m;i++){
    const xx=NOTE_LEFT+usableW*i/m;
    ctx.beginPath();
    ctx.moveTo(xx,TOP);
    ctx.lineTo(xx,TOP+LINE*4);
    ctx.stroke();
  }
  ctx.restore();

  // 最終小節の右端に終止線（細線＋太線）
  const endX=NOTE_LEFT+usableW;
  ctx.save();
  ctx.strokeStyle="#111";

  ctx.lineWidth=1.2;
  ctx.beginPath();
  ctx.moveTo(endX-5,TOP);
  ctx.lineTo(endX-5,TOP+LINE*4);
  ctx.stroke();

  ctx.lineWidth=3.4;
  ctx.beginPath();
  ctx.moveTo(endX,TOP);
  ctx.lineTo(endX,TOP+LINE*4);
  ctx.stroke();

  ctx.restore();

  notes.forEach((n,i)=>{
    const xx=noteX(i,notes.length,w,type);

    // v1.11: 未入力スロットは楽譜上に何も表示しない。
    if(n.empty)return;

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
  const measures=cantus.length;

  setCanvasWidth(cfC,measures);
  setCanvasWidth(cpC,measures);

  requestAnimationFrame(()=>{
    resize(cfC);
    resize(cpC);

    const fallbackStaff=(ctx,c)=>{
      const w=c.clientWidth||Number(c.dataset.logicalWidth)||600;
      ctx.clearRect(0,0,w,220);
      ctx.strokeStyle="#111";
      ctx.lineWidth=1;
      for(let i=0;i<5;i++){
        const yy=TOP+i*LINE;
        ctx.beginPath();
        ctx.moveTo(STAFF_LEFT,yy);
        ctx.lineTo(w-RIGHT,yy);
        ctx.stroke();
      }
      try{drawClef(ctx)}catch(e){}
    };

    try{
      drawStaff(cfX,cfC,cantus,1,"whole",false);
    }catch(err){
      console.error("cantus draw error",err);
      fallbackStaff(cfX,cfC);
    }

    try{
      drawStaff(cpX,cpC,counter,mode==="1:2"?2:1,mode==="1:2"?"half":"whole",true);
    }catch(err){
      console.error("counterpoint draw error",err);
      fallbackStaff(cpX,cpC);
    }

    $("cantusScroll").style.display="block";
    $("counterScroll").style.display="block";
    $("cantusCanvas").style.visibility="visible";
    $("counterCanvas").style.visibility="visible";

    $("selectedPitch").textContent=
      selected==null?"未選択":
      counter[selected]?.empty?"未入力":
      counter[selected]?.rest?"休符":
      counter[selected]?noteNameObj(counter[selected]):"未選択";
  });
}

// --- interaction ---
function point(e,c){
  const r=c.getBoundingClientRect();
  return{x:e.clientX-r.left,y:e.clientY-r.top};
}
function beginEdit(){pushHistory();clearFeedback()}

let pointerStart=null;
let pointerMode="idle"; // idle / tap / note-drag / scroll
let historyPushedForGesture=false;

cpC.addEventListener("pointerdown",e=>{
  const p=point(e,cpC);
  if(!pointInEditableZone(p,cpC.clientWidth))return;

  const i=idx(p.x,counter.length,cpC.clientWidth);
  pointerStart={x:p.x,y:p.y,i};
  pointerMode="tap";
  historyPushedForGesture=false;
  selected=i;
  redraw();
});

cpC.addEventListener("pointermove",e=>{
  if(!pointerStart)return;

  const p=point(e,cpC);
  const dx=p.x-pointerStart.x;
  const dy=p.y-pointerStart.y;

  // 横方向の動きはスクロールとして扱い、音符を変更しない。
  if(pointerMode==="tap" && Math.abs(dx)>10 && Math.abs(dx)>Math.abs(dy)){
    pointerMode="scroll";
    return;
  }

  // 既に入力済みの音符だけ、縦ドラッグで音高変更。
  if(pointerMode==="tap" &&
     !counter[pointerStart.i].empty &&
     !counter[pointerStart.i].rest &&
     Math.abs(dy)>8 &&
     Math.abs(dy)>Math.abs(dx)){
    pointerMode="note-drag";
    if(!historyPushedForGesture){
      beginEdit();
      historyPushedForGesture=true;
    }
  }

  if(pointerMode==="note-drag"){
    if(!pointInEditableZone(p,cpC.clientWidth))return;
    counter[pointerStart.i].step=stepFromY(p.y);
    counter[pointerStart.i].empty=false;
    counter[pointerStart.i].rest=false;
    redraw();
    e.preventDefault();
  }
});

cpC.addEventListener("pointerup",e=>{
  if(!pointerStart)return;

  const p=point(e,cpC);
  const i=pointerStart.i;

  if(pointerMode==="tap" && pointInEditableZone(p,cpC.clientWidth)){
    // 短いタップのときだけ新規入力／位置変更。
    beginEdit();
    selected=i;
    counter[i].step=stepFromY(p.y);
    counter[i].acc=0;
    counter[i].rest=false;
    counter[i].empty=false;
    redraw();
  }

  pointerStart=null;
  pointerMode="idle";
  historyPushedForGesture=false;
});

cpC.addEventListener("pointercancel",()=>{
  pointerStart=null;
  pointerMode="idle";
  historyPushedForGesture=false;
});

function ensureSelected(){
  if(selected==null){selected=counter.findIndex(n=>n.empty);if(selected<0)selected=0}
}
function applyEdit(fn){ensureSelected();beginEdit();fn(counter[selected]);redraw()}
$("upBtn").onclick=()=>applyEdit(n=>{n.step=Math.min(22,n.step+1);n.rest=false;n.empty=false});
$("downBtn").onclick=()=>applyEdit(n=>{n.step=Math.max(-8,n.step-1);n.rest=false;n.empty=false});
$("sharpBtn").onclick=()=>applyEdit(n=>{n.acc=1;n.rest=false;n.empty=false});
$("flatBtn").onclick=()=>applyEdit(n=>{n.acc=-1;n.rest=false;n.empty=false});
$("naturalBtn").onclick=()=>applyEdit(n=>{n.acc=0;n.rest=false;n.empty=false});
$("restBtn").onclick=()=>applyEdit(n=>{n.rest=true;n.empty=false});
$("undoBtn").onclick=undo;$("redoBtn").onclick=redo;

function buildPitchButtons(){
  const wrap=$("pitchButtons");
  if(!wrap)return;
  wrap.innerHTML="";

  const steps=[];
  for(let s=0;s<=11;s++)steps.push(s);

  steps.forEach(s=>{
    const bObj=baseName(s);
    const octaveOffset=cpVoiceName()==="upper"?1:0;
    const b=document.createElement("button");
    b.textContent=`${bObj.letter}${bObj.octave+octaveOffset}`;
    b.onclick=()=>applyEdit(x=>{
      x.step=s;x.acc=0;x.rest=false;x.empty=false;
    });
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
  problemIndex=0;
  populateProblems();
  buildPitchButtons();
  loadProblem(0);
};
$("cfLowerBtn").onclick=()=>{
  cfVoice="lower";
  $("cfLowerBtn").classList.add("active");
  $("cfUpperBtn").classList.remove("active");
  problemIndex=0;
  populateProblems();
  buildPitchButtons();
  loadProblem(0);
};
$("modeSelect").onchange=e=>{
  selectedModeName=e.target.options[e.target.selectedIndex].text;
  problemIndex=0;
  populateProblems();
  loadProblem(0);
};

$("problemSelect").onchange=e=>loadProblem(Number(e.target.value));
$("prevProblemBtn").onclick=()=>loadProblem(problemIndex-1);
$("nextProblemBtn").onclick=()=>loadProblem(problemIndex+1);
$("resetBtn").onclick=()=>loadProblem(problemIndex);
$("clearBtn").onclick=()=>{pushHistory();counter.forEach(n=>{n.empty=true;n.rest=false;n.acc=0});selected=null;clearFeedback();redraw()};

// --- audio ---
function ensureAudio(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx}
function stopPlayback(){activeNodes.forEach(n=>{try{n.stop()}catch{}});activeNodes=[]}
function scheduleTone(n,start,dur,gainValue=.08,type="sine",role="counter"){
  if(!n||n.empty||n.rest)return;
  const ac=ensureAudio(),o=ac.createOscillator(),g=ac.createGain();
  const pitch=role==="cantus"?midiCantus(n):midiCounter(n);
  o.type=type;o.frequency.value=440*Math.pow(2,(pitch-69)/12);
  g.gain.setValueAtTime(.0001,start);
  g.gain.exponentialRampToValueAtTime(gainValue,start+.015);
  g.gain.setValueAtTime(gainValue,Math.max(start+.02,start+dur-.04));
  g.gain.exponentialRampToValueAtTime(.0001,start+dur);
  o.connect(g).connect(ac.destination);
  o.start(start);o.stop(start+dur+.02);activeNodes.push(o);
}
function halfBeatSeconds(){return 60/tempoBpm}
function wholeNoteSeconds(){return halfBeatSeconds()*2}
function playCantus(){
  stopPlayback();
  const ac=ensureAudio(),whole=wholeNoteSeconds(),s=ac.currentTime+.05;
  cantus.forEach((n,i)=>scheduleTone(n,s+i*whole,whole*.95,.09,"sine","cantus"));
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
function isConsonant(cf,cp){const s=Math.abs(midiCounter(cp)-midiCantus(cf))%12;return [0,3,4,7,8,9].includes(s)}
$("analyzeBtn").onclick=()=>{
  const a=analyze(),r=$("results");r.innerHTML="";
  if(!a.length){r.innerHTML='<p class="muted">判定対象がありません。</p>';$("summaryBadge").textContent="未入力";return}
  a.forEach(v=>{const d=document.createElement("div");d.className=`result ${v.sev}`;d.innerHTML=`<b>${v.title}</b><div class="loc">${v.loc}</div><div>${v.msg}</div>`;r.appendChild(d)});
  const e=a.filter(v=>v.sev==="error").length,c=a.filter(v=>v.sev==="caution").length;
  $("summaryBadge").textContent=e?`要修正 ${e}件`:c?`注意 ${c}件`:"適切";
  requestAnimationFrame(()=>{
    document.querySelector(".feedback-card")?.scrollIntoView({behavior:"smooth",block:"start"});
  });
};

window.addEventListener("load",()=>{redraw()});
window.addEventListener("resize",()=>{redraw()});



function setMeasureWidth(px,save=true){
  measureWidth=px;

  const mapping={
    110:"measureCompactBtn",
    150:"measureStandardBtn",
    200:"measureWideBtn"
  };
  Object.values(mapping).forEach(id=>$(id)?.classList.remove("active"));
  $(mapping[px])?.classList.add("active");

  $("measureWidthValue").textContent=`${px} px / 小節`;

  if(save){
    try{localStorage.setItem("counterpointMeasureWidth",String(px))}catch(e){}
  }

  redraw();
  requestAnimationFrame(()=>{
    const a=$("cantusScroll"),b=$("counterScroll");
    if(a&&b)b.scrollLeft=a.scrollLeft;
  });
}
$("measureCompactBtn").onclick=()=>setMeasureWidth(110);
$("measureStandardBtn").onclick=()=>setMeasureWidth(150);
$("measureWideBtn").onclick=()=>setMeasureWidth(200);

try{
  const saved=Number(localStorage.getItem("counterpointMeasureWidth"));
  if([110,150,200].includes(saved))measureWidth=saved;
}catch(e){}

let syncingScroll=false;
function syncBothScores(source,target){
  if(syncingScroll)return;
  syncingScroll=true;
  target.scrollLeft=source.scrollLeft;
  requestAnimationFrame(()=>{syncingScroll=false});
}
$("cantusScroll").addEventListener("scroll",()=>syncBothScores($("cantusScroll"),$("counterScroll")),{passive:true});
$("counterScroll").addEventListener("scroll",()=>syncBothScores($("counterScroll"),$("cantusScroll")),{passive:true});

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

$("modeSelect").value="major";
populateProblems();
buildPitchButtons();
loadProblem(0);
setMeasureWidth(measureWidth,false);
