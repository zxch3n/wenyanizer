// @ts-nocheck
var assert = require("assert");
var path = require("path");
var fs = require("fs");
var parser = require("../src/parser");
var { js2wy, js2asc } = require("../src/js2wy/js2wy");
var { removeField } = require("./utils");
const logDir = path.join(__dirname, 'log');
try{fs.mkdirSync(logDir);}catch(e){}

const _log = console.log;
function runExample(name) {
  const filepath = path.join(__dirname, "../examples/" + name + ".wy");
  var txt = fs
    .readFileSync(filepath)
    .toString();
  var asc = parser.wy2asc(txt, () => {}).asc;
  var js = parser.compile("js", txt, {
    romanizeIdentifiers: true,
    logCallback: () => {},
    errorCallback: err => {
      console.trace(err);
      throw err;
    },
    resetVarCnt: true
  });

  function run(jsText) {
    let data = "";
    function newLog() {
      data += Array.prototype.join.call(arguments, "");
    }

    console.log = newLog;
    try {
      eval(jsText);
    } catch (e) {
      throw e;
    }
    console.log = _log;
    return data;
  }

  asc.forEach(removeField);
  // fs.writeFileSync(
  //   path.join(logDir, "error.gt.asc.json"),
  //   JSON.stringify(asc, null, 2),
  //   { encoding: "utf-8" }
  // );
  // fs.writeFileSync(path.join(logDir, "error.gt.wy"), txt, {
  //   encoding: "utf-8"
  // });
  const generatedWy = js2wy(js);
  const generatedJs = parser.compile("js", generatedWy, {
    romanizeIdentifiers: true,
    logCallback: () => {},
    errorCallback: err => {
      console.trace(err);
      throw err;
    },
    resetVarCnt: true
  });
  const genAsc = js2asc(js);
  genAsc.forEach(removeField);
  fs.writeFileSync(
    path.join(logDir, "error.gen.asc.json"),
    JSON.stringify(genAsc, null, 2),
    { encoding: "utf-8" }
  );
  // fs.writeFileSync(path.join(logDir, "error.gen.wy"), generatedWy, {
  //   encoding: "utf-8"
  // });
  // fs.writeFileSync(path.join(logDir, "error.gt.js"), js, {
  //   encoding: "utf-8"
  // });
  // fs.writeFileSync(path.join(logDir, "error.gen.js"), generatedJs, {
  //   encoding: "utf-8"
  // });
  const groundTruth = run(js);
  const pred = run(generatedJs);
  assert.equal(pred, groundTruth);
}


describe("Js => Wenyan; Wenyan examples test", () => {
  var files = fs.readdirSync(path.join(__dirname, "../examples/"));
  for (var i = 0; i < files.length; i++) {
    const name = files[i].split(".")[0];
    it (`should convert wenyan back to js [${name}]`, () => {
      runExample(name);
    })
  }
})