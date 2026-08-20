// Scrapes follower/subscriber counts for platforms without a public no-auth API
// (YouTube, Instagram) and writes them to follow-counts.json.
// Run periodically (see scheduled task) and commit the result.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function parseCount(text) {
  const m = text.replace(/ /g, ' ').match(/([\d.,]+)\s*([KMB]?)/i);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, '').replace(/\.(?=\d{3}\b)/g, ''));
  const suffix = m[2].toUpperCase();
  if (suffix === 'K') n *= 1_000;
  if (suffix === 'M') n *= 1_000_000;
  if (suffix === 'B') n *= 1_000_000_000;
  return Math.round(n);
}

async function getYoutubeSubscribers(handle) {
  const res = await fetch(`https://www.youtube.com/${handle}`, {
    headers: {
      'User-Agent': UA,
      'Cookie': 'CONSENT=YES+cb; SOCS=CAI',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`YouTube fetch failed: ${res.status}`);
  const html = await res.text();
  // The page also embeds a "subscriberCountText" field elsewhere that can be stale/wrong
  // (seen serving an outdated number). The reliable value is the one shown in the channel
  // header, which sits right after the handle in the metadataRows.
  const escapedHandle = handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`"content":"${escapedHandle}"[\\s\\S]{0,500}?"metadataParts":\\[\\{"text":\\{"content":"([^"]+)"`);
  const match = html.match(re);
  if (!match) throw new Error('YouTube subscriber count not found in page');
  const count = parseCount(match[1]);
  if (count === null) throw new Error(`Could not parse YouTube count from "${match[1]}"`);
  return count;
}

async function getInstagramFollowers(username) {
  const res = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
    headers: {
      'User-Agent': UA,
      'X-IG-App-ID': '936619743392459',
      'Accept': '*/*',
      'Referer': 'https://www.instagram.com/',
      'Sec-Fetch-Site': 'same-site',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
    },
  });
  if (!res.ok) throw new Error(`Instagram fetch failed: ${res.status}`);
  const data = await res.json();
  const count = data?.data?.user?.edge_followed_by?.count;
  if (typeof count !== 'number') throw new Error('Instagram follower count not found in response');
  return count;
}

async function main() {
  const fs = await import('node:fs/promises');
  const path = new URL('../follow-counts.json', import.meta.url);

  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(path, 'utf-8'));
  } catch {}

  const result = { ...existing };

  try {
    result.youtube = await getYoutubeSubscribers('@_tinkes_');
  } catch (err) {
    console.error('YouTube update failed, keeping previous value:', err.message);
  }

  try {
    result.instagram = await getInstagramFollowers('_tinkes_');
  } catch (err) {
    console.error('Instagram update failed, keeping previous value:', err.message);
  }

  result.updatedAt = new Date().toISOString();

  await fs.writeFile(path, JSON.stringify(result, null, 2) + '\n');
  console.log('Wrote follow-counts.json:', result);
}

main();
