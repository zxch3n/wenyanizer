function A() {
  this.name = '123';
}

var a = {};
A.call(a)
console.log(a.name);