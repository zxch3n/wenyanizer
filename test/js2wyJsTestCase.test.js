// @ts-nocheck
var assert = require("assert");
var path = require("path");
var fs = require("fs");
var { js2wy, js2asc } = require("../src/js2wy/js2wy");
const logDir = path.join(__dirname, "log");
try {
  fs.mkdirSync(logDir);
// eslint-disable-next-line no-empty
} catch (e) {}
var parser = require("@wenyanlang/core");
function wy2asc(txt) {
  function ass(msg, pos, b) {
    if (!b) console.error(`ERROR@${pos}: ${msg}`);
  }

  const tokens = parser.wy2tokens(txt, ass);
  return parser.tokens2asc(tokens, ass);
}

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
      console.trace(e);
      data = e.toString();
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
    genJs = parser.compile(genWy, {
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
    assert.equal(gen, gt);
  } catch (e) {
    throw e;
  }
}

describe("Js => Wenyan; Js converting test (Js to Wenyan to Js)", () => {
  var files = fs.readdirSync(path.join(__dirname, "./jsTestCases/"));
  for (var i = 0; i < files.length; i++) {
    const file = path.join(__dirname, "jsTestCases", files[i]);
    if (files[i] !== 'sudoku.js') continue;
    it(`should convert correctly [${files[i]}]`, () => {
      runTestCase(file);
    });
  }
});
