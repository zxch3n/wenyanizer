const LAMBDA = '甲乙丙丁戊己庚辛壬癸十二地支子丑寅卯辰巳午未申酉戌亥'.split('');
const NUMS = ["零","一","二","三","四","五","六","七","八","九"];

export class NameManager {
    map: Map<string, string>;
    constructor() {
        this.map = new Map();
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
        this.registerName(name, type)
        return name;
    }

    has(name: string) {
        return this.map.has(name);
    }

    getType(name: string) {
        return this.map.get(name);
    }
}