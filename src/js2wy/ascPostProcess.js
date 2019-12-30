"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function ascPostProcess(asc) {
    function getIdenOnlyUsedOnce() {
        var count = {};
        function add(name) {
            if (count[name] == null) {
                count[name] = 1;
            }
            else {
                count[name]++;
            }
        }
        for (var _i = 0, asc_1 = asc; _i < asc_1.length; _i++) {
            var node = asc_1[_i];
            for (var key in node) {
                if (node[key] && node[key][0] === "iden") {
                    add(node[key][1]);
                }
            }
        }
        var ans = new Set();
        for (var key in count) {
            if (count[key] === 1) {
                ans.add(key);
            }
        }
        return ans;
    }
    function findIgnorableIdentifier(op) {
        for (var key in op) {
            if (op[key] &&
                op[key][0] === "iden" &&
                namesOnlyUsedOnce.has(op[key][1])) {
                return op[key][1];
            }
        }
        return undefined;
    }
    function replaceIgnorableIden(op, name, newData) {
        for (var key in op) {
            if (op[key][0] === "iden" && op[key][1] === name) {
                op[key] = newData;
                return op;
            }
        }
        throw new Error();
    }
    var namesOnlyUsedOnce = getIdenOnlyUsedOnce();
    for (var i_1 = 1; i_1 < asc.length; i_1++) {
        var ignorable = findIgnorableIdentifier(asc[i_1]);
        if (ignorable == null) {
            continue;
        }
        if (asc[i_1 - 1].op === "var" &&
            asc[i_1 - 1].values.length === 1 &&
            asc[i_1 - 1].names.length === 1 &&
            asc[i_1 - 1].names[0] === ignorable) {
            replaceIgnorableIden(asc[i_1], ignorable, asc[i_1 - 1].values[0]);
            asc.splice(i_1 - 1, 1);
            i_1--;
        }
    }
}
exports.ascPostProcess = ascPostProcess;
//# sourceMappingURL=ascPostProcess.js.map