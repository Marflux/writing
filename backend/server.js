const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;


const cookieParser = require('cookie-parser');
app.use(cookieParser());


// Middleware für JSON und URL-encoded Daten
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statische Dateien und Uploads
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// SQLite-Datenbankverbindung
const db = new sqlite3.Database(path.join(__dirname, '../database.db'), (err) => {
    if (err) console.error('Fehler beim Verbinden mit der Datenbank:', err.message);
    else console.log('Connected to the SQLite database');
});

// Table for slider settings
db.run(`CREATE TABLE IF NOT EXISTS settings (
    user_id INTEGER PRIMARY KEY,
    letter_spacing INTEGER,
    word_spacing INTEGER,
    side_spacing INTEGER,
    letter_size INTEGER,
    line_width INTEGER,
    line_spacing INTEGER,
    messy_factor INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
)`);

// Save user slider settings
app.post('/save-settings', (req, res) => {
    const { userId, settings } = req.body;

    db.run(
        `INSERT INTO settings (user_id, letter_spacing, word_spacing, side_spacing, letter_size, line_width, line_spacing, messy_factor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
         letter_spacing = excluded.letter_spacing,
         word_spacing = excluded.word_spacing,
         side_spacing = excluded.side_spacing,
         letter_size = excluded.letter_size,
         line_width = excluded.line_width,
         line_spacing = excluded.line_spacing,
         messy_factor = excluded.messy_factor`,
        [
            userId,
            settings.letterSpacing,
            settings.wordSpacing,
            settings.sideSpacing,
            settings.letterSize,
            settings.lineWidth,
            settings.lineSpacing,
            settings.messyFactor
        ],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Load user slider settings
app.get('/get-settings/:userId', (req, res) => {
    const { userId } = req.params;

    db.get(`SELECT * FROM settings WHERE user_id = ?`, [userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ settings: row || null });
    });
});




// Upload-Ordner sicherstellen
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log('Upload-Ordner erstellt:', uploadDir);
}

// Multer-Konfiguration: Temporärer Dateiname
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Temporärer Dateiname beim Hochladen
        const tempName = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.png';
        cb(null, tempName);
    }
});

const upload = multer({ storage });

// Route: Registrierung
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
    }

    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ success: true, userId: this.lastID });
    });
});

// Route: Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT id FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err || !row) {
            return res.status(401).json({ error: 'Invalid login' });
        }

        // Set a cookie for the session
        res.cookie('session', JSON.stringify({ userId: row.id, username }), {
            httpOnly: true, // Makes it inaccessible to JavaScript on the client for security
            maxAge: 365 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
            sameSite: 'Strict' // Ensure the cookie is sent only from your site
        });

        res.json({ success: true, userId: row.id, username });
    });
});


app.get('/validate-session', (req, res) => {
    const sessionCookie = req.cookies.session;

    if (!sessionCookie) {
        return res.status(401).json({ error: 'No active session' });
    }

    try {
        const session = JSON.parse(sessionCookie);
        res.json({ success: true, userId: session.userId, username: session.username });
    } catch (err) {
        res.status(400).json({ error: 'Invalid session data' });
    }
});


app.post('/logout', (req, res) => {
    res.clearCookie('session');
    res.json({ success: true });
});


// Route: Datei-Upload
app.post('/upload-letter', upload.none(), (req, res) => {
    console.log('--- Upload gestartet ---');
    const { userId, letter, username } = req.body;
    const base64Image = req.body.letterImage;

    if (!userId || !letter || !username || !base64Image) {
        console.error('Fehlende Felder:', { userId, letter, username, base64Image });
        return res.status(400).json({ error: 'Fehlende Felder: userId, letter, username oder letterImage' });
    }

    const userJsonFilePath = path.join(uploadDir, `${username}.json`);
    let userLetters = {};

    // Load existing JSON file, if it exists
    if (fs.existsSync(userJsonFilePath)) {
        const fileContent = fs.readFileSync(userJsonFilePath, 'utf-8');
        userLetters = JSON.parse(fileContent);
    }

    // Add the new letter entry
    if (!userLetters[letter]) {
        userLetters[letter] = [];
    }

    userLetters[letter].push(base64Image);

    // Save the updated JSON
    fs.writeFileSync(userJsonFilePath, JSON.stringify(userLetters, null, 2));
    console.log(`Buchstabe ${letter} für Benutzer ${username} gespeichert.`);

    res.json({ success: true });
});


// Fehler-Handler für unerwartete Fehler
app.use((err, req, res, next) => {
    console.error('Globaler Fehler:', err.message);
    res.status(500).json({ error: 'Interner Serverfehler: ' + err.message });
});




// Route: Handschrift-PDF generieren
const PDFDocument = require('pdfkit');

// In script.js, modify the generateHandwrittenText function:

function generateHandwrittenText() {
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
    
    fetch('/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: text,
            username: username,
            settings: settings
        })
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'handwritten.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    })
    .catch(error => console.error('Error:', error));
}

// In server.js, modify the /generate-pdf endpoint:

// In server.js, update the error handling in the /generate-pdf endpoint:

app.post('/generate-pdf', async (req, res) => {
    try {
        const { text, username, settings } = req.body;
        console.log('Received PDF generation request for user:', username);

        if (!text || !username || !settings) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                details: { text: !!text, username: !!username, settings: !!settings } 
            });
        }

        const userJsonFilePath = path.join(uploadDir, `${username}.json`);

        if (!fs.existsSync(userJsonFilePath)) {
            return res.status(404).json({ error: 'No saved letters found for user' });
        }

        const fileContent = fs.readFileSync(userJsonFilePath, 'utf-8');
        const userLetters = JSON.parse(fileContent);

        // Create the PDF
        const doc = new PDFDocument({ autoFirstPage: false });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=handwritten_${username}_${Date.now()}.pdf`);
        
        // Pipe the PDF directly to the response
        doc.pipe(res);

        // Add first page
        doc.addPage();
        
        let currentX = settings.sideSpacing;
        let currentY = settings.lineSpacing;

        for (const char of text) {
            if (char === ' ') {
                currentX += settings.wordSpacing;
                continue;
            }

            if (char === '\n') {
                currentX = settings.sideSpacing;
                currentY += settings.lineSpacing;
                
                if (currentY > doc.page.height - settings.lineSpacing) {
                    doc.addPage();
                    currentY = settings.lineSpacing;
                }
                continue;
            }

            const letterImages = userLetters[char];
            if (!letterImages || letterImages.length === 0) {
                console.log(`No saved image found for character: ${char}`);
                continue;
            }

            const randomImage = letterImages[Math.floor(Math.random() * letterImages.length)];
            const buffer = Buffer.from(randomImage.split(',')[1], 'base64');

            try {
                const messyX = currentX + (Math.random() - 0.5) * settings.messyFactor;
                const messyY = currentY + (Math.random() - 0.5) * settings.messyFactor;
                
                doc.image(buffer, messyX, messyY, { 
                    width: settings.letterSize,
                    height: settings.letterSize * 1.5
                });

                currentX += settings.letterSize + settings.letterSpacing;

                if (currentX > doc.page.width - settings.sideSpacing - settings.letterSize) {
                    currentX = settings.sideSpacing;
                    currentY += settings.lineSpacing;

                    if (currentY > doc.page.height - settings.lineSpacing) {
                        doc.addPage();
                        currentY = settings.lineSpacing;
                    }
                }
            } catch (err) {
                console.error(`Error processing character ${char}:`, err);
            }
        }

        // Finalize the PDF
        doc.end();
        console.log('PDF generation completed');

    } catch (error) {
        console.error('Error in PDF generation:', error);
        // Only send error response if headers haven't been sent
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generating PDF', details: error.message });
        }
    }
});




app.get('/get-saved-letters/:userId', (req, res) => {
    const { userId } = req.params;
    const username = req.query.username; // Pass the username in the query

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    const userJsonFilePath = path.join(uploadDir, `${username}.json`);
    let savedLetters = [];

    if (fs.existsSync(userJsonFilePath)) {
        const fileContent = fs.readFileSync(userJsonFilePath, 'utf-8');
        const userLetters = JSON.parse(fileContent);
        savedLetters = Object.keys(userLetters);
    }

    res.json({ savedLetters });
});

app.get('/get-saved-instances/:userId/:letter', (req, res) => {
    const { userId, letter } = req.params;
    const username = req.query.username; // Pass the username in the query

    if (!username || !letter) {
        return res.status(400).json({ error: 'Username and letter are required' });
    }

    const userJsonFilePath = path.join(uploadDir, `${username}.json`);
    let savedInstances = [];

    if (fs.existsSync(userJsonFilePath)) {
        const fileContent = fs.readFileSync(userJsonFilePath, 'utf-8');
        const userLetters = JSON.parse(fileContent);
        savedInstances = userLetters[letter] || [];
    }

    res.json({ savedInstances });
});



app.post('/delete-letter', (req, res) => {
    const { userId, letter, index, username } = req.body;

    if (!userId || !letter || index === undefined || !username) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const userJsonFilePath = path.join(uploadDir, `${username}.json`);

    if (fs.existsSync(userJsonFilePath)) {
        const fileContent = fs.readFileSync(userJsonFilePath, 'utf-8');
        const userLetters = JSON.parse(fileContent);

        if (userLetters[letter] && userLetters[letter][index]) {
            userLetters[letter].splice(index, 1);

            // Remove the letter array if it's empty
            if (userLetters[letter].length === 0) {
                delete userLetters[letter];
            }

            fs.writeFileSync(userJsonFilePath, JSON.stringify(userLetters, null, 2));
            return res.json({ success: true });
        }
    }

    res.status(404).json({ error: 'Letter not found' });
});




// Server starten
app.listen(PORT, () => console.log(`Server läuft unter http://localhost:${PORT}`));
