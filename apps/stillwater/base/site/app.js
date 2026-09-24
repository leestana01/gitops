(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('scene');
  const ctx = canvas.getContext('2d', { alpha: false });
  const species = [
    { id:'crucian', name:'붕어', note:'가장 먼저 인사를 건네는 호수의 이웃.', rarity:'흔함', weight:24, min:16, max:39, color:'#b8ad86' },
    { id:'minnow', name:'피라미', note:'은빛 한 줄기가 물결 사이를 스쳐 갑니다.', rarity:'흔함', weight:22, min:7, max:18, color:'#b8c6c0' },
    { id:'carp', name:'잉어', note:'느긋한 움직임에는 오래된 호수의 시간이 묻어납니다.', rarity:'보통', weight:16, min:31, max:78, color:'#c29d77' },
    { id:'perch', name:'농어', note:'고요 속에서도 날카로운 기척을 놓치지 않습니다.', rarity:'보통', weight:14, min:23, max:61, color:'#9caf9d' },
    { id:'catfish', name:'메기', note:'깊은 곳에서 올라온, 조금은 낯선 손님.', rarity:'드묾', weight:10, min:29, max:90, color:'#8c9890' },
    { id:'trout', name:'송어', note:'차가운 물을 닮은 아름다운 무늬.', rarity:'드묾', weight:8, min:22, max:55, color:'#d2a693' },
    { id:'golden', name:'황금잉어', note:'어쩌면 호수가 아껴 두었던 작은 빛.', rarity:'희귀', weight:5, min:35, max:72, color:'#e0bd70' },
    { id:'moon', name:'달빛고기', note:'달이 물에 잠긴 밤에만 남기는 흔적.', rarity:'전설', weight:1, min:18, max:42, color:'#a8d9d6' }
  ];
  const storageKey = 'stillwater:journal:v1';
  let records = {};
  try { records = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (_) { records = {}; }
  let phase = 'idle', holding = false, progress = 0, tension = 0, dangerTime = 0, biteDeadline = 0;
  let fish = null, catchTimer = null, lastFrame = performance.now(), castAt = 0, nextRipple = 0;
  let width = 0, height = 0, dpr = 1, audioCtx = null, noiseNode = null, soundOn = false;
  const ripples = [], motes = Array.from({length:32},(_,i)=>({x:Math.random(),y:.58+Math.random()*.39,s:Math.random()*.7+.2,p:Math.random()*6.28}));
  const stars = Array.from({length:70},()=>({x:Math.random(),y:Math.random()*.52,r:Math.random()*1.15+.25,p:Math.random()*6.28}));
  const action = $('action');
  function save() { try { localStorage.setItem(storageKey, JSON.stringify(records)); } catch (_) {} }
  function setStatus(message, bite=false) { $('status').textContent=message; $('status-dot').classList.toggle('biting', bite); }
  function setAction(label, icon, disabled=false, bite=false) { $('action-text').textContent=label; $('action-icon').textContent=icon; action.disabled=disabled; action.classList.toggle('bite',bite); }
  function updateUI() {
    $('reel-ui').hidden = phase !== 'reeling';
    if (phase==='idle') { setStatus('물결이 잔잔합니다'); setAction('낚싯줄 던지기','↗'); $('instruction').textContent='버튼을 누르거나 스페이스바를 사용하세요'; }
    if (phase==='waiting') { setStatus('기다리는 중 · 물결을 바라보세요'); setAction('입질을 기다리는 중','◌',true); $('instruction').textContent='잠시 기다려 보세요'; }
    if (phase==='bite') { setStatus('입질이 왔습니다!',true); setAction('지금 당기기','↗',false,true); $('instruction').textContent='놓치기 전에 눌러주세요'; }
    if (phase==='reeling') { setStatus('천천히, 줄을 감아보세요'); setAction('누르고 줄 감기','◎'); $('instruction').textContent='계속 누르면 감기고, 떼면 긴장이 풀립니다'; }
    if (phase==='missed') { setStatus('물고기가 떠났습니다'); setAction('다시 던지기','↗'); $('instruction').textContent='호수에는 또 다른 기회가 있습니다'; }
    const total = Object.values(records).reduce((n,r)=>n+(r.count||0),0);
    $('catch-count').textContent=`발견 ${total}`;
    $('journal-badge').textContent=Object.keys(records).filter(id=>records[id]?.count).length;
  }
  function chooseFish() {
    const roll=Math.random()*species.reduce((a,s)=>a+s.weight,0); let n=0;
    for(const s of species){ n+=s.weight; if(roll<n) return s; }
    return species[0];
  }
  function addRipple(x,y,power=1) { ripples.push({x,y,age:0,power}); if(ripples.length>30) ripples.shift(); }
  function cast() {
    clearTimeout(catchTimer); phase='waiting'; holding=false; progress=0; tension=0; dangerTime=0; castAt=performance.now();
    addRipple(.56,.675,2); playTone(410,.13,'sine',.045); setTimeout(()=>playTone(290,.18,'sine',.045),120);
    catchTimer=setTimeout(bite, 3000+Math.random()*4100); updateUI();
  }
  function bite() {
    if(phase!=='waiting') return;
    fish=chooseFish(); phase='bite'; biteDeadline=performance.now()+2900; addRipple(.56,.675,2.7); playTone(680,.13,'sine',.07); setTimeout(()=>playTone(890,.18,'sine',.07),120); updateUI();
    catchTimer=setTimeout(()=>{ if(phase==='bite') miss(); },2900);
  }
  function hook() { if(phase!=='bite') return; clearTimeout(catchTimer); phase='reeling'; progress=0; tension=19; dangerTime=0; addRipple(.56,.675,2); playTone(520,.2,'triangle',.04); updateUI(); }
  function miss() { clearTimeout(catchTimer); phase='missed'; holding=false; addRipple(.56,.675,2); playTone(240,.3,'sine',.04); updateUI(); }
  function catchFish() {
    phase='caught'; holding=false; clearTimeout(catchTimer); const size=Math.round((fish.min+Math.random()*(fish.max-fish.min))*10)/10;
    const old=records[fish.id]||{count:0,best:0}; const first=old.count===0;
    records[fish.id]={count:old.count+1,best:Math.max(old.best,size)}; save(); renderJournal(); updateUI();
    $('catch-kicker').textContent=first?'새로운 발견':'다시 만난 물고기'; $('catch-title').textContent=fish.name; $('catch-description').textContent=fish.note;
    $('catch-size').textContent=`${size.toFixed(1)} cm`; $('catch-rarity').textContent=fish.rarity; $('fish-art').innerHTML=fishSvg(fish.color);
    $('catch-overlay').hidden=false; $('catch-close').focus(); playTone(620,.19,'sine',.055); setTimeout(()=>playTone(820,.3,'sine',.05),130);
  }
  function fishSvg(color) { return `<svg viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fishbody" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#f0e5cc"/><stop offset=".44" stop-color="${color}"/><stop offset="1" stop-color="#607b7c"/></linearGradient></defs><path d="M53 73Q20 46 15 43Q25 76 15 105Q39 94 54 78Z" fill="${color}" stroke="#e8ddc9" stroke-opacity=".65"/><path d="M121 48Q132 21 155 12Q165 30 167 46M136 93Q160 108 167 126Q177 100 172 92" fill="${color}" stroke="#e8ddc9" stroke-opacity=".65" stroke-width="2"/><path d="M47 73Q89 27 177 42Q225 48 260 69Q223 99 165 101Q91 106 47 73Z" fill="url(#fishbody)" stroke="#e8ddc9" stroke-opacity=".75" stroke-width="2"/><path d="M197 48Q178 72 199 91M73 76Q120 90 174 79" fill="none" stroke="#f8efdb" stroke-opacity=".4" stroke-width="2"/><circle cx="227" cy="65" r="4" fill="#283940"/><circle cx="228" cy="64" r="1" fill="#fff"/><path d="M252 75q8 4 13 0" fill="none" stroke="#384b4b" stroke-width="2" stroke-linecap="round"/></svg>`; }
  function renderJournal() {
    const total=Object.values(records).reduce((n,r)=>n+(r.count||0),0), seen=species.filter(s=>records[s.id]?.count).length;
    $('total-catches').textContent=total; $('species-count').textContent=`${seen} / ${species.length}`;
    $('species-list').innerHTML=species.map(s=>{const r=records[s.id];return `<div class="species-row ${r?'':'locked'}"><div class="species-mark">${r?'◈':'?'}</div><div class="species-text"><strong>${r?s.name:'아직 만나지 못함'}</strong><small>${r?`최대 ${r.best.toFixed(1)} cm · ${s.rarity}`:'호수 어딘가에 있습니다'}</small></div><span class="species-count">${r?`${r.count}마리`:''}</span></div>`}).join('');
  }
  function openJournal() { $('scrim').hidden=false; $('journal').classList.add('open'); $('journal').setAttribute('aria-hidden','false'); $('journal-close').focus(); }
  function closeJournal() { $('journal').classList.remove('open'); $('journal').setAttribute('aria-hidden','true'); $('scrim').hidden=true; $('journal-open').focus(); }
  function createAudio() {
    if(audioCtx) return;
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    audioCtx=new AC(); const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate), data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i]=Math.random()*2-1;
    const source=audioCtx.createBufferSource();source.buffer=buffer;source.loop=true;
    const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=230;
    const gain=audioCtx.createGain();gain.gain.value=.018;source.connect(filter).connect(gain).connect(audioCtx.destination);source.start();noiseNode=gain;
  }
  function playTone(freq,duration,type='sine',volume=.05) {
    if(!soundOn) return; createAudio(); if(!audioCtx) return; audioCtx.resume();
    const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),now=audioCtx.currentTime;
    osc.type=type;osc.frequency.setValueAtTime(freq,now);osc.frequency.exponentialRampToValueAtTime(Math.max(80,freq*.65),now+duration);
    gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.018);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    osc.connect(gain).connect(audioCtx.destination);osc.start(now);osc.stop(now+duration+.02);
  }
  function toggleSound(){ soundOn=!soundOn; if(soundOn){createAudio();audioCtx?.resume();playTone(460,.16,'sine',.035);}else if(audioCtx){audioCtx.suspend();} $('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'소리 끄기':'소리 켜기');$('sound').title=soundOn?'소리 끄기':'소리 켜기'; }
  function resize(){ const rect=canvas.getBoundingClientRect(); width=rect.width;height=rect.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0); }
  function hill(y,amp,color,seed){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,height);ctx.lineTo(0,y+Math.sin(seed)*amp);for(let x=0;x<=width+10;x+=10){let t=x/width;ctx.lineTo(x,y+Math.sin(t*6+seed)*amp+Math.sin(t*13+seed*2)*amp*.32+Math.sin(t*22+seed*3)*amp*.12)}ctx.lineTo(width,height);ctx.closePath();ctx.fill();}
  function drawPine(x,y,size,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='#10232a';ctx.lineWidth=Math.max(1,size*.05);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-size);ctx.stroke();ctx.fillStyle='#112b30';for(let i=0;i<4;i++){const by=y-size*.22-i*size*.18,w=size*(.27-i*.037);ctx.beginPath();ctx.moveTo(x,by-size*.35);ctx.lineTo(x-w,by+size*.1);ctx.quadraticCurveTo(x,by-size*.015,x+w,by+size*.1);ctx.closePath();ctx.fill();}ctx.restore();}
  function drawScene(now){
    const w=width,h=height,hy=h*.565,t=now*.001;
    let sky=ctx.createLinearGradient(0,0,0,hy);sky.addColorStop(0,'#101c2a');sky.addColorStop(.43,'#334b59');sky.addColorStop(.75,'#6e7773');sky.addColorStop(1,'#b3987e');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    let glow=ctx.createRadialGradient(w*.66,h*.34,8,w*.66,h*.34,w*.44);glow.addColorStop(0,'#e3b7974d');glow.addColorStop(1,'#e3b79700');ctx.fillStyle=glow;ctx.fillRect(0,0,w,hy);
    for(const s of stars){const a=Math.max(0,.37+s.r*.14+Math.sin(t*.8+s.p)*.18);ctx.fillStyle=`rgba(238,231,213,${a})`;ctx.beginPath();ctx.arc(w*s.x,h*s.y,s.r,0,7);ctx.fill();}
    let mx=w*.71,my=h*.22,moonR=Math.max(16,Math.min(w,h)*.027);let halo=ctx.createRadialGradient(mx,my,moonR*.4,mx,my,moonR*6);halo.addColorStop(0,'#f7dcb57a');halo.addColorStop(.28,'#f7dcb525');halo.addColorStop(1,'#f7dcb500');ctx.fillStyle=halo;ctx.fillRect(mx-moonR*6,my-moonR*6,moonR*12,moonR*12);ctx.fillStyle='#eee0c2';ctx.beginPath();ctx.arc(mx,my,moonR,0,7);ctx.fill();
    hill(hy-35,h*.075,'#334d53',1.7);hill(hy-10,h*.055,'#263f46',3.8);hill(hy+8,h*.036,'#1b363e',5.3);
    const water=ctx.createLinearGradient(0,hy,0,h);water.addColorStop(0,'#294750');water.addColorStop(.4,'#193540');water.addColorStop(1,'#0b1d28');ctx.fillStyle=water;ctx.fillRect(0,hy,w,h-hy);
    let reflection=ctx.createLinearGradient(0,hy,0,h);reflection.addColorStop(0,'#e5b6973b');reflection.addColorStop(.32,'#e3b7931b');reflection.addColorStop(1,'#e3b79300');ctx.fillStyle=reflection;ctx.beginPath();ctx.moveTo(w*.62,hy);ctx.lineTo(w*.76,hy);ctx.lineTo(w*.89,h);ctx.lineTo(w*.43,h);ctx.fill();
    const lineCount=Math.min(260,Math.round(h*.28));for(let i=0;i<lineCount;i++){let y=hy+(i+.5)/(lineCount)* (h-hy),p=(y-hy)/(h-hy),offset=Math.sin(i*9.23+t*.36)*w*.035;let x=w*(.69+offset/w);let len=(.012+p*.08)*w*(.3+.7*Math.abs(Math.sin(i*13.4+t*.7)));ctx.strokeStyle=`rgba(234,201,169,${(.16*(1-p))*(.45+.55*Math.sin(i*4.8+t)**2)})`;ctx.lineWidth=p*1.5+.3;ctx.beginPath();ctx.moveTo(x-len/2,y);ctx.lineTo(x+len/2,y);ctx.stroke();}
    for(let i=0;i<95;i++){let x=((i*127.17)%w),y=hy+(i*37.7)%(h-hy),len=8+(i*11)%34;ctx.strokeStyle=`rgba(185,207,197,${.015+.027*(Math.sin(i*7+t*.5)**2)})`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x+Math.sin(t+i)*2,y);ctx.lineTo(x+len,y);ctx.stroke();}
    // Distant shoreline and trees
    ctx.fillStyle='#142e34';ctx.beginPath();ctx.moveTo(0,hy+2);for(let x=0;x<=w;x+=8){let y=hy-6-Math.sin(x/w*11+1)*4;ctx.lineTo(x,y)}ctx.lineTo(w,hy+13);ctx.lineTo(0,hy+13);ctx.fill();
    for(let i=0;i<34;i++){let x=(i/33)*w,y=hy-1,size=h*(.025+((i*17)%9)*.003);if(x>w*.37&&x<w*.8)size*=.55;drawPine(x,y,size,.72)}
    // Foreground banks
    ctx.fillStyle='#081c24';ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,hy-5);ctx.bezierCurveTo(w*.06,hy+25,w*.09,hy+55,w*.12,h);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(w,h);ctx.lineTo(w,hy-8);ctx.bezierCurveTo(w*.94,hy+18,w*.91,hy+55,w*.89,h);ctx.closePath();ctx.fill();
    for(let i=0;i<7;i++){drawPine(w*(.015+i*.019),hy+h*(.018+i*.014),h*(.14+(i%3)*.04),.92);drawPine(w*(.91+i*.015),hy+h*(.026+i*.01),h*(.13+(i%4)*.035),.9)}
    // Pier and a quiet fishing silhouette
    ctx.fillStyle='#0a1b22';ctx.beginPath();ctx.moveTo(w*.79,h);ctx.lineTo(w*.78,h*.83);ctx.lineTo(w,h*.82);ctx.lineTo(w,h);ctx.fill();
    ctx.strokeStyle='#081820';ctx.lineWidth=Math.max(5,w*.006);for(let x=w*.83;x<w;x+=w*.055){ctx.beginPath();ctx.moveTo(x,h*.82);ctx.lineTo(x+5,h);ctx.stroke()}
    const personX=w*.86,personY=h*.786,scale=Math.min(w/1250,h/750,1.3);ctx.save();ctx.translate(personX,personY);ctx.scale(scale,scale);ctx.fillStyle='#0a171e';ctx.beginPath();ctx.ellipse(0,-47,12,14,0,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(-11,-32);ctx.quadraticCurveTo(-20,-6,-15,21);ctx.lineTo(26,23);ctx.lineTo(19,-20);ctx.quadraticCurveTo(10,-36,-11,-32);ctx.fill();ctx.strokeStyle='#0a171e';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-2,-10);ctx.lineTo(-33,5);ctx.lineTo(-48,-19);ctx.stroke();ctx.beginPath();ctx.moveTo(10,14);ctx.lineTo(38,35);ctx.lineTo(55,38);ctx.moveTo(-2,17);ctx.lineTo(-23,39);ctx.stroke();ctx.restore();
    const tipX=w*.665,tipY=h*.425,rodX=personX-48*scale,rodY=personY-19*scale;ctx.strokeStyle='#182227';ctx.lineWidth=Math.max(2,3*scale);ctx.beginPath();ctx.moveTo(rodX,rodY);ctx.quadraticCurveTo(w*.74,h*.58,tipX,tipY);ctx.stroke();ctx.strokeStyle='#ae9f88';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(rodX,rodY);ctx.quadraticCurveTo(w*.74,h*.58,tipX,tipY);ctx.stroke();
    if(phase!=='idle'&&phase!=='missed'){let q=Math.min(1,(now-castAt)/750),bx=w*(.665+(.56-.665)*q),by=h*(.425+(.675-.425)*q);if(phase==='reeling'){bx+=Math.sin(t*11)*3;by+=Math.sin(t*8)*3}ctx.strokeStyle='#e4d8b18c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tipX,tipY);ctx.quadraticCurveTo(w*.68,h*.6,bx,by);ctx.stroke();ctx.fillStyle=phase==='bite'?'#f3b98d':'#dec9a1';ctx.beginPath();ctx.ellipse(bx,by,3.5,6,Math.sin(t*3)*.15,0,7);ctx.fill();}
    for(const r of ripples){let a=Math.max(0,1-r.age/2.1),rx=(12+r.age*39)*r.power;ctx.strokeStyle=`rgba(193,211,197,${a*.36})`;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(r.x*w,r.y*h,rx,rx*.2,0,0,7);ctx.stroke();}
    for(const m of motes){let x=m.x*w+Math.sin(t*.4+m.p)*14,y=m.y*h+Math.sin(t*.7+m.p)*5;ctx.fillStyle=`rgba(204,219,200,${.13*m.s*(1+Math.sin(t*1.3+m.p))})`;ctx.beginPath();ctx.arc(x,y,1.1*m.s,0,7);ctx.fill();}
  }
  function frame(now){const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
    if(phase==='reeling'){
      if(holding){progress=Math.min(100,progress+dt*(tension>75?8.5:13.2));tension=Math.min(100,tension+dt*19.5);}else{tension=Math.max(0,tension-dt*27);progress=Math.max(0,progress-dt*1.3)}
      dangerTime=tension>88?dangerTime+dt:Math.max(0,dangerTime-dt*.6);
      $('progress-fill').style.width=`${progress}%`;$('tension-fill').style.width=`${tension}%`;$('reel-percent').textContent=`${Math.floor(progress)}%`;
      $('tension-fill').style.background=tension>83?'#dc8f76':'#a8c9b6';$('tension-hint').textContent=tension>83?'줄이 끊어질 것 같아요':'누르고 떼며 조절하세요';
      if(dangerTime>1.15)miss(); else if(progress>=100)catchFish();
    }
    if((phase==='waiting'||phase==='bite'||phase==='reeling')&&now>nextRipple){addRipple(.56,.675,phase==='bite'?1.5:.75);nextRipple=now+(phase==='bite'?300:900+Math.random()*600)}
    for(let i=ripples.length-1;i>=0;i--){ripples[i].age+=dt;if(ripples[i].age>2.1)ripples.splice(i,1)}
    drawScene(now);requestAnimationFrame(frame);
  }
  action.addEventListener('click',()=>{if(phase==='idle'||phase==='missed')cast();else if(phase==='bite')hook();});
  action.addEventListener('pointerdown',e=>{if(phase==='reeling'){holding=true;action.setPointerCapture(e.pointerId);e.preventDefault();}});
  action.addEventListener('pointerup',()=>holding=false);action.addEventListener('pointercancel',()=>holding=false);
  window.addEventListener('pointerup',()=>holding=false);
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&phase==='reeling'){e.preventDefault();holding=true}else if(e.code==='Space'&&!e.repeat&&!['BUTTON','INPUT'].includes(document.activeElement?.tagName)){e.preventDefault();if(phase==='idle'||phase==='missed')cast();else if(phase==='bite')hook()}if(e.key==='Escape'){if(!$('catch-overlay').hidden)$('catch-close').click();else if($('journal').classList.contains('open'))closeJournal();}});
  document.addEventListener('keyup',e=>{if(e.code==='Space')holding=false});
  window.addEventListener('blur',()=>holding=false);
  $('journal-open').addEventListener('click',()=>{renderJournal();openJournal()});$('journal-close').addEventListener('click',closeJournal);$('scrim').addEventListener('click',closeJournal);
  $('catch-close').addEventListener('click',()=>{$('catch-overlay').hidden=true;phase='idle';fish=null;updateUI();action.focus()});
  $('sound').addEventListener('click',toggleSound);
  window.addEventListener('resize',resize);resize();renderJournal();updateUI();requestAnimationFrame(frame);
})();
