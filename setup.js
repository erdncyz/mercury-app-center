const fs = require('fs');
const path = require('path');

const dirs = [
    './data',
    './uploads',
    './uploads/icons',
    './uploads/projects'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

const projectsFile = './data/projects.json';
if (!fs.existsSync(projectsFile)) {
    const defaultData = {
        projects: []
    };
    fs.writeFileSync(projectsFile, JSON.stringify(defaultData, null, 2));
    console.log('Created projects.json with default structure');
} 