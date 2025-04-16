const os = require('os');

// Helper function to get local IP address automatically
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Find IPv4 and non-internal address
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost'; // Use localhost if no IP found
}

const config = {
    server: {
        port: process.env.PORT || 80,
        host: process.env.HOST || getLocalIP()
    },
    urls: {
        base: function() {
            return `http://${config.server.host}:${config.server.port}`;
        }
    },
    api: {
        projects: '/api/projects',
        download: '/api/download',
        login: '/login',
        logout: '/logout',
        checkSession: '/api/check-session',
        upload: '/api/upload'
    },
    ssl: {
        domains: [
            'localhost',
            '*.localhost',
            '*.local',
            '*'
        ],
        ips: [
            '0.0.0.0',
            '127.0.0.1',
            '192.168.1.107'
        ]
    }
};

module.exports = config; 