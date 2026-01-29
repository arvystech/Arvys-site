// Modern Page Loader Script
// Add this script to all pages to handle the page loader

(function() {
  'use strict';
  
  // Hide page loader when page is fully loaded
  window.addEventListener('load', function() {
    const loader = document.getElementById('pageLoader');
    if (loader) {
      // Small delay for smooth experience
      setTimeout(function() {
        loader.classList.add('fade-out');
      }, 300);
    }
  });
  
  // Fallback: Hide loader after max 5 seconds in case of slow loading
  setTimeout(function() {
    const loader = document.getElementById('pageLoader');
    if (loader && !loader.classList.contains('fade-out')) {
      loader.classList.add('fade-out');
    }
  }, 5000);
})();
