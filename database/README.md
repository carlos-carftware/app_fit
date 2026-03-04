# FitPro - Backend Local API

Este es un servidor ligero para ejecutar el sistema FitPro de manera local. Está construido con **Node.js, Express y SQLite**, lo que garantiza una conexión ultrarrápida (baja latencia) para el desarrollo y operación en una única computadora.

## Requisitos Previos

Necesitas tener **Node.js** instalado en tu computadora. Puedes descargarlo e instalarlo desde [nodejs.org](https://nodejs.org/).

## Instalación y Ejecución

1. Abre tu terminal (PowerShell o CMD).
2. Navega hasta esta carpeta `database`:
   ```bash
   cd c:\Users\carlo\.gemini\antigravity\scratch\fitpro\database
   ```
3. Instala las dependencias necesarias:
   ```bash
   npm install
   ```
4. Inicia el servidor local:
   ```bash
   npm start
   ```

Si todo es correcto, verás el mensaje:
`🔌 Status API: http://localhost:5000/api/status`

## Estructura
- **`server.js`**: Archivo principal del servidor en el puerto 5000.
- **`schema.sql`**: Definición de las tablas SQL iniciales (users, gyms, students, sessions...).
- **`fitpro.db`**: Archivo donde se guardará localmente toda tu base de datos (se crea automáticamente al iniciar).
