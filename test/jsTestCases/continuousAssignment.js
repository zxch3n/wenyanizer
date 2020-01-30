function a() {
    var time = (this.time = 100);
    var x = (time = time * 100);
    console.log("This.time", this.time);
    return [time, x];
}

console.log(a());