import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out="preview/hokm/assets/cards";
await mkdir(out,{recursive:true});
const suits=[
 {s:"♠",name:"spade",a:"#13c9ff",b:"#0752b8",c:"#b9faff",base:"#031b43"},
 {s:"♥",name:"heart",a:"#ff3c91",b:"#9d1458",c:"#ffd4eb",base:"#350927"},
 {s:"♣",name:"club",a:"#19d8ff",b:"#0754a7",c:"#c5fbff",base:"#031d43"},
 {s:"♦",name:"diamond",a:"#ff4c9e",b:"#9c1d68",c:"#ffd2ed",base:"#360a2d"}
];
const ranks=["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
function rng(seed){let x=seed>>>0;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};}
for(let si=0;si<suits.length;si++) for(let ri=0;ri<ranks.length;ri++){
 const suit=suits[si],rank=ranks[ri],random=rng((si+1)*1009+(ri+1)*7919);
 const shards=Array.from({length:54},(_,i)=>{
   const x=random()*440,y=random()*640,w=18+random()*100,h=16+random()*95;
   const points=`${x},${y} ${x+w},${y+h*.18} ${x+w*.52},${y+h} ${x-w*.25},${y+h*.55}`;
   const op=(.035+random()*.13).toFixed(3);
   return `<polygon points="${points}" fill="${i%3===0?suit.a:i%3===1?suit.b:"#75cfff"}" opacity="${op}"/>`;
 }).join("");
 const streaks=Array.from({length:22},()=>{const x=random()*440,y=random()*640;return `<path d="M${x} ${y} l${(random()-.5)*180} ${(random()-.5)*230}" stroke="${suit.c}" stroke-opacity=".23" stroke-width="${.5+random()*2}"/>`;}).join("");
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="440" height="640" viewBox="0 0 440 640">
 <defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${suit.base}"/><stop offset=".48" stop-color="#06152f"/><stop offset="1" stop-color="${suit.b}"/></linearGradient>
  <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".25" stop-color="${suit.a}"/><stop offset=".7" stop-color="${suit.b}"/><stop offset="1" stop-color="${suit.c}"/></linearGradient>
  <radialGradient id="shine"><stop stop-color="${suit.a}" stop-opacity=".42"/><stop offset=".58" stop-color="${suit.b}" stop-opacity=".1"/><stop offset="1" stop-color="#020817" stop-opacity="0"/></radialGradient>
  <filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="spark" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="clip"><rect x="18" y="18" width="404" height="604" rx="27"/></clipPath>
 </defs>
 <rect x="5" y="5" width="430" height="630" rx="38" fill="#020611" stroke="${suit.a}" stroke-width="5" filter="url(#glow)"/>
 <g clip-path="url(#clip)">
  <rect x="18" y="18" width="404" height="604" fill="url(#bg)"/>
  <rect x="18" y="18" width="404" height="604" fill="url(#shine)"/>
  ${shards}${streaks}
  <path d="M20 180 L160 18 M20 330 L330 18 M65 620 L422 230 M180 622 L422 390 M20 490 L300 620" stroke="${suit.a}" stroke-opacity=".28" stroke-width="2" fill="none"/>
  <g fill="${suit.c}" filter="url(#spark)"><circle cx="75" cy="210" r="2.5"/><circle cx="360" cy="120" r="2"/><circle cx="330" cy="500" r="2.5"/><circle cx="110" cy="555" r="2"/><circle cx="220" cy="280" r="2.5"/></g>
 </g>
 <rect x="8" y="8" width="424" height="624" rx="34" fill="none" stroke="url(#rim)" stroke-width="5" filter="url(#glow)"/>
 <rect x="19" y="19" width="402" height="602" rx="26" fill="none" stroke="#efffff" stroke-opacity=".85" stroke-width="2"/>
 <rect x="27" y="27" width="386" height="586" rx="22" fill="none" stroke="${suit.a}" stroke-opacity=".7" stroke-width="1.5"/>

 <g font-family="Georgia,serif" font-weight="bold" fill="#f4fdff" stroke="${suit.a}" stroke-width="1.3" paint-order="stroke" filter="url(#spark)">
  <text x="43" y="92" font-size="68">${rank}</text><text x="45" y="145" font-size="46">${suit.s}</text>
  <g transform="rotate(180 220 320)"><text x="43" y="104" font-size="68">${rank}</text><text x="45" y="157" font-size="46">${suit.s}</text></g>
 </g>
 <text x="220" y="420" text-anchor="middle" font-size="248" font-family="serif" fill="${suit.a}" stroke="#fff" stroke-width="2.5" stroke-opacity=".9" filter="url(#glow)">${suit.s}</text>
 <text x="220" y="420" text-anchor="middle" font-size="248" font-family="serif" fill="${suit.c}" opacity=".3">${suit.s}</text>
 <path d="M42 174 L120 112 L168 148 M398 466 L320 528 L272 492 M42 466 L108 520 M398 174 L332 120" fill="none" stroke="${suit.c}" stroke-opacity=".32" stroke-width="2"/>
 </svg>`;
 const file=join(tmpdir(),`sinx-${suit.name}-${rank}.svg`);
 await writeFile(file,svg);
 execFileSync("convert",[file,"-resize","440x640","-quality","86",join(out,`${suit.s}-${rank}.webp`)]);
}
console.log("Generated 52 crystalline neon SINX card WebP assets.");
