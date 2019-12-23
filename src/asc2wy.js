/**
 * The ASC here is a little bit diff from Wenyan ASC
 * 
 * 1. The ASC used here should support `op==`, `op>=`, ...
 * 2. {op: "op", ...} may include another field called `name`, indicating the the assignment target
 * 
 */
const parser = require("@babel/parser");
const { num2hanzi } = require("./hanzi2num");
//「」

const COMPARATORS = {
  "==": "等於",
  "===": "等於",
  "!=": "不等於",
  "!==": "不等於",
  "<=": "不大於",
  ">=": "不小於",
  ">": "大於",
  "<": "小於"
};

const OPERATORS = {
  "*": "乘",
  "/": "除",
  "+": "加",
  "-": "減",
  "||": "中有陽乎",
  "&&": "中無陰乎",
  not: "變",
  mod: "所餘幾何"
};

const TYPES = {
  obj: "物",
  num: "數",
  arr: "列",
  str: "言",
  fun: "術",
  bol: "爻"
};

var tmpVarCnt = 0;
var randVarCnt = 0;
function randVar() {
  randVarCnt++;
  return "_rand" + randVarCnt;
}
function currTmpVar() {
  return "_ans" + tmpVarCnt;
}
function nextTmpVar() {
  tmpVarCnt++;
  return "_ans" + tmpVarCnt;
}

function prevTmpVar(n) {
  return "_ans" + (tmpVarCnt - n + 1);
}

function assert(cond, error) {
  if (!cond) {
    console.log(error);
  }
}

function getType(type) {
  const ans = TYPES[type];
  if (ans == null) {
    throw new Error(`Type ${type} not found`);
  }

  return ans;
}

function wrapVar(v) {
  return `「${v}」`;
}

function getValue(prop) {
  if (prop == null) {
    return "undefined";
  }
  if (prop[0] === "iden") {
    return `「${prop[1]}」`;
  } else if (prop[0] === "num") {
    return num2hanzi(prop[1]);
  } else if (prop[0] === "ans") {
    return "其";
  } else if (prop[0] === "lit") {
    return `「「${prop[1].slice(1, -1)}」」`;
  } else if (prop[0] === "bool") {
    if (prop[1]) {
      return "陽";
    }

    return "陰";
  } else if (prop[0] === "data") {
    if (prop[1][prop[1].length - 1] === "\n") {
      return ` ${prop[1].slice(0, -1)}`;
    }

    return ` ${prop[1]}`;
  } else if (prop[0].startsWith("op")) {
    console.log("Weird value", prop);
    return ``;
  } else if (prop[0] === "cmp") {
    return getCmp(prop);
  } else if (prop[0] === "ctnr") {
    if (prop[1] === "len") {
      return "長";
    } else if (prop[1] === "rest") {
      return "其餘";
    }
  } else if (prop[0] === "lop") {
    return (
      OPERATORS[prop[1]] ||
      (() => {
        throw new Error();
      })()
    );
  }

  console.log(prop);
  throw new Error(`Prop type ${prop[0]} not found`);
}

function getCmp(prop) {
  if (prop[0] !== "cmp") {
    throw new Error();
  }

  return COMPARATORS[prop[1]];
}

function asc2wy(asc) {
  if (!(asc instanceof Array)) {
    asc = JSON.parse(asc);
  }

  let ans = "";
  let i = 0;
  let indent = 0;
  const funcNames = [];

  function addIndent() {
    for (let j = 0; j < indent; j++) {
      ans += "    ";
    }
  }

  function assert(cond, error = "") {
    if (!cond) {
      console.log(asc[i]);
      console.log("ERROR", error);
    }
  }

  function addVar(node) {
    addIndent();
    const n = Math.max(node.count, 1);
    const type = TYPES[node.type];
    if (type == null) {
      throw new Error(`Type ${node.type} not found`);
    }

    ans += `吾有${num2hanzi(n)}${type}。`;
    for (let i = 0; i < n; i++) {
      if (node.values[i]) {
        ans += `曰${getValue(node.values[i])}。`;
      } else if (node.type === "num" && n > 1) {
        ans += "曰零。";
      }
    }
    for (let i = 0; i < node.names.length; i++) {
      if (i === 0) {
        ans += `名之`;
      }

      if (node.names[i] == null) {
        node.names[i] = nextTmpVar();
      }

      ans += `曰「${node.names[i]}」`;
    }

    if (node.type === "fun") {
      funcNames.push(node.names[0]);
    }

    ans += "\n";
  }

  function addFunc(node) {
    assert(node.arity != null);
    addIndent();
    ans += `欲行是術。必先得`;
    addIndent();
    for (let j = 0; j < node.arity; j++) {
      ans += `一${getType(node.args[j].type)}。`;
      ans += `曰「${node.args[j].name}」。`;
    }
    ans += "\n";
  }

  function addOp(node) {
    addIndent();
    switch (node.op) {
      case "op+":
      case "op-":
      case "op/":
      case "op*":
        ans += `${OPERATORS[node.op[2]]}${getValue(node.lhs)}以${getValue(
          node.rhs
        )}。`;
        break;
      case "op%":
        ans += `除${getValue(node.lhs)}以${getValue(node.rhs)}。所餘幾何。`;
        break;
      case "op||":
        ans += `夫${getValue(node.lhs)}${getValue(node.rhs)}中有陽乎。`;
        break;
      case "op&&":
        ans += `夫${getValue(node.lhs)}${getValue(node.rhs)}中無陰乎。`;
        break;
      case "op==":
      case "op===":
      case "op!=":
      case "op!==":
      case "op>":
      case "op<":
      case "op>=":
      case "op<=":
        // TODO: make this shorter when new Wenyan syntax is available
        if (node.name == null) {
          throw new Error();
        }

        ans += `吾有一爻。名之曰${wrapVar(node.name)}。若${getValue(node.lhs)}${COMPARATORS[node.op.slice(2)]}${getValue(node.rhs)}者。昔之${wrapVar(node.name)}者。今陽是矣云云。`
        break;
      default:
        console.log(node);
        throw new Error();
    }
    ans += "\n";
  }

  function addWhile(node) {
    assert(node.value.length >= 2);
    addIndent();
    ans += `為是${getValue(node.value)}遍。\n`;
  }

  function addName(node) {
    addIndent();
    assert(node.names.length >= 1);
    ans += "名之";
    for (let j = 0; j < node.names.length; j++) {
      ans += `曰「${node.names[j]}」。`;
    }
    ans += "\n";
  }

  function addIf(node) {
    assert(node.test.length === 1 || node.test.length >= 3);
    addIndent();
    ans += "若";
    if (node.test && node.test.length >= 3) {
      for (let j = 0; j < node.test.length; j++) {
        if (node.test[j][0] === "ctnr") {
          if (node.test[j][1] === "len") {
            ans += "之長";
          } else if (node.test[j][1] === "subs") {
            ans += `之${getValue(node.test[++j])}`;
          }
        } else {
          ans += getValue(node.test[j]);
        }
      }
    } else if (node.test && node.test.length === 1) {
      ans += `${getValue(node.test[0])}`;
    } else {
      console.log(node);
      throw new Error();
    }

    ans += "者。\n";
    indent++;
  }

  for (i = 0; i < asc.length; i++) {
    const node = asc[i];
    if (node.op.startsWith("op")) {
      addOp(node);
      continue;
    }

    switch (node.op) {
      case "var":
        addVar(node);
        break;
      case "fun":
        addFunc(node);
        break;
      case "funbody":
        addIndent();
        ans += "乃行是術曰。\n";
        indent++;
        break;
      case "whilen":
        addWhile(node);
        indent++;
        break;
      case "whiletrue":
        addIndent();
        ans += "恆為是。\n";
        indent++;
        break;
      case "print":
        addIndent();
        ans += "書之。\n";
        break;
      case "end":
        indent--;
        addIndent();
        ans += "云云。\n";
        break;
      case "name":
        addName(node);
        break;
      case "if":
        addIf(node);
        break;
      case "else":
        indent--;
        addIndent();
        indent++;
        ans += "若非。\n";
        break;
      case "return":
        addIndent();
        ans += `乃得 ${getValue(node.value)}\n`;
        break;
      case "funend":
        indent--;
        addIndent();
        ans += `是謂「${funcNames.pop()}」之術也。\n\n`;
        break;
      case "push":
        addIndent();
        ans += `充「${node.container}」以${getValue(node.values[0])}。`;
        for (let i = 1; i < node.values.length; i++) {
          ans += `以${getValue(node.values[i])}。`;
        }

        ans += "\n";
        break;
      case "break":
        addIndent();
        ans += "乃止。\n";
        break;
      case "reassign":
        addIndent();
        assert(node.lhs[0] === "iden");
        if (node.lhssubs) {
          ans += `昔之「${node.lhs[1]}」之${getValue(node.lhssubs)}者。`;
        } else {
          ans += `昔之「${node.lhs[1]}」者。`;
        }
        ans += `今${getValue(node.rhs)}是矣。\n`;
        break;
      case "call":
        addIndent();
        ans += `施「${node.fun}」`;
        for (let j = 0; j < node.args.length; j++) {
          ans += `於${getValue(node.args[j])}。`;
        }
        ans += "\n";
        break;
      case "comment":
        addIndent();
        ans += `批曰。${getValue(node.value)}\n`;
        break;
      case "subscript":
        addIndent();
        ans += `夫「${node.container}」之${getValue(node.value)}。\n`;
        break;
      case "not":
        addIndent();
        ans += `變${getValue(node.value)}\n`;
        break;
      case "cat":
        addIndent();
        ans += `銜${wrapVar(node.containers[0])}`;
        for (let i = 1; i < node.containers.length; i++) {
          ans += `以${wrapVar(node.containers[i])}`;
        }
        ans += "。\n";
        break;
      case "for":
        addIndent();
        ans += `凡${wrapVar(node.container)}中之${wrapVar(node.iterator)}\n`;
        indent++;
        break;
      case "discard":
        ans += "噫。";
        break;
      case "length":
        addIndent();
        ans += `夫${wrapVar(node.container)}之長。`;
        break;
      default:
        console.log(node);
        throw new Error("NotImp");
    }
  }

  return ans;
}

module.exports.asc2wy = asc2wy;
