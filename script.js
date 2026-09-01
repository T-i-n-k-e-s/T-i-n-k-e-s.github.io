document.getElementById('year').textContent = new Date().getFullYear();

const LANG_KEY = 'tinkes-lang';
let currentLang = localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'fi';

function renderCount(el) {
  const n = Number(el.dataset.count);
  if (!Number.isFinite(n)) return;
  const label = currentLang === 'en' ? 'followers' : 'seuraajaa';
  el.textContent = `${n.toLocaleString(currentLang === 'en' ? 'en-US' : 'fi-FI')} ${label}`;
}

function renderLiveBtn() {
  const btn = document.getElementById('live-btn');
  if (!btn || btn.dataset.live !== 'true') return;
  const label = currentLang === 'en' ? 'LIVE now' : 'LIVE nyt';
  btn.textContent = `${label} · ${btn.dataset.uptime}`;
}

function applyLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-en]').forEach((el) => {
    if (el.dataset.fi === undefined) el.dataset.fi = el.innerHTML;
    el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.fi;
  });
  document.querySelectorAll('[data-count-source]').forEach(renderCount);
  renderLiveBtn();
  document.getElementById('lang-switch')?.classList.toggle('is-en', lang === 'en');
  localStorage.setItem(LANG_KEY, lang);
}

document.getElementById('lang-switch')?.addEventListener('click', () => {
  applyLang(currentLang === 'fi' ? 'en' : 'fi');
});

applyLang(currentLang);

function showCount(el, count) {
  if (Number.isFinite(count)) {
    el.dataset.count = count;
    renderCount(el);
  } else {
    el.remove();
  }
}

document.querySelectorAll('[data-count-source]').forEach(async (el) => {
  const [source, id] = el.dataset.countSource.split(':');
  if (source === 'static') return; // handled in batch below
  try {
    let count;
    if (source === 'twitch') {
      const res = await fetch(`https://decapi.me/twitch/followcount/${id}`);
      count = Number((await res.text()).trim());
    } else if (source === 'github') {
      const res = await fetch(`https://api.github.com/users/${id}`);
      count = (await res.json()).followers;
    }
    showCount(el, count);
  } catch {
    el.remove();
  }
});

// YouTube/Instagram have no public no-auth API, so their counts are scraped
// periodically by scripts/update-follow-counts.mjs into follow-counts.json.
fetch('follow-counts.json')
  .then((res) => res.json())
  .then((data) => {
    document.querySelectorAll('[data-count-source^="static:"]').forEach((el) => {
      const key = el.dataset.countSource.split(':')[1];
      showCount(el, data[key]);
    });
  })
  .catch(() => {
    document.querySelectorAll('[data-count-source^="static:"]').forEach((el) => el.remove());
  });

(async () => {
  const btn = document.getElementById('live-btn');
  if (!btn) return;
  try {
    const res = await fetch('https://decapi.me/twitch/uptime/tinkes_');
    const uptime = (await res.text()).trim();
    if (!/offline/i.test(uptime)) {
      btn.classList.add('is-live');
      btn.dataset.live = 'true';
      btn.dataset.uptime = uptime;
      renderLiveBtn();
    }
  } catch {
    // keep the default "Seuraa striimejä" / "Follow my streams" label
  }
})();
