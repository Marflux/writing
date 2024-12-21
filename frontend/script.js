let userId;
let username;
let selectedLetter = 'a';
const canvas = document.getElementById('letterCanvas');
const ctx = canvas.getContext('2d');
let drawing = false;
let lastX = 0, lastY = 0;
let fastScanLetters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'; // Letters to scan
let currentFastScanIndex = 0;




// Wartezeit (ms), bevor das Zeichnen aktiviert wird
const drawDelay = 50;
let drawTimeout;

// Zeichnen starten
letterCanvas.addEventListener('mousedown', (event) => {
    event.preventDefault(); // Standardaktionen verhindern
    drawTimeout = setTimeout(() => {
        isDrawing = true;
        const rect = letterCanvas.getBoundingClientRect();
        lastX = event.clientX - rect.left;
        lastY = event.clientY - rect.top;
    }, drawDelay);
});

letterCanvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    drawTimeout = setTimeout(() => {
        isDrawing = true;
        const touch = event.touches[0];
        const rect = letterCanvas.getBoundingClientRect();
        lastX = touch.clientX - rect.left;
        lastY = touch.clientY - rect.top;
    }, drawDelay);
});

// Zeichnen beenden
letterCanvas.addEventListener('mouseup', () => {
    clearTimeout(drawTimeout);
    isDrawing = false;
});

letterCanvas.addEventListener('touchend', () => {
    clearTimeout(drawTimeout);
    isDrawing = false;
});

// Mausbewegungen zeichnen
letterCanvas.addEventListener('mousemove', (event) => {
    if (!isDrawing) return;

    const rect = letterCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
});

// Touchbewegungen zeichnen
letterCanvas.addEventListener('touchmove', (event) => {
    if (!isDrawing) return;

    const touch = event.touches[0];
    const rect = letterCanvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
});

// Kontextmenü verhindern
letterCanvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});


// Registrierung
function register() {
    const uname = document.getElementById('username').value;
    const pwd = document.getElementById('password').value;

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname, password: pwd })
    }).then(res => res.json()).then(data => {
        alert(data.success ? 'Registriert!' : data.error);
    });
}

// Login
function login() {
    const uname = document.getElementById('username').value;
    const pwd = document.getElementById('password').value;

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname, password: pwd })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            userId = data.userId;
            username = data.username;

            // Update user info and display it
            document.getElementById('user-info').style.display = 'block';
            document.getElementById('logged-in-user').textContent = `Eingeloggt als: ${username}`;

            // Hide login section and show app sections
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('app-section').style.display = 'block';
            document.getElementById('pdf-section').style.display = 'block';
            document.getElementById('settings-section').style.display = 'block';

            renderLetterGrid();
            loadSettings();
        } else {
            alert('Falsche Anmeldedaten');
        }
    });
}







// Call validateSession when the page loads
window.onload = validateSession;


function logout() {
    fetch('/logout', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                userId = null;
                username = null;

                // Hide user info and show login section
                document.getElementById('user-info').style.display = 'none';
                document.getElementById('login-section').style.display = 'block';
                document.getElementById('app-section').style.display = 'none';
                document.getElementById('pdf-section').style.display = 'none';
                document.getElementById('settings-section').style.display = 'none';

                alert('Du wurdest abgemeldet');
            }
        });
}


function validateSession() {
    fetch('/validate-session')
        .then((res) => res.json())
        .then((data) => {
            if (data.success) {
                userId = data.userId;
                username = data.username;

                document.getElementById('user-info').style.display = 'block';
                document.getElementById('logged-in-user').textContent = `Eingeloggt als: ${username}`;
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('app-section').style.display = 'block';
                document.getElementById('settings-section').style.display = 'block';
                document.getElementById('pdf-section').style.display = 'block';

                renderLetterGrid();
                loadSettings();
            } else {
                document.getElementById('login-section').style.display = 'block';
            }
        })
        .catch((err) => {
            console.error('Error validating session:', err);
            document.getElementById('login-section').style.display = 'block';
        });
}


function showLoginSection() {
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('app-section').style.display = 'none';
    document.getElementById('settings-section').style.display = 'none';
    document.getElementById('pdf-section').style.display = 'none';
}



function loadSettings() {
    fetch(`/get-settings/${userId}`)
        .then(res => res.json())
        .then(data => {
            if (data.settings) {
                document.getElementById('letterSpacing').value = data.settings.letter_spacing;
                document.getElementById('wordSpacing').value = data.settings.word_spacing;
                document.getElementById('sideSpacing').value = data.settings.side_spacing;
                document.getElementById('letterSize').value = data.settings.letter_size;
                document.getElementById('lineWidth').value = data.settings.line_width;
                document.getElementById('lineSpacing').value = data.settings.line_spacing;
                document.getElementById('messyFactor').value = data.settings.messy_factor;
            }
        })
        .catch(err => console.error('Error loading settings:', err));
}


function deleteLetter(letter, index) {
    fetch('/delete-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, letter, index, username }),
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Letter deleted successfully');
                renderLetterGrid();
            } else {
                alert('Error deleting letter');
            }
        })
        .catch(err => console.error('Error:', err));
}


// Buchstabenauswahl anzeigen
function renderLetterGrid() {
    const container = document.getElementById('letter-select');
    const currentLetterSpan = document.getElementById('current-letter');
    const savedLettersContainer = document.getElementById('saved-letters-container');
    const savedLettersDiv = document.getElementById('saved-letters');

    container.innerHTML = '';

    fetch(`/get-saved-letters/${userId}?username=${username}`)
        .then(res => res.json())
        .then(data => {
            const savedLetters = data.savedLetters || [];

            for (const letter of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') {
                const btn = document.createElement('button');
                btn.textContent = letter;

                if (savedLetters.includes(letter)) {
                    btn.style.backgroundColor = 'green';
                } else {
                    btn.style.backgroundColor = 'gray';
                }

                btn.onclick = () => {
                    selectedLetter = letter;
                    currentLetterSpan.textContent = letter;
                    clearCanvas();
                    drawLetterGuide();

                    fetch(`/get-saved-instances/${userId}/${letter}?username=${username}`)
                        .then(res => res.json())
                        .then(data => {
                            const savedInstances = data.savedInstances || [];
                            savedLettersDiv.innerHTML = '';

                            if (savedInstances.length > 0) {
                                savedLettersContainer.style.display = 'block';
                                savedInstances.forEach((base64Image, index) => {
                                    const container = document.createElement('div');
                                    container.style.position = 'relative';

                                    const img = document.createElement('img');
                                    img.src = base64Image;
                                    img.style.width = '50px';
                                    img.style.height = '50px';

                                    const deleteButton = document.createElement('button');
                                    deleteButton.textContent = 'Löschen';
                                    deleteButton.style.position = 'absolute';
                                    deleteButton.style.top = '0';
                                    deleteButton.style.right = '0';

                                    deleteButton.onclick = () => deleteLetter(letter, index);

                                    container.appendChild(img);
                                    container.appendChild(deleteButton);
                                    savedLettersDiv.appendChild(container);
                                });
                            } else {
                                savedLettersContainer.style.display = 'none';
                            }
                        });
                };

                container.appendChild(btn);
            }
        });
}






// Zeichnen: Maus-Events
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

// Zeichnen: Touch-Events
canvas.addEventListener('touchstart', startTouchDrawing, { passive: true });
canvas.addEventListener('touchmove', drawTouch, { passive: true });
canvas.addEventListener('touchend', stopDrawing);

// Zeichnen starten
function startDrawing(event) {
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = event.clientX - rect.left;
    lastY = event.clientY - rect.top;
}

// Touch-Zeichnen starten
function startTouchDrawing(event) {
    drawing = true;
    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    lastX = touch.clientX - rect.left;
    lastY = touch.clientY - rect.top;
}

// Zeichnen: Maus
function draw(event) {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
}

// Zeichnen: Touch
function drawTouch(event) {
    if (!drawing) return;

    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
}

// Zeichnen stoppen
function stopDrawing() {
    drawing = false;
    ctx.beginPath();
}

// Canvas leeren
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Nur Vordergrund-Canvas bereinigen
}


// Buchstabe speichern
function saveLetter() {
    console.log('--- Speichervorgang gestartet ---');
    console.log('Aktueller Benutzer:', username);
    console.log('Aktueller Buchstabe:', selectedLetter);

    // Convert canvas to base64
    const base64Image = canvas.toDataURL('image/png');

    // Send data to the backend
    fetch('/upload-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            letterImage: base64Image,
            letter: selectedLetter,
            username: username,
            userId: userId,
        }),
    })
        .then((res) => res.json())
        .then((data) => {
            console.log('Serverantwort:', data);
            if (data.success) {
                alert('Buchstabe erfolgreich gespeichert!');
                clearCanvas(); // Clear the canvas after saving
                drawLetterGuide(selectedLetter); // Re-draw the guide lines
                renderLetterGrid(); // Refresh the letter grid
            } else {
                alert('Fehler: ' + data.error);
            }
        })
        .catch((err) => console.error('Fetch-Fehler:', err.message));
}






// First, remove the onclick attribute from your HTML button. Change this line in index.html:
// FROM: <button onclick="generateHandwrittenText()">Handschrift-PDF erstellen</button>
// TO: <button id="generate-pdf-button">Handschrift-PDF erstellen</button>

// Then update the event listener code in script.js:
function generateHandwrittenText() {
    // Get all settings
    const settings = {
        letterSpacing: parseInt(document.getElementById('letterSpacing').value),
        wordSpacing: parseInt(document.getElementById('wordSpacing').value),
        sideSpacing: parseInt(document.getElementById('sideSpacing').value),
        letterSize: parseInt(document.getElementById('letterSize').value),
        lineWidth: parseInt(document.getElementById('lineWidth').value),
        lineSpacing: parseInt(document.getElementById('lineSpacing').value),
        messyFactor: parseInt(document.getElementById('messyFactor').value)
    };

    const text = document.getElementById('userText').value;
    
    if (!text) {
        alert('Bitte geben Sie einen Text ein.');
        return;
    }

    console.log('Starting PDF generation');

    fetch('/generate-pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: text,
            username: username,
            settings: settings
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'PDF generation failed');
            });
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `handwritten_${new Date().toISOString().slice(0,10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log('PDF generated and download started');
    })
    .catch(error => {
        console.error('Error generating PDF:', error);
        alert('Fehler beim Generieren des PDFs: ' + error.message);
    });
}

// Add single event listener when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const generatePDFButton = document.getElementById('generate-pdf-button');
    if (generatePDFButton) {
        generatePDFButton.addEventListener('click', generateHandwrittenText);
    }
});









function saveSettings() {
    const settings = {
        letterSpacing: document.getElementById('letterSpacing').value,
        wordSpacing: document.getElementById('wordSpacing').value,
        sideSpacing: document.getElementById('sideSpacing').value,
        letterSize: document.getElementById('letterSize').value,
        lineWidth: document.getElementById('lineWidth').value,
        lineSpacing: document.getElementById('lineSpacing').value,
        messyFactor: document.getElementById('messyFactor').value
    };

    fetch('/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, settings })
    }).then(res => res.json()).then(data => {
        console.log('Settings saved:', data);
    }).catch(err => console.error('Error saving settings:', err));
}


function drawLetterGuide() {
    const guideCanvas = document.getElementById('guideCanvas');
    const guideCtx = guideCanvas.getContext('2d');

    // Canvas bereinigen
    guideCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);

    guideCtx.strokeStyle = '#cccccc';
    guideCtx.lineWidth = 1;

    const canvasHeight = guideCanvas.height;
    const canvasWidth = guideCanvas.width;

    // Schreibhilfen: Höhen
    const topLineY = canvasHeight * 0.2;
    const xHeightY = canvasHeight * 0.5;
    const baselineY = canvasHeight * 0.8;
    const descenderY = canvasHeight * 0.9;

    // Schreibhilfen: Breite
    const letterStartX = canvasWidth * 0.25; // 25% vom linken Rand
    const letterEndX = canvasWidth * 0.75; // 75% vom linken Rand

    // Farben für Größenfenster
    guideCtx.fillStyle = 'rgba(200, 200, 255, 0.3)'; // Blau: Großbuchstaben
    guideCtx.fillRect(10, topLineY, canvasWidth - 20, baselineY - topLineY);

    guideCtx.fillStyle = 'rgba(200, 255, 200, 0.3)'; // Grün: Kleinbuchstaben
    guideCtx.fillRect(10, xHeightY, canvasWidth - 20, baselineY - xHeightY);

    guideCtx.fillStyle = 'rgba(255, 200, 200, 0.3)'; // Rot: Unterlängen
    guideCtx.fillRect(10, baselineY, canvasWidth - 20, descenderY - baselineY);

    // Linien zeichnen: Höhen
    drawHorizontalLine(guideCtx, topLineY, 'Oberkante');
    drawHorizontalLine(guideCtx, xHeightY, 'x-Höhe');
    drawHorizontalLine(guideCtx, baselineY, 'Grundlinie');
    drawHorizontalLine(guideCtx, descenderY, 'Unterkante');

    // Linien zeichnen: Breitenbereich
    guideCtx.strokeStyle = '#888888';
    guideCtx.beginPath();
    guideCtx.moveTo(letterStartX, topLineY);
    guideCtx.lineTo(letterStartX, descenderY);
    guideCtx.stroke();

    guideCtx.beginPath();
    guideCtx.moveTo(letterEndX, topLineY);
    guideCtx.lineTo(letterEndX, descenderY);
    guideCtx.stroke();

    // Beschriftungen für Breitenbereich
    guideCtx.fillStyle = '#666';
    guideCtx.font = '10px Arial';
    guideCtx.fillText('Start', letterStartX - 20, topLineY - 5);
    guideCtx.fillText('Ende', letterEndX + 5, topLineY - 5);
}

function drawHorizontalLine(ctx, y, label = '') {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(ctx.canvas.width - 10, y);
    ctx.stroke();

    ctx.fillStyle = '#888888';
    ctx.font = '10px Arial';
    ctx.fillText(label, 15, y - 5);
}


function drawVerticalGuide() {
    // Vertikale Linie links und rechts zur Orientierung
    const canvasWidth = canvas.width;
    ctx.beginPath();
    ctx.moveTo(canvasWidth * 0.1, 10);
    ctx.lineTo(canvasWidth * 0.1, canvas.height - 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvasWidth * 0.9, 10);
    ctx.lineTo(canvasWidth * 0.9, canvas.height - 10);
    ctx.stroke();

    // Beschriftung links und rechts
    ctx.fillStyle = '#888888';
    ctx.font = '12px Arial';
    ctx.fillText('Start (Links)', canvasWidth * 0.1 - 20, 25);
    ctx.fillText('Ende (Rechts)', canvasWidth * 0.9 - 20, 25);
}

function isUppercase(letter) {
    if (typeof letter !== 'string') return false; // Sicherstellen, dass letter ein String ist
    return letter === letter.toUpperCase() && letter.match(/[A-Z]/);
}


function hasDescender(letter) {
    return 'gjpqy'.includes(letter);
}






// Add event listeners to all sliders to log their names and values
function attachSliderListeners() {
    const sliders = document.querySelectorAll('#settings-section input[type="range"]');
    sliders.forEach(slider => {
        slider.addEventListener('input', () => {
            console.log(`Slider: ${slider.id}, Value: ${slider.value}`);
        });
    });
}

// Call the function when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
    attachSliderListeners();
});


window.onload = function () {
    validateSession(); // Keep existing functionality
    console.log("Lade Schreibhilfe...");
    drawLetterGuide(); // Keep existing functionality
};
