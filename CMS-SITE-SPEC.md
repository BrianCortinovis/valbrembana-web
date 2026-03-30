# Specifica Tecnica: Sito Compatibile CMS Editoria

> Questo file deve essere letto da qualsiasi IA (Claude, GPT, ecc.) prima di progettare un sito che si collega al CMS Editoria. Seguendo queste regole il sito nasce già predisposto e il linking è immediato.

---

## 1. Architettura

Il CMS è il **write model**. Il sito pubblico è il **read model**.

Il sito NON accede al database. Il sito legge da:

**Published Layer** — JSON statici pubblicati dal CMS nello storage Supabase, serviti via CDN globale. Nessuna API, nessun server-side, nessuna latenza. Sono file `.json` pubblici su URL fissi.

Quando un editor pubblica un articolo dal CMS, il CMS rigenera i JSON nello storage. Il sito li legge al prossimo caricamento pagina. **Nessun deploy necessario, nessuna API chiamata.**

> **IMPORTANTE: NON usare le API `/api/v1/...` del CMS nel sito pubblico.** Le API esistono per il CMS interno e il Desktop Builder. Il sito pubblico legge SOLO i JSON statici dal published layer (CDN). Sono 10-50x più veloci di qualsiasi API.

---

## 2. Struttura file del sito

```
sito/
├── index.html              # Homepage
├── notizie.html            # Archivio notizie
├── articolo.html           # Pagina articolo singolo (usa ?slug=xxx)
├── categoria.html          # Archivio categoria (usa ?cat=xxx)
├── farmacie.html           # Pagine custom statiche
├── search.html             # Ricerca (opzionale)
├── cms-config.js           # Configurazione CMS (tenant, URL base)
├── cms-loader.js           # Libreria JS che carica dati dal published layer
├── style.css               # Stili del sito
├── script.js               # JS custom del sito
├── vercel.json             # Rewrite rules per URL puliti
├── assets/                 # Immagini, font, media statici
├── images/                 # Immagini del sito
└── data/                   # Dati statici locali (opzionale)
```

---

## 3. cms-config.js — Configurazione

Ogni sito DEVE avere questo file. Definisce la connessione al published layer.

```javascript
window.VBW_CMS = {
  // Slug del tenant nel CMS (obbligatorio)
  tenant: "valbrembana",

  // URL base dello storage Supabase per i JSON pubblicati (CDN, nessuna API)
  publishedBase: "https://xtyoeajjxgeeemwlcotk.supabase.co/storage/v1/object/public/published/sites/valbrembana",

  // Nome del sito (per meta tag e fallback)
  siteName: "Val Brembana Web",
};
```

> Nota: Non serve `apiBase`. Il sito legge solo JSON statici dal `publishedBase`.

---

## 4. cms-loader.js — Libreria di caricamento dati

Il sito deve includere una libreria JS che:

1. Prova a caricare il JSON dal **published layer** (veloce, CDN)
2. Se fallisce, chiama l'**API pubblica** come fallback
3. Restituisce i dati al codice del sito

### File JSON del Published Layer

| File | Contenuto | Usato per |
|------|-----------|-----------|
| `posts.json` | Tutti gli articoli pubblicati | Homepage, archivio notizie, sidebar |
| `settings.json` | Configurazione sito (tema, social, contatti) | Header, footer, meta |
| `menu.json` | Menu navigazione | Header nav, mobile menu |
| `breaking-news.json` | Notizie dell'ultima ora | Ticker breaking news |
| `categories/{slug}.json` | Articoli di una categoria | Pagine categoria |
| `articles/{slug}.json` | Articolo singolo completo | Pagina dettaglio articolo |
| `tags.json` | Lista tag | Tag cloud, filtri |
| `events.json` | Eventi | Pagina eventi |
| `banners.json` | Banner pubblicitari | Zone ADV |
| `banner-zones.json` | Configurazione zone banner | Layout ADV |
| `manifest.json` | Stato pubblicazione | Verifica freshness |

### Pattern di caricamento (da implementare in cms-loader.js)

```javascript
async function cmsLoad(resource, slug) {
  const base = window.VBW_CMS.publishedBase;

  // URL diretto al JSON statico su CDN
  const url = slug
    ? `${base}/${resource}/${slug}.json`
    : `${base}/${resource}.json`;

  try {
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) { /* JSON non ancora pubblicato */ }

  return null;
}
```

Nessuna API, nessun token, nessun CORS. Solo `fetch()` verso un file JSON pubblico su CDN.

---

## 5. Pattern URL nativi (OBBLIGATORI)

Il sito DEVE usare queste route per essere compatibile col CMS:

| Pagina | URL | Query param |
|--------|-----|-------------|
| Homepage | `/` o `index.html` | — |
| Archivio notizie | `/notizie.html` | `?cat=slug` (opzionale, filtra categoria) |
| Articolo singolo | `/articolo.html` | `?slug=xxx` (obbligatorio) |
| Categoria | `/categoria.html` | `?cat=xxx` (obbligatorio) |
| Ricerca | `/search.html` | `?q=xxx` |

Con Vercel rewrite rules si possono ottenere URL puliti:

```
/articolo/mio-articolo → articolo.html?slug=mio-articolo
/categoria/cronaca → categoria.html?cat=cronaca
```

---

## 6. Come i componenti HTML leggono i dati CMS

### 6.1 Homepage — Ultimi articoli

```javascript
const data = await cmsLoad("posts");
const articles = data.articles || data || [];
// articles è un array ordinato per data, il primo è il più recente
```

Ogni articolo ha questa struttura:
```json
{
  "id": "uuid",
  "title": "Titolo articolo",
  "subtitle": "Sottotitolo opzionale",
  "slug": "titolo-articolo",
  "summary": "Breve riassunto...",
  "body": "<p>HTML completo dell'articolo</p>",
  "cover_image_url": "https://...",
  "categories": [{ "name": "Cronaca", "slug": "cronaca", "color": "#c0392b" }],
  "author": { "full_name": "Mario Rossi", "avatar_url": "..." },
  "is_featured": true,
  "is_breaking": false,
  "published_at": "2026-03-29T22:00:00Z",
  "reading_time_minutes": 3
}
```

### 6.2 Link agli articoli

Ogni card/link a un articolo DEVE puntare a:
```
/articolo.html?slug={article.slug}
```
Oppure con rewrite:
```
/articolo/{article.slug}
```

### 6.3 Link alle categorie

```
/categoria.html?cat={category.slug}
```

### 6.4 Breaking News Ticker

```javascript
const data = await cmsLoad("breaking-news");
// Array di breaking news items
```

### 6.5 Menu Navigazione

```javascript
const data = await cmsLoad("menu");
// { primary: [...items], footer: [...items] }
```

Se il menu CMS non è configurato, il sito PUO' usare un menu statico hardcoded come fallback.

### 6.6 Articolo singolo

```javascript
const slug = new URLSearchParams(location.search).get("slug");
const data = await cmsLoad("articles", slug);
// data contiene: title, body (HTML), cover_image_url, categories[], author{}, published_at, etc.
```

---

## 7. Regole per l'IA che progetta il sito

### DEVE fare:

1. **Includere `cms-config.js` e `cms-loader.js`** — sempre, in ogni pagina HTML
2. **Usare i pattern URL nativi** — `/articolo.html?slug=xxx`, `/categoria.html?cat=xxx`
3. **Rendere le sezioni news dinamiche** — le card articoli si popolano via JS dal CMS
4. **Preparare contenitori DOM con id/class specifici** — dove il JS inietta i contenuti:
   - `#cms-articles` — griglia articoli
   - `#cms-featured` — articoli in evidenza
   - `#cms-ticker` — breaking news ticker
   - `#cms-sidebar-latest` — ultimi articoli sidebar
   - `#cms-categories` — filtri categoria
5. **Ogni card articolo deve avere** — immagine, categoria, titolo, excerpt, data, link
6. **Le immagini degli articoli usano `cover_image_url`** dal CMS, con fallback a un placeholder
7. **La data deve essere formattata in italiano** — es. "29 marzo 2026"
8. **Le categorie mostrano il colore** dal CMS (`category.color`) come badge/accent

### NON DEVE fare:

1. **MAI inserire credenziali Supabase** nel codice frontend
2. **MAI fare query SQL dirette** al database
3. **MAI hardcodare articoli nel HTML** — devono venire dal CMS
4. **MAI inventare URL diversi** dai pattern nativi
5. **MAI duplicare contenuti** che il CMS gestisce (menu, footer, articoli)

### PUO' fare:

1. Sezioni statiche (Chi siamo, Farmacie, Meteo) che non cambiano
2. Menu di navigazione statico come fallback se il CMS non ha menu configurato
3. Footer statico con link fissi
4. Stili CSS completamente custom — il CMS non impone alcun framework CSS
5. Layout totalmente libero — 1 colonna, 2 colonne, sidebar, qualsiasi struttura

---

## 8. vercel.json — Configurazione deploy

```json
{
  "rewrites": [
    { "source": "/articolo/:slug", "destination": "/articolo.html?slug=:slug" },
    { "source": "/categoria/:cat", "destination": "/categoria.html?cat=:cat" },
    { "source": "/notizie", "destination": "/notizie.html" },
    { "source": "/search", "destination": "/search.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

---

## 9. Procedura di linking dopo che il sito è stato creato

Una volta che il sito HTML è pronto e deployato su Vercel:

1. **Nel CMS** (`editoria-cms.vercel.app`):
   - Vai in Impostazioni > Sito
   - Imposta il dominio del sito (es. `brembana-web.vercel.app`)
   - Crea le categorie (Cronaca, Sport, Cultura, ecc.)
   - Pubblica almeno un articolo per testare

2. **Nel sito**:
   - Verifica che `cms-config.js` punti al tenant corretto
   - Apri il sito e verifica che gli articoli compaiano
   - Se non compaiono, verificare che il CMS abbia pubblicato i JSON (publish trigger)

3. **Flusso operativo quotidiano**:
   - L'editor scrive e pubblica articoli dal CMS
   - Il CMS rigenera `posts.json` nel published layer
   - Il sito li mostra al prossimo caricamento pagina
   - **Nessun deploy necessario**

---

## 10. Zone Banner e Slideshow

Il sito ha zone banner e slideshow gestite dal CMS. Ogni zona ha un identificatore univoco.

### Zone Banner (gestite da CMS > Banner)

| Zona | Posizione nel sito | Max slot | Note |
|------|-------------------|----------|------|
| `header` | Striscia sopra il logo | 2 | 728x90, rotazione |
| `sidebar-left` | Colonna sinistra 160px | 5 | Verticali, scroll automatico |
| `sidebar-right` | Colonna destra 160px | 5 | Verticali, scroll automatico |
| `in-article` | Dentro il body articolo | 2 | Dopo il 3° paragrafo |
| `inline-homepage` | Tra le sezioni homepage | 3 | Tra overlay grid e mix-row |
| `footer` | Prima del footer | 2 | Striscia orizzontale |

Nel CMS, quando crei un banner, scegli la `posizione` — corrisponde alla zona nel sito.

### Zone Slideshow/Carousel (aggiornate automaticamente dal CMS)

| Zona | Contenuto | Fonte CMS |
|------|-----------|-----------|
| `tg-video` | TG animato — titoli rotanti | Breaking news o articoli in evidenza |
| `ticker` | Ticker scorrevole | Breaking news (testo + link) |
| `slideshow-foto` | Slideshow foto Valle | Articoli con copertina (ultimi 8) |
| `slideshow-notizie` | Card notizie homepage | Ultimi articoli pubblicati |
| `video-gallery` | Galleria video YouTube | Statico (futuro: da CMS media) |

Quando l'IA progetta un sito, deve usare questi stessi ID zona nel HTML e chiamare `cmsRenderBannerZone(containerId, position, opts)` per i banner e `cmsLoadZoneContent(zoneId)` per gli slideshow.

---

## 11. Struttura dati di riferimento

### Articolo
```
id, title, subtitle, slug, summary, body (HTML),
cover_image_url, category_id, categories[], author{},
status, is_featured, is_breaking, is_premium,
published_at, reading_time_minutes
```

### Categoria
```
id, name, slug, color, sort_order
```

### Tag
```
id, name, slug
```

### Evento
```
id, title, slug, description, location,
start_date, end_date, cover_image_url, is_featured
```

### Banner
```
id, label, image_url, target_url, position,
impression_count, click_count, is_active
```

---

## 11. Esempio minimo: card articolo HTML

```html
<template id="article-card-template">
  <article class="news-card" onclick="location.href='/articolo/' + this.dataset.slug">
    <img src="" alt="" class="card-img">
    <div class="card-body">
      <span class="card-cat"></span>
      <h3 class="card-title"></h3>
      <p class="card-excerpt"></p>
      <time class="card-date"></time>
    </div>
  </article>
</template>

<script>
async function renderArticles(containerId, limit) {
  const data = await cmsLoad("posts");
  const articles = (data.articles || data || []).slice(0, limit);
  const container = document.getElementById(containerId);
  const tpl = document.getElementById("article-card-template");

  articles.forEach(art => {
    const card = tpl.content.cloneNode(true);
    const el = card.querySelector(".news-card");
    el.dataset.slug = art.slug;
    card.querySelector(".card-img").src = art.cover_image_url || "/images/placeholder.jpg";
    card.querySelector(".card-img").alt = art.title;
    card.querySelector(".card-cat").textContent = art.categories?.[0]?.name || "";
    card.querySelector(".card-cat").style.color = art.categories?.[0]?.color || "#c0392b";
    card.querySelector(".card-title").textContent = art.title;
    card.querySelector(".card-excerpt").textContent = art.summary || "";
    card.querySelector(".card-date").textContent = new Date(art.published_at).toLocaleDateString("it-IT", {
      day: "numeric", month: "long", year: "numeric"
    });
    container.appendChild(card);
  });
}
</script>
```

---

## Riepilogo rapido per l'IA

Quando progetti un sito per questo CMS:

1. Includi `cms-config.js` + `cms-loader.js` in ogni pagina
2. Le sezioni news sono contenitori vuoti (`#cms-articles`, ecc.) che JS popola dal CMS
3. URL pattern: `/articolo/{slug}`, `/categoria/{slug}`
4. Dati da: **JSON statici su CDN** — mai API, mai database, mai chiavi
5. Nessun framework obbligatorio — HTML/CSS/JS puro
6. Il sito è statico, deployato su Vercel
7. I contenuti si aggiornano senza deploy grazie ai JSON pubblicati dal CMS
8. Performance: i JSON sono su CDN Supabase — caricamento istantaneo (~20ms)
