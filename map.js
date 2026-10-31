"use strict";
/* ================= ŞEHİR HARİTASI ================= */
const LOCS=[
 {id:"okul",x:92,y:200},{id:"medya",x:304,y:196},
 {id:"ev",x:86,y:334},{id:"stad",x:282,y:326},
 {id:"aile",x:80,y:466},{id:"kafe",x:200,y:470},{id:"eglence",x:322,y:466},
 {id:"avm",x:84,y:596},{id:"market",x:200,y:600},{id:"sans",x:320,y:596},
];
const HOUSE_NAMES={oda:"Ailenin evi · odan",yurt:"Öğrenci yurdu",daire:"Kiralık daire",lux:"Rezidans",villa:"Villa",malikane:"Malikâne"};
function locInfo(id,P){
  const away=P.city!==P.home;
  return{
   okul:{n:P.studying?(P.stage==="lise"?"Lise":"Üniversite"):"Menajer Ofisi",slot:P.studying},
   medya:{n:"Medya Merkezi",slot:true},
   ev:{n:HOUSE_NAMES[P.housing]||"Evin",slot:false},
   stad:{n:P.team?P.team.short+" "+(["lise","uni"].includes(P.stage)?"Spor Salonu":"Arena"):"Stadyum",slot:false},
   aile:{n:away?`Aile · ${P.home}`:"Ailenin Evi",slot:true},
   kafe:{n:"Kafe",slot:true},
   eglence:{n:"Eğlence Merkezi",slot:false},
   avm:{n:"AVM",slot:false},market:{n:"Market",slot:false},sans:{n:"Şans Salonu",slot:false}
  }[id];
}
function box(x,y,w,h,d,f,s,t){const k=d*.6;return`<path d="M${x+w} ${y} L${x+w+d} ${y-k} L${x+w+d} ${y-h-k} L${x+w} ${y-h} Z" fill="${s}"/><path d="M${x} ${y-h} L${x+d} ${y-h-k} L${x+w+d} ${y-h-k} L${x+w} ${y-h} Z" fill="${t}"/><rect x="${x}" y="${y-h}" width="${w}" height="${h}" fill="${f}"/>`}
function windows(x,y,w,h,cols,rows,lit,glass){let s="";const cw=w/cols,rh=h/rows;for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const on=lit&&((i*7+j*3)%5!==0);s+=`<rect x="${(x+i*cw+cw*.22).toFixed(1)}" y="${(y-h+j*rh+rh*.22).toFixed(1)}" width="${(cw*.56).toFixed(1)}" height="${(rh*.5).toFixed(1)}" fill="${on?"#ffd27a":glass?"#7fa7c9":lit?"#18233a":"#9fbcd6"}"/>`}return s}
// simge yapılar
function landmarkSVG(type,x,base,col,lit,sc,seed){
  const glow=lit?"#ffd27a":"#d7e2ec",s=sc;
  const T={
   mosque:()=>`<path d="M${x-34*s} ${base}V${base-26*s}H${x+34*s}V${base}Z" fill="${col}"/><path d="M${x-26*s} ${base-26*s}A26 22 0 0 1 ${x+26*s} ${base-26*s}Z" fill="${col}"/><path d="M${x-40*s} ${base-14*s}A10 9 0 0 1 ${x-22*s} ${base-14*s}Z M${x+22*s} ${base-14*s}A10 9 0 0 1 ${x+40*s} ${base-14*s}Z" fill="${col}"/>${[-48,48].map(o=>`<rect x="${x+o*s-2.5*s}" y="${base-82*s}" width="${5*s}" height="${82*s}" fill="${col}"/><path d="M${x+o*s-3*s} ${base-82*s}L${x+o*s} ${base-96*s}L${x+o*s+3*s} ${base-82*s}Z" fill="${col}"/><rect x="${x+o*s-4*s}" y="${base-62*s}" width="${8*s}" height="${3*s}" fill="${col}"/>`).join("")}<rect x="${x-1}" y="${base-56*s}" width="2" height="${8*s}" fill="${col}"/>`,
   tower:()=>`<rect x="${x-10*s}" y="${base-64*s}" width="${20*s}" height="${64*s}" fill="${col}"/><path d="M${x-13*s} ${base-64*s}L${x} ${base-92*s}L${x+13*s} ${base-64*s}Z" fill="${col}"/><rect x="${x-8*s}" y="${base-54*s}" width="${16*s}" height="${4*s}" fill="${glow}"/>`,
   bridge:()=>`<rect x="${x-50*s}" y="${base-54*s}" width="${5*s}" height="${54*s}" fill="${col}"/><rect x="${x+45*s}" y="${base-54*s}" width="${5*s}" height="${54*s}" fill="${col}"/><path d="M${x-96*s} ${base-12*s} Q${x-48*s} ${base-10*s} ${x-48*s} ${base-54*s} Q${x} ${base-6*s} ${x+48*s} ${base-54*s} Q${x+48*s} ${base-10*s} ${x+96*s} ${base-12*s}" fill="none" stroke="${col}" stroke-width="2"/><rect x="${x-100*s}" y="${base-12*s}" width="${200*s}" height="${4*s}" fill="${col}"/>${lit?Array.from({length:9},(_,i)=>`<circle cx="${x-80*s+i*20*s}" cy="${base-12*s}" r="1.4" fill="#ffd27a"/>`).join(""):""}`,
   needle:()=>`<rect x="${x-3*s}" y="${base-86*s}" width="${6*s}" height="${86*s}" fill="${col}"/><ellipse cx="${x}" cy="${base-72*s}" rx="${15*s}" ry="${7*s}" fill="${col}"/><rect x="${x-1}" y="${base-104*s}" width="2" height="${20*s}" fill="${col}"/><circle cx="${x}" cy="${base-104*s}" r="2" fill="${lit?"#ff5468":col}"/>`,
   castle:()=>`<rect x="${x-44*s}" y="${base-30*s}" width="${88*s}" height="${30*s}" fill="${col}"/>${[-44,-6,32].map(o=>`<rect x="${x+o*s}" y="${base-50*s}" width="${12*s}" height="${50*s}" fill="${col}"/><path d="M${x+o*s-2} ${base-50*s}L${x+o*s+6*s} ${base-62*s}L${x+o*s+12*s+2} ${base-50*s}Z" fill="${col}"/>`).join("")}`,
   clock:()=>`<rect x="${x-9*s}" y="${base-62*s}" width="${18*s}" height="${62*s}" fill="${col}"/><path d="M${x-11*s} ${base-62*s}L${x} ${base-80*s}L${x+11*s} ${base-62*s}Z" fill="${col}"/><circle cx="${x}" cy="${base-50*s}" r="${5*s}" fill="${glow}"/>`,
   palms:()=>[0,26,58].map(o=>`<path d="M${x+o*s-30*s} ${base}Q${x+o*s-26*s} ${base-30*s} ${x+o*s-29*s} ${base-52*s}" stroke="${col}" stroke-width="4" fill="none"/><path d="M${x+o*s-29*s} ${base-52*s}q-16 -2 -22 8M${x+o*s-29*s} ${base-52*s}q16 -2 22 8M${x+o*s-29*s} ${base-52*s}q-8 -12 -20 -10M${x+o*s-29*s} ${base-52*s}q8 -12 20 -10" stroke="${col}" stroke-width="4" fill="none" stroke-linecap="round"/>`).join(""),
   mountain:()=>`<path d="M${x-130*s} ${base}L${x} ${base-96*s}L${x+130*s} ${base}Z" fill="${col}" opacity=".85"/><path d="M${x-32*s} ${base-72*s}L${x} ${base-96*s}L${x+32*s} ${base-72*s}L${x+12*s} ${base-64*s}L${x} ${base-72*s}L${x-14*s} ${base-62*s}Z" fill="#e8eef4"/>`,
   hills:()=>`<path d="M${x-130*s} ${base}Q${x-60*s} ${base-60*s} ${x} ${base-22*s}Q${x+60*s} ${base-74*s} ${x+140*s} ${base}Z" fill="${col}" opacity=".85"/>`,
   dome:()=>`<rect x="${x-26*s}" y="${base-34*s}" width="${52*s}" height="${34*s}" fill="${col}"/><path d="M${x-22*s} ${base-34*s}A22 26 0 0 1 ${x+22*s} ${base-34*s}Z" fill="${col}"/><rect x="${x-2}" y="${base-70*s}" width="4" height="${12*s}" fill="${col}"/><circle cx="${x}" cy="${base-20*s}" r="${5*s}" fill="${glow}"/>`,
   skyline:()=>[[-44,70],[-26,98],[-8,62],[8,116],[26,82],[44,66]].map(([o,h])=>`<rect x="${x+o*s}" y="${base-h*s}" width="${16*s}" height="${h*s}" fill="${col}"/>${lit?`<rect x="${x+o*s+4}" y="${base-h*s+8}" width="2" height="${h*s-14}" fill="#ffd27a" opacity=".5"/>`:""}${o===8?`<rect x="${x+o*s+7*s}" y="${base-h*s-16*s}" width="2" height="${16*s}" fill="${col}"/>`:""}`).join(""),
   timber:()=>[-36,-10,16].map((o,i)=>`<rect x="${x+o*s}" y="${base-(34+i*6)*s}" width="${24*s}" height="${(34+i*6)*s}" fill="${col}"/><path d="M${x+o*s-2} ${base-(34+i*6)*s}L${x+o*s+12*s} ${base-(52+i*6)*s}L${x+o*s+24*s+2} ${base-(34+i*6)*s}Z" fill="${col}"/>`).join(""),
   arch:()=>`<path d="M${x-32*s} ${base}V${base-48*s}H${x+32*s}V${base}H${x+13*s}V${base-22*s}a${13*s} ${13*s} 0 0 0 ${-26*s} 0V${base}Z" fill="${col}"/><rect x="${x-36*s}" y="${base-56*s}" width="${72*s}" height="${8*s}" fill="${col}"/>`,
   spires:()=>`<rect x="${x-30*s}" y="${base-40*s}" width="${60*s}" height="${40*s}" fill="${col}"/>${[-26,-10,10,26].map((o,i)=>`<path d="M${x+o*s-5*s} ${base-40*s}L${x+o*s} ${base-(i%3?72:90)*s}L${x+o*s+5*s} ${base-40*s}Z" fill="${col}"/>`).join("")}<circle cx="${x}" cy="${base-26*s}" r="${6*s}" fill="${glow}"/>`,
   temple:()=>`<path d="M${x-74*s} ${base}Q${x} ${base-32*s} ${x+74*s} ${base}Z" fill="${col}" opacity=".8"/><path d="M${x-38*s} ${base-32*s}L${x} ${base-48*s}L${x+38*s} ${base-32*s}Z" fill="${col}"/>${[-32,-19,-6,6,19,32].map(o=>`<rect x="${x+o*s-2*s}" y="${base-32*s}" width="${4*s}" height="${16*s}" fill="${col}"/>`).join("")}<rect x="${x-38*s}" y="${base-17*s}" width="${76*s}" height="${4*s}" fill="${col}"/>`,
   fortress:()=>`<rect x="${x-62*s}" y="${base-26*s}" width="${124*s}" height="${26*s}" fill="${col}"/>${[-62,-20,20,52].map(o=>`<rect x="${x+o*s}" y="${base-46*s}" width="${12*s}" height="${46*s}" fill="${col}"/>`).join("")}${Array.from({length:12},(_,i)=>`<rect x="${x-62*s+i*10*s}" y="${base-31*s}" width="${5*s}" height="${5*s}" fill="${col}"/>`).join("")}`,
   lattice:()=>`<path d="M${x-26*s} ${base}L${x-3*s} ${base-98*s}L${x+3*s} ${base-98*s}L${x+26*s} ${base}L${x+14*s} ${base}Q${x} ${base-30*s} ${x-14*s} ${base}Z" fill="${col}"/><rect x="${x-14*s}" y="${base-52*s}" width="${28*s}" height="${4*s}" fill="${col}"/><rect x="${x-1}" y="${base-112*s}" width="2" height="${14*s}" fill="${col}"/>${lit?`<circle cx="${x}" cy="${base-60*s}" r="${20*s}" fill="#ffd27a" opacity=".12"/>`:""}`,
   arena:()=>`<path d="M${x-52*s} ${base}V${base-40*s}Q${x} ${base-54*s} ${x+52*s} ${base-40*s}V${base}Z" fill="${col}"/>${[-42,-26,-10,6,22,38].map(o=>`<path d="M${x+o*s} ${base-4*s}v${-10*s}a${5*s} ${5*s} 0 0 1 ${10*s} 0v${10*s}Z" fill="${lit?"#3a2c1a":"#e8d9b8"}"/>`).join("")}`,
   leaning:()=>`<g transform="rotate(5 ${x} ${base})"><rect x="${x-9*s}" y="${base-70*s}" width="${18*s}" height="${70*s}" fill="${col}"/>${[1,2,3,4,5].map(i=>`<rect x="${x-10*s}" y="${base-i*13*s}" width="${20*s}" height="2" fill="${glow}" opacity=".5"/>`).join("")}</g>`,
   windmill:()=>`<path d="M${x-12*s} ${base}L${x-8*s} ${base-44*s}H${x+8*s}L${x+12*s} ${base}Z" fill="${col}"/><g transform="rotate(${seed%90} ${x} ${base-44*s})">${[0,90,180,270].map(a=>`<rect x="${x-2}" y="${base-80*s}" width="4" height="${36*s}" fill="${col}" transform="rotate(${a} ${x} ${base-44*s})"/>`).join("")}</g>`,
   onion:()=>`<rect x="${x-22*s}" y="${base-36*s}" width="${44*s}" height="${36*s}" fill="${col}"/>${[-14,0,14].map((o,i)=>`<path d="M${x+o*s-8*s} ${base-(36+i%2*8)*s}C${x+o*s-10*s} ${base-(50+i%2*8)*s} ${x+o*s} ${base-(56+i%2*8)*s} ${x+o*s} ${base-(62+i%2*8)*s}C${x+o*s} ${base-(56+i%2*8)*s} ${x+o*s+10*s} ${base-(50+i%2*8)*s} ${x+o*s+8*s} ${base-(36+i%2*8)*s}Z" fill="${col}"/>`).join("")}`,
   brick:()=>`<rect x="${x-52*s}" y="${base-36*s}" width="${104*s}" height="${36*s}" fill="${col}"/><path d="M${x-18*s} ${base-36*s}a${18*s} ${18*s} 0 0 1 ${36*s} 0Z" fill="${lit?"#d8b25a":"#c9a64a"}"/><rect x="${x-1}" y="${base-64*s}" width="2" height="${12*s}" fill="${col}"/>`,
   bullring:()=>`<ellipse cx="${x}" cy="${base-12*s}" rx="${48*s}" ry="${16*s}" fill="${col}"/><rect x="${x-48*s}" y="${base-12*s}" width="${96*s}" height="${12*s}" fill="${col}"/>${[-36,-18,0,18,36].map(o=>`<path d="M${x+o*s-4*s} ${base}v${-7*s}a${4*s} ${4*s} 0 0 1 ${8*s} 0v${7*s}Z" fill="${lit?"#3a2c1a":"#e8d9b8"}"/>`).join("")}`,
   lighthouse:()=>`<path d="M${x-9*s} ${base}L${x-6*s} ${base-62*s}H${x+6*s}L${x+9*s} ${base}Z" fill="${col}"/><rect x="${x-8*s}" y="${base-72*s}" width="${16*s}" height="${10*s}" fill="${lit?"#ffd27a":"#e8eef4"}"/><path d="M${x-9*s} ${base-72*s}L${x} ${base-82*s}L${x+9*s} ${base-72*s}Z" fill="${col}"/>${lit?`<path d="M${x} ${base-67*s}L${x-80*s} ${base-90*s}L${x-80*s} ${base-50*s}Z" fill="#ffd27a" opacity=".12"/>`:""}`,
  };
  return(T[type]||T.skyline)();
}
// kariyer seviyesine göre büyüyen arena
function stadiumSVG(x,y,P,lit){
  const tc=P.team||{c1:"#c8102e",c2:"#ffffff",short:"???"};const st=P.stage;const ink=luma(tc.c1)<60?tc.c2:tc.c1;
  const sign=(t,w=96,dy=44)=>`<rect x="${x-w/2}" y="${y+dy}" width="${w}" height="16" rx="3" fill="#06090f" stroke="${ink}" stroke-opacity=".5"/><text x="${x}" y="${y+dy+12}" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="800" font-size="11" letter-spacing="1.2" fill="${ink}">${esc(t)}</text>`;
  if(st==="lise"||st==="uni"||st==="t3"){
    const w=st==="t3"?150:126;
    return`<ellipse cx="${x+8}" cy="${y+34}" rx="${w/2+10}" ry="16" fill="rgba(0,0,0,.28)"/>`+box(x-w/2,y+30,w,48,18,"#d9dde3","#b5bcc6","#c7cdd5")+`<path d="M${x-w/2} ${y-18}Q${x} ${y-56} ${x+w/2} ${y-18}L${x+w/2+18} ${y-29}Q${x+18} ${y-67} ${x-w/2+18} ${y-29}Z" fill="${tc.c1}"/><rect x="${x-w/2}" y="${y-4}" width="${w}" height="8" fill="${tc.c1}"/>`+windows(x-w/2,y+30,w,24,8,1,lit,true)+`<rect x="${x-12}" y="${y+12}" width="24" height="18" fill="#2b3240"/>`;
  }
  const big=st==="t1"||st==="euro"||st==="nba",rx=st==="nba"?104:big?98:84,ry=st==="nba"?60:big?55:46;
  let s=`<ellipse cx="${x+8}" cy="${y+10}" rx="${rx+4}" ry="${ry+2}" fill="rgba(0,0,0,.3)"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${shade(tc.c1,-25)}"/><ellipse cx="${x}" cy="${y-6}" rx="${rx}" ry="${ry-4}" fill="${tc.c1}"/>`;
  if(st==="nba"){s+=`<ellipse cx="${x}" cy="${y-10}" rx="${rx-8}" ry="${ry-12}" fill="#cfd8e3" opacity=".9"/><ellipse cx="${x}" cy="${y-14}" rx="${rx-26}" ry="${ry-26}" fill="#eef3f8"/><path d="M${x-rx+10} ${y-10}H${x+rx-10}M${x} ${y-ry+4}V${y+ry-20}" stroke="#aab6c5"/><rect x="${x-26}" y="${y-30}" width="52" height="20" rx="2" fill="#06090f"/><text x="${x}" y="${y-16}" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="11" fill="${ink}">${esc(tc.short)}</text>`}
  else{s+=`<ellipse cx="${x}" cy="${y-6}" rx="${rx-18}" ry="${ry-16}" fill="${tc.c2}"/><ellipse cx="${x}" cy="${y-6}" rx="${rx-30}" ry="${ry-24}" fill="${shade(tc.c2,-40)}"/><rect x="${x-40}" y="${y-22}" width="80" height="32" rx="3" fill="#c98f55" stroke="#fff" stroke-width="1.5"/><line x1="${x}" y1="${y-22}" x2="${x}" y2="${y+10}" stroke="#fff" stroke-width="1.2"/><circle cx="${x}" cy="${y-6}" r="7" fill="none" stroke="#fff" stroke-width="1.2"/>`}
  if(st==="euro"||st==="nba")s+=`<ellipse cx="${x}" cy="${y-6}" rx="${rx}" ry="${ry-4}" fill="none" stroke="${lit?"#7fe0ff":"#d8b25a"}" stroke-width="2.5" opacity=".9"/>`;
  [-rx+16,rx-16].forEach(o=>{s+=`<rect x="${x+o-1.5}" y="${y-ry-6}" width="3" height="42" fill="#cfd6df"/><rect x="${x+o-7}" y="${y-ry-10}" width="14" height="6" fill="#eef2f6"/>${lit?`<circle cx="${x+o}" cy="${y-ry-7}" r="24" fill="url(#glow)" opacity=".75"/>`:""}`});
  if(st==="nba"&&lit)s+=`<path d="M${x-60} ${y-ry}L${x-110} ${y-ry-120}L${x-80} ${y-ry-120}Z M${x+60} ${y-ry}L${x+110} ${y-ry-120}L${x+80} ${y-ry-120}Z" fill="#9fe7ff" opacity=".08"/>`;
  return s;
}
function homeSVG(x,y,P,lit,sty,roof){
  const h=P.housing;
  if(h==="oda")return box(x-36,y+30,62,70,14,sty.wall,shade(sty.wall,-35),roof)+windows(x-36,y+30,62,62,4,4,lit)+`<rect x="${x-36}" y="${y-8}" width="62" height="3" fill="${shade(sty.wall,-50)}"/><rect x="${x-36}" y="${y+8}" width="62" height="3" fill="${shade(sty.wall,-50)}"/>`;
  if(h==="yurt")return box(x-44,y+30,78,52,14,"#8f86b5","#6d6594","#a69ec8")+windows(x-44,y+30,78,46,6,3,lit);
  if(h==="daire")return box(x-30,y+30,54,86,14,"#a3a9b5","#7d8492","#bfc4cd")+windows(x-30,y+30,54,80,4,7,lit,true);
  if(h==="lux")return box(x-24,y+30,42,120,14,"#30425e","#22314a","#4a6286")+windows(x-24,y+30,42,114,3,12,lit,true)+`<rect x="${x-24}" y="${y-90}" width="42" height="3" fill="#d8b25a"/>`;
  if(h==="villa")return`<rect x="${x-56}" y="${y+28}" width="44" height="14" rx="5" fill="#4fc3f7" stroke="#e8eef4"/>`+box(x-50,y+30,92,36,16,"#f2efe8","#d6d1c6","#e9e4da")+windows(x-50,y+30,92,30,6,1,lit,true)+`<rect x="${x-50}" y="${y-8}" width="92" height="4" fill="#d8b25a"/>`;
  return`<rect x="${x-62}" y="${y+30}" width="40" height="12" rx="5" fill="#4fc3f7" stroke="#e8eef4"/>`+box(x-52,y+30,100,46,16,"#efe6d2","#cfc3a8","#e2d6bc")+[0,1,2,3,4].map(i=>`<rect x="${x-46+i*20}" y="${y-16}" width="5" height="46" fill="#fffaf0"/>`).join("")+`<path d="M${x-56} ${y-16}L${x-2} ${y-40}L${x+52} ${y-16}Z" fill="#d8b25a"/>`+windows(x-52,y+30,100,30,6,1,lit,true);
}
function mapSVG(P){
  const th=cityTheme(P.city),sty=STY[th.cc]||STY.TR,seed=th.seed;
  const tod=["night","evening","afternoon","morning"][clamp(P.slot,0,3)];
  const lit=tod==="evening"||tod==="night";
  const sky={morning:["#6fa8dc","#cfe3f3"],afternoon:["#d9905a","#f6d2a6"],evening:["#2f2861","#cf6f58"],night:["#050a1c","#18214a"]}[tod];
  const ground=lit?"#151b27":"#283141",blockC=lit?"#1c2433":"#323d50",road=lit?"#0b1018":"#1a212d",lane=lit?"#3a4250":"#56606f";
  const roof=lit?shade(sty.roof,-40):sty.roof,wallC=lit?shade(sty.wall,-70):sty.wall;
  const silh=lit?"#0f1730":shade(sty.roof,-10);
  const tc=P.team||{c1:"#c8102e",c2:"#fff",short:"???"};
  let g=`<svg viewBox="0 0 400 670" role="img" aria-label="${esc(P.city)} haritası" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="#fff2c4" stop-opacity=".9"/><stop offset="1" stop-color="#fff2c4" stop-opacity="0"/></radialGradient></defs>
  <rect width="400" height="160" fill="url(#sky)"/>`;
  if(tod==="night")for(let i=0;i<26;i++)g+=`<circle cx="${(i*53+seed)%400}" cy="${(i*29+seed)%80+6}" r="${i%3?.8:1.3}" fill="#fff" opacity=".8"/>`;
  else{g+=`<circle cx="${tod==="evening"?320:tod==="afternoon"?290:60+seed%60}" cy="${tod==="evening"?110:44}" r="15" fill="${tod==="evening"?"#ffb36b":"#fff4c2"}"/>`;for(let i=0;i<3;i++){const cx=(seed*(i+3))%360+20,cy=26+i*16;g+=`<ellipse cx="${cx}" cy="${cy}" rx="${22+i*6}" ry="6" fill="#fff" opacity=".35"/>`}}
  const base=th.water==="s"||th.water==="l"?124:th.water==="r"?140:154;
  // tohumlu arka siluet
  for(let i=0;i<22;i++){const x=i*19+(seed>>i)%7,h=10+((seed>>(i%13))*7+i*31)%38;g+=`<rect x="${x}" y="${base-h}" width="${14+(i%3)*3}" height="${h}" fill="${silh}" opacity=".5"/>`}
  const L=th.land,n=L.length,xs=n===1?[200]:n===2?[118+(seed%30),292-(seed%24)]:[84,206,326];
  L.forEach((k,i)=>{g+=landmarkSVG(k,xs[i],base,silh,lit,(k==="mountain"||k==="hills"?1:.9+((seed>>i)%3)*.07),seed)});
  if(th.water==="s"||th.water==="l"){g+=`<rect y="122" width="400" height="38" fill="${lit?"#0e2342":"#2f6fa6"}"/>`;for(let i=0;i<10;i++)g+=`<path d="M${i*44+6} ${132+(i%3)*8}q6 -4 12 0t12 0" stroke="#fff" stroke-opacity=".35" fill="none" stroke-width="1.5"/>`;if(lit)g+=`<rect y="122" width="400" height="38" fill="url(#glow)" opacity=".05"/>`}
  else if(th.water==="r"){g+=`<path d="M0 146 Q100 138 200 148 T400 144 V160 H0Z" fill="${lit?"#0e2342":"#2f6fa6"}"/>`}
  g+=`<rect y="158" width="400" height="512" fill="${ground}"/>`;
  [[14,170,132,96],[172,170,214,96],[14,296,132,104],[172,272,214,128],[14,426,118,96],[146,426,108,96],[268,426,118,96],[14,556,118,104],[146,556,108,104],[268,556,118,104]].forEach(([x,y,w,h])=>g+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${blockC}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" stroke="${lit?"#2a3346":"#3f4b60"}"/>`);
  [268,404,536].forEach(y=>g+=`<rect x="0" y="${y}" width="400" height="20" fill="${road}"/><line x1="0" y1="${y+10}" x2="400" y2="${y+10}" stroke="${lane}" stroke-width="1.4" stroke-dasharray="10 9"/>`);
  g+=`<rect x="150" y="158" width="20" height="512" fill="${road}"/><line x1="160" y1="158" x2="160" y2="670" stroke="${lane}" stroke-width="1.4" stroke-dasharray="10 9"/><rect x="258" y="414" width="10" height="256" fill="${road}"/>`;
  // sokak lambaları ve ağaçlar
  [[30,268],[120,268],[200,268],[300,268],[380,268],[30,404],[120,404],[220,404],[340,404],[30,536],[200,536],[330,536]].forEach(([x,y])=>{g+=`<rect x="${x-1}" y="${y-12}" width="2" height="12" fill="#6b7686"/><circle cx="${x}" cy="${y-13}" r="2" fill="${lit?"#ffd27a":"#cfd6df"}"/>${lit?`<circle cx="${x}" cy="${y-8}" r="14" fill="url(#glow)" opacity=".35"/>`:""}`});
  [[134,258],[380,262],[250,530],[140,530],[30,530],[200,664],[110,664],[380,664]].forEach(([x,y])=>g+=`<rect x="${x-1.5}" y="${y-8}" width="3" height="8" fill="#5b4636"/><circle cx="${x}" cy="${y-13}" r="7" fill="${lit?"#1f3a2a":"#3d6e4b"}"/>`);
  [[40,274,"#c0392b"],[230,282,"#d8b25a"],[330,410,"#2a9d8f"],[300,542,"#8e99a8"]].forEach(([x,y,c])=>{g+=`<rect x="${x}" y="${y}" width="22" height="10" rx="3" fill="${c}"/>`;if(lit)g+=`<circle cx="${x+24}" cy="${y+5}" r="6" fill="url(#glow)" opacity=".7"/>`});
  const B={
   okul:(x,y)=>P.studying?box(x-46,y+30,84,46,14,wallC,shade(wallC,-35),roof)+windows(x-46,y+30,84,38,6,2,lit)+`<rect x="${x-8}" y="${y+12}" width="14" height="18" fill="#3a2a1f"/><rect x="${x+26}" y="${y-42}" width="2" height="28" fill="#9aa4b2"/><rect x="${x+28}" y="${y-42}" width="16" height="10" fill="#e30a17"/><circle cx="${x+34}" cy="${y-37}" r="2.4" fill="#fff"/>`
     :box(x-30,y+30,52,94,14,"#2b3d58","#1f2d42","#40587c")+windows(x-30,y+30,52,88,4,8,lit,true)+`<rect x="${x-30}" y="${y-64}" width="52" height="3" fill="#d8b25a"/>`,
   medya:(x,y)=>box(x-38,y+30,62,42,12,"#3a4358","#2a3142","#56607a")+windows(x-38,y+30,62,36,5,2,lit,true)+`<path d="M${x+2} ${y-12}L${x-10} ${y+4}M${x+2} ${y-12}L${x+14} ${y+4}M${x+2} ${y-12}V${y-58}" stroke="#aab4c2" stroke-width="2.5"/><circle cx="${x+2}" cy="${y-60}" r="3" fill="#ff5468"/><ellipse cx="${x-22}" cy="${y-16}" rx="10" ry="6" fill="#dfe6ee" transform="rotate(-25 ${x-22} ${y-16})"/><rect x="${x-30}" y="${y+2}" width="40" height="8" fill="#06090f"/><text x="${x-10}" y="${y+9}" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="7" fill="#ff5468">● CANLI</text>`,
   ev:(x,y)=>homeSVG(x,y,P,lit,{wall:wallC},roof)+(P.car?`<g transform="translate(${x+20},${y+30}) scale(.45)">${P.car.replace(/<svg[^>]*>|<\/svg>/g,"")}</g>`:""),
   stad:(x,y)=>stadiumSVG(x,y,P,lit),
   aile:(x,y)=>box(x-34,y+30,58,36,14,wallC,shade(wallC,-35),roof)+`<path d="M${x-38} ${y-6}L${x-5} ${y-30}L${x+28} ${y-6}Z" fill="${roof}"/>`+windows(x-34,y+30,58,30,3,1,lit)+(P.city!==P.home?`<g transform="translate(${x+22},${y-40})"><circle r="11" fill="#06090f" stroke="#d8b25a"/><path d="M-6 1L6 -3L7 -1L-1 2L1 6L-1 6L-3 3L-6 3Z" fill="#fff"/></g>`:""),
   kafe:(x,y)=>box(x-38,y+30,64,32,12,wallC,shade(wallC,-35),roof)+`<path d="M${x-40} ${y-2}h68l-4 10h-60z" fill="#7a1f2b"/>${[0,1,2,3,4,5].map(i=>`<rect x="${x-38+i*11}" y="${y-2}" width="5.5" height="10" fill="#f2e6d0" opacity=".9"/>`).join("")}`+windows(x-38,y+30,64,20,3,1,lit),
   eglence:(x,y)=>box(x-38,y+30,64,42,12,"#241b3b","#19132b","#352a55")+`<rect x="${x-32}" y="${y-6}" width="52" height="14" rx="4" fill="${lit?"#ff3fa4":"#6b2f5a"}"/><text x="${x-6}" y="${y+5}" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="9" letter-spacing="1" fill="#fff">ARCADE · CLUB</text>`+windows(x-38,y+30,64,14,4,1,lit),
   avm:(x,y)=>box(x-52,y+30,92,42,14,"#cfd6de","#aab3be","#bcc5cf")+`<rect x="${x-44}" y="${y+2}" width="76" height="22" fill="${lit?"#ffe3a0":"#7fa7c9"}" opacity=".9"/><rect x="${x-24}" y="${y-8}" width="36" height="10" rx="2" fill="#141414"/><text x="${x-6}" y="${y}" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="8" letter-spacing="1" fill="#d8b25a">AVM</text>`,
   market:(x,y)=>box(x-36,y+30,60,32,12,"#e9e6df","#c9c5bc",roof)+`<path d="M${x-38} ${y-2}h64l-4 9h-56z" fill="#1f7a5c"/>`+windows(x-36,y+30,60,20,3,1,lit),
   sans:(x,y)=>box(x-38,y+30,64,44,12,"#2a1013","#1c0a0c","#3d171c")+`<rect x="${x-30}" y="${y-8}" width="48" height="16" rx="3" fill="${lit?"#ffd34d":"#a8862d"}"/><text x="${x-6}" y="${y+4}" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="10" fill="#2a1013">♠ ♥ ♦ ♣</text>`+windows(x-38,y+30,64,14,4,1,lit),
  };
  LOCS.forEach(Lc=>{const I=locInfo(Lc.id,P);const off=I.slot&&P.slot<=0;const big=Lc.id==="stad";
    const lab=I.n.toLocaleUpperCase("tr-TR"),lw=Math.max(56,lab.length*6.1+24),ly=Lc.y+(big?78:46);
    g+=`<g class="loc${off?" off":""}" data-loc="${Lc.id}" tabindex="0" role="button" aria-label="${esc(I.n)}">
      <ellipse class="hl" cx="${Lc.x}" cy="${Lc.y+8}" rx="${big?112:62}" ry="${big?70:46}" fill="#d8b25a" fill-opacity=".16"/>
      ${B[Lc.id](Lc.x,Lc.y)}
      <g transform="translate(${Lc.x},${ly})"><rect x="${-lw/2}" y="-10" width="${lw}" height="20" rx="4" fill="#06090f" fill-opacity=".9" stroke="#d8b25a" stroke-opacity=".35"/>${I.slot?`<circle cx="${-lw/2+10}" cy="0" r="3" fill="${off?"#5d6b82":"#d8b25a"}"/>`:""}<text x="${I.slot?5:0}" y="4" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="700" letter-spacing="1" font-size="11" fill="#eef2f8">${esc(lab)}</text></g>
      <rect x="${Lc.x-(big?104:56)}" y="${Lc.y-(big?70:62)}" width="${big?208:112}" height="${big?160:118}" fill="transparent"/></g>`});
  if(lit)g+=`<rect width="400" height="670" fill="${tod==="night"?"#050a24":"#2a1d55"}" opacity="${tod==="night"?.22:.1}" pointer-events="none"/>`;
  return g+"</svg>";
}
