const { parse } = require("@babel/parser");
const { asc2wy } = require("./asc2wy");
const { getRandomChineseName } = require('./utils');

// TODO: refactor!!
// TODO: find a way to make sure registerNewName is invoked after "name" op or "var" op

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
    count = {};
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
      if (op[key] && op[key][0] === "iden" && namesOnlyUsedOnce.has(op[key][1])) {
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
  varIndex++;
  return name;
}

function mapType(type, value) {
  if (DECLARATION_TYPES[type]) {
    return DECLARATION_TYPES[type];
  }

  if (type === "ArrowFunctionExpression" || type === 'FunctionExpression') {
    return "fun";
  }

  if (type === "ArrayExpression") {
    return "arr";
  }

  if (type === 'ObjectExpression') {
    return 'obj';
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

const COMPARE_OPERATORS = ["!=", "==", ">=", "<=", "<", ">", '===', '!=='];
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
  if (!node || typeof node !== 'object') {
    return false;
  }

  if (
    node.left &&
    node.left.name === name &&
    node.type === "AssignmentExpression"
  ) {
    return true;
  }

  if (
    node.type === 'UpdateExpression' &&
    node.argument.name === name
  ) {
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
    if (node.hasOwnProperty(key) && isReassigned(name, node[key])) {
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

function ast2asc(ast, js) {
  tmpVars = [];
  varIndex = 0;
  allVars = [];
  varSet = new Map();
  const namesOnlyUsedOnce = getNamesOnlyUsedOnce(ast.program.body);
  const nodes = ast.program.body;
  const ans = [];
  var node;

  function throwError(msg = "") {
    throw new Error(msg + JSON.stringify(node.loc.start));
  }

  function registerNewName(name, type) {
    if (!varSet.has(name)) {
      allVars.push(name);
    }

    varSet.set(name, type);
  }

  function saveStagedToNewVar() {
    const newName = getNextTmpName();
    ans.push({
      op: "name",
      names: [newName]
    });

    // FIXME: get the type
    registerNewName(name, 'obj');
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
          getTripleProp(_node.property.left)
        ];
      } else {
        console.log(_node);
        throw new Error();
      }
    } else if (_node.type in LITERAL_TYPES) {
      return [getTripleProp(_node)];
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
   * Get the triple tuple representation (used in Wenyan ASC) of a node
   *
   * @param {Node} _node
   * @param {boolean} canUseStaged
   */
  function getTripleProp(_node, canUseStaged = true) {
    if (_node == null) {
      return undefined;
    }

    function wrap() {
      // if (canUseStaged) {
      //   return ['ans', null];
      // }

      const name = getNextTmpName();
      ans.push({
        op: "name",
        names: [name]
      });

      registerNewName(name, 'obj');
      return ["iden", name, _node.start];
    }

    if (_node.type === "CallExpression") {
      if (varSet.has(_node.callee.name)) {
        ans.push({
          op: 'call',
          fun: _node.callee.name,
          args: _node.arguments.map(getTripleProp),
          pos: _node.start
        });
        return wrap();
      } else {
        notImpErr(_node);
        // TODO: auto-wrap function 
        return ["data", js.slice(_node.start, _node.end), _node.start];
      }
    }

    if (
      _node.type === "MemberExpression" ||
      _node.type === "CallExpression"
    ) {
      process(_node);
      return wrap();
    }

    if ( _node.type === "ArrayExpression") {
        _node._name = getNextTmpName();
        process(_node);
        return ["iden", _node._name, _node.start];
    }

    if (_node.type === "VariableDeclaration") {
      const names = declare(_node);
      assert(names.length === 1);
      return ["iden", names[0], _node.start];
    }

    if (
      _node.type === "BinaryExpression" ||
      _node.type === "LogicalExpression"
    ) {
      // TODO: remove this hotfix in the future version
      if (COMPARE_OPERATORS.includes(_node.operator)) {
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
          rhs: getTripleProp(_node.argument)
        });

        return wrap();
      } else if (_node.operator === '!') {
        ans.push({
          op: 'not',
          value: getTripleProp(_node.argument),
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

  function assert(cond, msg) {
    cond || throwError(msg);
  }

  function notImpErr(_node = node) {
    const errorSnippet = js.slice(_node.start, _node.end);
    console.log(errorSnippet);
    throw new Error(`NotImplementedError, in ${_node.loc.start}`);
  }

  function addFunction(funcNode) {
    ans.push({
      op: "fun",
      arity: funcNode.params.length,
      args: funcNode.params.map((x) => {
        const props = getTripleProp(x);
        return {
          name: props[1],
          // TODO: get type
          type: "obj"
        };
      }),
      pos: funcNode.start
    });
    if (funcNode.id) {
      // Skip Anonymous Function
      registerNewName(funcNode.id.name, 'fun');
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
    const tripleRep = values.map(x => getTripleProp(x, false));
    ({ type } = preprocessTypeValueBeforeDeclare(
      type || tripleRep[0][0],
      values[0]
    ));
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

    for (const name of names) {
      registerNewName(name, type);
    }
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
          test: [getTripleProp(_node.test)]
        });
      } else {
        notImpErr(_node);
      }
    } else if (_node.test.type in LITERAL_TYPES) {
      ans.push({
        op: "if",
        // TODO: it seems we cannot use "ans" in if
        test: [getTripleProp(_node.test, false)],
        pos: _node.start
      });
    } else if (
      _node.test.type === "LogicalExpression" ||
      _node.test.type === "BinaryExpression" ||
      _node.test.type === 'UnaryExpression'
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
          let isSliceOne = false;
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
          } else if (isSliceOne) {
            ans.push({
              op: "subscript",
              container: _node.callee.object.name,
              value: ["ctnr", "rest"]
            });
          } else {
            // TODO:
            notImpErr(_node);
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
              rhs: getTripleProp(_node.right)
            });
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
          } else if (
            _node.left.object.type === "Identifier" &&
            _node.left.property.type === "NumericLiteral"
          ) {
            ans.push({
              op: "reassign",
              lhssubs: ['num', _node.left.property.value + 1],
              lhs: ["iden", _node.left.object.name],
              rhs: getTripleProp(_node.right, true)
            });
          } else {
            notImpErr(_node);
          }
        } else {
          notImpErr(_node);
        }
        break;
      case "UpdateExpression":
        if (_node.operator === '++') {
          ans.push({
            op: 'op+',
            lhs: ['iden', _node.argument.name],
            rhs: ['num', 1, _node.start]
          });

        } else if (_node.operator === '--') {
          ans.push({
            op: 'op-',
            lhs: ['iden', _node.argument.name],
            rhs: ['num', 1, _node.start]
          });
        } else {
          notImpErr(_node);
        }

        ans.push({
          op:  'reassign',
          lhs: ['iden', _node.argument.name],
          rhs: ['ans', null]
        })
        break;
      default:
        throwError(`Unknown expression ${_node.expression.type}`);
    }
  }

  function declare(_node, defaultType = "num") {
    const names = [];
    for (let i = 0; i < _node.declarations.length; i++) {
      const declarator = _node.declarations[i];
      const name = declarator.id.name;
      if (declarator.init == null) {
        ans.push({
          op: "var",
          type: defaultType,
          count: 1,
          values: [],
          names: [name]
        });
        names.push(name);
        registerNewName(name, 'obj')
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
        } else if (varSet.has(name)) {
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

          registerNewName(name, 'num');
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
          } else if (
            declarator.init.type === "ArrowFunctionExpression" ||
            declarator.init.type === "FunctionExpression"
          ) {
            addFunction(declarator.init);
          } else {
            notImpErr(declarator);
          }
        }

        if (dtype === 'obj' && declarator.init.properties.length) {
          // TODO: use new Syntax
          for (const property of declarator.init.properties) {
            ans.push({
              op: 'reassign',
              lhs: ['iden', name],
              lhssubs: ['lit', `"${property.key.name || property.key.value}"`],
              rhs: getTripleProp(property.value)
            });
          }
        }

        if (dtype === "arr" && declarator.init.elements.length) {
          ans.push({
            op: 'push',
            container: name,
            values: declarator.init.elements.map(getTripleProp)
          })
        }
      }
    }

    return names;
  }

  function appendDeclaration(dtype, value, name) {
    let type;
    let toIgnoreValues;
    ({ type, toIgnoreValues, value } = preprocessTypeValueBeforeDeclare(
      dtype,
      value
    ));
    ans.push({
      op: "var",
      type,
      count: 1,
      values: toIgnoreValues ? [] : [[dtype, value]],
      names: [name]
    });

    registerNewName(name, type);
  }

  function preprocessTypeValueBeforeDeclare(dtype, value) {
    let type = dtype;
    let toIgnoreValues = type === "fun" || type === "arr" || type === "obj";
    if (type === "iden") {
      type = varSet.get(value) || "obj";
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
    return { type, toIgnoreValues, value };
  }

  function process(_node) {
    switch (_node.type) {
      case "VariableDeclaration":
        declare(_node);
        break;
      case "ExpressionStatement":
        addExpressionStatement(_node.expression);
        break;
      case "UpdateExpression":
        addExpressionStatement(_node);
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
            rhs: getTripleProp(_node.right, false),
            op: "op" + _node.operator,
            name: _node._name
          });
        } else {
          notImpErr(_node);
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
        const initName = _node.init.declarations[0].id.name;
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
              _node.test.right.type !== "NumericLiteral")) ||
          isReassigned(initName, _node.body);
        const shouldInit = shouldAddManualBreak || (
          _node.init &&
          _node.init.declarations &&
          _node.init.declarations[0] &&
          !_node.init.declarations[0].id.name.startsWith("_rand"));

        if (shouldInit) {
          appendDeclaration('num', _node.init.declarations[0].init.value, initName);
        }

        if (shouldAddManualBreak) {
          ans.push({
            op: 'whiletrue'
          })
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
            op: 'if',
            test: [
              getTripleProp(_node.test),
              ['cmp', '=='],
              ['bool', false]
            ]
          });

          ans.push({
            op: 'break'
          });

          ans.push({
            op: 'end'
          });
        }

        if (shouldInit) {
          // Update
          process(_node.update);
        }

        ans.push({
          op: "end"
        });
        break;
      case "ForOfStatement":
        assert(_node.right.type === "Identifier");
        ans.push({
          op: "for",
          container: _node.right.name,
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
              ans.push({
                op: "subscript",
                container: object.name,
                // FIXME: should I plus 1 or not??
                value: ["num", _node.property.value + 1]
              });
            }
          } else {
            notImpErr(_node);
          }
        } else {
          notImpErr(_node);
        }
        break;
      case "ArrayExpression":
        const name = _node._name || getNextTmpName();
        ans.push({
          op: "var",
          type: 'arr',
          count: 1,
          values: [],
          names: [name]
        });

        registerNewName(name, 'arr');
        ans.push({
          op: 'push',
          container: name,
          values: _node.elements.map(getTripleProp)
        });

        if (_node._name == null) {
          // Stage this variable
          ans.push({
            op: "var",
            type: "arr",
            count: 1,
            values: [name],
            names: []
          });
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
      case "FunctionDeclaration":
        ans.push({
          op: "var",
          count: 1,
          type: "fun",
          names: [_node.id.name],
          values: []
        });

        registerNewName(_node.id.name, 'fun');
        addFunction(_node);
        break;
      case "EmptyStatement":
        break;
      default:
        notImpErr(_node);
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
