export interface NodeCore  {
    id: number
    isAdmit: boolean
    stack?: string[]
}

export interface TransitionParams {
    title: string
    stackDown?: string
    stackPush?: string[]
}

export interface EdgeCore  {
    from: number
    to: number
    transitions: Set<TransitionParams>
}

export interface GraphCore  {
    nodes: NodeCore[]
    edges: EdgeCore[]
}