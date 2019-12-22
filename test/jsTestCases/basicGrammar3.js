function rand(a) {
  return (a * a * a) % (1000 * a / 3);
}

var a = rand;
console.log(a(8));
console.log(a(10));