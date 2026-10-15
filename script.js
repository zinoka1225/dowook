/* =========================================================
   도욱 — script.js
   1) 화면 전환(주소 끝 #이름)  2) 돌아가는 원  3) 이스터에그
   4) content/data.js(window.SITE)를 읽어 각 페이지를 채운다
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
const paras = (list) => list.map((p) => `<p>${esc(p)}</p>`).join('');
const brs = (s) => esc(s).replaceAll('\n', '<br>');          // 제목 속 \n = 원하는 자리에서 줄바꿈
const oneLine = (s) => esc(s.replaceAll('\n', ' '));

/* ---------- 최근 업데이트 ---------- */
{
  const t = $('#updated-date');
  t.dateTime = SITE.updated;
  t.textContent = dot(SITE.updated.slice(2));               // 26. 10. 11
}

/* ---------- 디자인 ---------- */
$('#works').innerHTML = SITE.design.map((w) => {
  const first = w.links[0].url;
  const links = w.links.length > 1
    ? `<p class="work-links">${w.links.map((l) => `<a class="u-line" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}</p>`
    : '';
  return `
    <article class="two-col work">
      <div class="work-side">
        <a class="work-cover" href="${esc(first)}" target="_blank" rel="noopener">
          <img src="assets/design/${esc(w.cover)}" alt="${esc(w.title)} 표지" loading="lazy">
        </a>
        <p class="work-meta"><a class="u-line" href="${esc(first)}" target="_blank" rel="noopener">${esc(w.title)}</a><time>${esc(w.period)}</time></p>
        ${links}
      </div>
      <p class="work-desc">${esc(w.desc)}</p>
    </article>`;
}).join('');

/* ---------- 교육: 담당 수업 하나 = 이미지(왼쪽) + 기획·결과·개선·후기(오른쪽) ---------- */
const lessonBlock = (label, list, quote) => list && list.length ? `
  <section class="lesson-part${quote ? ' is-quote' : ''}">
    <h3>${label}</h3>
    ${list.map((p) => `<p>${esc(p)}</p>`).join('')}
  </section>` : '';
// 목록: 디자인 페이지처럼 썸네일 + 기본 정보. 누르면 #lesson-번호 로 상세가 열린다
const lessonDate = (l) => esc(l.date.replaceAll('.', '. '));
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

function renderLesson(i) {
  const l = SITE.education[i];
  const el = $('#lesson');
  if (!l) { el.innerHTML = '<p>수업을 찾을 수 없습니다. <a class="u-line" href="#education">교육으로</a></p>'; return; }
  // 목록은 최근 수업이 위. '전'은 더 이전 수업(번호가 큰 쪽), '다음'은 더 최근 수업
  const prev = i < SITE.education.length - 1 ? `#lesson-${i + 1}` : null;
  const next = i > 0 ? `#lesson-${i - 1}` : null;
  el.innerHTML = `
    <header class="lesson-head">
      <time class="big" datetime="${esc(l.date.replaceAll('.', '-'))}">${lessonDate(l)}</time>
      <h1 class="big">${esc(l.title)}</h1>
      <p class="lesson-sub">${esc(l.subtitle)}</p>
      <p class="lesson-role">${esc(l.role)}</p>
    </header>
    <p class="lesson-summary">${esc(l.summary)}</p>
    <div class="lesson-body">
      <div class="lesson-images">
        ${l.images.map((im, k) => `<a href="assets/edu/${esc(im.src)}" target="_blank" rel="noopener" class="${k === 0 ? 'is-lead' : ''}${im.src.includes('-ws-') ? ' is-sheet' : ''}${im.credit ? ' has-credit' : ''}"><img src="assets/edu/${esc(im.src)}" alt="${esc(im.alt)}" loading="lazy">${im.credit ? `<small class="lesson-credit">${esc(im.credit)}</small>` : ''}</a>`).join('')}
      </div>
      <div class="lesson-text">
        ${lessonBlock('맡은 일', [l.work])}
        ${lessonBlock('기획', l.plan)}
        ${lessonBlock('수업', l.result)}
        ${lessonBlock('다음', l.next)}
      </div>
    </div>
    <nav class="post-nav" aria-label="다른 수업">
      <a class="u-line post-prev" href="${prev || '#education'}" ${prev ? '' : 'aria-disabled="true" tabindex="-1"'}>전</a>
      <a class="post-back" href="#education"><span>교육</span><span>education</span></a>
      <a class="u-line post-next" href="${next || '#education'}" ${next ? '' : 'aria-disabled="true" tabindex="-1"'}>다음</a>
    </nav>`;
}

/* ---------- 노래: 제목을 누르면 재생, 다시 누르면 정지 ---------- */
$('#songs').innerHTML = SITE.songs.map((s) => `
  <li>
    <button class="song-btn" type="button" aria-pressed="false">
      <span class="song-title big u-line">${esc(s.title)}</span>
      <span>${esc(s.artist)}${s.with ? ` · with ${esc(s.with)}` : ''}</span>
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

/* ---------- 글: 주제(세로) × 같은 주제의 글(가로, 오래된 글이 왼쪽) ---------- */
const rows = SITE.writing;
// 목록은 최근 글이 위로. 번호(i)는 오래된 순서 그대로라서 글 안의 '전'은 더 이전 글, '다음'은 더 최근 글
const newestFirst = (row) => row.posts.map((p, i) => [p, i]).reverse();
const postLink = (row, p, i) =>
  `<a class="post-link" href="#post-${row.key}-${i}"><span class="u-line">${brs(p.title)}</span><time>${esc(p.date)}</time></a>`;

$('#topics').innerHTML = rows.filter((r) => !r.hidden).map((r) => `
  <section class="topic" aria-labelledby="topic-${r.key}">
    <h2 class="topic-name big" id="topic-${r.key}">${esc(r.label)}<small>에 관하여</small></h2>
    <ul class="posts">${newestFirst(r).map(([p, i]) => `<li>${postLink(r, p, i)}</li>`).join('')}</ul>
  </section>`).join('');

// 숨은 행(불안)은 불안 페이지 아래에
const hiddenRow = rows.find((r) => r.hidden);
if (hiddenRow) {
  $('#anxiety-more').innerHTML =
    `<h2>${esc(hiddenRow.label)}에 관하여</h2>` +
    newestFirst(hiddenRow).map(([p, i]) => postLink(hiddenRow, p, i)).join('');
}

function renderPost(key, i) {
  const row = rows.find((r) => r.key === key);
  const p = row && row.posts[i];
  const el = $('#post');
  const back = row && row.hidden ? '#anxiety' : '#writing';
  if (!p) { el.innerHTML = '<p>글을 찾을 수 없습니다. <a class="u-line" href="#writing">글 목록으로</a></p>'; return; }
  const prev = i > 0 ? `#post-${key}-${i - 1}` : null;
  const next = i < row.posts.length - 1 ? `#post-${key}-${i + 1}` : null;
  el.innerHTML = `
    <p class="post-eyebrow">${esc(row.label)}에 관하여 · ${i + 1} / ${row.posts.length}</p>
    <h1 class="big">${oneLine(p.title)}</h1>
    <time class="post-date">${esc(p.date)}</time>
    <div class="post-body">${paras(p.body)}</div>
    <nav class="post-nav" aria-label="같은 주제의 다른 글">
      <a class="u-line post-prev" href="${prev || back}" ${prev ? '' : 'aria-disabled="true" tabindex="-1"'}>전</a>
      <a class="post-back" href="${back}">${row.hidden ? '<span>불안</span><span>anxiety</span>' : '<span>글</span><span>writing</span>'}</a>
      <a class="u-line post-next" href="${next || back}" ${next ? '' : 'aria-disabled="true" tabindex="-1"'}>다음</a>
    </nav>`;
}

/* ---------- 화면 전환 (주소 끝의 #이름) ---------- */
const views = document.querySelectorAll('[data-view]');
const logo = $('#core-logo');

/* 잠시 닫아 둔 페이지: content/data.js의 closed 목록. 주소로 직접 들어와도 첫 화면으로 돌려보낸다 */
const CLOSED = SITE.closed || [];
const isClosed = (name) => CLOSED.includes(name) || (name === 'post' && CLOSED.includes('writing'))
  || (name === 'lesson' && CLOSED.includes('education'));

function route() {
  const hash = location.hash.slice(1) || 'home';
  const m = hash.match(/^post-([a-z]+)-(\d+)$/);
  const ml = hash.match(/^lesson-(\d+)$/);
  let name = m ? 'post' : ml ? 'lesson' : hash;
  if (![...views].some((v) => v.dataset.view === name) || isClosed(name)) {
    if (name !== 'home' && hash !== 'home') history.replaceState(null, '', location.pathname);
    name = 'home';
  }
  views.forEach((v) => { v.hidden = v.dataset.view !== name; });
  if (m && name === 'post') renderPost(m[1], +m[2]);
  if (ml && name === 'lesson') renderLesson(+ml[1]);
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
items.forEach((li) => li.classList.toggle('is-closed', CLOSED.includes(li.dataset.target)));
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
  const hit = items.findIndex((_, i) => offset(i) <= TOLERANCE);
  if (hit >= 0 && !CLOSED.includes(items[hit].dataset.target)) {
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

route();
