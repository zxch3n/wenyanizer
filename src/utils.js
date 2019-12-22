const UNITS = '甲乙丙丁戊己庚辛壬癸十二地支子丑寅卯辰巳午未申酉戌亥'.split('');
var NUMS = ["零","一","二","三","四","五","六","七","八","九"];

function getRandomChineseName(invalidNameSet) {
  const name = UNITS[Math.floor(Math.random() * UNITS.length)];
  while (invalidNameSet.has(name)) {
    name += NUMS[Math.floor(Math.random() * NUMS.length)];
  }
  return name;
}

module.exports.getRandomChineseName = getRandomChineseName;
