/**
 * Converts an NFA to a DFA using the subset construction algorithm. (Corrected Version)
 * @param {NFAFragment} nfa The NFA to convert.
 * @returns {object} A DFA representation.
 */
function nfaToDfa(nfa) {
    const alphabet = getAlphabet(nfa.startState, new Set());
    const dfaStates = new Map(); // Maps a key (from a set of NFA states) to a DFA state ID
    const dfaStateInfo = [];   // Array of DFA state objects {id, isAccepting, transitions}
    const queue = [];

    // 1. The initial DFA state is the epsilon closure of the NFA's start state.
    const startSet = epsilonClosure(new Set([nfa.startState]));
    const startKey = setToKey(startSet);
    
    queue.push(startSet);
    dfaStates.set(startKey, 0);
    dfaStateInfo[0] = { 
        id: 0, 
        isAccepting: [...startSet].some(s => s.isAccepting), 
        transitions: {}
    };
    
    let head = 0;
    while (head < queue.length) {
        const currentNfaSet = queue[head++];
        const currentDfaId = dfaStates.get(setToKey(currentNfaSet));

        // 2. For each symbol in the alphabet, compute the next state.
        for (const symbol of alphabet) {
            const moveSet = move(currentNfaSet, symbol);
            if (moveSet.size === 0) {
                continue; // No transition for this symbol, leads to a non-final trap state (which we omit)
            }
            
            const nextNfaSet = epsilonClosure(moveSet);
            const nextKey = setToKey(nextNfaSet);
            
            let nextDfaId;

            // 3. If this set of NFA states is new, create a new DFA state for it.
            if (!dfaStates.has(nextKey)) {
                nextDfaId = dfaStateInfo.length;
                dfaStates.set(nextKey, nextDfaId);
                dfaStateInfo[nextDfaId] = {
                    id: nextDfaId,
                    isAccepting: [...nextNfaSet].some(s => s.isAccepting),
                    transitions: {}
                };
                queue.push(nextNfaSet);
            } else {
                nextDfaId = dfaStates.get(nextKey);
            }
            
            // 4. Add the transition from the current DFA state to the next.
            dfaStateInfo[currentDfaId].transitions[symbol] = nextDfaId;
        }
    }
    
    return {
        states: dfaStateInfo,
        alphabet,
        startState: 0
    };
}

// Computes the set of states reachable from a set of states on epsilon transitions
function epsilonClosure(states) {
    const stack = [...states];
    const closure = new Set(states);
    while (stack.length) {
        const s = stack.pop();
        const epsilonTransitions = s.transitions.get('ε') || [];
        for (const targetState of epsilonTransitions) {
            if (!closure.has(targetState)) {
                closure.add(targetState);
                stack.push(targetState);
            }
        }
    }
    return closure;
}

// Computes the set of states reachable from a set of states on a given symbol
function move(states, symbol) {
    const reachable = new Set();
    for (const state of states) {
        const transitions = state.transitions.get(symbol) || [];
        for (const target of transitions) {
            reachable.add(target);
        }
    }
    return reachable;
}

// Creates a unique string key from a set of states for map lookup
function setToKey(stateSet) {
    return [...stateSet].map(s => s.id).sort((a, b) => a - b).join(',');
}

// Extracts the alphabet from the NFA (excluding epsilon)
function getAlphabet(startState, visited) {
    const alphabet = new Set();
    const stack = [startState];
    visited.add(startState);

    while(stack.length) {
        const state = stack.pop();
        for(const [symbol, targets] of state.transitions) {
            if (symbol !== 'ε') alphabet.add(symbol);
            for(const target of targets) {
                if(!visited.has(target)) {
                    visited.add(target);
                    stack.push(target);
                }
            }
        }
    }
    return [...alphabet].sort();
}