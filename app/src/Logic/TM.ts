import { History, HistTrace, position, Step } from "./Types";
import { GraphCore, NodeCore, Move } from "./IGraphTypes";
import { PDA } from "./PDA";
import { EPS } from "./Computer";
import { NonDeterministic } from "./Exceptions";

export class TMMemory {
    private storage: string[] = ['_']
    private pointer: number = 0

    getPointer(): number {
        return this.pointer
    }

    reset(): void {
        this.storage = ['_']
        this.pointer = 0
    }

    lookUp(): string {
        return this.storage[this.pointer]
    }

    initialize(init: string[]): void {
        init.forEach(value => this.mvRight('_', value))
        this.pointer = 0
    }

    mvRight(curr: string, upd: string): void {
        if (this.storage[this.pointer] === curr) {
            this.storage[this.pointer] = upd
            this.pointer++
        }
        if (this.pointer === this.storage.length) {
            this.storage.push('_')
        }
    }

    mvLeft(curr: string, upd: string): void {
        if (this.pointer === 0) {
            if (this.storage[this.pointer] === curr) {
                this.storage[this.pointer] = upd
                this.pointer = 0
            }
            let tmp = ['_']
            this.storage.forEach(value => tmp.push(value))
            this.storage = tmp
        } else {
            if (this.storage[this.pointer] === curr) {
                this.storage[this.pointer] = upd
                this.pointer--
            }
        }
    }

    getStorage(): string[] {
        return this.storage
    }

}

export class TM extends PDA {
    public mem = new TMMemory()

    private checkMemFormat(graph: GraphCore): void {
        let isMtMem = true
        graph.edges.forEach(value => value.transitions.forEach(value1 => {
            value1.forEach(value2 => {
                if (value2.stackPush?.length && value2.stackPush?.length > 1) {
                    isMtMem = false
                }
            })
        }))
        if (!isMtMem) {
            throw Error("Not MT mem")
        }

    }

    constructor(graph: GraphCore, startStatement: NodeCore[], input: string[]) {
        super(graph, startStatement, input)
        this.checkMemFormat(graph)
        // if (!this.isDeterministic()) {
        //     throw Error ("Not deterministic")
        // }
        this.mem.initialize(input)
        this.curPosition = [{
            stmt: this.statements.get(this.startStatements[0].id)
        }]
        console.log("MTMTMTMTMTTMMTMTMT::::::::::")
    }

    private curMt(): position {
        return this.curPosition[0]
    }

    private assignCurMt(newPos: position): void {
        this.curPosition[0] = newPos
    }

    public __step = (counter: number, tr: number, histori: History[]): Step => {
        const byLetter: NodeCore[] = []
        const from = this.curPosition[0].stmt
        let mv: Move
        let by = ""
        this.cellMatrix(this.curPosition[0].stmt.idLogic, tr).forEach((value) => {
            if (value.stackDown === this.mem.lookUp()) {
                if (value.move === Move.R) {
                    this.mem.mvRight(value.stackDown, value.stackPush![0])
                    mv = value.move
                    by = value.stackDown
                }
                if (value.move === Move.L) {
                    this.mem.mvLeft(value.stackDown, value.stackPush![0])
                    mv = value.move
                    by = value.stackDown
                }
                this.assignCurMt({ stmt: this.statements.get(value.id) })
            }
        })
        
        histori.push({
            nodes: [this.nodes[this.curPosition[0].stmt.idLogic]],
            by: by
            // this.input[counter].value
        })

        counter++


        byLetter.push({
            id: this.curPosition[0].stmt.id,
            isAdmit: this.curPosition[0].stmt.isAdmit,
            by: by,
            from,
            cur: this.curPosition[0].stmt,
            move: mv!,
        })

        return {
            nodes: [this.nodes[this.curPosition[0].stmt.idLogic]],
            isAdmit: this.curPosition[0].stmt.isAdmit,
            counter: counter,
            history: histori,
            memory: this.mem.getStorage(),
            pointer: this.mem.getPointer(),
            byLetter
        }
    }

    isDeterministic(): boolean {
        let ret = true
        this.matrix.forEach((line) => line.forEach((cells) => {
            const fstCell = cells[0]
            const isEquals = (stPush0: string[] | undefined, stPush1: string[] | undefined) => {
                if (!stPush0 || !stPush1) {
                    return false
                }
                if (stPush0.length !== stPush1.length) {
                    return false
                }
                return stPush0.reduce((acc, v, index) => acc && stPush0[index] === stPush1[index], true)
            }
            const hasDublicates = cells.reduce((acc, stmt, index) =>
                index !== 0 &&
                (acc || (stmt.stackDown === fstCell.stackDown && isEquals(stmt.stackPush, fstCell.stackPush)))
                , false)

            if (cells.length > 1 && hasDublicates) {
                ret = false
            }
        }))
        return ret
    }

    restart = () => {
        this.counterSteps = 0
        this.historiStep = []
        this.curPosition = []
        this.mem.reset()
        this.curPosition = [{
            stmt: this.statements.get(this.startStatements[0].id)
        }]
    }

    mtTrun = (): Step => {
        throw Error("TM run")
    }

    setInput = (input: string[]) => {
        this.input = []
        // this.restart()
        this.mem.reset()
        this.mem.initialize(input)
        this.counterSteps = 0
        this.historiStep = []
        this.curPosition = []
        this.curPosition = [{
            stmt: this.statements.get(this.startStatements[0].id)
        }]
        console.log(this.curPosition)
    }

    mtStep = (): Step => {
        console.log("STPMT")
        let ret = this.__step
            (
                this.counterSteps,
                0,
                this.historiStep
            )
        this.counterSteps = ret.counter
        this.historiStep = ret.history
        if (ret.history[ret.history.length - 1].by === "") {
            ret.nodes = []
        }
        return {
            ...ret,
            memory: this.mem.getStorage()
        }
    }


    step = (): Step => {
        if (!this.isDeterministic()) {
            throw new NonDeterministic()
        }
        return this.mtStep()
    }

    run = (): Step => {
        if (!this.isDeterministic()) {
            throw new NonDeterministic()
        }
        return this.mtTrun()
    }


}


let nfa = new TM(
    {
        nodes: [
            { id: 1, isAdmit: false },
            { id: 2, isAdmit: false },
            // {id: 3, isAdmit: false},
            // {id: 4, isAdmit: false},

        ],
        edges: [
            { from: 1, to: 2, transitions: new Set([[{ title: EPS, stackDown: '0', stackPush: ['0'], move: Move.R }, { title: EPS, stackDown: '1', stackPush: ['1'], move: Move.R }]]) },
            // { from: 1, to: 2, transitions: new Set([[{title: EPS, stackDown: '_', stackPush: ['_'], move: Move.L} ]]) },
            // { from: 2, to: 2, transitions: new Set([[{title: EPS, stackDown: '1', stackPush: ['0'], move: Move.L} ]]) },
            // { from: 2, to: 3, transitions: new Set([[{title: EPS, stackDown: '0', stackPush: ['1'], move: Move.L} ]]) },
            // { from: 2, to: 4, transitions: new Set([[{title: EPS, stackDown: '_', stackPush: ['1'], move: Move.L} ]]) },

            // { from: 1, to: 2, transitions: new Set([[ {title: EPS, stackDown: '_', stackPush: ['V'], move: Move.R} ]]) },
            // { from: 2, to: 2, transitions: new Set([[ {title: EPS, stackDown: '_', stackPush: ['B'], move: Move.R} ]]) },
            // { from: 2, to: 1, transitions: new Set([[ { title: 'b', stackDown: 'b', stackPush: ['6'], move: Move.R } ]]) },
            // { from: 3, to: 3, transitions: new Set([[ { title: 'c', stackDown: 'с', stackPush: ['['], move: Move.R } ]]) },
            // { from: 3, to: 3, transitions: new Set([[ { title: 'c', stackDown: '_', stackPush: [']'], move: Move.R } ]]) },

            // {from: 1, to: 1, transitions: new Set([{title: 'a', stackDown: 'a', stackPush: ['A'], move: Move.R}])},
            // {from: 1, to: 2, transitions: new Set([{title: 'c', stackDown: 'b', stackPush: ['V'], move: Move.R}])},
            // {from: 2, to: 2, transitions: new Set([{title: 'c', stackDown: '_', stackPush: ['V'], move: Move.R}])},



        ]
    }, [{ id: 1, isAdmit: false }], ['1'])
console.log(nfa.isDeterministic())
// let nfa = new TM(
//     {
//         nodes: [
//             {id: 1, isAdmit: false},
//             {id: 2, isAdmit: false},
//             {id: 3, isAdmit: false},
//             {id: 4, isAdmit: false},
//
//         ],
//         edges: [
//             { from: 1, to: 1, transitions: new Set([[{title: EPS, stackDown: '0', stackPush: ['0'], move: Move.R}, {title: EPS, stackDown: '1', stackPush: ['1'], move: Move.R} ]]) },
//             { from: 1, to: 2, transitions: new Set([[{title: EPS, stackDown: '_', stackPush: ['_'], move: Move.L} ]]) },
//             { from: 2, to: 2, transitions: new Set([[{title: EPS, stackDown: '1', stackPush: ['0'], move: Move.L} ]]) },
//             { from: 2, to: 3, transitions: new Set([[{title: EPS, stackDown: '0', stackPush: ['1'], move: Move.L} ]]) },
//             { from: 2, to: 4, transitions: new Set([[{title: EPS, stackDown: '_', stackPush: ['1'], move: Move.L} ]]) },
//
//             // { from: 1, to: 2, transitions: new Set([[ {title: EPS, stackDown: '_', stackPush: ['V'], move: Move.R} ]]) },
//             // { from: 2, to: 2, transitions: new Set([[ {title: EPS, stackDown: '_', stackPush: ['B'], move: Move.R} ]]) },
//             // { from: 2, to: 1, transitions: new Set([[ { title: 'b', stackDown: 'b', stackPush: ['6'], move: Move.R } ]]) },
//             // { from: 3, to: 3, transitions: new Set([[ { title: 'c', stackDown: 'с', stackPush: ['['], move: Move.R } ]]) },
//             // { from: 3, to: 3, transitions: new Set([[ { title: 'c', stackDown: '_', stackPush: [']'], move: Move.R } ]]) },
//
//             // {from: 1, to: 1, transitions: new Set([{title: 'a', stackDown: 'a', stackPush: ['A'], move: Move.R}])},
//             // {from: 1, to: 2, transitions: new Set([{title: 'c', stackDown: 'b', stackPush: ['V'], move: Move.R}])},
//             // {from: 2, to: 2, transitions: new Set([{title: 'c', stackDown: '_', stackPush: ['V'], move: Move.R}])},
//
//
//
//         ]
//     },  [{id: 1, isAdmit: false}], ['1'])
// console.log(nfa.step())
// console.log(nfa.step())
// console.log(nfa.step())
// console.log(nfa.step())
// console.log(nfa.step())
// console.log(nfa.step())
// nfa.setInput(['1'])
// console.log(nfa.step())
// console.log(nfa.step())
// console.log(nfa.step())
// console.log(nfa.step())
// console.log(nfa.step())
// console.log(nfa.step())
// console.log(nfa.step())
// console.log(nfa.step())
// console.log(nfa.step())