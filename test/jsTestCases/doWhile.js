var a = 10;
while (a > 5) {
  a = a - 3;
  console.log(a);
}

do {
  console.log(a)
  a -= 1;
  a *= 1.1;
  if (a < 0) {
    break;
  }
} while(true)