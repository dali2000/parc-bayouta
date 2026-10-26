/* Parc Bayouta — interactions du site (aucune dépendance) */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.remove("no-js");
  doc.classList.add("js-ready");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var photos = Array.isArray(window.BAYOUTA_PHOTOS) ? window.BAYOUTA_PHOTOS.filter(function (p) { return p && p.src; }) : [];

  /* ---------- En-tête : fond au défilement + bouton d'appel ---------- */
  var header = document.querySelector(".site-header");
  var fab = document.querySelector(".fab-call");
  var hero = document.querySelector(".hero");

  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 40);
    if (fab && hero) fab.classList.toggle("is-visible", y > hero.offsetHeight * 0.6);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Monogramme « PB » du logo : l'animation de tracé démarre une fois la police Italianno chargée ---------- */
  var monoStarted = false;
  function startMonogram() {
    if (monoStarted || !hero) return;
    monoStarted = true;
    hero.classList.add("mono-ready");
  }
  if (document.fonts && document.fonts.load) {
    document.fonts.load('400 100px "Italianno"').then(startMonogram, startMonogram);
    setTimeout(startMonogram, 2500); // réseau lent : on n'attend pas plus
  } else {
    startMonogram();
  }

  /* ---------- Menu mobile ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("menu");

  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    nav.classList.toggle("is-open", open);
    header.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  }
  toggle.addEventListener("click", function () {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
  });

  /* ---------- Apparition des éléments au défilement ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // léger décalage entre éléments frères pour un effet en cascade
        var siblings = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.classList.contains("reveal"); });
        el.style.transitionDelay = Math.min(siblings.indexOf(el), 5) * 90 + "ms";
        el.classList.add("is-visible");
        revealObserver.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Lien actif dans la navigation ---------- */
  var navLinks = nav.querySelectorAll('a[href^="#"]');
  if ("IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { sectionObserver.observe(s); });
  }

  /* ---------- Photos locales (assets/photos/photos.js) ---------- */
  var heroPhoto = photos.filter(function (p) { return p.hero; })[0];
  if (heroPhoto) {
    var media = document.querySelector("[data-hero-media]");
    var img = new Image();
    img.src = heroPhoto.src;
    img.alt = "";
    img.decoding = "async";
    img.fetchPriority = "high";
    media.appendChild(img);
    hero.classList.add("has-photo");
  }

  var grid = document.querySelector("[data-photo-grid]");
  if (photos.length && grid) {
    photos.forEach(function (p, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", "Agrandir : " + (p.alt || "photo " + (i + 1)));
      btn.innerHTML = '<figure style="margin:0;height:100%"><img loading="lazy" decoding="async"></figure>';
      var im = btn.querySelector("img");
      im.src = p.src;
      im.alt = p.alt || "";
      if (p.legende) {
        var cap = document.createElement("figcaption");
        cap.textContent = p.legende;
        btn.firstChild.appendChild(cap);
      }
      btn.addEventListener("click", function () { openLightbox(i); });
      grid.appendChild(btn);
    });
    grid.hidden = false;
    document.querySelector(".section-intro").textContent =
      "Photos du Parc Bayouta, suivies des dernières publications de son compte Instagram officiel.";
  }

  /* ---------- Visionneuse (zoom) ---------- */
  var lb = document.querySelector("[data-lightbox]");
  var lbImg = lb.querySelector("[data-lb-img]");
  var lbCap = lb.querySelector("[data-lb-caption]");
  var current = 0;

  function showPhoto(i) {
    current = (i + photos.length) % photos.length;
    var p = photos[current];
    lbImg.src = p.src;
    lbImg.alt = p.alt || "";
    var credit = p.credit ? " — " + p.credit : "";
    lbCap.textContent = (p.legende || "") + credit + "  (" + (current + 1) + "/" + photos.length + ")";
  }
  function openLightbox(i) {
    showPhoto(i);
    if (typeof lb.showModal === "function") lb.showModal(); else lb.setAttribute("open", "");
  }
  lb.querySelector("[data-lb-close]").addEventListener("click", function () { lb.close(); });
  lb.querySelector("[data-lb-prev]").addEventListener("click", function () { showPhoto(current - 1); });
  lb.querySelector("[data-lb-next]").addEventListener("click", function () { showPhoto(current + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") showPhoto(current - 1);
    if (e.key === "ArrowRight") showPhoto(current + 1);
  });
  // balayage tactile
  var touchX = null;
  lb.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) showPhoto(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- Chargement différé : intégrations Instagram / Facebook + carte ---------- */
  function whenNear(el, cb) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); cb(); }
    }, { rootMargin: "400px 0px" });
    io.observe(el);
  }

  var embedRequested = false;

  // charge embed.js une seule fois, puis demande à Instagram de traiter les nouvelles publications
  function processEmbeds() {
    if (window.instgrm && window.instgrm.Embeds) { window.instgrm.Embeds.process(); return; }
    if (embedRequested) return;
    embedRequested = true;
    var s = document.createElement("script");
    s.src = "https://www.instagram.com/embed.js";
    s.async = true;
    document.body.appendChild(s);
  }

  // intégrations Facebook officielles (SDK chargé une seule fois, au besoin)
  var fbRequested = false;
  // largeur exacte de la carte (350–750 px exigés par Facebook) ; "auto" seulement en dessous
  function sizeFacebookPosts() {
    document.querySelectorAll(".fb-post:not([fb-xfbml-state])").forEach(function (post) {
      var w = Math.floor(post.parentElement.clientWidth);
      post.setAttribute("data-width", w >= 350 ? String(Math.min(w, 750)) : "auto");
    });
  }

  function loadFacebook() {
    sizeFacebookPosts();
    if (window.FB && window.FB.XFBML) { window.FB.XFBML.parse(); return; }
    if (fbRequested) return;
    fbRequested = true;
    // injecté dynamiquement, le SDK ignore les paramètres de son URL : on l'initialise nous-mêmes
    window.fbAsyncInit = function () {
      window.FB.init({ xfbml: true, version: "v21.0" });
    };
    var s = document.createElement("script");
    s.src = "https://connect.facebook.net/fr_FR/sdk.js";
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    document.body.appendChild(s);
  }

  /* ---------- Galerie dynamique : data/gallery.json ----------
     Le fichier est mis à jour automatiquement (GitHub Actions, voir README) ou à la main.
     Ordre : publications épinglées (« pinned ») d'abord, puis les plus récentes. */
  var CATS = { lieu: "Le lieu", saveurs: "Saveurs", fetes: "Salle des fêtes", animations: "Animations" };
  var PAGE_SLOTS = 6;   // une page = 6 emplacements ; une carte large en occupe 2
  var NEW_DAYS = 7;     // badge « Nouveau » pour les publications de moins de 7 jours
  var EVENTS_PHOTOS = 2;

  var instaGrid = document.querySelector("[data-insta-grid]");
  var filtersEl = document.querySelector("[data-gallery-filters]");
  var statusEl = document.querySelector("[data-gallery-status]");
  var fallbackEl = document.querySelector("[data-gallery-fallback]");
  var moreBtn = document.querySelector("[data-gallery-more]");
  var moreWrap = moreBtn && moreBtn.parentElement;
  var eventsEl = document.querySelector("[data-events-photos]");

  var galleryItems = [];
  var cards = {};
  var activeFilter = "tout";
  var limitSlots = PAGE_SLOTS;
  var galleryStarted = false;

  function sortItems(list) {
    return list
      .map(function (it, i) { return { it: it, i: i }; })
      .sort(function (a, b) {
        var pa = a.it.pinned ? 1 : 0, pb = b.it.pinned ? 1 : 0;
        if (pa !== pb) return pb - pa;
        if (pa) return a.i - b.i; // épinglées : ordre du fichier
        var d = (b.it.date || "").localeCompare(a.it.date || "");
        return d || a.i - b.i;
      })
      .map(function (x) { return x.it; });
  }

  function formatDate(iso, long) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: long ? "long" : "short", year: "numeric" });
  }

  function isNew(iso) {
    var t = Date.parse(iso);
    return !isNaN(t) && Date.now() - t < NEW_DAYS * 864e5;
  }

  // contenu de l'intégration officielle, créé seulement quand la carte doit s'afficher
  function embedFor(item) {
    var label = (item.title || "Publication") + " — voir sur " + (item.platform === "facebook" ? "Facebook" : "Instagram");
    var link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = label;
    var quote = document.createElement("blockquote");
    quote.appendChild(link);
    if (item.platform === "facebook") {
      var post = document.createElement("div");
      post.className = "fb-post";
      post.setAttribute("data-href", item.url);
      post.setAttribute("data-width", "auto");
      post.setAttribute("data-show-text", "false");
      quote.setAttribute("cite", item.url);
      quote.className = "fb-xfbml-parse-ignore";
      post.appendChild(quote);
      return post;
    }
    quote.className = "instagram-media";
    quote.setAttribute("data-instgrm-permalink", item.url);
    quote.setAttribute("data-instgrm-version", "14");
    return quote;
  }

  var REFRESH_MS = 5 * 60 * 1000; // relecture de data/gallery.json pendant que la page est ouverte
  var cardsById = {};              // toutes les cartes d'une publication (galerie + salle des fêtes)
  var lastLoad = 0;

  var nf = new Intl.NumberFormat("fr-FR");
  var nfCompact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
  function formatCount(n) { return n >= 10000 ? nfCompact.format(n) : nf.format(n); }

  function timeAgo(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) return "";
    var s = Math.min(0, Math.round((t - Date.now()) / 1000)); // horloge du visiteur en retard : « à l'instant »
    var rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
    var units = [["day", 86400], ["hour", 3600], ["minute", 60]];
    for (var i = 0; i < units.length; i++) {
      if (Math.abs(s) >= units[i][1]) return rtf.format(Math.round(s / units[i][1]), units[i][0]);
    }
    return "à l'instant";
  }

  function svgIcon(id) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS(ns, "use");
    use.setAttribute("href", "#" + id);
    svg.appendChild(use);
    return svg;
  }

  // J'aime, commentaires et partages de la publication (si l'API les fournit)
  var METRICS = [["likes", "i-heart", "J'aime", "J'aime"], ["comments", "i-comment", "commentaire", "commentaires"], ["shares", "i-share", "partage", "partages"]];
  function setMetrics(card, item) {
    var box = card._metrics;
    var m = item.metrics || {};
    var key = JSON.stringify(m);
    if (box._key === key) return;
    var changed = box._key !== undefined;
    box._key = key;
    box.innerHTML = "";
    var labels = [];
    METRICS.forEach(function (def) {
      if (typeof m[def[0]] !== "number") return;
      var el = document.createElement("span");
      el.appendChild(svgIcon(def[1]));
      el.appendChild(document.createTextNode(formatCount(m[def[0]])));
      box.appendChild(el);
      labels.push(nf.format(m[def[0]]) + " " + (m[def[0]] > 1 ? def[3] : def[2]));
    });
    box.hidden = !labels.length;
    box.setAttribute("aria-label", labels.join(", "));
    if (changed && !reduceMotion) {
      box.classList.remove("is-updated");
      void box.offsetWidth; // relance l'animation
      box.classList.add("is-updated");
    }
  }

  // carte vide (légende seulement) ; l'intégration est ajoutée par materialize()
  function buildCard(item, tagName, className) {
    var card = document.createElement(tagName);
    card.className = className + (item.wide ? " is-wide" : "");
    card.setAttribute("data-cat", item.category || "lieu");
    var cap = document.createElement(tagName === "figure" ? "figcaption" : "p");
    cap.className = "insta-caption";
    var tag = document.createElement("span");
    tag.textContent = CATS[item.category] || CATS.lieu;
    cap.appendChild(tag);
    if (isNew(item.date)) {
      var badge = document.createElement("em");
      badge.className = "badge-new";
      badge.textContent = "Nouveau";
      cap.appendChild(badge);
    }
    var title = document.createElement("strong");
    title.className = "insta-title";
    title.dir = "auto";
    cap.appendChild(title);
    var footer = document.createElement("small");
    var meta = document.createElement("span");
    meta.className = "insta-meta";
    meta.textContent = [formatDate(item.date), item.platform === "facebook" ? "Facebook" : "Instagram"].filter(Boolean).join(" · ");
    var metrics = document.createElement("span");
    metrics.className = "insta-metrics";
    metrics.setAttribute("role", "img");
    footer.appendChild(meta);
    footer.appendChild(metrics);
    cap.appendChild(footer);
    card.appendChild(cap);
    card._title = title;
    card._metrics = metrics;
    updateCard(card, item);
    (cardsById[item.id] = cardsById[item.id] || []).push(card);
    return card;
  }

  function updateCard(card, item) {
    card._item = item;
    card._title.textContent = item.title || "Publication du Parc";
    setMetrics(card, item);
  }

  function materialize(card) {
    if (card._ready) return false;
    card.insertBefore(embedFor(card._item), card.firstChild);
    card._ready = true;
    return true;
  }

  function refreshEmbeds() {
    processEmbeds();
    loadFacebook();
  }

  function renderGallery() {
    var matches = galleryItems.filter(function (it) {
      return activeFilter === "tout" || it.category === activeFilter;
    });
    var used = 0, shown = 0, added = false;
    var visible = {};
    matches.forEach(function (it) {
      var slots = it.wide ? 2 : 1;
      if (used + slots <= limitSlots || shown === 0) {
        visible[it.id] = true;
        used += slots;
        shown++;
      }
    });
    galleryItems.forEach(function (it) {
      var card = cards[it.id];
      if (visible[it.id]) {
        if (materialize(card)) added = true;
        if (card.hidden) {
          card.hidden = false;
          if (!reduceMotion) {
            card.classList.add("is-entering");
            card.addEventListener("animationend", function () { card.classList.remove("is-entering"); }, { once: true });
          }
        }
      } else {
        card.hidden = true;
      }
    });
    moreWrap.hidden = shown >= matches.length;
    instaGrid.setAttribute("aria-busy", "false");
    if (added) refreshEmbeds();
  }

  function buildFilters() {
    var counts = { tout: galleryItems.length };
    galleryItems.forEach(function (it) { counts[it.category] = (counts[it.category] || 0) + 1; });
    if (activeFilter !== "tout" && !counts[activeFilter]) activeFilter = "tout";
    var keys = ["tout"].concat(Object.keys(CATS).filter(function (k) { return counts[k]; }));
    filtersEl.innerHTML = "";
    keys.forEach(function (k) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (k === activeFilter ? " is-active" : "");
      chip.setAttribute("data-filter", k);
      chip.setAttribute("aria-pressed", String(k === activeFilter));
      chip.textContent = k === "tout" ? "Tout " : CATS[k] + " ";
      var n = document.createElement("span");
      n.textContent = counts[k];
      chip.appendChild(n);
      chip.addEventListener("click", function () {
        activeFilter = k;
        limitSlots = PAGE_SLOTS;
        filtersEl.querySelectorAll(".chip").forEach(function (c) {
          var on = c === chip;
          c.classList.toggle("is-active", on);
          c.setAttribute("aria-pressed", String(on));
        });
        if (galleryStarted) renderGallery();
      });
      filtersEl.appendChild(chip);
    });
  }

  function renderEvents(all) {
    if (!eventsEl) return;
    var fetes = all.filter(function (it) { return it.category === "fetes"; }).slice(0, EVENTS_PHOTOS);
    if (!fetes.length) { eventsEl.hidden = true; return; }
    fetes.forEach(function (it) {
      var fig = buildCard(it, "figure", "events-photo");
      eventsEl.appendChild(fig);
    });
    whenNear(eventsEl, function () {
      eventsEl.querySelectorAll(".events-photo").forEach(materialize);
      refreshEmbeds();
    });
  }

  function renderStatus(data) {
    var likes = galleryItems.reduce(function (sum, it) {
      return sum + (it.metrics && typeof it.metrics.likes === "number" ? it.metrics.likes : 0);
    }, 0);
    var parts = [galleryItems.length + " publications"];
    if (likes) parts.push(nf.format(likes) + " J'aime");
    if (data.updatedAt) parts.push("mis à jour " + timeAgo(data.updatedAt));
    statusEl.textContent = parts.join(" · ");
    statusEl.title = data.updatedAt ? "Dernière mise à jour : " + new Date(data.updatedAt).toLocaleString("fr-FR") : "";
  }

  // abonnés et publications des comptes officiels, dans le bandeau « Suivez-nous »
  function renderFollowStats(stats) {
    var list = document.querySelector("[data-follow-stats]");
    if (!list || !stats) return;
    var rows = [];
    if (stats.instagram && typeof stats.instagram.followers === "number") {
      rows.push([formatCount(stats.instagram.followers), "abonnés Instagram"]);
    }
    if (stats.facebook && typeof stats.facebook.followers === "number") {
      rows.push([(stats.facebook.approximate ? "≈ " : "") + formatCount(stats.facebook.followers), "abonnés Facebook"]);
    }
    if (stats.instagram && typeof stats.instagram.posts === "number") {
      rows.push([formatCount(stats.instagram.posts), "publications"]);
    }
    list.innerHTML = "";
    rows.forEach(function (r) {
      var li = document.createElement("li");
      var b = document.createElement("strong");
      b.textContent = r[0];
      li.appendChild(b);
      li.appendChild(document.createTextNode(" " + r[1]));
      list.appendChild(li);
    });
    list.hidden = !rows.length;
  }

  // premier affichage et mises à jour : les cartes existantes sont conservées (pas de rechargement
  // des intégrations), les chiffres sont mis à jour sur place, les nouvelles publications insérées à leur rang
  function applyData(data) {
    var all = sortItems((data.items || []).filter(function (it) { return it && it.id && it.url && !it.hidden; }));
    var ids = {};
    all.forEach(function (it, i) {
      ids[it.id] = true;
      if (cards[it.id]) {
        (cardsById[it.id] || []).forEach(function (c) { updateCard(c, it); });
        return;
      }
      var card = buildCard(it, "div", "insta-item");
      card.hidden = true;
      cards[it.id] = card;
      var next = null;
      for (var j = i + 1; j < all.length && !next; j++) next = cards[all[j].id] || null;
      instaGrid.insertBefore(card, next);
    });
    Object.keys(cards).forEach(function (id) {
      if (ids[id]) return;
      (cardsById[id] || []).forEach(function (c) { c.remove(); });
      delete cards[id];
      delete cardsById[id];
    });

    var first = !galleryItems.length && !galleryStarted;
    galleryItems = all;
    buildFilters();
    renderStatus(data);
    renderFollowStats(data.stats);
    if (first) {
      renderEvents(all);
      whenNear(instaGrid, function () {
        galleryStarted = true;
        renderGallery();
      });
    } else if (galleryStarted) {
      renderGallery();
    }
  }

  function loadGallery(initial) {
    lastLoad = Date.now();
    return fetch("data/gallery.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(applyData)
      .catch(function () {
        if (!initial) return; // une relecture ratée garde simplement l'affichage actuel
        instaGrid.hidden = true;
        instaGrid.setAttribute("aria-busy", "false");
        fallbackEl.hidden = false;
        if (eventsEl) eventsEl.hidden = true;
      });
  }

  if (instaGrid) {
    loadGallery(true);
    setInterval(function () {
      if (document.visibilityState === "visible") loadGallery(false);
    }, REFRESH_MS);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && Date.now() - lastLoad > REFRESH_MS) loadGallery(false);
    });
  }

  if (moreBtn) {
    moreBtn.addEventListener("click", function () {
      limitSlots += PAGE_SLOTS;
      renderGallery();
    });
  }

  // liens qui ouvrent la galerie sur un filtre (ex. « Voir l'ambiance » → Animations)
  document.querySelectorAll("[data-filter-link]").forEach(function (link) {
    link.addEventListener("click", function () {
      var chip = document.querySelector('[data-filter="' + link.getAttribute("data-filter-link") + '"]');
      if (chip) chip.click();
    });
  });

  var mapBtn = document.querySelector("[data-map-load]");
  if (mapBtn) {
    mapBtn.addEventListener("click", function () {
      var iframe = document.createElement("iframe");
      iframe.title = "Carte Google Maps : Parc Bayouta, El Khetmine";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.src = "https://maps.google.com/maps?q=" +
        encodeURIComponent("Parc Bayouta, 4XXW+FMH, El Khetmine, Tunisie") + "&z=15&output=embed";
      var frame = mapBtn.parentElement;
      frame.appendChild(iframe);
      mapBtn.remove();
    });
  }

  /* ---------- Année du pied de page ---------- */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
