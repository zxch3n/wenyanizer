var a = {b: 2};
var c = 'b';
a.vvv = 100;
a[c] = 3;
console.log(a['b'], a[c]);