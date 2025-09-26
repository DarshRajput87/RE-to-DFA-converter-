/**
 * Parses a regular expression string into an Abstract Syntax Tree (AST).
 */
function parseRegex(regex) {
    // Add explicit concatenation operators ('.') to the regex string.
    let processedRegex = '';
    for (let i = 0; i < regex.length; i++) {
        processedRegex += regex[i];
        if (i + 1 < regex.length) {
            const current = regex[i];
            const next = regex[i + 1];
            if (isLiteral(current) && (isLiteral(next) || next === '(')) {
                processedRegex += '.';
            } else if ((current === ')' || current === '*') && (isLiteral(next) || next === '(')) {
                processedRegex += '.';
            }
        }
    }

    const output = [];
    const operators = [];
    const precedence = { '|': 1, '.': 2, '*': 3 };

    for (const token of processedRegex) {
        if (isLiteral(token)) {
            output.push({ type: 'CHAR', value: token });
        } else if (token === '(') {
            operators.push(token);
        } else if (token === ')') {
            while (operators.length && operators[operators.length - 1] !== '(') {
                applyOperator(output, operators.pop());
            }
            operators.pop(); // Pop '('
        } else { // Is an operator
            while (
                operators.length &&
                operators[operators.length - 1] !== '(' &&
                precedence[operators[operators.length - 1]] >= precedence[token]
            ) {
                applyOperator(output, operators.pop());
            }
            operators.push(token);
        }
    }

    while (operators.length) {
        applyOperator(output, operators.pop());
    }

    if (output.length !== 1) {
        throw new Error("Invalid syntax in regular expression.");
    }

    return output[0];
}

function isLiteral(char) {
    // Considers letters and numbers as literals.
    return /^[a-zA-Z0-9]$/.test(char);
}

function applyOperator(output, operator) {
    if (operator === '*') {
        if (output.length < 1) throw new Error("Invalid syntax for Kleene star.");
        const operand = output.pop();
        output.push({ type: 'KLEENE_STAR', child: operand });
    } else { // For '|' and '.'
        if (output.length < 2) throw new Error(`Invalid syntax for operator '${operator}'.`);
        const right = output.pop();
        const left = output.pop();
        const type = operator === '|' ? 'ALTERNATION' : 'CONCAT';
        output.push({ type, left, right });
    }
}