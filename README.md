# Site vitrine — Parc Bayouta

Site statique (HTML5, CSS3, JavaScript sans dépendance) pour **Parc Bayouta**, espace familial à El Khetmine (Tunisie) : café, restaurant, salle des fêtes, mini-foot et espace de jeux.

```
index.html            page unique (Accueil, À propos, Galerie, Services, Salle des fêtes, Infos, Localisation, Contact)
style.css             styles et animations
script.js             menu mobile, animations, galerie dynamique, visionneuse, chargement différé
data/gallery.json     publications affichées dans la galerie et la section « Salle des fêtes »
scripts/              mise à jour automatique de la galerie (update-gallery.mjs) et ses tests
.github/workflows/    tâche planifiée GitHub Actions (toutes les heures)
package.json          commandes npm test / update-gallery (aucune dépendance)
assets/logo-parc-bayouta.jpg   logo officiel (en-tête, accueil, pied de page, icône du site)
assets/photos/        photos hébergées avec le site + photos.js (liste des photos)
.nojekyll             indique à GitHub Pages de servir les fichiers tels quels
```

## Ouvrir le site en local

Servez le dossier avec un petit serveur local. La galerie lit `data/gallery.json`, et les intégrations Instagram et Facebook exigent `http(s)` : en double-cliquant sur `index.html`, la galerie affiche seulement des liens.

```
npx serve .        # ou : python -m http.server 8000
```

## Déployer sur GitHub Pages

1. Créez un dépôt GitHub et envoyez-y le contenu de ce dossier (`index.html` à la racine).
2. Dans **Settings → Pages**, choisissez **Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Le site est publié à l'adresse `https://<compte>.github.io/<depot>/`.

Une fois l'adresse définitive connue, ajoutez dans `<head>` une balise `<link rel="canonical" href="…">` et une balise `og:url`.

## Sources des informations

| Information | Source |
|---|---|
| Nom, activité, adresse, téléphone, prix moyen, terrasse | Informations fournies (fiche Google de l'établissement) |
| Phrase de présentation « loisirs, saveurs et divertissements » | Bio du compte Instagram officiel [@parc_bayouta](https://www.instagram.com/parc_bayouta/) |
| Lien Google Maps `maps.app.goo.gl/h8mfSgfAioQK4qyP9` | Lien publié dans la bio Instagram officielle, il ouvre la fiche « 4XXW+FMH Parc Bayouta, El Khetmine » |
| Terrasse « sous les parasols, face à la pelouse » | Photo officielle Instagram [Deq1zz8gMbh](https://www.instagram.com/p/Deq1zz8gMbh/) |
| Salle des fêtes | Information fournie par le client, confirmée par la page Facebook officielle (« Salle des Fêtes », au singulier) |
| « Un espace géant pensé pour tous les âges et les envies : Café - Restaurant - Salle des Fêtes - Terrains de Mini-Foot - Aire de jeux » | Présentation de la [page Facebook officielle](https://www.facebook.com/p/Parc-Bayouta-61578124673823/) |
| Adresse « Route Khitmine Km4, El Alia » et 2e numéro 94 420 485 | Page Facebook officielle |
| Description de la salle des fêtes (plafond drapé, lustres, tables rondes, espace scène) | Album photo Facebook officiel (vérifié visuellement) |
| Anniversaires, « Faites de vos heureuses occasions un souvenir inoubliable » | Publication Facebook officielle (texte en arabe, traduit) |
| Espace de jeux « ouvert tous les jours sauf le lundi », jeux pour tous les âges | Affiche « Parc Bayouta – Space de jeux » publiée sur Facebook |
| Diffusion des matchs | Affiches « Diffusion du match » publiées sur Facebook et Instagram |
| Logo et slogan « Espace familial » | Photo de profil du compte Instagram officiel |
| Animations (spectacles, clown pour les enfants, chant en live) | Vidéos officielles Instagram du 25 octobre 2026 (voir la galerie) |
| Dates des publications | Facebook : horodatage de la publication. Instagram : décodé depuis l'identifiant de la publication |
| Page Facebook | Lien fourni |

## Logo

Le logo (monogramme « PB » or sur fond bleu nuit, « Parc Bayouta · Espace familial ») provient de la photo de profil Instagram officielle. Les couleurs du site (bleu nuit et or rosé) en sont tirées.

Instagram ne fournit cette image qu'en **150 × 150 px**. C'est suffisant pour l'en-tête, l'accueil et le pied de page (affichés entre 46 et 112 px), mais pas plus grand. Demandez à Parc Bayouta le **fichier original** (SVG ou PNG haute définition). Remplacez ensuite `assets/logo-parc-bayouta.jpg` en gardant le même nom, ou modifiez les chemins dans `index.html`.

**Monogramme « PB » animé** (accueil, citation, bloc contact) : en l'absence du fichier vectoriel du logo, il est composé avec la police **Italianno** (Google Fonts) et le dégradé or du logo. Il évoque le monogramme sans en être une copie exacte. Au chargement, le tracé se dessine, se remplit d'or, puis flotte doucement (désactivé si le visiteur limite les animations). Si l'établissement fournit son logo en SVG, remplacez les deux balises `<text>` (P et B) dans `index.html` (`.hero-monogram` et `<symbol id="monogram">`) par le tracé officiel.

**Non indiqués, car non confirmés :** horaires d'ouverture, menu et tarifs détaillés, prise de réservation, numéro WhatsApp, ainsi que le détail de la salle des fêtes (capacité, tarifs, formules) et les horaires du café-restaurant. Le site renvoie vers le téléphone et les réseaux pour ces informations. Ajoutez-les une fois qu'ils sont confirmés par l'établissement.

## Galerie dynamique

La galerie et les photos de la section « Salle des fêtes » sont générées à partir d'un seul fichier : **`data/gallery.json`**. Le site lit ce fichier à chaque visite, puis toutes les 5 minutes tant que la page reste ouverte :

- **Ordre :** les publications épinglées (`pinned`) s'affichent en premier, puis toutes les autres, de la plus récente à la plus ancienne.
- **Filtres :** une pastille par catégorie présente, avec le nombre de publications calculé automatiquement.
- **Légendes :** catégorie, titre, date et réseau. Un badge **« Nouveau »** marque les publications de moins de 7 jours.
- **Chiffres :** sous chaque publication, le nombre de **J'aime**, de commentaires et de partages (champ `metrics`). Le total des J'aime apparaît dans la ligne d'état.
- **Ligne d'état :** au-dessus de la galerie, par exemple « 12 publications · 100 J'aime · mis à jour il y a 2 heures ».
- **Abonnés :** le bandeau « Suivez-nous » affiche les abonnés Instagram et Facebook et le nombre de publications (champ `stats`).
- **Page ouverte :** le site relit `data/gallery.json` toutes les **5 minutes**, et aussi au retour sur l'onglet après 5 minutes. Les chiffres changent sur place, avec un bref surlignage. Les nouvelles publications s'insèrent à leur rang. Les intégrations déjà affichées ne sont pas rechargées.
- **Section « Salle des fêtes » :** elle affiche automatiquement les 2 premières publications de la catégorie `fetes`.
- **Chargement :** les publications se chargent par pages de 6 emplacements (une carte large en compte 2) avec **« Voir plus de photos »**. Les intégrations officielles d'Instagram (`embed.js`) et de Facebook (SDK, plugin « Post ») ne se chargent qu'à l'approche de la section.
- **Erreur :** si le fichier ne peut pas être lu, un message renvoie vers Instagram et Facebook.

Sur une même ligne, toutes les cartes ont la même hauteur, et chaque ligne prend la hauteur de sa carte la plus haute. Une photo paysage ne laisse donc pas de grand vide à côté des vidéos verticales. Instagram et Facebook interdisent de recadrer leurs intégrations : l'espace restant est occupé par la légende.

Le plugin Facebook laisse toujours une marge blanche d'environ 14 px à droite des publications à photo unique (pas dans les albums). Elle ne peut pas être masquée sans couper le logo Facebook de l'intégration. Pour une photo bord à bord, notamment la façade, utilisez le fichier original fourni par l'établissement (voir « Ajouter les vraies photos » ci-dessous).

### Format de `data/gallery.json`

```json
{
  "updatedAt": "2026-10-26T12:36:42.000Z",
  "stats": {
    "instagram": { "followers": 2826, "posts": 204 },
    "facebook": { "followers": 11000, "approximate": true }
  },
  "items": [
    {
      "id": "ig:DelfQdCAupS",
      "platform": "instagram",
      "url": "https://www.instagram.com/p/DelfQdCAupS/",
      "date": "2026-10-17T06:41:33.277Z",
      "category": "saveurs",
      "title": "Le buffet",
      "pinned": true,
      "metrics": { "likes": 4 }
    }
  ]
}
```

| Champ | Rôle |
|---|---|
| `id` | Identifiant unique : `ig:<code>` pour Instagram, `fb:<id>` pour Facebook |
| `platform` | `instagram` ou `facebook` |
| `url` | Lien de la publication (Instagram `/p/…/` ou `/reel/…/`, Facebook `photo.php?fbid=…` ou lien de la publication) |
| `date` | Date de publication (ISO 8601), utilisée pour le tri et le badge « Nouveau » |
| `category` | `lieu`, `saveurs`, `fetes` ou `animations` |
| `title` | Légende affichée sous la publication |
| `pinned` | `true` pour l'épingler en tête de galerie (« à la une ») |
| `wide` | `true` pour une carte double largeur (photos en paysage) |
| `hidden` | `true` pour la masquer du site sans la supprimer |
| `auto` | Ajoutée automatiquement par le script (voir ci-dessous) |
| `metrics` | `likes` (J'aime / réactions), `comments`, `shares` : rafraîchis par le script, n'affiche que les valeurs connues |

`stats` (en tête du fichier) contient les abonnés Instagram et Facebook et le nombre de publications Instagram. `approximate: true` affiche « ≈ » devant le chiffre. `updatedAt` est la date du dernier changement (publications ou chiffres).

**Chiffres actuels :** ce sont ceux affichés par les intégrations officielles le 26 octobre 2026. Instagram ne montre pas le nombre de commentaires dans ses intégrations, et Facebook arrondit ses abonnés (« 11 K »). Ces deux valeurs seront exactes à la première mise à jour par l'API.

**Mise à jour à la main :** ajoutez ou modifiez une entrée dans `data/gallery.json`, puis publiez. Il n'y a rien à changer dans `index.html`.

### Publications actuelles

Toutes ont été vérifiées visuellement. Les dates sont exactes : Facebook les fournit, et pour Instagram elles sont décodées depuis l'identifiant de la publication.

| Publication | Catégorie | Contenu |
|---|---|---|
| [Facebook 122163133958937489](https://www.facebook.com/photo.php?fbid=122163133958937489) | Le lieu (épinglée, large) | Façade « Restaurant Bayouta – Salon de thé », terrasse, fontaine, pelouse |
| [p/DelfQdCAupS](https://www.instagram.com/p/DelfQdCAupS/) | Saveurs (épinglée) | Buffet / plats servis |
| [Facebook 122190103934937489](https://www.facebook.com/photo.php?fbid=122190103934937489) | Salle des fêtes (épinglée) | Album : lustres, tables rondes, espace scène (et l'affiche de l'espace de jeux) |
| [Facebook 122190308474937489](https://www.facebook.com/photo.php?fbid=122190308474937489) | Salle des fêtes | Décor d'anniversaire au logo du Parc |
| [Facebook 122190229886937489](https://www.facebook.com/photo.php?fbid=122190229886937489) | Le lieu | Salle intérieure aux chaises jaunes |
| [reel/De6mqs3gBBP](https://www.instagram.com/reel/De6mqs3gBBP/) | Le lieu | Jardin avec fontaine |
| [reel/De6hoJHAmkj](https://www.instagram.com/reel/De6hoJHAmkj/) | Le lieu | Comptoir avec l'enseigne « PARC » |
| [reel/De6mQnTgWHX](https://www.instagram.com/reel/De6mQnTgWHX/) | Animations | Spectacle en salle devant les enfants |
| [reel/De6mIshgIw1](https://www.instagram.com/reel/De6mIshgIw1/) | Animations | Familles en salle |
| [reel/De6eqh2gNl1](https://www.instagram.com/reel/De6eqh2gNl1/) | Animations | Clown pour les enfants |
| [reel/De6dqvtAPf3](https://www.instagram.com/reel/De6dqvtAPf3/) | Animations | Ambiance festive |
| [reel/De6a8uxgjCK](https://www.instagram.com/reel/De6a8uxgjCK/) | Animations | Chanteur en live |

## Mise à jour automatique (GitHub Actions)

Le workflow `.github/workflows/update-gallery.yml` tourne **toutes les heures** (à la 17e minute). Le bouton **Actions → Mettre à jour la galerie → Run workflow** le lance immédiatement. Il exécute `scripts/update-gallery.mjs`, qui :

1. lit les dernières publications via l'**API Graph officielle de Meta** : Instagram et Page Facebook ;
2. ajoute les nouvelles à `data/gallery.json`, avec une catégorie et un titre tirés de la légende ;
3. rafraîchit les **J'aime, commentaires et partages de toutes les publications**, anciennes comprises (une requête par photo Facebook ajoutée à la main), ainsi que les **abonnés** Instagram et Facebook ;
4. conserve les réglages faits à la main (titre, catégorie, `pinned`, `wide`, `hidden`) ;
5. ne garde que les 30 publications automatiques les plus récentes (variable `MAX_AUTO_ITEMS`). Les entrées ajoutées à la main ne sont jamais supprimées ;
6. enregistre et pousse le fichier seulement s'il a changé (nouvelle publication ou chiffre différent). GitHub Pages republie alors le site, et les visiteurs déjà sur la page voient les nouveaux chiffres dans les 5 minutes.

Les chiffres du site ont donc au plus une heure de retard environ. Les intégrations Instagram et Facebook affichent de toute façon leurs propres compteurs en direct.

- **Délais :** GitHub peut retarder les tâches planifiées de quelques minutes aux heures chargées.
- **Coût :** chaque exécution dure environ 1 minute, soit environ 720 minutes par mois. C'est gratuit pour un dépôt public. Pour un dépôt privé, c'est inclus dans les 2 000 minutes mensuelles du plan gratuit.
- **Historique Git :** une nouvelle version n'est enregistrée que si un chiffre ou une publication a changé.
- **Autre fréquence :** modifiez la ligne `cron` du workflow, par exemple `"17 */3 * * *"` pour toutes les 3 heures.

**Sans jeton configuré, le workflow ne modifie rien** et le site garde les publications actuelles.

### Ce que l'établissement contrôle depuis ses légendes

- **Catégorie :** elle est déduite de mots-clés en français, en arabe et en anglais (« anniversaire », « عيد ميلاد », « buffet », « match », « مهرج »…). Un hashtag explicite l'emporte toujours : `#lieu`, `#saveurs`, `#fetes`, `#animations`.
- **Exclusion :** `#nosite` exclut une publication du site.
- **Stories :** elles ne sont jamais reprises.

### Configuration (une seule fois, avec le propriétaire des comptes)

L'API ne donne accès qu'aux comptes dont on a la gestion. Il faut donc l'accord et un accès administrateur de Parc Bayouta, ce qui garantit aussi l'autorisation d'affichage.

1. Le compte Instagram doit être **professionnel** (Entreprise ou Créateur) et **relié à la Page Facebook**.
2. Sur [developers.facebook.com](https://developers.facebook.com), créez une application de type **Entreprise**. Ajoutez le produit **Instagram Graph API** et demandez les permissions `instagram_basic`, `pages_show_list` et `pages_read_engagement`.
3. Dans **Meta Business Suite → Paramètres → Utilisateurs système**, créez un utilisateur système. Donnez-lui accès à la Page, puis générez un **jeton sans expiration** avec ces permissions.
4. Récupérez les identifiants :
   - `FB_PAGE_ID` : **Page → À propos → Transparence de la Page**, ou `GET /me/accounts`.
   - `IG_USER_ID` : `GET /{FB_PAGE_ID}?fields=instagram_business_account`.
5. Dans le dépôt GitHub, ouvrez **Settings → Secrets and variables → Actions → New repository secret**, puis ajoutez :

| Secret | Valeur |
|---|---|
| `META_ACCESS_TOKEN` | Jeton de l'utilisateur système (ou jeton de Page longue durée) |
| `IG_USER_ID` | Identifiant du compte Instagram professionnel |
| `FB_PAGE_ID` | Identifiant de la Page Facebook |

**Alternative sans Page Facebook :** un jeton « Instagram API with Instagram Login » dans le secret `IG_ACCESS_TOKEN`. Ce jeton expire au bout de 60 jours et doit être renouvelé.

**Variables facultatives :** dans l'onglet **Variables** :
- `GALLERY_SOURCES` : `instagram` seul, par exemple, si l'établissement publie la même chose sur les deux réseaux (pour éviter les doublons).
- `MAX_AUTO_ITEMS` : le nombre de publications automatiques conservées.

**Tester en local :**

```
npm test                                                      # tests du script (sans réseau)
META_ACCESS_TOKEN=… IG_USER_ID=… FB_PAGE_ID=… npm run update-gallery
```

**À savoir**
- **Pause automatique :** GitHub suspend les workflows planifiés d'un dépôt sans activité depuis 60 jours. Un commit ou un lancement manuel les réactive.
- **Délai d'affichage :** GitHub Pages peut mettre en cache `data/gallery.json` quelques minutes. Le site le revalide à chaque visite (`cache: "no-cache"`).
- **Cookies :** les intégrations chargent des scripts d'Instagram et de Facebook, qui peuvent déposer des cookies. Si le site vise un public européen, ajoutez un bandeau de consentement avant leur chargement.

## Photos hébergées avec le site

### Pourquoi les photos ne sont pas copiées dans le site

- **Instagram / Facebook :** les fichiers images appartiennent à leur auteur, et les adresses des images sont signées et expirent au bout de quelques jours. Les télécharger pour les réhéberger sans autorisation serait contraire aux conditions des plateformes et au droit d'auteur.
- **Google Maps / Google Places API :** l'API exige une clé et une facturation. Ses conditions interdisent de copier les photos dans un site, il faut les servir via l'API avec l'attribution de l'auteur. C'est incompatible avec un site purement statique sans exposer la clé.

### Ajouter les vraies photos (recommandé)

C'est la meilleure solution pour le Hero et la galerie en haute qualité :

1. Demandez à Parc Bayouta ses photos originales (terrasse, jardin, salle, plats, façade) et son **accord écrit** pour les utiliser sur le site.
2. Optimisez-les : format **WebP ou JPEG**, environ **1920 px** de large pour le Hero et **1200 px** pour la galerie, moins de 300 Ko chacune (par exemple avec [squoosh.app](https://squoosh.app)).
3. Copiez-les dans `assets/photos/` et listez-les dans `assets/photos/photos.js` :

```js
window.BAYOUTA_PHOTOS = [
  { src: "assets/photos/terrasse.webp", alt: "La terrasse du Parc Bayouta", legende: "La terrasse", credit: "Photo : Parc Bayouta", hero: true },
  { src: "assets/photos/jardin.webp",   alt: "Le jardin",                   legende: "Le jardin",   credit: "Photo : Parc Bayouta" },
  { src: "assets/photos/plat-1.webp",   alt: "Un plat servi au Parc",       legende: "En cuisine",  credit: "Photo : Parc Bayouta" }
];
```

La photo marquée `hero: true` remplace automatiquement le fond du Hero. Les autres apparaissent dans une galerie en mosaïque avec zoom, navigation au clavier et balayage tactile. Les publications Instagram restent affichées en dessous.

Pour le partage sur les réseaux, ajoutez aussi dans `<head>` : `<meta property="og:image" content="https://…/assets/photos/terrasse.webp">`.
