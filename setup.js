const fs = require('fs');
const path = require('path');

// Proje kök dizinini al
const rootDir = __dirname;

const dirs = [
    path.join(rootDir, 'data'),
    path.join(rootDir, 'uploads'),
    path.join(rootDir, 'uploads/icons'),
    path.join(rootDir, 'uploads/projects')
];

// Dizinleri oluştur
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

// Projects dosyasını oluştur
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