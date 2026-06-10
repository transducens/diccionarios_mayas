document.getElementById('searchBtn').addEventListener('click', lookupWord);
document.getElementById('wordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') lookupWord();
});

/**
 * Helper function to normalize text (Fuzzy Matching).
 * Converts to lowercase, unifies apostrophe types, removes accents,
 * and strips parenthetical dictionary notes like "(tat)".
 */
function normalizeText(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .trim()
        .replace(/[ʼ’‘`´]/g, "'") // Unifies varying glottal stop characters
        .normalize("NFD")          // Decomposes accented characters
        .replace(/[\u0300-\u036f]/g, "") // Removes the isolated accents
        .replace(/\s*\(.*?\)\s*/g, "");  // Strips tracking tags like "(tat)"
}

function lookupWord() {
    const language = document.getElementById('languageSelect').value;
    const userInput = document.getElementById('wordInput').value;

    const resultBox = document.getElementById('resultBox');
    const errorBox = document.getElementById('errorMessage');

    // Reset UI
    resultBox.innerHTML = '';
    resultBox.classList.add('hidden');
    errorBox.classList.add('hidden');

    if (!userInput.trim()) {
        showError("Por favor, ingrese una palabra.");
        return;
    }

    const cleanUserInput = normalizeText(userInput);

    fetch(`diccionarios/${language}.json`)
        .then(response => {
            if (!response.ok) throw new Error("Archivo de diccionario no encontrado.");
            return response.json();
        })
        .then(data => {
            // Update Dictionary Metadata dynamically from JSON header
            document.getElementById('dictionaryTitle').textContent = data.headline;
            const authorNames = data.author.map(a => a.name).join(', ');
            document.getElementById('dictionaryAuthor').textContent = `Por: ${authorNames} (${data.publisher.name})`;

            const entries = data.content.body;

            // 1. Fuzzy and Substring search filtering
            const allMatches = entries.filter(entry => {
                const cleanEntry = normalizeText(entry.entryWord);
                return cleanEntry === cleanUserInput || cleanEntry.includes(cleanUserInput);
            });

            // 2. Performance & UI Cap: slice down to top 5 results
            const topMatches = allMatches.slice(0, 5);

            // 3. Render matching entries
            if (topMatches.length > 0) {
                topMatches.forEach(entry => displayResultCard(entry, resultBox));
                resultBox.classList.remove('hidden');
            } else {
                showError(`No se encontraron resultados para "${userInput}".`);
            }
        })
        .catch(error => {
            console.error(error);
            showError("Ocurrió un error al cargar el diccionario.");
        });
}

/**
 * Generates and appends an HTML structural card for each matching entry found
 */
function displayResultCard(entry, container) {
    const card = document.createElement('div');
    card.className = 'result-card';

    // Loop through examples array if present
    let examplesHTML = '';
    if (entry.examples && entry.examples.length > 0) {
        examplesHTML = `
            <h3>Ejemplos:</h3>
            <ul class="examples-list">
                ${entry.examples.map(ex => `
                    <li>
                        <p class="ex-maya"><strong>${ex.example_maya}</strong></p>
                        <p class="ex-spa"><em>${ex.example_spa}</em></p>
                    </li>
                `).join('')}
            </ul>
        `;
    } else {
        examplesHTML = `<p class="no-examples">No hay ejemplos disponibles para esta palabra.</p>`;
    }

    // Combine structural fields into the card template
    card.innerHTML = `
        <h2 class="result-word">${entry.entryWord}</h2>
        <p class="result-definition">${entry.definition}</p>
        ${entry.additional_text ? `<p class="notes"><strong>Notas:</strong> ${entry.additional_text}</p>` : ''}
        <div class="examples-section">${examplesHTML}</div>
    `;

    container.appendChild(card);
}

function showError(message) {
    const errorBox = document.getElementById('errorMessage');
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
}
