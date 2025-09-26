let stateId = 0;

/**
 * Represents a state in the NFA.
 */
class State {
    constructor(isAccepting = false) {
        this.id = stateId++;
        this.isAccepting = isAccepting;
        this.transitions = new Map(); // Map<symbol, Set<State>>
    }

    addTransition(symbol, state) {
        if (!this.transitions.has(symbol)) {
            this.transitions.set(symbol, new Set());
        }
        this.transitions.get(symbol).add(state);
    }
}

/**
 * Represents an NFA fragment with a start and end state.
 */
class NFAFragment {
    constructor(startState, endState) {
        this.startState = startState;
        this.endState = endState;
    }
}

/**
 * Converts an AST to an NFA using Thompson's Construction.
 * @param {object} ast The Abstract Syntax Tree from the parser.
 * @returns {NFAFragment} The final NFA.
 */
function astToNfa(ast) {
    stateId = 0; // Reset state counter for each generation
    const nfa = buildNfaForNode(ast);
    nfa.endState.isAccepting = true;
    return nfa;
}

function buildNfaForNode(node) {
    switch (node.type) {
        case 'CHAR':
            return buildNfaForChar(node);
        case 'CONCAT':
            return buildNfaForConcat(node);
        case 'ALTERNATION':
            return buildNfaForAlternation(node);
        case 'KLEENE_STAR':
            return buildNfaForKleeneStar(node);
        default:
            throw new Error(`Unknown AST node type: ${node.type}`);
    }
}

function buildNfaForChar(node) {
    const startState = new State();
    const endState = new State();
    startState.addTransition(node.value, endState);
    return new NFAFragment(startState, endState);
}

function buildNfaForConcat(node) {
    const leftNfa = buildNfaForNode(node.left);
    const rightNfa = buildNfaForNode(node.right);
    
    // Connect left's end state to right's start state with an epsilon transition
    leftNfa.endState.addTransition('ε', rightNfa.startState);
    
    return new NFAFragment(leftNfa.startState, rightNfa.endState);
}

function buildNfaForAlternation(node) {
    const startState = new State();
    const endState = new State();
    const leftNfa = buildNfaForNode(node.left);
    const rightNfa = buildNfaForNode(node.right);

    startState.addTransition('ε', leftNfa.startState);
    startState.addTransition('ε', rightNfa.startState);
    leftNfa.endState.addTransition('ε', endState);
    rightNfa.endState.addTransition('ε', endState);

    return new NFAFragment(startState, endState);
}

function buildNfaForKleeneStar(node) {
    const startState = new State();
    const endState = new State();
    const childNfa = buildNfaForNode(node.child);

    startState.addTransition('ε', childNfa.startState);
    startState.addTransition('ε', endState); // Zero occurrences

    childNfa.endState.addTransition('ε', childNfa.startState); // Loop for more occurrences
    childNfa.endState.addTransition('ε', endState);

    return new NFAFragment(startState, endState);
}