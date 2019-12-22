var a = '123';
function test() {
  let a = 'a';
  const b = 'b';
  console.log(a + b);
}

console.log(a);
test();
console.log(a);