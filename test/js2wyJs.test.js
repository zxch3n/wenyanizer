try{process.chdir(__dirname);}catch(e){}

var assert = require("assert");
var path = require("path");
var fs = require("fs");
var parser = require("../src/parser");
var { js2wy, js2asc } = require("../src/js2wy");

const _log = console.log;
function runTestCase(file) {
  console.log(file);
  const jsText = fs.readFileSync(file, {encoding: 'utf-8'});
  const genAsc = js2asc(jsText);
  fs.writeFileSync('error.gen.asc.json', JSON.stringify(genAsc, null, 2), {encoding: 'utf-8'});
  const genWy = js2wy(jsText);
  fs.writeFileSync('error.gen.wy', genWy, {encoding: 'utf-8'});
  const genJs = parser.compile('js', genWy, {logCallback: ()=>{}, errorCallback: (err)=>{
    console.trace(err)
    throw err;
  }});
  fs.writeFileSync('error.gen.js', genJs, {encoding: 'utf-8'});
  fs.writeFileSync('error.gt.js', jsText, {encoding: 'utf-8'});

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

  const gt = run(jsText);
  const gen = run(genJs);
  assert.equal(gt, gen);
}


function runAll() {
  var files = fs.readdirSync(path.join(__dirname, "./jsTestCases/"));
  for (var i = 0; i < files.length; i++) {
    const file = path.join(__dirname, 'jsTestCases', files[i]);
    try {
      runTestCase(file);
    } catch (e) {
      throw e;
      testAstConverting(name);
    }
  }
}

runAll();