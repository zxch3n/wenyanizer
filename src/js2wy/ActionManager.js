"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ActionManager = /** @class */ (function () {
    function ActionManager(nameManager) {
        this.actions = [];
        this.nameManager = nameManager;
    }
    ActionManager.prototype.addVar = function (names, values, type) {
        var count = Math.max(names.length, values.length);
        this.actions.push({
            op: "var",
            count: count,
            names: names,
            values: values,
            type: type,
        });
    };
    ActionManager.prototype.getActions = function () {
        return this.actions;
    };
    ActionManager.prototype.addWhileTrue = function () {
        this.actions.push({
            op: 'whiletrue'
        });
    };
    ActionManager.prototype.addFun = function (args) {
        this.actions.push({
            op: "fun",
            arity: args.length,
            args: args,
        });
    };
    ActionManager.prototype.addBreak = function () {
        this.actions.push({
            op: 'break'
        });
    };
    ActionManager.prototype.addElse = function () {
        this.actions.push({
            op: 'else'
        });
    };
    ActionManager.prototype.addReturn = function (value) {
        if (value != null) {
            this.actions.push({
                op: 'return',
                value: value
            });
            return;
        }
        this.actions.push({
            op: 'return',
        });
    };
    ActionManager.prototype.addNot = function (value) {
        this.actions.push({
            op: 'not',
            value: value
        });
    };
    ActionManager.prototype.addFunBody = function () {
        this.actions.push({
            op: 'funbody'
        });
    };
    ActionManager.prototype.addFunEnd = function () {
        this.actions.push({
            op: 'funend'
        });
    };
    ActionManager.prototype.addCall = function (fun, args) {
        this.actions.push({
            op: 'call',
            fun: fun,
            args: args
        });
    };
    ActionManager.prototype.addOp = function (op, lhs, rhs, name) {
        if (name === void 0) { name = undefined; }
        if (name != null) {
            this.actions.push({
                op: 'op' + op,
                lhs: lhs,
                rhs: rhs,
                name: name
            });
            return;
        }
        this.actions.push({
            op: 'op' + op,
            lhs: lhs,
            rhs: rhs
        });
    };
    ActionManager.prototype.addPrint = function () {
        this.actions.push({
            op: 'print'
        });
    };
    ActionManager.prototype.addPush = function (container, values) {
        this.actions.push({
            op: 'push',
            container: container,
            values: values
        });
    };
    ActionManager.prototype.addDiscard = function () {
        this.actions.push({
            op: 'discard'
        });
    };
    ActionManager.prototype.addIf = function (test) {
        this.actions.push({
            op: 'if',
            test: test
        });
    };
    ActionManager.prototype.addFor = function (container, iterator) {
        this.actions.push({
            op: 'for',
            container: container,
            iterator: iterator
        });
    };
    ActionManager.prototype.addEnd = function () {
        this.actions.push({
            op: 'end'
        });
    };
    ActionManager.prototype.addReassign = function (lhs, rhs, lhssubs) {
        if (lhssubs === void 0) { lhssubs = undefined; }
        if (lhssubs == null) {
            this.actions.push({
                op: 'reassign',
                lhs: lhs,
                rhs: rhs
            });
            return;
        }
        this.actions.push({
            op: 'reassign',
            lhs: lhs,
            rhs: rhs,
            lhssubs: lhssubs
        });
    };
    ActionManager.prototype.addName = function (names) {
        this.actions.push({
            op: 'name',
            names: names
        });
    };
    ActionManager.prototype.addSubscript = function (container, value) {
        this.actions.push({
            op: 'subscript',
            container: container,
            value: value
        });
    };
    ActionManager.prototype.addLength = function (container) {
        this.actions.push({
            op: 'length',
            container: container
        });
    };
    ActionManager.prototype.addWhilen = function (value) {
        this.actions.push({
            op: 'whilen',
            value: value
        });
    };
    ActionManager.prototype.addCat = function (containers) {
        this.actions.push({
            op: 'cat',
            containers: containers
        });
    };
    ActionManager.prototype.addComment = function (comment) {
        this.actions.push({
            op: "comment",
            value: ['lit', "\"" + comment + "\""]
        });
    };
    ActionManager.prototype.tryToCompress = function (name) {
        if (!this.nameManager.namesOnlyUsedOnce.has(name)) {
            return false;
        }
        var last = this.actions[this.actions.length - 1];
        if (last.op === "var" && last.names[last.names.length - 1] === name) {
            last.names.splice(last.names.length - 1, 1);
            return true;
        }
        if (last.op === "reassign" &&
            last.lhs[1] === name &&
            last.lhssubs == null) {
            this.actions.splice(this.actions.length - 1, 1);
            return true;
        }
        if (last.op === "name" &&
            last.names.length === 1 &&
            last.names[0] === name) {
            this.actions.splice(this.actions.length - 1, 1);
            return true;
        }
        return false;
    };
    return ActionManager;
}());
exports.ActionManager = ActionManager;
//# sourceMappingURL=ActionManager.js.map