import {NameManager} from "./NameManager";

type Value = [string, string|number] | [string, string|number, number];
interface Action {
    op: 'comment' | 'var' | 'reassign' | 'op+' | any,
    containers?: string[],
    pos?: number,
    arity?: number,
    count?: number,
    type?: string,
    container?: string,
    fun?: string,
    args?: Value[],
    name?: string,
    names?: string[],
    values?: Value[],
    test?: Value[],
    value?: Value,
    lhs?: Value,
    iterator?: Value,
    lhssubs?: Value,
    rhs?: Value,
}

export class ActionManager {
    actions: Action[];
    nameManager: NameManager;
    constructor(nameManager: NameManager) {
        this.actions = [];
        this.nameManager = nameManager;
    }

    addVar(names: string[], values: Value[], type: string) {
        const count = Math.max(names.length, values.length);
        this.actions.push({
            op: "var",
            count,
            names,
            values,
            type,
        })
    }

    getActions() {
        return this.actions;
    }

    addWhileTrue() {
        this.actions.push({
            op: 'whiletrue'
        })
    }

    addFun(args: Value[]) {
        this.actions.push({
            op: "fun",
            arity: args.length,
            args,
        });
    }

    addBreak() {
        this.actions.push({
            op: 'break'
        })
    }

    addElse() {
        this.actions.push({
            op: 'else'
        })
    }

    addReturn(value) {
        if (value != null) {
            this.actions.push({
                op: 'return',
                value
            });
            return;
        }

        this.actions.push({
            op: 'return',
        });
    }

    addNot(value) {
        this.actions.push({
            op: 'not',
            value
        })
    }

    addFunBody() {
        this.actions.push({
            op: 'funbody'
        })
    }

    addFunEnd() {
        this.actions.push({
            op: 'funend'
        })
    }

    addCall(fun, args, ) {
        this.actions.push({
            op: 'call',
            fun,
            args
        })
    }

    addOp(op, lhs, rhs, name=undefined) {
        if (name != null) {
            this.actions.push({
                op: 'op' + op,
                lhs,
                rhs,
                name
            });

            return;
        }
        this.actions.push({
            op: 'op' + op,
            lhs,
            rhs
        })
    }

    addPrint() {
        this.actions.push({
            op: 'print'
        })
    }

    addPush(container: string, values: Value[]) {
        this.actions.push({
            op: 'push',
            container,
            values
        })
    }

    addDiscard() {
        this.actions.push({
            op: 'discard'
        })
    }

    addIf(test) {
        this.actions.push({
            op: 'if',
            test
        })
    }

    addFor(container: string, iterator: Value) {
        this.actions.push({
            op: 'for',
            container,
            iterator
        })
    }

    addEnd() {
        this.actions.push({
            op: 'end'
        })
    }

    addReassign(lhs, rhs, lhssubs: undefined|Value=undefined) {
        if (lhssubs == null) {
            this.actions.push({
                op: 'reassign',
                lhs,
                rhs
            });

            return;
        }

        this.actions.push({
            op: 'reassign',
            lhs,
            rhs,
            lhssubs
        })
    }

    addName(names: string[]) {
        this.actions.push({
            op: 'name',
            names
        })
    }

    addSubscript(container: string, value: Value) {
        this.actions.push({
            op: 'subscript',
            container,
            value
        })
    }

    addLength(container: string) {
        this.actions.push({
            op: 'length',
            container
        })
    }

    addWhilen(value: Value) {
        this.actions.push({
            op: 'whilen',
            value
        })
    }

    addCat(containers: string[]) {
        this.actions.push({
            op: 'cat',
            containers
        })
    }

    addComment(comment: string) {
        this.actions.push({
            op: "comment",
            value: ['lit', `"${comment}"`]
        })
    }

    tryToCompress(name) {
        if (!this.nameManager.namesOnlyUsedOnce.has(name)) {
            return false;
        }

        const last = this.actions[this.actions.length - 1];
        if (last.op === "var" && last.names[last.names.length - 1] === name) {
            last.names.splice(last.names.length - 1, 1);
            return true;
        }

        if (
            last.op === "reassign" &&
            last.lhs[1] === name &&
            last.lhssubs == null
        ) {
            this.actions.splice(this.actions.length - 1, 1);
            return true;
        }

        if (
            last.op === "name" &&
            last.names.length === 1 &&
            last.names[0] === name
        ) {
            this.actions.splice(this.actions.length - 1, 1);
            return true;
        }

        return false;
    }
}