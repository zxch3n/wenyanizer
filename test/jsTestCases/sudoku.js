var solveSudoku = function(board) {
  sudoku(board, 0, 0);
};

function sudoku(board, x, y) {
  if (y === 0 && x === 9) return true;
  if (board[x][y] !== ".") {
    let next = getNext(x, y);
    return sudoku(board, next.x, next.y);
  }

  for (let k = 1; k < 10; k++) {
    if (isValidVal(board, x, y, k.toString())) {
      board[x][y] = k.toString();

      let next = getNext(x, y);

      if (sudoku(board, next.x, next.y)) {
        return true;
      }

      board[x][y] = ".";
    }
  }

  return false;
}

function isValidVal(board, x, y, val) {
  for (let i = 0; i < 9; i++) {
    if (i !== y && board[x][i] === val) return false;
    if (i !== x && board[i][y] === val) return false;
    if (
      board[3 * Math.floor(x / 3) + Math.floor(i / 3)][
        3 * Math.floor(y / 3) + (i % 3)
      ] === val
    )
      return false;
  }
  return true;
}

function getNext(x, y) {
  let nextX, nextY;
  if (y < 8) {
    nextX = x;
    nextY = y + 1;
  } else {
    nextX = x + 1;
    nextY = 0;
  }

  return {
    x: nextX,
    y: nextY
  };
}

const board = [
  ["5", "3", ".", ".", "7", ".", ".", ".", "."],
  ["6", ".", ".", "1", "9", "5", ".", ".", "."],
  [".", "9", "8", ".", ".", ".", ".", "6", "."],
  ["8", ".", ".", ".", "6", ".", ".", ".", "3"],
  ["4", ".", ".", "8", ".", "3", ".", ".", "1"],
  ["7", ".", ".", ".", "2", ".", ".", ".", "6"],
  [".", "6", ".", ".", ".", ".", "2", "8", "."],
  [".", ".", ".", "4", "1", "9", ".", ".", "5"],
  [".", ".", ".", ".", "8", ".", ".", "7", "9"]
];
solveSudoku(board);
console.log(JSON.stringify(board));
