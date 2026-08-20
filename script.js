document.getElementById('year').textContent = new Date().getFullYear();

function showCount(el, count) {
  if (Number.isFinite(count)) {
    el.textContent = `${count.toLocaleString('fi-FI')} seuraajaa`;
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
