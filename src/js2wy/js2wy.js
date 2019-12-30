"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var parser_1 = require("@babel/parser");
var asc2wy_1 = require("../asc2wy");
var ast2asc_1 = require("./ast2asc");
var ascPostProcess_1 = require("./ascPostProcess");
// const GLOBAL_OBJECTS = [
//   "String",
//   "document",
//   "global",
//   "window",
//   "Math",
//   "Object",
//   "JSON",
//   "Array",
//   "Number",
// ];
//  Function names:
//
//    use handleXxxExpression when it may either push or consume the stack
//    use wrapXxxExpression as the function name when one will push the output to the stack
//    use consumeXxxExpression when it will consume the stack
function js2wy(jsStr) {
    var asc = js2asc(jsStr);
    return asc2wy_1.asc2wy(asc);
}
exports.js2wy = js2wy;
function js2asc(jsStr) {
    var jsAst, asc;
    try {
        jsAst = parser_1.parse(jsStr);
    }
    catch (e) {
        e.message = "[JavaScript Grammar Error] " + e.message;
        throw e;
    }
    try {
        asc = ast2asc_1.ast2asc(jsAst, jsStr);
    }
    catch (e) {
        e.message = "[Ast2asc Error] " + e.message;
        throw e;
    }
    try {
        ascPostProcess_1.ascPostProcess(asc);
    }
    catch (e) {
        e.message = "[Post-processing error] " + e.message;
        throw e;
    }
    return asc;
}
exports.js2asc = js2asc;
exports.ast2asc = ast2asc_1.ast2asc;
//# sourceMappingURL=js2wy.js.map