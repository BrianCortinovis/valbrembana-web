// ValBrembana Web Demo - script.js

// Duplicate ticker content for seamless loop
document.addEventListener('DOMContentLoaded', function() {
  const ticker = document.querySelector('.news-ticker');
  if (ticker) {
    ticker.innerHTML += ticker.innerHTML;
  }

  // Add active class to current nav item
  const navLinks = document.querySelectorAll('.top-bar a');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Smooth scroll on grid item click (placeholder)
  document.querySelectorAll('.grid-item').forEach(item => {
    item.style.cursor = 'pointer';
  });

  // TG video: unmute on first user interaction
  const video = document.querySelector('.video-container video');
  if (video) {
    document.body.addEventListener('click', function unmuteTG() {
      video.muted = false;
      document.body.removeEventListener('click', unmuteTG);
    }, { once: true });
  }
});
