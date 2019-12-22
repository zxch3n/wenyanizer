function fib(arr, n) {
  if (!n){
    return;
  }

  console.log(arr);
  var c = arr[1];
  arr[1] = arr[0] + arr[1];
  arr[0] = c;
  var temp = [1, 2, 3];
  for (var v of temp) {
    console.log(v + 4);
  }
  return fib(arr, n-1);
}

fib([0, 1], 8);