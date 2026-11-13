import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
const out="preview/hokm/assets/cards"; await mkdir(out,{recursive:true});
const suits=[{s:"♠",name:"spade",a:"#43e8ff",b:"#1555b9",c:"#b9faff"},{s:"♣",name:"club",a:"#54ffd0",b:"#087c79",c:"#c5fff0"},{s:"♦",name:"diamond",a:"#ff73c6",b:"#8d246d",c:"#ffd0ed"},{s:"♥",name:"heart",a:"#ff6c9d",b:"#9b234d",c:"#ffd1e2"}];
const ranks=["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
for(const suit of suits) for(let i=0;i<ranks.length;i++){
 const rank=ranks[i],file=join(tmpdir(),`sinx-${suit.name}-${rank}.svg`);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="440" height="640" viewBox="0 0 440 640"><defs>
 <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eaffff" stop-opacity=".65"/><stop offset=".18" stop-color="${suit.a}" stop-opacity=".2"/><stop offset=".55" stop-color="#07172e" stop-opacity=".88"/><stop offset=".82" stop-color="${suit.b}" stop-opacity=".42"/><stop offset="1" stop-color="#eaffff" stop-opacity=".4"/></linearGradient>
 <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".25" stop-color="${suit.a}"/><stop offset=".6" stop-color="#9b7cff"/><stop offset="1" stop-color="${suit.c}"/></linearGradient>
 <radialGradient id="core"><stop stop-color="${suit.a}" stop-opacity=".5"/><stop offset=".55" stop-color="${suit.b}" stop-opacity=".18"/><stop offset="1" stop-color="#061326" stop-opacity=".1"/></radialGradient>
 <filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 <filter id="soft"><feGaussianBlur stdDeviation="3"/></filter>
 </defs>
 <rect x="8" y="8" width="424" height="624" rx="34" fill="#061326" stroke="${suit.a}" stroke-width="7" opacity=".98"/>
 <rect x="18" y="18" width="404" height="604" rx="27" fill="url(#glass)" stroke="url(#edge)" stroke-width="5"/>
 <rect x="30" y="30" width="380" height="580" rx="21" fill="url(#core)" stroke="#e9ffff" stroke-opacity=".52" stroke-width="1.5"/>
 <path d="M44 175 Q48 45 160 42 L280 42 Q392 45 396 175 L396 465 Q392 590 280 598 L160 598 Q48 590 44 465Z" fill="none" stroke="${suit.a}" stroke-opacity=".55" stroke-width="2"/>
 <path d="M48 78 L105 35 L220 35 L335 35 L392 78 M48 562 L105 605 L220 605 L335 605 L392 562" fill="none" stroke="url(#edge)" stroke-width="3"/>
 <g fill="none" stroke="${suit.a}" stroke-width="3" opacity=".8"><path d="M54 140 Q105 90 145 140 Q105 190 54 140Z"/><path d="M386 140 Q335 90 295 140 Q335 190 386 140Z"/><path d="M54 500 Q105 450 145 500 Q105 550 54 500Z"/><path d="M386 500 Q335 450 295 500 Q335 550 386 500Z"/></g>
 <g fill="${suit.c}" opacity=".9" filter="url(#glow)"><circle cx="220" cy="72" r="5"/><circle cx="220" cy="568" r="5"/><circle cx="48" cy="320" r="3"/><circle cx="392" cy="320" r="3"/></g>
 <path d="M65 230 Q220 100 375 230 M65 410 Q220 540 375 410" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2"/>
 <g font-family="Georgia,serif" font-weight="bold" fill="#f4fdff" stroke="${suit.a}" stroke-width="1.2" paint-order="stroke" filter="url(#glow)"><text x="53" y="100" font-size="50">${rank}</text><text x="53" y="142" font-size="42">${suit.s}</text><text x="387" y="540" font-size="50" text-anchor="end" transform="rotate(180 387 540)">${rank}</text><text x="387" y="498" font-size="42" text-anchor="end" transform="rotate(180 387 498)">${suit.s}</text></g>
 <text x="220" y="395" text-anchor="middle" font-size="230" font-family="serif" fill="${suit.a}" stroke="#fff" stroke-opacity=".85" stroke-width="2" filter="url(#glow)">${suit.s}</text>
 <text x="220" y="395" text-anchor="middle" font-size="230" font-family="serif" fill="${suit.c}" opacity=".25">${suit.s}</text>
 <path d="M80 220 Q220 170 360 220" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="5" filter="url(#soft)"/>
 </svg>`;
 await writeFile(file,svg);
 execFileSync("convert",[file,"-resize","440x640","-quality","82",join(out,`${suit.s}-${rank}.webp`)]);
}
console.log("Generated 52 optimized SINX glass-card WebP assets.");
