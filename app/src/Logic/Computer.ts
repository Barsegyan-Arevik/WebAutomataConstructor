import {Edge, elementOfAlphabet, statement, Step} from "./Types";
import {GraphCore, NodeCore, TransitionParams} from "./IGraphTypes";

export const eof: statement = {isAdmit: false, idLogic: -1, id: -1}
export const EPS: string = 'Epsilon'
export const BOTTOM = "Z0"

export abstract class Computer {

    protected input: elementOfAlphabet[] = []
    protected alphabet = new Map()
    protected statements = new Map()
    protected nodes: NodeCore[]
    protected startStatements: NodeCore[] = []
    protected edges: Edge[] = []
    protected currentNode: NodeCore
    protected counterSteps: number = 0
    protected counterStepsForResult: number = 0
    protected alphabetDBG: any = []
    protected alphabetSize: number = 0;

    public abstract restart: () => void
    public abstract run: () => Step
    public abstract step: () => Step
    public abstract setInput: (input: string[]) => void

    protected getAlphabetFromEdges(): void {
        let alphabetSet: Set<string> = new Set()
        for (let i = 0; i < this.edges.length; i++) {
            this.edges[i].localValue.forEach(value => {
                alphabetSet.add(value.title)
            })
        }
        let i = 0
        alphabetSet.forEach(value => {
            this.alphabet.set(value, i)
            this.alphabetDBG.push(value)
            i++
        })
    }

    protected getStatementsFromNodes(nodes: NodeCore[]): void {
        for (let i = 0; i < nodes.length; i++) {
            this.statements.set(nodes[i].id, {id: nodes[i].id, isAdmit: nodes[i].isAdmit, idLogic: i})
        }
    }

    private setStartStatements(graph: GraphCore, startStatements: NodeCore[]) {
        if (startStatements.length > 1 && this.alphabet.get(EPS) === undefined) {
            this.alphabet.set(EPS, this.alphabet.size)
            startStatements.forEach(value => startStatements.forEach(value1 => {
                graph.edges.push({from: value.id, to: value1.id, transitions: new Set<TransitionParams>([{title: EPS}])})
            }))
        }
    }

    protected constructor(graph: GraphCore, startStatements: NodeCore[]) {
        this.setStartStatements(graph, startStatements)

        graph.edges
            .sort((a, b) => a.from - b.from)
            .forEach(value => this.edges.push({
                    transitions: value.transitions,
                    from: value.from,
                    to: value.to,
                    localValue: [],
                    //stackDown: value.stackDown,
                    //stackPush: value.stackPush
                }))

        for (let i = 0; i < this.edges.length; i++) {
            this.edges[i].localValue = []
            this.edges[i].transitions.forEach(value =>
                this.edges[i].localValue!.push(value))
        }
        // console.log('EDGES: ', this.edges)
        console.log('EDGES: ')
        this.edges.forEach(value => {
            console.log("from: ", value.from)
            console.log("to: ", value.to)
            console.log("Transitions: ")
            value.transitions.forEach(value1 => console.log("  title: ", value1.title))
            value.transitions.forEach(value1 => console.log("  dwn: ", value1.stackDown))
            value.transitions.forEach(value1 => console.log("  psh: ", value1.stackPush))
        })
        this.getAlphabetFromEdges()
        console.log('ALPHABET: ', this.alphabet)
        // console.log('STATEMENTS: ', this.statements)
        this.getStatementsFromNodes(graph.nodes)
        console.log('STATEMENTS: ', this.statements)
        this.startStatements = startStatements
        this.currentNode = startStatements[0]
        this.nodes = graph.nodes
        // console.log("S: ", this.nodes[11])
    }



}