/** Renders all results based on the final data */
function renderAll(dfa, trace, annotatedAst, positions, followpos) {
    renderAstDiagram(annotatedAst);
    renderFollowposTable({ positions, followpos });
    renderDfaCalculationTrace(trace);
    renderDfa(dfa);
}

/** Renders the final DFA table and diagram */
function renderDfa(dfa) {
    renderDfaTable(dfa);
    renderDfaDiagram(dfa);
}

function renderDfaTable(dfa) {
    const container = document.getElementById('dfa-table-container');
    container.innerHTML = '';
    if (!dfa || !dfa.states || dfa.states.length === 0) return;

    const table = document.createElement('table');
    const header = table.createTHead().insertRow();
    header.insertCell().textContent = 'State (Positions)';
    dfa.alphabet.forEach(symbol => header.insertCell().textContent = `'${symbol}'`);
    const body = table.createTBody();
    dfa.states.forEach(state => {
        const row = body.insertRow();
        let stateLabel = `q${state.id}`;
        if (state.id === dfa.startState) stateLabel += ' (Start)';
        if (state.isAccepting) stateLabel += ' (Accept)';
        const positionsText = [...state.positions].sort((a,b)=>a-b).join(', ');
        row.insertCell().innerHTML = `<strong>${stateLabel}</strong><br><small>{${positionsText}}</small>`;
        dfa.alphabet.forEach(symbol => {
            const nextStateId = state.transitions[symbol];
            row.insertCell().textContent = nextStateId !== undefined ? `q${nextStateId}` : '—';
        });
    });
    container.appendChild(table);
}

/**
 * Renders the DFA diagram with a fix for the initial layout. (UPDATED)
 */
function renderDfaDiagram(dfa) {
    const container = document.getElementById('dfa-diagram-container');
    container.innerHTML = '';
    if (!dfa || !dfa.states || dfa.states.length === 0) return;

    const nodes = new vis.DataSet(dfa.states.map(state => {
        let label = `q${state.id}`;
        if (state.id === dfa.startState) label += '\n(Start)';
        const node = { id: state.id, label: label, font: { size: 16 } };
        if (state.isAccepting) {
            node.shape = 'doubleCircle';
            node.color = { border: '#2E7D32', background: '#E8F5E9' };
            node.borderWidth = 2;
        }
        return node;
    }));

    const edges = new vis.DataSet();
    const transitionGroups = new Map();

    dfa.states.forEach(state => {
        for (const symbol in state.transitions) {
            const fromId = state.id;
            const toId = state.transitions[symbol];
            const key = `${fromId}_${toId}`;
            if (!transitionGroups.has(key)) {
                transitionGroups.set(key, []);
            }
            transitionGroups.get(key).push(symbol);
        }
    });

    for (const [key, symbols] of transitionGroups.entries()) {
        const [fromId, toId] = key.split('_');
        edges.add({
            from: parseInt(fromId),
            to: parseInt(toId),
            label: symbols.sort().join(', '),
            arrows: 'to',
            font: { align: 'middle', size: 14 },
            selfReference: { size: 20, angle: Math.PI / 4 }
        });
    }
    
    nodes.add({ id: 'start_node', shape: 'point', size: 0 });
    edges.add({ from: 'start_node', to: dfa.startState, arrows: 'to', length: 100, color: { color: '#333' } });
    
    const data = { nodes, edges };
    const options = {
        layout: {
            hierarchical: {
                enabled: true,
                direction: 'LR',
                sortMethod: 'directed',
                nodeSpacing: 200,
                levelSeparation: 250
            }
        },
        physics: {
            // Enable physics initially to let the layout settle
            enabled: true,
            hierarchicalRepulsion: {
                nodeDistance: 150
            },
            solver: 'hierarchicalRepulsion'
        },
        nodes: { shape: 'circle', size: 30, color: { border: '#345eeb', background: '#E3F2FD' } },
        edges: { width: 1.5, smooth: { type: 'curvedCW', roundness: 0.15 } }
    };
    
    const network = new vis.Network(container, data, options);

    // --- FIX FOR INITIAL RENDERING ---
    // Let the network stabilize for a moment, then turn off physics and fit the view.
    network.on("stabilizationIterationsDone", function () {
        network.setOptions({ physics: false });
        network.fit(); // This centers and zooms the diagram correctly
    });
}

/** Renders the step-by-step calculation of DFA states. */
function renderDfaCalculationTrace(trace) {
    const container = document.getElementById('dfa-calculation-container');
    if (!trace) {
        container.innerHTML = '';
        return;
    }
    const htmlTrace = trace.map(line => {
        return line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }).join('<br>');

    container.innerHTML = `<div style="font-family: monospace; line-height: 1.6;">${htmlTrace}</div>`;
}

/** Renders the AST in a traditional, wide, bottom-up style. */
function renderAstDiagram(ast) {
    const container = document.getElementById('ast-diagram-container');
    container.innerHTML = '';
    if(!ast) return;
    
    const nodes = new vis.DataSet();
    const edges = new vis.DataSet();
    let nodeIdCounter = 0;

    const setToString = s => `{${[...s].sort((a,b)=>a-b).join(',')}}`;

    function buildGraph(node) {
        if (!node) return null;

        const nodeId = nodeIdCounter++;
        let label, nodeColor;
        
        const nodeType = node.type === 'CONCAT' ? '·' : (node.type === 'ALTERNATION' ? '|' : (node.type === 'KLEENE_STAR' ? '*' : ''));
        if (nodeType) {
            label = `${setToString(node.firstpos)}  ${nodeType}  ${setToString(node.lastpos)}`;
            nodeColor = '#D1E7DD';
        } else {
            label = `${setToString(node.firstpos)}  '${node.value}'  ${setToString(node.lastpos)}\n(pos ${node.position})`;
            nodeColor = '#FEF3CD';
        }
        
        nodes.add({ 
            id: nodeId, label: label, shape: 'box',
            font: { multi: true, face: 'monospace', size: 14, align: 'center' },
            color: { background: nodeColor, border: '#555' },
            margin: 10
        });

        const leftId = buildGraph(node.left);
        const rightId = buildGraph(node.right);
        const childId = buildGraph(node.child);

        if (leftId !== null) edges.add({ from: leftId, to: nodeId, arrows: 'to' });
        if (rightId !== null) edges.add({ from: rightId, to: nodeId, arrows: 'to' });
        if (childId !== null) edges.add({ from: childId, to: nodeId, arrows: 'to' });
        
        return nodeId;
    }

    buildGraph(ast);

    const data = { nodes, edges };
    const options = {
        layout: {
            hierarchical: {
                enabled: true,
                direction: 'DU',
                sortMethod: 'directed',
                levelSeparation: 100,
                nodeSpacing: 150,
            }
        },
        physics: false
    };
    new vis.Network(container, data, options);
}

function renderFollowposTable(data) {
    const container = document.getElementById('followpos-table-container');
    container.innerHTML = '';
    if(!data) return;

    const table = document.createElement('table');
    const header = table.createTHead().insertRow();
    header.insertCell().textContent = 'Position (i)';
    header.insertCell().textContent = 'Symbol';
    header.insertCell().textContent = 'followpos(i)';
    const body = table.createTBody();
    for (const [pos, symbol] of data.positions.entries()) {
        const row = body.insertRow();
        row.insertCell().innerHTML = `<strong>${pos}</strong>`;
        row.insertCell().textContent = symbol === '#' ? 'End Marker' : `'${symbol}'`;
        const followposSet = data.followpos.get(pos);
        row.insertCell().textContent = `{${[...followposSet].sort((a,b)=>a-b).join(', ')}}`;
    }
    container.appendChild(table);
}