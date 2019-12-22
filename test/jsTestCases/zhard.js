const b = {}
const a = Object.assign(
  {}, 
  {
    a: [2, 3, 4, {
      b: b
    }]
  }
);

b['a'] = [4, 1];
console.log(JSON.stringify(a));