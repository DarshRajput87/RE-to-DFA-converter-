/**
 * Main function to orchestrate the direct-to-DFA process.
 */
function generateDfaDirectly(ast) {
    const calcData = calculateFollowpos(ast);
    const { dfa, trace } = buildDfaFromFollowpos(calcData);

    return {
        dfa,
        trace, // The new calculation trace
        annotatedAst: calcData.augmentedAst,
        positions: calcData.positions,
        followpos: calcData.followpos
    };
}

/**
 * Calculates nullable, firstpos, lastpos, and followpos for a given AST.
 */
function calculateFollowpos(ast) {
    let position = 0;
    const positions = new Map();
    const followpos = new Map();

    const augmentedAst = { type: 'CONCAT', left: ast, right: { type: 'CHAR', value: '#' } };

    // This is a post-order traversal: children are processed before their parents.
    function traverse(node) {
        if (!node) return;

        if (node.type === 'CHAR') {
            position++;
            node.position = position;
            positions.set(position, node.value);
            if (node.value !== 'ε') {
                followpos.set(position, new Set());
                node.nullable = false;
                node.firstpos = new Set([position]);
                node.lastpos = new Set([position]);
            } else {
                node.nullable = true;
                node.firstpos = new Set();
                node.lastpos = new Set();
            }
            return;
        }

        traverse(node.child);
        traverse(node.left);
        traverse(node.right);

        switch (node.type) {
            case 'ALTERNATION':
                node.nullable = node.left.nullable || node.right.nullable;
                node.firstpos = new Set([...node.left.firstpos, ...node.right.firstpos]);
                node.lastpos = new Set([...node.left.lastpos, ...node.right.lastpos]);
                break;
            case 'CONCAT':
                node.nullable = node.left.nullable && node.right.nullable;
                node.firstpos = node.left.nullable ? new Set([...node.left.firstpos, ...node.right.firstpos]) : node.left.firstpos;
                node.lastpos = node.right.nullable ? new Set([...node.left.lastpos, ...node.right.lastpos]) : node.right.lastpos;
                for (const pos of node.left.lastpos) {
                    for (const fp of node.right.firstpos) {
                        followpos.get(pos).add(fp);
                    }
                }
                break;
            case 'KLEENE_STAR':
                node.nullable = true;
                node.firstpos = node.child.firstpos;
                node.lastpos = node.child.lastpos;
                for (const pos of node.lastpos) {
                    for (const fp of node.firstpos) {
                        followpos.get(pos).add(fp);
                    }
                }
                break;
        }
    }

    traverse(augmentedAst);
    return { augmentedAst, positions, followpos };
}

/**
 * Builds the DFA and a step-by-step trace from followpos calculations.
 */
function buildDfaFromFollowpos({ augmentedAst, positions, followpos }) {
    const trace = [];
    const alphabet = [...new Set([...positions.values()])].filter(c => c !== '#').sort();
    const posToKey = posSet => [...posSet].sort((a, b) => a - b).join(',');
    const dfaStates = new Map();
    const dfaStateInfo = [];
    const queue = [];
    const endPosition = positions.size;

    const startPosSet = augmentedAst.firstpos;
    if (startPosSet.size === 0) {
      return { dfa: { states: [], alphabet, startState: null }, trace: ["Empty regex results in an empty automaton."] };
    }

    const startKey = posToKey(startPosSet);
    queue.push(startPosSet);
    dfaStates.set(startKey, 0);
    trace.push(`- **Initial State**: q0 = firstpos(root) = {${startKey}}`);

    dfaStateInfo[0] = { id: 0, positions: startPosSet, isAccepting: startPosSet.has(endPosition), transitions: {} };

    let head = 0;
    while (head < queue.length) {
        const currentPosSet = queue[head++];
        const currentDfaId = dfaStates.get(posToKey(currentPosSet));
        trace.push(`\n- **Processing q${currentDfaId}** (positions {${posToKey(currentPosSet)}}):`);

        for (const symbol of alphabet) {
            const contributingPositions = [...currentPosSet].filter(p => positions.get(p) === symbol);
            if (contributingPositions.length === 0) continue;

            const nextPosSet = new Set();
            contributingPositions.forEach(pos => {
                followpos.get(pos).forEach(p => nextPosSet.add(p));
            });
            
            trace.push(`  - On input **'${symbol}'**: Union of followpos for positions {${contributingPositions.join(',')}} -> {${posToKey(nextPosSet) || ''}}`);

            if (nextPosSet.size > 0) {
                const nextKey = posToKey(nextPosSet);
                let nextDfaId;

                if (!dfaStates.has(nextKey)) {
                    nextDfaId = dfaStateInfo.length;
                    dfaStates.set(nextKey, nextDfaId);
                    dfaStateInfo[nextDfaId] = { id: nextDfaId, positions: nextPosSet, isAccepting: nextPosSet.has(endPosition), transitions: {} };
                    queue.push(nextPosSet);
                    trace.push(`    - This is a **new state**: q${nextDfaId}`);
                } else {
                    nextDfaId = dfaStates.get(nextKey);
                    trace.push(`    - This corresponds to existing state q${nextDfaId}`);
                }
                dfaStateInfo[currentDfaId].transitions[symbol] = nextDfaId;
            }
        }
    }

    return {
        dfa: { states: dfaStateInfo, alphabet, startState: 0 },
        trace
    };
}