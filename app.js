/* ============================================================
   THE CASE FILES — app.js
   Sections:
   1. Particles
   2. State & Constants
   3. Helpers
   4. Persistence
   5. CRUD (add / toggle / remove)
   6. Filters
   7. Render
   8. Init
   ============================================================ */


/* ── 1. Particles ─────────────────────────────────────────── */

(function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    const ctx    = canvas.getContext('2d');

    const COLORS   = ['rgba(201,168,76,', 'rgba(138,110,42,', 'rgba(180,148,60,'];
    const MAX      = 55;

    let W, H, particles = [];

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function makeParticle(fromTop) {
        const col = COLORS[Math.floor(Math.random() * COLORS.length)];
        return {
            x:          Math.random() * (W || window.innerWidth),
            y:          fromTop ? -10 - Math.random() * (H || window.innerHeight) * 0.3 : Math.random() * (H || window.innerHeight),
            r:          0.6 + Math.random() * 1.6,
            speed:      0.25 + Math.random() * 0.55,
            drift:      (Math.random() - 0.5) * 0.18,
            alpha:      0.15 + Math.random() * 0.5,
            alphaDir:   Math.random() > 0.5 ? 1 : -1,
            alphaDelta: 0.001 + Math.random() * 0.003,
            col,
            shape:      Math.random() > 0.72 ? 'diamond' : 'circle',
        };
    }

    function drawCircle(p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.col + p.alpha + ')';
        ctx.fill();
    }

    function drawDiamond(p) {
        const s = p.r * 1.8;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = p.col + (p.alpha * 0.7) + ')';
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
    }

    function loop() {
        ctx.clearRect(0, 0, W, H);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            // breathing alpha
            p.alpha += p.alphaDelta * p.alphaDir;
            if (p.alpha >= 0.65 || p.alpha <= 0.08) p.alphaDir *= -1;

            p.y += p.speed;
            p.x += p.drift;

            p.shape === 'diamond' ? drawDiamond(p) : drawCircle(p);

            // respawn when off-screen
            if (p.y > H + 10 || p.x < -20 || p.x > W + 20) {
                particles[i]   = makeParticle(true);
                particles[i].x = Math.random() * W;
            }
        }

        requestAnimationFrame(loop);
    }

    resize();
    particles = Array.from({ length: MAX }, () => makeParticle(false));
    window.addEventListener('resize', resize);
    loop();
})();


/* ── 2. State & Constants ─────────────────────────────────── */

const STORAGE_KEY = 'casefiles_v3';
const MAX_OPEN    = 4;

let cases        = [];
let counter      = 100;
let activeFilter = 'all';


/* ── 3. Helpers ───────────────────────────────────────────── */

function today() {
    return new Date().toISOString().split('T')[0];
}

function isOverdue(c) {
    return !c.done && c.due && c.due < today();
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function priorityLabel(pri) {
    return pri === 'high' ? 'CRITICAL' : pri === 'medium' ? 'STANDARD' : 'MINOR';
}

function shakeForm() {
    const form = document.getElementById('intake-form');
    form.classList.remove('shake');
    void form.offsetWidth; // force reflow so animation retriggers
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 450);
}

function flashUnlock() {
    const form = document.getElementById('intake-form');
    form.classList.add('unlock-flash');
    setTimeout(() => form.classList.remove('unlock-flash'), 650);
}


/* ── 4. Persistence ───────────────────────────────────────── */

function loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    cases   = data.cases   || [];
    counter = data.counter || 100;
    return true;
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cases, counter }));
}

function loadDefaults() {
    const td = today();
    const yd = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    cases = [
        { id: 1, num: 'CF-101', text: 'Review pull request #42',          done: false, pri: 'high',   due: yd,   ts: 1 },
        { id: 2, num: 'CF-102', text: 'Write unit tests for auth module',  done: false, pri: 'medium', due: td,   ts: 2 },
        { id: 3, num: 'CF-103', text: 'Update project README',             done: true,  pri: 'low',    due: null, ts: 3 },
    ];
    counter = 103;
}


/* ── 5. CRUD ──────────────────────────────────────────────── */

function addCase() {
    const openCases  = cases.filter(c => !c.done);
    const hasOverdue = openCases.some(c => isOverdue(c));

    if (hasOverdue || openCases.length >= MAX_OPEN) {
        shakeForm();
        return;
    }

    const input = document.getElementById('new-task');
    const text  = input.value.trim();
    if (!text) { input.focus(); return; }

    const pri = document.getElementById('new-pri').value;
    const due = document.getElementById('new-due').value || null;

    counter++;
    cases.unshift({
        id:   Date.now(),
        num:  'CF-' + counter,
        text,
        done: false,
        pri,
        due,
        ts:   Date.now(),
    });

    // reset form fields
    input.value = '';
    document.getElementById('new-due').value = '';

    saveToStorage();
    render();
}

function toggleCase(id) {
    const c = cases.find(x => x.id === id);
    if (!c) return;

    const wasOverdue = isOverdue(c);
    c.done = !c.done;

    // flash intake form green when an overdue case gets resolved
    if (wasOverdue && c.done) flashUnlock();

    saveToStorage();
    render();
}

function removeCase(id) {
    cases = cases.filter(x => x.id !== id);
    saveToStorage();
    render();
}


/* ── 6. Filters ───────────────────────────────────────────── */

function setFilter(f, btn) {
    activeFilter = f;
    document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
}

function applyFilter(list) {
    switch (activeFilter) {
        case 'open':     return list.filter(c => !c.done);
        case 'critical': return list.filter(c => c.pri === 'high' && !c.done);
        case 'overdue':  return list.filter(c => isOverdue(c));
        case 'closed':   return list.filter(c => c.done);
        default:         return list;
    }
}


/* ── 7. Render ────────────────────────────────────────────── */

function render() {
    const openAll   = cases.filter(c => !c.done);
    const closedAll = cases.filter(c => c.done);
    const overCount = openAll.filter(c => isOverdue(c)).length;
    const pct       = cases.length ? Math.round(closedAll.length / cases.length * 100) : 0;

    const isLocked = overCount > 0;
    const isFull   = openAll.length >= MAX_OPEN && !isLocked;

    renderStats({ openAll, closedAll, overCount, pct });
    renderSlots({ openAll, overCount, isLocked });
    renderBanners({ isLocked, isFull });
    renderIntakeLock({ isLocked, isFull });
    renderLists({ openAll, closedAll });
}

function renderStats({ openAll, closedAll, overCount, pct }) {
    document.getElementById('s-total').textContent  = cases.length;
    document.getElementById('s-open').textContent   = openAll.length;
    document.getElementById('s-over').textContent   = overCount;
    document.getElementById('s-closed').textContent = closedAll.length;
    document.getElementById('tape-bar').style.width = pct + '%';
    document.getElementById('tape-pct').textContent = pct + '%';
}

function renderSlots({ openAll, overCount, isLocked }) {
    let html = '';
    for (let i = 0; i < MAX_OPEN; i++) {
        const filled  = i < openAll.length;
        const isOvSlot = filled && i < overCount;
        html += `<div class="slot ${filled ? 'filled' : ''} ${isOvSlot ? 'overdue-slot' : ''}"></div>`;
    }
    document.getElementById('slot-dots').innerHTML = html;

    const remaining = MAX_OPEN - openAll.length;
    document.getElementById('slot-status').textContent =
        isLocked      ? '— intake locked' :
            remaining === 0 ? '— full'        :
                `— ${remaining} slot${remaining !== 1 ? 's' : ''} free`;
}

function renderBanners({ isLocked, isFull }) {
    document.getElementById('blocked-banner').classList.toggle('show', isLocked);
    document.getElementById('full-banner').classList.toggle('show', isFull);
}

function renderIntakeLock({ isLocked, isFull }) {
    const locked = isLocked || isFull;
    document.getElementById('intake-form').classList.toggle('locked', locked);
    document.getElementById('open-btn').disabled = locked;
}

function renderLists({ openAll, closedAll }) {
    const fOpen   = applyFilter(openAll);
    const fClosed = applyFilter(closedAll);

    document.getElementById('ct-open').textContent   = fOpen.length;
    document.getElementById('ct-closed').textContent = fClosed.length;

    // hide irrelevant sections based on active filter
    const hideOpen   = activeFilter === 'closed';
    const hideClosed = ['open', 'critical', 'overdue'].includes(activeFilter);
    document.getElementById('open-sec').style.display   = hideOpen   ? 'none' : '';
    document.getElementById('closed-sec').style.display = hideClosed ? 'none' : '';

    renderCaseList('list-open',   fOpen);
    renderCaseList('list-closed', fClosed);
}

function renderCaseList(containerId, items) {
    const el = document.getElementById(containerId);

    if (!items.length) {
        el.innerHTML = '<div class="empty">[ No cases found ]</div>';
        return;
    }

    el.innerHTML = items.map((c, i) => {
        const ov    = isOverdue(c);
        const label = priorityLabel(c.pri);

        return `
      <div class="card p-${c.pri} ${c.done ? 'closed' : ''} ${ov ? 'overdue-card' : ''}"
           style="animation-delay: ${i * 0.04}s">

        <span class="c-num">${c.num}</span>

        <div class="c-body">
          <div class="c-text">${escapeHtml(c.text)}</div>
          <div class="c-meta">
            <span class="c-tag tag-${c.pri}">${label}</span>
            ${c.due ? `<span class="c-due ${ov ? 'ov' : ''}">${c.due}</span>` : ''}
            ${ov    ? `<span class="overdue-label">BLOCKING</span>` : ''}
          </div>
        </div>

        <div class="c-acts">
          <button class="btn-check"
                  title="${c.done ? 'Reopen' : 'Close case'}"
                  onclick="toggleCase(${c.id})">
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path d="M1 4.5L4 7.5L10 1"
                    stroke="currentColor" stroke-width="1.6"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="btn-rm"
                  title="Delete"
                  onclick="removeCase(${c.id})">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1 1l7 7M8 1L1 8"
                    stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round"/>
            </svg>
          </button>
        </div>

      </div>`;
    }).join('');
}


/* ── 8. Init ──────────────────────────────────────────────── */

function init() {
    if (!loadFromStorage()) loadDefaults();

    document.getElementById('hdr-date').textContent =
        new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });

    document.getElementById('new-task').addEventListener('keydown', e => {
        if (e.key === 'Enter') addCase();
    });

    render();
}

init();