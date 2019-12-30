function ascPostProcess(asc) {
    function getIdenOnlyUsedOnce() {
        const count = {};
        function add(name) {
            if (count[name] == null) {
                count[name] = 1;
            } else {
                count[name]++;
            }
        }

        for (const node of asc) {
            for (const key in node) {
                if (node[key] && node[key][0] === "iden") {
                    add(node[key][1]);
                }
            }
        }

        const ans = new Set();
        for (const key in count) {
            if (count[key] === 1) {
                ans.add(key);
            }
        }

        return ans;
    }

    function findIgnorableIdentifier(op) {
        for (const key in op) {
            if (
                op[key] &&
                op[key][0] === "iden" &&
                namesOnlyUsedOnce.has(op[key][1])
            ) {
                return op[key][1];
            }
        }

        return undefined;
    }

    function replaceIgnorableIden(op, name, newData) {
        for (const key in op) {
            if (op[key][0] === "iden" && op[key][1] === name) {
                op[key] = newData;
                return op;
            }
        }

        throw new Error();
    }

    const namesOnlyUsedOnce = getIdenOnlyUsedOnce();
    for (let i = 1; i < asc.length; i++) {
        const ignorable = findIgnorableIdentifier(asc[i]);
        if (ignorable == null) {
            continue;
        }

        if (
            asc[i - 1].op === "var" &&
            asc[i - 1].values.length === 1 &&
            asc[i - 1].names.length === 1 &&
            asc[i - 1].names[0] === ignorable
        ) {
            replaceIgnorableIden(asc[i], ignorable, asc[i - 1].values[0]);
            asc.splice(i - 1, 1);
            i--;
        }
    }
}


module.exports.ascPostProcess = ascPostProcess;
