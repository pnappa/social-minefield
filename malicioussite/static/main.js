console.log('[malicious site] cool');

const isElementInBounds = (clickEvent, element) => {
  // XXX: Are we gonna support right click?
  const isLeftClick = clickEvent.button === 0;
  const isRightClick = clickEvent.button === 2;
  console.log(clickEvent);
  const [x, y] = [clickEvent.x, clickEvent.y]; 
  const bounds = element.getBoundingClientRect();
  return x >= bounds.left && x <= bounds.right &&
         y >= bounds.top && y <= bounds.bottom;
}

window.addEventListener("mouseup", function(event) {
  console.log(event);
  document.querySelectorAll('.mine').forEach((el, idx) => {
    // TODO: This will never happen, as the iframe swallows the event.
    console.log(`is mine ${idx} in bounds? `, isElementInBounds(event, el));
  });
  document.querySelectorAll('.space').forEach((el, idx) => {
    // TODO: 
    if (isElementInBounds(event, el)) {
      alert(`Clicked square ${idx}`);
    }
  });
});

window.addEventListener("DOMContentLoaded", () => {
  console.log('loaded');
});

