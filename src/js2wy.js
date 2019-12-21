const { parse } = require("@babel/parser");
const { asc2wy } = require("./asc2wy");

var tmpVars = [];
var varIndex = 0;
var allVars = [];
function getNextTmpName() {
  const name = "__tmp$Hv2jEr_" + varIndex;
  tmpVars.push(name);
  varIndex++;
  return name;
}

function lastVar() {
  return allVars[allVars.length - 1];
}

function js2wy(jsStr) {
  const asc = js2asc(jsStr);
  return asc2wy(asc);
}

function js2asc(jsStr) {
  const jsAst = parse(jsStr);
  const asc = ast2asc(jsAst, jsStr);
  return asc;
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

function mapType(type, value) {
  if (DECLARATION_TYPES[type]) {
    return DECLARATION_TYPES[type];
  }

  if (type === "ArrowFunctionExpression") {
    return "fun";
  }

  if (type === "ArrayExpression") {
    return "arr";
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
  BinaryExpression: "bol",
  StringLiteral: "str"
};

const COMPARE_OPERATORS = ["==", ">=", "<=", "<", ">"];
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
  return (
    OPERATORS.includes(_node.operator) &&
    _node.left.type in LITERALS &&
    _node.right.type in LITERALS
  );
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
      _get(node[key], insideTest || key === "test" || key === "arguments");
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

function ast2asc(ast, js) {
  tmpVars = [];
  varIndex = 0;
  allVars = [];
  const namesOnlyUsedOnce = getNamesOnlyUsedOnce(ast.program.body);
  const nodes = ast.program.body;
  const ans = [];
  var node;
  const varTypeMap = new Map();

  function throwError(msg = "") {
    throw new Error(msg + JSON.stringify(node.loc.start));
  }

  function saveStagedToNewVar() {
    const newName = getNextTmpName();
    ans.push({
      op: "name",
      names: [newName]
    });
    return newName;
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

  function getTripleProp(_node, canUseStaged = true) {
    if (_node.type === "CallExpression") {
      return ["data", js.slice(_node.start, _node.end), _node.start];
    }

    if (_node.type === "MemberExpression") {
      notImpErr(_node);
    }

    if (_node.type === "VariableDeclaration") {
      const names = declare(_node);
      assert(names.length === 1);
      return ["iden", names[0], _node.start];
    }

    if (!(_node.type in LITERAL_TYPES)) {
      notImpErr();
    }

    if (_node.type === "Identifier") {
      if (tryToCompress(_node.name) && canUseStaged) {
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

  function assert(cond, msg) {
    cond || throwError(msg);
  }

  function notImpErr(_node = node) {
    const errorSnippet = js.slice(_node.start, _node.end);
    console.log(errorSnippet);
    throw new Error("NotImplementedError");
  }

  function addFunction(funcNode) {
    ans.push({
      op: "fun",
      arity: funcNode.params.length,
      args: funcNode.params.map(x => {
        const props = getTripleProp(x);
        return {
          name: props[1],
          // TODO: get type
          type: "obj"
        };
      }),
      pos: funcNode.start
    });
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
    const tripleRep = values.map(getTripleProp);
    type = type || tripleRep[0][0];
    if (type === "iden") {
      // FIXME:
      type = "obj";
    }
    ans.push({
      op: "var",
      values: tripleRep,
      names: names,
      type: type,
      count: tripleRep.length
    });
  }

  function addIfTestExpression(_node) {
    if (_node.test.type === "BinaryExpression") {
      if (isSimpleForm(_node.test)) {
        ans.push({
          op: "if",
          test: [
            getTripleProp(_node.test.left),
            ["cmp", _node.test.operator],
            getTripleProp(_node.test.right)
          ]
        });
      } else {
        notImpErr();
      }
    } else if (_node.test.type in LITERAL_TYPES) {
      ans.push({
        op: "if",
        test: [getTripleProp(_node.test)],
        pos: _node.start
      });
    } else {
      notImpErr();
    }
  }

  function addExpressionStatement(_node) {
    switch (_node.type) {
      case "CallExpression":
        if (_node.callee.type === "Identifier") {
          ans.push({
            op: "call",
            fun: _node.callee.name,
            args: _node.arguments.map(getTripleProp),
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
            values: _node.arguments.map(getTripleProp)
          });
        } else if (_node.callee.type.endsWith("MemberExpression")) {
          // Concat
          let isConcat = true;
          let callExp = _node;
          const allArr = [];
          while (callExp && callExp.type === "CallExpression") {
            assert(callExp.arguments.length === 1);
            allArr.push(callExp.arguments[0].name);
            if (callExp.callee.property.name !== "concat") {
              isConcat = false;
              break;
            }

            callExp = callExp.callee.object;
          }

          if (isConcat) {
            allArr.push(callExp.name);
            ans.push({
              op: "cat",
              containers: allArr,
              pos: _node.start
            });
          } else {
            notImpErr();
          }
        } else {
          notImpErr(_node);
        }
        break;
      case "ExpressionStatement":
        process(_node.expression);
        break;
      case "AssignmentExpression":
        assert(_node.operator === "=");
        if (_node.left.type === "Identifier") {
          if (_node.right.type in LITERALS) {
            ans.push({
              op: "reassign",
              lhs: ["iden", _node.left.name],
              rhs: getTripleProp(_node.right)
            });
          } else if (_node.right.type === "FunctionExpression") {
            {
              // Assert we have initialized the function
              const last = ans[ans.length - 1];
              if (last.op !== "var" || last.names[0] !== _node.left.name) {
                notImpErr();
              }
            }
            addFunction(_node.right);
          } else {
            notImpErr();
          }
        } else if (_node.left.type.endsWith("Expression")) {
          if (
            _node.left.object.type === "Identifier" &&
            _node.left.property.type === "BinaryExpression" &&
            _node.left.property.operator === "-" &&
            _node.left.property.right.value === 1
          ) {
            lhssubs = getTripleProp(_node.left.property.left);
            ans.push({
              op: "reassign",
              lhssubs,
              lhs: ["iden", _node.left.object.name],
              rhs: getTripleProp(_node.right, true)
            });
          } else {
            notImpErr();
          }
        } else {
          notImpErr();
        }
        break;
      default:
        throwError(`Unknown expression ${_node.expression.type}`);
    }
  }

  function declare(_node, defaultType = "num") {
    const names = [];
    for (let i = 0; i < _node.declarations.length; i++) {
      const declarator = _node.declarations[i];
      const op =
        DECLARATION_TYPES[declarator.type] ||
        throwError(`Type ${declarator.type} not support.`);
      const name = declarator.id.name;
      if (declarator.init == null) {
        ans.push({
          op,
          type: defaultType,
          count: 1,
          values: [],
          names: [name]
        });
        names.push(name);
      } else if (
        declarator.init.type === "BinaryExpression" ||
        declarator.init.type === "CallExpression" ||
        declarator.init.type === "MemberExpression" ||
        declarator.init.type === "UnaryExpression" ||
        declarator.init.type === "LogicalExpression"
      ) {
        process(declarator.init);
        if (allVars.includes(name)) {
          ans.push({
            op: "reassign",
            lhs: ["iden", name],
            rhs: ["ans", null]
          });
        } else {
          ans.push({
            op: "name",
            names: [name]
          });
          allVars.push(name);
        }
        names.push(name);
      } else {
        let value = declarator.init.value || declarator.init.name;
        const dtype = mapType(declarator.init.type || typeof value, value);
        let type = dtype;
        let toIgnoreValues = type === "fun" || type === "arr" || type === "obj";
        if (type === "iden") {
          type = varTypeMap.get(value) || "obj";
          // Try to compress
          const name = value;
          if (namesOnlyUsedOnce.has(name)) {
            const last = ans[ans.length - 1];
          }
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
        allVars.push(name);
        ans.push({
          op,
          type,
          count: 1,
          values: toIgnoreValues ? [] : [[dtype, value]],
          names: [name]
        });

        varTypeMap.set(name, type);
        if (dtype === "fun" && declarator.init.body.extra.raw !== "0") {
          // TODO:
          notImpErr();
          addFunction();
        }

        if (dtype === "arr" && declarator.init.elements.length) {
          notImpErr();
        }

        names.push(name);
      }
    }

    return names;
  }

  function process(_node) {
    switch (_node.type) {
      case "VariableDeclaration":
        declare(_node);
        break;
      case "ExpressionStatement":
        addExpressionStatement(_node.expression);
        break;
      case "CallExpression":
        addExpressionStatement(_node);
        break;
      case "WhileStatement":
        if (_node.test.type === "BooleanLiteral") {
          if (_node.test.value === true) {
            ans.push({
              op: "whiletrue"
            });
          }
        } else {
          notImpErr();
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
      case "BinaryExpression":
        if (isSimpleForm(_node)) {
          ans.push({
            lhs: getTripleProp(_node.left),
            rhs: getTripleProp(_node.right),
            op: "op" + _node.operator
          });
        } else {
          notImpErr();
        }
        break;
      case "ReturnStatement":
        ans.push({
          op: "return",
          value: getTripleProp(_node.argument),
          pos: _node.start
        });
        break;
      case "ForStatement":
        // TODO: Currently it only supports `for (let i = 0; i < n; i++)`,
        // or `for (const a of b)`

        if (isIteratingFromZeroToN(_node)) {
          ans.push({
            op: "whilen",
            value: getTripleProp(_node.test.right),
            pos: _node.start
          });
        } else {
          notImpErr();
        }

        for (const subNode of _node.body.body) {
          process(subNode);
        }

        ans.push({
          op: "end"
        });
        break;
      case "ForOfStatement":
        ans.push({
          op: "for",
          container: getTripleProp(_node.right)[1],
          iterator: getTripleProp(_node.left)[1]
        });

        for (const subNode of _node.body.body) {
          process(subNode);
        }

        ans.push({
          op: "end"
        });
        break;
      case "MemberExpression":
        let object = _node.object;
        if (_node.object.type === "CallExpression") {
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
          if (
            _node.property.operator === "-" &&
            _node.property.right.value === 1
          ) {
            ans.push({
              op: "subscript",
              container: object.name,
              value: getTripleProp(_node.property.left)
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
          ans.push({
            lhs: getTripleProp(_node.property),
            rhs: ["num", 1],
            op: "op+"
          });
          ans.push({
            op: "subscript",
            container: object.name,
            value: ["ans", null]
          });
        } else {
          notImpErr();
        }
        break;
      case "UnaryExpression":
        ans.push({
          op: "not",
          value: getTripleProp(_node.argument),
          pos: _node.start
        });
        break;
      case "LogicalExpression":
        ans.push({
          op: "op" + _node.operator,
          lhs: getTripleProp(_node.left),
          rhs: getTripleProp(_node.right)
        });
        break;
      case "EmptyStatement":
        break;
      default:
        notImpErr();
    }
  }

  for (node of nodes) {
    process(node);
  }

  return ans;
}

module.exports.js2wy = js2wy;
module.exports.ast2asc = ast2asc;
module.exports.js2asc = js2asc;
