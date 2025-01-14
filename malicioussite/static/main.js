// I intentionally expose these functions to the global scope, as it's fun to
// expose the machinery to curious people. If they want to "defuse" the game,
// that's fun too. :)

// Yes, these are the links you can like when you click a mine.
var isDev = false;
if (isDev) {
  var minelinks = [
    'http://localhost:8889',
    'http://localhost:8889',
    'http://localhost:8889',
    'http://localhost:8889',
    'http://localhost:8889',
    'http://localhost:8889',
    'http://localhost:8889',
    'http://localhost:8889',
    'http://localhost:8889',
    'http://localhost:8889',
  ];
} else {
  var minelinks = [
    'https://www.youtube.com/watch?v=3d5JtSHC3vw',
    'https://zombo.com',
    'https://www.dailymail.co.uk/tvshowbiz/article-13205653/Kanye-West-wife-Bianca-Censori-minidress-Los-Angeles.html',
    'https://eelslap.com/',
    'https://www.amazon.com/Uncensored-Hugging-Dakimakura-Full-Size-Pillowcase/dp/B0CLRSHWZ5/',
    'https://titanchair.com/products/dpc-skinshot-led-face-mask',
    'https://www.youtube.com/watch?v=pvb3y9qIf8k',
    'https://www.dailymail.co.uk/sport/boxing/article-13204483/Mike-Tyson-57-shares-latest-training-footage-displays-power-strength-ahead-showdown-Paul-summer.html',
    'https://www.youtube.com/watch?v=mKdjycj-7eE',
    'https://newreligiousmovements.org/u/unification-church-moonies/',
    'https://www.rd.com/list/coffee-memes/',
    'https://reddit.com/r/PublicFreakout/comments/10g5n09/boss_puts_pressure_over_new_employee_attempting/',
    'https://www.imdb.com/title/tt11161374/',
    'https://boards.4chan.org/po/thread/561868',
    'https://www.youtube.com/watch?v=c59W6SntxdQ',
    'https://www.ecmrrc.org/',
    'https://www.amazon.com.au/KNOW-MORE-ABOUT-HYDROXYCHLOROQUINE-CHLOROQUINE/dp/B08FRGVMFS/',
    'https://www.madebycow.com.au/',
    'https://www.pinterest.com.au/muffinrw/doll-toilet-paper-covers/',
    'https://www.chatham.co.uk/mens/by-footwear/boat-shoes',
    'https://www.calaiswine.co.uk/blog/20-best-wine-gifs-memes',
    'https://classicsdirect.com.au/collections/dvds/products/andre-rieu-johnann-strauss-orchestra-the-magic-of-andre-rieu-box-set-3dvd',
    'https://www.youtube.com/watch?v=xOZgF3DBH5s',
    'https://www.imdb.com/title/tt5697572/',
  ];
  // https://stackoverflow.com/a/2450976
  function shuffle(array) {
    let currentIndex = array.length,  randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex > 0) {

      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  }
  shuffle(minelinks);
}

const width = 10;
const height = 10;
// Null if no game started.
let currGameField = null;
let isGameOver = false;
let isFlagPlacingEnabled = false;

// Gobble cloud currently selected deletion row:
let currGobbleRow = null;

const checkURL = 'https://h7cnchzwygu4k3tgjcbuj4cetq0gmkcq.lambda-url.ap-southeast-2.on.aws/';

// We need to subtract the border size, as we don't want clicking on the
// border to trigger the reveal. This is because clicking on the border of an
// iframe will not click on the content within. Please keep in sync with the
// CSS for the cell borders, etc.
const cellBorderWidth = 2;

// Interactive demo code.
let demo1CurrentStep = 1;
let maxDemo1Step = null;
let demo2CurrentStep = 1;
let maxDemo2Step = null;

const isElementInBounds = (clickEvent, element) => {
  // XXX: Are we gonna support right click?
  const isLeftClick = clickEvent.button === 0;
  const isRightClick = clickEvent.button === 2;
  const [x, y] = [clickEvent.x, clickEvent.y]; 
  const bounds = element.getBoundingClientRect();
  // 0,0 is top left of the viewport.
  return x >= (bounds.left + cellBorderWidth) && x <= (bounds.right - cellBorderWidth) &&
         y >= (bounds.top + cellBorderWidth) && y <= (bounds.bottom - cellBorderWidth);
}

const idxToCoords = (idx) => {
  if (idx >= width * height || idx < 0) {
    throw new Error("invalid coords");
  }
  return {
    x: idx % width,
    y: Math.floor(idx / width),
  };
};

const coordToIdx = ({ x, y }) => {
  return (y * width) + x;
}

// Fn from https://stackoverflow.com/a/12646864
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const cellToClassName = (c) => {
  switch (c) {
    case 0:
      return 'zero';
    case 1:
      return 'one';
    case 2:
      return 'two';
    case 3:
      return 'three';
    case 4:
      return 'four';
    case 5:
      return 'five';
    case 6:
      return 'six';
    case 7:
      return 'seven';
    case 8:
      return 'eight';
    case -1:
      return 'explodedmine';
    default:
      // No idea!
      return '';
  }
}

const checkWinCondition = () => {
  if (currGameField == null) {
    return false;
  }
  const cells = document.querySelectorAll('.square');
  // If every non-mine piece has been clicked, it's a win.
  for (let idx = 0; idx < cells.length; ++idx) {
    const coords = idxToCoords(idx);
    if (!cells[idx].classList.contains('clicked') && currGameField[coords.y][coords.x] !== -1) {
      // If we encounter a non-mine cell that hasn't been clicked, false.
      return false;
    }
  }
  // Got the whole way there?
  // TODO: Change the game state and website to indicate success. Maybe remove
  //       the iframes, and display where the bombs were. Add some popup too.
  displayAllCells();
  document.querySelector('#game-win-frame').classList.remove('hidden');
  return true;
};

const activateSquare = ({ x, y }) => {
  // Click on the square provided, as per minesweeper rules.
  if (currGameField == null) return;
  // If it's already been clicked, don't do anything. 
  const cells = document.querySelectorAll('.square');
  const el = cells[(y * height) + x];
  if (el.classList.contains('clicked')) return;

  const flagSquares = document.querySelectorAll('.flagsquare');
  const flagIdx = coordToIdx({ x, y });
  if (flagSquares[flagIdx]?.classList.contains('active')) {
    // If there's a flag on this square, clicking shall do nothing.
    return;
  }

  const cell = currGameField[y][x];
  switch (cell) {
    case 0:
      // Flood fill.
      let worklist = [{ x, y }];
      while (worklist.length) {
        // Pop from front.
        const workCoords = worklist.shift();
        const workIdx = coordToIdx(workCoords);
        const workEl = cells[workIdx];
        // If it's already been revealed, don't reveal, nor add its neighbours.
        if (workEl.classList.contains('clicked')) continue;
        // Flood fill should not reveal what's behind a flag.
        if (flagSquares[workIdx]?.classList.contains('active')) continue;
        const workGameCell = currGameField[workCoords.y][workCoords.x];
        // "Click" the elements that appear in the work list.
        workEl.classList.add('clicked');
        workEl.classList.add(cellToClassName(workGameCell));
        // If it's a zero, also add the neighbours to the worklist.
        if (workGameCell === 0) {
          // Add the neighbours.
          worklist = worklist.concat(
            neighbourCoords({ row: workCoords.y, col: workCoords.x }),
          );
        }
      }
      // It's possible the flood fill actually won the game for them.
      checkWinCondition();
      break;
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
    case 8:
      // Reveal square in dom.
      el.classList.add(cellToClassName(cell));
      el.classList.add('clicked');
      checkWinCondition();
      break;
    case -1:
      // This is actually impossible to reach, as the iframe swallows the
      // input. Just do nothing.
      break;
  }
};

const displayAllCells = () => {
  if (currGameField == null) return;
  const flagSquares = document.querySelectorAll('.flagsquare');
  document.querySelectorAll('.square').forEach((el, idx) => {
    const coords = idxToCoords(idx);
    const cell = currGameField[coords.y][coords.x];
    el.classList.add(cellToClassName(cell));
    // If the square was flagged, and it was not a mine, show a crossed out icon
    // in the flags layer.
    if (cell !== -1 && flagSquares[idx]?.classList.contains('active')) {
      flagSquares[idx].classList.add('incorrect');
    }
  });
};

// Disable the ability for users to click on the mines once triggered.
const removeAllMineIframes = () => {
  document.querySelectorAll('.boo > iframe').forEach((el) => {
    // Unalive yourself
    el.parentElement.replaceChildren();
  });
};

// This function is called when the user clicks on a mine at index idx.
const gameOver = (idx, iframeSrc, dataURL) => {
  const { x, y } = idxToCoords(idx);
  // What we should do, is mark the game as over. Then, in X seconds, show the
  // pop-up saying they've lost.
  // The reason for this is that we want to reduce the likelihood the modal
  // breaks the clickjack interaction. For normal clicks, this should be fine,
  // but if a user holds for too long, yes, it'll break. Oh well.
  // Tweak the timeout for a good-feeling value.
  isGameOver = true;
  setTimeout(() => {
    // Show what link they clicked on.
    const mineIframe = document.querySelector('#clicked-mine-demo');
    if (mineIframe) {
      mineIframe.src = iframeSrc;
      mineIframe.setAttribute('data-url', dataURL);
    }
    // And tell them what link they clicked on.
    const mineLink = document.querySelector('#game-over-link-text');
    if (mineLink) {
      mineLink.innerText = dataURL;
      mineLink.href = dataURL;
    }
    document.querySelector('#game-over-frame')?.classList.remove('hidden');

    // Toggle the mine cell.
    const element = document.querySelectorAll('.square')[idx];
    element.classList.add('explodedmine');
    element.classList.add('clicked');
    displayAllCells();

    // Hide the place flags button.
    document.querySelector('#placeflags').classList.add('hidden');

    // 
    // XXX: This might be breaking the code if you hold down the click? Instead
    //      let's try just re-adding pointer events to the game.
    // removeAllMineIframes();
    // XXX: This won't work either, it seems to check the pointer-events priority
    //      at the time of release when working out whether the click is
    //      propagated.
    // document.querySelector('table.game').classList.add('disable-game');
    // I am instead going to make the executive decision that clicking on mines is
    // a bad idea, even when you've uncovered them. Even after minesweeper ships
    // _discover_ mines, it's still a bad idea to run a ship into them.
    // Et voila, it's canon. :)
  }, 100);
};

// Monitor when iframes are (probably) clicked, so as to display a relevant
// game-over message. As we're clickjacking them, we cannot capture the inputs,
// so we need to detect it by other methods.
const startMonitoringIFrames = () => {
  let activeFrame = null;
  // Cursed code adapted from: https://stackoverflow.com/a/32138108
  const monitor = setInterval(function(){
    // XXX: This code is actually not quite right, if you release the click
    //      outside the square, it won't "like" the square (observe that no
    //      alert is raised from the friendly site).
    //      Even if there's a longer delay it technically won't stop it, and
    //      makes another exploit possible (if there's a 50/50, quickly click
    //      both). However, if we decrease it, it'll spawn an alert that will
    //      nullify the click on the iframe. If the winning condition doesn't
    //      involve an alert (but instead is a floating div, then it probably
    //      won't break anything, but should test this. Indeed, we shouldn't
    //      delete the iframe, as I think that's another cause, instead, just
    //      renable the pointer events.
    //      I don't believe this code is possible to get perfectly right. These
    //      are just hacks, and for a "normal" player, it functions good enough.
    if (currGameField == null) return;
    var elem = document.activeElement;
    if (
      elem?.tagName === 'IFRAME' &&
      elem.parentElement.id != null &&
      // Ignore clicking the example of a failed iframe loading.
      elem.parentElement.id !== 'example-failed-wrapper'){
      // We store the ID on the table cell, not the iframe.
      const elemId = elem.parentElement.id;
      // Only activate if it's the first click.
      if (activeFrame != elemId) {
        const idx = elemId.split('-')[1];
        if (idx != null) {
          gameOver(idx, elem.src, elem.getAttribute('data-url'));
        }
      }
      activeFrame = elemId;
    } else {
      activeFrame = null;
    }
  }, 500);
};

const startMonitoringTabOut = () => {
  // If the game is in progress, unfocusing the screen should bring up a pause
  // menu. This is because we need the window focussed for the iframe
  // monitoring code to work. Clicking "resume" in the pause menu, is one such
  // method to re-focus.
  // XXX: Actually, we need to make sure the pause menu is not brought up when
  //      clicking on the iframe, as that will lose focus on the root document,
  //      right?
  // TODO:
};

const neighbourCoords = ({ row, col }) => {
  let ret = [];
  if (row > 0) {
    // Count cells in the 3 elements above this cell.
    // Top Left
    if (col > 0) {
      ret.push({ x: col - 1, y: row - 1 });
    }
    // Top Middle
    ret.push({ x: col, y: row - 1 });
    // Top Right
    if (col < width - 1) {
      ret.push({ x: col + 1, y: row - 1 });
    }
  }
  // Count left and right of this cell.
  if (col > 0) {
    // Left
    ret.push({ x: col - 1, y: row });
  }
  if (col < width - 1) {
    // Right
    ret.push({ x: col + 1, y: row });
  }

  if (row < height - 1) {
    // Bottom Left
    if (col > 0) {
      ret.push({ x: col - 1, y: row + 1 });
    }
    // Bottom Middle
    ret.push({ x: col, y: row + 1 });
    // Bottom Right
    if (col < width - 1) {
      ret.push({ x: col + 1, y: row + 1 });
    }
  }
  return ret;
};

// The user will click on a square to start the game, at which point we can
// generate the game tiles.
const initialiseGameField = ({ x, y }) => {
  const num_mines = 10;
  // Out of bounds, don't do anything.
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  
  // Game is a 2D array.
  const game = Array(height).fill(0).map(() => Array(width).fill(0));
  // We first add the mines in every position that is not the provided coords.
  // Merely shuffle a list of indices, and pick the first #num_mines.
  const indices = Array.from(Array(height*width).keys());
  shuffleArray(indices);
  const minePositions = [];
  while (minePositions.length < num_mines) {
    const el = idxToCoords(indices.pop());
    // Skip if it matches the provided start coords.
    if (el.x === x && el.y === y) continue;
    minePositions.push(el);
    game[el.y][el.x] = -1;
  }

  // Then, colour in the numbers for how many adjacent mines there are.
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      // No need to colour in mines.
      if (game[row][col] === -1) continue;

      const numAdjacentMines = neighbourCoords({ row, col }).map((coord) => {
        return game[coord.y][coord.x] === -1 ? 1 : 0;
      }).reduce((a, b) => a + b, 0);

      game[row][col] = numAdjacentMines;
    }
  }

  // Then, add the iframes in.
  const iframecells = document.querySelectorAll('td.boo');
  minePositions.forEach((pos, idx) => {
    const relevantCell = iframecells[coordToIdx(pos)];
    if (!isDev) {
      relevantCell.innerHTML = `<iframe data-url="${minelinks[idx]}" referrerpolicy="no-referrer" src="https://www.facebook.com/plugins/like.php?href=${encodeURIComponent(minelinks[idx])}&width=100px&layout&action&size&share=false&height=35&appId" width="100px" height="35" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
    } else {
      // In dev mode, just show the iframe
      relevantCell.innerHTML = `<iframe data-url="${minelinks[idx]}" referrerpolicy="no-referrer" src="${minelinks[idx]}" width="100px" height="35" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
    }
  });
  
  return game;
};


window.addEventListener("mouseup", function(event) {
  if (!isFlagPlacingEnabled) {
    // Regular mine discovery.
    if (currGameField == null) {
      // If there's no game active, our purpose is to start the game.
      const squares = document.querySelectorAll('.square');
      for (let idx = 0; idx < squares.length; ++idx) {
        const el = squares[idx];
        const inBounds = isElementInBounds(event, el);
        if (inBounds) {
          const coords = idxToCoords(idx);
          // Generate a game, and set up the iframes.
          currGameField = initialiseGameField(coords);
          // "Click" the square the user clicked.
          activateSquare(coords);
          // Start loop which detects whether the user has clicked on a iframe.
          startMonitoringIFrames();
          break;
        }
      }
      if (currGameField != null) {
        // Also hide the start hint.
        document.querySelector('#start-hint')?.classList.add('disabled');
      }
    } else if (!isGameOver) {
      // Handle when the cells are clicked.
      document.querySelectorAll('.square').forEach((el, idx) => {
        // This will never happen for mines, as the iframe swallows the event.
        if (isElementInBounds(event, el)) {
          activateSquare(idxToCoords(idx));
        }
      });
    }
  } else {
    // Flag placement.
    document.querySelectorAll('.flagsquare').forEach((el, idx) => {
      if (isElementInBounds(event, el)) {
        el.classList.toggle('active');
      }
    });
  }
});

const enterFlagPlacingMode = () => {
  document.querySelector('#placeflags').innerText = '🚫 Stop Flagging';
  // Disable the iframes by capturing pointer events.
  document.querySelector('table.flagplacer').classList.add('active');
};

const exitFlagPlacingMode = () => {
  document.querySelector('#placeflags').innerText = '🚩 Start Flagging';
  // Enable the iframes by not capturing pointer events.
  document.querySelector('table.flagplacer').classList.remove('active');
}

const refreshDemo1Items = () => {
  const updateStep = (expectedStep, el) => {
    if (demo1CurrentStep === expectedStep) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }
  const slides = document.querySelectorAll('#interactive-demo-1 > div');
  for (let i = 1; i <= slides.length; ++i) {
    updateStep(i, slides[i-1]);
  };

  // Disable the prev and next buttons.
  if (demo1CurrentStep === 1) {
    document.querySelector('#prev-step-1').disabled = true;
    document.querySelector('#next-step-1').disabled = false;
  } else if (demo1CurrentStep === maxDemo1Step) {
    document.querySelector('#prev-step-1').disabled = false;
    document.querySelector('#next-step-1').disabled = true;
  } else {
    document.querySelector('#prev-step-1').disabled = false;
    document.querySelector('#next-step-1').disabled = false;
  }
};

const addURLListItems = (ul, items) => {
  // items is { url: string; otherText?: string }[].
  ul.replaceChildren(
    ...items.map((v) => {
      const liItem = document.createElement('li');
      const codeItem = document.createElement('code');
      codeItem.innerText = v.url;
      // Some entries may have some additional text.
      if (v.otherText) {
        const flavour = document.createElement('span');
        flavour.innerText = v.otherText;
        liItem.replaceChildren(
          codeItem,
          flavour,
        );
      } else {
        liItem.replaceChildren(codeItem);
      }
      return liItem;
    }),
  );
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#placeflags').addEventListener('mouseup',
    (clickEvent) => {
      const isLeftClick = clickEvent.button === 0;
      if (isLeftClick) {
        isFlagPlacingEnabled = !isFlagPlacingEnabled;
        if (isFlagPlacingEnabled) {
          enterFlagPlacingMode();
        } else {
          exitFlagPlacingMode();
        }
      }
    }
  );

  document.querySelector('#clickjacking-checker').addEventListener('submit', () => {
    document.querySelector('#clickjacking-checker').classList.add('loading');
    const el = document.querySelector('#clickjacking-website-input');
    if (el?.value) {
      // First, make each sub-item under results hidden.
      document.querySelectorAll('#clickjacking-checker > .results > div').forEach((el) => {
        el.classList.add('hidden');    
      });
      fetch(`${checkURL}`, {
        method: 'POST',
        headers: { 'Content-Type':  'application/json' },
        body: JSON.stringify({ url: el.value }) },
      ).then((r) => r.json()).then((e) => {
        if ('error' in e || 'errorMessage' in e) {
          // Then set the error text and make the error visible.
          const errorDiv = document.querySelector('#clickjacking-checker > .results > .check-result-error');
          errorDiv.innerText = e['error'] ?? e['errorMessage'];
          errorDiv.classList.remove('hidden');
        } else {
          if (e.vulnStatus?.status === 'safe') {
            // Unhide the section.
            document.querySelector('#clickjacking-checker > .results > .safe-result').classList.remove('hidden');
            // Make each sub-item hidden, so the logic to show the right
            // result is simpler, just unhide valid subelements.
            document.querySelectorAll('#clickjacking-checker > .results > .safe-result > div').forEach((el) => el.classList.add('hidden'));

            if (e.vulnStatus?.safeSourcesAllowed?.length === 0) {
              document.querySelector('#clickjacking-checker > .results > .safe-result > .success-none-allowed').classList.remove('hidden');
            }
            if (e.vulnStatus?.safeSourcesAllowed?.length > 0) {
              document.querySelector('#clickjacking-checker > .results > .safe-result > .success-result-list').classList.remove('hidden');
              // Populate the unordered list.
              addURLListItems(
                document.querySelector('#clickjacking-checker > .results > .safe-result > .success-result-list > ul'),
                e.vulnStatus.safeSourcesAllowed.map((source) => {
                  if ('sameorigin' in source) {
                    return {
                      url: e.vulnStatus.url,
                    };
                  } 
                  if ('source' in source) {
                    return {
                      url: source.source,
                    };
                  }
                  // Nothing matched? Filter it out.
                  return null;
                }).filter((e) => e != null),
              );
            }
            if (e.vulnStatus?.ignoredSources?.length > 0) {
              document.querySelector('#clickjacking-checker > .results > .safe-result > .check-result-invalid').classList.remove('hidden');
              addURLListItems(
                document.querySelector('#clickjacking-checker > .results > .safe-result > .check-result-invalid > ul'),
                e.vulnStatus.ignoredSources.map((source) => {
                  return { url: source }
                }),
              );
            }
          } else if (e.vulnStatus?.status === 'unsafe') {
            // Unhide the section.
            document.querySelector('#clickjacking-checker > .results > .unsafe-result').classList.remove('hidden');
            // Make each sub-item hidden, so the logic to show the right
            // result is simpler, just unhide valid subelements.
            document.querySelectorAll('#clickjacking-checker > .results > .unsafe-result > div').forEach((el) => el.classList.add('hidden'));

            if (e.vulnStatus.missingPolicy) {
              document.querySelector('#clickjacking-checker > .results > .unsafe-result > .unsafe-missing-policy').classList.remove('hidden');
            }
            if (e.vulnStatus.dangerousSourcesAllowed?.length > 0) {
              // The unsafe ones.
              document.querySelector('#clickjacking-checker > .results > .unsafe-result > .unsafe-result-list').classList.remove('hidden');
              addURLListItems(
                document.querySelector('#clickjacking-checker > .results > .unsafe-result > .unsafe-result-list-safe-exceptions > ul'),
                e.vulnStatus.dangerousSourcesAllowed.map((source) => {
                  const vurl = source.permissiveAddress;
                  if (vurl === 'https:' || vurl === 'http:') {
                    // Add some flavour text to explain these somewhat
                    // confusing ones.
                    return {
                      url: vurl,
                      otherText: vurl === 'https:' 
                        ? ' (any HTTPS website)'
                        : ' (any HTTP website)',
                    };
                  }
                  return { url: vurl };
                }),
              );

              // The safe ones.
              if (e.vulnStatus.safeSourcesAllowed?.length > 0) {
                document.querySelector('#clickjacking-checker > .results > .unsafe-result > .unsafe-result-list-safe-exceptions').classList.remove('hidden');
                addURLListItems(
                  document.querySelector('#clickjacking-checker > .results > .unsafe-result > .unsafe-result-list-safe-exceptions > ul'),
                  e.vulnStatus.safeSourcesAllowed.map((source) => {
                    if ('sameorigin' in source) {
                      return {
                        url: e.vulnStatus.url,
                      };
                    } 
                    if ('source' in source) {
                      return {
                        url: source.source,
                      };
                    }
                    // Nothing matched? Filter it out.
                    return null;
                  }).filter((e) => e != null),
                );
              }
            }
            if (e.vulnStatus.ignoredSources?.length > 0) {
              // Ignored ones.
              document.querySelector('#clickjacking-checker > .results > .unsafe-result > .check-result-invalid').classList.remove('hidden');
              addURLListItems(
                document.querySelector('#clickjacking-checker > .results > .unsafe-result > .check-result-invalid > ul'),
                e.vulnStatus.ignoredSources.map((source) => {
                  return { url: source }
                }),
              );
            }
          }
          console.log(e);
          // document.querySelector('#clickjacking-checker > .results').innerText = JSON.stringify(e, null, 2);
        }
      }).catch((err) => {
        // XXX: Copied from above.
        // Then set the error text and make the error visible.
        const errorDiv = document.querySelector('#clickjacking-checker > .results > .check-result-error');
        errorDiv.innerText = `An error occurred: unable to check website. Please try again later.`;
        errorDiv.classList.remove('hidden');
      }).finally(() => {
        document.querySelector('#clickjacking-checker').classList.remove('loading');
      });
    }
  });

  // We have an interactive demo, but we don't want people to progress beyond
  // the last slide.
  maxDemo1Step = document.querySelectorAll('#interactive-demo-1 > div').length;
  maxDemo2Step = document.querySelectorAll('#interactive-demo-2 > div').length;
  document.querySelector('#prev-step-1').addEventListener('mouseup',
    () => {
      // Don't do anything if not initialised.
      if (maxDemo1Step == null) return;
      demo1CurrentStep--;
      if (demo1CurrentStep < 1) demo1CurrentStep = 1;
      refreshDemo1Items();
    },
  );
  document.querySelector('#next-step-1').addEventListener('mouseup',
    () => {
      // Don't do anything if not initialised.
      if (maxDemo1Step == null) return;
      demo1CurrentStep++;
      if (demo1CurrentStep > maxDemo1Step) demo1CurrentStep = maxDemo1Step;
      refreshDemo1Items();
    },
  );
  document.querySelectorAll('.instant-purchase').forEach((el) => el.addEventListener(
    'mouseup',
    () => {
      // TODO: Is there a nicer way to indicate to the user that this was triggered?
      alert('Deducting $100 & shipping a low quality hammer to 123 Fleet Street...');
    },
  ));
  document.querySelectorAll('.logout').forEach((el) => el.addEventListener(
    'mouseup',
    () => {
      // TODO: Is there a nicer way to indicate to the user that this was triggered?
      alert('Logging out...');
    },
  ));

  // Let the view source button toggle the visibility of the page or the
  // fake source code of the page.
  document.querySelectorAll('.show-source').forEach((el) => {
    el.addEventListener('mouseup', () => {
      // 1 level up is class=url-bar, another up is class=browser.
      const children = el.parentElement.parentElement.children;
      for (const child of children) {
        if (child.classList.contains('browser-body') || child.classList.contains('browser-source')) {
          // If the browser-body/browser-source is hidden, make it hidden, and
          // vice versa.
          child.classList.toggle('hidden');
        }
      }
    });
  });
  // Add the ability to all the opacity sliders to adjust the opacity of
  // shonky elements.
  document.querySelectorAll('#interactive-demo-1 input[name=opacity-slider]').forEach((el) => {
    // Search through the parents' siblings until we find a .shonky-site
    let currParent = el.parentElement?.parentElement;
    // Limit to only traverse 100 parents.
    let limit = 100;
    // Find the site that's being affected by the opacity.
    let shonkyWrapper = null;
    while (limit-- > 0 && currParent != null) {
      for (const sibling of currParent.children) {
        if (sibling.classList.contains('browser')) {
          for (let child1 of sibling.children) {
            if (child1.classList.contains('browser-body')) {
              for (let child of child1.children) {
                if (child.classList.contains('shonky-site')) {
                  limit = 0;
                  shonkyWrapper = child;
                  break;
                }
              }
            }
          }
        }
        if (limit < 0) break;
      }
      currParent = currParent.parentElement;
    }
    if (shonkyWrapper == null) {
      console.log('couldnt find shonky');
    } else {
      shonkyWrapper.style.opacity = el.value / 100;
    }
    // Also find the label, so we can have a nice responsive label.
    const assocLabel = document.querySelector('label[for=opacity-slider-2] > span');
    if (assocLabel == null) {
      console.log('couldnt find assoclabel');
    } else {
      assocLabel.innerText = `${el.value}%`;
    }

    el.addEventListener('input', () => {
      if (shonkyWrapper != null) {
        shonkyWrapper.style.opacity = el.value / 100;
      }
      if (assocLabel != null) {
        assocLabel.innerText = `${el.value}%`;
      }
    });
  });
  const overlay1Tog = document.querySelector('input[name=overlay-1-vis]');
  overlay1Tog.addEventListener(
    'click',
    (e) => {
      if (overlay1Tog.checked) {
        document.querySelector('#blocker-1')?.classList.remove('hidden');
      } else {
        document.querySelector('#blocker-1')?.classList.add('hidden');
      }
    });
  const overlay2Tog = document.querySelector('input[name=overlay-2-vis]');
  overlay2Tog.addEventListener(
    'click',
    (e) => {
      if (overlay2Tog.checked) {
        document.querySelector('#blocker-2')?.classList.remove('hidden');
      } else {
        document.querySelector('#blocker-2')?.classList.add('hidden');
      }
    });
  const overlay3Tog = document.querySelector('input[name=overlay-3-vis]');
  overlay3Tog.addEventListener(
    'click',
    (e) => {
      if (overlay3Tog.checked) {
        document.querySelector('#blocker-3')?.classList.remove('hidden');
      } else {
        document.querySelector('#blocker-3')?.classList.add('hidden');
      }
    });
  const overlay4Tog = document.querySelector('input[name=overlay-4-vis]');
  overlay4Tog.addEventListener(
    'click',
    (e) => {
      if (overlay4Tog.checked) {
        document.querySelector('#blocker-4')?.classList.remove('hidden');
      } else {
        document.querySelector('#blocker-4')?.classList.add('hidden');
      }
    });

  // Gobble cloud stuff.
  document.querySelectorAll('.delete-icon').forEach((el) => {
    // Show the confirm/cancel delete modal.
    el.addEventListener('click', (evt) => {
      // The row to potentially delete.
      currGobbleRow = el.parentNode.parentNode;
      document.querySelector('.gobble-modal').classList.remove('hidden');
    });
  });
  // Confirm deletion
  document.querySelector('#gobble-modal-confirm').addEventListener(
    'click',
    (evt) => {
      if (currGobbleRow) {
        currGobbleRow.parentNode.removeChild(currGobbleRow);
        currGobbleRow = null;
      }
      document.querySelector('.gobble-modal').classList.add('hidden');
    },
  );
  // Cancel deletion
  document.querySelector('#gobble-modal-cancel').addEventListener(
    'click',
    (evt) => {
      currGobbleRow = null;
      document.querySelector('.gobble-modal').classList.add('hidden');
    },
  );
});
