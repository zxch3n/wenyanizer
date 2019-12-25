# Hacks

## Variables as Keys

### Assignment with Var Key

[Why do we need this hack?](https://github.com/LingDong-/wenyan-lang/issues/388)

```javascript
const a = [];
const b = '123'
a[b] = 100;
```

```
吾有一術。名之曰「賦值」
欲行是術。必先得一物。曰「對象」。一物。曰「域」。一物。曰「值」。
乃行是術曰。
    乃得  對象[域] = 值;
是謂「賦值」之術也。

批曰。「「=================================」」
吾有一列。名之曰「a」
吾有一言。曰「「123」」。名之曰「b」
施「賦值」於「a」。於「b」。於一百。
噫。
```

### Get with Var Key

```javascript
const a = [0];
const c = 0;
const b = a[c]
```

```wenyan
吾有一術。名之曰「獲取」
欲行是術。必先得一物。曰「對象」。一物。曰「域」。
乃行是術曰。
    乃得  對象[域]
是謂「獲取」之術也。

批曰。「「=================================」」
吾有一列。名之曰「a」
充「a」以零。
吾有一數。曰又。名之曰「c」
施「獲取」於「a」。於「c」。
名之曰「b」。
```



## JS Native Global Obejcts

```javascript
a = Math.sin(100)
```

```
吾有一術。名之曰「甲」
欲行是術。必先得一物。曰「_a0」。
乃行是術曰。
    乃得  Math.sin(_a0,)
是謂「甲」之術也。

批曰。「「=================================」」
施「甲」於一百。
昔之「a」者。今其是矣。
```

## `new` Keyword

```javascript
function A(){}
const a = new A();
```

```wenyan
吾有一術。名之曰「造物」
欲行是術。必先得一物。曰「蓝图」。
乃行是術曰。
    乃得  new 蓝图(...Array.prototype.slice.call(arguments, 1))
是謂「造物」之術也。

批曰。「「=================================」」
吾有一術。名之曰「A」
欲行是術。必先得
乃行是術曰。
是謂「A」之術也。

施「造物」於「A」。
名之曰「a」。
```