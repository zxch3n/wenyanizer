<h1 align="center"> 文言轉換器 Wenyanizer </h1>

<p align="center">

<img src="https://github.com/zxch3n/wenyanizer/workflows/Node%20CI/badge.svg"/>
<a href="https://codecov.io/gh/zxch3n/wenyanizer">
  <img src="https://codecov.io/gh/zxch3n/wenyanizer/branch/master/graph/badge.svg" />
</a>

</p>

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

# Usage

Install wenyanizer. Run

```
yarn add wenyanizer
```

Import and use it in your project

```javascript
import {js2wy} from 'wenyanizer';

// Or use it in node.js
// const {js2wy} = require('wenyanizer');

js2wy("while(true){console.log('学习')}")

// Output: '恆為是。\n    吾有一言。曰「「学习」」。\n    書之。\n云云。\n'

```



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
| `a.b = 3` | ✔ |
| new | ✔ |
| `this` keyword | ✔ |
| [Wenyan Lib](https://github.com/LingDong-/wenyan-lang/issues/290) | WIP |
| [Wenyan Nested Function Call](https://github.com/LingDong-/wenyan-lang/issues/322)  | ❌ |
| [Optimize Curried Function](https://github.com/LingDong-/wenyan-lang/issues/322)  | ❌ |
| `a[b] = 3` | ❌ |
| switch | ❌ |
| require (CommonJS) | ❌ |
| export | ❌ |
| es6 ^ | ❌ |
