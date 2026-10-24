/* =========================================================
   도욱 — script.js
   1) 화면 전환(주소 끝 #이름)  2) 돌아가는 원  3) 이스터에그
   4) content/data.js(window.SITE)를 읽어 각 페이지를 채운다
   5) 편집 모드 (맨 아래)
   ========================================================= */

/* ===== 조절하기 쉬운 값 ===== */
const PERIOD = 8000;     // 한 바퀴 도는 시간(ms). 작을수록 빠름
const TOLERANCE = 13;    // 원 안에 들어왔다고 인정하는 각도(±도)
const SECRET_CLICKS = 5; // 최근 업데이트를 몇 번 연속 눌러야 불안 페이지가 열리는지
const SECRET_GAP = 600;  // 연속 클릭으로 인정하는 간격(ms)
const ORBIT = { cy: 2410, rx: 1690, ry: 1500 }; // 궤도: 대지(8000×4500) 기준 중심 높이, 가로·세로 반지름

const SITE = window.SITE;
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dot = (iso) => iso.replaceAll('-', '. ');            // 2026-10-11 → 2026. 10. 11
const brs = (s) => esc(s).replaceAll('\n', '<br>');          // 글 속 \n = 원하는 자리에서 줄바꿈
// 편집할 수 있는 글 조각: data-edit에 SITE 안의 위치를 적어 둔다 (예: education.0.plan.1)
const ed = (path, text, tag = 'span', cls = '') =>
  `<${tag}${cls ? ` class="${cls}"` : ''} data-edit="${path}">${brs(text)}</${tag}>`;

/* ---------- 최근 업데이트 ---------- */
function showUpdated() {
  const t = $('#updated-date');
  t.dateTime = SITE.updated;
  t.textContent = dot(SITE.updated.slice(2));               // 26. 10. 11
}
showUpdated();

/* ---------- 페이지 소개 문장 ---------- */
document.querySelectorAll('[data-edit^="intro."]').forEach((el) => {
  el.innerHTML = brs(SITE.intro[el.dataset.edit.slice(6)] || '');
});

/* ---------- 디자인: 작업 하나가 한 화면(16:9) ----------
   목록에는 메인 이미지 한 장 + 왼쪽 위 짧은 소개 + 아래 제목·기간 + 궁금해.
   이미지나 궁금해를 누르면 #work-번호 상세로 들어간다. */
function renderWorks() {
  $('#works').innerHTML = SITE.design.map((w, i) => `
    <article class="work-frame">
      ${ed(`design.${i}.intro`, w.intro || '', 'p', 'work-intro')}
      <a class="work-main" href="#work-${i}"><img src="assets/design/${esc(w.cover)}" alt="${esc(w.title)}" loading="lazy"></a>
      <p class="work-label">${esc(w.title)} <time>${esc(w.period)}</time></p>
      <a class="work-more u-line" href="#work-${i}">궁금해</a>
    </article>`).join('');
}
renderWorks();

/* ---------- 디자인 상세: 제목·기간 → 설명 → 블록들 → 크레딧 ----------
   content/data.js 의 그 작업 "blocks"에 위에서부터 차례로 놓인다. 블록 종류:
   image  { src }                         이미지 한 장
   loop   { src }                         소리 없이 반복되는 짧은 영상
   film   { src, poster }                 소리 있는 영상(누르면 재생)
   frames { frames: [{ src, ms }] }       이미지 여러 장이 정해진 간격으로 넘어가며 반복
   shuffle{ dir, prefix, n, cols, rows, ms, ratio }  격자 이미지가 계속 다른 이미지로 바뀜
   flipgrid { dir, a, b, n, cols, rows }  격자에 a(같이) 그림을 깔고, 칸을 누르면 짝인 b(따로) 그림으로 바뀜
   book   { dir, n, pad, ratio, max, label, toc }    실제 책처럼 좌우로 넘겨 보기
   모든 경로는 assets/design/ 기준. "cap"을 적으면 아래에 한 줄 설명이 붙는다. */
const linkLabel = (l) => l.label || (l.url.includes('instagram.com') ? '인스타그램' : '링크');
const A = (src) => `assets/design/${esc(src)}`;
let workCleanups = [];
function stopWork() { workCleanups.forEach((f) => f()); workCleanups = []; }
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

function blockHTML(bl, w, path, k) {
  const alt = esc(w.title);
  const cap = 'cap' in bl ? ed(`${path}.cap`, bl.cap || '', 'figcaption') : '';
  switch (bl.type) {
    case 'loop':
      return `<figure class="blk"><video src="${A(bl.src)}" muted autoplay loop playsinline preload="auto" aria-label="${alt}"></video>${cap}</figure>`;
    case 'film':
      return `<figure class="blk blk-film"><video src="${A(bl.src)}" ${bl.poster ? `poster="${A(bl.poster)}"` : ''} controls playsinline preload="metadata" aria-label="${alt} 영상"></video>${cap}</figure>`;
    case 'frames':
      return `<figure class="blk" data-blk="frames" data-k="${k}"><img src="${A(bl.frames[0].src)}" alt="${alt}">${cap}</figure>`;
    case 'shuffle':
      return `<figure class="blk blk-shuffle" data-blk="shuffle" data-k="${k}"><div class="shuffle" style="--cols:${bl.cols};--ratio:${bl.ratio}"></div>${cap}</figure>`;
    case 'flipgrid':
      return `<figure class="blk blk-flipgrid" data-blk="flipgrid" data-k="${k}"><div class="flipgrid" style="--cols:${bl.cols};--ratio:${bl.ratio}"></div>${cap}</figure>`;
    case 'book':
      return `<div class="blk-book" data-blk="book" data-k="${k}">${bl.label ? `<button type="button" class="book-label">${esc(bl.label)}</button>` : ''}</div>`;
    default:
      return `<figure class="blk"><img src="${A(bl.src)}" alt="${alt}" loading="lazy">${cap}</figure>`;
  }
}

function renderWork(i) {
  stopWork();
  const w = SITE.design[i];
  const el = $('#work');
  if (!w) { el.innerHTML = '<p>작업을 찾을 수 없습니다. <a class="u-line" href="#design">디자인으로</a></p>'; return; }
  const b = `design.${i}`;
  const blocks = w.blocks && w.blocks.length ? w.blocks : [{ type: 'image', src: w.cover }];
  const links = w.links.filter((l) => l.url).map((l) =>
    `<a class="u-line" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(linkLabel(l))}</a>`).join('');
  // 목록은 최근 작업이 위. '전'은 더 이전 작업, '다음'은 더 최근 작업
  const prev = i < SITE.design.length - 1 ? `#work-${i + 1}` : null;
  const next = i > 0 ? `#work-${i - 1}` : null;
  el.innerHTML = `
    <header class="work-head">
      ${ed(`${b}.title`, w.title, 'h1', 'big work-title')}
      ${ed(`${b}.period`, w.period, 'time')}
    </header>
    ${ed(`${b}.desc`, w.desc, 'p', 'work-summary')}
    ${links ? `<p class="work-links work-links--center">${links}</p>` : ''}
    <div class="work-images">
      ${blocks.map((bl, k) => blockHTML(bl, w, `${b}.blocks.${k}`, k)).join('')}
    </div>
    <section class="credits" aria-label="크레딧">
      <p class="credits-title">${esc(w.title)}</p>
      <dl>${(w.credits || []).map((c, k) =>
        `<div>${ed(`${b}.credits.${k}.role`, c.role, 'dt')}${ed(`${b}.credits.${k}.name`, c.name, 'dd')}</div>`).join('')}</dl>
      <time>${esc(w.period)}</time>
      <svg class="logo-mark credits-logo" aria-hidden="true"><use href="#logo-small"/></svg>
    </section>
    <nav class="post-nav" aria-label="다른 작업">
      <a class="u-line post-prev" href="${prev || '#design'}" ${prev ? '' : 'aria-disabled="true" tabindex="-1"'}>전</a>
      <a class="post-back" href="#design"><span>디자인</span><span>design</span></a>
      <a class="u-line post-next" href="${next || '#design'}" ${next ? '' : 'aria-disabled="true" tabindex="-1"'}>다음</a>
    </nav>`;

  // 움직이는 블록 켜기
  const books = [];
  el.querySelectorAll('[data-blk]').forEach((node) => {
    const bl = blocks[+node.dataset.k];
    if (bl.type === 'frames') startFrames(node, bl);
    if (bl.type === 'shuffle') startShuffle(node, bl, w);
    if (bl.type === 'flipgrid') startFlipGrid(node, bl, w);
    if (bl.type === 'book') books.push(makeBook(node, bl, w));
  });
  // 제목을 누르면 이 페이지의 책들이 모두 첫 장으로
  el.querySelector('.work-title').addEventListener('click', () => {
    if (document.body.classList.contains('is-editing')) return;
    books.forEach((bk) => bk.home());
  });
  workCleanups.push(() => el.querySelectorAll('video').forEach((v) => v.pause()));

  // 크레딧: 스크롤해서 닿으면 한 줄씩 떠오른다
  const parts = el.querySelectorAll('.credits > *, .credits dl > div');
  if (!('IntersectionObserver' in window)) { parts.forEach((p) => p.classList.add('is-in')); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { threshold: 0.6 });
  parts.forEach((p) => io.observe(p));
  workCleanups.push(() => io.disconnect());
}

/* 이미지 여러 장을 정해진 간격(ms)으로 넘기며 반복 */
function startFrames(node, bl) {
  const img = node.querySelector('img');
  bl.frames.forEach((f) => { const im = new Image(); im.src = A(f.src); });   // 미리 불러 두기
  if (reduceMotion.matches) return;
  let k = 0, t = null;
  const tick = () => { k = (k + 1) % bl.frames.length; img.src = A(bl.frames[k].src); t = setTimeout(tick, bl.frames[k].ms); };
  t = setTimeout(tick, bl.frames[0].ms);
  workCleanups.push(() => clearTimeout(t));
}

/* 격자(cols×rows)에 n장 중 일부를 놓고, ms마다 모든 칸을 다른 이미지로 바꾼다 */
function startShuffle(node, bl, w) {
  const grid = node.querySelector('.shuffle');
  const cells = bl.cols * bl.rows;
  const src = (j) => A(`${bl.dir}/${bl.prefix}${String(j).padStart(2, '0')}.jpg`);
  for (let j = 1; j <= bl.n; j++) { const im = new Image(); im.src = src(j); }
  const pick = (avoid) => {            // 겹치지 않게 cells장 고르기. 가능하면 직전과 같은 칸에 같은 그림이 오지 않게
    const pool = [...Array(bl.n).keys()].map((x) => x + 1).sort(() => Math.random() - 0.5);
    const out = [];
    for (let c = 0; c < cells; c++) {
      let at = pool.findIndex((x) => !avoid || x !== avoid[c]);
      if (at < 0) at = 0;
      out.push(pool.splice(at, 1)[0]);
    }
    return out;
  };
  let cur = pick();
  grid.innerHTML = cur.map((j) => `<img src="${src(j)}" alt="">`).join('');
  grid.setAttribute('role', 'img');
  grid.setAttribute('aria-label', `${w.title} 이미지 ${bl.n}장이 계속 바뀌는 격자`);
  if (reduceMotion.matches) return;
  const imgs = [...grid.children];
  const t = setInterval(() => { cur = pick(cur); imgs.forEach((im, c) => { im.src = src(cur[c]); }); }, bl.ms);
  workCleanups.push(() => clearInterval(t));
}

/* 같이 ↔ 따로: 격자에 '같이' 그림을 깔아 두고, 칸을 누르면 그 짝인 '따로' 그림으로 바뀐다(다시 누르면 돌아옴).
   n쌍으로 cols×rows 칸을 채우므로 같은 그림이 여러 번 나오되, 바로 옆·위아래에는 겹치지 않게 놓는다 */
function startFlipGrid(node, bl, w) {
  const grid = node.querySelector('.flipgrid');
  const src = (pre, j) => A(`${bl.dir}/${pre}${String(j).padStart(2, '0')}.${bl.ext || 'jpg'}`);
  for (let j = 1; j <= bl.n; j++) [bl.a, bl.b].forEach((pre) => { const im = new Image(); im.src = src(pre, j); });
  const cells = [];
  for (let r = 0; r < bl.rows; r++) for (let c = 0; c < bl.cols; c++) {
    cells.push((r * bl.cols + Math.floor(r / 2) + c) % bl.n + 1);
  }
  grid.innerHTML = cells.map((j) =>
    `<button type="button" class="fg-cell" data-j="${j}" aria-pressed="false" aria-label="${esc(w.title)} ${j}번, 누르면 따로와 같이가 바뀜"><img src="${src(bl.a, j)}" alt=""></button>`).join('');
  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('.fg-cell');
    if (!cell) return;
    const on = cell.getAttribute('aria-pressed') !== 'true';
    cell.setAttribute('aria-pressed', String(on));
    cell.querySelector('img').src = src(on ? bl.b : bl.a, +cell.dataset.j);
  });
}

/* ---------- 책: 실제 책처럼 좌우로 넘겨 보기 ----------
   첫 장(표지)은 오른쪽에 혼자, 그다음부터 [짝수, 홀수], 쪽 수가 짝수면 마지막 장은 왼쪽에 혼자 */
function spreadsOf(n) {
  const s = [[null, 1]];
  for (let p = 2; p <= n; p += 2) s.push([p, p + 1 <= n ? p + 1 : null]);
  return s;
}
function makeBook(host, bl, w) {
  const spreads = spreadsOf(bl.n);
  const src = (p) => A(`${bl.dir}/p-${String(p).padStart(bl.pad || 2, '0')}.jpg`);
  const name = `${w.title}${bl.label ? ` (${bl.label})` : ''}`;
  let cur = 0;

  const row = document.createElement('div');
  row.className = 'book-row' + (bl.toc ? ' has-toc' : '');
  row.innerHTML = `
    <div class="book-main">
      <div class="bk-frame" style="--max:${bl.max || 1100}px">
      <div class="bk-stage" style="--ratio:${2 * bl.ratio}; --max:${bl.max || 1100}px" tabindex="0" aria-label="${esc(name)}. 좌우 화살표로 넘겨 보세요.">
        <div class="spread"><div class="half l"></div><div class="half r"></div></div>
        <button class="hit prev" type="button" aria-label="앞 장"></button>
        <button class="hit next" type="button" aria-label="다음 장"></button>
      </div>
      </div>
      <nav class="book-nav" aria-label="쪽 이동">
        <button class="prev-t" type="button">전</button>
        <span class="count" aria-live="polite"></span>
        <button class="next-t" type="button">다음</button>
      </nav>
    </div>`;
  host.appendChild(row);

  const stage = row.querySelector('.bk-stage');
  const spread = row.querySelector('.spread');
  const L = row.querySelector('.half.l'), R = row.querySelector('.half.r');
  const count = row.querySelector('.count');
  const btns = { prev: [row.querySelector('.hit.prev'), row.querySelector('.prev-t')], next: [row.querySelector('.hit.next'), row.querySelector('.next-t')] };
  const img = (p) => p ? `<img src="${src(p)}" alt="${esc(name)} ${p}쪽" draggable="false">` : '';
  const warm = (k) => (spreads[k] || []).forEach((p) => { if (p) { const im = new Image(); im.src = src(p); } });
  let tocEl = null;

  function paint(k) {
    const [a, c] = spreads[k];
    L.innerHTML = img(a); R.innerHTML = img(c);
    spread.classList.toggle('is-first', a === null);
    spread.classList.toggle('is-last', c === null && a !== null);
    count.textContent = a && c ? `${a}–${c} / ${bl.n}` : `${a || c} / ${bl.n}`;
    btns.prev.forEach((x) => { x.disabled = k === 0; });
    btns.next.forEach((x) => { x.disabled = k === spreads.length - 1; });
    warm(k + 1); warm(k + 2); warm(k - 1);
    if (tocEl) tocEl.querySelectorAll('button[data-p]').forEach((x) => {
      const p = +x.dataset.p; x.classList.toggle('is-here', p === a || p === c);
    });
  }

  function go(to) {
    if (to === cur || to < 0 || to >= spreads.length) return;
    cur = to; paint(cur);
  }
  const step = (d) => go(cur + d);

  btns.prev.forEach((x) => x.addEventListener('click', () => step(-1)));
  btns.next.forEach((x) => x.addEventListener('click', () => step(1)));
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  let x0 = null;   // 휴대폰: 좌우로 밀어서 넘기기
  stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
  });
  const home = () => go(0);
  const label = host.querySelector('.book-label');
  // 이름은 펼친 책의 왼쪽 쪽 왼끝에 맞춘다
  if (label) { row.querySelector('.bk-frame').prepend(label); label.addEventListener('click', home); }

  // 목차: 책 높이만큼만 보이고, 넘치는 부분은 휠로 내려 본다
  if (bl.toc) {
    const spreadOfPage = (p) => spreads.findIndex(([a, c]) => a === p || c === p);
    const li = (it) => `<li${it.items ? ' class="ch"' : ''}><button type="button" data-p="${it.p}"><span class="t">${esc(it.t)}</span><span class="pg">${it.p}</span></button>${it.items ? `<ol>${it.items.map(li).join('')}</ol>` : ''}</li>`;
    tocEl = document.createElement('nav');
    tocEl.className = 'toc';
    tocEl.setAttribute('aria-label', '목차');
    tocEl.innerHTML = `<p class="toc-h">목차</p><ol class="toc-top">${bl.toc.map(li).join('')}</ol>`;
    row.appendChild(tocEl);
    tocEl.addEventListener('click', (e) => {
      const x = e.target.closest('button[data-p]');
      if (!x) return;
      go(spreadOfPage(+x.dataset.p));
      stage.focus({ preventScroll: true });
    });
    const fit = () => { tocEl.style.height = matchMedia('(max-width: 860px)').matches ? '' : `${stage.offsetHeight}px`; };
    const ro = new ResizeObserver(fit); ro.observe(stage); fit();
    workCleanups.push(() => ro.disconnect());
  }

  paint(0);
  return { home, go };
}

/* ---------- 교육: 목록(썸네일 + 기본 정보) → 누르면 #lesson-번호 로 상세 ---------- */
const lessonDate = (l) => esc(l.date.replaceAll('.', '. '));
const lessonBlock = (label, list, base) => list && list.length ? `
  <section class="lesson-part">
    <h3>${label}</h3>
    ${list.map((p, k) => ed(`${base}.${k}`, p, 'p')).join('')}
  </section>` : '';

function renderClasses() {
  $('#classes').innerHTML = SITE.education.map((l, i) => `
    <article class="two-col work lesson-card">
      <div class="work-side">
        <a class="work-cover" href="#lesson-${i}"><img src="assets/edu/${esc(l.images[0].src)}" alt="${esc(l.title)} 수업 자료 표지" loading="lazy"></a>
      </div>
      <div class="lesson-card-info">
        <time>${lessonDate(l)}</time>
        <a class="u-line big" href="#lesson-${i}">${esc(l.title)}</a>
        <p class="lesson-sub">${esc(l.subtitle)}</p>
        <p class="lesson-role">${esc(l.role)}</p>
      </div>
    </article>`).join('');
}
renderClasses();

function renderLesson(i) {
  const l = SITE.education[i];
  const el = $('#lesson');
  if (!l) { el.innerHTML = '<p>수업을 찾을 수 없습니다. <a class="u-line" href="#education">교육으로</a></p>'; return; }
  const b = `education.${i}`;
  // 목록은 최근 수업이 위. '전'은 더 이전 수업(번호가 큰 쪽), '다음'은 더 최근 수업
  const prev = i < SITE.education.length - 1 ? `#lesson-${i + 1}` : null;
  const next = i > 0 ? `#lesson-${i - 1}` : null;
  el.innerHTML = `
    <header class="lesson-head">
      <time class="big" datetime="${esc(l.date.replaceAll('.', '-'))}">${lessonDate(l)}</time>
      ${ed(`${b}.title`, l.title, 'h1', 'big')}
      ${ed(`${b}.subtitle`, l.subtitle, 'p', 'lesson-sub')}
      ${ed(`${b}.role`, l.role, 'p', 'lesson-role')}
    </header>
    ${ed(`${b}.summary`, l.summary, 'p', 'lesson-summary')}
    <div class="lesson-body">
      <div class="lesson-images">
        ${l.images.map((im, k) => `<a href="assets/edu/${esc(im.src)}" target="_blank" rel="noopener" class="${k === 0 ? 'is-lead' : ''}${im.src.includes('-ws-') ? ' is-sheet' : ''}${im.credit ? ' has-credit' : ''}"><img src="assets/edu/${esc(im.src)}" alt="${esc(im.alt)}" loading="lazy">${im.credit ? `<small class="lesson-credit">${esc(im.credit)}</small>` : ''}</a>`).join('')}
      </div>
      <div class="lesson-text">
        <section class="lesson-part"><h3>맡은 일</h3>${ed(`${b}.work`, l.work, 'p')}</section>
        ${lessonBlock('기획', l.plan, `${b}.plan`)}
        ${lessonBlock('수업', l.result, `${b}.result`)}
        ${lessonBlock('다음', l.next, `${b}.next`)}
      </div>
    </div>
    <nav class="post-nav" aria-label="다른 수업">
      <a class="u-line post-prev" href="${prev || '#education'}" ${prev ? '' : 'aria-disabled="true" tabindex="-1"'}>전</a>
      <a class="post-back" href="#education"><span>교육</span><span>education</span></a>
      <a class="u-line post-next" href="${next || '#education'}" ${next ? '' : 'aria-disabled="true" tabindex="-1"'}>다음</a>
    </nav>`;
}

/* ---------- 전자우편: 주소를 조각으로 두었다가 합친다(소스에서 긁어 가는 스팸 줄이기) ---------- */
{
  const m = ['wookdo1225', 'gmail.com'].join('@');
  const a = $('#mail-link');
  a.href = 'mailto:' + m;
  a.textContent = m;
}

/* ---------- 노래: 제목을 누르면 재생, 다시 누르면 정지 ---------- */
$('#songs').innerHTML = SITE.songs.map((s, i) => `
  <li>
    <button class="song-btn" type="button" aria-pressed="false">
      ${ed(`songs.${i}.title`, s.title, 'span', 'song-title big u-line')}
      <span>${ed(`songs.${i}.artist`, s.artist)}${s.with ? ` · with ${ed(`songs.${i}.with`, s.with)}` : ''}</span>
    </button>
    <audio preload="none" src="assets/audio/${esc(s.file)}"></audio>
  </li>`).join('');
const songBtns = [...document.querySelectorAll('.song-btn')];
function stopAllSongs() {
  songBtns.forEach((b) => {
    const au = b.nextElementSibling;
    au.pause(); au.currentTime = 0;
    b.setAttribute('aria-pressed', 'false');
  });
}
songBtns.forEach((btn) => {
  const audio = btn.nextElementSibling;
  btn.addEventListener('click', () => {
    const playing = btn.getAttribute('aria-pressed') === 'true';
    stopAllSongs();
    if (!playing) {
      btn.setAttribute('aria-pressed', 'true');
      audio.play().catch(() => btn.setAttribute('aria-pressed', 'false'));
    }
  });
  audio.addEventListener('ended', () => btn.setAttribute('aria-pressed', 'false'));
});

/* ---------- 편집 설정 화면 (#editor-setup, 어디에도 링크하지 않는다) ---------- */
{
  const sec = document.createElement('section');
  sec.className = 'view';
  sec.dataset.view = 'editor-setup';
  sec.hidden = true;
  sec.innerHTML = `
    <div class="page">
      <a class="home-link" href="#home" aria-label="처음으로"><svg class="logo-mark" aria-hidden="true"><use href="#logo-small"/></svg></a>
      <form class="setup" id="setup" autocomplete="off">
        <p>이 기기에서 편집할 수 있게 설정합니다. 열쇠는 이 브라우저 안에만 비밀번호로 잠겨 저장됩니다.</p>
        <label>GitHub 열쇠(token)<input type="password" name="token" required></label>
        <label>비밀번호<input type="password" name="pw" required minlength="8"></label>
        <label>비밀번호 확인<input type="password" name="pw2" required minlength="8"></label>
        <p class="setup-actions"><button type="submit" class="u-line">저장</button><button type="button" class="u-line" id="setup-forget">이 기기에서 지우기</button></p>
        <p class="setup-msg" id="setup-msg" aria-live="polite"></p>
      </form>
    </div>`;
  document.querySelector('main').appendChild(sec);
}

/* ---------- 화면 전환 (주소 끝의 #이름) ---------- */
const views = document.querySelectorAll('[data-view]');
const logo = $('#core-logo');

function route() {
  const hash = location.hash.slice(1) || 'home';
  const ml = hash.match(/^lesson-(\d+)$/);
  const mw = hash.match(/^work-(\d+)$/);
  let name = ml ? 'lesson' : mw ? 'work' : hash;
  if (![...views].some((v) => v.dataset.view === name)) {
    if (hash !== 'home') history.replaceState(null, '', location.pathname);
    name = 'home';
  }
  views.forEach((v) => { v.hidden = v.dataset.view !== name; });
  if (name === 'lesson') renderLesson(+ml[1]);
  if (name === 'education') renderClasses();
  if (name === 'work') renderWork(+mw[1]); else stopWork();
  if (name === 'design') renderWorks();
  Editor.refresh();
  logo.classList.remove('is-miss');      // 돌아왔을 때 흔들림이 다시 재생되지 않도록
  window.scrollTo(0, 0);
  stopAllSongs();
  name === 'home' ? startOrbit() : stopOrbit();
}
window.addEventListener('hashchange', route);

/* ---------- 돌아가는 원 ---------- */
const stage = $('#stage');
const ring = $('#ring');
const items = [...document.querySelectorAll('#orbit li')];
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let angle = 0, rafId = null, last = null, stepTimer = null;

function offset(i) {                       // 맨 위(0도)에서 얼마나 떨어져 있는지
  const d = ((angle + i * 90) % 360 + 360) % 360;
  return Math.min(d, 360 - d);
}
function place() {
  const a = stage.clientHeight / 4500;
  const cx = stage.clientWidth / 2, cy = ORBIT.cy * a;
  let inside = false;
  items.forEach((li, i) => {
    const t = (angle + i * 90) * Math.PI / 180;
    const x = cx + ORBIT.rx * a * Math.sin(t);
    const y = cy - ORBIT.ry * a * Math.cos(t);
    li.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    if (offset(i) <= TOLERANCE) inside = true;
  });
  ring.classList.toggle('is-on', inside);
}
function tick(t) {
  if (last !== null) angle = (angle + (t - last) / PERIOD * 360) % 360;
  last = t;
  place();
  rafId = requestAnimationFrame(tick);
}
function startOrbit() {
  stopOrbit();
  if (reduce.matches) {                    // 움직임 줄이기 설정: 90도씩 끊어서 넘어감
    angle = Math.round(angle / 90) * 90;
    place();
    stepTimer = setInterval(() => { angle = (angle + 90) % 360; place(); }, PERIOD / 4);
  } else {
    last = null;
    rafId = requestAnimationFrame(tick);
  }
}
function stopOrbit() {
  cancelAnimationFrame(rafId); rafId = null;
  clearInterval(stepTimer); stepTimer = null;
}
window.addEventListener('resize', place);

logo.addEventListener('click', () => {
  if (Editor.swallowClick()) return;        // 꾹 누른 직후의 클릭은 무시
  const hit = items.findIndex((_, i) => offset(i) <= TOLERANCE);
  if (hit >= 0) {
    location.hash = items[hit].dataset.target;
  } else {                                  // 타이밍을 놓치면 로고가 흔들린다
    logo.classList.remove('is-miss');
    void logo.offsetWidth;
    logo.classList.add('is-miss');
  }
});
logo.addEventListener('animationend', () => logo.classList.remove('is-miss'));

/* ---------- 이스터에그: 최근 업데이트 연속 클릭 ---------- */
let clicks = 0, lastClick = 0;
$('#updated').addEventListener('click', () => {
  const now = Date.now();
  clicks = (now - lastClick < SECRET_GAP) ? clicks + 1 : 1;
  lastClick = now;
  if (clicks >= SECRET_CLICKS) { clicks = 0; location.hash = 'anxiety'; }
});

/* =========================================================
   편집 모드
   - 첫 화면 로고를 꾹(1.2초) 누르면 화면에는 아무 변화 없이 보이지 않는 입력을 받는다.
   - 비밀번호를 치고 Enter → 이 기기에 저장해 둔 GitHub 열쇠가 풀리면 편집 모드.
   - 열쇠는 사이트(저장소)에 없다. #editor-setup 에서 기기마다 한 번 넣으면
     이 브라우저 안에만 비밀번호로 잠겨(PBKDF2 + AES-GCM) 저장된다.
   - 저장하면 GitHub의 content/data.js 를 바꾼다 → 1~2분 뒤 사이트에 반영.
   ========================================================= */
const Editor = (() => {
  const REPO = { owner: 'zinoka1225', repo: 'dowook', path: 'content/data.js', branch: 'main' };
  const API = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}/contents/${REPO.path}`;
  const STORE = 'dowook-editor-v1';
  const HOLD = 1200;              // 꾹 누르는 시간(ms)
  const HEADER = '/* 사이트에 들어가는 모든 글과 작업 목록. 이 파일이 원본이다.\n   웹의 편집 모드에서 저장하면 이 파일이 바뀐다. */\n';

  let token = null, editing = false, dirty = false, original = JSON.stringify(SITE);
  let holdTimer = null, held = false;

  /* --- 이 브라우저 안의 저장 공간 --- */
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; } },
    set(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); return true; } catch { return false; } },
    del() { try { localStorage.removeItem(STORE); } catch { /* 무시 */ } },
  };
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s.replace(/\s/g, '')), (c) => c.charCodeAt(0));
  async function keyFrom(pw, salt) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function lock(tok, pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFrom(pw, salt), new TextEncoder().encode(tok));
    return { salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) };
  }
  async function unlock(pw) {
    const s = store.get();
    if (!s) return null;
    try {
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(s.iv) }, await keyFrom(pw, unb64(s.salt)), unb64(s.ct));
      return new TextDecoder().decode(pt);
    } catch { return null; }
  }

  /* --- GitHub --- */
  const gh = (tok, opt = {}) => fetch(API + (opt.method ? '' : `?ref=${REPO.branch}`), {
    cache: 'no-store', ...opt,
    headers: { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json', ...(opt.headers || {}) },
  });
  const parseSite = (text) => JSON.parse(text.slice(text.indexOf('window.SITE = ') + 14, text.trimEnd().lastIndexOf(';')));

  /* --- 보이지 않는 입력 --- */
  const sink = document.createElement('input');
  Object.assign(sink, { type: 'text', autocomplete: 'off', spellcheck: false, tabIndex: -1 });
  sink.setAttribute('autocapitalize', 'off');
  sink.setAttribute('autocorrect', 'off');
  sink.setAttribute('aria-hidden', 'true');
  sink.className = 'secret-sink';
  document.body.appendChild(sink);
  let sinkTimer = null;
  function listen() {
    sink.value = '';
    sink.focus({ preventScroll: true });
    clearTimeout(sinkTimer);
    sinkTimer = setTimeout(() => sink.blur(), 30000);
  }
  sink.addEventListener('blur', () => { sink.value = ''; clearTimeout(sinkTimer); });
  sink.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const pw = sink.value;
    sink.blur();
    const tok = pw && await unlock(pw);
    if (tok) { token = tok; start(); }                // 틀리면 아무 일도 일어나지 않는다
  });

  // 꾹 누르기 (첫 화면 로고)
  const coreLogo = document.getElementById('core-logo');
  coreLogo.addEventListener('pointerdown', () => {
    held = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { held = true; }, HOLD);
  });
  ['pointerleave', 'pointercancel'].forEach((t) => coreLogo.addEventListener(t, () => clearTimeout(holdTimer)));
  coreLogo.addEventListener('pointerup', () => {
    clearTimeout(holdTimer);
    if (held && !editing) listen();                   // 손을 뗄 때(사용자 동작 안에서) 입력을 받기 시작
  });
  coreLogo.addEventListener('contextmenu', (e) => e.preventDefault());

  /* --- 편집 막대 --- */
  const bar = document.createElement('div');
  bar.className = 'edit-bar';
  bar.hidden = true;
  bar.innerHTML = '<span>편집 중</span><button type="button" data-act="save">저장</button><button type="button" data-act="exit">끝내기</button><span class="edit-msg" aria-live="polite"></span>';
  document.body.appendChild(bar);
  const msg = (t) => { bar.querySelector('.edit-msg').textContent = t; };
  const exitBtn = bar.querySelector('[data-act="exit"]');

  // 이 브라우저가 서식 없는 편집을 지원하는지
  const plainOK = (() => { const d = document.createElement('div'); try { d.contentEditable = 'plaintext-only'; } catch { return false; } return d.contentEditable === 'plaintext-only'; })();

  function refresh() {
    document.querySelectorAll('[data-edit]').forEach((el) => {
      if (editing) el.contentEditable = plainOK ? 'plaintext-only' : 'true';
      else el.removeAttribute('contenteditable');
    });
  }
  function start() {
    editing = true;
    document.body.classList.add('is-editing');
    bar.hidden = false;
    exitBtn.textContent = '끝내기';
    msg('');
    refresh();
  }
  function stop() {
    editing = false;
    document.body.classList.remove('is-editing');
    bar.hidden = true;
    refresh();
  }

  // SITE 안의 위치(예: education.0.plan.1)에 값 넣기
  function setPath(path, value) {
    const keys = path.split('.');
    let o = SITE;
    keys.slice(0, -1).forEach((k) => { o = o[k]; });
    o[keys.at(-1)] = value;
  }
  document.addEventListener('input', (e) => {
    const el = e.target.closest && e.target.closest('[data-edit]');
    if (!editing || !el) return;
    setPath(el.dataset.edit, el.innerText.replace(/\n+$/, ''));
    dirty = true;
    exitBtn.textContent = '끝내기';
    msg('저장 안 됨');
  });
  // 편집 중에는 글 조각을 눌러도 링크 이동·노래 재생이 되지 않게
  document.addEventListener('click', (e) => {
    if (editing && e.target.closest && e.target.closest('[data-edit]')) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  // 서식 있는 붙여넣기 막기(plaintext-only를 못 쓰는 브라우저)
  document.addEventListener('paste', (e) => {
    if (!editing || plainOK || !e.target.closest || !e.target.closest('[data-edit]')) return;
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  });
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  async function save() {
    if (!dirty) { msg('바뀐 곳이 없어요'); return; }
    msg('저장하는 중…');
    try {
      const res = await gh(token);
      if (!res.ok) throw new Error(`불러오기 실패 (${res.status})`);
      const cur = await res.json();
      const remote = new TextDecoder().decode(unb64(cur.content));
      if (JSON.stringify(parseSite(remote)) !== original) {
        msg('사이트가 아직 최신 내용이 아니에요. 1~2분 뒤 새로고침하고 다시 고쳐 주세요.');
        return;
      }
      // 비운 문단은 지운다
      SITE.education.forEach((l) => ['plan', 'result', 'next'].forEach((k) => { l[k] = (l[k] || []).filter((p) => p.trim()); }));
      SITE.updated = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // 한국 날짜
      const text = HEADER + 'window.SITE = ' + JSON.stringify(SITE, null, 1) + ';\n';
      const put = await gh(token, {
        method: 'PUT',
        body: JSON.stringify({ message: '웹에서 글 수정', content: b64(new TextEncoder().encode(text)), sha: cur.sha, branch: REPO.branch }),
      });
      if (!put.ok) throw new Error(`저장 실패 (${put.status})`);
      original = JSON.stringify(SITE);
      dirty = false;
      showUpdated();
      msg('저장했어요. 1~2분 뒤 사이트에 반영돼요.');
    } catch (err) {
      msg(String(err.message || err));
    }
  }
  bar.addEventListener('click', (e) => {
    const act = e.target.dataset && e.target.dataset.act;
    if (act === 'save') save();
    if (act === 'exit') {
      if (dirty && exitBtn.textContent === '끝내기') { exitBtn.textContent = '저장 안 하고 끝내기'; return; }
      if (dirty) { dirty = false; location.reload(); return; }
      stop();
    }
  });

  /* --- 설정 화면 --- */
  const form = document.getElementById('setup');
  const setupMsg = (t) => { document.getElementById('setup-msg').textContent = t; };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tok = form.token.value.trim(), pw = form.pw.value;
    if (pw !== form.pw2.value) { setupMsg('비밀번호가 서로 달라요.'); return; }
    setupMsg('열쇠를 확인하는 중…');
    try {
      const res = await gh(tok);
      if (!res.ok) { setupMsg(`이 열쇠로는 저장소에 들어갈 수 없어요 (${res.status}).`); return; }
      if (!store.set(await lock(tok, pw))) { setupMsg('이 브라우저에는 저장할 수 없어요(개인 정보 보호 모드 등).'); return; }
      form.reset();
      setupMsg('이 기기에 저장했어요. 첫 화면에서 로고를 꾹 누른 뒤 비밀번호를 치고 Enter.');
    } catch (err) { setupMsg(String(err.message || err)); }
  });
  document.getElementById('setup-forget').addEventListener('click', () => { store.del(); setupMsg('이 기기에서 지웠어요.'); });

  return {
    refresh,
    swallowClick() { if (held) { held = false; return true; } return false; },
  };
})();

route();
