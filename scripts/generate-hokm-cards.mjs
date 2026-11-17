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
const pipLayouts={
 "2":[[220,270],[220,500]],
 "3":[[220,265],[220,385],[220,505]],
 "4":[[125,270],[315,270],[125,500],[315,500]],
 "5":[[125,270],[315,270],[220,385],[125,500],[315,500]],
 "6":[[125,260],[315,260],[125,385],[315,385],[125,510],[315,510]],
 "7":[[125,250],[315,250],[125,365],[315,365],[220,385],[125,520],[315,520]],
 "8":[[125,250],[315,250],[125,345],[315,345],[125,440],[315,440],[125,535],[315,535]],
 "9":[[125,235],[315,235],[125,330],[315,330],[220,385],[125,440],[315,440],[125,535],[315,535]],
 "10":[[125,235],[315,235],[125,310],[315,310],[125,385],[315,385],[125,460],[315,460],[125,535],[315,535]]
};
function pipMarkup(rank,suit){
 const points=pipLayouts[rank];
 if(points)return points.map(([x,y])=>{y-=65;const scale=rank==="10" ? .78 : rank==="9" ? .82 : .9;const fs=64*scale;return `<g transform="translate(${x} ${y})"><text text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-family="serif" fill="${suit.a}" stroke="#ffffff" stroke-width="1.3" stroke-opacity=".8" paint-order="stroke" filter="url(#glow)">${suit.s}</text><text text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-family="serif" fill="${suit.c}" opacity=".24">${suit.s}</text></g>`;}).join("");
 if(rank==="A")return `<g filter="url(#glow)"><circle cx="220" cy="320" r="132" fill="${suit.base}" fill-opacity=".48" stroke="${suit.a}" stroke-width="4"/><circle cx="220" cy="320" r="113" fill="none" stroke="${suit.c}" stroke-opacity=".62" stroke-width="2" stroke-dasharray="6 8"/><circle cx="220" cy="320" r="96" fill="${suit.b}" fill-opacity=".24"/><text x="220" y="365" text-anchor="middle" font-size="224" font-family="serif" fill="${suit.a}" stroke="#fff" stroke-width="2.5" stroke-opacity=".95" paint-order="stroke">${suit.s}</text></g>`;
 if(!["K","Q","J"].includes(rank))return "";
 const king=rank==="K",queen=rank==="Q";
 const crown=king
  ? `<path d="M151 169 L164 111 L194 151 L220 91 L246 151 L276 111 L289 169 L273 188 H167 Z" fill="${suit.a}" stroke="${suit.c}" stroke-width="5" stroke-linejoin="round"/><path d="M165 173 H275" stroke="${suit.c}" stroke-width="5"/><circle cx="164" cy="111" r="7" fill="#fff"/><circle cx="220" cy="91" r="8" fill="#fff"/><circle cx="276" cy="111" r="7" fill="#fff"/>`
  : queen
  ? `<path d="M151 170 L166 117 L194 151 L220 96 L246 151 L274 117 L289 170 Q220 195 151 170 Z" fill="${suit.b}" stroke="${suit.c}" stroke-width="5" stroke-linejoin="round"/><circle cx="166" cy="117" r="7" fill="${suit.c}"/><circle cx="220" cy="96" r="8" fill="${suit.c}"/><circle cx="274" cy="117" r="7" fill="${suit.c}"/>`
  : `<path d="M166 171 Q137 126 165 91 Q193 112 220 76 Q247 112 275 91 Q303 126 274 171 Z" fill="${suit.b}" stroke="${suit.c}" stroke-width="5"/><path d="M220 80 Q236 35 275 42 Q256 70 232 112" fill="none" stroke="${suit.a}" stroke-width="11" stroke-linecap="round"/><path d="M220 80 Q205 39 174 47 Q190 73 208 112" fill="none" stroke="${suit.c}" stroke-width="7" stroke-linecap="round"/>`;
 const hair=queen
  ? `<path d="M153 186 Q133 205 145 270 L165 300 L176 257 L264 257 L275 300 L295 270 Q307 205 287 186 L270 220 H170 Z" fill="${suit.b}" stroke="${suit.a}" stroke-width="5"/>`
  : king
  ? `<path d="M157 192 Q165 155 220 153 Q275 155 283 192 L267 226 H173 Z" fill="${suit.b}" stroke="${suit.a}" stroke-width="5"/>`
  : `<path d="M158 186 Q172 150 220 151 Q268 150 282 186 L267 222 H173 Z" fill="${suit.b}" stroke="${suit.a}" stroke-width="5"/>`;
 const beard=king
  ? `<path d="M174 242 Q220 263 266 242 L255 284 L220 304 L185 284 Z" fill="${suit.b}" stroke="${suit.c}" stroke-width="3"/>`
  : "";
 const weapon=king
  ? `<path d="M116 205 L137 184 L151 199 L130 220 L128 288" fill="none" stroke="${suit.c}" stroke-width="7" stroke-linecap="round"/><path d="M111 201 L145 167" stroke="${suit.a}" stroke-width="9" stroke-linecap="round"/>`
  : queen
  ? `<path d="M300 219 Q330 190 342 218 Q327 245 300 244 Z" fill="${suit.a}" stroke="${suit.c}" stroke-width="3"/><path d="M300 235 Q280 265 300 280" fill="none" stroke="${suit.c}" stroke-width="4"/>`
  : `<path d="M300 186 L321 164 L342 186 L321 208 Z" fill="${suit.a}" stroke="${suit.c}" stroke-width="4"/><path d="M321 208 L321 295" stroke="${suit.c}" stroke-width="6"/>`;
 const portrait=`<g stroke-linejoin="round">
  ${weapon}
  <path d="M143 316 Q146 270 173 257 L190 247 H250 L267 257 Q294 270 297 316 Z" fill="${suit.b}" stroke="${suit.a}" stroke-width="6"/>
  <path d="M175 263 L220 294 L265 263 L254 316 H186 Z" fill="${suit.base}" stroke="${suit.c}" stroke-width="3"/>
  <path d="M194 248 L220 274 L246 248" fill="none" stroke="${suit.c}" stroke-width="4"/>
  <path d="M208 250 L220 269 L232 250" fill="${suit.a}" stroke="${suit.c}" stroke-width="2"/>
  ${hair}
  <ellipse cx="220" cy="213" rx="57" ry="67" fill="${suit.c}" stroke="${suit.a}" stroke-width="5"/>
  <path d="M171 198 Q187 173 220 174 Q253 173 269 198 L260 178 Q220 151 180 178 Z" fill="${suit.b}" stroke="${suit.a}" stroke-width="4"/>
  <path d="M191 211 Q201 204 210 211 M230 211 Q239 204 249 211" fill="none" stroke="${suit.base}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="202" cy="214" r="4" fill="${suit.base}"/><circle cx="238" cy="214" r="4" fill="${suit.base}"/>
  <path d="M220 216 L214 236 L224 238" fill="none" stroke="${suit.b}" stroke-width="3" stroke-linecap="round"/>
  <path d="M205 249 Q220 258 235 249" fill="none" stroke="${suit.base}" stroke-width="3" stroke-linecap="round"/>
  ${beard}
  ${crown}
  <path d="M220 286 L236 302 L220 318 L204 302 Z" fill="${suit.a}" stroke="${suit.c}" stroke-width="3"/>
  <text x="220" y="309" text-anchor="middle" font-size="21" font-family="serif" fill="#fff">${suit.s}</text>
 </g>`;
 return `<g filter="url(#glow)"><g>${portrait}</g><g transform="rotate(180 220 320)">${portrait}</g><path d="M95 320 H345" stroke="${suit.c}" stroke-opacity=".35" stroke-width="2" stroke-dasharray="5 10"/></g>`;
}

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
  <g transform="rotate(180 220 320)"><text x="43" y="92" font-size="60">${rank}</text><text x="45" y="145" font-size="40">${suit.s}</text></g>
 </g>
 ${pipMarkup(rank,suit)}
 <path d="M42 174 L120 112 L168 148 M398 466 L320 528 L272 492 M42 466 L108 520 M398 174 L332 120" fill="none" stroke="${suit.c}" stroke-opacity=".32" stroke-width="2"/>
 </svg>`;
 const file=join(tmpdir(),`sinx-${suit.name}-${rank}.svg`);
 await writeFile(file,svg);
 execFileSync("convert",[file,"-resize","440x640","-quality","86",join(out,`${suit.s}-${rank}.webp`)]);
}
console.log("Generated 52 crystalline neon SINX card WebP assets.");
