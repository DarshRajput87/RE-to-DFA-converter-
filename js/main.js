document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const regexInput = document.getElementById('regex-input');
    const errorContainer = document.getElementById('error-container');
    const resultsContainer = document.getElementById('results');

    const generate = () => {
        const regex = regexInput.value.trim();
        if (!regex) {
            showError("Please enter a regular expression.");
            return;
        }

        try {
            const ast = parseRegex(regex);
            
            // Generate everything, including the new trace
            const { dfa, trace, annotatedAst, positions, followpos } = generateDfaDirectly(ast);

            // Render all components in the new order
            renderAstDiagram(annotatedAst);
            renderFollowposTable({ positions, followpos });
            renderDfaCalculationTrace(trace); // Render the new trace
            renderDfa(dfa);

            resultsContainer.style.display = 'block';
            errorContainer.style.display = 'none';

        } catch (error) {
            console.error(error);
            showError(`Error generating DFA: ${error.message}. Please check your syntax.`);
            resultsContainer.style.display = 'none';
        }
    };

    generateBtn.addEventListener('click', generate);
    regexInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') generate(); });
    function showError(message) { /* ... same as before ... */ }

    // Generate for the default value on page load
    generate();
});