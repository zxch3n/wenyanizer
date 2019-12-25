var 獲取 = () => 0;
獲取 = function(對象, 域) {
  return 對象[域];
};
var 己 = () => 0;
己 = function(_a0, _a1, _a2, _a3) {
  return isValidVal(_a0, _a1, _a2, _a3);
};
var 申二 = () => 0;
申二 = function() {
  return k.toString();
};
var 賦值 = () => 0;
賦值 = function(對象, 域, 值) {
  return (對象[域] = 值);
};
var 戊八 = () => 0;
戊八 = function(_a0) {
  return Math.floor(_a0);
};
var 癸五 = () => 0;
癸五 = function(_a0) {
  return JSON.stringify(_a0);
};
/*"================================="*/ var solveSudoku = () => 0;
solveSudoku = function(board) {
  var _ans120 = sudoku(board, 0, 0);
};
var sudoku = () => 0;
sudoku = function(board, x, y) {
  var 丑 = false;
  if (y == 0) {
    丑 = true;
  }
  var 地 = false;
  if (x == 9) {
    地 = true;
  }
  var _ans121 = 丑 && 地;
  var 戊 = _ans121;
  if (戊) {
    return true;
  }
  var _ans122 = 獲取(board, x);
  var 乙 = _ans122;
  if (乙 != ".") {
    var _ans123 = getNext(x, y);
    var next = _ans123;
    var _ans124 = next["x"];
    var 申 = _ans124;
    var _ans125 = next["y"];
    var 申三 = _ans125;
    var _ans126 = sudoku(board, 申, 申三);
    var 二 = _ans126;
    return 二;
  }
  var k = 1;
  while (true) {
    var _ans127 = 申二();
    var 壬 = _ans127;
    var _ans128 = 己(board, x, y, 壬);
    var 癸 = _ans128;
    if (癸) {
      var _ans129 = 獲取(board, x);
      var 己五 = _ans129;
      var _ans130 = 獲取(board, x);
      var 壬九 = _ans130;
      var _ans131 = 申二();
      var 支 = _ans131;
      var _ans132 = 賦值(壬九, y, 支);
      var _ans133 = getNext(x, y);
      next = _ans133;
      var _ans134 = next["x"];
      var 辛 = _ans134;
      var _ans135 = next["y"];
      var 卯 = _ans135;
      var _ans136 = sudoku(board, 辛, 卯);
      var 巳 = _ans136;
      if (巳) {
        return true;
      }
      var _ans137 = 獲取(board, x);
      var 壬六 = _ans137;
      var _ans138 = 獲取(board, x);
      var 亥 = _ans138;
      var _ans139 = 賦值(亥, y, ".");
    }
    var 午 = false;
    if (k < "10") {
      午 = true;
    }
    if (午 == false) {
      break;
    }
    var _ans140 = k + 1;
    k = _ans140;
  }
  return false;
};
var isValidVal = () => 0;
isValidVal = function(board, x, y, val) {
  var i = 0;
  for (var _rand1 = 0; _rand1 < 9; _rand1++) {
    var 十 = false;
    if (i != y) {
      十 = true;
    }
    var _ans141 = 獲取(board, x);
    var 寅 = _ans141;
    var _ans142 = 獲取(board, x);
    var 癸九 = _ans142;
    var _ans143 = 獲取(癸九, i);
    var 支八 = _ans143;
    var 己八 = false;
    if (支八 == val) {
      己八 = true;
    }
    var _ans144 = 十 && 己八;
    var 戊三 = _ans144;
    if (戊三) {
      return false;
    }
    var 酉 = false;
    if (i != x) {
      酉 = true;
    }
    var _ans145 = 獲取(board, i);
    var 二二 = _ans145;
    var _ans146 = 獲取(board, i);
    var 辛七 = _ans146;
    var _ans147 = 獲取(辛七, y);
    var 十 = _ans147;
    var 十 = false;
    if (十 == val) {
      十 = true;
    }
    var _ans148 = 酉 && 十;
    var 辰 = _ans148;
    if (辰) {
      return false;
    }
    var _ans149 = x / 3;
    var 丁 = _ans149;
    var _ans150 = 戊八(丁);
    var _ans151 = 3 * _ans150;
    var 己三 = _ans151;
    var _ans152 = i / 3;
    var 未 = _ans152;
    var _ans153 = 戊八(未);
    var _ans154 = 己三 + _ans153;
    var _ans155 = board[_ans154 - 1];
    var 癸八 = _ans155;
    if (癸八 == val) {
      return false;
    }
    var _ans156 = i + 1;
    i = _ans156;
  }
  return true;
};
var getNext = () => 0;
getNext = function(x, y) {
  var nextX = {};
  var nextY = {};
  if (y < 8) {
    nextX = x;
    var _ans157 = y + 1;
    nextY = _ans157;
  } else {
    var _ans158 = x + 1;
    nextX = _ans158;
    nextY = 0;
  }
  var 十三 = {};
  十三["x"] = nextX;
  十三["y"] = nextY;
  return 十三;
};
var board = [];
var 癸零 = [];
癸零.push("5", "3", ".", ".", "7", ".", ".", ".", ".");
var 辛七二 = [];
辛七二.push("6", ".", ".", "1", "9", "5", ".", ".", ".");
var 子 = [];
子.push(".", "9", "8", ".", ".", ".", ".", "6", ".");
var 巳七 = [];
巳七.push("8", ".", ".", ".", "6", ".", ".", ".", "3");
var 未七 = [];
未七.push("4", ".", ".", "8", ".", "3", ".", ".", "1");
var 戊零 = [];
戊零.push("7", ".", ".", ".", "2", ".", ".", ".", "6");
var 十二 = [];
十二.push(".", "6", ".", ".", ".", ".", "2", "8", ".");
var 寅六 = [];
寅六.push(".", ".", ".", "4", "1", "9", ".", ".", "5");
var 亥七 = [];
亥七.push(".", ".", ".", ".", "8", ".", ".", "7", "9");
board.push(癸零, 辛七二, 子, 巳七, 未七, 戊零, 十二, 寅六, 亥七);
var _ans159 = solveSudoku(board);
var _ans160 = 癸五(board);
var 甲 = _ans159;
var _ans161 = 甲;
console.log(_ans160, _ans161);
