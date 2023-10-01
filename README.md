# Social Minefield

A high-stakes game of minesweeper.

## Running

```

# In one terminal window run:
source venv/bin/activate
cd malicioussite
python3 app.py

# In another:
source venv/bin/activate
cd friendlysite
python3 app.py

```

## TODO
- [ ] Are we allowed to load multiple like buttons at once? Or should we make it a modified game of minesweeper where it's only one flag out of the 10 that's a super mine.
  - I reckon Facebook might implement a timing heuristic that detects this. If instead we stream the HTML to the client, using magic HTTP streaming shit, we can ruin that. Obviously is a cat and mouse game.
