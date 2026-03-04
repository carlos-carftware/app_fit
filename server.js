const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4000;

// Logging en tiempo real
app.use((req, res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] 🟩 GET ${req.originalUrl}`);
    next();
});

// Servir archivos estáticos de la raíz
app.use(express.static(path.join(__dirname)));

// Cualquier otra ruta va a index.html (SPA)
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`======================================`);
    console.log(`🌐 FitPro Frontend Server`);
    console.log(`======================================`);
    console.log(`✅ Escuchando en: http://localhost:${PORT}`);
    console.log(`======================================`);
});
