const fs = require('fs');
const path = require('path');
const config = require('./config');

// Get project root directory
const rootDir = __dirname;

const dirs = [
    path.join(rootDir, 'data'),
    path.join(rootDir, 'uploads'),
    path.join(rootDir, 'uploads/icons'),
    path.join(rootDir, 'uploads/projects')
];

// Create directories
dirs.forEach(dir => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
            console.log(`Created directory: ${dir}`);
        }
    } catch (error) {
        console.error(`Error creating directory ${dir}:`, error);
    }
});

// Create projects file
const projectsFile = path.join(rootDir, 'data', 'projects.json');
if (!fs.existsSync(projectsFile)) {
    try {
        const defaultData = {
            projects: []
        };
        fs.writeFileSync(projectsFile, JSON.stringify(defaultData, null, 2), { mode: 0o644 });
        console.log('Created projects.json with default structure');
    } catch (error) {
        console.error('Error creating projects.json:', error);
    }
}

// Create SSL configuration
const sslConfig = `
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
C = TR
ST = Istanbul
L = Istanbul
O = Mercury App Center
OU = Development
CN = *

[v3_req]
basicConstraints = CA:TRUE
keyUsage = digitalSignature, keyEncipherment, keyCertSign
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
${config.ssl.domains.map((domain, index) => `DNS.${index + 1} = ${domain}`).join('\n')}
${config.ssl.ips.map((ip, index) => `IP.${index + 1} = ${ip}`).join('\n')}
`;

fs.writeFileSync('ssl.conf', sslConfig); 