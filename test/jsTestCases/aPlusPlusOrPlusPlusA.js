var a = 0;
console.log(a++);
console.log(++a);
console.log(a);
var b = [0, 1]
b[++b[0]]--;
console.log(++b[0]);
console.log(JSON.stringify(b));
b[b[0]--]--;
console.log(JSON.stringify(b));