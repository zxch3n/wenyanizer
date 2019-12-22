var fs = require("fs");
var assert = require("assert");
var path = require("path");
var parser = require("../src/parser");
var { asc2wy } = require("../src/asc2wy");
var { removeField } = require("./utils");
const logDir = path.join(__dirname, 'log');
try{fs.mkdirSync(logDir);}catch(e){}

function runExample(name) {
  var txt = fs
    .readFileSync(path.join(__dirname, "../examples/" + name + ".wy"))
    .toString();
  var asc = parser.wy2asc(txt, () => {}).asc;
  try {
    var parsed = asc2wy(asc);
    var evalAsc = parser.wy2asc(parsed, () => {}).asc;
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
      path.join(logDir, "error.eval.asc.json"),
      JSON.stringify(evalAsc, null, 2),
      { encoding: "utf-8" }
    );
    const js = parser.compile("js", txt, { logCallback: () => {} });
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
    it(`should convert ASC back to Wenyan for example [${name}]`, () => {
      runExample(name);
    });
  }
});
