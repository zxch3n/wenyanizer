function Constructor() {
  this.a = 123;
  this.b = 234;
  this.c = 'c';
}

Constructor.prototype.yell = function(){
  console.log(this.a);
  console.log(this.b);
  console.log(this.c);
}

const c = new Constructor();
c.yell();

function Child() {
  Constructor.call(this);
  this.a = 'a';
  this.b = 'b'
}

Child.prototype = new Constructor();
Child.prototype.laugh = function(){
  console.log('hahaha');
}

const child = new Child();
child.yell();
child.laugh();