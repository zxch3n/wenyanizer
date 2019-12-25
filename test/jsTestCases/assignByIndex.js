var a = [[], [1, 2], [3, 4], [5, 6]]
a[1][0] = 4;
var b = 2;
a[b][1] = 0;
console.log(JSON.stringify(a));