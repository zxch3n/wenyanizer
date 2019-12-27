for (var i = -100, j = 0; i < 40 && j < 20; i += j, j+=2){
  console.log(i, j);
}

for (i = 10, j = i; j < 20; j+=.2){
  console.log(j);
}

for (;i < 80; i+=2) {
  console.log(i);
}

for (i=0;;) {
  if((i+=1) > 100) {
    break;
  }

  console.log(i);
  break;
}

for (;;) {
  console.log('123');
  break;
}