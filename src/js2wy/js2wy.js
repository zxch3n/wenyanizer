const { parse } = require("@babel/parser");
const { asc2wy } = require("../asc2wy");
const { ast2asc } = require('./ast2asc');
const { ascPostProcess } = require('./ascPostProcess');
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
  const asc = js2asc(jsStr);
  return asc2wy(asc);
}

function js2asc(jsStr) {
  var jsAst, asc;
  try {
    jsAst = parse(jsStr);
  } catch (e) {
    e.message = "[JavaScript Grammar Error] " + e.message;
    throw e;
  }

  try {
    asc = ast2asc(jsAst, jsStr);
  } catch (e) {
    e.message = "[Ast2asc Error] " + e.message;
    throw e;
  }

  try {
    ascPostProcess(asc);
  } catch (e) {
    e.message = "[Post-processing error] " + e.message;
    throw e;
  }

  return asc;
}


module.exports.js2wy = js2wy;
module.exports.ast2asc = ast2asc;
module.exports.js2asc = js2asc;
