const width = 10;
const height = 10;
// Null if no game started.
let currGameField = null;
let isGameOver = false;

const isElementInBounds = (clickEvent, element) => {
  // XXX: Are we gonna support right click?
  const isLeftClick = clickEvent.button === 0;
  const isRightClick = clickEvent.button === 2;
  // console.log(clickEvent);
  const [x, y] = [clickEvent.x, clickEvent.y]; 
  const bounds = element.getBoundingClientRect();
  return x >= bounds.left && x <= bounds.right &&
         y >= bounds.top && y <= bounds.bottom;
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
  console.log('checking winning condition...');
  if (currGameField == null) {
    console.log('false');
    return false;
  }
  const cells = document.querySelectorAll('.square');
  // If every non-mine piece has been clicked, it's a win.
  for (let idx = 0; idx < cells.length; ++idx) {
    const coords = idxToCoords(idx);
    if (!cells[idx].classList.contains('clicked') && currGameField[coords.y][coords.x] !== -1) {
      // If we encounter a non-mine cell that hasn't been clicked, false.
      console.log('false, exists non-mine not clicked');
      return false;
    }
  }
  // Got the whole way there?
  // TODO: Change the game state and website to indicate success. Maybe remove
  //       the iframes, and display where the bombs were. Add some popup too.
  console.log('game won');
  alert('game won');
  return true;
};

const activateSquare = ({ x, y }) => {
  // Click on the square provided, as per minesweeper rules.
  if (currGameField == null) return;
  // If it's already been clicked, don't do anything. 
  const cells = document.querySelectorAll('.square');
  const el = cells[(y * height) + x];
  if (el.classList.contains('clicked')) return;

  const cell = currGameField[y][x];
  switch (cell) {
    case 0:
      // Flood fill.
      let worklist = [{ x, y }];
      while (worklist.length) {
        // Pop from front.
        const workCoords = worklist.shift();
        const workEl = cells[coordToIdx(workCoords)];
        if (workEl.classList.contains('clicked')) continue;
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
      // TODO: End game?
      //  - Change any UI elements (highlighting mines, etc)
      //  - Show loser screen, display which iframe you clicked on.
      el.classList.add(cellToClassName(cell));
      el.classList.add('clicked');
      alert('Game over?');
      break;
  }
};

const displayAllCells = () => {
  console.log('[displayAllCells] ??');
  if (currGameField == null) return;
  console.log('[displayAllCells] !!');
  document.querySelectorAll('.square').forEach((el, idx) => {
    const coords = idxToCoords(idx);
    const cell = currGameField[coords.y][coords.x];
    el.classList.add(cellToClassName(cell));
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
const gameOver = (idx, iframeSrc) => {
  const { x, y } = idxToCoords(idx);
  console.log('gameover');
  alert(`Clicked iframe: ${iframeSrc}, x=${x}, y=${y}`);
  // Toggle the mine cell.
  const element = document.querySelectorAll('.square')[idx];
  element.classList.add('explodedmine');
  element.classList.add('clicked');
  displayAllCells();
  removeAllMineIframes();
  isGameOver = true;
};

// Monitor when iframes are (probably) clicked, so as to display a relevant
// game-over message. As we're clickjacking them, we cannot capture the inputs,
// so we need to detect it by other methods.
const startMonitoringIFrames = () => {
  let activeFrame = null;
  // Cursed code adapted from: https://stackoverflow.com/a/32138108
  const monitor = setInterval(function(){
    if (currGameField == null) return;
    var elem = document.activeElement;
    if(elem?.tagName === 'IFRAME' && elem.parentElement.id != null){
      // We store the ID on the table cell, not the iframe.
      const elemId = elem.parentElement.id;
      // Only activate if it's the first click.
      if (activeFrame != elemId) {
        const idx = elemId.split('-')[1];
        gameOver(idx, elem.src);
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

  console.log('mine positions', minePositions);

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
    relevantCell.innerHTML = `<iframe scrolling="no" referrerpolicy="no-referrer" src="${minelinks[idx]}"></iframe>`;
  });


  // TODO: Debug to make sure the game is generating right.
  // document.querySelectorAll('.square').forEach((el, idx) => {
  //   const coords = idxToCoords(idx);
  //   const cell = game[coords.y][coords.x];
  //   el.classList.add(cellToClassName(cell));
  // });
  
  return game;
};

window.addEventListener("mouseup", function(event) {
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
  } else if (!isGameOver) {
    // Handle when the cells are clicked.
    document.querySelectorAll('.square').forEach((el, idx) => {
      // TODO: This will never happen for mines, as the iframe swallows the event.
      if (isElementInBounds(event, el)) {
        activateSquare(idxToCoords(idx));
        // alert(`Clicked square ${idx}`);
      }
    });
  }
});

window.addEventListener("DOMContentLoaded", () => {
  console.log('loaded');
  // Set up the game table. This is to allow the first click to work.
});

