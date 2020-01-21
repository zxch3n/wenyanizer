import {ActionManager} from "./ActionManager";
import {NameManager } from './NameManager';

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

/**
 * Convert JS AST to Wenyan Lang ASC
 *
 * @param {Ast} ast
 * @param {string} js
 */
export function ast2asc(ast, js) {
    const nameManager = new NameManager(ast);
    const signatureCache = {};
    const nodes = ast.program.body;
    const NEW_SIGNATURE = "JS_NEW()";
    const NEW_FUNC_NAME = "造物";
    // const INDEX_SIGNATURE = "JS_INDEX()";
    const INDEX_FUNC = "求索";
    const INDEX_ASSIGN_SIGNATURE = "JS_INDEX_ASSIGN()";
    const INDEX_ASSIGN_FUNC = "賦值";
    const JS_SUBSCRIPT = "JsSubscript()";
    const JS_SUBSCRIPT_FUN = "獲取";
    nameManager.registerName(NEW_FUNC_NAME, 'func');
    nameManager.registerName(INDEX_FUNC, 'func');
    nameManager.registerName(INDEX_ASSIGN_FUNC, 'func');
    nameManager.registerName(JS_SUBSCRIPT_FUN, 'func');
    const actionManager = new ActionManager(nameManager);
    const polyfillAM = new ActionManager(nameManager); // handle a++
    let postProcess = [];
    for (var node of nodes) {
        process(node);
        consumePostProcess();
    }

    let ans = actionManager.getActions();
    if (polyfillAM.actions.length) {
        polyfillAM.addComment('============');
        ans = polyfillAM.actions.concat(ans);
    }

    return ans;

    function consumePostProcess() {
        for (var func of postProcess) {
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
                } else {
                    process(_node.consequent);
                }

                if (_node.alternate) {
                    actionManager.addElse();
                    if (_node.alternate.body) {
                        processNodesAndHandlePostProcess(_node.alternate.body);
                    } else {
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
                assert(_node._name != null, );
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
                actionManager.addFor(
                    _node.right.name,
                    getTripleProp(_node.left, false)[1]
                );
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
            case "ArrowFunctionExpression":
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
        } else if (_node.operator === '-') {
            actionManager.addOp(
                '-',
                ['num', 0, _node.start],
                getTripleProp(_node.argument, true),
            );
        } else {
            notImpErr();
        }
    }

    function breakWhenTestIsFalse(test) {
        const v = getTripleProp(test);
        if (v[0] === "bool") {
            if (v[1]) {
                // <del> if (!true) {break} </del>
                return;
            } else {
                // <del> if (!false) </del> break
                actionManager.addBreak();
            }

            return;
        }

        actionManager.addIf( [v, ["cmp", "=="], ["num", 0]] )
        actionManager.addBreak();
        actionManager.addEnd();
    }

    function wrapBinaryExpression(_node) {
        if (isSimpleForm(_node)) {
            // TODO: remove name hotfix when op== op<= is supported officially
            actionManager.addOp(
                _node.operator,
                getTripleProp(_node.left, false),
                getTripleProp(_node.right, true),
                _node._name
            );
        } else {
            notImpErr(_node);
        }
    }

    function wrapFunctionExpression(_node) {
        // Maybe there is a better way to wrap this in future
        const name = nameManager.getNextTmpName('func');
        addVarOp([name], [], "fun");
        addFunction(_node);
        addVarOp([], [["iden", name]], "fun");
    }

    function handleArrayExpression(_node) {
        const name = _node._name || nameManager.getNextTmpName('arr');
        addVarOp([name], [], "arr");
        actionManager.addPush(
            name,
            _node.elements.map((x) => getTripleProp(x, false))
        );
        if (_node._name == null) {
            // Stage this variable
            addVarOp([], [["iden", name]], "arr");
        }
    }

    function addNamingOp(names) {
        actionManager.addName(names);

        for (const name of names) {
            nameManager.registerName(name, "obj");
        }
    }

    function addReassignOp({lhs, rhs, lhssubs = undefined}) {
        if (lhs[0] === "iden") {
            nameManager.registerName(lhs[1]);
        }

        actionManager.addReassign(lhs, rhs, lhssubs);
    }

    function addVarOp(names, values, type, polyfill = false) {
        const count = Math.max(names.length, values.length);
        for (let i = 0; i < count; i++) {
            if (names[i]) {
                assert(typeof names[i] === "string");
            }
            if (values[i]) {
                assert(values[i] instanceof Array);
                assert(values[i][0] == null || typeof values[i][0] === "string");
            }
        }

        if (polyfill) {
            polyfillAM.addVar(names, values, type);
        } else {
            actionManager.addVar(names, values, type)
        }

        for (const name of names) {
            nameManager.registerName(name, type);
        }
    }

    function saveStagedToNewVar() {
        const newName = nameManager.getNextTmpName();
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
                return [getTripleProp(_node, false)];
            }
        } else if (_node.type in LITERAL_TYPES) {
            return [getTripleProp(_node, false)];
        } else if (_node.type.endsWith("Expression")) {
            return [getTripleProp(_node, false)];
        } else {
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
                signature += "(";
                for (let i = 0; i < target.arguments.length; i++) {
                    // Chinese char may introduce error
                    // const name = "子" + LAMBDA[i];
                    const name = "_a" + i;
                    signature += `${name},`;
                    args.push(name);
                }
                signature += ")";
            } else if (target.type === 'NewExpression') {
                // FIXME
                signature += `new ${target.callee.name}(${target.arguments.map(x => getTripleProp(x, false)[1])})`;
            } else {
                notImpErr(_node);
            }
        }

        _getSignature(_node);
        let funcName;
        if (signature in signatureCache) {
            funcName = signatureCache[signature];
        } else {
            funcName = nameManager.getNextTmpName('func');
            signatureCache[signature] = funcName;
            // TODO: refactor, extract all func together
            addVarOp([funcName], [], "fun", false);
            actionManager.addFun(
                _node.arguments.map((x, index) => {
                    return {type: "obj", name: args[index]};
                }),
            );

            actionManager.addFunBody();
            actionManager.addReturn(['data', signature]);
            actionManager.addFunEnd();
        }

        actionManager.addCallByName(
            funcName,
            _node.arguments.map((x) => getTripleProp(x, false)),
            false
        );
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
        if (!(NEW_SIGNATURE in signatureCache)) {
            addVarOp([NEW_FUNC_NAME], [], "fun", true);
            polyfillAM.addFun([{type: "obj", name: "蓝图"}]);
            polyfillAM.addFunBody();

                addVarOp(['参数'], [], "arr", true);
                addVarOp(['子造物'], [], "fun", true);
                polyfillAM.addFun([{type: "obj", name: "甲"}]);
                polyfillAM.addFunBody();
                polyfillAM.addIf([
                        ['iden', '甲'],
                        ['cmp', '=='],
                        ['lit', '"乃止"']
                    ]);

                    polyfillAM.addReturn(['data', 'new 蓝图(...参数)']);
                    polyfillAM.addElse();
                    polyfillAM.addPush('参数', [['iden', '甲']]);
                    polyfillAM.addReturn(['iden', '子造物']);

                polyfillAM.addEnd();
                polyfillAM.addFunEnd();
                polyfillAM.addReturn(['iden', '子造物']);

            polyfillAM.addFunEnd();
            signatureCache[NEW_SIGNATURE] = NEW_FUNC_NAME;
        }

        actionManager.addCallByName(
            NEW_FUNC_NAME,
            [_node.callee]
                .concat(_node.arguments)
                .map((x) => getTripleProp(x, false)).concat([['lit', '"乃止"']]),
            false
        );
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
        wrapJsNativeFunction(
            JS_SUBSCRIPT,
            JS_SUBSCRIPT_FUN,
            [
                {type: "obj", name: "對象"},
                {type: "obj", name: "域"}
            ],
            "對象[域]"
        );

        actionManager.addCallByName(
            JS_SUBSCRIPT_FUN,
            [obj, field],
            false
        );
    }

    function wrapJsIndexAssignment(lhs, lhssubs, rhs) {
        wrapJsNativeFunction(
            INDEX_ASSIGN_SIGNATURE,
            INDEX_ASSIGN_FUNC,
            [
                {type: "obj", name: "對象"},
                {type: "obj", name: "域"},
                {type: "obj", name: "值"}
            ],
            "對象[域] = 值;"
        );

        actionManager.addCallByName(
            INDEX_ASSIGN_FUNC,
            [lhs, lhssubs, rhs],
            false
        );
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

            const name = nameManager.getNextTmpName();
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
            const names = handleDeclaration(_node);
            assert(names.length === 1);
            return ["iden", names[0], _node.start];
        }

        if (
            _node.type === "BinaryExpression" ||
            _node.type === "LogicalExpression" ||
            _node.type === "ObjectExpression" ||
            _node.type === "FunctionExpression" ||
            _node.type === "ArrowFunctionExpression" ||
            _node.type === "NewExpression"
        ) {
            // TODO: remove this hotfix in the future version
            if (
                _node.type === "ObjectExpression" ||
                COMPARE_OPERATORS.includes(_node.operator)
            ) {
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

                actionManager.addOp(
                    '-',
                    ['num', 0],
                    getTripleProp(_node.argument, true)
                );

                return wrap();
            } else if (_node.operator === "!") {
                actionManager.addNot(
                    getTripleProp(_node.argument, true),
                );
                return wrap();
            } else {
                notImpErr(_node);
            }
        }

        if (_node.type === "UpdateExpression") {
            handleUpdateExpression(_node);
            return getTripleProp(_node.argument);
        }

        if (_node.type === 'AssignmentExpression') {
            handleAssignmentExpression(_node);
            return getTripleProp(_node.left)
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
                return ["lit", `"${_node.value}"`, _node.start];
            }

            return ["lit", null, _node.start];
        }

        return [LITERAL_TYPES[_node.type], _node.value, _node.start];
    }

    function handleUniversalCallExp(_node) {
        if (nameManager.has(_node.callee.name)) {
            actionManager.addCallByName(
                _node.callee.name,
                _node.arguments.map((x) => getTripleProp(x, false)),
            );
        } else {
            wrapJsGlobalFunction(_node);
        }
    }

    function assertStrongly(cond, _node, msg = "") {
        if (!cond) {
            const errorSnippet = js.slice(_node.start, _node.end);
            console.log(errorSnippet);
            throw new Error(`AssertError: line ${_node.loc.start.line}, col ${_node.loc.start.column};
    \t"${errorSnippet}"
    \t${msg}
    This is weird 😣. If you see this message, it means our tests haven't covered this case. 
    Please submit an issue to help us fix it! https://github.com/zxch3n/wenyanizer/issues/new
    `);
        }
    }

    function assert(cond, msg='') {
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
        actionManager.addFun(
            funcNode.params.map((x) => {
                const props = getTripleProp(x);
                return {
                    name: props[1],
                    type: "obj"
                };
            }),
        );
        if (funcNode.id) {
            // Skip Anonymous Function
            nameManager.registerName(funcNode.id.name, "fun");
        }
        actionManager.addFunBody();
        if (funcNode.type === 'ArrowFunctionExpression') {
            if (funcNode.body.body) {
                processNodesAndHandlePostProcess(funcNode.body.body);
            } else {
                actionManager.addReturn(getTripleProp(funcNode.body));
            }
        } else {
            processNodesAndHandlePostProcess(funcNode.body.body);
        }
        actionManager.addFunEnd();
        // clear the stack
        actionManager.addDiscard();
    }

    function createTempVarToWrap(values, type = undefined, names = []) {
        const tripleRep = values.map((x) => getTripleProp(x, false));
        ({type} = preprocessTypeValueBeforeDeclare(
            type || tripleRep[0][0],
            values[0]
        ));
        if (type === "iden") {
            type = nameManager.getType(values[0]);
            assert(type != null);
        }

        addVarOp(names, tripleRep, type);
    }

    function getTest(test) {
        if (test.type === "BinaryExpression") {
            if (COMPARE_OPERATORS.includes(test.operator)) {
                return [
                    ...getIfProp(test.left),
                    ["cmp", test.operator],
                    ...getIfProp(test.right)
                ];
            } else if (test in LITERAL_TYPES) {
                return [getTripleProp(test, false)];
            } else {
                notImpErr(test);
            }
        } else if (test.type in LITERAL_TYPES) {
            return [getTripleProp(test, false)];
        } else if (
            test.type === "LogicalExpression" ||
            test.type === "BinaryExpression" ||
            test.type === "UnaryExpression"
        ) {
            return [getTripleProp(test, false)];
        } else if (test.type === "CallExpression") {
            // FIXME: unsure
            return [getTripleProp(test, false)];
        } else {
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
                notImpErr(_node, `Unknown expression ${_node.expression.type}`);
        }
    }

    function handleUpdateExpressionImmediately(_node) {
        assertStrongly(_node.operator === "++" || _node.operator === "--", _node);
        if (_node.argument.type === "MemberExpression") {
            handleAssignWithLhsMemberExpression({
                ..._node,
                left: _node.argument,
                right: {
                    ..._node,
                    type: "BinaryExpression",
                    operator: _node.operator[0],
                    left: _node.argument,
                    right: {
                        ..._node,
                        type: "NumericLiteral",
                        value: 1
                    }
                },
                type: "AssignmentExpression"
            });
            return;
        }

        assertStrongly(_node.argument.type === "Identifier", _node);
        actionManager.addOp(
            _node.operator[0],
            ["iden", _node.argument.name],
            ["num", 1, _node.start]
        );
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
        } else {
            postProcess.push(() => {
                handleUpdateExpressionImmediately(_node);
            });
        }
    }

    function handleCallExpression(_node) {
        if (_node.callee.type === "Identifier") {
            actionManager.addCallByName(
                _node.callee.name,
                _node.arguments.map((x) => getTripleProp(x, false)),
            );
        } else if (_node.callee.object && _node.callee.object.name === "console") {
            let isShinkable = true;
            const n = _node.arguments.length;
            for (let j = 0; j < n; j++) {
                const name = _node.arguments[j].name;
                if (
                    !nameManager.namesOnlyUsedOnce.has(name) ||
                    ans[ans.length - n + j].names[0] !== name ||
                    (ans[ans.length - n + j].op !== 'var' && ans[ans.length - n + j].op !== 'name')
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
            actionManager.addPrint();
        } else if (
            _node.callee.type === "MemberExpression" &&
            _node.callee.property.name === "push"
        ) {
            assert(_node.callee.object.type === "Identifier");
            actionManager.addPush(
                _node.callee.object.name,
                _node.arguments.map((x) => getTripleProp(x, false))
            );
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
                actionManager.addCat(allArr.reverse());
                return;
            } else if (isSliceOne) {
                actionManager.addSubscript(_node.callee.object.name, ['ctnr', 'rest']);
                return;
            }

            handleUniversalCallExp(_node);
        } else if (_node.callee.type === 'CallExpression') {
            // Example: nested(0)(5)
            const args = [..._node.arguments];
            let varNode = _node.callee;
            while (varNode.type === 'CallExpression') {
                args.splice(0, 0, ...varNode.arguments);
                varNode = varNode.callee;
            }

            const tempNode = Object.assign(_node, {
                callee: varNode,
                arguments: args
            });
            handleCallExpression(tempNode);
        } else if (_node.callee.type.endsWith('ArrowFunctionExpression' )) {
            const callee = getTripleProp(_node.callee, false);
            actionManager.addCall(callee, _node.arguments.map(x => getTripleProp(x, false)));
        } else {
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
                    const last = actionManager.actions[actionManager.actions.length - 1];
                    if (last.op !== "var" || last.names[0] !== _node.left.name) {
                        notImpErr(_node);
                    }
                }
                addFunction(_node.right);
            } else {
                addReassignOp({
                    lhs: ["iden", _node.left.name],
                    rhs: getTripleProp(_node.right, true)
                });
            }
        } else if (_node.left.type === "MemberExpression") {
            handleAssignWithLhsMemberExpression(_node);
        } else {
            assertStrongly(
                false,
                _node,
                "Assignment with left hand side of type that is nor Identifier nor MemberExpression"
            );
        }
    }

    function handleAssignWithLhsMemberExpression(_node) {
        let lhsName = undefined;
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

        const lhs = lhsName ? ["iden", lhsName] : ["iden", _node.left.object.name];
        if (
            _node.left.property.type === "BinaryExpression" &&
            _node.left.property.operator === "-" &&
            _node.left.property.right.value === 1
        ) {
            // Cases such as: a[b - 1], a[9 - 1]
            const lhssubs = getTripleProp(_node.left.property.left, false);
            addReassignOp({
                lhs,
                lhssubs,
                rhs: getTripleProp(_node.right, true)
            });
        } else if (_node.left.property.type === "StringLiteral") {
            // Cases like: a['123']
            addReassignOp({
                lhs,
                lhssubs: ["lit", `"${_node.left.property.value}"`],
                rhs: getTripleProp(_node.right, true)
            });
        } else if (_node.left.property.type === "NumericLiteral") {
            // Cases: a[0]
            addReassignOp({
                lhs,
                lhssubs: ["num", _node.left.property.value + 1],
                rhs: getTripleProp(_node.right, true)
            });
        } else if (js[_node.left.object.end] === ".") {
            addReassignOp({
                lhs,
                lhssubs: ["lit", `"${_node.left.property.name}"`],
                rhs: getTripleProp(_node.right, true)
            });
        } else {
            // wrapJsIndexing(_node.left.property);
            // const name = getNextTmpName();
            // addNamingOp([name]);
            wrapJsIndexAssignment(
                getTripleProp(_node.left.object),
                getTripleProp(_node.left.property),
                getTripleProp(_node.right, false)
            );
            // Clear the stack
            actionManager.addDiscard();
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
            } else if (declarator.init.type === "NewExpression") {
                wrapJsNewExpression(declarator.init);
                addNamingOp([name]);
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
                } else if (nameManager.has(name)) {
                    addReassignOp({
                        lhs: ["iden", name],
                        rhs: ["ans", null]
                    });
                } else {
                    addNamingOp([name]);
                }
                names.push(name);
            } else if (
                declarator.init.type === 'AssignmentExpression'
            ) {
                process(declarator.init);
                const newNode = Object.assign(_node, {declarations: [{...declarator, init: declarator.init.right}]});
                handleDeclaration(newNode);
            } else {
                let value = declarator.init.value;
                if (value === undefined) {
                    value = declarator.init.name;
                }

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
                    actionManager.addPush(
                        name,
                        declarator.init.elements.map((x) => getTripleProp(x, false))
                    );
                }
            }
        }

        return names;
    }

    function initObjectProperties(name, properties) {
        for (const property of properties) {
            addReassignOp({
                lhs: ["iden", name],
                lhssubs: ["lit", `"${property.key.name || property.key.value}"`],
                rhs: getTripleProp(property.value, true)
            });
        }
    }

    function appendDeclaration(dtype, value, name) {
        let type;
        let toIgnoreValues;
        ({type, toIgnoreValues, value} = preprocessTypeValueBeforeDeclare(
            dtype,
            value
        ));
        addVarOp([name], toIgnoreValues ? [] : [[dtype, value]], type);
    }

    function preprocessTypeValueBeforeDeclare(dtype, value) {
        let type = dtype;
        let toIgnoreValues = type === "fun" || type === "arr" || type === "obj";
        if (type === "iden") {
            type = nameManager.getType(value) || "obj";
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
        return {type, toIgnoreValues, value};
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

        tryTurnThisExpressionToIdentifier(object);
        assertStrongly(object.type === "Identifier", _node);
        if (_node.property.type.endsWith("Expression")) {
            if (_node.property.operator === "-" && _node.property.right.value === 1) {
                // a[b - 1]
                actionManager.addSubscript(
                    object.name,
                    getTripleProp(_node.property.left, true)
                );
            } else {
                // a[Math.floor(b * 100 - 10)]
                wrapJsSubscript(getTripleProp(object), getTripleProp(_node.property));
            }
        } else if (_node.property.type in LITERAL_TYPES) {
            if (_node.property.name === "length") {
                actionManager.addLength(object.name);
            } else if (_node.property.name != null) {
                if (_node.computed) {
                    // a[b]
                    wrapJsSubscript(
                        getTripleProp(_node.object),
                        getTripleProp(_node.property)
                    );
                } else {
                    // a.b
                    actionManager.addSubscript(object.name, ["lit", `"${_node.property.name}"`]);
                }
            } else if (_node.property.value != null) {
                if (_node.property.type === "StringLiteral") {
                    actionManager.addSubscript(object.name, ["lit", `"${_node.property.value}"`]);
                } else {
                    assert(_node.property.type === "NumericLiteral");
                    actionManager.addSubscript(object.name, ["num", _node.property.value + 1]);
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
        let initName = '';
        let _isReassigned = false;
        if (_node.init && _node.init.declarations) {
            for (const dec of _node.init.declarations) {
                initName = dec.id.name;
                if (isReassigned(dec.id.name, _node.body)) {
                    _isReassigned = true;
                    break;
                }
            }
        }

        // whether it is in the format of `for (let i = 0; i < n; i++)`
        let shouldAddManualBreak =
            _isReassigned ||
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

        const shouldInit =
            shouldAddManualBreak ||
            (_node.init &&
                _node.init.declarations &&
                _node.init.declarations[0] &&
                !_node.init.declarations[0].id.name.startsWith("_rand"));

        if (shouldInit && _node.init) {
            process(_node.init);
        }

        if (shouldAddManualBreak) {
            actionManager.addWhileTrue();
        } else if (isIteratingFromZeroToN(_node)) {
            actionManager.addWhilen(getTripleProp(_node.test.right));
        } else {
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
        for (const subNode of body) {
            consumePostProcess();
            process(subNode);
        }

        consumePostProcess();
    }
}

