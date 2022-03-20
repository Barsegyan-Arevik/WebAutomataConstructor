import { Computer } from "./Computer";
import { GraphCore, NodeCore } from "./IGraphTypes";
import { Output, position, Step, History } from "./Types";

export abstract class OutputAutomata extends Computer {
    protected curPosition: position[]

    constructor(graph: GraphCore, startStatements: NodeCore[], input: string[]) {
        super(graph, startStatements)

        this.curPosition = []
        startStatements.forEach(value => {
            this.curPosition.push({
                stmt: this.statements.get(value.id),
            })
        })
        this.setInput(input)
        this.counterSteps = 0

        console.log("ALPHBT")
        this.alphabet.forEach((value, key) => console.log(value, key))
        console.log("STMTS")
        this.statements.forEach(value => console.log(value))
        console.log(this.curPosition)
        this.matrix.forEach(value => {
            console.log()
            value.forEach(value1 => console.log(value1))
        })
    }

    isDeterministic(): boolean {
        const ret = this.matrix.reduce((acc: boolean, line) =>
            acc && line.reduce((_: boolean, cell) =>
                cell.reduce((accCell: boolean, stmt, index) => {
                    if (index !== 0) {
                        if (stmt.stackDown !== undefined) {
                            return accCell && !(stmt.stackDown === cell[0].stackDown)
                        }
                        if (stmt.stackDown === undefined) {
                            return accCell && false
                        }
                    }
                    return accCell
                }
                    , acc),
                acc),
            true)
        return ret 
    }

    public restart = () => {
        this.counterSteps = 0
        this.historiStep = []
        this.curPosition = []
        this.startStatements.forEach(value => {
            this.curPosition.push({
                stmt: this.statements.get(value.id),
            })
        })
    }

    oaRun = (): Step => {
        this.historiRun = []
        this.counterStepsForResult = 0
        let output
        for (let i = 0; i < this.input.length; i++) {
            const ref = { 
                counterSteps: this.counterStepsForResult,
                curPosition: this.curPosition, 
                historiStep: this.historiRun 
            }
            const after = this._step(ref)
            this.counterStepsForResult = ref.counterSteps
            this.curPosition = ref.curPosition
            this.historiRun = ref.historiStep
            output = after.output
        }
        
        return { 
            counter: this.counterStepsForResult, 
            history: this.historiRun, 
            isAdmit: this.haveAdmitting(this.curPosition), 
            nodes: this.toNodes(this.curPosition),
            output: output 
        }
    }

    protected toNodes(positions: position[]): NodeCore[] {
        let retNodes: NodeCore[] = []
        positions.forEach(value => {
            let temp: NodeCore = {
                ...this.nodes[value.stmt.idLogic],
                stack: value.stack === undefined ? undefined : value.stack.getStorage()
            }
            retNodes.push(temp)
        })
        return retNodes
    }

    protected haveAdmitting(positions: position[]): boolean {
        return positions.reduce((acc: boolean, p) => acc && p.stmt.isAdmit, true)
    }

    protected nextStepPosition = (position: position, by: number): { position: position, output: Output | undefined }[] => {
        return this.cellMatrix(position.stmt.idLogic, by).map(v => ({ position: { stmt: v }, output: v.output }))
    }

    protected nextStepPositions = (positions: position[], by: number): { positions: position[], outputs: Output[] } => {
        const nextPOs = positions.map((v) => this.nextStepPosition(v, by))
        const nextPs = nextPOs.reduce((acc: position[], pos) => {
            pos.forEach(po => acc.push(po.position))
            return acc
        }, [])
        const nextOs = nextPOs.reduce((acc: Output[], pos) => {
            pos.forEach(po => {
                if (po.output === undefined) {
                    throw new Error("Output undefinded")
                }
                acc.push(po.output)
            })
            return acc
        }, [])
        return { positions: nextPs, outputs: nextOs }
    }

    protected _step = (ref: { counterSteps: number, curPosition: position[], historiStep: History[] }) => {
        const trNum = this.alphabet.get(this.input[ref.counterSteps]?.value)
        const nextPositions = this.nextStepPositions(ref.curPosition, trNum)

        ref.curPosition = nextPositions.positions
        const nodesOfCurPos: NodeCore[] = this.toNodes(ref.curPosition)
        ref.historiStep.push({ nodes: nodesOfCurPos, by: trNum })
        if (ref.curPosition.length > 0) {
            ref.counterSteps++
        }

        return {
            counter: ref.counterSteps,
            history: ref.historiStep,
            isAdmit: this.haveAdmitting(ref.curPosition),
            nodes: nodesOfCurPos,
            output: nextPositions.outputs
        }
    }

    oaStep = (): Step => {
        const ref = { 
            counterSteps: this.counterSteps,
            curPosition: this.curPosition, 
            historiStep: this.historiStep 
        }
        const after = this._step(ref)
        this.counterSteps = ref.counterSteps
        this.curPosition = ref.curPosition
        this.historiStep = ref.historiStep

        return {
            counter: after.counter,
            history: after.history,
            isAdmit: after.isAdmit,
            nodes: after.nodes,
            output: after.output
        }
    }

    public setInput = (input: string[]) => {
        this.input = []
        input.forEach(value => {
            this.input.push({ idLogic: this.alphabet.get(value), value: value })
        })
        this.restart()
    }

}


// let nfa = new Moor(
//     {
//         nodes: [
//             { id: 0, isAdmit: false, output: '0' },
//             { id: 1, isAdmit: false, output: '1' },
//             { id: 2, isAdmit: false, output: '2' },
//             { id: 3, isAdmit: false, output: '3' },
//         ],
//         edges: [
//             { from: 0, to: 1, transitions: new Set([[{ title: '5' }]]) },
//             { from: 1, to: 2, transitions: new Set([[{ title: '10'}]]) },
//             { from: 2, to: 3, transitions: new Set([[{ title: '10'}]]) },
//             { from: 3, to: 3, transitions: new Set([[{ title: '5' }]]) },
        
//         ]
//     }, [{ id: 0, isAdmit: false }], ["5"])

// console.log(nfa.run())
// console.log(nfa.step())
// console.log(nfa.step())