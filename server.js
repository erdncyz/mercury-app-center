const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');

const app = express();

app.use(session({
    secret: 'mercury-app-center-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

const corsOptions = {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/icons', express.static(path.join(__dirname, 'uploads/icons')));
app.use('/projects', express.static(path.join(__dirname, 'uploads/projects')));

app.options('*', cors(corsOptions));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Cache-Control', 'no-store');
    next();
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = './uploads/temp';
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['.ipa', '.apk', '.app'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only .ipa, .apk, and .app files are allowed.'));
        }
    }
}).single('file');

app.post('/api/projects', async (req, res) => {
    try {
        if (!req.session.username) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }

        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Project name is required' });
        }

        const projectsFile = './data/projects.json';
        let data = { projects: [] };
        if (fs.existsSync(projectsFile)) {
            const fileContent = fs.readFileSync(projectsFile, 'utf8');
            if (fileContent.trim()) {
                data = JSON.parse(fileContent);
            }
        }

        const newProject = {
            id: Date.now().toString(),
            name,
            owner: req.session.username,
            created: new Date().toISOString(),
            versions: []
        };

        if (!Array.isArray(data.projects)) {
            data.projects = [];
        }
        data.projects.push(newProject);

        const projectDir = path.join(__dirname, 'uploads', 'projects', name);
        const iosDir = path.join(projectDir, 'ios');
        const androidDir = path.join(projectDir, 'android');
        
        fs.mkdirSync(projectDir, { recursive: true });
        fs.mkdirSync(iosDir, { recursive: true });
        fs.mkdirSync(androidDir, { recursive: true });

        fs.writeFileSync(projectsFile, JSON.stringify(data, null, 2));
        res.status(201).json({ success: true, project: newProject });
    } catch (error) {
        console.error('Project creation error:', error);
        res.status(500).json({ success: false, error: 'Failed to create project: ' + error.message });
    }
});

app.delete('/api/projects/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const projectsFile = './data/projects.json';
        let data = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
        const projectIndex = data.projects.findIndex(p => p.id === projectId);
        
        if (projectIndex === -1) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        
        const projectName = data.projects[projectIndex].name;
        const projectDir = path.join(__dirname, 'uploads', 'projects', projectName);
        if (fs.existsSync(projectDir)) {
            fs.rmSync(projectDir, { recursive: true, force: true });
        }
        
        data.projects.splice(projectIndex, 1);
        fs.writeFileSync(projectsFile, JSON.stringify(data, null, 2));
        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
});

app.post('/api/upload', (req, res) => {
    upload(req, res, async function(err) {
        if (err) {
            return res.status(400).json({ success: false, error: err.message });
        }

        try {
            const { projectId, platform, version, notes } = req.body;
            if (!projectId || !platform || !version || !req.file) {
                return res.status(400).json({ success: false, error: 'Missing required fields' });
            }

            const projectsFile = './data/projects.json';
            let data = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
            const project = data.projects.find(p => p.id === projectId);
            
            if (!project) {
                return res.status(404).json({ success: false, error: 'Project not found' });
            }

            const projectDir = path.join(__dirname, 'uploads', 'projects', project.name);
            const platformDir = path.join(projectDir, platform.toLowerCase());

            fs.mkdirSync(projectDir, { recursive: true });
            fs.mkdirSync(platformDir, { recursive: true });

            const fileName = `${version}-${req.file.originalname}`;
            const filePath = path.join(platformDir, fileName);
            fs.copyFileSync(req.file.path, filePath);
            fs.unlinkSync(req.file.path);

            const newVersion = {
                id: Date.now().toString(),
                platform: platform.toLowerCase(),
                version,
                notes,
                file: fileName,
                uploadedBy: req.session.username,
                uploadedAt: new Date().toISOString()
            };

            if (!Array.isArray(project.versions)) {
                project.versions = [];
            }
            project.versions.push(newVersion);
            fs.writeFileSync(projectsFile, JSON.stringify(data, null, 2));
            res.json({ success: true, version: newVersion });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ success: false, error: 'Failed to upload file: ' + error.message });
        }
    });
});

app.get('/api/projects', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'private, max-age=5');
        res.setHeader('Content-Type', 'application/json');

        const projectsFile = './data/projects.json';
        if (!fs.existsSync(projectsFile)) {
            const defaultData = { projects: [] };
            fs.writeFileSync(projectsFile, JSON.stringify(defaultData, null, 2));
            return res.json([]);
        }

        const fileContent = fs.readFileSync(projectsFile, 'utf8');
        if (!fileContent.trim()) {
            const defaultData = { projects: [] };
            fs.writeFileSync(projectsFile, JSON.stringify(defaultData, null, 2));
            return res.json([]);
        }

        const data = JSON.parse(fileContent);
        const projects = data.projects || [];
        projects.sort((a, b) => new Date(b.created) - new Date(a.created));
        res.json(projects);
    } catch (error) {
        console.error('Error listing projects:', error);
        res.json([]);
    }
});

app.get('/api/download/:projectId/:versionId', (req, res) => {
    try {
        const { projectId, versionId } = req.params;
        const projectsFile = './data/projects.json';
        const fileContent = fs.readFileSync(projectsFile, 'utf8');
        const data = JSON.parse(fileContent);

        if (!data || !data.projects || !Array.isArray(data.projects)) {
            return res.status(500).json({ error: 'Invalid data structure' });
        }

        const project = data.projects.find(p => p.id === projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const version = project.versions.find(v => v.id === versionId);
        if (!version) {
            return res.status(404).json({ error: 'Version not found' });
        }

        const filePath = path.join(__dirname, 'uploads', 'projects', project.name, version.platform, version.file);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${version.file}"`);
        fs.createReadStream(filePath).pipe(res);
    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to download file' });
        }
    }
});

app.delete('/api/projects/:projectId/versions/:versionId', async (req, res) => {
    try {
        const { projectId, versionId } = req.params;
        const projectsFile = './data/projects.json';
        
        if (!req.session.username) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }

        const fileContent = fs.readFileSync(projectsFile, 'utf8');
        let data = JSON.parse(fileContent);
        const project = data.projects.find(p => p.id === projectId);
        
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        
        const versionIndex = project.versions.findIndex(v => v.id === versionId);
        if (versionIndex === -1) {
            return res.status(404).json({ success: false, error: 'Version not found' });
        }
        
        const version = project.versions[versionIndex];
        const filePath = path.join(__dirname, 'uploads', 'projects', project.name, version.platform, version.file);
        
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (fileError) {
                console.error('File deletion error:', fileError);
            }
        }
        
        project.versions.splice(versionIndex, 1);
        fs.writeFileSync(projectsFile, JSON.stringify(data, null, 2));
        res.status(200).json({ success: true, message: 'Version deleted successfully' });
    } catch (error) {
        console.error('Delete version error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete version: ' + error.message });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin') {
        req.session.username = username;
        req.session.isAuthenticated = true;
        res.json({
            success: true,
            user: {
                username: username,
                displayName: username
            }
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid username or password'
        });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
