// @ts-nocheck
function removeDataSuffix(node) {
  if (!(node instanceof Array) || node[0] !== "data") {
    return;
  }

  node[1] = node[1].replace(/[。\n]+$/, "");
}

function removeField(elem) {
  elem.pos = undefined;
  const fields = ["test", "lhs", "rhs", "values", "args", "value", "lhssubs"];
  for (const field of fields) {
    if (!(field in elem)) {
      continue;
    }

    if (elem[field].length === 3 && !(elem[field][0] instanceof Array)) {
      elem[field].splice(2, 1);
      removeDataSuffix(elem[field]);
      continue;
    }

    for (const value of elem[field]) {
      if (value instanceof Array && value.length === 3) {
        removeDataSuffix(value);
        value.splice(2, 1);
      } else {
      }
    }
  }
}

module.exports.removeField = removeField;
