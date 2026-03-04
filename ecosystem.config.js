// PM2 Ecosystem Config – FitPro (puerto 5700 app / 5800 frontend)
// Uso:  pm2 start ecosystem.config.js
//       pm2 save
//       pm2 startup

module.exports = {
    apps: [
        {
            name: 'fitpro-api',
            script: 'database/server.js',
            cwd: './',
            env: {
                NODE_ENV: 'production',
                PORT: 5700,          // <‐‐ puerto API backend
            },
            watch: false,
            autorestart: true,
            max_memory_restart: '300M',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: './logs/api-error.log',
            out_file: './logs/api-out.log',
        },
        {
            name: 'fitpro-frontend',
            script: 'server.js',
            cwd: './',
            env: {
                NODE_ENV: 'production',
                PORT: 5800,          // <‐‐ puerto frontend
            },
            watch: false,
            autorestart: true,
            max_memory_restart: '200M',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: './logs/frontend-error.log',
            out_file: './logs/frontend-out.log',
        }
    ]
};
