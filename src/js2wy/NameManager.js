"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LAMBDA = '甲乙丙丁戊己庚辛壬癸十二地支子丑寅卯辰巳午未申酉戌亥'.split('');
var NUMS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
var NameManager = /** @class */ (function () {
    function NameManager(ast) {
        this.map = new Map();
        this.namesOnlyUsedOnce = getNamesOnlyUsedOnce(ast.program.body);
    }
    NameManager.prototype.registerName = function (name, type) {
        if (type === void 0) { type = ""; }
        this.map.set(name, type);
    };
    NameManager.prototype.generateRandomName = function () {
        var name = LAMBDA[Math.floor(Math.random() * LAMBDA.length)];
        name += LAMBDA[Math.floor(Math.random() * LAMBDA.length)];
        while (this.map.has(name)) {
            name += NUMS[Math.floor(Math.random() * NUMS.length)];
        }
        return name;
    };
    NameManager.prototype.getNextTmpName = function (type) {
        if (type === void 0) { type = ''; }
        var name = this.generateRandomName();
        this.registerName(name, type);
        return name;
    };
    NameManager.prototype.has = function (name) {
        return this.map.has(name);
    };
    NameManager.prototype.getType = function (name) {
        return this.map.get(name);
    };
    return NameManager;
}());
exports.NameManager = NameManager;
function getNamesOnlyUsedOnce(body) {
    var counter = {};
    function count(v) {
        if (v in counter) {
            counter[v] += 1;
        }
        else {
            counter[v] = 1;
        }
    }
    function _get(node, insideTest) {
        if (insideTest === void 0) { insideTest = false; }
        if (!node || typeof node !== "object") {
            return;
        }
        if (node.type === "Identifier") {
            count(node.name);
            if (insideTest) {
                count(node.name);
                count(node.name);
            }
            return;
        }
        if (node instanceof Array) {
            for (var _i = 0, node_1 = node; _i < node_1.length; _i++) {
                var subNode = node_1[_i];
                _get(subNode, insideTest);
            }
            return;
        }
        for (var key in node) {
            var v_1 = insideTest || key === "test" || key === "arguments" || key === "update";
            // (key === "right" && node.type === "ForOfStatement");
            _get(node[key], v_1);
        }
    }
    _get(body);
    var ans = new Set();
    for (var key in counter) {
        if (counter[key] === 2) {
            ans.add(key);
        }
    }
    return ans;
}
exports.getNamesOnlyUsedOnce = getNamesOnlyUsedOnce;
//# sourceMappingURL=NameManager.js.map