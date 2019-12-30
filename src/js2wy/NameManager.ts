const LAMBDA = '甲乙丙丁戊己庚辛壬癸十二地支子丑寅卯辰巳午未申酉戌亥'.split('');
const NUMS = ["零","一","二","三","四","五","六","七","八","九"];

export class NameManager {
    map: Map<string, string>;
    namesOnlyUsedOnce: Set<string>;
    constructor(ast: any) {
        this.map = new Map();
        this.namesOnlyUsedOnce = getNamesOnlyUsedOnce(ast.program.body);
    }

    registerName(name, type="") {
        this.map.set(name, type);
    }

    generateRandomName() {
        let name = LAMBDA[Math.floor(Math.random() * LAMBDA.length)];
        name += LAMBDA[Math.floor(Math.random() * LAMBDA.length)];
        while (this.map.has(name)) {
            name += NUMS[Math.floor(Math.random() * NUMS.length)];
        }
        return name;
    }

    getNextTmpName(type='') {
        const name = this.generateRandomName();
        this.registerName(name, type);
        return name;
    }

    has(name: string) {
        return this.map.has(name);
    }

    getType(name: string) {
        return this.map.get(name);
    }
}

export function getNamesOnlyUsedOnce(body): Set<string> {
    const counter = {};

    function count(v) {
        if (v in counter) {
            counter[v] += 1;
        } else {
            counter[v] = 1;
        }
    }

    function _get(node, insideTest = false) {
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
            for (const subNode of node) {
                _get(subNode, insideTest);
            }

            return;
        }

        for (const key in node) {
            const v =
                insideTest || key === "test" || key === "arguments" || key === "update";
            // (key === "right" && node.type === "ForOfStatement");
            _get(node[key], v);
        }
    }

    _get(body);
    const ans = new Set<string>();
    for (const key in counter) {
        if (counter[key] === 2) {
            ans.add(key);
        }
    }

    return ans;
}

