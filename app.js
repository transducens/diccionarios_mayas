document.getElementById('searchBtn').addEventListener('click', lookupWord);
document.getElementById('wordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') lookupWord();
});

/**
 * Helper function to normalize text (Fuzzy Matching).
 */
function normalizeText(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .trim()
        .replace(/[ʼ’‘`´]/g, "'") // Unifies varying glottal stop characters
        .normalize("NFD")          // Decomposes accented characters
        .replace(/[\u0300-\u036f]/g, "") // Removes isolated accents
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

    // STEP 1: Fetch the small index map file
    fetch(`diccionarios/${language}_index.json`)
        .then(response => {
            if (!response.ok) throw new Error("Índice del diccionario no encontrado.");
            return response.json();
        })
        .then(indexData => {
            // Filter the index for fuzzy matching entries
            const allMatches = indexData.filter(item => {
                const cleanIndexWord = normalizeText(item.word);
                return cleanIndexWord === cleanUserInput || cleanIndexWord.includes(cleanUserInput);
            });

            // Limit to top 5 matches
            const topMatches = allMatches.slice(0, 5);

            if (topMatches.length === 0) {
                showError(`No se encontraron resultados para "${userInput}".`);
                return;
            }

            // STEP 2: Fire parallel fetch requests for the specific entry JSON files via their UUID
            const fetchPromises = topMatches.map(match => {
                return fetch(`diccionarios/${language}/${match.uuid}.json`)
                    .then(res => {
                        if (!res.ok) throw new Error(`No se pudo cargar la entrada: ${match.word}`);
                        return res.json();
                    });
            });

            // Wait for all individual files to download, then render them together
            return Promise.all(fetchPromises);
        })
        .then(fullEntries => {
            if (!fullEntries) return; // Caught by previous empty check

            // Hack to dynamically populate header info using metadata from the first entry
            // if your individual files still retain dictionary properties, otherwise customize.
            if(fullEntries[0]) {
               document.getElementById('dictionaryTitle').textContent = "Diccionario bilingüe";
               document.getElementById('dictionaryAuthor').textContent = "Proyecto Lingüístico Francisco Marroquín";
            }

            // Render all matching cards to the container
            fullEntries.forEach(entry => displayResultCard(entry, resultBox));
            resultBox.classList.remove('hidden');
        })
        .catch(error => {
            console.error(error);
            showError("Ocurrió un error al buscar la palabra o cargar los fragmentos.");
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