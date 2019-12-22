function gen(a) {
  return a * a;
}

const v = [gen(4), gen(gen(gen(2)))];
console.log(v);