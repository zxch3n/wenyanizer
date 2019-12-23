<h1 align="center"> 文言轉換器 Wenyanizer </h1>

<p align="center">
  <img width="400px" src="https://i.postimg.cc/SRkkVjKx/code.png"/>
  <img width="400px" src="https://i.postimg.cc/WzDfdfj6/image.png"/>
</p>

[/ 
function wenyanize(js){
	var ast = parse(js);
  	var asc = ast2asc(ast);
  	var wy = asc2wy(asc);
  	return wy;
}
/]:#()

[/ 
吾有一術。名之曰「文言轉換」
欲行是術。必先得一物。曰「覺誒斯」。
乃行是術曰。
    施「語法分析」於「覺誒斯」。名之曰「抽象語法樹」。
    施「樹鏈轉換」於「抽象語法樹」。名之曰「抽象語法鏈」。
    施「定稿」於「抽象語法鏈」。名之曰「文言」。
    乃得「文言」
是謂「文言轉換」之術也。
/]:#()

# [Play Online](http://zxch3n.github.io/wenyanizer)


<p align="center">
  <a href="http://zxch3n.github.io/wenyanizer"><img src="https://i.postimg.cc/QC4ymZ1z/image.png"/></a>
</p>

# Roadmap

| Name | Status |
|:-----------------|:-------|
| JS Code Compiled From Wenyan | ✔    |
| Closure      | ✔    |
| Control: While/For/If/Else      | ✔    |
| Object `var a = {a: 0, b: 1, c: 2}`  |  ✔  |
| Array      | ✔    |
| Wraping global object when necessary, such as `Math`, `JSON`  | ✔    |
| `console.log` | ✔  |
| `a[b] = 3` | ❌ |
| Wenyan Lib | ❌ |
| switch | ❌ |
| `this` keyword | ❌ |
| require (CMD) | ❌ |
| export | ❌ |
| es6 ^ | ❌ |
