/* Parc Bayouta — thème clair / sombre (chargé dans <head> pour éviter un flash de la mauvaise couleur)
   Sans choix du visiteur, le site suit le réglage du téléphone ; le bouton impose et mémorise un thème. */
(function () {
  "use strict";

  var KEY = "bayouta-theme";
  var root = document.documentElement;
  var dark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : { matches: false };

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* navigation privée : pas de mémorisation */ }
  if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);

  function current() {
    return root.getAttribute("data-theme") || (dark.matches ? "dark" : "light");
  }

  function syncButtons() {
    var isDark = current() === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(isDark));
      btn.setAttribute("aria-label", isDark ? "Passer au thème clair" : "Passer au thème sombre");
      btn.title = isDark ? "Thème clair" : "Thème sombre";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    syncButtons();
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = current() === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem(KEY, next); } catch (e) { /* ignoré */ }
        syncButtons();
      });
    });
  });

  // le visiteur change le réglage du téléphone sans avoir choisi sur le site
  if (dark.addEventListener) dark.addEventListener("change", syncButtons);
})();
