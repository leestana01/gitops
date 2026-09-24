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
    first:['내일의 표식','첫 물고기의 아가미에 놋쇠 표식이 걸려 있었다. 날짜는 내일, 이름은 당신의 것이다.'],
    bench:['아버지의 작업대','작업대 위 공책에는 아버지의 글씨로 한 줄이 남아 있다. “호수가 건네는 것을 버리지 마라.”'],
    reeds:['거슬러 오르는 물','바람이 멈췄는데 갈대가 흔들렸다. 물은 아주 잠깐, 언덕 쪽으로 흘렀다.'],
    trap:['통발의 이름표','통발에 물고기보다 먼저 이름표가 걸렸다. 모두 이 호수에 잠긴 집들의 이름이다.'],
    roof:['물 위의 지붕','어제는 없던 지붕이 수면 위로 드러났다. 창가에는 마르지 않은 불빛이 있다.'],
    boat:['떠 있는 배','배 밑에서 작은 종소리가 울렸다. 건너편에는 누군가 남겨 둔 길이 있다.'],
    channelSignal:['젖지 않은 종이','갈대에서 잡은 물고기 비늘 아래 종이 한 장이 있었다. 종이는 물에 젖지 않았다.'],
    channel:['주소','종이에는 잠긴 집들의 주소가 적혀 있다. 마지막 주소는 당신이 살던 집이다.'],
    housesSignal:['열린 문','집마다 문이 열려 있다. 사람이 떠난 흔적은 없고, 벽에는 키를 재던 눈금이 남아 있다.'],
    houses:['식탁의 문장','모든 식탁에 같은 문장이 적혀 있다. “종이 울리면 이름을 부르지 마.” 가족사진에서는 한 사람의 얼굴만 사라졌다.'],
    lamp:['유리 등불','오래된 유리 안쪽에 지도가 새겨져 있다. 불을 켜자 등대로 이어지는 물길이 나타났다.'],
    beaconSignal:['첫 번째 종소리','등대에서 건진 물고기의 입에 작은 종추가 있었다. 물 위에는 종이 없다.'],
    beacon:['등대의 기록','물이 찬 날 이후에도 아버지는 스물일곱 해 동안 매일 종을 울렸다. 누군가 지워질 때마다, 이름 하나가 호수에 남도록.'],
    gateSignal:['수문 아래','수문의 안쪽에서 당신 이름의 표식이 흔들린다. 내일이라 적혔던 날짜가 오늘로 바뀌었다.'],
    gate:['두 개의 물길','수문을 열면 잊힌 이름이 돌아가고 호수는 물러난다. 닫으면 이름은 물결 아래에 남는다. 아버지는 어느 쪽도 정답이라 쓰지 않았다.'],
    afterOpen:['드러난 지붕','새벽에 집들의 지붕이 드러났다. 사람들은 오래 잊었던 이름을 불렀다. 아버지의 이름도 있었다. 돌아온 것은 목소리뿐이었다.'],
    afterSeal:['남겨 둔 이름','종이 한 번 더 울렸다. 바깥의 사람들은 아무것도 기억하지 못한다. 당신은 이름들을 하나씩 낚아 올려 공책에 적는다.']
  };
  const chapterData={
    bench:{kicker:'THE FIRST THREAD',title:'내일이 적힌 표식',lines:['첫 물고기의 아가미에 작은 놋쇠 표식이 걸려 있었다. 날짜는 내일, 이름은 당신의 것이다.','물가의 작업대에는 아버지의 공책이 놓여 있다. 마지막 문장은 “호수가 건네는 것을 버리지 마라.”']},
    channel:{kicker:'THE REED CHANNEL',title:'돌아오는 주소',lines:['갈대에서 건진 물고기 비늘 아래, 젖지 않은 종이가 있었다. 물에 잠긴 집들의 주소가 적혀 있다.','마지막 주소는 당신이 살던 집이다.']},
    houses:{kicker:'THE DROWNED HOUSES',title:'이름을 부르지 마',lines:['물에 잠긴 집마다 같은 문장이 남아 있다. “종이 울리면 이름을 부르지 마.”','가족사진에서 얼굴 하나가 사라졌다. 그런데 사진 속 사람들의 시선은 모두 당신을 향한다.']},
    beacon:{kicker:'THE DARK BEACON',title:'스물일곱 해의 종소리',lines:['등대 기록에는 물이 찬 날 이후의 날짜가 이어진다. 아버지는 스물일곱 해 동안 매일 종을 울렸다.','누군가 지워질 때마다 이름 하나가 물에 남았다. 마지막 줄에는 “수문을 열기 전, 아래에 남은 사람을 보아라.”']},
    gate:{kicker:'THE LOCKED GATE',title:'어느 쪽도 정답은 아니다',lines:['수문 아래에 당신 이름의 표식이 걸려 있다. 내일이라 새겨졌던 날짜가 오늘로 바뀌었다. 아버지는 잊힌 사람들의 이름을 스물일곱 해 동안 이 물속에 붙잡아 두었다.','수문을 열면 이름은 살아 있는 사람들에게 돌아가지만, 호수의 기록은 사라진다. 닫으면 이름은 보존되지만 아무도 그들을 기억하지 못한다. 다음 종을 울릴 사람은 당신이다.']},
    afterOpen:{kicker:'THE WATER RECEDED',title:'기억이 돌아온 아침',lines:['새벽에 물이 물러나자 사람들은 잊었던 이름들을 입 밖에 냈다. 집과 길은 돌아왔지만, 그 이름의 주인들은 돌아오지 않았다.','아버지의 이름을 부르는 목소리가 들린다. 호수에 남겨 둔 기록은 사라졌다. 이제 당신이 기억할 차례다.']},
    afterSeal:{kicker:'THE NAMES BELOW',title:'다음 종을 울리는 사람',lines:['종이 울린 뒤에도 바깥의 사람들은 아무것도 기억하지 못한다. 호수는 잊힌 이름들을 그대로 품는다.','아버지의 공책 마지막 장은 비어 있었다. 당신은 오늘 건진 이름부터 적는다. 물 아래에서 새 표식 하나가 반짝인다.']}
  };
  const makeState=()=>({version:2,location:'shore',ending:null,storySeen:[],siteCatches:{shore:0,channel:0,houses:0,beacon:0,gate:0},casts:0,fish:0,wood:0,scrap:0,supply:0,glass:0,flags:{hook:false,net:false,net2:false,boat:false,lamp:false},visits:{channel:0,houses:0,beacon:0,gate:0},catches:{},notes:[],lastTick:Date.now()});
  const key='stillwater:world:v2';let state=makeState(),legacyWorld=false;
  try {const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&saved.version===2){legacyWorld=!saved.siteCatches;state={...state,...saved,flags:{...state.flags,...saved.flags},visits:{...state.visits,...saved.visits},siteCatches:{...state.siteCatches,...saved.siteCatches},catches:saved.catches||{},notes:Array.isArray(saved.notes)?saved.notes:[],storySeen:Array.isArray(saved.storySeen)?saved.storySeen:[]};}else{const old=JSON.parse(localStorage.getItem('stillwater:journal:v1')||'{}');if(old&&typeof old==='object'){state.catches=old;state.fish=Object.values(old).reduce((n,r)=>n+(Number(r.count)||0),0);}}}catch(_){state=makeState()}
  for(const k of ['casts','fish','wood','scrap','supply','glass'])state[k]=Math.max(0,Math.floor(Number(state[k])||0));
  for(const k of Object.keys(state.flags))state.flags[k]=Boolean(state.flags[k]);
  for(const k of Object.keys(state.visits))state.visits[k]=Math.max(0,Math.floor(Number(state.visits[k])||0));
  for(const k of Object.keys(state.siteCatches))state.siteCatches[k]=Math.max(0,Math.floor(Number(state.siteCatches[k])||0));
  if(legacyWorld){for(const k of ['channel','houses','beacon','gate'])state.siteCatches[k]=state.visits[k]>=2?2:0;state.storySeen=state.notes.filter(id=>id!=='gate');}
  state.ending=['open','seal'].includes(state.ending)?state.ending:null;state.storySeen=state.storySeen.filter(id=>Object.prototype.hasOwnProperty.call(chapterData,id));
  state.location=['shore','channel','houses','beacon','gate'].includes(state.location)?state.location:'shore';
  state.notes=state.notes.filter(id=>Object.prototype.hasOwnProperty.call(noteData,id));
  state.catches=Object.fromEntries(species.filter(f=>state.catches[f.id]?.count).map(f=>[f.id,{count:Math.max(0,Math.floor(Number(state.catches[f.id].count)||0)),best:Math.max(0,Number(state.catches[f.id].best)||0)}]));
  let width=0,height=0,dpr=1,lastFrame=performance.now(),castAt=0,nextRipple=0,audioCtx=null,noiseNode=null,soundOn=false,toastTimer=null,workOpen=false,journalOpen=false,phase='idle',aimAt=0,aimTarget=.5,aimWidth=.18,aimQuality=0,biteDeadline=0,biteTimer=null,fight=null,holding=false,transitionTimer=null,suppressFightClick=false,ignoreClickUntil=0,storyOpen=false,currentStory=null;
  const ripples=[],motes=Array.from({length:32},()=>({x:Math.random(),y:.58+Math.random()*.39,s:Math.random()*.7+.2,p:Math.random()*6.28})),stars=Array.from({length:70},()=>({x:Math.random(),y:Math.random()*.52,r:Math.random()*1.15+.25,p:Math.random()*6.28}));
  function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch(_){}}
  function addRipple(x,y,power=1){ripples.push({x,y,age:0,power});if(ripples.length>30)ripples.shift()}
  function toast(text){const el=$('event-toast');el.textContent=text;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3300)}
  function say(text,show=false){$('status').textContent=text;if(show)toast(text)}
  function landings(){return Object.values(state.catches).reduce((n,r)=>n+(Number(r.count)||0),0)}
  function remember(id){if(state.notes.includes(id))return;state.notes.push(id);toast(noteData[id][1]);save();showNextStory();}
  function showNextStory(){
    if(storyOpen)return;const id=state.notes.find(n=>chapterData[n]&&!state.storySeen.includes(n));if(!id)return;
    const chapter=chapterData[id];storyOpen=true;currentStory=id;
    $('story-kicker').textContent=chapter.kicker;$('story-title').textContent=chapter.title;
    $('story-line-one').textContent=chapter.lines[0];$('story-line-two').textContent=chapter.lines[1];
    $('story-actions').innerHTML=id==='gate'?'<button type="button" data-story-choice="open">수문을 연다</button><button type="button" class="secondary" data-story-choice="seal">호수를 지킨다</button>':'<button type="button" data-story-choice="continue">계속</button>';
    $('story-overlay').hidden=false;updateAction();$('story-actions').querySelector('button')?.focus();
  }
  function closeStory(choice){
    if(!storyOpen||currentStory==='gate'&&!['open','seal'].includes(choice))return;
    const id=currentStory;state.storySeen.push(id);storyOpen=false;currentStory=null;$('story-overlay').hidden=true;
    if(id==='gate'){state.ending=choice;remember(choice==='open'?'afterOpen':'afterSeal')}
    save();render();$('action').focus();showNextStory();
  }
  function pickFish(){const deep=state.siteCatches.beacon>=2||['beacon','gate'].includes(state.location);let total=0;for(const s of species)total+=s.weight*(deep&&['golden','moon'].includes(s.id)?4:1);let roll=Math.random()*total;for(const s of species){roll-=s.weight*(deep&&['golden','moon'].includes(s.id)?4:1);if(roll<0)return s}return species[0]}
  function aimPosition(now){const speed=state.location==='shore'?1120:850;return .5-.5*Math.cos((now-aimAt)*Math.PI*2/speed)}
  function beginAim(){
    if(phase!=='idle')return;phase='aiming';aimAt=performance.now();aimTarget=.25+Math.random()*.5;aimWidth=state.location==='shore'?.18:.12;
    state.casts++;if(Math.random()<.58)state.wood++;if(Math.random()<.36)state.scrap++;
    save();render();$('aim-target').style.left=`${(aimTarget-aimWidth/2)*100}%`;$('aim-target').style.width=`${aimWidth*100}%`;say('물결을 읽고 던질 지점을 맞추세요');playTone(340,.12,'sine',.025);
  }
  function releaseAim(){
    if(phase!=='aiming')return;const distance=Math.abs(aimPosition(performance.now())-aimTarget);
    aimQuality=distance<=aimWidth/2?2:distance<=.24?1:0;
    phase='waiting';castAt=performance.now();addRipple(.56,.675,1.7);playTone(480,.14,'sine',.045);
    say(aimQuality===2?'정확한 투척 · 물살이 바뀝니다':aimQuality===1?'줄이 물 위에 닿았습니다':'빗나갔지만, 물속에서 움직임이 느껴집니다');updateAction();
    clearTimeout(biteTimer);biteTimer=setTimeout(startBite,450+Math.random()*500);
  }
  function startBite(){
    if(phase!=='waiting')return;phase='bite';biteDeadline=performance.now()+(state.location==='shore'?1350:1050)+(aimQuality===2?200:0);
    addRipple(.56,.675,2.5);playTone(760,.12,'triangle',.06);setTimeout(()=>playTone(990,.16,'triangle',.055),100);
    say('입질! 지금 챔질하세요');updateAction();
  }
  function hook(){
    if(phase!=='bite')return;phase='fight';const fish=pickFish(),rarity=species.indexOf(fish);
    fight={fish,rarity,progress:0,tension:18,danger:0,slack:0,start:performance.now(),surgeAt:performance.now()+1150+Math.random()*600,strength:1+(rarity>=4?.24:0)+(rarity>=6?.16:0)+(state.location==='shore'?0:.15)-(aimQuality===2?.1:0)+(aimQuality===0?.15:0)};
    say(rarity>=4?'무거운 힘이 줄을 끌고 갑니다':'물고기가 거세게 저항합니다');playTone(520,.18,'triangle',.05);updateAction();
  }
  function fail(reason){
    if(phase==='idle')return;phase='idle';ignoreClickUntil=performance.now()+320;holding=false;fight=null;clearTimeout(biteTimer);addRipple(.56,.675,2.6);playTone(190,.32,'sine',.055);
    say(reason);updateAction();renderWork();
  }
  function finishCatch(){
    if(phase!=='fight'||!fight)return;const s=fight.fish,size=Math.round((s.min+Math.random()*(s.max-s.min))*10)/10;
    const amount=1+(state.flags.hook?1:0)+(aimQuality===2?1:0)+(Math.random()<.15?1:0);state.fish+=amount;
    const before=state.catches[s.id]||{count:0,best:0};state.catches[s.id]={count:(Number(before.count)||0)+1,best:Math.max(Number(before.best)||0,size)};state.siteCatches[state.location]=(state.siteCatches[state.location]||0)+1;
    if(['houses','beacon'].includes(state.location))state.glass++;
    else if(state.flags.boat&&Math.random()<.23)state.glass++;
    phase='idle';ignoreClickUntil=performance.now()+320;holding=false;fight=null;addRipple(.56,.675,2.4);playTone(620,.18,'sine',.06);setTimeout(()=>playTone(840,.24,'sine',.05),110);
    say(`${s.name} ${size.toFixed(1)}cm · 물고기 +${amount}`);const total=landings();
    if(total===1)remember('first');if(total===2)remember('bench');if(total===4)remember('reeds');if(total===7)remember('trap');if(total===13)remember('roof');
    const local=state.siteCatches[state.location];if(state.location==='channel'){if(local===1)remember('channelSignal');if(local===2)remember('channel')}
    if(state.location==='houses'){if(local===1)remember('housesSignal');if(local===2)remember('houses')}
    if(state.location==='beacon'){if(local===1)remember('beaconSignal');if(local===2)remember('beacon')}
    if(state.location==='gate'){if(local===1)remember('gateSignal');if(local===2)remember('gate')}
    if(before.count===0&&['golden','moon'].includes(s.id))toast(`처음 만난 ${s.name}. 기록에 남겼습니다.`);
    save();render();
  }
  function updateAction(){
    const labels={idle:['↗',state.location==='shore'?'낚싯줄 던지기':'이곳에 낚싯줄 던지기','누르면 던질 지점이 나타납니다'],aiming:['◎','지금 던지기','움직이는 눈금이 밝은 구간에 올 때 누르세요'],waiting:['◌','물결을 보는 중','입질은 곧 옵니다'],bite:['↗','지금 챔질하기','짧은 순간을 놓치지 마세요'],fight:['◉','누르고 줄 감기','당기고 놓아 긴장도를 관리하세요']};
    const [icon,label,hint]=labels[phase];$('action-icon').textContent=icon;$('action-text').textContent=label;$('instruction').textContent=hint;
    $('action').disabled=phase==='waiting'||storyOpen;$('skill-ui').hidden=phase==='idle'||phase==='waiting';$('aim-ui').hidden=phase!=='aiming';$('bite-ui').hidden=phase!=='bite';$('fight-ui').hidden=phase!=='fight';
    document.querySelector('.game').classList.toggle('fishing',phase==='bite');document.querySelector('.game').classList.toggle('fighting',phase==='fight');$('work-open').disabled=phase!=='idle'||storyOpen;$('journal-open').disabled=phase!=='idle'||storyOpen;renderWork();
  }
  const recipes=[
    {id:'barter',name:'물고기 교환',detail:'물가의 낡은 교환 상자',cost:{fish:6},gain:{wood:3,scrap:2},show:()=>true},
    {id:'supply',name:'말린 물고기',detail:'건너편으로 가져갈 식량',cost:{fish:4},gain:{supply:2},show:()=>landings()>=4},
    {id:'hook',name:'쇠바늘 다듬기',detail:'낚시마다 물고기 +1',cost:{wood:3,scrap:4},flag:'hook',show:()=>landings()>=3&&!state.flags.hook},
    {id:'net',name:'통발 놓기',detail:'7초마다 물고기 +1',cost:{wood:8,scrap:6},flag:'net',show:()=>landings()>=7&&state.flags.hook&&!state.flags.net},
    {id:'net2',name:'통발 손보기',detail:'7초마다 물고기 +2',cost:{wood:12,scrap:8},flag:'net2',show:()=>state.flags.net&&landings()>=20&&!state.flags.net2},
    {id:'boat',name:'낡은 배 고치기',detail:'호수 건너편으로',cost:{wood:12,scrap:10,supply:4},flag:'boat',show:()=>state.flags.net&&landings()>=13&&!state.flags.boat},
    {id:'lamp',name:'유리 등불',detail:'물 아래의 길을 비춥니다',cost:{glass:3,scrap:5},flag:'lamp',show:()=>state.flags.boat&&state.siteCatches.houses>=2&&!state.flags.lamp}
  ];
  const resourceNames={fish:'물고기',wood:'나무',scrap:'고철',supply:'식량',glass:'유리'};
  function enough(cost){return Object.entries(cost).every(([k,v])=>state[k]>=v)}
  function spend(cost){for(const [k,v]of Object.entries(cost))state[k]-=v}
  function costText(cost){return Object.entries(cost).map(([k,v])=>`${resourceNames[k]} ${v}`).join(' · ')}
  function craft(id){const r=recipes.find(x=>x.id===id);if(!r||!r.show()||!enough(r.cost)||phase!=='idle')return;spend(r.cost);if(r.flag)state.flags[r.flag]=true;if(id==='net')state.lastTick=Date.now();if(r.gain)for(const [k,v]of Object.entries(r.gain))state[k]+=v;
    const lines={barter:'교환 상자에 물고기를 두었다. 나무와 고철이 남았다.',supply:'생선을 말려 식량을 만들었다.',hook:'쇠바늘이 단단해졌다. 낚싯줄이 묵직하다.',net:'통발이 물속으로 가라앉았다. 물고기가 저절로 모이기 시작한다.',net2:'물길을 알게 된 통발이 더 많은 물고기를 모은다.',boat:'배가 물에 뜬다. 건너편 지붕이 보인다.',lamp:'등불 안쪽의 지도가 빛난다.'};say(`완료 · ${r.name}`);toast(lines[id]);
    if(id==='boat')remember('boat');if(id==='lamp')remember('lamp');save();render();
  }
  const places=[
    {id:'shore',name:'물가',detail:'익숙한 자리로 돌아가기',cost:{},show:()=>state.flags.boat&&state.location!=='shore'},
    {id:'channel',name:'갈대 수로',detail:'물길을 따라가 보기',cost:{supply:1},show:()=>state.flags.boat},
    {id:'houses',name:'물에 잠긴 집',detail:'지붕 아래를 살펴보기',cost:{supply:2},show:()=>state.siteCatches.channel>=2},
    {id:'beacon',name:'꺼진 등대',detail:'빛이 닿지 않는 곳',cost:{supply:3,glass:1},show:()=>state.flags.lamp},
    {id:'gate',name:'잠긴 수문',detail:'종소리가 시작된 곳',cost:{supply:4,glass:2},show:()=>state.siteCatches.beacon>=2}
  ];
  function travel(id){const p=places.find(x=>x.id===id);if(!p||!p.show()||!enough(p.cost)||phase!=='idle')return;spend(p.cost);if(id!=='shore')state.visits[id]++;state.location=id;
    const n=state.visits[id];if(id==='shore')toast('물가에 돌아왔습니다.');if(id==='channel'){state.wood+=3;state.scrap+=2;toast(n===1?'갈대 사이에 오래된 노가 걸려 있다. 나무와 고철을 건졌다.':'물살이 가리키는 틈을 찾았다. 잠긴 지붕으로 이어진다.');}
    if(id==='houses'){state.scrap+=4;state.glass+=2;toast(n===1?'식탁 위 유리컵이 아직 그대로다.':'열린 문마다 같은 방향으로 의자가 놓여 있다.');}
    if(id==='beacon'){state.glass+=2;state.scrap+=2;toast(n===1?'등대에는 불을 켠 흔적이 없다. 그런데 유리는 따뜻하다.':'발밑에서 종소리가 났다. 물 아래에 길이 있다.');}
    if(id==='gate'){state.glass+=3;state.wood+=4;toast(n===1?'수문에는 자물쇠가 없다. 안쪽에서 잠긴 듯하다.':'물속에 가라앉은 것은 마을이 아니라, 마을이 지키던 무언가였다.');}
    $('status').textContent=`다녀온 곳 · ${p.name}`;addRipple(.56,.675,3);playTone(650,.25,'sine',.05);save();render();if(workOpen)closeWork();showTravel(p.name,p.detail);
  }
  function showTravel(title,subtitle){
    const el=$('travel-transition');$('travel-title').textContent=title;$('travel-subtitle').textContent=subtitle;
    el.hidden=false;clearTimeout(transitionTimer);transitionTimer=setTimeout(()=>{el.hidden=true},1050);
  }
  function stage(){if(state.ending)return 5;if(state.siteCatches.beacon>=2)return 4;if(state.flags.boat)return 3;if(state.flags.net)return 2;if(landings()>=2)return 1;return 0}
  function render(){
    const st=stage(),titles=[['A QUIET PLACE TO STAY','오늘은, 물가에.','아무것도 서두르지 않아도 되는 시간.'],['THINGS THE WATER LEAVES','물가에 남은 것.','건져 올린 것들로 작은 도구를 만듭니다.'],['THE SHORE IS MOVING','물길이 바뀌었다.','통발은 일하고, 건너편 지붕은 가까워집니다.'],['BEYOND THE WATER','건너편으로.','낚시하던 호수에 오래된 길이 있습니다.'],['THE BELL BELOW','물 아래의 소리.','등대의 종소리는 어디에서 시작됐을까요.'],['STILLWATER','다시, 물가에.','모든 것을 알지 못해도, 호수는 계속 흐릅니다.']][st];
    const views={channel:['THE REED CHANNEL','갈대 사이로.','물길이 호수 안쪽으로 접혀 들어갑니다.'],houses:['THE DROWNED HOUSES','잠긴 집들.','열린 문 뒤로 물빛이 지나갑니다.'],beacon:['THE DARK BEACON','꺼진 등대.','빛보다 먼저 종소리가 닿습니다.'],gate:state.ending==='open'?['THE WATER RECEDED','드러난 마을.','이름들이 돌아온 자리에서 다시 물결을 봅니다.']:state.ending==='seal'?['THE NAMES BELOW','남겨 둔 호수.','오늘 건진 이름을 잊지 않기로 했습니다.']:['THE LOCKED GATE','잠긴 수문.','물 아래에 아직 끝나지 않은 이야기가 있습니다.']};const view=views[state.location]||titles;
    $('chapter-label').textContent=view[0];$('chapter-title').textContent=view[1];$('chapter-subtitle').textContent=view[2];$('place-label').textContent=state.location==='shore'?'해질녘의 호수':({channel:'갈대 수로',houses:'물에 잠긴 집',beacon:'꺼진 등대',gate:'잠긴 수문'}[state.location]);
    $('bottom-note').textContent=st>=3?'물길을 따라, 조금 더 멀리':'잠시 머무는 낚시';
    $('catch-count').textContent=`낚시 ${state.casts}회`;
    $('work-open').hidden=landings()<2;$('work-panel').hidden=landings()<2;
    $('work-badge').textContent=state.flags.boat?'↗':state.flags.net?'•':'+';
    renderWork();renderJournal();updateAction();
  }
  function renderWork(){
    const visible=['fish','wood','scrap','supply','glass'].filter(k=>!['supply','glass'].includes(k)||state[k]>0||landings()>=4&&(k==='supply'||state.flags.boat));
    $('resources').innerHTML=visible.map(k=>`<span class="resource">${resourceNames[k]} <strong>${state[k]}</strong></span>`).join('');
    $('work-intro').textContent=state.flags.net?'통발이 물고기를 모으고 있습니다.':'건져 올린 것을 쓸모 있게 만듭니다.';
    $('work-actions').innerHTML=recipes.filter(r=>r.show()).map(r=>`<button class="work-action" type="button" data-work="${r.id}" ${enough(r.cost)&&phase==='idle'&&!storyOpen?'':'disabled'}><span><strong>${r.name}</strong><small>${r.detail}</small></span><span class="cost">${costText(r.cost)}</span></button>`).join('');
    $('map-area').hidden=!state.flags.boat;
    $('map-actions').innerHTML=state.flags.boat?places.filter(p=>p.show()).map(p=>`<button class="work-action" type="button" data-place="${p.id}" ${enough(p.cost)&&phase==='idle'&&!storyOpen?'':'disabled'}><span><strong>${p.name}</strong><small>${p.detail}${p.id==='shore'?'':` · ${state.visits[p.id]}회`}</small></span><span class="cost">${p.id==='shore'?'무료':costText(p.cost)}</span></button>`).join(''):'';
  }
  function renderJournal(){
    const total=Object.values(state.catches).reduce((n,r)=>n+(Number(r.count)||0),0),seen=species.filter(s=>state.catches[s.id]?.count).length;
    $('total-catches').textContent=total;$('species-count').textContent=`${seen} / ${species.length}`;$('journal-badge').textContent=state.notes.length||seen;
    $('note-section').hidden=!state.notes.length;$('notes-list').innerHTML=state.notes.filter(id=>noteData[id]).map(id=>`<div class="note-item"><b>${noteData[id][0]}</b>${noteData[id][1]}</div>`).join('');
    $('species-list').innerHTML=species.map(s=>{const r=state.catches[s.id];return `<div class="species-row ${r?'':'locked'}"><div class="species-mark">${r?'◈':'?'}</div><div class="species-text"><strong>${r?s.name:'아직 만나지 못함'}</strong><small>${r?`최대 ${(Number(r.best)||0).toFixed(1)} cm · ${s.rarity}`:'호수 어딘가에 있습니다'}</small></div><span class="species-count">${r?`${r.count}마리`:''}</span></div>`}).join('');
  }
  function openWork(){if(landings()<2)return;workOpen=true;$('scrim').hidden=false;$('work-panel').classList.add('open');$('work-open').setAttribute('aria-expanded','true');$('work-close').focus()}
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
  function drawBoat(w,h,t){
    const bx=w*.76,by=h*.79+Math.sin(t*1.7)*2,bw=Math.min(w*.19,h*.16);
    ctx.fillStyle='#081b24';ctx.beginPath();ctx.moveTo(bx-bw,by);ctx.lineTo(bx+bw,by);ctx.lineTo(bx+bw*.66,by+h*.038);ctx.quadraticCurveTo(bx,by+h*.058,bx-bw*.72,by+h*.038);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#b7b5a080';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(bx-bw,by);ctx.lineTo(bx+bw,by);ctx.stroke();
    ctx.fillStyle='#0a1a22';ctx.beginPath();ctx.arc(bx+h*.012,by-h*.047,h*.013,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(bx-h*.009,by-h*.031);ctx.lineTo(bx+h*.03,by-h*.033);ctx.lineTo(bx+h*.055,by);ctx.lineTo(bx-h*.03,by);ctx.closePath();ctx.fill();
    if(state.casts>0){ctx.strokeStyle='#dbcda77d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bx-h*.01,by-h*.026);ctx.quadraticCurveTo(w*.64,h*.47,w*.56+(phase==='fight'?Math.sin(t*17)*.008*w:0),h*.675);ctx.stroke();ctx.fillStyle='#e3cb9e';ctx.beginPath();ctx.arc(w*.56+(phase==='fight'?Math.sin(t*17)*.008*w:0),h*.675,3,0,7);ctx.fill();}
  }
  function drawOtherLocation(loc,w,h,hy,t){
    if(loc==='channel'){
      ctx.fillStyle='#0a292ab0';ctx.fillRect(0,hy-8,w,h-hy+8);
      for(let side=0;side<2;side++)for(let i=0;i<33;i++){
        const x=side? w*(.72+i*.009):w*(i*.01),base=h*(.78+(i%7)*.036),height=h*(.16+(i*13%9)*.025),lean=(side?-1:1)*h*.03;
        ctx.strokeStyle=i%3===0?'#5a6e5f':'#1c3d3d';ctx.lineWidth=1.5+(i%3);ctx.beginPath();ctx.moveTo(x,base);ctx.quadraticCurveTo(x+lean*.4,base-height*.5,x+lean,base-height);ctx.stroke();
        if(i%4===0){ctx.fillStyle='#283f36';ctx.beginPath();ctx.ellipse(x+lean,base-height,h*.005,h*.025,-.2,0,7);ctx.fill()}
      }
      const fog=ctx.createLinearGradient(0,hy-h*.13,0,hy+h*.14);fog.addColorStop(0,'#a6b1a000');fog.addColorStop(.5,'#a6b1a022');fog.addColorStop(1,'#a6b1a000');ctx.fillStyle=fog;ctx.fillRect(0,hy-h*.13,w,h*.27);
    }else if(loc==='houses'){
      ctx.fillStyle='#0b2932b0';ctx.fillRect(0,hy-h*.08,w,h*.43);
      for(let i=0;i<6;i++){
        const x=w*(.08+i*.145),span=Math.min(w*.12,h*.18),top=hy-h*(.08+(i%3)*.037);
        ctx.fillStyle=i%2?'#152d36':'#19343c';ctx.fillRect(x,top,span,hy-top+h*.09);
        ctx.beginPath();ctx.moveTo(x-span*.15,top);ctx.lineTo(x+span*.5,top-h*.065);ctx.lineTo(x+span*1.15,top);ctx.closePath();ctx.fill();
        ctx.fillStyle='#bdd0c020';ctx.fillRect(x+span*.3,top+h*.018,span*.15,h*.03);
        ctx.strokeStyle='#a6c1b333';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,hy+h*.11);ctx.lineTo(x+span,hy+h*.11);ctx.stroke();
      }
      let fog=ctx.createLinearGradient(0,hy-h*.06,0,hy+h*.22);fog.addColorStop(0,'#acbbb000');fog.addColorStop(.55,'#acbbb02d');fog.addColorStop(1,'#acbbb000');ctx.fillStyle=fog;ctx.fillRect(0,hy-h*.06,w,h*.28);
    }else if(loc==='beacon'){
      ctx.fillStyle='#0b2630';ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,hy-h*.04);ctx.lineTo(w*.13,hy-h*.1);ctx.lineTo(w*.3,hy-h*.035);ctx.lineTo(w*.43,hy+h*.14);ctx.lineTo(w*.52,h);ctx.closePath();ctx.fill();
      const bx=w*.38,by=hy-h*.055,bw=Math.max(15,Math.min(w*.033,h*.045)),top=by-h*.31;
      ctx.fillStyle='#183039';ctx.beginPath();ctx.moveTo(bx-bw,by);ctx.lineTo(bx-bw*.55,top);ctx.lineTo(bx+bw*.55,top);ctx.lineTo(bx+bw,by);ctx.closePath();ctx.fill();
      ctx.fillStyle='#0b202a';ctx.fillRect(bx-bw*.9,top-h*.018,bw*1.8,h*.025);ctx.fillRect(bx-bw*.6,top-h*.04,bw*1.2,h*.02);
      const lightY=top-h*.005,angle=Math.sin(t*.28)*.24,beam=ctx.createLinearGradient(bx,lightY,w*.92,lightY+h*.13);beam.addColorStop(0,'#e7d8a474');beam.addColorStop(1,'#e7d8a400');ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(bx,lightY);ctx.lineTo(w*.95,h*(.31+angle));ctx.lineTo(w*.95,h*(.41+angle));ctx.closePath();ctx.fill();
      ctx.fillStyle='#e8d4a2';ctx.fillRect(bx-bw*.37,top-h*.012,bw*.74,h*.011);
    }else if(loc==='gate'){
      ctx.fillStyle='#0b252ed1';ctx.fillRect(0,hy-h*.17,w,h*.57);
      ctx.fillStyle='#203a43';ctx.fillRect(w*.11,hy-h*.23,w*.78,h*.43);ctx.fillStyle='#142d37';ctx.fillRect(w*.14,hy-h*.19,w*.72,h*.36);
      const open=state.ending==='open',sealed=state.ending==='seal';
      if(open){
        const passage=ctx.createLinearGradient(0,hy-h*.15,0,hy+h*.24);passage.addColorStop(0,'#e9d3a0');passage.addColorStop(1,'#6f7d70');ctx.fillStyle=passage;ctx.beginPath();ctx.moveTo(w*.34,hy+h*.22);ctx.lineTo(w*.34,hy-h*.06);ctx.quadraticCurveTo(w*.5,hy-h*.19,w*.66,hy-h*.06);ctx.lineTo(w*.66,hy+h*.22);ctx.closePath();ctx.fill();
        ctx.fillStyle='#384a46';ctx.beginPath();ctx.moveTo(w*.41,hy+h*.21);ctx.lineTo(w*.47,hy+h*.01);ctx.lineTo(w*.53,hy+h*.01);ctx.lineTo(w*.59,hy+h*.21);ctx.fill();
        for(let i=0;i<5;i++){const x=w*(.42+i*.04);ctx.fillStyle='#344942';ctx.fillRect(x,hy-h*.035-(i%2)*h*.015,w*.026,h*.045);ctx.beginPath();ctx.moveTo(x-w*.004,hy-h*.035-(i%2)*h*.015);ctx.lineTo(x+w*.013,hy-h*.064-(i%2)*h*.015);ctx.lineTo(x+w*.03,hy-h*.035-(i%2)*h*.015);ctx.fill()}
      }else{ctx.fillStyle='#081e28';ctx.beginPath();ctx.moveTo(w*.33,hy+h*.22);ctx.lineTo(w*.33,hy-h*.06);ctx.quadraticCurveTo(w*.5,hy-h*.2,w*.67,hy-h*.06);ctx.lineTo(w*.67,hy+h*.22);ctx.closePath();ctx.fill();}
      ctx.strokeStyle='#9db9af66';ctx.lineWidth=Math.max(2,w*.003);ctx.beginPath();ctx.arc(w*.5,hy+h*.065,Math.min(w*.17,h*.17),Math.PI,0);ctx.stroke();
      const halo=ctx.createRadialGradient(w*.5,hy+h*.06,2,w*.5,hy+h*.06,w*.22);halo.addColorStop(0,open?'#efda9977':sealed?'#87d5ce8c':'#87bfc063');halo.addColorStop(1,'#87bfc000');ctx.fillStyle=halo;ctx.fillRect(w*.2,hy-h*.24,w*.6,h*.6);
      if(sealed){for(let i=0;i<11;i++){const x=w*(.39+(i%4)*.07),y=hy-h*.065+Math.floor(i/4)*h*.065+Math.sin(t*1.6+i)*h*.007;ctx.fillStyle='#b5e9d2';ctx.globalAlpha=.35+.35*Math.sin(t+i)**2;ctx.beginPath();ctx.arc(x,y,2.5+(i%3),0,7);ctx.fill()}ctx.globalAlpha=1;}
      for(let i=0;i<8;i++){ctx.strokeStyle='#a5d0c17a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w*(.24+i*.074),hy+h*.03);ctx.lineTo(w*(.24+i*.074),hy+h*.12);ctx.stroke()}
    }
    if(loc!=='gate')drawBoat(w,h,t);
    else{ctx.fillStyle='#081b25';ctx.beginPath();ctx.moveTo(w*.8,h);ctx.lineTo(w*.83,h*.79);ctx.lineTo(w,h*.78);ctx.lineTo(w,h);ctx.fill()}
  }
  function drawScene(now){
    const w=width,h=height,hy=h*.565,t=now*.001,loc=state.location;
    let sky=ctx.createLinearGradient(0,0,0,hy);const tones={shore:['#101c2a','#334b59','#6e7773','#b3987e'],channel:['#0b1f25','#21423e','#55766b','#7a9181'],houses:['#101d2b','#2a4551','#66767a','#9a998e'],beacon:['#0b1726','#283e52','#5b6876','#ad9f8d'],gate:['#071522','#183840','#376064','#668d88']}[loc];sky.addColorStop(0,tones[0]);sky.addColorStop(.43,tones[1]);sky.addColorStop(.75,tones[2]);sky.addColorStop(1,tones[3]);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    let glow=ctx.createRadialGradient(w*.66,h*.34,8,w*.66,h*.34,w*.44);glow.addColorStop(0,'#e3b7974d');glow.addColorStop(1,'#e3b79700');ctx.fillStyle=glow;ctx.fillRect(0,0,w,hy);
    for(const s of stars){const a=Math.max(0,.37+s.r*.14+Math.sin(t*.8+s.p)*.18);ctx.fillStyle=`rgba(238,231,213,${a})`;ctx.beginPath();ctx.arc(w*s.x,h*s.y,s.r,0,7);ctx.fill();}
    let mx=w*.71,my=h*.22,moonR=Math.max(16,Math.min(w,h)*.027);let halo=ctx.createRadialGradient(mx,my,moonR*.4,mx,my,moonR*6);halo.addColorStop(0,'#f7dcb57a');halo.addColorStop(.28,'#f7dcb525');halo.addColorStop(1,'#f7dcb500');ctx.fillStyle=halo;ctx.fillRect(mx-moonR*6,my-moonR*6,moonR*12,moonR*12);ctx.fillStyle='#eee0c2';ctx.beginPath();ctx.arc(mx,my,moonR,0,7);ctx.fill();
    hill(hy-35,h*.075,'#334d53',1.7);hill(hy-10,h*.055,'#263f46',3.8);hill(hy+8,h*.036,'#1b363e',5.3);
    const water=ctx.createLinearGradient(0,hy,0,h);water.addColorStop(0,loc==='gate'?'#1d4950':loc==='channel'?'#214744':'#294750');water.addColorStop(.4,loc==='gate'?'#15343f':'#193540');water.addColorStop(1,'#0b1d28');ctx.fillStyle=water;ctx.fillRect(0,hy,w,h-hy);
    let reflection=ctx.createLinearGradient(0,hy,0,h);reflection.addColorStop(0,'#e5b6973b');reflection.addColorStop(.32,'#e3b7931b');reflection.addColorStop(1,'#e3b79300');ctx.fillStyle=reflection;ctx.beginPath();ctx.moveTo(w*.62,hy);ctx.lineTo(w*.76,hy);ctx.lineTo(w*.89,h);ctx.lineTo(w*.43,h);ctx.fill();
    const lineCount=Math.min(260,Math.round(h*.28));for(let i=0;i<lineCount;i++){let y=hy+(i+.5)/(lineCount)* (h-hy),p=(y-hy)/(h-hy),offset=Math.sin(i*9.23+t*.36)*w*.035;let x=w*(.69+offset/w);let len=(.012+p*.08)*w*(.3+.7*Math.abs(Math.sin(i*13.4+t*.7)));ctx.strokeStyle=`rgba(234,201,169,${(.16*(1-p))*(.45+.55*Math.sin(i*4.8+t)**2)})`;ctx.lineWidth=p*1.5+.3;ctx.beginPath();ctx.moveTo(x-len/2,y);ctx.lineTo(x+len/2,y);ctx.stroke();}
    for(let i=0;i<95;i++){let x=((i*127.17)%w),y=hy+(i*37.7)%(h-hy),len=8+(i*11)%34;ctx.strokeStyle=`rgba(185,207,197,${.015+.027*(Math.sin(i*7+t*.5)**2)})`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x+Math.sin(t+i)*2,y);ctx.lineTo(x+len,y);ctx.stroke();}
    // Distant shoreline and trees
    ctx.fillStyle='#142e34';ctx.beginPath();ctx.moveTo(0,hy+2);for(let x=0;x<=w;x+=8){let y=hy-6-Math.sin(x/w*11+1)*4;ctx.lineTo(x,y)}ctx.lineTo(w,hy+13);ctx.lineTo(0,hy+13);ctx.fill();
    for(let i=0;i<34;i++){let x=(i/33)*w,y=hy-1,size=h*(.025+((i*17)%9)*.003);if(x>w*.37&&x<w*.8)size*=.55;drawPine(x,y,size,.72)}
    if(loc==='shore'){
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
    if(state.casts>0){let q=Math.min(1,(now-castAt)/750),bx=w*(.665+(.56-.665)*q),by=h*(.425+(.675-.425)*q);if(now-castAt<850){bx+=Math.sin(t*11)*2;by+=Math.sin(t*8)*2}if(phase==='fight'||phase==='bite'){bx+=Math.sin(t*17)*7;by+=Math.sin(t*10)*3}ctx.strokeStyle='#e4d8b18c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tipX,tipY);ctx.quadraticCurveTo(w*.68,h*.6,bx,by);ctx.stroke();ctx.fillStyle='#dec9a1';ctx.beginPath();ctx.ellipse(bx,by,3.5,6,Math.sin(t*3)*.15,0,7);ctx.fill();}
    }else drawOtherLocation(loc,w,h,hy,t);
    if(phase==='fight'){const sx=w*(.56+Math.sin(t*17)*.008),sy=h*.675;ctx.strokeStyle='#cfdfcc8a';ctx.lineWidth=1.4;for(let i=0;i<3;i++){const lift=(Math.sin(t*13+i*2.1)+1)*9;ctx.beginPath();ctx.moveTo(sx+(i-1)*13,sy-3);ctx.quadraticCurveTo(sx+(i-1)*17,sy-12-lift,sx+(i-1)*20,sy-15-lift*.4);ctx.stroke();}}
    for(const r of ripples){let a=Math.max(0,1-r.age/2.1),rx=(12+r.age*39)*r.power;ctx.strokeStyle=`rgba(193,211,197,${a*.36})`;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(r.x*w,r.y*h,rx,rx*.2,0,0,7);ctx.stroke();}
    for(const m of motes){let x=m.x*w+Math.sin(t*.4+m.p)*14,y=m.y*h+Math.sin(t*.7+m.p)*5;ctx.fillStyle=`rgba(204,219,200,${.13*m.s*(1+Math.sin(t*1.3+m.p))})`;ctx.beginPath();ctx.arc(x,y,1.1*m.s,0,7);ctx.fill();}
  }
  function frame(now){
    const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
    if(phase==='aiming')$('aim-marker').style.left=`${aimPosition(now)*100}%`;
    if(phase==='bite'){
      const remaining=Math.max(0,biteDeadline-now);$('bite-fill').style.width=`${Math.min(100,remaining/(state.location==='shore'?1550:1250)*100)}%`;
      if(remaining<=0)fail('입질을 놓쳤습니다 · 다시 던져보세요');
    }
    if(phase==='fight'&&fight){
      const f=fight;if(now>=f.surgeAt){f.tension=Math.min(100,f.tension+(holding?22:9)*f.strength);f.progress=Math.max(0,f.progress-2.5*f.strength);f.surgeAt=now+1150+Math.random()*600;addRipple(.56,.675,1.8);playTone(260,.11,'triangle',.025)}
      if(holding){f.progress=Math.min(100,f.progress+dt*(60-f.strength*5)*(1-f.tension/320));f.tension=Math.min(100,f.tension+dt*(36+f.strength*8));f.slack=Math.max(0,f.slack-dt*2);}
      else{f.tension=Math.max(0,f.tension-dt*62);f.progress=Math.max(0,f.progress-dt*(15+f.strength*3));f.slack=f.tension<12?f.slack+dt:Math.max(0,f.slack-dt*.5)}
      f.danger=f.tension>89?f.danger+dt:Math.max(0,f.danger-dt*1.2);
      $('fight-fill').style.width=`${f.progress}%`;$('fight-percent').textContent=`${Math.floor(f.progress)}%`;
      $('tension-fill').style.width=`${f.tension}%`;$('tension-fill').classList.toggle('danger',f.tension>82);
      $('tension-hint').textContent=f.tension>82?'줄이 끊어지기 직전입니다':f.tension<18?'줄이 느슨합니다 · 바로 감으세요':!holding?'줄이 빠르게 풀리고 있습니다':f.surgeAt-now<350?'몸을 튑니다 · 잠시 놓으세요':'누르고 떼며 조절하세요';
      if(f.danger>.38)fail('줄이 끊어졌습니다 · 힘을 나눠 쓰세요');
      else if(f.slack>.6)fail('줄이 느슨해져 물고기가 빠져나갔습니다');
      else if(now-f.start>23000)fail('물고기가 깊은 곳으로 달아났습니다');
      else if(f.progress>=100)finishCatch();
    }
    if(now>nextRipple){addRipple(.56,.675,.55);nextRipple=now+950+Math.random()*800}
    for(let i=ripples.length-1;i>=0;i--){ripples[i].age+=dt;if(ripples[i].age>2.1)ripples.splice(i,1)}
    drawScene(now);requestAnimationFrame(frame);
  }
  function netTick(){if(!state.flags.net)return;const elapsed=Math.max(0,Date.now()-state.lastTick),cycles=Math.min(260,Math.floor(elapsed/7000));if(!cycles)return;state.fish+=cycles*(state.flags.net2?2:1);state.lastTick+=cycles*7000;save();renderWork();}
  $('action').addEventListener('click',()=>{if(suppressFightClick||performance.now()<ignoreClickUntil)return;if(phase==='idle')beginAim();else if(phase==='aiming')releaseAim();else if(phase==='bite')hook()});
  $('action').addEventListener('pointerdown',e=>{if(phase==='fight'){holding=true;suppressFightClick=true;$('action').setPointerCapture(e.pointerId);e.preventDefault()}});
  $('action').addEventListener('pointerup',()=>{holding=false;setTimeout(()=>suppressFightClick=false,0)});$('action').addEventListener('pointercancel',()=>{holding=false;suppressFightClick=false});
  window.addEventListener('pointerup',()=>holding=false);window.addEventListener('blur',()=>holding=false);
  $('work-actions').addEventListener('click',e=>{const b=e.target.closest('[data-work]');if(b)craft(b.dataset.work)});
  $('map-actions').addEventListener('click',e=>{const b=e.target.closest('[data-place]');if(b)travel(b.dataset.place)});
  $('work-open').addEventListener('click',openWork);$('work-close').addEventListener('click',closeWork);
  $('journal-open').addEventListener('click',openJournal);$('journal-close').addEventListener('click',closeJournal);$('scrim').addEventListener('click',()=>{if(journalOpen)closeJournal();if(workOpen)closeWork()});
  $('sound').addEventListener('click',toggleSound);$('story-actions').addEventListener('click',e=>{const b=e.target.closest('[data-story-choice]');if(b)closeStory(b.dataset.storyChoice)});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(storyOpen){closeStory('continue');return}if(journalOpen)closeJournal();else if(workOpen)closeWork();return}
    if(e.code!=='Space')return;
    if(phase==='fight'){e.preventDefault();holding=true;return}
    if(e.repeat||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)||workOpen||journalOpen)return;
    if(document.activeElement?.id==='action'||storyOpen)return;
    e.preventDefault();if(phase==='idle')beginAim();else if(phase==='aiming')releaseAim();else if(phase==='bite')hook();
  });
  document.addEventListener('keyup',e=>{if(e.code==='Space')holding=false});
  window.addEventListener('resize',resize);resize();render();showNextStory();netTick();setInterval(netTick,1000);requestAnimationFrame(frame);
})();
