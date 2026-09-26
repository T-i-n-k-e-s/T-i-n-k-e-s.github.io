// uusimmat videot, uusin aina ekaks
const videos = [
  { id: "dOm6UgRPkTs", title: "ABSOLUUTTINEN SINEMAKOLLAASI aka. Burana Tommi Kollaasi", date: { fi: "syyskuu 2026", en: "September 2026" } },
  { id: "cE69i6P-0Ng", title: "Brawlhalla Paska Montage - Jaeyun",                     date: { fi: "elokuu 2026",  en: "August 2026" } },
  { id: "hgxbx40lZho", title: "Brawlhalla Paska Montage - Nix (REUP)",                 date: { fi: "joulukuu 2025", en: "December 2025" } },
  { id: "paw8w4VM9Jg", title: "Brawlhalla Paska Montage - Teros",                      date: { fi: "marraskuu 2025", en: "November 2025" } },
  { id: "A1f_KtlB4c0", title: "Brawlhalla Paska Montage - Magyar",                     date: { fi: "syyskuu 2025", en: "September 2025" } },
  { id: "BwGHcta6Kgc", title: "Brawlhalla Paska Montage - Onyx",                       date: { fi: "syyskuu 2025", en: "September 2025" } }
];

const LANG_KEY = "tinkes-lang";
let lang = localStorage.getItem(LANG_KEY) === "en" ? "en" : "fi";

document.getElementById("year").textContent = new Date().getFullYear();

// yläpalkki saa taustan kun skrollaa
const topbar = document.getElementById("topbar");
const onScroll = () => topbar.classList.toggle("scrolled", window.scrollY > 10);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// videot (vain videot.html)
function videoHtml(v, cls, quality) {
  return `
    <a class="video ${cls}" href="https://www.youtube.com/watch?v=${v.id}" data-id="${v.id}" target="_blank" rel="noopener">
      <span class="thumb sketch"><img src="https://i.ytimg.com/vi/${v.id}/${quality}.jpg" alt="" loading="lazy"></span>
      <span>
        <span class="video-title">${v.title}</span>
        <span class="video-date">${v.date[lang]}</span>
      </span>
    </a>`;
}

function renderVideos() {
  const list = document.getElementById("videoList");
  if (!list) return;

  // eka isona, kolme sivuun, loput gridiin
  const [first, ...rest] = videos;
  list.innerHTML =
    videoHtml(first, "video-featured", "maxresdefault") +
    `<div class="video-side">${rest.slice(0, 3).map(v => videoHtml(v, "video-small", "mqdefault")).join("")}</div>`;

  const grid = document.getElementById("videoGrid");
  const older = rest.slice(3);
  if (grid && older.length) {
    grid.innerHTML = older.map(v => videoHtml(v, "video-card", "hqdefault")).join("");
  } else if (grid) {
    grid.closest("section").hidden = true;
  }

  // kaikilla ei oo maxres kuvaa
  const featuredImg = list.querySelector(".video-featured img");
  featuredImg.addEventListener("error", () => {
    featuredImg.src = `https://i.ytimg.com/vi/${first.id}/hqdefault.jpg`;
  }, { once: true });
}

// video aukee sivulla, ctrl/cmd-klikki avaa youtubessa
const player = document.getElementById("player");

if (player) {
  const frame = document.getElementById("playerFrame");

  document.addEventListener("click", e => {
    const link = e.target.closest(".video[data-id]");
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${link.dataset.id}?autoplay=1" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    player.showModal();
  });

  const close = () => player.close();
  document.getElementById("playerClose").addEventListener("click", close);
  player.addEventListener("click", e => { if (e.target === player) close(); });
  player.addEventListener("close", () => { frame.innerHTML = ""; });
}

// twitch player + chat, parent pitää olla sivun oma domain
const streamPlayer = document.getElementById("streamPlayer");

if (streamPlayer && location.hostname) {
  const host = location.hostname;
  streamPlayer.innerHTML = `<iframe src="https://player.twitch.tv/?channel=tinkes_&parent=${host}&muted=true" title="Twitch" allowfullscreen></iframe>`;
  document.getElementById("streamChat").innerHTML =
    `<iframe src="https://www.twitch.tv/embed/tinkes_/chat?parent=${host}&darkpopout" title="Twitch chat"></iframe>`;
}

// seuraajat
function renderCount(el) {
  const n = Number(el.dataset.count);
  if (!Number.isFinite(n)) return;
  const label = lang === "en" ? "followers" : "seuraajaa";
  el.textContent = n.toLocaleString(lang === "en" ? "en-US" : "fi-FI") + " " + label;
}

function showCount(el, count) {
  if (Number.isFinite(count)) {
    el.dataset.count = count;
    renderCount(el);
  } else {
    el.remove();
  }
}

// kielen vaihto
function applyLang(newLang) {
  lang = newLang;
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-en]").forEach(el => {
    if (el.dataset.fi === undefined) el.dataset.fi = el.innerHTML;
    el.innerHTML = lang === "en" ? el.dataset.en : el.dataset.fi;
  });
  document.querySelectorAll(".lang button").forEach(btn => {
    btn.setAttribute("aria-pressed", btn.dataset.lang === lang);
  });
  document.querySelectorAll("[data-count-source]").forEach(renderCount);
  renderVideos();
  if (document.getElementById("liveStatus").textContent) renderLive();
  localStorage.setItem(LANG_KEY, lang);
}

document.querySelectorAll(".lang button").forEach(btn => {
  btn.addEventListener("click", () => applyLang(btn.dataset.lang));
});

applyLang(lang);

// twitch + github suoraan, yt + insta follow-counts.jsonista
document.querySelectorAll("[data-count-source]").forEach(async el => {
  const [source, id] = el.dataset.countSource.split(":");
  if (source === "static") return;
  try {
    let count;
    if (source === "twitch") {
      const res = await fetch(`https://decapi.me/twitch/followcount/${id}`);
      count = Number((await res.text()).trim());
    } else if (source === "github") {
      const res = await fetch(`https://api.github.com/users/${id}`);
      count = (await res.json()).followers;
    }
    showCount(el, count);
  } catch {
    el.remove();
  }
});

if (document.querySelector('[data-count-source^="static:"]')) {
  fetch("follow-counts.json")
    .then(res => res.json())
    .then(data => {
      document.querySelectorAll('[data-count-source^="static:"]').forEach(el => {
        showCount(el, data[el.dataset.countSource.split(":")[1]]);
      });
    })
    .catch(() => {
      document.querySelectorAll('[data-count-source^="static:"]').forEach(el => el.remove());
    });
}

// live status
let liveUptime = null;

function renderLive() {
  const el = document.getElementById("liveStatus");
  document.getElementById("navLive").hidden = !liveUptime;
  if (liveUptime) {
    el.textContent = (lang === "en" ? "Live now, " : "Live nyt, ") + liveUptime;
    el.classList.add("is-live");
  } else {
    el.textContent = lang === "en" ? "Offline right now" : "Ei livenä nyt";
    el.classList.remove("is-live");
  }
}

(async () => {
  try {
    const res = await fetch("https://decapi.me/twitch/uptime/tinkes_");
    const uptime = (await res.text()).trim();
    if (!/offline|error/i.test(uptime)) liveUptime = uptime;
    renderLive();
  } catch {
    // ei yhteyttä
  }
})();
