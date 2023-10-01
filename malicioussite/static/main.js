console.log('[malicious site] cool');

window.addEventListener("click", function(event) {
  console.log(event);
});

window.addEventListener("DOMContentLoaded", () => {
  console.log('loaded');
});

