import {NameManager} from "./NameManager";

type Value = [string, string|number] | [string, string|number, number];
interface Action {
    op: 'comment' | 'var' | 'reassign' | 'op+' | any,
    containers?: Value[],
    pos?: number,
    arity?: number,
    count?: number,
    iden?: Value | string[],
    type?: string,
    del?: boolean,
    container?: Value,
    fun?: Value,
    args?: {name: string, type: string}[],
    name?: string,
    names?: string[],
    values?: Value[],
    test?: Value[],
    value?: Value,
    lhs?: Value,
    iterator?: Value,
    lhssubs?: Value,
    rhs?: Value,
    error?: Value,
    pop?: boolean,
    file?: string,
}

export class ActionManager {
    actions: Action[];
    nameManager: NameManager;
    constructor(nameManager: NameManager) {
        this.actions = [];
        this.nameManager = nameManager;
    }

    addVar(names: string[]|undefined, values: Value[]|undefined, type: string) {
        const count = Math.max(names.length, values.length);
        this.actions.push({
            op: "var",
            count,
            ...(!!names && {names}),
            ...(!!values && {values}),
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

    addFun(args: {type: string, name: string}[]) {
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

    addCall(func: Value, args) {
        this.actions.push({
            op: 'call',
            fun: func,
            args
        })
    }

    addCallByName(funName: string, args, isFunctional: boolean=true) {
        if (isFunctional) {
            this.actions.push({
                op: 'call',
                fun: [
                    'iden',
                    funName
                ],
                args
            })
        } else {
            if (args.length) {
                for (const arg of args) {
                    this.actions.push({
                        op: 'temp',
                        iden: arg
                    })
                }

                this.actions.push({
                    op: 'take',
                    count: args.length
                })
            }

            this.actions.push({
                op: 'call',
                fun: [
                    'iden',
                    funName
                ]
            })
        }
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
            container: ['iden', container],
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
            container: ['iden', container],
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
            if (lhs[1] == rhs[1] && lhs[0] == rhs[0]) {
                return;
            }

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
            container: ['iden', container],
            value
        })
    }

    addLength(container: string) {
        this.actions.push({
            op: 'length',
            container: ['iden', container]
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
            containers: containers.map(x => ['iden', x])
        })
    }

    addComment(comment: string) {
        this.actions.push({
            op: "comment",
            value: ['lit', `"${comment}"`]
        })
    }

    addThrow(error: Value){
        this.actions.push({
            op: 'throw',
            error
        })
    }

    addTry() {
        this.actions.push({
            op: 'try'
        })
    }

    addCatch() {
        this.actions.push({
            op: 'catch'
        })
    }

    addCatchErr(error: Value|undefined) {
        this.actions.push({
            op: 'catcherr',
            error: error
        })
    }

    addTryEnd() {
        this.actions.push({
            op: 'tryend',
        })
    }

    addImport(file, iden: string[]) {
        this.actions.push({
            op: 'import',
            file,
            iden
        })
    }

    addDelete(lhs, lhssubs) {
        this.actions.push({
            op: 'reassign',
            lhs,
            lhssubs,
            rhs: undefined,
            del: true
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