for (let i = 0; i < 10; i++) {
  while(true) {
    i++;
    if (i % 4 === 0){
      break;
    }

    console.log(i);
  }

  console.log(i % 2);
}