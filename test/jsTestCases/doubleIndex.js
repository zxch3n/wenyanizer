var board = [[0, [0, [10]]], [1]];
if (board[Math.floor(board[0][0])][Math.max(-1, board[0][0])] === 1){
  console.log("S");
}

var a = 1;
var b = 0;
board[b][a][a][0] = 100;
// board[b][b][a][Math.floor(Math.max(10, a, b))] = 100;
console.log(JSON.stringify(board));