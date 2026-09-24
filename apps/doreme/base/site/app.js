(() => {
  'use strict';
  const tracks = window.DOREMI_TRACKS || [];
  const byId = new Map(tracks.map(track => [track.id, track]));
  const $ = id => document.getElementById(id);
  const audio = $('audio');
  const state = { filter: '전체', query: '', favorites: readStored('doremi:favorites', []), queue: [], index: -1, shuffle: false, repeat: 'off', sleepMinutes: 0, sleepTimer: null, messageTimer: null };
  const moodLists = {
    calm: ['swan-2', 'piano-2', 'nutcracker-flowers', 'symphony-6-2', 'symphony-6-4'],
    bright: ['swan-waltz', 'swan-cygnets', 'nutcracker-fairy', 'swan-czardas', 'piano-3'],
    deep: ['piano-1', 'romeo', 'symphony-6-1', 'symphony-6-3', '1812'],
  };
  function readStored(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private browsing */ } }
  function escapeText(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  function coverClass(category) { return {발레:'ballet',협주곡:'concerto',교향곡:'symphony',관현악:'orchestra'}[category] || 'ballet'; }
  function cover(track) { return `<div class="cover cover-${coverClass(track.category)}" aria-hidden="true"><span>${track.category === '발레' ? '✳' : track.category === '협주곡' ? '♪' : track.category === '교향곡' ? '◉' : '✦'}</span></div>`; }
  function visibleTracks() { const q = state.query.trim().toLocaleLowerCase(); return tracks.filter(track => (state.filter === '전체' || (state.filter === '즐겨찾기' ? state.favorites.includes(track.id) : track.category === state.filter)) && (!q || [track.work,track.movement,track.english,track.category,track.mood].some(value => value.toLocaleLowerCase().includes(q)))); }
  function current() { return byId.get(state.queue[state.index]); }
  function formatTime(seconds) { if (!Number.isFinite(seconds)) return '0:00'; const n = Math.max(0, Math.floor(seconds)); return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; }
  function message(text) { const element = $('player-message'); element.textContent = text; element.hidden = false; clearTimeout(state.messageTimer); state.messageTimer = setTimeout(() => { element.hidden = true; }, 4500); }
  function render() {
    const visible = visibleTracks();
    $('total-count').textContent = tracks.length;
    $('favorite-count').textContent = state.favorites.length;
    $('result-count').textContent = `${visible.length}곡의 음악`;
    $('empty-state').hidden = visible.length > 0;
    $('play-visible').disabled = visible.length === 0;
    $('track-list').innerHTML = visible.map((track, index) => `<article class="track-row ${current()?.id === track.id ? 'is-current' : ''}" data-id="${escapeText(track.id)}"><span class="track-number">${String(index+1).padStart(2,'0')}</span>${cover(track)}<button class="track-info" data-action="play" type="button" aria-label="${escapeText(track.work + ' ' + track.movement)} 재생"><strong>${escapeText(track.work)} · ${escapeText(track.movement)}</strong><small>${escapeText(track.english)}</small></button><span class="track-mood">${escapeText(track.mood)}</span><div class="track-actions"><button class="round-icon ${state.favorites.includes(track.id) ? 'is-favorite' : ''}" data-action="favorite" type="button" aria-label="${state.favorites.includes(track.id) ? '즐겨찾기 취소' : '즐겨찾기 추가'}" title="즐겨찾기">${state.favorites.includes(track.id) ? '♥' : '♡'}</button><button class="round-icon track-play" data-action="play" type="button" aria-label="${escapeText(track.work + ' ' + track.movement)} 재생">${current()?.id === track.id && !audio.paused ? 'Ⅱ' : '▶'}</button></div></article>`).join('');
    document.querySelectorAll('.filter').forEach(button => { const active = button.dataset.filter === state.filter; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    updatePlayer(); renderQueue();
  }
  function updatePlayer() {
    const track = current();
    $('player').hidden = !track;
    if (!track) return;
    $('now-title').textContent = `${track.work} · ${track.movement}`;
    $('now-subtitle').textContent = track.english;
    $('toggle-play').textContent = audio.paused ? '▶' : 'Ⅱ';
    $('toggle-play').setAttribute('aria-label', audio.paused ? '재생' : '일시정지');
    const liked = state.favorites.includes(track.id);
    $('player-favorite').textContent = liked ? '♥' : '♡';
    $('player-favorite').classList.toggle('active', liked);
    $('player-favorite').setAttribute('aria-label', liked ? '즐겨찾기 취소' : '즐겨찾기 추가');
    $('shuffle').classList.toggle('active', state.shuffle);
    $('shuffle').setAttribute('aria-pressed', String(state.shuffle));
    $('repeat').classList.toggle('active', state.repeat !== 'off');
    $('repeat').textContent = state.repeat === 'one' ? '↺₁' : '↻';
    $('repeat').title = `반복 ${state.repeat === 'off' ? '끔' : state.repeat === 'all' ? '전체' : '한 곡'}`;
    $('repeat').setAttribute('aria-label', $('repeat').title);
    $('speed').textContent = `${audio.playbackRate}×`;
    $('sleep').classList.toggle('active', state.sleepMinutes > 0);
    $('sleep').title = state.sleepMinutes ? `${state.sleepMinutes}분 뒤 일시정지` : '취침 타이머';
    const duration = audio.duration || 0;
    $('current-time').textContent = formatTime(audio.currentTime);
    $('duration').textContent = formatTime(duration);
    $('seek').value = duration ? Math.round(audio.currentTime / duration * 1000) : 0;
    $('seek').style.setProperty('--progress', `${duration ? audio.currentTime / duration * 100 : 0}%`);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({title: `${track.work} · ${track.movement}`, artist: 'Pyotr Ilyich Tchaikovsky', album: 'DOREMI'});
      navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
    }
  }
  function renderQueue() {
    $('queue-count').textContent = `${state.queue.length}곡`;
    $('queue-list').innerHTML = state.queue.map((id, index) => {
      const track = byId.get(id); if (!track) return '';
      return `<div class="queue-item ${index === state.index ? 'current' : ''}" data-index="${index}">${cover(track)}<div class="queue-item-content"><button type="button" data-action="jump"><strong>${escapeText(track.work)} · ${escapeText(track.movement)}</strong><small>${escapeText(track.english)}</small></button><a href="${escapeText(track.source)}" target="_blank" rel="noopener noreferrer" title="음원 출처 및 라이선스">${escapeText(track.license === 'CC BY 3.0' ? `${track.attribution} · ${track.license}` : `음원 출처 · ${track.license}`)} ↗</a></div><span>${index === state.index ? '♫' : String(index+1).padStart(2,'0')}</span></div>`;
    }).join('');
  }
  async function loadAndPlay(index) {
    if (index < 0 || index >= state.queue.length) return;
    state.index = index;
    const track = current();
    if (!track) return;
    audio.src = track.src;
    audio.load();
    render();
    try { await audio.play(); } catch (error) { if (error.name !== 'AbortError') message('자동 재생이 차단되었거나 음원을 불러오지 못했습니다. 재생 버튼을 눌러주세요.'); }
    updatePlayer();
  }
  function playList(ids, startId = ids[0]) {
    state.queue = ids.filter(id => byId.has(id));
    if (!state.queue.length) return;
    loadAndPlay(Math.max(0, state.queue.indexOf(startId)));
  }
  function togglePlay() { if (!current()) { playList(tracks.map(t => t.id)); return; } if (audio.paused) audio.play().catch(() => message('음원을 재생할 수 없습니다. 다른 곡을 선택해보세요.')); else audio.pause(); }
  function next(automatic = false) {
    if (!state.queue.length) return;
    if (automatic && state.repeat === 'one') { audio.currentTime = 0; audio.play().catch(() => {}); return; }
    let nextIndex = state.index + 1;
    if (nextIndex >= state.queue.length) { if (state.repeat === 'all' || !automatic) nextIndex = 0; else { audio.pause(); updatePlayer(); return; } }
    loadAndPlay(nextIndex);
  }
  function previous() { if (audio.currentTime > 3) { audio.currentTime = 0; return; } loadAndPlay(state.index > 0 ? state.index - 1 : state.queue.length - 1); }
  function toggleFavorite(id) { if (!id) return; state.favorites = state.favorites.includes(id) ? state.favorites.filter(item => item !== id) : [...state.favorites,id]; save('doremi:favorites',state.favorites); render(); }
  function shuffleQueue() { if (!state.queue.length) return; const now = current()?.id; const rest = state.queue.filter(id => id !== now); for (let i=rest.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [rest[i],rest[j]]=[rest[j],rest[i]]; } state.queue = [now,...rest]; state.index = 0; render(); }
  function setQueueOpen(open) { $('queue-panel').classList.toggle('open', open); $('queue-panel').setAttribute('aria-hidden', String(!open)); $('queue-backdrop').hidden = !open; $('queue-toggle').setAttribute('aria-expanded', String(open)); if (open) $('queue-close').focus(); else $('queue-toggle').focus(); }
  function cycleSleep() { const choices=[0,15,30,60]; state.sleepMinutes = choices[(choices.indexOf(state.sleepMinutes)+1)%choices.length]; clearTimeout(state.sleepTimer); if (state.sleepMinutes) { state.sleepTimer=setTimeout(() => { audio.pause(); state.sleepMinutes=0; updatePlayer(); message('취침 타이머가 끝나 재생을 멈췄습니다.'); },state.sleepMinutes*60000); message(`${state.sleepMinutes}분 뒤 재생을 멈춥니다.`); } else message('취침 타이머를 껐습니다.'); updatePlayer(); }
  $('filters').addEventListener('click', event => { const button=event.target.closest('[data-filter]'); if (!button) return; state.filter=button.dataset.filter; render(); });
  $('search').addEventListener('input', event => { state.query=event.target.value; render(); });
  $('track-list').addEventListener('click', event => { const button=event.target.closest('[data-action]'); const row=event.target.closest('[data-id]'); if (!button || !row) return; if (button.dataset.action === 'favorite') toggleFavorite(row.dataset.id); else { if (current()?.id === row.dataset.id) togglePlay(); else playList(visibleTracks().map(t => t.id),row.dataset.id); } });
  $('queue-list').addEventListener('click', event => { const button=event.target.closest('[data-action="jump"]'); if (button) loadAndPlay(Number(button.closest('[data-index]').dataset.index)); });
  document.querySelectorAll('[data-mood]').forEach(button => button.addEventListener('click',() => playList(moodLists[button.dataset.mood])));
  $('hero-play').addEventListener('click',() => playList(moodLists.calm));
  $('play-visible').addEventListener('click',() => playList(visibleTracks().map(t => t.id)));
  $('favorite-shortcut').addEventListener('click',() => { state.filter='즐겨찾기'; $('discover').scrollIntoView({behavior:'smooth'}); render(); });
  $('reset-filters').addEventListener('click',() => { state.filter='전체';state.query='';$('search').value='';render(); });
  $('toggle-play').addEventListener('click',togglePlay); $('previous').addEventListener('click',previous); $('next').addEventListener('click',() => next(false));
  $('player-favorite').addEventListener('click',() => toggleFavorite(current()?.id));
  $('shuffle').addEventListener('click',() => { state.shuffle=!state.shuffle; if (state.shuffle) shuffleQueue(); else updatePlayer(); });
  $('queue-shuffle').addEventListener('click',() => { state.shuffle=true;shuffleQueue(); });
  $('repeat').addEventListener('click',() => { state.repeat={off:'all',all:'one',one:'off'}[state.repeat];updatePlayer(); });
  $('speed').addEventListener('click',() => { const options=[1,1.25,1.5,0.75];audio.playbackRate=options[(options.indexOf(audio.playbackRate)+1)%options.length];updatePlayer(); });
  $('sleep').addEventListener('click',cycleSleep);
  $('seek').addEventListener('input',event => { if (Number.isFinite(audio.duration)) audio.currentTime=Number(event.target.value)/1000*audio.duration; });
  $('volume').addEventListener('input',event => { audio.volume=Number(event.target.value)/100;save('doremi:volume',audio.volume); });
  $('queue-toggle').addEventListener('click',() => setQueueOpen(true));$('queue-close').addEventListener('click',() => setQueueOpen(false));$('queue-backdrop').addEventListener('click',() => setQueueOpen(false));
  audio.addEventListener('timeupdate',updatePlayer);audio.addEventListener('loadedmetadata',updatePlayer);audio.addEventListener('play',render);audio.addEventListener('pause',render);audio.addEventListener('ended',() => next(true));
  audio.addEventListener('error',() => { if (audio.src) message('이 음원을 불러오지 못했습니다. 다른 곡을 선택하거나 잠시 후 다시 시도해주세요.'); });
  document.addEventListener('keydown',event => { if (event.key === 'Escape' && $('queue-panel').classList.contains('open')) setQueueOpen(false); if (['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName)) return; if (event.code === 'Space') { event.preventDefault();togglePlay(); } else if (event.key === 'ArrowRight' && current()) audio.currentTime=Math.min(audio.duration || 0,audio.currentTime+10); else if (event.key === 'ArrowLeft' && current()) audio.currentTime=Math.max(0,audio.currentTime-10); });
  if ('mediaSession' in navigator) { navigator.mediaSession.setActionHandler('play',() => audio.play());navigator.mediaSession.setActionHandler('pause',() => audio.pause());navigator.mediaSession.setActionHandler('previoustrack',previous);navigator.mediaSession.setActionHandler('nexttrack',() => next(false));navigator.mediaSession.setActionHandler('seekbackward',() => audio.currentTime=Math.max(0,audio.currentTime-10));navigator.mediaSession.setActionHandler('seekforward',() => audio.currentTime=Math.min(audio.duration || 0,audio.currentTime+10)); }
  audio.volume=Math.max(0,Math.min(1,Number(readStored('doremi:volume',0.8)) || 0));$('volume').value=audio.volume*100;
  render();
})();
