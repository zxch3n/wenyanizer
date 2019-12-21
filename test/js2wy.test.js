var assert = require("assert");
var path = require("path");
var fs = require("fs");
var parser = require("../src/parser");
var { js2wy, js2asc } = require("../src/js2wy");
var { removeField } = require("./utils");

const _log = console.log;
function runExample(name) {
  console.log("======");
  console.log(name);
  console.log("======");
  var txt = fs
    .readFileSync(path.join(__dirname, "../examples/" + name + ".wy"))
    .toString();
  var asc = parser.wy2asc(txt, () => {}).asc;
  var js = parser.compile("js", txt, {
    romanizeIdentifiers: true,
    logCallback: () => {},
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
      console.log("Run Error");
      throw e;
    }
    console.log = _log;
    return data;
  }

  asc.forEach(removeField);
  fs.writeFileSync(
    path.join(__dirname, "error.gt.asc.json"),
    JSON.stringify(asc, null, 2),
    { encoding: "utf-8" }
  );
  fs.writeFileSync(path.join(__dirname, "error.gt.wy"), txt, {
    encoding: "utf-8"
  });
  const generatedWy = js2wy(js);
  const generatedJs = parser.compile("js", generatedWy, {
    romanizeIdentifiers: true,
    logCallback: () => {},
    resetVarCnt: true
  });
  const genAsc = js2asc(js);
  genAsc.forEach(removeField);
  fs.writeFileSync(
    path.join(__dirname, "error.gen.asc.json"),
    JSON.stringify(genAsc, null, 2),
    { encoding: "utf-8" }
  );
  fs.writeFileSync(path.join(__dirname, "error.gen.wy"), generatedWy, {
    encoding: "utf-8"
  });
  fs.writeFileSync(path.join(__dirname, "error.gt.js"), js, {
    encoding: "utf-8"
  });
  fs.writeFileSync(path.join(__dirname, "error.gen.js"), generatedJs, {
    encoding: "utf-8"
  });
  _log("====");
  const groundTruth = run(js);
  const pred = run(generatedJs);
  assert.equal(pred, groundTruth);
}

function testAstConverting(name) {
  var txt = fs
    .readFileSync(path.join(__dirname, "../examples/" + name + ".wy"))
    .toString();
  var js = parser.compile("js", txt, {
    romanizeIdentifiers: true,
    logCallback: () => {}
  });
  const asc = parser.wy2asc(txt, () => {}).asc;
  const genAsc = js2asc(js);
  asc.forEach(removeField);
  genAsc.forEach(removeField);
  try {
    assert.deepStrictEqual(genAsc, asc);
  } catch (e) {
    fs.writeFileSync(
      path.join(__dirname, "error.gt.token.json"),
      JSON.stringify(parser.wy2tokens(txt), null, 2),
      { encoding: "utf-8" }
    );

    fs.writeFileSync(path.join(__dirname, "error.gt.js"), js, {
      encoding: "utf-8"
    });

    fs.writeFileSync(
      path.join(__dirname, "error.eval.asc.json"),
      JSON.stringify(genAsc, null, 2),
      { encoding: "utf-8" }
    );
    fs.writeFileSync(
      path.join(__dirname, "error.gt.asc.json"),
      JSON.stringify(asc, null, 2),
      { encoding: "utf-8" }
    );
    throw e;
  }
}

function runAll() {
  var files = fs.readdirSync(path.join(__dirname, "../examples/"));
  for (var i = 0; i < files.length; i++) {
    const name = files[i].split(".")[0];
    try {
      runExample(name);
    } catch (e) {
      throw e;
      testAstConverting(name);
    }
  }
}

// runExample("py","quicksort")
runAll();
