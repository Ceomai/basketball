import { SIM, rnd } from "./data.js";
import { SETTINGS } from "./systems.js";
/* ================= SES =================
   Tüm sesler Web Audio ile anında sentezlenir; dosya yüklenmez.
   Tarayıcılar sesi ancak ilk dokunuştan sonra açtığı için bağlam ilk etkileşimde başlatılır. */
export let AC=null,MASTER=null,NOISE=null,CROWD_SND=null;export const lastPlay={};
export function audioInit(){if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();MASTER=AC.createGain();MASTER.connect(AC.destination);
  const len=AC.sampleRate*2;NOISE=AC.createBuffer(1,len,AC.sampleRate);const d=NOISE.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1}catch(e){AC=null}}
["pointerdown","keydown"].forEach(ev=>window.addEventListener(ev,()=>{audioInit();if(AC&&AC.state==="suspended")AC.resume()},{passive:true}));
// arayüz tıklamaları
document.addEventListener("click",e=>{if(e.target.closest(".btn,.choice,.opt,.tabs button,.venue,.qbtn,.loc"))sfx("click")},true);
export function tone(f,dur,{type="sine",vol=.3,attack=.005,slide=0,delay=0,filter=0}={}){
  const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  let node=o;if(filter){const fl=AC.createBiquadFilter();fl.type="lowpass";fl.frequency.value=filter;o.connect(fl);node=fl}node.connect(g);g.connect(MASTER);o.start(t);o.stop(t+dur+.05)}
export function noise(dur,{vol=.3,type="bandpass",freq=2000,q=1,attack=.005,delay=0,sweep=0}={}){
  const t=AC.currentTime+delay,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=NOISE;f.type=type;f.frequency.setValueAtTime(freq,t);if(sweep)f.frequency.exponentialRampToValueAtTime(Math.max(60,freq+sweep),t+dur);f.Q.value=q;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(MASTER);s.start(t,Math.random());s.stop(t+dur+.05)}
export const SFX={
  click:()=>tone(1400,.04,{type:"square",vol:.05,filter:3000}),
  notify:()=>{tone(880,.12,{vol:.12});tone(1320,.18,{vol:.1,delay:.08})},
  coin:()=>{tone(988,.08,{type:"square",vol:.08,filter:4000});tone(1319,.22,{type:"square",vol:.08,filter:4000,delay:.07})},
  buy:()=>{noise(.08,{freq:5000,vol:.12});tone(1568,.12,{type:"triangle",vol:.12,delay:.05});tone(2093,.25,{type:"triangle",vol:.1,delay:.12})},
  throw:()=>noise(.18,{freq:900,sweep:1800,vol:.08,q:.7}),
  swish:()=>{noise(.32,{type:"highpass",freq:3200,vol:.22,attack:.02});noise(.2,{freq:1800,vol:.08,delay:.05})},
  rim:()=>{tone(320,.35,{type:"triangle",vol:.22});tone(760,.25,{type:"square",vol:.06,filter:2000});noise(.06,{freq:3000,vol:.12})},
  board:()=>{tone(140,.14,{type:"triangle",vol:.25});noise(.08,{freq:600,vol:.18})},
  bounce:()=>{tone(180,.12,{slide:-90,vol:.35});noise(.04,{freq:400,vol:.12})},
  pass:()=>{tone(220,.08,{slide:-60,vol:.25});noise(.05,{freq:800,vol:.1})},
  block:()=>{tone(110,.2,{slide:-50,type:"triangle",vol:.4});noise(.12,{freq:500,vol:.25})},
  steal:()=>{noise(.1,{freq:2500,vol:.15});tone(660,.1,{vol:.1,delay:.05})},
  thud:()=>tone(90,.1,{slide:-30,type:"triangle",vol:.3}),
  clank:()=>{tone(420,.12,{type:"square",vol:.06,filter:1800});tone(630,.1,{type:"triangle",vol:.08})},
  whistle:()=>{const t=AC.currentTime,o=AC.createOscillator(),l=AC.createOscillator(),lg=AC.createGain(),g=AC.createGain();o.frequency.value=2900;l.frequency.value=38;lg.gain.value=120;l.connect(lg);lg.connect(o.frequency);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.02);g.gain.setValueAtTime(.12,t+.32);g.gain.exponentialRampToValueAtTime(.0001,t+.42);o.connect(g);g.connect(MASTER);o.start(t);l.start(t);o.stop(t+.45);l.stop(t+.45)},
  buzzer:()=>{tone(220,.9,{type:"sawtooth",vol:.14,filter:1200});tone(223,.9,{type:"sawtooth",vol:.1,filter:1200})},
  cheer:()=>{noise(1.4,{freq:1100,q:.4,vol:.22,attack:.15});noise(1.1,{freq:2400,q:.6,vol:.08,attack:.2,delay:.1})},
  ooh:()=>{noise(.9,{freq:500,sweep:-200,q:1.4,vol:.18,attack:.1})},
  win:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.35,{type:"triangle",vol:.12,delay:i*.1})),
  lose:()=>[392,330,262].forEach((f,i)=>tone(f,.4,{type:"triangle",vol:.1,delay:i*.14})),
  fanfare:()=>{[523,659,784].forEach((f,i)=>tone(f,.18,{type:"square",vol:.06,filter:2500,delay:i*.09}));tone(1047,.6,{type:"square",vol:.07,filter:2500,delay:.3});tone(784,.6,{type:"triangle",vol:.06,delay:.3})},
  levelup:()=>[392,523,659,784,1047].forEach((f,i)=>tone(f,.16,{type:"triangle",vol:.1,delay:i*.06})),
  shutter:()=>{noise(.03,{freq:4000,vol:.25});noise(.05,{freq:2500,vol:.18,delay:.06})},
  puck:()=>{tone(900,.05,{type:"square",vol:.06,filter:2500});noise(.04,{freq:3000,vol:.15})},
  blip:()=>tone(1046,.07,{type:"square",vol:.06,filter:3000}),
  error:()=>tone(160,.15,{type:"square",vol:.06,filter:900}),
  note:l=>tone([523,659,784,1047][l||0],.22,{type:"triangle",vol:.14}),
  roll:()=>noise(1.1,{type:"lowpass",freq:260,vol:.3,attack:.1}),
  pin:()=>{for(let i=0;i<4;i++)tone(rnd(700,1200),.12,{type:"triangle",vol:.08,delay:i*.03});noise(.15,{freq:1500,vol:.12})},
  strike:()=>{for(let i=0;i<10;i++)tone(rnd(600,1400),.15,{type:"triangle",vol:.07,delay:i*.025});noise(.4,{freq:1200,vol:.2});SFX.cheer()},
  card:()=>noise(.06,{freq:3500,vol:.14,sweep:-1500}),
  reel:()=>tone(rnd(300,500),.03,{type:"square",vol:.03,filter:1500}),
  reelStop:()=>{tone(200,.1,{type:"triangle",vol:.2});noise(.04,{freq:1200,vol:.1})},
  tick:()=>tone(2200,.02,{type:"square",vol:.03,filter:4000}),
  clack:()=>{tone(600,.08,{type:"triangle",vol:.15});noise(.05,{freq:2500,vol:.12})},
  coinIn:()=>{tone(1800,.05,{type:"square",vol:.05,filter:5000});tone(2400,.12,{type:"square",vol:.05,filter:5000,delay:.05})},
};
export function sfx(name,arg){
  if(SIM()||!SETTINGS.sound||!AC||AC.state!=="running")return;const now=performance.now();if(lastPlay[name]&&now-lastPlay[name]<60)return;lastPlay[name]=now;
  MASTER.gain.value=SETTINGS.vol;try{SFX[name]&&SFX[name](arg)}catch(e){}
}
// maç boyunca tribün uğultusu; skor anlarında kabarır
export function crowd(on){
  if(!AC||SIM())return;
  if(!on||!SETTINGS.sound||!SETTINGS.crowd){if(CROWD_SND){try{CROWD_SND.g.gain.setTargetAtTime(0,AC.currentTime,.3);const c=CROWD_SND;setTimeout(()=>{try{c.s.stop()}catch(e){}},900)}catch(e){}CROWD_SND=null}return}
  if(CROWD_SND)return;const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=NOISE;s.loop=true;f.type="bandpass";f.frequency.value=700;f.Q.value=.5;g.gain.value=0;
  s.connect(f);f.connect(g);g.connect(MASTER);s.start();g.gain.setTargetAtTime(.05,AC.currentTime,.8);CROWD_SND={s,g,f};
}
export function crowdSwell(amount=1){if(!CROWD_SND||!AC)return;const t=AC.currentTime;CROWD_SND.g.gain.cancelScheduledValues(t);CROWD_SND.g.gain.setTargetAtTime(.05+.07*amount,t,.08);CROWD_SND.g.gain.setTargetAtTime(.05,t+.6,.6)}
