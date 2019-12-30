import { parse } from "@babel/parser";
import { File } from "@babel/types";
import { asc2wy } from "../asc2wy";
import { ast2asc as _ast2asc } from './ast2asc';
import { ascPostProcess } from './ascPostProcess';
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

export function js2wy(jsStr) {
  const asc = js2asc(jsStr);
  return asc2wy(asc);
}

export function js2asc(jsStr) {
  let jsAst: File, asc;
  try {
    jsAst = parse(jsStr);
  } catch (e) {
    e.message = "[JavaScript Grammar Error] " + e.message;
    throw e;
  }

  try {
    asc = _ast2asc(jsAst, jsStr);
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


export const ast2asc = _ast2asc;
