// @ts-nocheck
var fs = require("fs");
var assert = require("assert");
var path = require("path");
var { asc2wy } = require("../src/asc2wy");
var { removeField } = require("./utils");
const logDir = path.join(__dirname, 'log');
try{fs.mkdirSync(logDir);}catch(e){}

var parser = require("@wenyanlang/core");
function wy2asc(txt) {
  function ass(msg, pos, b) {
    if (!b) console.error(`ERROR@${pos}: ${msg}`);
  }

  const tokens = parser.wy2tokens(txt, ass);
  return parser.tokens2asc(tokens, ass);
}


function runExample(name) {
  var txt = fs
    .readFileSync(path.join(__dirname, "../examples/" + name + ".wy"))
    .toString();
  var asc = wy2asc(txt);
  try {
    var parsed = asc2wy(asc);
    var evalAsc = wy2asc(parsed);
    asc.forEach(removeField);
    evalAsc.forEach(removeField);
    assert.deepStrictEqual(evalAsc, asc);
  } catch (e) {
    fs.writeFileSync(path.join(logDir, "error.eval.wy"), parsed, {
      encoding: "utf-8"
    });
    fs.writeFileSync(
      path.join(logDir, "error.gt.token.json"),
      JSON.stringify(parser.wy2tokens(txt), null, 2),
      { encoding: "utf-8" }
    );
    fs.writeFileSync(
      path.join(logDir, "error.gen.asc.json"),
      JSON.stringify(evalAsc, null, 2),
      { encoding: "utf-8" }
    );
    const js = parser.compile(txt, {
      logCallback: () => {}
    });
    fs.writeFileSync(path.join(logDir, "gt.js"), js, { encoding: "utf-8" });
    fs.writeFileSync(
      path.join(logDir, "error.gt.asc.json"),
      JSON.stringify(asc, null, 2),
      { encoding: "utf-8" }
    );
    throw e;
  }
}

describe("ASC => Wenyan", () => {
  var files = fs.readdirSync(path.join(__dirname, "../examples/"));
  for (var i = 0; i < files.length; i++) {
    const name = files[i].split(".")[0];
    if (name !== 'zh_sqrt') continue;
    it(`should convert ASC back to Wenyan for example [${name}]`, () => {
      runExample(name);
    });
  }
});
