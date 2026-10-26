/* Parc Bayouta — page du menu digital : affiche data/menu.json (aucune dépendance) */
(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  var carteEl = document.querySelector("[data-carte]");
  var BADGES = { nouveau: "Nouveau", maison: "Fait maison", populaire: "Populaire", vegetarien: "Végétarien", epice: "Épicé" };

  // sans accents ni majuscules, pour que « cafe » trouve « Café »
  function fold(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  // 3.5 → « 3,500 DT » (millimes), 12 → « 12 DT » ; un texte (« 8 / 12 ») est affiché tel quel
  function formatPrice(p, devise) {
    if (typeof p === "number") {
      var opts = p % 1 ? { minimumFractionDigits: 3, maximumFractionDigits: 3 } : {};
      return p.toLocaleString("fr-FR", opts) + " " + devise;
    }
    return p ? String(p) : "";
  }

  function buildItem(p, catName, devise) {
    var li = document.createElement("li");
    li.className = "carte-item" + (p.indisponible ? " is-off" : "");
    li._text = fold(p.nom + " " + (p.description || "") + " " + catName);

    var head = document.createElement("div");
    head.className = "carte-item-head";
    var name = document.createElement("span");
    name.className = "carte-item-name";
    name.textContent = p.nom;
    (p.badges || []).forEach(function (b) {
      if (!BADGES[b]) return;
      var tag = document.createElement("span");
      tag.className = "carte-badge carte-badge--" + b;
      tag.textContent = BADGES[b];
      name.appendChild(tag);
    });
    if (p.indisponible) name.title = "Momentanément indisponible";
    var dots = document.createElement("span");
    dots.className = "carte-dots";
    dots.setAttribute("aria-hidden", "true");
    var price = document.createElement("span");
    price.className = "carte-price";
    price.textContent = formatPrice(p.prix, devise);
    head.appendChild(name);
    head.appendChild(dots);
    head.appendChild(price);
    li.appendChild(head);

    if (p.description) {
      var d = document.createElement("p");
      d.className = "carte-desc";
      d.textContent = p.description;
      li.appendChild(d);
    }
    return li;
  }

  function render(data) {
    var devise = data.devise || "DT";
    // les catégories sans plat ne sont pas affichées
    var cats = (data.categories || []).map(function (c) {
      return { id: c.id, nom: c.nom, plats: (c.plats || []).filter(function (p) { return p && p.nom && !p.masque; }) };
    }).filter(function (c) { return c.id && c.nom && c.plats.length; });
    if (!cats.length) return;

    var nav = document.querySelector("[data-carte-nav]");
    var filters = document.querySelector("[data-carte-filters]");
    var searchWrap = document.querySelector("[data-carte-search-wrap]");
    var search = document.querySelector("[data-carte-search]");
    var note = document.querySelector("[data-carte-note]");
    var chips = {};
    var blocks = [];

    carteEl.innerHTML = "";
    cats.forEach(function (c) {
      var block = document.createElement("section");
      block.className = "carte-paper carte-cat";
      block.id = "cat-" + c.id;
      block.setAttribute("aria-labelledby", "titre-" + c.id);
      var h = document.createElement("h2");
      h.id = "titre-" + c.id;
      h.textContent = c.nom;
      var ul = document.createElement("ul");
      ul.className = "carte-items";
      c.plats.forEach(function (p) { ul.appendChild(buildItem(p, c.nom, devise)); });
      block.appendChild(h);
      block.appendChild(ul);
      carteEl.appendChild(block);
      blocks.push(block);

      var chip = document.createElement("a");
      chip.className = "chip";
      chip.href = "#" + block.id;
      chip.textContent = c.nom + " ";
      var n = document.createElement("span");
      n.textContent = c.plats.length;
      chip.appendChild(n);
      filters.appendChild(chip);
      chips[block.id] = chip;
    });

    var noResult = document.createElement("p");
    noResult.className = "carte-paper carte-noresult";
    noResult.hidden = true;
    carteEl.appendChild(noResult);

    // catégorie visible : sa puce est surlignée et ramenée à l'écran dans la barre
    function setActive(id) {
      Object.keys(chips).forEach(function (k) {
        var on = k === id;
        chips[k].classList.toggle("is-active", on);
        if (on) chips[k].setAttribute("aria-current", "true"); else chips[k].removeAttribute("aria-current");
      });
      var chip = chips[id];
      if (chip) filters.scrollTo({ left: chip.offsetLeft - filters.clientWidth / 2 + chip.offsetWidth / 2, behavior: "smooth" });
    }
    if ("IntersectionObserver" in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
      }, { rootMargin: "-30% 0px -60% 0px" });
      blocks.forEach(function (b) { spy.observe(b); });
    }
    setActive(blocks[0].id);

    // recherche : masque les plats, puis les catégories vides
    search.addEventListener("input", function () {
      var q = fold(search.value.trim());
      var shown = 0;
      blocks.forEach(function (block) {
        var n = 0;
        block.querySelectorAll(".carte-item").forEach(function (li) {
          var on = !q || li._text.indexOf(q) !== -1;
          li.hidden = !on;
          if (on) n++;
        });
        block.hidden = !n;
        chips[block.id].hidden = !n;
        chips[block.id].lastChild.textContent = n;
        shown += n;
      });
      noResult.hidden = shown > 0;
      noResult.textContent = "Aucun plat ne correspond à « " + search.value.trim() + " ».";
    });

    nav.hidden = false;
    searchWrap.hidden = false;

    var parts = [];
    if (data.remarque) parts.push(data.remarque);
    if (data.miseAJour) {
      parts.push("Menu mis à jour le " + new Date(data.miseAJour).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) + ".");
    }
    if (parts.length) { note.textContent = parts.join(" "); note.hidden = false; }

    // lien direct vers une catégorie (menu.html#cat-cafe) : le contenu vient d'être créé
    if (location.hash && document.getElementById(location.hash.slice(1))) {
      document.getElementById(location.hash.slice(1)).scrollIntoView();
    }
  }

  fetch("data/menu.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function () { /* le message « arrive bientôt » reste affiché */ });
})();
