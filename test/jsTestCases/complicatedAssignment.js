var a = [1, 2, 3];
var b = {
  c: {
    d: {
      a: a
    }
  }
}

// a[1] = a[0]
// a => [1, 1, 3]
a[Math.sqrt(b.c.d.a[0])] = b.c.d.a[1];
console.log(a[0], a[1], a[2]);