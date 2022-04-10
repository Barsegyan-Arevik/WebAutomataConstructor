import React, { ChangeEvent } from "react";
import { ComputerType, graph, histNode, node } from "../../react-graph-vis-types";
import { DFA } from "../../Logic/DFA";
import { isEqual } from "lodash";
import { withComputerType } from "../../hoc";
import { Computer } from "../../Logic/Computer";
import { NFA } from "../../Logic/NFA";
import ControlWrapper from "../ControlWrapper/ControlWrapper";
import "./RunControl.css";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';
import Typography from "@mui/material/Typography";

import Tooltip from '@mui/material/Tooltip';

import { EpsilonNFA } from "../../Logic/EpsilonNFA";
import { PDA } from "../../Logic/PDA";
import { TM } from "../../Logic/TM";
import { Elements } from "../../App";
import { decorateGraph, elementsToGraph, graphToElements } from "../../utils";
import { HistUnit, Step } from "../../Logic/Types";
import { GraphEval, GraphEvalMultiStart, NodeCore } from "../../Logic/IGraphTypes";
import { Mealy } from "../../Logic/Mealy";
import { Moore } from "../../Logic/Moore";
import { start } from "repl";
import { ContactSupportOutlined } from "@mui/icons-material";
import { NonDeterministic, NonMinimizable } from "../../Logic/Exceptions";
import { DPDA } from "../../Logic/DPDA";
import { DMealy } from "../../Logic/DMealy";
import { DMoore } from "../../Logic/DMoore";
import { isAbsolute } from "path";


interface runControlProps {
    computerType: ComputerType,
    elements: Elements,
    treeElems: Elements,
    changeStateIsCurrent: (ids: number[], isCurrent: boolean) => void
    updMem: (mem: string[] | undefined, ptr: number | undefined) => void
    network: any
    createHistNode: (idd: number, label: string, isAdmit: boolean, isInitial: boolean, isCurrent: boolean) => void
    createHistEdge: (from: number, to: number, by: any) => void
    getLastHistNodeId: () => number
    resetHistTree: () => void
    setInit: (f: () => void) => void
    setNfaToDfa: (f: () => void) => void
    setMinimizeDfa: (f: () => void) => void
    setMooreToMealy: (f: () => void) => void
    setMealyToMoore: (f: () => void) => void
    setChangerByStack: (f: () => void) => void
    setRun: (f: () => void) => void
    setStep: (f: () => void) => void
    setReset: (f: () => void) => void
    updateElements: (elements: Elements) => void
    setComputerType: (type: null | ComputerType) => void
    setResettedStatus: (status: boolean) => void
    setByEmptyStack: (byEmptyStack: boolean) => void
    setIsNonDetermenistic: (v: boolean) => void
    setIsNonMinimizable: (v: boolean) => void
}

interface runControlState {
    input: string,
    result?: boolean,
    computer: Computer | undefined,
    editMode: boolean,
    currentInputIndex: number,
    history: { a: node, b: string[] | undefined }[][],
    byEmptyStack: boolean,
    wasRuned: boolean,
    memory: string[] | undefined,
    gElements: graph,
    startNode: node | undefined,
    lastHistUnits: { id: number, idd: number }[],
    startStatements: NodeCore[]
}



class RunControl extends React.Component<runControlProps, runControlState> {

    historyEndRef = React.createRef<HTMLDivElement>();

    constructor(props: runControlProps) {
        super(props);

        this.state = {
            input: "",
            result: undefined,
            computer: undefined,
            editMode: true,
            currentInputIndex: -1,
            history: [],
            byEmptyStack: false,
            wasRuned: false,
            memory: undefined,
            gElements: elementsToGraph(this.props.elements),
            startNode: undefined,
            lastHistUnits: [],
            startStatements: []
            // {nodes: [], edges: []}
        };
        // this.initializeComputer()
    }

    componentDidMount() {
        this.props.setInit(() => {
            let haveEmpty = false
            this.props.elements.edges.forEach(edge => {
                if (edge.label === "") {
                    haveEmpty = true
                }
            })
            if (!haveEmpty) {
                return this.initializeComputer()
            }
        })
        this.props.setNfaToDfa(this.nfaToDfa)
        this.props.setMinimizeDfa(this.minimizeDfa)
        this.props.setMooreToMealy(this.mooreToMealy)
        this.props.setMealyToMoore(this.mealyToMoore)
        this.props.setChangerByStack(this.admitByStack)
        this.props.setRun(this.run)
        this.props.setStep(this.step)
        this.props.setReset(this.reset)
        this.initializeComputer()
    }

    componentDidUpdate(prevProps: Readonly<runControlProps>, prevState: Readonly<runControlState>, snapshot?: any) {
        if (this.computerShouldBeUpdated(elementsToGraph(prevProps.elements), elementsToGraph(this.props.elements))) {
            this.initializeComputer();
        }
    }

    computerShouldBeUpdated = (prev: graph, current: graph): boolean => {
        const compareNodes = (): boolean => {
            if (prev.nodes.length !== current.nodes.length) {
                return true;
            }

            return prev.nodes.some((prev, index) => {
                const curr = current.nodes[index];
                return prev.id !== curr.id ||
                    prev.isAdmit !== curr.isAdmit ||
                    prev.isInitial !== curr.isInitial;
            })
        }

        const compareEdges = (): boolean => {
            if (prev.edges.length !== current.edges.length) {
                return true;
            }

            return prev.edges.some((prev, index) => {
                const curr = current.edges[index];
                return prev.id !== curr.id ||
                    prev.from !== curr.from ||
                    prev.to !== curr.to ||
                    !isEqual(curr.transitions, prev.transitions)
            });
        }

        // console.log('[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[]')
        // prev.edges.forEach(v => {
        //     console.log(v.from + ' ' + v.to)
        //     v.transitions.forEach((t) => console.log(t))
        // })

        return compareEdges() || compareNodes()
    }

    getComputer = (computerType: ComputerType, graph: graph, initialNode: node[], input: string[]): Computer | undefined => {
        switch (computerType) {
            case "dfa":
                try {
                    return new DFA(graph, initialNode, input);
                } catch (e) {
                    return undefined;
                }
            case "nfa":
                return new NFA(graph, initialNode, input);
            case "nfa-eps":
                return new EpsilonNFA(graph, initialNode, input);
            case "pda":
                return new PDA(graph, initialNode, input, this.state.byEmptyStack);
            case "dpda":
                return new DPDA(graph, initialNode, input, this.state.byEmptyStack);
            case "tm":
                return new TM(graph, initialNode, input);
            case "mealy":
                return new Mealy(graph, initialNode, input);
            case "dmealy":
                return new DMealy(graph, initialNode, input);
            case "moore":
                return new Moore(graph, initialNode, input);
            case "dmoore":
                return new DMoore(graph, initialNode, input);
        }

    }

    initializeComputer = () => {
        console.warn("Reinitializing computer");

        this.setState({ gElements: elementsToGraph(this.props.elements) }, () => {
            this.props.resetHistTree()

            const initialNode: node[] = elementsToGraph(this.props.elements).nodes.filter(node => node.isInitial);
            const input = this.state.input.split("");

            if (initialNode === undefined) {
                console.warn("There is no initial node. Computer will not be initialized");
                return;
            }

            console.log("this.state.gElementshis.state.gElementshis.state.gElements")
            console.log(this.state.gElements)

            this.setState({
                computer: this.getComputer(this.props.computerType, this.state.gElements, initialNode, input),
                result: undefined
            }, async () => {

                const tmp: { id: number, idd: number }[] = []

                const startStmts = this.state.computer !== undefined
                    ? this.state.computer.getStartStatements()
                    : []

                startStmts
                    .map((stmt) => this.state.gElements.nodes.find(node => node.id === stmt.id))
                    .filter((node): node is node => node !== undefined)
                    .forEach((v) => {
                        this.props.createHistNode(v.id, v.label, v.isAdmit, v.isInitial, v.isCurrent)
                        tmp.push({ id: this.props.getLastHistNodeId(), idd: v.id })
                    })

                console.log('OOOOOOOOOOOO')
                console.log(tmp.length)
                tmp.map((v) => this.state.gElements.nodes.find((elem) => elem.id === v.idd))
                    .filter((node): node is node => node !== undefined)
                    .forEach((v) => console.log(v.label))
                // this.state.lastHistUnits.forEach((v) => console.log(v.id, tstst.get(v.id)))
                console.log('OOOOOOOOOOOO')
                await this.setState({ lastHistUnits: tmp })
            });

        })

        // this.setState({
        //     startStatements: (this.state.computer !== undefined) 
        //         ? this.state.computer.getStartStatements() 
        //         : []
        // }, () => {
        //     this.state.startStatements.forEach((stmt) => {

        //     })
        // })



        console.log('::::::::::::::::::::::>')
        this.props.elements.edges.forEach((v) => {
            console.log(v.from + ' -- ' + v.to)
            v.transitions.forEach(t => console.log(t))
        })
    }

    onInputChanged = (event: ChangeEvent<HTMLInputElement>): void => {
        const input = event.target.value;

        this.reset();
        this.state.computer?.setInput(input.split(""));

        this.setState({ input: input });


    }

    step = async (): Promise<void> => {
        if (this.state.computer === undefined) {
            console.error("Computer is not initialized yet");
            return;
        }

        this.props.setResettedStatus(true)


        if (this.state.wasRuned) {
            this.setState({ wasRuned: false });
            this.reset();
            await this.props.resetHistTree()

        }

        if (this.state.currentInputIndex === this.state.input.length - 1 && this.props.computerType !== "tm") return;
        if (this.state.result !== undefined && this.state.currentInputIndex !== -1 && this.props.computerType !== "tm") return;

        try {

            const stepResult: Step = this.state.computer.step()

            if (stepResult.nodes.length === 0) return;

            this.props.changeStateIsCurrent(stepResult.nodes.map(node => node.id), true);
            this.props.updMem(stepResult.memory, stepResult.pointer)

            let result = undefined;
            if (stepResult.counter === this.state.input.length) {
                result = stepResult.isAdmit
            } else if (this.state.currentInputIndex + 2 !== stepResult.counter) {
                result = false;
            }

            const nodes = stepResult.nodes
                .map(nodeCore => this.state.gElements.nodes.find(node => node.id === nodeCore.id))
                .filter((node): node is node => node !== undefined);

            const tmp: { id: number, idd: number }[] = []

            const byEpsPred = stepResult.byEpsPred ? stepResult.byEpsPred : []

            const byLetter = stepResult.byLetter ? stepResult.byLetter : []

            const byEpsAfter = stepResult.byEpsAfter ? stepResult.byEpsAfter : []

            const tstst: Map<number, string> = new Map()

            const treeNonDet = async () => {
            // console.log('wwwww')
            // this.state.lastHistUnits.map((v) => this.state.gElements.nodes.find((elem) => elem.id === v.idd))
            //     .filter((node): node is node => node !== undefined)
            //     .forEach((v) => console.log(v.label))
            // // this.state.lastHistUnits.forEach((v) => console.log(v.id, tstst.get(v.id)))
            // console.log('wwwww')
            // console.log(byEpsPred)

            byEpsPred.map((node) =>
                // {
                this.state.gElements.nodes.find((elem) => elem.id === node.id)
                // a.from = node.from
                // a.id = node.id
                // a.cur = node.cur
                // return a 
                // }
            )
                .filter((node): node is node => node !== undefined)
                .forEach((v) => {
                    console.log('v.from?.id, v.id')
                    console.log(v.from?.id, v.id)
                    // if (v.from && v.from.id !== v.id) {
                    this.props.createHistNode(v.id, v.label, v.isAdmit, v.isInitial, v.isCurrent)
                    tmp.push({ id: this.props.getLastHistNodeId(), idd: v.id })
                    tstst.set(v.id, v.label)
                    console.log('---------->' + v.label)
                    // } 
                    // else {
                    // console.log('LLKLKL')
                    // console.log(this.state.lastHistUnits)

                    //                         tmp.push(this.state.lastHistUnits.filter(((t) => t && t.idd === v.id))[0])

                    //                     }
                })

            const byEpsPredRules = byEpsPred.reduce((acc: { from: number, to: number[], by: any }[], v) => {
                const a = this.state.lastHistUnits.filter((l) => v.from && (v.from.id === l.idd))
                if (a.length > 0) {
                    const from = this.state.lastHistUnits.filter((l) => v.from && (v.from.id === l.idd))[0].id
                    const to = tmp.filter((t) => v.id === t.idd).map((v) => v.id)
                    if (!to.includes(from)) {
                        acc.push({ from, to, by: v.by })
                    }
                }
                return acc
            }, [])

            byEpsPredRules.forEach((rule) => rule.to.forEach((to) => this.props.createHistEdge(rule.from, to, rule.by)))

            // if (tmp.length > 0) 
            // tmp.forEach((v) => console.log(tstst.get(v.id)))

            this.setState({ lastHistUnits: tmp })

            console.log('*')
            tmp.forEach((v) => console.log(v.id, tstst.get(v.idd)))
            console.log('*')

            console.log('byLetter')
            this.state.lastHistUnits.forEach((v) =>
                console.log(v.id, tstst.get(v.idd)))
            console.log('byLetter')


            const tmp1: { id: number, idd: number }[] = []

            byLetter.map((node) => this.state.gElements.nodes.find((elem) => elem.id === node.id))
                .filter((node): node is node => node !== undefined)
                .forEach((v) => {
                    this.props.createHistNode(v.id, v.label, v.isAdmit, v.isInitial, v.isCurrent)
                    tmp1.push({ id: this.props.getLastHistNodeId(), idd: v.id })
                    tstst.set(v.id, v.label)
                })

            const byLetterRules = byLetter.reduce((acc: { from: number, to: number[], by: any }[], v) => {
                const a = tmp.filter((l) => v.from && (v.from.id === l.idd))
                if (a.length > 0) {
                    const from = tmp.filter((l) => v.from && v.from.id === l.idd)[0].id
                    const to = tmp1.filter((t) => v.id === t.idd).map((v) => v.id)
                    acc.push({ from, to, by: v.by })
                }
                return acc
            }, [])

            byLetterRules.forEach((rule) => rule.to.forEach((to) => this.props.createHistEdge(rule.from, to, rule.by)))

            // if (tmp1.length > 0) 
            await this.setState({ lastHistUnits: tmp1 })

            console.log('byEpsAfter')
            this.state.lastHistUnits.forEach((v) => console.log(v.id, tstst.get(v.idd)))
            console.log('byEpsAfter')

            const tmp2: { id: number, idd: number }[] = []

            // console.log(byEpsAfter)
            byEpsAfter.map((node) => this.state.gElements.nodes.find((elem) => elem.id === node.id)
                // !.from = node.from
            )
                .filter((node): node is node => node !== undefined)
                .forEach((v) => {
                    // if (v.from && v.id !== v.from.id) {
                    this.props.createHistNode(v.id, v.label, v.isAdmit, v.isInitial, v.isCurrent)
                    tmp2.push({ id: this.props.getLastHistNodeId(), idd: v.id })
                    tstst.set(v.id, v.label)
                    // } else {
                    //     console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
                    //     console.log(v.id)
                    //     console.log(tstst.get(v.id))
                    //     console.log(tmp1)
                    //     tmp2.push(tmp1.filter(((t) => t && t.idd === v.id))[0])
                    // }

                })

            const byEpsAfterRules = byEpsAfter.reduce((acc: { from: number, to: number[], by: any }[], v) => {
                const a = tmp1.filter((l) => v.from && v.from.id === l.idd)
                if (a.length > 0) {
                    const from = tmp1.filter((l) => v.from && v.from.id === l.idd)[0].id
                    const to = tmp2.filter((t) => v.id === t.idd).map((v) => v.id)
                    // if (!to.includes(from)) {
                    acc.push({ from, to, by: v.by })
                    // }
                }
                return acc
            }, [])

            byEpsAfterRules.forEach((rule) => rule.to.forEach((to) => this.props.createHistEdge(rule.from, to, rule.by)))

            // if (tmp2.length > 0) await 

            await this.setState({ lastHistUnits: tmp2 })

            console.log('___')
            this.state.lastHistUnits.forEach((v) => console.log(v.id, tstst.get(v.idd)))
            console.log('___')

}

           const treeDet = async () => {
            console.log('*')
            this.state.lastHistUnits.forEach((v) => console.log(v.id, tstst.get(v.idd)))
            console.log('*')

            console.log('byLetter')
            this.state.lastHistUnits.forEach((v) =>
                console.log(v.id, tstst.get(v.idd)))
            console.log('byLetter')


            const tmp1: { id: number, idd: number }[] = []

            byLetter.map((node) => this.state.gElements.nodes.find((elem) => elem.id === node.id))
                .filter((node): node is node => node !== undefined)
                .forEach((v) => {
                    this.props.createHistNode(v.id, v.label, v.isAdmit, v.isInitial, v.isCurrent)
                    tmp1.push({ id: this.props.getLastHistNodeId(), idd: v.id })
                    tstst.set(v.id, v.label)
                })

            const byLetterRules = byLetter.reduce((acc: { from: number, to: number[], by: any }[], v) => {
                const a = this.state.lastHistUnits.filter((l) => v.from && (v.from.id === l.idd))
                if (a.length > 0) {
                    const from = this.state.lastHistUnits.filter((l) => v.from && v.from.id === l.idd)[0].id
                    const to = tmp1.filter((t) => v.id === t.idd).map((v) => v.id)
                    acc.push({ from, to, by: v.by })
                }
                return acc
            }, [])

            byLetterRules.forEach((rule) => rule.to.forEach((to) => this.props.createHistEdge(rule.from, to, rule.by)))

            // if (tmp1.length > 0) 
            await this.setState({ lastHistUnits: tmp1 })

            
}

            if (this.state.computer.haveEpsilon()) {
                treeNonDet()
            } else {
                treeDet()
            }

            const _nodes = nodes.map((e, i) => {
                const stack = stepResult.nodes[i].stack
                return {
                    a: e,
                    b: stack !== undefined
                        ? stack.reverse()
                        : stepResult.output !== undefined
                            ? stepResult.output!
                            : undefined
                }
            })

            if (this.props.computerType === "moore" && stepResult.counter === 1) {
                const startNode: { a: node, b: string[] | undefined }[] = [{
                    a: this.state.gElements.nodes.filter(node => node.id === this.state.computer!.getCurrNode())[0],
                    b: ["~"]
                }]
                console.log(startNode)
                this.setState({
                    startNode: this.state.gElements.nodes.filter(node => node.id === this.state.computer!.getCurrNode())[0]
                    // history: [...this.state.history, startNode],
                })
            }

            this.setState({
                result: result,
                currentInputIndex: this.state.currentInputIndex + 1,
                history: [...this.state.history, _nodes],
                memory: stepResult.memory,
                // lastHistUnits: tmp

            }, () => this.historyEndRef?.current?.scrollIntoView({ behavior: 'smooth' }));

        } catch (e) {
            if (e instanceof NonDeterministic) {
                this.props.setIsNonDetermenistic(true)
                console.error('KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK')
                console.log('NonDeterministic')
            }
            else {
                console.log(e)
            }
        }

    }

    reset = (): void => {
        this.state.computer?.restart();
        this.props.changeStateIsCurrent([], true); // resets all nodes
        this.setState({
            result: undefined,
            currentInputIndex: -1,
            history: [],
            // counter: 0
        },
            () => {
                this.initializeComputer()
            }
        );
        this.state.computer?.setInput(this.state.input.split(""))
        this.props.setResettedStatus(false)
        this.props.resetHistTree()

        // this.initializeComputer()
    }

    run = async (): Promise<void> => {
        if (this.state.computer === undefined) {
            console.error("Computer is not initialized yet");
            return;
        }

        await this.reset();

        try {
            const result = this.state.computer.run();

            this.setState({ result: result.isAdmit, currentInputIndex: -1, history: [] });
            this.setState({ wasRuned: true })
        } catch (e) {
            if (e instanceof NonDeterministic) {
                this.props.setIsNonDetermenistic(true)
                console.error('KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK')
                console.log('NonDeterministic')
            }
        }
    }

    nfaToDfa = (): void => {
        const nfaToDfa = this.state.computer!.nfaToDfa()
        const nodes = nfaToDfa.nodes.map((v, it) => ({
            id: v.id,
            isAdmit: v.isAdmit,
            label: v.id.toString(),
            isInitial: it === 0,
            isCurrent: false
        }))
        const edges = nfaToDfa.edges
        const gElements = {
            nodes: nodes,
            edges: edges
        }

        this.setState({
            gElements: gElements
        }, () => {
            this.props.updateElements(graphToElements(gElements))
            this.props.setComputerType("dfa")
        })
    }

    admitByStack = (): void => {
        const curStbyEmp = this.state.byEmptyStack;
        this.setState({ byEmptyStack: !curStbyEmp });
        this.props.setByEmptyStack(!curStbyEmp)
        this.state.computer!.byEmptyStackAdmt(!curStbyEmp)
        this.reset();
    }

    minimizeDfa = (): void => {
        this.initializeComputer();
        this.reset();

        try {
            const miniDFA: GraphEval = this.state.computer!.minimizeDfa()
            const nodes = miniDFA.graphcore.nodes.map((v) => ({
                id: v.id,
                isAdmit: v.isAdmit,
                label: 'G' + v.id.toString(),
                isInitial: v.id === miniDFA.start.id,
                isCurrent: false
            }))
            const edges = miniDFA.graphcore.edges
            const gElements = {
                nodes: nodes,
                edges: edges
            }

            this.setState({
                gElements: gElements
            }, () => {
                this.props.updateElements(graphToElements(gElements))
            })
        } catch (e) {
            if (e instanceof NonMinimizable) {
                this.props.setIsNonMinimizable(true)
                console.error('KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK')
                console.log('NonDeterministic')
            }
        }
    }

    mooreToMealy = (): void => {
        this.initializeComputer();
        this.reset();

        const mealy: GraphEvalMultiStart = this.state.computer!.mooreToMealy()

        const starts = mealy.start.map((v) => v.id)

        const nodes = mealy.graphcore.nodes.map((v) => ({
            id: v.id,
            isAdmit: v.isAdmit,
            label: 'S' + v.id.toString(),
            isInitial: starts.includes(v.id),
            isCurrent: false,
        }))
        const edges = mealy.graphcore.edges
        const gElements = {
            nodes: nodes,
            edges: edges
        }
        this.setState({
            gElements: gElements
        }, () => {
            this.props.updateElements(graphToElements(gElements))
            this.props.setComputerType("mealy")
        })
    }

    mealyToMoore = (): void => {
        this.initializeComputer();
        this.reset();

        const miniDFA: GraphEvalMultiStart = this.state.computer!.mealyToMoore()

        const starts = miniDFA.start.map(v => v.id)

        // console.log('()()()()()))()(', miniDFA.graphcore.edges)

        const nodes = miniDFA.graphcore.nodes.map((v) => ({
            id: v.id,
            isAdmit: v.isAdmit,
            label: 'S' + v.id.toString() + ' | ' + v.output,
            isInitial: starts.includes(v.id),
            isCurrent: false,
        }))
        const edges = miniDFA.graphcore.edges
        const gElements = {
            nodes: nodes,
            edges: edges
        }
        this.setState({
            gElements: gElements
        }, () => {
            this.props.updateElements(graphToElements(gElements))
            this.props.setComputerType("moore")
        })
    }

    render() {
        return (
            <ControlWrapper title={"Запуск"}>
                <div>

                    <div className="run-control__item run-control__input__row">
                        {
                            this.state.editMode
                                ?
                                <TextField
                                    label="Входная строка"
                                    size="small"
                                    value={this.state.input}
                                    onChange={this.onInputChanged}
                                    onBlur={() => {
                                        this.state.input.length && this.setState({ editMode: false }, () => this.initializeComputer())
                                    }}
                                />
                                :
                                <div
                                    className="run-control__input-value"
                                    onClick={() => {
                                        this.setState({ editMode: true });
                                    }}
                                >
                                    {
                                        Array.from(this.state.input).map((char, index) => (
                                            <span
                                                className={"run-control__input__span" + (this.state.currentInputIndex === index ? "--current" : "")}
                                                key={index}
                                            >
                                                {char}
                                            </span>
                                        ))
                                    }
                                </div>
                        }

                        <div className="run-control__result">
                            {
                                this.state.result === undefined ? null :
                                    this.state.result
                                        ? <DoneIcon style={{ color: "var(--commerce)" }} />
                                        : <CloseIcon style={{ color: "var(--destructive)" }} />
                            }
                        </div>

                    </div>

                    <div className="run-control__item run-control__buttons">
                        <div className="run-control__button">
                            <Button
                                variant="outlined"
                                onClick={this.step}
                            >
                                Шаг
                            </Button>
                        </div>

                        {
                            this.props.computerType !== "tm"
                                ?
                                <div className="run-control__button">
                                    <Button
                                        variant="outlined"
                                        onClick={this.run}
                                    >
                                        Запуск
                                    </Button>
                                </div>
                                : <></>
                        }

                        <div className="run-control__button">
                            <Button
                                variant="outlined"
                                onClick={this.reset}
                            >
                                Сбросить
                            </Button>
                        </div>

                        {/* {
                            this.props.computerType === "pda"
                                ?
                                    <div className="run-control__button">
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            // onClick={this.run}
                                            onClick={() => {
                                                this.admitByStack()
                                                // const curStbyEmp = this.state.byEmptyStack;
                                                // this.setState({ byEmptyStack: !curStbyEmp});
                                                // this.state.computer!.byEmptyStackAdmt(!curStbyEmp)
                                                // this.reset();
                                            }}
                                        >
                                            {this.state.byEmptyStack ?  "По стеку" : "По состоянию"}
                                        </Button>
                                    </div>
                                : <div/>
                        } */}

                        {/* {
                           this.props.computerType === "moore" ?
                               <div className="run-control__button">
                                   <Button
                                       variant="outlined"
                                       onClick={this.mooreToMealy}
                                   >
                                       mealy
                                   </Button>
                               </div>
                               : <></>
                        }

{
                           this.props.computerType === "mealy" ?
                               <div className="run-control__button">
                                   <Button
                                       variant="outlined"
                                       onClick={this.mealyToMoore}
                                   >
                                       moore
                                   </Button>
                               </div>
                               : <></>
                        } */}


                    </div>


                    <div className="run-control__item run-control__history">
                        <div className="run-control__history__header">
                            <Typography variant="h6">История</Typography>
                        </div>
                        {
                            this.state.history.length !== 0 ?
                                <div className="run-control__history__scroll">


                                    {
                                        this.state.startNode !== undefined
                                            ?
                                            <div className="run-control__history__row" key={0}>
                                                <span className="run-control__history__index">{0}</span>
                                                {
                                                    <Tooltip
                                                        title={<Typography className="display-linebreak">{"~"}</Typography>}>
                                                        <div
                                                            className="run-control__history__node"
                                                            style={{ border: `${this.state.startNode!.isInitial ? "#0041d0" : this.state.startNode!.isAdmit ? "#ff0072" : "#000000"} 2px solid` }}
                                                        >
                                                            {this.state.startNode!.label}
                                                        </div>
                                                    </Tooltip>
                                                }
                                            </div>
                                            : <div />
                                    }

                                    {
                                        this.state.history.map((nodes, index) => (
                                            <div className="run-control__history__row" key={index}>
                                                <span className="run-control__history__index">{index + 1}</span>
                                                {
                                                    nodes.map((node, index) => (
                                                        <Tooltip
                                                            title={<Typography className="display-linebreak">{node.b !== undefined ? node.b.join('\n') : ''}</Typography>}>
                                                            <div
                                                                className="run-control__history__node"
                                                                style={{ border: `${node.a.isInitial ? "#0041d0" : node.a.isAdmit ? "#ff0072" : "#000000"} 2px solid` }}
                                                            >
                                                                {node.a.label}
                                                            </div>
                                                        </Tooltip>
                                                    ))
                                                }
                                            </div>
                                        ))
                                    }
                                    <div ref={this.historyEndRef} />
                                </div>
                                :
                                <div className="run-control__history__placeholder">
                                    Используйте пошаговый запуск, чтобы наблюдать за историей
                                </div>
                        }
                    </div>

                </div>
            </ControlWrapper>
        )
    }
}

export default withComputerType(RunControl);