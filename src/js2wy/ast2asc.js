"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var ActionManager_1 = require("./ActionManager");
var NameManager_1 = require("./NameManager");
var LITERAL_TYPES = {
    string: "lit",
    number: "num",
    function: "fun",
    boolean: "bool",
    StringLiteral: "lit",
    NumericLiteral: "num",
    Identifier: "iden",
    BooleanLiteral: "bool"
};
var DECLARATION_TYPES = Object.assign({
    VariableDeclarator: "var"
}, LITERAL_TYPES);
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
    throw new Error("Unknown type " + typeof value + " of " + value);
}
var LITERALS = {
    NumericLiteral: "num",
    Identifier: "iden",
    BooleanLiteral: "bol",
    StringLiteral: "str"
};
var COMPARE_OPERATORS = ["!=", "==", ">=", "<=", "<", ">", "===", "!=="];
var OPERATORS = [
    "===",
    "!==",
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
function tryTurnThisExpressionToIdentifier(_node) {
    if (_node.type === "ThisExpression") {
        _node.type = "Identifier";
        _node.name = "this";
    }
}
/**
 * Return whether a variable is reassigned in an expression or a statement
 *
 * @param {name of a variable} name
 * @param {the node where the variable might be reassigned} node
 */
function isReassigned(name, node) {
    if (!node || typeof node !== "object") {
        return false;
    }
    if (node.left &&
        node.left.name === name &&
        node.type === "AssignmentExpression") {
        return true;
    }
    if (node.type === "UpdateExpression" && node.argument.name === name) {
        return true;
    }
    if (node instanceof Array) {
        for (var _i = 0, node_1 = node; _i < node_1.length; _i++) {
            var sub = node_1[_i];
            if (isReassigned(name, sub)) {
                return true;
            }
        }
        return false;
    }
    for (var key in node) {
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
    }
    catch (e) {
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
    var nameManager = new NameManager_1.NameManager(ast);
    var signatureCache = {};
    var nodes = ast.program.body;
    var NEW_SIGNATURE = "JS_NEW()";
    var NEW_FUNC_NAME = "造物";
    // const INDEX_SIGNATURE = "JS_INDEX()";
    var INDEX_FUNC = "求索";
    var INDEX_ASSIGN_SIGNATURE = "JS_INDEX_ASSIGN()";
    var INDEX_ASSIGN_FUNC = "賦值";
    var JS_SUBSCRIPT = "JsSubscript()";
    var JS_SUBSCRIPT_FUN = "獲取";
    nameManager.registerName(NEW_FUNC_NAME, 'func');
    nameManager.registerName(INDEX_FUNC, 'func');
    nameManager.registerName(INDEX_ASSIGN_FUNC, 'func');
    nameManager.registerName(JS_SUBSCRIPT_FUN, 'func');
    var actionManager = new ActionManager_1.ActionManager(nameManager);
    var polyfillAM = new ActionManager_1.ActionManager(nameManager); // handle a++
    var postProcess = [];
    for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
        var node = nodes_1[_i];
        process(node);
        consumePostProcess();
    }
    var ans = actionManager.getActions();
    if (polyfillAM.actions.length) {
        polyfillAM.addComment('============');
        ans = polyfillAM.actions.concat(ans);
    }
    return ans;
    function consumePostProcess() {
        for (var _i = 0, postProcess_1 = postProcess; _i < postProcess_1.length; _i++) {
            var func = postProcess_1[_i];
            func();
        }
        postProcess = [];
    }
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
            case "DoWhileStatement":
            case "WhileStatement":
                actionManager.addWhileTrue();
                if (_node.type === "WhileStatement") {
                    breakWhenTestIsFalse(_node.test);
                }
                processNodesAndHandlePostProcess(_node.body.body);
                if (_node.type === "DoWhileStatement") {
                    breakWhenTestIsFalse(_node.test);
                }
                actionManager.addEnd();
                break;
            case "IfStatement":
                addIfTestExpression(_node);
                if (_node.consequent.body) {
                    processNodesAndHandlePostProcess(_node.consequent.body);
                }
                else {
                    process(_node.consequent);
                }
                if (_node.alternate) {
                    actionManager.addElse();
                    if (_node.alternate.body) {
                        processNodesAndHandlePostProcess(_node.alternate.body);
                    }
                    else {
                        process(_node.alternate);
                    }
                }
                actionManager.addEnd();
                break;
            case "BreakStatement":
                actionManager.addBreak();
                break;
            case "LogicalExpression":
            case "BinaryExpression":
                wrapBinaryExpression(_node);
                break;
            case "ObjectExpression":
                assert(_node._name != null);
                addVarOp([_node._name], [], "obj");
                initObjectProperties(_node._name, _node.properties);
                break;
            case "ReturnStatement": {
                actionManager.addReturn(getTripleProp(_node.argument, false));
                break;
            }
            case "ForStatement":
                handleForStatement(_node);
                break;
            case "ForOfStatement":
                assert(_node.right.type === "Identifier");
                actionManager.addFor(_node.right.name, getTripleProp(_node.left, false)[1]);
                processNodesAndHandlePostProcess(_node.body.body);
                actionManager.addEnd();
                break;
            case "MemberExpression":
                handleMemberExpression(_node);
                break;
            case "ArrayExpression":
                handleArrayExpression(_node);
                break;
            case "UnaryExpression":
                wrapUnaryExpression(_node);
                break;
            case "FunctionExpression": {
                wrapFunctionExpression(_node);
                break;
            }
            case "FunctionDeclaration":
                addVarOp([_node.id.name], [], "fun");
                addFunction(_node);
                break;
            case "NewExpression":
                wrapJsNewExpression(_node);
                break;
            case "SequenceExpression":
                processNodesAndHandlePostProcess(_node.expressions);
                break;
            case "AssignmentExpression":
                handleAssignmentExpression(_node);
                break;
            case "EmptyStatement":
                break;
            default:
                notImpErr(_node);
        }
    }
    function wrapUnaryExpression(_node) {
        if (_node.operator === '!') {
            actionManager.addNot(getTripleProp(_node.argument, true));
        }
        else if (_node.operator === '-') {
            actionManager.addOp('-', ['num', 0, _node.start], getTripleProp(_node.argument, true));
        }
        else {
            notImpErr();
        }
    }
    function breakWhenTestIsFalse(test) {
        var v = getTripleProp(test);
        if (v[0] === "bool") {
            if (v[1]) {
                // <del> if (!true) {break} </del>
                return;
            }
            else {
                // <del> if (!false) </del> break
                actionManager.addBreak();
            }
            return;
        }
        actionManager.addIf([v, ["cmp", "=="], ["num", 0]]);
        actionManager.addBreak();
        actionManager.addEnd();
    }
    function wrapBinaryExpression(_node) {
        if (isSimpleForm(_node)) {
            // TODO: remove name hotfix when op== op<= is supported officially
            actionManager.addOp(_node.operator, getTripleProp(_node.left, false), getTripleProp(_node.right, true), _node._name);
        }
        else {
            notImpErr(_node);
        }
    }
    function wrapFunctionExpression(_node) {
        // Maybe there is a better way to wrap this in future
        var name = nameManager.getNextTmpName('func');
        addVarOp([name], [], "fun");
        addFunction(_node);
        addVarOp([], [["iden", name]], "fun");
    }
    function handleArrayExpression(_node) {
        var name = _node._name || nameManager.getNextTmpName('arr');
        addVarOp([name], [], "arr");
        actionManager.addPush(name, _node.elements.map(function (x) { return getTripleProp(x, false); }));
        if (_node._name == null) {
            // Stage this variable
            addVarOp([], [["iden", name]], "arr");
        }
    }
    function addNamingOp(names) {
        actionManager.addName(names);
        for (var _i = 0, names_1 = names; _i < names_1.length; _i++) {
            var name_1 = names_1[_i];
            nameManager.registerName(name_1, "obj");
        }
    }
    function addReassignOp(_a) {
        var lhs = _a.lhs, rhs = _a.rhs, _b = _a.lhssubs, lhssubs = _b === void 0 ? undefined : _b;
        if (lhs[0] === "iden") {
            nameManager.registerName(lhs[1]);
        }
        actionManager.addReassign(lhs, rhs, lhssubs);
    }
    function addVarOp(names, values, type, polyfill) {
        if (polyfill === void 0) { polyfill = false; }
        var count = Math.max(names.length, values.length);
        for (var i_1 = 0; i_1 < count; i_1++) {
            if (names[i_1]) {
                assert(typeof names[i_1] === "string");
            }
            if (values[i_1]) {
                assert(values[i_1] instanceof Array);
                assert(values[i_1][0] == null || typeof values[i_1][0] === "string");
            }
        }
        if (polyfill) {
            polyfillAM.addVar(names, values, type);
        }
        else {
            actionManager.addVar(names, values, type);
        }
        for (var _i = 0, names_2 = names; _i < names_2.length; _i++) {
            var name_2 = names_2[_i];
            nameManager.registerName(name_2, type);
        }
    }
    function saveStagedToNewVar() {
        var newName = nameManager.getNextTmpName();
        addNamingOp([newName]);
        return newName;
    }
    function getIfProp(_node) {
        if (_node.type === "MemberExpression") {
            if (_node.object.type === "Identifier" &&
                _node.property.type === "Identifier" &&
                _node.property.name === "length") {
                return [
                    ["iden", _node.object.name],
                    ["ctnr", "len"]
                ];
            }
            else if (_node.object.type === "Identifier" &&
                _node.property.type === "BinaryExpression" &&
                _node.property.operator === "-" &&
                _node.property.right.type === "NumericLiteral" &&
                _node.property.right.value === 1) {
                return [
                    ["iden", _node.object.name],
                    ["ctnr", "subs"],
                    getTripleProp(_node.property.left, false)
                ];
            }
            else {
                return [getTripleProp(_node, false)];
            }
        }
        else if (_node.type in LITERAL_TYPES) {
            return [getTripleProp(_node, false)];
        }
        else if (_node.type.endsWith("Expression")) {
            return [getTripleProp(_node, false)];
        }
        else {
            notImpErr(_node);
        }
    }
    /**
     * This function is used to wrap the global object
     * which has not been supported by wenyan.
     *
     * 1. It will create necessary function
     * 2. Invoke the function
     *
     * @param {*} _node
     */
    function wrapJsGlobalFunction(_node) {
        // FIXME: it also wrap function call on rhs
        assert(_node.type === "CallExpression");
        var signature = "";
        var args = [];
        function _getSignature(target) {
            if (target.type === "Identifier") {
                signature += target.name;
            }
            else if (target.type === "MemberExpression") {
                _getSignature(target.object);
                signature += ".";
                _getSignature(target.property);
            }
            else if (target.type === "CallExpression") {
                _getSignature(target.callee);
                signature += "(";
                for (var i_2 = 0; i_2 < target.arguments.length; i_2++) {
                    // Chinese char may introduce error
                    // const name = "子" + LAMBDA[i];
                    var name_3 = "_a" + i_2;
                    signature += name_3 + ",";
                    args.push(name_3);
                }
                signature += ")";
            }
            else {
                notImpErr();
            }
        }
        _getSignature(_node);
        var funcName;
        if (signature in signatureCache) {
            funcName = signatureCache[signature];
        }
        else {
            funcName = nameManager.getNextTmpName('func');
            signatureCache[signature] = funcName;
            // TODO: refactor, extract all func together
            addVarOp([funcName], [], "fun", false);
            actionManager.addFun(_node.arguments.map(function (x, index) {
                return { type: "obj", name: args[index] };
            }));
            actionManager.addFunBody();
            actionManager.addReturn(['data', signature]);
            actionManager.addFunEnd();
        }
        actionManager.addCall(funcName, _node.arguments.map(function (x) { return getTripleProp(x, false); }));
    }
    function wrapJsNativeFunction(signature, funcName, args, value) {
        if (!(signature in signatureCache)) {
            addVarOp([funcName], [], "fun", true);
            polyfillAM.addFun(args);
            polyfillAM.addFunBody();
            polyfillAM.addReturn(['data', value]);
            polyfillAM.addFunEnd();
            signatureCache[signature] = funcName;
        }
    }
    function wrapJsNewExpression(_node) {
        assertStrongly(_node.type === "NewExpression", _node);
        wrapJsNativeFunction(NEW_SIGNATURE, NEW_FUNC_NAME, [{ type: "obj", name: "蓝图" }], "new 蓝图(...Array.prototype.slice.call(arguments, 1))");
        actionManager.addCall(NEW_FUNC_NAME, [_node.callee]
            .concat(_node.arguments)
            .map(function (x) { return getTripleProp(x, false); }));
    }
    // function wrapJsIndexing(_node) {
    //   wrapJsNativeFunction(
    //     INDEX_SIGNATURE,
    //     INDEX_FUNC,
    //     [{ type: "obj", name: "道" }],
    //     "typeof 道 === 'string'? 道 : 道 + 1"
    //   );
    //   ans.push({
    //     op: "call",
    //     fun: INDEX_FUNC,
    //     args: [getTripleProp(_node)],
    //     pos: _node.start
    //   });
    // }
    function wrapJsSubscript(obj, field) {
        wrapJsNativeFunction(JS_SUBSCRIPT, JS_SUBSCRIPT_FUN, [
            { type: "obj", name: "對象" },
            { type: "obj", name: "域" }
        ], "對象[域]");
        actionManager.addCall(JS_SUBSCRIPT_FUN, [obj, field]);
    }
    function wrapJsIndexAssignment(lhs, lhssubs, rhs) {
        wrapJsNativeFunction(INDEX_ASSIGN_SIGNATURE, INDEX_ASSIGN_FUNC, [
            { type: "obj", name: "對象" },
            { type: "obj", name: "域" },
            { type: "obj", name: "值" }
        ], "對象[域] = 值;");
        actionManager.addCall(INDEX_ASSIGN_FUNC, [lhs, lhssubs, rhs]);
    }
    /**
     * Get the triple tuple representation (used in Wenyan ASC) of a node
     *
     * @param {Node} _node
     * @param {boolean} canUseStaged
     */
    function getTripleProp(_node, canUseStaged) {
        if (canUseStaged === void 0) { canUseStaged = false; }
        if (_node == null) {
            return undefined;
        }
        function wrap() {
            if (canUseStaged) {
                return ["ans", null];
            }
            var name = nameManager.getNextTmpName();
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
            _node._name = nameManager.getNextTmpName();
            process(_node);
            return ["iden", _node._name, _node.start];
        }
        if (_node.type === "VariableDeclaration") {
            var names = handleDeclaration(_node);
            assert(names.length === 1);
            return ["iden", names[0], _node.start];
        }
        if (_node.type === "BinaryExpression" ||
            _node.type === "LogicalExpression" ||
            _node.type === "ObjectExpression" ||
            _node.type === "FunctionExpression" ||
            _node.type === "NewExpression") {
            // TODO: remove this hotfix in the future version
            if (_node.type === "ObjectExpression" ||
                COMPARE_OPERATORS.includes(_node.operator)) {
                _node._name = nameManager.getNextTmpName();
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
                actionManager.addOp('-', ['num', 0], getTripleProp(_node.argument, true));
                return wrap();
            }
            else if (_node.operator === "!") {
                actionManager.addNot(getTripleProp(_node.argument, true));
                return wrap();
            }
            else {
                notImpErr(_node);
            }
        }
        if (_node.type === "UpdateExpression") {
            handleUpdateExpression(_node);
            return getTripleProp(_node.argument);
        }
        if (_node.type === 'AssignmentExpression') {
            handleAssignmentExpression(_node);
            return getTripleProp(_node.left);
        }
        tryTurnThisExpressionToIdentifier(_node);
        if (!(_node.type in LITERAL_TYPES)) {
            notImpErr(_node);
        }
        if (_node.type === "Identifier") {
            if (canUseStaged && actionManager.tryToCompress(_node.name)) {
                return ["ans", null];
            }
            return ["iden", _node.name, _node.start];
        }
        if (_node.type === "StringLiteral") {
            if (_node.value != null) {
                return ["lit", "\"" + _node.value + "\"", _node.start];
            }
            return ["lit", null, _node.start];
        }
        return [LITERAL_TYPES[_node.type], _node.value, _node.start];
    }
    function handleUniversalCallExp(_node) {
        if (nameManager.has(_node.callee.name)) {
            actionManager.addCall(_node.callee.name, _node.arguments.map(function (x) { return getTripleProp(x, false); }));
        }
        else {
            wrapJsGlobalFunction(_node);
        }
    }
    function assertStrongly(cond, _node, msg) {
        if (msg === void 0) { msg = ""; }
        if (!cond) {
            var errorSnippet = js.slice(_node.start, _node.end);
            console.log(errorSnippet);
            throw new Error("AssertError: line " + _node.loc.start.line + ", col " + _node.loc.start.column + ";\n    \t\"" + errorSnippet + "\"\n    \t" + msg + "\n    This is weird \uD83D\uDE23. If you see this message, it means our tests haven't covered this case. \n    Please submit an issue to help us fix it! https://github.com/zxch3n/wenyanizer/issues/new\n    ");
        }
    }
    function assert(cond, msg) {
        if (msg === void 0) { msg = ''; }
        if (!cond) {
            throw new Error(msg + JSON.stringify(node.loc.start));
        }
    }
    function notImpErr(_node, msg) {
        if (_node === void 0) { _node = node; }
        if (msg === void 0) { msg = ""; }
        var errorSnippet = js.slice(_node.start, _node.end);
        console.log(errorSnippet);
        throw new Error("NotImplementedError: line " + _node.loc.start.line + ", col " + _node.loc.start.column + ";\n    \t\"" + errorSnippet + "\"\n    \t" + msg + "\n    The grammar is not supported yet.\n    ");
    }
    function addFunction(funcNode) {
        actionManager.addFun(funcNode.params.map(function (x) {
            var props = getTripleProp(x);
            return {
                name: props[1],
                type: "obj"
            };
        }));
        if (funcNode.id) {
            // Skip Anonymous Function
            nameManager.registerName(funcNode.id.name, "fun");
        }
        actionManager.addFunBody();
        processNodesAndHandlePostProcess(funcNode.body.body);
        actionManager.addFunEnd();
        // clear the stack
        actionManager.addDiscard();
    }
    function createTempVarToWrap(values, type, names) {
        if (type === void 0) { type = undefined; }
        if (names === void 0) { names = []; }
        var tripleRep = values.map(function (x) { return getTripleProp(x, false); });
        (type = preprocessTypeValueBeforeDeclare(type || tripleRep[0][0], values[0]).type);
        if (type === "iden") {
            type = nameManager.getType(values[0]);
            assert(type != null);
        }
        addVarOp(names, tripleRep, type);
    }
    function getTest(test) {
        if (test.type === "BinaryExpression") {
            if (COMPARE_OPERATORS.includes(test.operator)) {
                return __spreadArrays(getIfProp(test.left), [
                    ["cmp", test.operator]
                ], getIfProp(test.right));
            }
            else if (test in LITERAL_TYPES) {
                return [getTripleProp(test, false)];
            }
            else {
                notImpErr(test);
            }
        }
        else if (test.type in LITERAL_TYPES) {
            return [getTripleProp(test, false)];
        }
        else if (test.type === "LogicalExpression" ||
            test.type === "BinaryExpression" ||
            test.type === "UnaryExpression") {
            return [getTripleProp(test, false)];
        }
        else if (test.type === "CallExpression") {
            // FIXME: unsure
            return [getTripleProp(test, false)];
        }
        else {
            notImpErr(test);
        }
        notImpErr(test);
    }
    function addIfTestExpression(_node) {
        actionManager.addIf(getTest(_node.test));
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
                notImpErr(_node, "Unknown expression " + _node.expression.type);
        }
    }
    function handleUpdateExpressionImmediately(_node) {
        assertStrongly(_node.operator === "++" || _node.operator === "--", _node);
        if (_node.argument.type === "MemberExpression") {
            handleAssignWithLhsMemberExpression(__assign(__assign({}, _node), { left: _node.argument, right: __assign(__assign({}, _node), { type: "BinaryExpression", operator: _node.operator[0], left: _node.argument, right: __assign(__assign({}, _node), { type: "NumericLiteral", value: 1 }) }), type: "AssignmentExpression" }));
            return;
        }
        assertStrongly(_node.argument.type === "Identifier", _node);
        actionManager.addOp(_node.operator[0], ["iden", _node.argument.name], ["num", 1, _node.start]);
        addReassignOp({
            lhs: ["iden", _node.argument.name],
            rhs: ["ans", null]
        });
    }
    function handleUpdateExpression(_node) {
        // Use _done flag to avoid execute update multiple times
        // because getTripleProp may invoke this node from different ancester.
        // I may need to cache getTripleProp
        if (_node._done) {
            return;
        }
        _node._done = true;
        if (_node.prefix) {
            handleUpdateExpressionImmediately(_node);
        }
        else {
            postProcess.push(function () {
                handleUpdateExpressionImmediately(_node);
            });
        }
    }
    function handleCallExpression(_node) {
        if (_node.callee.type === "Identifier") {
            actionManager.addCall(_node.callee.name, _node.arguments.map(function (x) { return getTripleProp(x, false); }));
        }
        else if (_node.callee.object.name === "console") {
            var isShinkable = true;
            var n = _node.arguments.length;
            for (var j_1 = 0; j_1 < n; j_1++) {
                var name_4 = _node.arguments[j_1].name;
                if (!nameManager.namesOnlyUsedOnce.has(name_4) ||
                    ans[ans.length - n + j_1].names[0] !== name_4 ||
                    (ans[ans.length - n + j_1].op !== 'var' && ans[ans.length - n + j_1].op !== 'name')) {
                    isShinkable = false;
                    break;
                }
            }
            if (isShinkable) {
                // Remove the declaration target
                for (var j_2 = 0; j_2 < n; j_2++) {
                    if (ans[ans.length - n + j_2].op === "var") {
                        ans[ans.length - n + j_2].names = [];
                    }
                    else if (ans[ans.length - n + j_2].op === "name") {
                        ans.splice(ans.length - n + j_2, 1);
                    }
                }
            }
            else {
                createTempVarToWrap(_node.arguments);
            }
            actionManager.addPrint();
        }
        else if (_node.callee.type === "MemberExpression" &&
            _node.callee.property.name === "push") {
            assert(_node.callee.object.type === "Identifier");
            actionManager.addPush(_node.callee.object.name, _node.arguments.map(function (x) { return getTripleProp(x, false); }));
        }
        else if (_node.callee.type.endsWith("MemberExpression")) {
            // Concat
            var isConcat = true;
            var isSliceOne = false;
            var callExp = _node;
            var allArr = [];
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
            if (_node.callee.property.name === "slice" &&
                _node.arguments.length === 1 &&
                _node.arguments[0].value === 1 &&
                _node.callee.object.type === "Identifier") {
                isSliceOne = true;
            }
            if (isConcat) {
                allArr.push(callExp.name);
                actionManager.addCat(allArr.reverse());
                return;
            }
            else if (isSliceOne) {
                actionManager.addSubscript(_node.callee.object.name, ['ctnr', 'rest']);
                return;
            }
            handleUniversalCallExp(_node);
        }
        else {
            notImpErr(_node);
        }
    }
    function handleAssignmentExpression(_node) {
        if (_node.operator.length === 2) {
            // if op in {+=, -=, *=, ...}
            assertStrongly(_node.operator[1] === "=", _node);
            _node.right = {
                type: "BinaryExpression",
                operator: _node.operator[0],
                left: _node.left,
                right: _node.right
            };
            _node.operator = "=";
        }
        assertStrongly(_node.operator === "=", _node);
        if (_node.left.type === "Identifier") {
            if (_node.right.type === "FunctionExpression") {
                {
                    // Assert we have initialized the function
                    var last = actionManager.actions[actionManager.actions.length - 1];
                    if (last.op !== "var" || last.names[0] !== _node.left.name) {
                        notImpErr(_node);
                    }
                }
                addFunction(_node.right);
            }
            else {
                addReassignOp({
                    lhs: ["iden", _node.left.name],
                    rhs: getTripleProp(_node.right, true)
                });
            }
        }
        else if (_node.left.type === "MemberExpression") {
            handleAssignWithLhsMemberExpression(_node);
        }
        else {
            assertStrongly(false, _node, "Assignment with left hand side of type that is nor Identifier nor MemberExpression");
        }
    }
    function handleAssignWithLhsMemberExpression(_node) {
        var lhsName = undefined;
        if (_node.left.object.type === "MemberExpression") {
            // Cases like: `a['b']['c'] = 5`
            process(_node.left.object);
            lhsName = nameManager.getNextTmpName();
            addNamingOp([lhsName]);
        }
        tryTurnThisExpressionToIdentifier(_node.left.object);
        if (_node.left.object.type !== "Identifier" && !lhsName) {
            notImpErr(_node);
        }
        var lhs = lhsName ? ["iden", lhsName] : ["iden", _node.left.object.name];
        if (_node.left.property.type === "BinaryExpression" &&
            _node.left.property.operator === "-" &&
            _node.left.property.right.value === 1) {
            // Cases such as: a[b - 1], a[9 - 1]
            var lhssubs = getTripleProp(_node.left.property.left, false);
            addReassignOp({
                lhs: lhs,
                lhssubs: lhssubs,
                rhs: getTripleProp(_node.right, true)
            });
        }
        else if (_node.left.property.type === "StringLiteral") {
            // Cases like: a['123']
            addReassignOp({
                lhs: lhs,
                lhssubs: ["lit", "\"" + _node.left.property.value + "\""],
                rhs: getTripleProp(_node.right, true)
            });
        }
        else if (_node.left.property.type === "NumericLiteral") {
            // Cases: a[0]
            addReassignOp({
                lhs: lhs,
                lhssubs: ["num", _node.left.property.value + 1],
                rhs: getTripleProp(_node.right, true)
            });
        }
        else if (js[_node.left.object.end] === ".") {
            addReassignOp({
                lhs: lhs,
                lhssubs: ["lit", "\"" + _node.left.property.name + "\""],
                rhs: getTripleProp(_node.right, true)
            });
        }
        else {
            // wrapJsIndexing(_node.left.property);
            // const name = getNextTmpName();
            // addNamingOp([name]);
            wrapJsIndexAssignment(getTripleProp(_node.left.object), getTripleProp(_node.left.property), getTripleProp(_node.right, false));
            // Clear the stack
            actionManager.addDiscard();
        }
    }
    function handleDeclaration(_node, defaultType) {
        if (defaultType === void 0) { defaultType = "obj"; }
        var names = [];
        for (var i_3 = 0; i_3 < _node.declarations.length; i_3++) {
            var declarator = _node.declarations[i_3];
            var name_5 = declarator.id.name;
            if (declarator.init == null) {
                addVarOp([name_5], [], defaultType);
                names.push(name_5);
            }
            else if (declarator.init.type === "NewExpression") {
                wrapJsNewExpression(declarator.init);
                addNamingOp([name_5]);
            }
            else if (declarator.init.type === "BinaryExpression" ||
                declarator.init.type === "CallExpression" ||
                declarator.init.type === "MemberExpression" ||
                declarator.init.type === "UnaryExpression" ||
                declarator.init.type === "LogicalExpression") {
                declarator.init._name = name_5;
                process(declarator.init);
                if (COMPARE_OPERATORS.includes(declarator.init.operator)) {
                    // FIXME: This is a ad-hoc fix for https://github.com/LingDong-/wenyan-lang/issues/317
                }
                else if (nameManager.has(name_5)) {
                    addReassignOp({
                        lhs: ["iden", name_5],
                        rhs: ["ans", null]
                    });
                }
                else {
                    addNamingOp([name_5]);
                }
                names.push(name_5);
            }
            else {
                var value = declarator.init.value || declarator.init.name;
                var dtype = mapType(declarator.init.type || typeof value, value);
                appendDeclaration(dtype, value, name_5);
                names.push(name_5);
                if (dtype === "fun") {
                    if (declarator.init.body.extra &&
                        declarator.init.body.extra.raw === "0") {
                        // Empty function
                        return;
                    }
                    else if (declarator.init.type === "ArrowFunctionExpression" ||
                        declarator.init.type === "FunctionExpression") {
                        addFunction(declarator.init);
                    }
                    else {
                        notImpErr(declarator);
                    }
                }
                if (dtype === "obj" && declarator.init.properties.length) {
                    // TODO: use new Syntax when object initialization is available
                    initObjectProperties(name_5, declarator.init.properties);
                }
                if (dtype === "arr" && declarator.init.elements.length) {
                    actionManager.addPush(name_5, declarator.init.elements.map(function (x) { return getTripleProp(x, false); }));
                }
            }
        }
        return names;
    }
    function initObjectProperties(name, properties) {
        for (var _i = 0, properties_1 = properties; _i < properties_1.length; _i++) {
            var property = properties_1[_i];
            addReassignOp({
                lhs: ["iden", name],
                lhssubs: ["lit", "\"" + (property.key.name || property.key.value) + "\""],
                rhs: getTripleProp(property.value, true)
            });
        }
    }
    function appendDeclaration(dtype, value, name) {
        var _a;
        var type;
        var toIgnoreValues;
        (_a = preprocessTypeValueBeforeDeclare(dtype, value), type = _a.type, toIgnoreValues = _a.toIgnoreValues, value = _a.value);
        addVarOp([name], toIgnoreValues ? [] : [[dtype, value]], type);
    }
    function preprocessTypeValueBeforeDeclare(dtype, value) {
        var type = dtype;
        var toIgnoreValues = type === "fun" || type === "arr" || type === "obj";
        if (type === "iden") {
            type = nameManager.getType(value) || "obj";
        }
        if (type === "bool") {
            type = "bol";
        }
        if (dtype === "lit") {
            type = "str";
            if (value) {
                value = "\"" + value + "\"";
            }
            else {
                toIgnoreValues = true;
            }
        }
        return { type: type, toIgnoreValues: toIgnoreValues, value: value };
    }
    function handleMemberExpression(_node) {
        var object = _node.object;
        if (_node.object.type === "CallExpression" ||
            object.type === "MemberExpression") {
            process(_node.object);
            var newVar = saveStagedToNewVar();
            object = {
                name: newVar,
                type: "Identifier"
            };
        }
        tryTurnThisExpressionToIdentifier(object);
        assertStrongly(object.type === "Identifier", _node);
        if (_node.property.type.endsWith("Expression")) {
            if (_node.property.operator === "-" && _node.property.right.value === 1) {
                // a[b - 1]
                actionManager.addSubscript(object.name, getTripleProp(_node.property.left, true));
            }
            else {
                // a[Math.floor(b * 100 - 10)]
                wrapJsSubscript(getTripleProp(object), getTripleProp(_node.property));
            }
        }
        else if (_node.property.type in LITERAL_TYPES) {
            if (_node.property.name === "length") {
                actionManager.addLength(object.name);
            }
            else if (_node.property.name != null) {
                if (_node.computed) {
                    // a[b]
                    wrapJsSubscript(getTripleProp(_node.object), getTripleProp(_node.property));
                }
                else {
                    // a.b
                    actionManager.addSubscript(object.name, ["lit", "\"" + _node.property.name + "\""]);
                }
            }
            else if (_node.property.value != null) {
                if (_node.property.type === "StringLiteral") {
                    actionManager.addSubscript(object.name, ["lit", "\"" + _node.property.value + "\""]);
                }
                else {
                    assert(_node.property.type === "NumericLiteral");
                    actionManager.addSubscript(object.name, ["num", _node.property.value + 1]);
                }
            }
            else {
                // TODO: add this part when wenyan has type assertion
                // 1. if target is string, target[index]
                // 2. if target is number, target[index + 1]
                notImpErr(_node);
            }
        }
        else {
            notImpErr(_node);
        }
    }
    function handleForStatement(_node) {
        var initName = '';
        var _isReassigned = false;
        if (_node.init && _node.init.declarations) {
            for (var _i = 0, _a = _node.init.declarations; _i < _a.length; _i++) {
                var dec = _a[_i];
                initName = dec.id.name;
                if (isReassigned(dec.id.name, _node.body)) {
                    _isReassigned = true;
                    break;
                }
            }
        }
        // whether it is in the format of `for (let i = 0; i < n; i++)`
        var shouldAddManualBreak = _isReassigned ||
            !_node.init ||
            !_node.init.declarations ||
            !_node.init.declarations.length ||
            _node.init.declarations[0].init.value !== 0 ||
            !_node.update ||
            _node.update.operator !== "++" ||
            _node.update.argument.name !== initName ||
            (_node.test &&
                (_node.test.left.name !== initName ||
                    _node.test.operator !== "<" ||
                    !(_node.test.right.type in LITERAL_TYPES)));
        var shouldInit = shouldAddManualBreak ||
            (_node.init &&
                _node.init.declarations &&
                _node.init.declarations[0] &&
                !_node.init.declarations[0].id.name.startsWith("_rand"));
        if (shouldInit && _node.init) {
            process(_node.init);
        }
        if (shouldAddManualBreak) {
            actionManager.addWhileTrue();
        }
        else if (isIteratingFromZeroToN(_node)) {
            actionManager.addWhilen(getTripleProp(_node.test.right));
        }
        else {
            notImpErr(_node);
        }
        // Test whether should break
        if (_node.test && shouldAddManualBreak) {
            breakWhenTestIsFalse(_node.test);
        }
        processNodesAndHandlePostProcess(_node.body.body);
        if (shouldInit && _node.update) {
            // Update before break test
            process(_node.update);
        }
        // update i++ immediately
        consumePostProcess();
        actionManager.addEnd();
    }
    function processNodesAndHandlePostProcess(body) {
        for (var _i = 0, body_1 = body; _i < body_1.length; _i++) {
            var subNode = body_1[_i];
            consumePostProcess();
            process(subNode);
        }
        consumePostProcess();
    }
}
exports.ast2asc = ast2asc;
//# sourceMappingURL=ast2asc.js.map