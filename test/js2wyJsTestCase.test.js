var assert = require("assert");
var path = require("path");
var fs = require("fs");
var parser = require("../src/parser");
var { js2wy, js2asc } = require("../src/js2wy");
const logDir = path.join(__dirname, "log");
try {
  fs.mkdirSync(logDir);
// eslint-disable-next-line no-empty
} catch (e) {}

const _log = console.log;
function runTestCase(file) {
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

  const jsText = fs.readFileSync(file, { encoding: "utf-8" });
  // eslint-disable-next-line no-unused-vars
  var genAsc, genWy, genJs, gt, gen;
  // eslint-disable-next-line no-useless-catch
  try {
    genAsc = js2asc(jsText);
    // fs.writeFileSync('error.gen.asc.json', JSON.stringify(genAsc, null, 2), {encoding: 'utf-8'});
    genWy = js2wy(jsText);
    // fs.writeFileSync('error.gen.wy', genWy, {encoding: 'utf-8'});
    genJs = parser.compile("js", genWy, {
      logCallback: () => {},
      errorCallback: (err) => {
        console.trace(err);
        throw err;
      }
    });
    // fs.writeFileSync('error.gen.js', genJs, {encoding: 'utf-8'});
    // fs.writeFileSync('error.gt.js', jsText, {encoding: 'utf-8'});

    gt = run(jsText);
    gen = run(genJs);
    assert.equal(gt, gen);
  } catch (e) {
    throw e;
  }
}

describe("Js => Wenyan; Js converting test (Js => Wenyan => Js)", () => {
  var files = fs.readdirSync(path.join(__dirname, "./jsTestCases/"));
  for (var i = 0; i < files.length; i++) {
    const file = path.join(__dirname, "jsTestCases", files[i]);
    it(`should convert correctly [${files[i]}]`, () => {
      runTestCase(file);
    });
  }
});
