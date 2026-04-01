/**
 * Site Banners — Colonne laterali dentro il contenuto (non overlay)
 * Partono sotto le topbar, stanno ai lati del contenuto.
 * Scroll automatico verticale con velocità regolabile.
 */

(function() {
  var BANNER_WIDTH = 150;
  var SCROLL_SPEED = 0.3;

  var defaultBanners = [
    { h: 200, bg: '#e0e0e0', label: 'Banner 1' },
    { h: 280, bg: '#d8d8d8', label: 'Banner 2' },
    { h: 200, bg: '#e0e0e0', label: 'Banner 3' },
    { h: 250, bg: '#d5d5d5', label: 'Banner 4' },
    { h: 200, bg: '#e0e0e0', label: 'Banner 5' },
    { h: 280, bg: '#d8d8d8', label: 'Banner 6' },
    { h: 200, bg: '#e0e0e0', label: 'Banner 7' },
    { h: 250, bg: '#d5d5d5', label: 'Banner 8' },
    { h: 200, bg: '#e0e0e0', label: 'Banner 9' },
    { h: 280, bg: '#d8d8d8', label: 'Banner 10' },
  ];

  function buildBannerHtml(banners) {
    var html = '<div class="sb-track">';
    // Triple the banners for seamless infinite loop — no gaps ever visible
    var all = banners.concat(banners).concat(banners);
    for (var i = 0; i < all.length; i++) {
      var b = all[i];
      if (b.image_url || b.imageUrl) {
        html += '<a href="' + (b.link_url || b.linkUrl || '#') + '" target="_blank" rel="noopener" class="sb-item">';
        html += '<img src="' + (b.image_url || b.imageUrl) + '" alt="' + (b.name || 'Banner') + '" style="width:' + BANNER_WIDTH + 'px;height:auto;border-radius:4px;display:block;">';
        html += '</a>';
      } else {
        html += '<div class="sb-item" style="width:' + BANNER_WIDTH + 'px;height:' + b.h + 'px;background:' + b.bg + ';border-radius:4px;display:flex;align-items:center;justify-content:center;">';
        html += '<span style="font-family:Arial,sans-serif;font-size:9px;color:#aaa;text-transform:uppercase;">' + b.label + '</span>';
        html += '</div>';
      }
    }
    html += '</div>';
    return html;
  }

  function injectSidebars() {
    if (window.innerWidth < 1100) return;
    if (document.querySelector('.sb-wrapper')) return;

    // Wrap existing content: find the main content area after topbars
    // We wrap everything between the last topbar and the footer
    var footer = document.querySelector('.site-footer') || document.querySelector('footer');
    if (!footer) return;

    // Collect all elements between topbars and footer
    var contentNodes = [];
    var started = false;
    var children = Array.from(document.body.children);
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      if (el === footer || el.tagName === 'SCRIPT') break;
      // Start after last topbar/search-overlay/ticker
      if (el.classList && (el.classList.contains('topbar') || el.classList.contains('topbar-2') || el.classList.contains('ticker-wrap'))) {
        started = true;
        continue;
      }
      if (el.id === 'search-overlay') { started = true; continue; }
      if (started && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
        contentNodes.push(el);
      }
    }
    if (contentNodes.length === 0) return;

    // Create wrapper
    var wrapper = document.createElement('div');
    wrapper.className = 'sb-wrapper';

    var leftCol = document.createElement('aside');
    leftCol.className = 'sb-col sb-col-left';
    leftCol.innerHTML = buildBannerHtml(defaultBanners);

    var centerCol = document.createElement('div');
    centerCol.className = 'sb-center';

    var rightCol = document.createElement('aside');
    rightCol.className = 'sb-col sb-col-right';
    rightCol.innerHTML = buildBannerHtml(defaultBanners);

    // Insert wrapper before first content node
    contentNodes[0].parentNode.insertBefore(wrapper, contentNodes[0]);

    // Move content nodes into center
    for (var j = 0; j < contentNodes.length; j++) {
      centerCol.appendChild(contentNodes[j]);
    }

    wrapper.appendChild(leftCol);
    wrapper.appendChild(centerCol);
    wrapper.appendChild(rightCol);

    // Start scroll
    startScroll(leftCol.querySelector('.sb-track'), 1);
    startScroll(rightCol.querySelector('.sb-track'), -1);

    // Load CMS banners
    loadCmsBanners(leftCol, rightCol);
  }

  function startScroll(track, direction) {
    if (!track) return;
    var offset = 0;
    var speed = SCROLL_SPEED * direction;

    setTimeout(function() {
      // totalHeight = height of 1 set of banners (track has 3 sets)
      var totalHeight = track.scrollHeight / 3;
      // Start from the middle set so we can scroll both directions
      offset = totalHeight;
      track.style.transform = 'translateY(' + (-offset) + 'px)';

      function animate() {
        offset += speed;
        // Seamless reset: when we've scrolled past one full set, jump back
        if (offset >= totalHeight * 2) offset -= totalHeight;
        if (offset <= 0) offset += totalHeight;
        track.style.transform = 'translateY(' + (-offset) + 'px)';
        requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
    }, 200);
  }

  async function loadCmsBanners(leftCol, rightCol) {
    if (typeof cmsLoadBannersByPosition !== 'function') return;
    var sideBanners = await cmsLoadBannersByPosition('sidebar');
    if (!sideBanners || sideBanners.length === 0) return;

    // Split banners: odd index left, even index right
    var leftBanners = sideBanners.filter(function(_, i) { return i % 2 === 0; });
    var rightBanners = sideBanners.filter(function(_, i) { return i % 2 !== 0; });

    if (leftBanners.length > 0) {
      leftCol.innerHTML = buildBannerHtml(leftBanners);
      startScroll(leftCol.querySelector('.sb-track'), 1);
    }
    if (rightBanners.length > 0) {
      rightCol.innerHTML = buildBannerHtml(rightBanners);
      startScroll(rightCol.querySelector('.sb-track'), -1);
    }
  }

  // CSS
  var style = document.createElement('style');
  style.textContent = [
    '.sb-wrapper {',
    '  display: flex; gap: 0; max-width: calc(1280px + ' + (BANNER_WIDTH + 20) * 2 + 'px);',
    '  margin: 0 auto; align-items: flex-start;',
    '}',
    '.sb-col {',
    '  width: ' + (BANNER_WIDTH + 20) + 'px; flex-shrink: 0;',
    '  padding: 12px 10px; overflow: hidden;',
    '  position: sticky; top: 45px; height: calc(100vh - 50px);',
    '}',
    '.sb-col .sb-track { display: flex; flex-direction: column; gap: 0; will-change: transform; }',
    '.sb-col .sb-item { margin-bottom: 8px; }',
    '.sb-col .sb-item { flex-shrink: 0; }',
    '.sb-col a { display: block; }',
    '.sb-center { flex: 1; min-width: 0; }',
    '@media (max-width: 1100px) {',
    '  .sb-col { display: none !important; }',
    '  .sb-wrapper { display: block; }',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSidebars);
  } else {
    injectSidebars();
  }
})();
