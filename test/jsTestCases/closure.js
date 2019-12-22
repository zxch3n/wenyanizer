function a(left) {
  const b = (right) => {
    console.log(left + right);
  }

  const c = function C(){
    return b;
  }

  return c();
}

const func = a(100);
func(300);