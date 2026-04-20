(() => {
    'use strict';
    const TAG = '[stalwart-password]';
    console.log(TAG, 'plugin js loaded');

    const STYLE_ID     = 'stalwart-password-style';
    const FONT_LINK_ID = 'stalwart-password-font';
    const FLOAT_ID     = 'stalwart-password-float';
    const DROP_ITEM_ID = 'stalwart-password-item';
    const PRETENDARD_HREF = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

    const getMinLen = () => {
        try {
            const v = parseInt(rl.pluginSettingsGet('Stalwart Password', 'min_length'), 10);
            if (Number.isFinite(v) && v > 0) return v;
        } catch (_) {}
        return 12;
    };

    const injectFont = () => {
        if (document.getElementById(FONT_LINK_ID)) return;
        const l = document.createElement('link');
        l.id = FONT_LINK_ID;
        l.rel = 'stylesheet';
        l.href = PRETENDARD_HREF;
        document.head.appendChild(l);
    };

    const STYLE = `
        #${FLOAT_ID} {
            position: fixed; right: 22px; bottom: 22px; z-index: 9000;
            width: 44px; height: 44px; padding: 0; border: 0;
            border-radius: 50%;
            background: rgba(17, 24, 39, 0.88);
            color: #fff;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; line-height: 1;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18), 0 2px 4px rgba(0, 0, 0, 0.12);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: transform .15s ease, background .15s ease, box-shadow .15s ease;
        }
        #${FLOAT_ID}:hover {
            transform: translateY(-2px);
            background: #0f172a;
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.14);
        }
        #${FLOAT_ID}:active { transform: translateY(0); }
        #${DROP_ITEM_ID} a { cursor: pointer; }

        .sp-backdrop {
            position: fixed; inset: 0;
            background: rgba(2, 6, 23, 0.55);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            display: grid; place-items: center;
            z-index: 99999;
            animation: sp-fade .18s ease-out;
        }
        @keyframes sp-fade { from { opacity: 0 } to { opacity: 1 } }

        .sp-modal {
            width: 440px; max-width: calc(100vw - 32px);
            background: #ffffff;
            color: #0f172a;
            border-radius: 18px;
            padding: 28px 30px 22px;
            box-shadow:
                0 32px 64px -12px rgba(2, 6, 23, 0.35),
                0 0 0 1px rgba(255, 255, 255, 0.04);
            font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont,
                "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", system-ui, sans-serif;
            letter-spacing: -0.01em;
            animation: sp-rise .24s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes sp-rise {
            from { opacity: 0; transform: translateY(10px) scale(.985); }
            to   { opacity: 1; transform: none; }
        }

        .sp-head {
            display: flex; align-items: center; gap: 12px;
            margin-bottom: 4px;
        }
        .sp-head .sp-logo {
            width: 38px; height: 38px;
            border-radius: 11px;
            display: grid; place-items: center;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: #fff;
            box-shadow: 0 6px 14px rgba(99, 102, 241, 0.35);
        }
        .sp-modal h3 {
            margin: 0;
            font-size: 1.2rem;
            font-weight: 600;
            letter-spacing: -0.02em;
        }
        .sp-sub {
            margin: 6px 0 18px;
            font-size: .85rem;
            color: #64748b;
            line-height: 1.5;
        }

        .sp-modal form { margin: 0; }
        .sp-field { position: relative; margin-bottom: 12px; }
        .sp-field label {
            display: block;
            font-size: .8rem;
            font-weight: 500;
            color: #475569;
            margin-bottom: 6px;
        }
        .sp-field input {
            width: 100%;
            padding: 11px 14px;
            box-sizing: border-box;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #f8fafc;
            font: inherit;
            font-size: .95rem;
            color: #0f172a;
            transition: border-color .15s, background .15s, box-shadow .15s;
        }
        .sp-field input::placeholder { color: #94a3b8; }
        .sp-field input:focus {
            outline: none;
            border-color: #6366f1;
            background: #fff;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.14);
        }
        .sp-field input:disabled { background: #f1f5f9; cursor: default; color: #64748b; }

        .sp-hint {
            font-size: .75rem;
            color: #94a3b8;
            margin: 6px 2px 0;
        }

        .sp-msg {
            min-height: 1.3em;
            margin: 14px 0 0;
            font-size: .85rem;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .sp-msg.sp-err { color: #dc2626; }
        .sp-msg.sp-ok  { color: #16a34a; }

        .sp-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 18px;
        }
        .sp-btn {
            padding: 9px 18px;
            border-radius: 10px;
            border: 1px solid transparent;
            font: inherit;
            font-size: .9rem;
            font-weight: 500;
            cursor: pointer;
            transition: background .15s, border-color .15s, transform .04s;
            display: inline-flex; align-items: center; gap: 6px;
        }
        .sp-btn:active { transform: translateY(1px); }
        .sp-cancel {
            background: #f1f5f9;
            color: #334155;
            border-color: #e2e8f0;
        }
        .sp-cancel:hover { background: #e2e8f0; }
        .sp-primary {
            background: linear-gradient(180deg, #6366f1, #4f46e5);
            color: #fff;
            box-shadow: 0 1px 2px rgba(79, 70, 229, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }
        .sp-primary:hover:not(:disabled) {
            background: linear-gradient(180deg, #4f46e5, #4338ca);
        }
        .sp-btn:disabled { opacity: .65; cursor: default; transform: none; }

        .sp-spinner {
            width: 14px; height: 14px;
            border: 2px solid rgba(255, 255, 255, 0.4);
            border-top-color: #fff;
            border-radius: 50%;
            animation: sp-spin .8s linear infinite;
        }
        @keyframes sp-spin { to { transform: rotate(360deg); } }

        @media (prefers-color-scheme: dark) {
            .sp-modal {
                background: #0f172a;
                color: #e2e8f0;
                box-shadow: 0 32px 64px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
            }
            .sp-sub { color: #94a3b8; }
            .sp-field label { color: #cbd5e1; }
            .sp-field input {
                background: #1e293b;
                border-color: #334155;
                color: #f1f5f9;
            }
            .sp-field input:focus {
                background: #0f172a;
                border-color: #818cf8;
                box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.2);
            }
            .sp-hint { color: #64748b; }
            .sp-cancel { background: #1e293b; color: #e2e8f0; border-color: #334155; }
            .sp-cancel:hover { background: #334155; }
            .sp-field input:disabled { background: #1e293b; color: #64748b; }
        }
    `;

    const injectStyle = () => {
        injectFont();
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = STYLE;
        document.head.appendChild(s);
    };

    const iconCheck = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    const iconX     = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const iconKey   = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`;

    const openModal = (evt) => {
        if (evt && evt.preventDefault) evt.preventDefault();
        if (document.querySelector('.sp-backdrop')) return;

        injectStyle();

        const minLen = getMinLen();
        const backdrop = document.createElement('div');
        backdrop.className = 'sp-backdrop';
        backdrop.innerHTML = `
            <div class="sp-modal" role="dialog" aria-modal="true" aria-labelledby="sp-title">
                <div class="sp-head">
                    <div class="sp-logo">${iconKey}</div>
                    <h3 id="sp-title">비밀번호 변경</h3>
                </div>
                <p class="sp-sub">변경 후에는 새 비밀번호로 다시 로그인해야 합니다.</p>
                <form autocomplete="off" novalidate>
                    <div class="sp-field">
                        <label for="sp-old">현재 비밀번호</label>
                        <input id="sp-old" type="password" name="old" autocomplete="current-password" required>
                    </div>
                    <div class="sp-field">
                        <label for="sp-new">새 비밀번호</label>
                        <input id="sp-new" type="password" name="new" autocomplete="new-password" minlength="${minLen}" required>
                        <div class="sp-hint">최소 ${minLen}자 이상</div>
                    </div>
                    <div class="sp-field">
                        <label for="sp-new2">새 비밀번호 확인</label>
                        <input id="sp-new2" type="password" name="new2" autocomplete="new-password" minlength="${minLen}" required>
                    </div>
                    <div class="sp-msg" role="status"></div>
                    <div class="sp-actions">
                        <button type="button" class="sp-btn sp-cancel">취소</button>
                        <button type="submit" class="sp-btn sp-primary">변경</button>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(backdrop);

        const close = () => {
            removeEventListener('keydown', onKey);
            backdrop.remove();
        };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        addEventListener('keydown', onKey);

        backdrop.querySelector('.sp-cancel').onclick = close;
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

        const form = backdrop.querySelector('form');
        const msg  = backdrop.querySelector('.sp-msg');
        const primary = form.querySelector('.sp-primary');
        const primaryLabel = primary.textContent;

        const setMsg = (text, cls) => {
            msg.className = 'sp-msg' + (cls ? ' sp-' + cls : '');
            msg.innerHTML = '';
            if (cls === 'ok')  msg.insertAdjacentHTML('beforeend', iconCheck + ' ');
            if (cls === 'err') msg.insertAdjacentHTML('beforeend', iconX + ' ');
            msg.appendChild(document.createTextNode(text));
        };

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const oldP = fd.get('old'), newP = fd.get('new'), newP2 = fd.get('new2');
            if (!oldP || !newP) { setMsg('모든 항목을 입력해주세요', 'err'); return; }
            if (newP.length < minLen) { setMsg('새 비밀번호는 최소 ' + minLen + '자 이상이어야 합니다', 'err'); return; }
            if (newP !== newP2) { setMsg('새 비밀번호가 일치하지 않습니다', 'err'); return; }
            if (newP === oldP)  { setMsg('새 비밀번호는 현재 비밀번호와 달라야 합니다', 'err'); return; }

            setMsg('', '');
            primary.disabled = true;
            primary.innerHTML = '<span class="sp-spinner"></span> 변경 중…';

            rl.pluginRemoteRequest((iError, oData) => {
                primary.disabled = false;
                primary.textContent = primaryLabel;
                if (iError) {
                    setMsg('요청 실패 (코드 ' + iError + ')', 'err');
                    return;
                }
                const r = (oData && oData.Result) || oData || {};
                if (r.Result === true) {
                    setMsg(r.Message || '비밀번호가 변경되었습니다. 다시 로그인해주세요.', 'ok');
                    form.querySelectorAll('input').forEach(i => i.disabled = true);
                    primary.disabled = true;
                    backdrop.querySelector('.sp-cancel').textContent = '닫기';
                } else {
                    setMsg(r.Error || '알 수 없는 오류', 'err');
                }
            }, 'ChangePassword', { OldPassword: oldP, NewPassword: newP });
        });

        backdrop.querySelector('#sp-old').focus();
    };

    const ensureFloatingButton = () => {
        if (document.getElementById(FLOAT_ID)) return;
        if (!document.body) return;
        injectStyle();
        const btn = document.createElement('button');
        btn.id = FLOAT_ID;
        btn.type = 'button';
        btn.title = '비밀번호 변경';
        btn.setAttribute('aria-label', '비밀번호 변경');
        btn.innerHTML = iconKey;
        btn.onclick = openModal;
        document.body.appendChild(btn);
        console.log(TAG, 'floating button attached');
    };

    const tryAttachDropdownItem = () => {
        const trigger = document.getElementById('top-system-dropdown-id');
        if (!trigger) return false;
        const menu = trigger.parentElement && trigger.parentElement.querySelector('menu.dropdown-menu, .dropdown-menu');
        if (!menu) return false;
        if (document.getElementById(DROP_ITEM_ID)) return true;

        const li = document.createElement('li');
        li.id = DROP_ITEM_ID;
        li.setAttribute('role', 'presentation');
        const a = document.createElement('a');
        a.href = '#';
        a.tabIndex = -1;
        a.setAttribute('data-icon', '🔑');
        a.textContent = '비밀번호 변경';
        a.addEventListener('click', openModal);
        li.appendChild(a);

        const dividers = menu.querySelectorAll('li.dividerbar');
        const lastDivider = dividers[dividers.length - 1];
        if (lastDivider) menu.insertBefore(li, lastDivider);
        else menu.appendChild(li);
        console.log(TAG, 'dropdown item attached');
        return true;
    };

    const ready = () => typeof rl !== 'undefined' && typeof rl.pluginRemoteRequest === 'function';

    const boot = () => {
        if (!ready()) return false;
        ensureFloatingButton();
        tryAttachDropdownItem();
        return true;
    };

    if (!boot()) {
        const itv = setInterval(() => { if (boot()) clearInterval(itv); }, 500);
    }
    const mo = new MutationObserver(() => { if (ready()) { ensureFloatingButton(); tryAttachDropdownItem(); } });
    if (document.body) mo.observe(document.body, { childList: true, subtree: true });
    else document.addEventListener('DOMContentLoaded', () => mo.observe(document.body, { childList: true, subtree: true }));
})();
