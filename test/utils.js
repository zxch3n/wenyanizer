// @ts-nocheck
function removeDataSuffix(node) {
    if (!(node instanceof Array) || node[0] !== "data") {
        return;
    }

    node[1] = node[1].replace(/[。\n]+$/, "");
}

function roundNum(v) {
    if (v instanceof Array && v[0] === 'num') {
        v[1] = parseFloat(v[1]).toFixed(3);
    }
}

function removeField(elem) {
    elem.pos = undefined;
    const fields = ["test", "lhs", "rhs", "values", "args", "value", "lhssubs", 'fun', 'containers', 'container',
        'iden', 'test', 'error', 'rhssubs'];
    if (elem.op === 'prop') {
        elem.type = undefined;
        delete elem.type;
    }

    for (const field of fields) {
        if (!(field in elem)) {
            continue;
        }

        if (field === 'lhs' || field === 'rhs') {
            roundNum(elem[field])
        }

        if (field === 'args' || field === 'test') {
            elem[field].forEach(x => roundNum(x));
        }

        if (elem[field] instanceof Array) {
            if (elem[field].length >= 2 && !(elem[field][0] instanceof Array)) {
                if (typeof elem[field][1] === 'string' && elem[field][1].includes(',')) {
                    elem[field][1] = elem[field][1].split(',')[1];
                }

                elem[field].splice(2, 1);
                removeDataSuffix(elem[field]);
                continue;
            }

            if (elem[field][0] instanceof Array) {
                for (const container of elem[field]) {
                    if (typeof container[1] === 'string' && container[1].includes(',')) {
                        container[1] = container[1].split(',')[1];
                    }

                    container.splice(2, 1);
                }
            }

            for (const value of elem[field]) {
                if (value instanceof Array && value.length >= 2) {
                    removeDataSuffix(value);
                    value.splice(2, 1);
                }
            }
        }
    }

    if (elem.value && elem.value[0] === 'ans') {
        elem.value = ['ans'];
    }
}

module.exports.removeField = removeField;
