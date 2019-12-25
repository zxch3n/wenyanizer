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

# Introduction

Inspired by the great [**Wenyan Lang**](https://github.com/LingDong-/wenyan-lang) project, which compile ancient Chinese Language to javascript code, I build this project to do the opposite thing -- to **parse javascript to Wenyan**.

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

# Examples

**Basic Grammars**

```javascript
for(var _rand = 0; _rand < 100; _rand++){
    console.log("哈");
    while(true){
        var 天命 = Math.random();
        if (天命 < 0.5){
            break
        }
    }
}

// 為是一百遍。
//     吾有一言。曰「「哈」」。
//     書之。
//     恆為是。
//         吾有一術。名之曰「十」
//         欲行是術。必先得        
//         乃行是術曰。
//             乃得  Math.random()
//         是謂「十」之術也。

//         施「十」
//         名之曰「天命」。
//         若「天命」小於零又五分者。
//             乃止。
//         云云。
//     云云。
// 云云。
```

**Wrapping JS Native Function Call**

```javascript
var 测试 = JSON.stringify(100);
var 乙 = JSON.stringify({});

// 吾有一術。名之曰「午」
// 欲行是術。必先得一物。曰「_a0」。
// 乃行是術曰。
//     乃得  JSON.stringify(_a0,)
// 是謂「午」之術也。
//
// 施「午」於一百。
// 名之曰「测试」。
// 吾有一物。名之曰「丑」
// 施「午」於「丑」。
// 名之曰「乙」。
```

**Wrapping Nested Structure**

```javascript
var 甲 = 100 % 99;
var 乙 = 100 * 200 + 35 * (48 - 10) * 甲;

// 除一百以九十九。所餘幾何。
// 名之曰「甲」。
// 乘一百以二百。
// 名之曰「寅」。
// 減四十八以一十。
// 乘三十五以其。
// 名之曰「癸」。
// 乘「癸」以「甲」。
// 加「寅」以其。
// 名之曰「乙」。
```

# Hacks

Restricted by current Wenyan grammar, some hacks are required to make this compiler work. When you use grammar that is not well supported by Wenyan, there will be a bunch of functions being added to the top of compiled file.

 Wenyan is still evolving fast, thanks to the devoted author and the great community. We may not need hack anymore very soon.

 You can check the full list of polyfill in [HACKS.md](./doc/HACKS.md).

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
| `a[b] = 3` | ✔ |
| [Wenyan Lib](https://github.com/LingDong-/wenyan-lang/issues/290) | WIP |
| [Wenyan Nested Function Call](https://github.com/LingDong-/wenyan-lang/issues/322)  | ❌ |
| [Optimize Curried Function](https://github.com/LingDong-/wenyan-lang/issues/322)  | ❌ |
| switch | ❌ |
| try...catch...finally | ❌ |
| require (CommonJS) | ❌ |
| export | ❌ |
| es6 ^ | ❌ |
