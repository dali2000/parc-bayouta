import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  classify, isExcluded, makeTitle, normalizeInstagramUrl,
  fromInstagram, fromFacebook, merge, fetchAll, run,
  instagramMetrics, facebookMetrics, refreshFacebookPhotos,
} from "./update-gallery.mjs";

test("classify : hashtag explicite prioritaire, avec ou sans accent ni pluriel", () => {
  assert.equal(classify("Super soirée #lieu"), "lieu");
  assert.equal(classify("Notre salle #Fêtes"), "fetes");
  assert.equal(classify("Nouveau #fete"), "fetes");
  assert.equal(classify("Ce soir #animation"), "animations");
});

test("classify : mots-clés en français, arabe et anglais", () => {
  assert.equal(classify("Fêtez votre anniversaire au Parc"), "fetes");
  assert.equal(classify("حبّيت تحتفل بعيد ميلاد"), "fetes");
  assert.equal(classify("Diffusion du match ce soir"), "animations");
  assert.equal(classify("عرض المهرج يوم الأحد"), "animations");
  assert.equal(classify("Notre buffet du dimanche"), "saveurs");
  assert.equal(classify("Happy birthday!"), "fetes");
  assert.equal(classify("Belle journée au Parc"), "lieu");
  assert.equal(classify(undefined), "lieu");
});

test("isExcluded : #nosite retire la publication du site", () => {
  assert.equal(isExcluded("Promo privée #nosite"), true);
  assert.equal(isExcluded("Publication normale"), false);
});

test("makeTitle : première ligne utile, sans hashtags, tronquée proprement", () => {
  assert.equal(makeTitle("#parc #bayouta\n🎉\nBienvenue au Parc ! #famille"), "Bienvenue au Parc !");
  assert.equal(makeTitle("", "Photo du Parc"), "Photo du Parc");
  const long = makeTitle("mot ".repeat(40));
  assert.ok(long.length <= 80 && long.endsWith("…"));
});

test("normalizeInstagramUrl : /p/, /reel/, /tv/ et URL avec nom de compte", () => {
  assert.deepEqual(normalizeInstagramUrl("https://www.instagram.com/p/ABC_1-x/?igsh=1"),
    { code: "ABC_1-x", url: "https://www.instagram.com/p/ABC_1-x/" });
  assert.deepEqual(normalizeInstagramUrl("https://www.instagram.com/parc_bayouta/reel/XYZ/"),
    { code: "XYZ", url: "https://www.instagram.com/reel/XYZ/" });
  assert.equal(normalizeInstagramUrl("https://www.instagram.com/tv/T1/").url, "https://www.instagram.com/p/T1/");
  assert.equal(normalizeInstagramUrl("https://example.com"), null);
});

test("fromInstagram : ignore les stories et #nosite, construit les éléments", () => {
  const items = fromInstagram([
    { id: "1", caption: "Notre buffet", media_type: "IMAGE", media_product_type: "FEED", permalink: "https://www.instagram.com/p/AAA/", timestamp: "2026-10-30T10:00:00+0000" },
    { id: "2", caption: "", media_type: "VIDEO", media_product_type: "REELS", permalink: "https://www.instagram.com/reel/BBB/", timestamp: "2026-10-31T10:00:00+0000" },
    { id: "3", caption: "story", media_type: "IMAGE", media_product_type: "STORY", permalink: "https://www.instagram.com/stories/x/3/", timestamp: "2026-10-31T10:00:00+0000" },
    { id: "4", caption: "privé #nosite", media_type: "IMAGE", media_product_type: "FEED", permalink: "https://www.instagram.com/p/CCC/", timestamp: "2026-10-31T10:00:00+0000" },
  ]);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    id: "ig:AAA", platform: "instagram", url: "https://www.instagram.com/p/AAA/",
    date: "2026-10-30T10:00:00.000Z", category: "saveurs", title: "Notre buffet", auto: true,
  }); // pas de chiffres fournis : pas de clé metrics
  assert.equal(items[1].title, "Vidéo du Parc");
});

test("fromFacebook : ne garde que les publications avec image et lien", () => {
  const items = fromFacebook([
    { id: "10_1", message: "Fêtez votre anniversaire", permalink_url: "https://www.facebook.com/x/posts/1", created_time: "2026-10-30T10:00:00+0000", full_picture: "https://img" },
    { id: "10_2", message: "Texte seul", permalink_url: "https://www.facebook.com/x/posts/2", created_time: "2026-10-30T10:00:00+0000" },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "fb:10_1");
  assert.equal(items[0].category, "fetes");
});

test("merge : préserve les réglages manuels, ajoute les nouveautés, limite les automatiques", () => {
  const existing = [
    { id: "fb:1", title: "Façade (manuel)", category: "lieu", pinned: true, date: "2026-01-01T00:00:00.000Z" },
    { id: "ig:A", title: "Titre corrigé à la main", category: "fetes", auto: true, date: "2026-10-01T00:00:00.000Z" },
    { id: "ig:OLD", auto: true, date: "2026-01-01T00:00:00.000Z" },
  ];
  const incoming = [
    { id: "ig:A", title: "Titre de l'API", category: "lieu", auto: true, date: "2026-10-01T00:00:00.000Z" },
    { id: "ig:NEW", title: "Nouveau", auto: true, date: "2026-10-30T00:00:00.000Z" },
  ];
  const { items, added, removed } = merge(existing, incoming, 2);
  assert.equal(added, 1);
  assert.equal(removed, 1); // ig:OLD, le plus ancien des automatiques, dépasse la limite de 2
  assert.deepEqual(items.map((i) => i.id).sort(), ["fb:1", "ig:A", "ig:NEW"]);
  assert.equal(items.find((i) => i.id === "ig:A").title, "Titre corrigé à la main");
});

const fakeFetch = (routes) => async (url) => {
  const key = Object.keys(routes).find((k) => url.includes(k));
  if (!key) throw new Error("URL inattendue : " + url);
  const r = routes[key];
  return { ok: r.status ? r.status < 400 : true, status: r.status || 200, json: async () => r.body };
};

test("fetchAll : suit la pagination et remonte les erreurs Meta", async () => {
  const f = fakeFetch({
    "page=1": { body: { data: [1, 2], paging: { next: "https://graph/x?page=2" } } },
    "page=2": { body: { data: [3] } },
    "bad": { status: 400, body: { error: { type: "OAuthException", message: "Jeton expiré" } } },
  });
  assert.deepEqual(await fetchAll("https://graph/x?page=1", { fetchImpl: f }), [1, 2, 3]);
  await assert.rejects(fetchAll("https://graph/bad", { fetchImpl: f }), /OAuthException : Jeton expiré/);
});

test("run : sans jeton, rien n'est modifié", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "gal-"));
  const file = path.join(dir, "gallery.json");
  await writeFile(file, '{"items":[]}');
  const res = await run({ file, env: {}, log: () => {} });
  assert.equal(res.changed, false);
  assert.equal(await readFile(file, "utf8"), '{"items":[]}');
});

test("chiffres : J'aime, commentaires et partages, clés absentes si non fournies", () => {
  assert.deepEqual(instagramMetrics({ like_count: 15, comments_count: 2 }), { likes: 15, comments: 2 });
  assert.deepEqual(instagramMetrics({ comments_count: 0 }), { comments: 0 }); // J'aime masqués par le compte
  assert.equal(instagramMetrics({}), undefined);
  assert.deepEqual(facebookMetrics({
    reactions: { summary: { total_count: 7 } }, comments: { summary: { total_count: 6 } }, shares: { count: 2 },
  }), { likes: 7, comments: 6, shares: 2 });
  assert.deepEqual(facebookMetrics({ reactions: { summary: { total_count: 0 } } }), { likes: 0 });
});

test("merge : rafraîchit les chiffres des publications existantes sans toucher aux réglages", () => {
  const existing = [{ id: "ig:A", title: "Titre manuel", category: "fetes", pinned: true, metrics: { likes: 4 } }];
  const incoming = [{ id: "ig:A", title: "API", category: "lieu", metrics: { likes: 9, comments: 1 }, auto: true }];
  const { items, added, refreshed } = merge(existing, incoming);
  assert.equal(added, 0);
  assert.equal(refreshed, 1);
  assert.deepEqual(items[0], { id: "ig:A", title: "Titre manuel", category: "fetes", pinned: true, metrics: { likes: 9, comments: 1 } });
  assert.equal(merge(items, incoming).refreshed, 0); // mêmes chiffres : rien à faire
});

test("refreshFacebookPhotos : une requête par photo ajoutée à la main, erreurs isolées", async () => {
  const items = [
    { id: "fb:111", platform: "facebook", metrics: { likes: 1, shares: 3 } },
    { id: "fb:222", platform: "facebook" },
    { id: "fb:10_99", platform: "facebook" },  // publication issue de /posts : ignorée
    { id: "ig:X", platform: "instagram" },
  ];
  const calls = [];
  const f = async (url) => {
    calls.push(url);
    if (url.includes("/222?")) return { ok: false, status: 400, json: async () => ({ error: { type: "GraphMethodException", message: "Objet introuvable" } }) };
    return { ok: true, status: 200, json: async () => ({ reactions: { summary: { total_count: 17 } }, comments: { summary: { total_count: 1 } } }) };
  };
  const logs = [];
  const n = await refreshFacebookPhotos(items, { META_ACCESS_TOKEN: "t" }, { fetchImpl: f, log: (m) => logs.push(m) });
  assert.equal(n, 1);
  assert.equal(calls.length, 2);
  assert.deepEqual(items[0].metrics, { likes: 17, shares: 3, comments: 1 });
  assert.match(logs[0], /fb:222.*Objet introuvable/);
});

const metaRoutes = (extraPosts = []) => fakeFetch({
  "/IG1/media": { body: { data: [
    { caption: "Déjà là", permalink: "https://www.instagram.com/p/AAA/", timestamp: "2026-10-01T00:00:00+0000", media_type: "IMAGE", like_count: 12, comments_count: 3 },
    { caption: "Soirée spectacle", permalink: "https://www.instagram.com/reel/NEW/", timestamp: "2026-11-01T00:00:00+0000", media_type: "VIDEO", like_count: 5 },
  ] } },
  "/IG1?fields": { body: { followers_count: 2900, media_count: 210 } },
  "/PAGE1/posts": { body: { data: [
    { id: "P_1", message: "Notre salle des fêtes", permalink_url: "https://www.facebook.com/x/posts/1", created_time: "2026-11-02T00:00:00+0000", full_picture: "https://img",
      reactions: { summary: { total_count: 40 } }, comments: { summary: { total_count: 4 } }, shares: { count: 1 } },
    ...extraPosts,
  ] } },
  "/PAGE1?fields": { body: { followers_count: 11234 } },
  "/122163133958937489?fields": { body: { reactions: { summary: { total_count: 18 } }, comments: { summary: { total_count: 1 } } } },
});
const metaEnv = { META_ACCESS_TOKEN: "t", IG_USER_ID: "IG1", FB_PAGE_ID: "PAGE1" };

test("run : ajoute les nouveautés, rafraîchit tous les chiffres et les abonnés", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "gal-"));
  const file = path.join(dir, "gallery.json");
  await writeFile(file, JSON.stringify({ updatedAt: "2026-01-01T00:00:00.000Z", items: [
    { id: "ig:AAA", title: "Déjà là", metrics: { likes: 4 } },
    { id: "fb:122163133958937489", platform: "facebook", title: "Façade", pinned: true, metrics: { likes: 17, comments: 1 } },
  ] }));
  const now = new Date("2026-11-02T06:00:00.000Z");
  const res = await run({ file, env: metaEnv, fetchImpl: metaRoutes(), now, log: () => {} });
  assert.deepEqual(res, { changed: true, added: 2, refreshed: 2, removed: 0 });
  const out = JSON.parse(await readFile(file, "utf8"));
  assert.equal(out.updatedAt, now.toISOString());
  assert.deepEqual(out.stats, { instagram: { followers: 2900, posts: 210 }, facebook: { followers: 11234 } });
  const byId = Object.fromEntries(out.items.map((i) => [i.id, i]));
  assert.deepEqual(byId["ig:AAA"].metrics, { likes: 12, comments: 3 });
  assert.deepEqual(byId["fb:122163133958937489"].metrics, { likes: 18, comments: 1 });
  assert.equal(byId["ig:NEW"].category, "animations");
  assert.deepEqual(byId["fb:P_1"].metrics, { likes: 40, comments: 4, shares: 1 });
});

test("run : un second passage sans changement n'écrit rien", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "gal-"));
  const file = path.join(dir, "gallery.json");
  await writeFile(file, JSON.stringify({ items: [] }));
  await run({ file, env: metaEnv, fetchImpl: metaRoutes(), now: new Date("2026-11-02T06:00:00Z"), log: () => {} });
  const first = await readFile(file, "utf8");
  const res = await run({ file, env: metaEnv, fetchImpl: metaRoutes(), now: new Date("2026-11-02T12:00:00Z"), log: () => {} });
  assert.equal(res.changed, false);
  assert.equal(await readFile(file, "utf8"), first); // updatedAt inchangé : pas de commit inutile
});
