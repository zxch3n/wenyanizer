function A(arg){
    this.arg = arg;
}

const a = new A(123);
console.log(JSON.stringify(a));
