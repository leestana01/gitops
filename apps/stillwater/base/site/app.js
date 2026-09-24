(() => {
  'use strict';
  const $=id=>document.getElementById(id), canvas=$('scene'), ctx=canvas.getContext('2d',{alpha:false});
  const species=[
    {id:'crucian',name:'붕어',rarity:'흔함',weight:25,min:16,max:39},
    {id:'minnow',name:'피라미',rarity:'흔함',weight:23,min:7,max:18},
    {id:'carp',name:'잉어',rarity:'보통',weight:18,min:31,max:78},
    {id:'perch',name:'농어',rarity:'보통',weight:14,min:23,max:61},
    {id:'catfish',name:'메기',rarity:'드묾',weight:10,min:29,max:90},
    {id:'trout',name:'송어',rarity:'드묾',weight:7,min:22,max:55},
    {id:'golden',name:'황금잉어',rarity:'희귀',weight:2.5,min:35,max:72},
    {id:'moon',name:'달빛고기',rarity:'전설',weight:.5,min:18,max:42}
  ];
  const noteData={
    first:['놋쇠 조각','첫 물고기의 아가미에 작은 놋쇠 조각이 걸려 있었다.'],
    bench:['작업대','물가에 오래된 작업대가 있다. 누군가 아직 쓰는 것처럼 말끔하다.'],
    reeds:['갈대','바람이 멎었는데도 건너편 갈대가 흔들렸다.'],
    trap:['통발','물살은 한 방향인데, 떠오른 통발은 반대로 흘렀다.'],
    roof:['지붕','어제는 없던 지붕이 수면 위로 드러났다.'],
    channel:['수로','갈대 뒤에 물길이 있다. 작은 배 한 척이 지나갈 만하다.'],
    houses:['잠긴 집','집마다 문이 열려 있다. 누군가 급히 떠난 흔적은 없다.'],
    lamp:['등불','유리 안쪽에 오래된 지도가 새겨져 있다. 불을 켜자 길이 보였다.'],
    beacon:['등대','꺼진 등대에서 종소리가 났다. 소리는 위가 아니라 물 아래에서 올라온다.'],
    gate:['수문','오래전 이곳 사람들은 물을 막은 것이 아니었다. 무엇인가를 물속에 남겨 두었다.'],
    return:['다시 물가에','호수는 아무 일도 없었다는 듯 잔잔하다. 그러나 이제 물결 아래의 길을 안다.']
  };
  const makeState=()=>({version:2,casts:0,fish:0,wood:0,scrap:0,supply:0,glass:0,flags:{hook:false,net:false,net2:false,boat:false,lamp:false},visits:{channel:0,houses:0,beacon:0,gate:0},catches:{},notes:[],lastTick:Date.now()});
  const key='stillwater:world:v2';let state=makeState();
  try {const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&saved.version===2){state={...state,...saved,flags:{...state.flags,...saved.flags},visits:{...state.visits,...saved.visits},catches:saved.catches||{},notes:Array.isArray(saved.notes)?saved.notes:[]};}else{const old=JSON.parse(localStorage.getItem('stillwater:journal:v1')||'{}');if(old&&typeof old==='object'){state.catches=old;state.fish=Object.values(old).reduce((n,r)=>n+(Number(r.count)||0),0);}}}catch(_){state=makeState()}
  for(const k of ['casts','fish','wood','scrap','supply','glass'])state[k]=Math.max(0,Math.floor(Number(state[k])||0));
  for(const k of Object.keys(state.flags))state.flags[k]=Boolean(state.flags[k]);
  for(const k of Object.keys(state.visits))state.visits[k]=Math.max(0,Math.floor(Number(state.visits[k])||0));
  state.notes=state.notes.filter(id=>Object.prototype.hasOwnProperty.call(noteData,id));
  state.catches=Object.fromEntries(species.filter(f=>state.catches[f.id]?.count).map(f=>[f.id,{count:Math.max(0,Math.floor(Number(state.catches[f.id].count)||0)),best:Math.max(0,Number(state.catches[f.id].best)||0)}]));
  let width=0,height=0,dpr=1,lastFrame=performance.now(),castAt=0,nextRipple=0,audioCtx=null,noiseNode=null,soundOn=false,toastTimer=null,workOpen=false,journalOpen=false;
  const ripples=[],motes=Array.from({length:32},()=>({x:Math.random(),y:.58+Math.random()*.39,s:Math.random()*.7+.2,p:Math.random()*6.28})),stars=Array.from({length:70},()=>({x:Math.random(),y:Math.random()*.52,r:Math.random()*1.15+.25,p:Math.random()*6.28}));
  function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch(_){}}
  function addRipple(x,y,power=1){ripples.push({x,y,age:0,power});if(ripples.length>30)ripples.shift()}
  function toast(text){const el=$('event-toast');el.textContent=text;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3300)}
  function say(text,show=false){$('status').textContent=text;if(show)toast(text)}
  function remember(id){if(state.notes.includes(id))return;state.notes.push(id);toast(noteData[id][1]);save();}
  function pickFish(){const deep=state.visits.beacon>=2;let total=0;for(const s of species)total+=s.weight*(deep&&['golden','moon'].includes(s.id)?4:1);let roll=Math.random()*total;for(const s of species){roll-=s.weight*(deep&&['golden','moon'].includes(s.id)?4:1);if(roll<0)return s}return species[0]}
  function cast(){
    const s=pickFish(),size=Math.round((s.min+Math.random()*(s.max-s.min))*10)/10;
    state.casts++;let amount=1+(state.flags.hook?1:0)+(Math.random()<.27?1:0);state.fish+=amount;
    const before=state.catches[s.id]||{count:0,best:0};state.catches[s.id]={count:(Number(before.count)||0)+1,best:Math.max(Number(before.best)||0,size)};
    let extras=[];if(Math.random()<.65){state.wood++;extras.push('나무 +1')}if(Math.random()<.38){state.scrap++;extras.push('고철 +1')}
    if(state.flags.boat&&Math.random()<.16){state.glass++;extras.push('유리 +1')}
    castAt=performance.now();addRipple(.56,.675,2);playTone(420,.12,'sine',.036);
    say(`${s.name} +${amount}${extras.length?' · '+extras.join(' · '):''}`);
    if(before.count===0&&['golden','moon'].includes(s.id))setTimeout(()=>say(`처음 보는 ${s.name}. 기록에 남겼습니다.`,true),350);
    if(state.casts===1)remember('first');
    else if(state.casts===3)remember('bench');
    else if(state.casts===6)remember('reeds');
    else if(state.casts===10)remember('trap');
    else if(state.casts===18)remember('roof');
    save();render();
  }
  const recipes=[
    {id:'barter',name:'물고기 교환',detail:'물가의 낡은 교환 상자',cost:{fish:6},gain:{wood:3,scrap:2},show:()=>true},
    {id:'supply',name:'말린 물고기',detail:'건너편으로 가져갈 식량',cost:{fish:4},gain:{supply:2},show:()=>state.casts>=6},
    {id:'hook',name:'쇠바늘 다듬기',detail:'낚시마다 물고기 +1',cost:{wood:3,scrap:4},flag:'hook',show:()=>state.casts>=4&&!state.flags.hook},
    {id:'net',name:'통발 놓기',detail:'7초마다 물고기 +1',cost:{wood:8,scrap:6},flag:'net',show:()=>state.casts>=10&&!state.flags.net},
    {id:'net2',name:'통발 손보기',detail:'7초마다 물고기 +2',cost:{wood:12,scrap:8},flag:'net2',show:()=>state.flags.net&&state.casts>=24&&!state.flags.net2},
    {id:'boat',name:'낡은 배 고치기',detail:'호수 건너편으로',cost:{wood:12,scrap:10,supply:4},flag:'boat',show:()=>state.flags.net&&state.casts>=18&&!state.flags.boat},
    {id:'lamp',name:'유리 등불',detail:'물 아래의 길을 비춥니다',cost:{glass:3,scrap:5},flag:'lamp',show:()=>state.flags.boat&&state.visits.houses>=2&&!state.flags.lamp}
  ];
  const resourceNames={fish:'물고기',wood:'나무',scrap:'고철',supply:'식량',glass:'유리'};
  function enough(cost){return Object.entries(cost).every(([k,v])=>state[k]>=v)}
  function spend(cost){for(const [k,v]of Object.entries(cost))state[k]-=v}
  function costText(cost){return Object.entries(cost).map(([k,v])=>`${resourceNames[k]} ${v}`).join(' · ')}
  function craft(id){const r=recipes.find(x=>x.id===id);if(!r||!r.show()||!enough(r.cost))return;spend(r.cost);if(r.flag)state.flags[r.flag]=true;if(id==='net')state.lastTick=Date.now();if(r.gain)for(const [k,v]of Object.entries(r.gain))state[k]+=v;
    const lines={barter:'교환 상자에 물고기를 두었다. 나무와 고철이 남았다.',supply:'생선을 말려 식량을 만들었다.',hook:'쇠바늘이 단단해졌다. 낚싯줄이 묵직하다.',net:'통발이 물속으로 가라앉았다. 물고기가 저절로 모이기 시작한다.',net2:'물길을 알게 된 통발이 더 많은 물고기를 모은다.',boat:'배가 물에 뜬다. 건너편 지붕이 보인다.',lamp:'등불 안쪽의 지도가 빛난다.'};say(`완료 · ${r.name}`);toast(lines[id]);
    if(id==='boat')remember('channel');if(id==='lamp')remember('lamp');save();render();
  }
  const places=[
    {id:'channel',name:'갈대 수로',detail:'물길을 따라가 보기',cost:{supply:1},show:()=>state.flags.boat},
    {id:'houses',name:'물에 잠긴 집',detail:'지붕 아래를 살펴보기',cost:{supply:2},show:()=>state.visits.channel>=2},
    {id:'beacon',name:'꺼진 등대',detail:'빛이 닿지 않는 곳',cost:{supply:3,glass:1},show:()=>state.flags.lamp},
    {id:'gate',name:'잠긴 수문',detail:'종소리가 시작된 곳',cost:{supply:4,glass:2},show:()=>state.visits.beacon>=2}
  ];
  function travel(id){const p=places.find(x=>x.id===id);if(!p||!p.show()||!enough(p.cost))return;spend(p.cost);state.visits[id]++;
    const n=state.visits[id];if(id==='channel'){state.wood+=3;state.scrap+=2;toast(n===1?'갈대 사이에 오래된 노가 걸려 있다. 나무와 고철을 건졌다.':'물살이 가리키는 틈을 찾았다. 잠긴 지붕으로 이어진다.');if(n===2)remember('channel');}
    if(id==='houses'){state.scrap+=4;state.glass+=2;toast(n===1?'식탁 위 유리컵이 아직 그대로다.':'열린 문마다 같은 방향으로 의자가 놓여 있다.');if(n===2)remember('houses');}
    if(id==='beacon'){state.glass+=2;state.scrap+=2;toast(n===1?'등대에는 불을 켠 흔적이 없다. 그런데 유리는 따뜻하다.':'발밑에서 종소리가 났다. 물 아래에 길이 있다.');if(n===2)remember('beacon');}
    if(id==='gate'){state.glass+=3;state.wood+=4;toast(n===1?'수문에는 자물쇠가 없다. 안쪽에서 잠긴 듯하다.':'물속에 가라앉은 것은 마을이 아니라, 마을이 지키던 무언가였다.');if(n===2){remember('gate');setTimeout(()=>remember('return'),3500)}}
    $('status').textContent=`다녀온 곳 · ${p.name}`;addRipple(.56,.675,3);playTone(650,.25,'sine',.05);save();render();
  }
  function stage(){if(state.visits.gate>=2)return 5;if(state.visits.beacon>=2)return 4;if(state.flags.boat)return 3;if(state.flags.net)return 2;if(state.casts>=3)return 1;return 0}
  function render(){
    const st=stage(),titles=[['A QUIET PLACE TO STAY','오늘은, 물가에.','아무것도 서두르지 않아도 되는 시간.'],['THINGS THE WATER LEAVES','물가에 남은 것.','건져 올린 것들로 작은 도구를 만듭니다.'],['THE SHORE IS MOVING','물길이 바뀌었다.','통발은 일하고, 건너편 지붕은 가까워집니다.'],['BEYOND THE WATER','건너편으로.','낚시하던 호수에 오래된 길이 있습니다.'],['THE BELL BELOW','물 아래의 소리.','등대의 종소리는 어디에서 시작됐을까요.'],['STILLWATER','다시, 물가에.','모든 것을 알지 못해도, 호수는 계속 흐릅니다.']][st];
    $('chapter-label').textContent=titles[0];$('chapter-title').textContent=titles[1];$('chapter-subtitle').textContent=titles[2];$('place-label').textContent=st>=3?'건너편의 호수':'해질녘의 호수';
    $('bottom-note').textContent=st>=3?'물길을 따라, 조금 더 멀리':'잠시 머무는 낚시';
    $('action-text').textContent=st>=3?'다시 낚싯줄 던지기':'낚싯줄 던지기';$('catch-count').textContent=`낚시 ${state.casts}회`;
    $('work-open').hidden=state.casts<3;$('work-panel').hidden=state.casts<3;
    $('work-badge').textContent=state.flags.boat?'↗':state.flags.net?'•':'+';
    renderWork();renderJournal();
  }
  function renderWork(){
    const visible=['fish','wood','scrap','supply','glass'].filter(k=>!['supply','glass'].includes(k)||state[k]>0||state.casts>=6&&(k==='supply'||state.flags.boat));
    $('resources').innerHTML=visible.map(k=>`<span class="resource">${resourceNames[k]} <strong>${state[k]}</strong></span>`).join('');
    $('work-intro').textContent=state.flags.net?'통발이 물고기를 모으고 있습니다.':'건져 올린 것을 쓸모 있게 만듭니다.';
    $('work-actions').innerHTML=recipes.filter(r=>r.show()).map(r=>`<button class="work-action" type="button" data-work="${r.id}" ${enough(r.cost)?'':'disabled'}><span><strong>${r.name}</strong><small>${r.detail}</small></span><span class="cost">${costText(r.cost)}</span></button>`).join('');
    $('map-area').hidden=!state.flags.boat;
    $('map-actions').innerHTML=state.flags.boat?places.filter(p=>p.show()).map(p=>`<button class="work-action" type="button" data-place="${p.id}" ${enough(p.cost)?'':'disabled'}><span><strong>${p.name}</strong><small>${p.detail} · ${state.visits[p.id]}회</small></span><span class="cost">${costText(p.cost)}</span></button>`).join(''):'';
  }
  function renderJournal(){
    const total=Object.values(state.catches).reduce((n,r)=>n+(Number(r.count)||0),0),seen=species.filter(s=>state.catches[s.id]?.count).length;
    $('total-catches').textContent=total;$('species-count').textContent=`${seen} / ${species.length}`;$('journal-badge').textContent=state.notes.length||seen;
    $('note-section').hidden=!state.notes.length;$('notes-list').innerHTML=state.notes.filter(id=>noteData[id]).map(id=>`<div class="note-item"><b>${noteData[id][0]}</b>${noteData[id][1]}</div>`).join('');
    $('species-list').innerHTML=species.map(s=>{const r=state.catches[s.id];return `<div class="species-row ${r?'':'locked'}"><div class="species-mark">${r?'◈':'?'}</div><div class="species-text"><strong>${r?s.name:'아직 만나지 못함'}</strong><small>${r?`최대 ${(Number(r.best)||0).toFixed(1)} cm · ${s.rarity}`:'호수 어딘가에 있습니다'}</small></div><span class="species-count">${r?`${r.count}마리`:''}</span></div>`}).join('');
  }
  function openWork(){if(state.casts<3)return;workOpen=true;$('scrim').hidden=false;$('work-panel').classList.add('open');$('work-open').setAttribute('aria-expanded','true');$('work-close').focus()}
  function closeWork(){workOpen=false;$('work-panel').classList.remove('open');$('work-open').setAttribute('aria-expanded','false');if(!journalOpen)$('scrim').hidden=true;$('work-open').focus()}
  function openJournal(){if(workOpen)closeWork();journalOpen=true;$('scrim').hidden=false;$('journal').classList.add('open');$('journal').setAttribute('aria-hidden','false');$('journal-close').focus()}
  function closeJournal(){journalOpen=false;$('journal').classList.remove('open');$('journal').setAttribute('aria-hidden','true');if(!workOpen)$('scrim').hidden=true;$('journal-open').focus()}
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
  function toggleSound(){soundOn=!soundOn;if(soundOn){createAudio();audioCtx?.resume();playTone(460,.16,'sine',.035)}else audioCtx?.suspend();$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'소리 끄기':'소리 켜기');$('sound').title=soundOn?'소리 끄기':'소리 켜기'}
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
    // New shapes emerge as the lake opens up.
    if(state.flags.boat){
      ctx.save();ctx.globalAlpha=.7;ctx.fillStyle='#152d34';
      for(const [px,roof,size] of [[.39,hy-7,1],[.47,hy-3,.75],[.54,hy-5,.9]]){
        const x=w*px,span=h*.035*size,top=roof-h*.026*size;
        ctx.fillRect(x-span*.38,roof,span*.76,hy-roof+8);
        ctx.beginPath();ctx.moveTo(x-span*.55,roof);ctx.lineTo(x,top);ctx.lineTo(x+span*.55,roof);ctx.closePath();ctx.fill();
      }
      ctx.restore();
    }
    if(state.flags.lamp){
      const bx=w*.36,by=hy-2,tw=Math.max(4,h*.01);ctx.fillStyle='#142c33';
      ctx.beginPath();ctx.moveTo(bx-tw,by);ctx.lineTo(bx-tw*.55,by-h*.09);ctx.lineTo(bx+tw*.55,by-h*.09);ctx.lineTo(bx+tw,by);ctx.fill();
      ctx.fillRect(bx-tw*.9,by-h*.103,tw*1.8,h*.013);
      const beam=ctx.createRadialGradient(bx,by-h*.094,1,bx,by-h*.094,h*.065);beam.addColorStop(0,'#e7d3aa75');beam.addColorStop(1,'#e7d3aa00');ctx.fillStyle=beam;ctx.fillRect(bx-h*.065,by-h*.16,h*.13,h*.13);
    }
    if(state.flags.net){
      const bx=w*.34,by=h*.69+Math.sin(t*2)*2;ctx.strokeStyle='#9caeaa68';ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(bx,by,22,5,0,0,7);ctx.stroke();ctx.beginPath();ctx.ellipse(bx,by,44,9,0,0,7);ctx.stroke();
      ctx.fillStyle='#ae9c77';ctx.beginPath();ctx.arc(bx,by-2,3,0,7);ctx.fill();
    }
    if(state.flags.boat){
      const bx=w*.51,by=hy+24+Math.sin(t*1.2)*1.5,bw=Math.max(28,Math.min(58,w*.04));
      ctx.fillStyle='#0d252d';ctx.beginPath();ctx.moveTo(bx-bw,by);ctx.lineTo(bx+bw,by);ctx.lineTo(bx+bw*.68,by+9);ctx.lineTo(bx-bw*.62,by+9);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#aec1b074';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+2,by-h*.06);ctx.stroke();
    }
    // Foreground banks
    ctx.fillStyle='#081c24';ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,hy-5);ctx.bezierCurveTo(w*.06,hy+25,w*.09,hy+55,w*.12,h);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(w,h);ctx.lineTo(w,hy-8);ctx.bezierCurveTo(w*.94,hy+18,w*.91,hy+55,w*.89,h);ctx.closePath();ctx.fill();
    for(let i=0;i<7;i++){drawPine(w*(.015+i*.019),hy+h*(.018+i*.014),h*(.14+(i%3)*.04),.92);drawPine(w*(.91+i*.015),hy+h*(.026+i*.01),h*(.13+(i%4)*.035),.9)}
    // Pier and a quiet fishing silhouette
    ctx.fillStyle='#0a1b22';ctx.beginPath();ctx.moveTo(w*.79,h);ctx.lineTo(w*.78,h*.83);ctx.lineTo(w,h*.82);ctx.lineTo(w,h);ctx.fill();
    ctx.strokeStyle='#081820';ctx.lineWidth=Math.max(5,w*.006);for(let x=w*.83;x<w;x+=w*.055){ctx.beginPath();ctx.moveTo(x,h*.82);ctx.lineTo(x+5,h);ctx.stroke()}
    const personX=w*.86,personY=h*.786,scale=Math.min(w/1250,h/750,1.3);ctx.save();ctx.translate(personX,personY);ctx.scale(scale,scale);ctx.fillStyle='#0a171e';ctx.beginPath();ctx.ellipse(0,-47,12,14,0,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(-11,-32);ctx.quadraticCurveTo(-20,-6,-15,21);ctx.lineTo(26,23);ctx.lineTo(19,-20);ctx.quadraticCurveTo(10,-36,-11,-32);ctx.fill();ctx.strokeStyle='#0a171e';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-2,-10);ctx.lineTo(-33,5);ctx.lineTo(-48,-19);ctx.stroke();ctx.beginPath();ctx.moveTo(10,14);ctx.lineTo(38,35);ctx.lineTo(55,38);ctx.moveTo(-2,17);ctx.lineTo(-23,39);ctx.stroke();ctx.restore();
    const tipX=w*.665,tipY=h*.425,rodX=personX-48*scale,rodY=personY-19*scale;ctx.strokeStyle='#182227';ctx.lineWidth=Math.max(2,3*scale);ctx.beginPath();ctx.moveTo(rodX,rodY);ctx.quadraticCurveTo(w*.74,h*.58,tipX,tipY);ctx.stroke();ctx.strokeStyle='#ae9f88';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(rodX,rodY);ctx.quadraticCurveTo(w*.74,h*.58,tipX,tipY);ctx.stroke();
    if(state.casts>0){let q=Math.min(1,(now-castAt)/750),bx=w*(.665+(.56-.665)*q),by=h*(.425+(.675-.425)*q);if(now-castAt<850){bx+=Math.sin(t*11)*2;by+=Math.sin(t*8)*2}ctx.strokeStyle='#e4d8b18c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tipX,tipY);ctx.quadraticCurveTo(w*.68,h*.6,bx,by);ctx.stroke();ctx.fillStyle='#dec9a1';ctx.beginPath();ctx.ellipse(bx,by,3.5,6,Math.sin(t*3)*.15,0,7);ctx.fill();}
    for(const r of ripples){let a=Math.max(0,1-r.age/2.1),rx=(12+r.age*39)*r.power;ctx.strokeStyle=`rgba(193,211,197,${a*.36})`;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(r.x*w,r.y*h,rx,rx*.2,0,0,7);ctx.stroke();}
    for(const m of motes){let x=m.x*w+Math.sin(t*.4+m.p)*14,y=m.y*h+Math.sin(t*.7+m.p)*5;ctx.fillStyle=`rgba(204,219,200,${.13*m.s*(1+Math.sin(t*1.3+m.p))})`;ctx.beginPath();ctx.arc(x,y,1.1*m.s,0,7);ctx.fill();}
  }
  function frame(now){const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;if(now>nextRipple){addRipple(.56,.675,.55);nextRipple=now+950+Math.random()*800}for(let i=ripples.length-1;i>=0;i--){ripples[i].age+=dt;if(ripples[i].age>2.1)ripples.splice(i,1)}drawScene(now);requestAnimationFrame(frame)}
  function netTick(){if(!state.flags.net)return;const elapsed=Math.max(0,Date.now()-state.lastTick),cycles=Math.min(260,Math.floor(elapsed/7000));if(!cycles)return;state.fish+=cycles*(state.flags.net2?2:1);state.lastTick+=cycles*7000;save();renderWork();}
  $('action').addEventListener('click',cast);
  $('work-actions').addEventListener('click',e=>{const b=e.target.closest('[data-work]');if(b)craft(b.dataset.work)});
  $('map-actions').addEventListener('click',e=>{const b=e.target.closest('[data-place]');if(b)travel(b.dataset.place)});
  $('work-open').addEventListener('click',openWork);$('work-close').addEventListener('click',closeWork);
  $('journal-open').addEventListener('click',openJournal);$('journal-close').addEventListener('click',closeJournal);$('scrim').addEventListener('click',()=>{if(journalOpen)closeJournal();if(workOpen)closeWork()});
  $('sound').addEventListener('click',toggleSound);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(journalOpen)closeJournal();else if(workOpen)closeWork()}else if(e.code==='Space'&&!e.repeat&&!['BUTTON','INPUT','TEXTAREA'].includes(document.activeElement?.tagName)&&!workOpen&&!journalOpen){e.preventDefault();cast()}});
  window.addEventListener('resize',resize);resize();render();netTick();setInterval(netTick,1000);requestAnimationFrame(frame);
})();
