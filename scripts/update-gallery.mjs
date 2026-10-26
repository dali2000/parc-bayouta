#!/usr/bin/env node
/*
  Met à jour data/gallery.json avec les dernières publications officielles de Parc Bayouta,
  leurs chiffres (J'aime, commentaires, partages) et le nombre d'abonnés, via l'API Graph de Meta.
  Exécuté par .github/workflows/update-gallery.yml.

  Variables d'environnement (secrets GitHub) :
    META_ACCESS_TOKEN  jeton d'accès de la Page Facebook (ou d'un utilisateur système Meta Business)
    IG_USER_ID         identifiant du compte Instagram professionnel relié à la Page
    FB_PAGE_ID         identifiant de la Page Facebook
    IG_ACCESS_TOKEN    (alternative) jeton « Instagram API with Instagram Login », sans Page Facebook
    GALLERY_SOURCES    sources à interroger, par défaut "instagram,facebook"
    MAX_AUTO_ITEMS     nombre maximal de publications automatiques conservées (défaut 30)

  Sans aucun jeton, le script ne fait rien et sort sans erreur : la galerie actuelle est conservée.
  Les modifications faites à la main dans gallery.json (titre, catégorie, pinned, wide, hidden) sont préservées ;
  seuls les chiffres (metrics) des publications déjà présentes sont rafraîchis.
*/
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const GRAPH_VERSION = process.env.GRAPH_VERSION || "v21.0";
export const CATEGORIES = ["lieu", "saveurs", "fetes", "animations"];

// mots-clés (français, arabe, anglais) ; un hashtag explicite (#fetes, #saveurs…) l'emporte toujours
const KEYWORDS = [
  ["fetes", /f[êe]tes?\b|anniversaire|mariage|fian[çc]ailles|c[ée]l[ée]bration|birthday|wedding|عيد ميلاد|عرس|حفل|خطوبة|مناسب/i],
  ["animations", /animation|spectacle|clown|concert|\blive\b|soir[ée]e|\bmatch|\bdj\b|\bshow\b|عرض|تنشيط|مهرج|سهرة|مباراة|ماتش/i],
  ["saveurs", /menu|\bplats?\b|buffet|cuisine|d[ée]jeuner|d[îi]ner|brunch|caf[ée]|dessert|pizza|grill|food|أكل|فطور|قهوة|مأكولات|طبق|بوفيه|عشاء|غداء/i],
];

/** Catégorie d'une publication à partir de sa légende. */
export function classify(caption = "") {
  const tags = (caption.match(/#[\p{L}\p{N}_]+/gu) || []).map((t) => t.slice(1).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, ""));
  for (const c of CATEGORIES) if (tags.includes(c) || tags.includes(c.replace(/s$/, ""))) return c;
  for (const [cat, re] of KEYWORDS) if (re.test(caption)) return cat;
  return "lieu";
}

/** La publication demande-t-elle à ne pas apparaître sur le site (#nosite) ? */
export function isExcluded(caption = "") {
  return /#nosite\b/i.test(caption);
}

/** Titre court : première ligne utile de la légende, sans hashtags, 80 caractères au plus. */
export function makeTitle(caption = "", fallback = "Publication") {
  const line = caption.split(/\r?\n/)
    .map((l) => l.replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s+/g, " ").trim())
    .find((l) => /[\p{L}\p{N}]/u.test(l));
  if (!line) return fallback;
  return line.length > 80 ? line.slice(0, 79).replace(/\s+\S*$/, "") + "…" : line;
}

/** URL canonique d'une publication Instagram (/p/CODE/ ou /reel/CODE/). */
export function normalizeInstagramUrl(permalink) {
  const m = /instagram\.com\/(?:[^/]+\/)?(p|reel|tv)\/([A-Za-z0-9_-]+)/.exec(permalink || "");
  if (!m) return null;
  const kind = m[1] === "tv" ? "p" : m[1];
  return { code: m[2], url: `https://www.instagram.com/${kind}/${m[2]}/` };
}

const num = (v) => (Number.isFinite(v) ? v : undefined);
// supprime les clés indéfinies pour garder un JSON propre et comparable
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** Chiffres d'une publication Instagram (like_count peut être masqué par le compte). */
export function instagramMetrics(m) {
  const metrics = clean({ likes: num(m.like_count), comments: num(m.comments_count) });
  return Object.keys(metrics).length ? metrics : undefined;
}

/** Chiffres d'une publication ou d'une photo Facebook. */
export function facebookMetrics(p) {
  const metrics = clean({
    likes: num(p.reactions?.summary?.total_count),
    comments: num(p.comments?.summary?.total_count),
    shares: p.shares ? num(p.shares.count) : undefined,
  });
  return Object.keys(metrics).length ? metrics : undefined;
}

/** Publications Instagram de l'API → éléments de galerie. */
export function fromInstagram(media) {
  const out = [];
  for (const m of media) {
    if (m.media_product_type === "STORY") continue;
    if (isExcluded(m.caption)) continue;
    const link = normalizeInstagramUrl(m.permalink);
    if (!link) continue;
    out.push(clean({
      id: `ig:${link.code}`,
      platform: "instagram",
      url: link.url,
      date: new Date(m.timestamp).toISOString(),
      category: classify(m.caption),
      title: makeTitle(m.caption, m.media_type === "VIDEO" ? "Vidéo du Parc" : "Photo du Parc"),
      metrics: instagramMetrics(m),
      auto: true,
    }));
  }
  return out;
}

/** Publications de la Page Facebook → éléments de galerie (uniquement celles avec une image). */
export function fromFacebook(posts) {
  const out = [];
  for (const p of posts) {
    if (!p.full_picture || !p.permalink_url) continue;
    if (isExcluded(p.message)) continue;
    out.push(clean({
      id: `fb:${p.id}`,
      platform: "facebook",
      url: p.permalink_url,
      date: new Date(p.created_time).toISOString(),
      category: classify(p.message),
      title: makeTitle(p.message, "Photo du Parc"),
      metrics: facebookMetrics(p),
      auto: true,
    }));
  }
  return out;
}

/**
  Fusionne les nouvelles publications dans la galerie existante.
  - les éléments déjà présents gardent leurs réglages manuels ; seuls leurs chiffres sont rafraîchis ;
  - les nouveaux sont ajoutés ;
  - seuls les MAX_AUTO_ITEMS éléments automatiques les plus récents sont conservés
    (les éléments ajoutés à la main ou épinglés ne sont jamais supprimés).
*/
export function merge(existing, incoming, maxAuto = 30) {
  const byId = new Map(existing.map((it) => [it.id, { ...it }]));
  let added = 0;
  let refreshed = 0;
  for (const it of incoming) {
    const cur = byId.get(it.id);
    if (!cur) {
      byId.set(it.id, it);
      added++;
    } else if (it.metrics && JSON.stringify(cur.metrics) !== JSON.stringify(it.metrics)) {
      cur.metrics = it.metrics;
      refreshed++;
    }
  }
  const all = [...byId.values()];
  const keepAuto = new Set(
    all.filter((it) => it.auto && !it.pinned)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, maxAuto)
      .map((it) => it.id),
  );
  const items = all.filter((it) => !it.auto || it.pinned || keepAuto.has(it.id));
  return { items, added, refreshed, removed: all.length - items.length };
}

async function getJson(url, fetchImpl) {
  const res = await fetchImpl(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const msg = body.error ? `${body.error.type || "Erreur"} : ${body.error.message}` : `HTTP ${res.status}`;
    throw new Error(`API Meta — ${msg}`);
  }
  return body;
}

/** Récupère toutes les pages d'un appel Graph (suit paging.next), avec une limite de sécurité. */
export async function fetchAll(url, { fetchImpl = fetch, maxPages = 5 } = {}) {
  const data = [];
  let next = url;
  for (let i = 0; next && i < maxPages; i++) {
    const body = await getJson(next, fetchImpl);
    data.push(...(body.data || []));
    next = body.paging && body.paging.next;
  }
  return data;
}

const FB_METRIC_FIELDS = "reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)";

export async function collect(env = process.env, { fetchImpl = fetch } = {}) {
  const sources = (env.GALLERY_SOURCES || "instagram,facebook").split(",").map((s) => s.trim());
  const igFields = "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count";
  const incoming = [];
  const used = [];
  const stats = {};
  const tok = (t) => encodeURIComponent(t);

  if (sources.includes("instagram")) {
    let base = null;
    let token = null;
    if (env.IG_ACCESS_TOKEN) {
      base = `https://graph.instagram.com/${GRAPH_VERSION}/me`;
      token = env.IG_ACCESS_TOKEN;
    } else if (env.META_ACCESS_TOKEN && env.IG_USER_ID) {
      base = `https://graph.facebook.com/${GRAPH_VERSION}/${env.IG_USER_ID}`;
      token = env.META_ACCESS_TOKEN;
    }
    if (base) {
      incoming.push(...fromInstagram(await fetchAll(`${base}/media?fields=${igFields}&limit=50&access_token=${tok(token)}`, { fetchImpl })));
      const acc = await getJson(`${base}?fields=followers_count,media_count&access_token=${tok(token)}`, fetchImpl);
      stats.instagram = clean({ followers: num(acc.followers_count), posts: num(acc.media_count) });
      used.push("instagram");
    }
  }
  if (sources.includes("facebook") && env.META_ACCESS_TOKEN && env.FB_PAGE_ID) {
    const base = `https://graph.facebook.com/${GRAPH_VERSION}`;
    const fields = `id,message,permalink_url,created_time,full_picture,shares,${FB_METRIC_FIELDS}`;
    incoming.push(...fromFacebook(await fetchAll(`${base}/${env.FB_PAGE_ID}/posts?fields=${fields}&limit=50&access_token=${tok(env.META_ACCESS_TOKEN)}`, { fetchImpl })));
    const page = await getJson(`${base}/${env.FB_PAGE_ID}?fields=followers_count,fan_count&access_token=${tok(env.META_ACCESS_TOKEN)}`, fetchImpl);
    stats.facebook = clean({ followers: num(page.followers_count) ?? num(page.fan_count) });
    used.push("facebook");
  }
  return { incoming, used, stats };
}

/**
  Chiffres des photos Facebook ajoutées à la main (id « fb:<fbid> », absentes de /posts) :
  une requête par photo. Une erreur sur une photo n'interrompt pas la mise à jour.
*/
export async function refreshFacebookPhotos(items, env, { fetchImpl = fetch, seen = new Set(), log = console.log } = {}) {
  if (!env.META_ACCESS_TOKEN) return 0;
  let refreshed = 0;
  for (const it of items) {
    if (it.platform !== "facebook" || seen.has(it.id)) continue;
    const objectId = it.id.replace(/^fb:/, "");
    if (!/^\d+$/.test(objectId)) continue;
    try {
      const body = await getJson(`https://graph.facebook.com/${GRAPH_VERSION}/${objectId}?fields=${FB_METRIC_FIELDS}&access_token=${encodeURIComponent(env.META_ACCESS_TOKEN)}`, fetchImpl);
      const metrics = { ...(it.metrics || {}), ...facebookMetrics(body) };
      if (JSON.stringify(metrics) !== JSON.stringify(it.metrics)) {
        it.metrics = metrics;
        refreshed++;
      }
    } catch (err) {
      log(`Chiffres indisponibles pour ${it.id} : ${err.message}`);
    }
  }
  return refreshed;
}

export async function run({ file, env = process.env, fetchImpl = fetch, now = new Date(), log = console.log } = {}) {
  const { incoming, used, stats } = await collect(env, { fetchImpl });
  if (!used.length) {
    log("Aucun jeton Meta configuré : galerie inchangée.");
    return { changed: false };
  }
  const original = await readFile(file, "utf8");
  const gallery = JSON.parse(original);
  const max = Number(env.MAX_AUTO_ITEMS) || 30;
  const { items, added, removed, refreshed: fromLists } = merge(gallery.items || [], incoming, max);
  const fromPhotos = used.includes("facebook")
    ? await refreshFacebookPhotos(items, env, { fetchImpl, seen: new Set(incoming.map((i) => i.id)), log })
    : 0;
  gallery.items = items;
  gallery.stats = { ...(gallery.stats || {}), ...stats };

  const { updatedAt, ...before } = JSON.parse(original);
  const { updatedAt: _ignored, ...after } = gallery;
  const refreshed = fromLists + fromPhotos;
  log(`Sources : ${used.join(", ")} — ${incoming.length} publication(s) lue(s), ${added} nouvelle(s), ${refreshed} chiffre(s) mis à jour, ${removed} retirée(s).`);
  if (JSON.stringify(before) === JSON.stringify(after)) return { changed: false, added, refreshed, removed };

  gallery.updatedAt = now.toISOString();
  await writeFile(file, JSON.stringify(gallery, null, 2) + "\n");
  return { changed: true, added, refreshed, removed };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  run({ file: path.join(root, "data", "gallery.json") }).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
