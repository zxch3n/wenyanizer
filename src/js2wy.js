const { parse } = require("@babel/parser");
const { asc2wy } = require("./asc2wy");
const { getRandomChineseName, LAMBDA } = require("./utils");
// const GLOBAL_OBJECTS = [
//   "String",
//   "document",
//   "global",
//   "window",
//   "Math",
//   "Object",
//   "Array",
//   "Number",
// ];

// TODO: refactor!!

function js2wy(jsStr) {
  const asc = js2asc(jsStr);
  return asc2wy(asc);
}

function js2asc(jsStr) {
  const jsAst = parse(jsStr);
  const asc = ast2asc(jsAst, jsStr);
  ascPostProcess(asc);
  return asc;
}

function ascPostProcess(asc) {
  function getIdenOnlyUsedOnce() {
    const count = {};
    function add(name) {
      if (count[name] == null) {
        count[name] = 1;
      } else {
        count[name]++;
      }
    }

    for (const node of asc) {
      for (const key in node) {
        if (node[key] && node[key][0] === "iden") {
          add(node[key][1]);
        }
      }
    }

    const ans = new Set();
    for (const key in count) {
      if (count[key] === 1) {
        ans.add(key);
      }
    }

    return ans;
  }

  function findIgnorableIden(op) {
    for (const key in op) {
      if (
        op[key] &&
        op[key][0] === "iden" &&
        namesOnlyUsedOnce.has(op[key][1])
      ) {
        return op[key][1];
      }
    }

    return undefined;
  }

  function replaceIgnorableIden(op, name, newData) {
    for (const key in op) {
      if (op[key][0] === "iden" && op[key][1] === name) {
        op[key] = newData;
        return op;
      }
    }

    throw new Error();
  }

  const namesOnlyUsedOnce = getIdenOnlyUsedOnce();
  for (let i = 1; i < asc.length; i++) {
    const ignorable = findIgnorableIden(asc[i]);
    if (ignorable == null) {
      continue;
    }

    if (
      asc[i - 1].op === "var" &&
      asc[i - 1].values.length === 1 &&
      asc[i - 1].names.length === 1 &&
      asc[i - 1].names[0] === ignorable
    ) {
      replaceIgnorableIden(asc[i], ignorable, asc[i - 1].values[0]);
      asc.splice(i - 1, 1);
      i--;
    }
  }
}

const LITERAL_TYPES = {
  string: "lit",
  number: "num",
  function: "fun",
  boolean: "bool",
  StringLiteral: "lit",
  NumericLiteral: "num",
  Identifier: "iden",
  BooleanLiteral: "bool"
};

const DECLARATION_TYPES = Object.assign(
  {
    VariableDeclarator: "var"
  },
  LITERAL_TYPES
);

var tmpVars = [];
var allVars = [];
var varSet = new Set();
function getNextTmpName() {
  const name = getRandomChineseName(varSet);
  tmpVars.push(name);
  return name;
}

function mapType(type, value) {
  if (DECLARATION_TYPES[type]) {
    return DECLARATION_TYPES[type];
  }

  if (type === "ArrowFunctionExpression" || type === "FunctionExpression") {
    return "fun";
  }

  if (type === "ArrayExpression") {
    return "arr";
  }

  if (type === "ObjectExpression") {
    return "obj";
  }

  if (value instanceof Array) {
    return "arr";
  }

  if (value instanceof Object) {
    return "obj";
  }

  throw new Error(`Unknown type ${typeof value} of ${value}`);
}

const LITERALS = {
  NumericLiteral: "num",
  Identifier: "iden",
  BooleanLiteral: "bol",
  StringLiteral: "str"
};

const COMPARE_OPERATORS = ["!=", "==", ">=", "<=", "<", ">", "===", "!=="];
const OPERATORS = [
  "!=",
  "==",
  ">=",
  "<=",
  "<",
  ">",
  "+",
  "-",
  "*",
  "/",
  "%",
  "&&",
  "||"
];

function isSimpleForm(_node) {
  return OPERATORS.includes(_node.operator);
}

function getNamesOnlyUsedOnce(body) {
  const counter = {};
  function count(v) {
    if (v in counter) {
      counter[v] += 1;
    } else {
      counter[v] = 1;
    }
  }

  function _get(node, insideTest = false) {
    if (!node || typeof node !== "object") {
      return;
    }

    if (node.type === "Identifier") {
      count(node.name);
      if (insideTest) {
        count(node.name);
        count(node.name);
      }
      return;
    }

    if (node instanceof Array) {
      for (const subNode of node) {
        _get(subNode, insideTest);
      }

      return;
    }

    for (const key in node) {
      const v =
        insideTest || key === "test" || key === "arguments" || key === "update";
      // (key === "right" && node.type === "ForOfStatement");
      _get(node[key], v);
    }
  }

  _get(body);
  const ans = new Set();
  for (const key in counter) {
    if (counter[key] === 2) {
      ans.add(key);
    }
  }

  return ans;
}

function isReassigned(name, node) {
  if (!node || typeof node !== "object") {
    return false;
  }

  if (
    node.left &&
    node.left.name === name &&
    node.type === "AssignmentExpression"
  ) {
    return true;
  }

  if (node.type === "UpdateExpression" && node.argument.name === name) {
    return true;
  }

  if (node instanceof Array) {
    for (const sub of node) {
      if (isReassigned(name, sub)) {
        return true;
      }
    }

    return false;
  }

  for (const key in node) {
    if (isReassigned(name, node[key])) {
      return true;
    }
  }

  return false;
}

function isIteratingFromZeroToN(_node) {
  if (!_node.init || _node.init.declarations.length !== 1) {
    return false;
  }

  try {
    if (_node.init.declarations[0].init.value !== 0) {
      return false;
    }

    if (_node.test.left.name !== _node.init.declarations[0].id.name) {
      return false;
    }

    if (_node.test.operator !== "<") {
      return false;
    }

    if (!(_node.test.right.type in LITERALS)) {
      return false;
    }

    if (_node.update.operator !== "++") {
      return false;
    }
  } catch (e) {
    return false;
  }

  return true;
}

/**
 * Convert JS AST to Wenyan Lang ASC
 *
 * @param {Ast} ast
 * @param {string} js
 */
function ast2asc(ast, js) {
  tmpVars = [];
  allVars = [];
  varSet = new Map();
  const signatureCache = {};
  const namesOnlyUsedOnce = getNamesOnlyUsedOnce(ast.program.body);
  const nodes = ast.program.body;
  const ans = [];
  for (var node of nodes) {
    process(node);
  }

  return ans;

  function process(_node) {
    switch (_node.type) {
      case "VariableDeclaration":
        handleDeclaration(_node);
        break;
      case "ExpressionStatement":
        handleExpressionStatement(_node.expression);
        break;
      case "UpdateExpression":
      case "CallExpression":
        handleExpressionStatement(_node);
        break;
      case "WhileStatement":
        if (_node.test.type === "BooleanLiteral") {
          if (_node.test.value === true) {
            ans.push({
              op: "whiletrue"
            });
          }
        } else {
          notImpErr(_node);
        }

        for (const subNode of _node.body.body) {
          process(subNode);
        }

        ans.push({
          op: "end"
        });
        break;
      case "IfStatement":
        addIfTestExpression(_node);

        for (const subNode of _node.consequent.body) {
          process(subNode);
        }

        if (_node.alternate) {
          ans.push({
            op: "else"
          });
          for (const subNode of _node.alternate.body) {
            process(subNode);
          }
        }

        ans.push({
          op: "end"
        });
        break;
      case "BreakStatement":
        ans.push({
          op: "break"
        });
        break;
      case "LogicalExpression":
      case "BinaryExpression":
        if (isSimpleForm(_node)) {
          // TODO: remove name hotfix maybe
          ans.push({
            lhs: getTripleProp(_node.left, false),
            rhs: getTripleProp(_node.right, true),
            op: "op" + _node.operator,
            name: _node._name
          });
        } else {
          notImpErr(_node);
        }
        break;
      case "ObjectExpression":
        assert(_node._name != null);
        addVarOp([_node._name], [], "obj");
        initObjectProperties(_node._name, _node.properties);
        break;
      case "ReturnStatement": {
        const v = {
          op: "return",
          value: getTripleProp(_node.argument, false),
          pos: _node.start
        };
        if (v.value == null) {
          delete v.value;
        }
        ans.push(v);
        break;
      }
      case "ForStatement":
        // TODO: Currently it only supports `for (let i = 0; i < n; i++)`,
        // or `for (const a of b)`
        handleForStatement(_node);
        break;
      case "ForOfStatement":
        assert(_node.right.type === "Identifier");
        ans.push({
          op: "for",
          container: _node.right.name,
          iterator: getTripleProp(_node.left, false)[1]
        });

        for (const subNode of _node.body.body) {
          process(subNode);
        }

        ans.push({
          op: "end"
        });
        break;
      case "MemberExpression":
        handleMemberExpression(_node);
        break;
      case "ArrayExpression":
        handleArrayExpression(_node);
        break;
      case "UnaryExpression":
        ans.push({
          op: "not",
          value: getTripleProp(_node.argument, true),
          pos: _node.start
        });
        break;
      case "FunctionDeclaration":
        addVarOp([_node.id.name], [], "fun");
        addFunction(_node);
        break;
      case "EmptyStatement":
        break;
      default:
        notImpErr(_node);
    }
  }

  function handleArrayExpression(_node) {
    const name = _node._name || getNextTmpName();
    addVarOp([name], [], "arr");
    ans.push({
      op: "push",
      container: name,
      values: _node.elements.map((x) => getTripleProp(x, false))
    });
    if (_node._name == null) {
      // Stage this variable
      addVarOp([], [["iden", name]], "arr");
    }
  }

  function registerNewName(name, type) {
    if (!varSet.has(name)) {
      allVars.push(name);
    }

    varSet.set(name, type);
  }

  function addNamingOp(names) {
    ans.push({
      op: "name",
      names: names
    });

    for (const name of names) {
      registerNewName(name, "obj");
    }
  }

  function addVarOp(names, values, type) {
    const count = Math.max(names.length, values.length);
    ans.push({
      op: "var",
      count,
      names,
      values,
      type
    });

    for (const name of names) {
      registerNewName(name, type);
    }
  }

  function saveStagedToNewVar() {
    const newName = getNextTmpName();
    addNamingOp([newName]);
    return newName;
  }

  function getIfProp(_node) {
    if (_node.type === "MemberExpression") {
      if (
        _node.object.type === "Identifier" &&
        _node.property.type === "Identifier" &&
        _node.property.name === "length"
      ) {
        return [
          ["iden", _node.object.name],
          ["ctnr", "len"]
        ];
      } else if (
        _node.object.type === "Identifier" &&
        _node.property.type === "BinaryExpression" &&
        _node.property.operator === "-" &&
        _node.property.right.type === "NumericLiteral" &&
        _node.property.right.value === 1
      ) {
        return [
          ["iden", _node.object.name],
          ["ctnr", "subs"],
          getTripleProp(_node.property.left, false)
        ];
      } else {
        console.log(_node);
        throw new Error();
      }
    } else if (_node.type in LITERAL_TYPES) {
      return [getTripleProp(_node, false)];
    } else if (
      _node.type === "BinaryExpression" ||
      _node.type === "LogicalExpression"
    ) {
      return [getTripleProp(_node, false)];
    } else {
      throw new Error();
    }
  }

  function tryToCompress(name) {
    if (!namesOnlyUsedOnce.has(name)) {
      return false;
    }

    const last = ans[ans.length - 1];
    if (last.op === "var" && last.names[last.names.length - 1] === name) {
      last.names.splice(last.names.length - 1, 1);
      return true;
    }

    if (
      last.op === "reassign" &&
      last.lhs[1] === name &&
      last.lhssubs == null
    ) {
      ans.splice(ans.length - 1, 1);
      return true;
    }

    if (
      last.op === "name" &&
      last.names.length === 1 &&
      last.names[0] === name
    ) {
      ans.splice(ans.length - 1, 1);
      return true;
    }

    return false;
  }

  /**
   * This function is used to wrap the global object
   * which has not been supported by wenyan.
   *
   * 1. It will create necessary function
   * 2. Invoke the function
   * 3. Return the output of it
   *
   * @param {*} _node
   */
  function callJsGlobalFunction(_node) {
    assert(_node.type === "CallExpression");
    let signature = "";
    const args = [];
    function _getSignature(target) {
      if (target.type === "Identifier") {
        signature += target.name;
      } else if (target.type === "MemberExpression") {
        _getSignature(target.object);
        signature += ".";
        _getSignature(target.property);
      } else if (target.type === "CallExpression") {
        _getSignature(target.callee);
        assert(target.arguments.length <= LAMBDA.length);
        signature += "(";
        for (let i = 0; i < target.arguments.length; i++) {
          // Chinese char may introduce error
          // const name = "子" + LAMBDA[i];
          const name = "_a" + i;
          signature += `${name},`;
          args.push(name);
        }
        signature += ")";
      } else {
        notImpErr();
      }
    }

    _getSignature(_node);
    let funcName;
    if (signature in signatureCache) {
      funcName = signatureCache[signature];
    } else {
      funcName = getNextTmpName();
      signatureCache[signature] = funcName;
      // TODO: refactor, extract all func together
      addVarOp([funcName], [], "fun");
      ans.push({
        op: "fun",
        arity: _node.arguments.length,
        args: _node.arguments.map((x, index) => {
          return { type: "obj", name: args[index] };
        }),
        pos: _node.start
      });

      ans.push({
        op: "funbody"
      });
      ans.push({
        op: "return",
        value: ["data", signature]
      });
      ans.push({
        op: "funend"
      });
    }

    ans.push({
      op: "call",
      fun: funcName,
      args: _node.arguments.map((x) => getTripleProp(x, false)),
      pos: _node.start
    });
  }

  /**
   * Get the triple tuple representation (used in Wenyan ASC) of a node
   *
   * @param {Node} _node
   * @param {boolean} canUseStaged
   */
  function getTripleProp(_node, canUseStaged = false) {
    if (_node == null) {
      return undefined;
    }

    function wrap() {
      if (canUseStaged) {
        return ["ans", null];
      }

      const name = getNextTmpName();
      addNamingOp([name]);
      return ["iden", name, _node.start];
    }

    if (_node.type === "CallExpression") {
      handleUniversalCallExp(_node);
      return wrap();
    }

    if (_node.type === "MemberExpression" || _node.type === "CallExpression") {
      process(_node);
      return wrap();
    }

    if (_node.type === "ArrayExpression") {
      _node._name = getNextTmpName();
      process(_node);
      return ["iden", _node._name, _node.start];
    }

    if (_node.type === "VariableDeclaration") {
      const names = handleDeclaration(_node);
      assert(names.length === 1);
      return ["iden", names[0], _node.start];
    }

    if (
      _node.type === "BinaryExpression" ||
      _node.type === "LogicalExpression" ||
      _node.type === "ObjectExpression"
    ) {
      // TODO: remove this hotfix in the future version
      if (
        _node.type === "ObjectExpression" ||
        COMPARE_OPERATORS.includes(_node.operator)
      ) {
        _node._name = getNextTmpName();
        process(_node);
        return ["iden", _node._name, _node.start];
      }
      process(_node);
      return wrap();
    }

    if (_node.type === "UnaryExpression") {
      if (_node.operator === "-") {
        if (_node.argument.type === "NumericLiteral") {
          return ["num", -_node.argument.value];
        }

        ans.push({
          op: "op-",
          lhs: ["num", 0],
          rhs: getTripleProp(_node.argument, true)
        });

        return wrap();
      } else if (_node.operator === "!") {
        ans.push({
          op: "not",
          value: getTripleProp(_node.argument, true),
          pos: _node.start
        });
        return wrap();
      } else {
        notImpErr(_node);
      }
    }

    if (!(_node.type in LITERAL_TYPES)) {
      notImpErr(_node);
    }

    if (_node.type === "Identifier") {
      if (canUseStaged && tryToCompress(_node.name)) {
        return ["ans", null];
      }

      return ["iden", _node.name, _node.start];
    }

    if (_node.type === "StringLiteral") {
      if (_node.value) {
        return ["lit", `"${_node.value}"`, _node.start];
      }

      return ["lit", null, _node.start];
    }

    return [LITERAL_TYPES[_node.type], _node.value, _node.start];
  }

  function handleUniversalCallExp(_node) {
    if (varSet.has(_node.callee.name)) {
      ans.push({
        op: "call",
        fun: _node.callee.name,
        args: _node.arguments.map((x) => getTripleProp(x, false)),
        pos: _node.start
      });
    } else {
      callJsGlobalFunction(_node);
    }
  }

  function assert(cond, msg) {
    if (!cond) {
      throw new Error(msg + JSON.stringify(node.loc.start));
    }
  }

  function notImpErr(_node = node, msg = "") {
    const errorSnippet = js.slice(_node.start, _node.end);
    console.log(errorSnippet);
    throw new Error(`NotImplementedError: line ${_node.loc.start.line}, col ${_node.loc.start.column};
    \t"${errorSnippet}"
    \t${msg}
    The grammar is not supported yet.
    `);
  }

  function addFunction(funcNode) {
    ans.push({
      op: "fun",
      arity: funcNode.params.length,
      args: funcNode.params.map((x) => {
        const props = getTripleProp(x);
        return {
          name: props[1],
          type: "obj"
        };
      }),
      pos: funcNode.start
    });
    if (funcNode.id) {
      // Skip Anonymous Function
      registerNewName(funcNode.id.name, "fun");
    }
    ans.push({
      op: "funbody",
      pos: funcNode.start
    });
    for (const sub of funcNode.body.body) {
      process(sub);
    }
    ans.push({
      op: "funend",
      pos: funcNode.end
    });
  }

  function createTempVarToWrap(values, type = undefined, names = []) {
    const tripleRep = values.map((x) => getTripleProp(x, false));
    ({ type } = preprocessTypeValueBeforeDeclare(
      type || tripleRep[0][0],
      values[0]
    ));
    if (type === "iden") {
      type = varSet.get(values[0]);
      assert(type != null);
    }

    addVarOp(names, tripleRep, type);
  }

  function addIfTestExpression(_node) {
    if (_node.test.type === "BinaryExpression") {
      if (COMPARE_OPERATORS.includes(_node.test.operator)) {
        ans.push({
          op: "if",
          test: [
            ...getIfProp(_node.test.left),
            ["cmp", _node.test.operator],
            ...getIfProp(_node.test.right)
          ]
        });
      } else if (_node.test in LITERAL_TYPES) {
        ans.push({
          op: "if",
          test: [getTripleProp(_node.test, false)]
        });
      } else {
        notImpErr(_node);
      }
    } else if (_node.test.type in LITERAL_TYPES) {
      ans.push({
        op: "if",
        test: [getTripleProp(_node.test, false)],
        pos: _node.start
      });
    } else if (
      _node.test.type === "LogicalExpression" ||
      _node.test.type === "BinaryExpression" ||
      _node.test.type === "UnaryExpression"
    ) {
      ans.push({
        op: "if",
        test: [getTripleProp(_node.test, false)],
        pos: _node.start
      });
    } else {
      notImpErr(_node);
    }
  }

  function handleExpressionStatement(_node) {
    switch (_node.type) {
      case "CallExpression":
        handleCallExpression(_node);
        break;
      case "ExpressionStatement":
        process(_node.expression);
        break;
      case "AssignmentExpression":
        handleAssignmentExpression(_node);
        break;
      case "UpdateExpression":
        handleUpdateExpression(_node);
        break;
      default:
        notImpErr(_node, `Unknown expression ${_node.expression.type}`);
    }
  }

  function handleUpdateExpression(_node) {
    if (_node.operator === "++") {
      ans.push({
        op: "op+",
        lhs: ["iden", _node.argument.name],
        rhs: ["num", 1, _node.start]
      });
    } else if (_node.operator === "--") {
      ans.push({
        op: "op-",
        lhs: ["iden", _node.argument.name],
        rhs: ["num", 1, _node.start]
      });
    } else {
      notImpErr(_node);
    }
    ans.push({
      op: "reassign",
      lhs: ["iden", _node.argument.name],
      rhs: ["ans", null]
    });
  }

  function handleCallExpression(_node) {
    if (_node.callee.type === "Identifier") {
      ans.push({
        op: "call",
        fun: _node.callee.name,
        args: _node.arguments.map((x) => getTripleProp(x, false)),
        pos: _node.start
      });
    } else if (_node.callee.object.name === "console") {
      let isShinkable = true;
      const n = _node.arguments.length;
      for (let j = 0; j < n; j++) {
        const name = _node.arguments[j].name;
        if (
          name !== allVars[allVars.length - n + j] ||
          !namesOnlyUsedOnce.has(name) ||
          ans[ans.length - n + j].names[0] !== name
        ) {
          isShinkable = false;
          break;
        }
      }
      if (isShinkable) {
        // Remove the declaration target
        for (let j = 0; j < n; j++) {
          if (ans[ans.length - n + j].op === "var") {
            ans[ans.length - n + j].names = [];
          } else if (ans[ans.length - n + j].op === "name") {
            ans.splice(ans.length - n + j, 1);
          }
        }
      } else {
        createTempVarToWrap(_node.arguments);
      }
      ans.push({
        op: "print"
      });
    } else if (
      _node.callee.type === "MemberExpression" &&
      _node.callee.property.name === "push"
    ) {
      assert(_node.callee.object.type === "Identifier");
      ans.push({
        op: "push",
        container: _node.callee.object.name,
        pos: _node.callee.object.start,
        values: _node.arguments.map((x) => getTripleProp(x, false))
      });
    } else if (_node.callee.type.endsWith("MemberExpression")) {
      // Concat
      let isConcat = true;
      let isSliceOne = false;
      let callExp = _node;
      const allArr = [];
      while (callExp && callExp.type === "CallExpression") {
        if (callExp.arguments.length !== 1) {
          isConcat = false;
          break;
        }
        allArr.push(callExp.arguments[0].name);
        if (callExp.callee.property.name !== "concat") {
          isConcat = false;
          break;
        }
        callExp = callExp.callee.object;
      }
      if (
        _node.callee.property.name === "slice" &&
        _node.arguments.length === 1 &&
        _node.arguments[0].value === 1 &&
        _node.callee.object.type === "Identifier"
      ) {
        isSliceOne = true;
      }
      if (isConcat) {
        allArr.push(callExp.name);
        ans.push({
          op: "cat",
          containers: allArr.reverse(),
          pos: _node.start
        });
        return;
      } else if (isSliceOne) {
        ans.push({
          op: "subscript",
          container: _node.callee.object.name,
          value: ["ctnr", "rest"]
        });
        return;
      }

      handleUniversalCallExp(_node);
    } else {
      notImpErr(_node);
    }
  }

  function handleAssignmentExpression(_node) {
    assert(_node.operator === "=");
    if (_node.left.type === "Identifier") {
      if (_node.right.type === "FunctionExpression") {
        {
          // Assert we have initialized the function
          const last = ans[ans.length - 1];
          if (last.op !== "var" || last.names[0] !== _node.left.name) {
            notImpErr(_node);
          }
        }
        addFunction(_node.right);
      } else {
        ans.push({
          op: "reassign",
          lhs: ["iden", _node.left.name],
          rhs: getTripleProp(_node.right, true)
        });
      }
    } else if (_node.left.type.endsWith("Expression")) {
      if (
        _node.left.object.type === "Identifier" &&
        _node.left.property.type === "BinaryExpression" &&
        _node.left.property.operator === "-" &&
        _node.left.property.right.value === 1
      ) {
        const lhssubs = getTripleProp(_node.left.property.left, false);
        ans.push({
          op: "reassign",
          lhssubs,
          lhs: ["iden", _node.left.object.name],
          rhs: getTripleProp(_node.right, true)
        });
      } else if (
        _node.left.object.type === "Identifier" &&
        _node.left.property.type === "StringLiteral"
      ) {
        ans.push({
          op: "reassign",
          lhssubs: ["lit", `"${_node.left.property.value}"`],
          lhs: ["iden", _node.left.object.name],
          rhs: getTripleProp(_node.right, true)
        });
      } else if (
        _node.left.object.type === "Identifier" &&
        _node.left.property.type === "NumericLiteral"
      ) {
        ans.push({
          op: "reassign",
          lhssubs: ["num", _node.left.property.value + 1],
          lhs: ["iden", _node.left.object.name],
          rhs: getTripleProp(_node.right, true)
        });
      } else {
        notImpErr(_node);
      }
    } else {
      notImpErr(_node);
    }
  }

  function handleDeclaration(_node, defaultType = "obj") {
    const names = [];
    for (let i = 0; i < _node.declarations.length; i++) {
      const declarator = _node.declarations[i];
      const name = declarator.id.name;
      if (declarator.init == null) {
        addVarOp([name], [], defaultType);
        names.push(name);
      } else if (
        declarator.init.type === "BinaryExpression" ||
        declarator.init.type === "CallExpression" ||
        declarator.init.type === "MemberExpression" ||
        declarator.init.type === "UnaryExpression" ||
        declarator.init.type === "LogicalExpression"
      ) {
        declarator.init._name = name;
        process(declarator.init);
        if (COMPARE_OPERATORS.includes(declarator.init.operator)) {
          // FIXME: This is a ad-hoc fix for https://github.com/LingDong-/wenyan-lang/issues/317
        } else if (varSet.has(name)) {
          ans.push({
            op: "reassign",
            lhs: ["iden", name],
            rhs: ["ans", null]
          });
        } else {
          addNamingOp([name]);
        }
        names.push(name);
      } else {
        let value = declarator.init.value || declarator.init.name;
        const dtype = mapType(declarator.init.type || typeof value, value);
        appendDeclaration(dtype, value, name);
        names.push(name);
        if (dtype === "fun") {
          if (
            declarator.init.body.extra &&
            declarator.init.body.extra.raw === "0"
          ) {
            // Empty function
            return;
          } else if (
            declarator.init.type === "ArrowFunctionExpression" ||
            declarator.init.type === "FunctionExpression"
          ) {
            addFunction(declarator.init);
          } else {
            notImpErr(declarator);
          }
        }

        if (dtype === "obj" && declarator.init.properties.length) {
          // TODO: use new Syntax when object initialization is available
          initObjectProperties(name, declarator.init.properties);
        }

        if (dtype === "arr" && declarator.init.elements.length) {
          ans.push({
            op: "push",
            container: name,
            values: declarator.init.elements.map((x) => getTripleProp(x, false))
          });
        }
      }
    }

    return names;
  }

  function initObjectProperties(name, properties) {
    for (const property of properties) {
      ans.push({
        op: "reassign",
        lhs: ["iden", name],
        lhssubs: ["lit", `"${property.key.name || property.key.value}"`],
        rhs: getTripleProp(property.value, true)
      });
    }
  }

  function appendDeclaration(dtype, value, name) {
    let type;
    let toIgnoreValues;
    ({ type, toIgnoreValues, value } = preprocessTypeValueBeforeDeclare(
      dtype,
      value
    ));
    addVarOp([name], toIgnoreValues ? [] : [[dtype, value]], type);
  }

  function preprocessTypeValueBeforeDeclare(dtype, value) {
    let type = dtype;
    let toIgnoreValues = type === "fun" || type === "arr" || type === "obj";
    if (type === "iden") {
      type = varSet.get(value) || "obj";
    }
    if (type === "bool") {
      type = "bol";
    }
    if (dtype === "lit") {
      type = "str";
      if (value) {
        value = `"${value}"`;
      } else {
        toIgnoreValues = true;
      }
    }
    return { type, toIgnoreValues, value };
  }

  function handleMemberExpression(_node) {
    let object = _node.object;
    if (
      _node.object.type === "CallExpression" ||
      object.type === "MemberExpression"
    ) {
      process(_node.object);
      const newVar = saveStagedToNewVar();
      object = {
        name: newVar,
        type: "Identifier"
      };
    }
    if (object.type !== "Identifier") {
      notImpErr(_node);
    }
    if (_node.property.type === "BinaryExpression") {
      if (_node.property.operator === "-" && _node.property.right.value === 1) {
        ans.push({
          op: "subscript",
          container: object.name,
          value: getTripleProp(_node.property.left, true)
        });
      } else {
        process(_node.property);
        ans.push({
          op: "subscript",
          container: object.name,
          value: ["ans", null]
        });
      }
    } else if (_node.property.type in LITERAL_TYPES) {
      if (_node.property.name === "length") {
        ans.push({
          op: "length",
          container: object.name
        });
      } else if (_node.property.name != null) {
        ans.push({
          op: "subscript",
          container: object.name,
          value: ["lit", `"${_node.property.name}"`]
        });
      } else if (_node.property.value != null) {
        if (_node.property.type === "StringLiteral") {
          ans.push({
            op: "subscript",
            container: object.name,
            value: ["lit", `"${_node.property.value}"`]
          });
        } else {
          assert(_node.property.type === "NumericLiteral");
          ans.push({
            op: "subscript",
            container: object.name,
            value: ["num", _node.property.value + 1]
          });
        }
      } else {
        // TODO: add this part when wenyan has type assertion
        // 1. if target is string, target[index]
        // 2. if target is number, target[index + 1]
        notImpErr(_node);
      }
    } else {
      notImpErr(_node);
    }
  }

  function handleForStatement(_node) {
    const initName = _node.init.declarations[0].id.name;
    // whether it is in the format of `for (let i = 0; i < n; i++)`
    let shouldAddManualBreak =
      !_node.init ||
      !_node.init.declarations.length ||
      _node.init.declarations[0].init.value !== 0 ||
      !_node.update ||
      _node.update.operator !== "++" ||
      _node.update.argument.name !== initName ||
      (_node.test &&
        (_node.test.left.name !== initName ||
          _node.test.operator !== "<" ||
          !(_node.test.right.type in LITERAL_TYPES))) ||
      isReassigned(initName, _node.body);
    const shouldInit =
      shouldAddManualBreak ||
      (_node.init &&
        _node.init.declarations &&
        _node.init.declarations[0] &&
        !_node.init.declarations[0].id.name.startsWith("_rand"));
    if (shouldInit) {
      appendDeclaration("num", _node.init.declarations[0].init.value, initName);
    }
    if (shouldAddManualBreak) {
      ans.push({
        op: "whiletrue"
      });
    } else if (isIteratingFromZeroToN(_node)) {
      ans.push({
        op: "whilen",
        value: getTripleProp(_node.test.right),
        pos: _node.start
      });
    } else {
      notImpErr(_node);
    }
    for (const subNode of _node.body.body) {
      process(subNode);
    }
    if (_node.test && shouldAddManualBreak) {
      ans.push({
        op: "if",
        test: [getTripleProp(_node.test), ["cmp", "=="], ["bool", false]]
      });
      ans.push({
        op: "break"
      });
      ans.push({
        op: "end"
      });
    }
    if (shouldInit) {
      // Update
      process(_node.update);
    }
    ans.push({
      op: "end"
    });
  }
}

module.exports.js2wy = js2wy;
module.exports.ast2asc = ast2asc;
module.exports.js2asc = js2asc;
