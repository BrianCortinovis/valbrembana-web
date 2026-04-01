/**
 * CMS Loader — Val Brembana Web
 * Carica dati dal published layer (JSON statici su CDN Supabase).
 * Nessuna API, nessun token, nessun database.
 */

async function cmsLoad(resource, slug) {
  var base = window.VBW_CMS.publishedBase;
  var url = slug
    ? base + "/" + resource + "/" + slug + ".json"
    : base + "/" + resource + ".json";

  try {
    var res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) { /* JSON non ancora pubblicato */ }
  return null;
}

/** Carica tutti gli articoli pubblicati */
async function cmsLoadArticles() {
  var data = await cmsLoad("posts");
  if (!data) return [];
  return cmsNormalizeArticles(data.articles || data || []);
}

/** Carica articolo singolo per slug */
async function cmsLoadArticle(slug) {
  var data = await cmsLoad("articles", slug);
  if (!data) return null;
  return cmsNormalizeArticle(data.article || data);
}

/** Carica articoli di una categoria */
async function cmsLoadCategory(categorySlug) {
  var data = await cmsLoad("categories", categorySlug);
  if (!data) return [];
  return cmsNormalizeArticles(data.articles || data || []);
}

/** Carica breaking news */
async function cmsLoadBreakingNews() {
  var data = await cmsLoad("breaking-news");
  if (!data) return [];
  return data.items || data || [];
}

/** Carica settings sito */
async function cmsLoadSettings() {
  return await cmsLoad("settings");
}

/** Carica menu navigazione */
async function cmsLoadMenu() {
  return await cmsLoad("menu");
}

/** Carica eventi */
async function cmsLoadEvents() {
  var data = await cmsLoad("events");
  if (!data) return [];
  return data.events || data || [];
}

/** Carica banner */
async function cmsLoadBanners() {
  var data = await cmsLoad("banners");
  if (!data) return [];
  return data.banners || data || [];
}

/** Formatta data in italiano */
function cmsFormatDate(isoDate) {
  if (!isoDate) return "";
  try {
    return new Date(isoDate).toLocaleDateString("it-IT", {
      day: "numeric", month: "long", year: "numeric"
    });
  } catch (e) { return ""; }
}

/** Formatta data breve */
function cmsFormatDateShort(isoDate) {
  if (!isoDate) return "";
  try {
    return new Date(isoDate).toLocaleDateString("it-IT", {
      day: "numeric", month: "short", year: "numeric"
    });
  } catch (e) { return ""; }
}

/** Carica zone banner con posizioni */
async function cmsLoadBannerZones() {
  var data = await cmsLoad("banner-zones");
  if (!data) return [];
  return data.zones || data || [];
}

/**
 * Carica banner per una posizione specifica.
 * Posizioni: header, sidebar-left, sidebar-right, in-article, footer, interstitial
 * Ritorna array di banner attivi per quella posizione.
 */
async function cmsLoadBannersByPosition(position) {
  var banners = await cmsLoadBanners();
  return banners.filter(function(b) {
    return b.position === position && b.is_active !== false;
  });
}

/**
 * Renderizza banner in un container DOM con rotazione automatica.
 * @param {string} containerId - ID del container HTML
 * @param {string} position - Posizione banner dal CMS (header, sidebar-left, sidebar-right, etc.)
 * @param {object} opts - { direction: 'vertical'|'horizontal', interval: 5000, maxVisible: 1 }
 */
async function cmsRenderBannerZone(containerId, position, opts) {
  opts = opts || {};
  var direction = opts.direction || 'vertical';
  var interval = opts.interval || 5000;
  var maxVisible = opts.maxVisible || 1;

  var banners = await cmsLoadBannersByPosition(position);
  if (banners.length === 0) return;

  var container = document.getElementById(containerId);
  if (!container) return;

  // Sort by weight (higher first)
  banners.sort(function(a, b) { return (b.weight || 1) - (a.weight || 1); });

  // Build banner slides
  var html = '<div class="cms-banner-track" data-zone="' + position + '" style="display:flex;flex-direction:' + (direction === 'vertical' ? 'column' : 'row') + ';transition:transform 0.5s ease;">';
  banners.forEach(function(b) {
    var imgUrl = b.image_url || b.imageUrl || '';
    var linkUrl = b.link_url || b.linkUrl || '#';
    html += '<div class="cms-banner-slide" style="min-' + (direction === 'vertical' ? 'height' : 'width') + ':100%;flex-shrink:0;">';
    html += '<a href="' + linkUrl + '" target="_blank" rel="noopener" data-banner-id="' + b.id + '">';
    if (imgUrl) {
      html += '<img src="' + imgUrl + '" alt="' + (b.name || 'Pubblicità') + '" style="width:100%;height:auto;display:block;border-radius:4px;">';
    } else if (b.html_content || b.htmlContent) {
      html += '<div>' + (b.html_content || b.htmlContent) + '</div>';
    }
    html += '</a></div>';
  });
  html += '</div>';
  container.innerHTML = html;

  // Auto-rotation if more banners than maxVisible
  if (banners.length > maxVisible) {
    var track = container.querySelector('.cms-banner-track');
    var idx = 0;
    var total = banners.length;
    setInterval(function() {
      idx = (idx + 1) % total;
      var prop = direction === 'vertical' ? 'translateY' : 'translateX';
      track.style.transform = prop + '(-' + (idx * 100) + '%)';
    }, interval);
  }
}

/**
 * Carica contenuti per una zona slideshow/carousel dal CMS.
 * Zone predefinite del sito:
 * - "tg-video" — TG animato (titoli breaking news dal CMS)
 * - "slideshow-foto" — Slideshow foto dalla Valle
 * - "video-gallery" — Video YouTube dalla Valle
 * - "slideshow-notizie" — Slideshow notizie in evidenza
 */
async function cmsLoadZoneContent(zoneId) {
  // Per ora le zone specializzate leggono da dati esistenti
  // In futuro si potrà avere un zones.json dedicato
  switch (zoneId) {
    case 'tg-video':
      // Breaking news per il TG
      var bn = await cmsLoadBreakingNews();
      if (bn.length > 0) return bn;
      // Fallback: ultimi articoli in evidenza
      var arts = await cmsLoadArticles();
      return arts.filter(function(a) { return a.is_featured || a.is_breaking; }).slice(0, 6);
    case 'slideshow-foto':
      // Articoli con immagine di copertina
      var arts2 = await cmsLoadArticles();
      return arts2.filter(function(a) { return a.cover_image_url; }).slice(0, 8);
    case 'slideshow-notizie':
      return (await cmsLoadArticles()).slice(0, 6);
    default:
      return [];
  }
}

/**
 * Normalize article data from CMS JSON.
 * - categories: CMS may return object or array — always normalize to array
 * - author: CMS uses "profiles" field, site expects "author"
 */
function cmsNormalizeArticle(a) {
  if (!a) return a;
  // Normalize categories to array
  if (a.all_categories && Array.isArray(a.all_categories)) {
    a.categories = a.all_categories;
  } else if (a.categories && !Array.isArray(a.categories)) {
    a.categories = [a.categories];
  } else if (!a.categories) {
    a.categories = [];
  }
  // Normalize author
  if (!a.author && a.profiles) {
    a.author = a.profiles;
  }
  return a;
}

function cmsNormalizeArticles(articles) {
  return (articles || []).map(cmsNormalizeArticle);
}

/** Placeholder image */
var CMS_PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23ddd'%3E%3Crect width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-family='sans-serif' font-size='14'%3EImmagine%3C/text%3E%3C/svg%3E";
