const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');
const config = require('./config');

const app = express();

app.use(session({
    secret: 'mercury-app-center-secret',
    resave: true,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true
    },
    rolling: true
}));

const corsOptions = {
    origin: config.urls.base(),
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
    res.header('Access-Control-Allow-Origin', config.urls.base());
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
        if (file.originalname.endsWith('.app') || 
            file.originalname.endsWith('.ipa') || 
            file.originalname.endsWith('.apk')) {
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

        const projectsFile = path.join(__dirname, 'data', 'projects.json');
        let data = { projects: [] };
        
        try {
            if (fs.existsSync(projectsFile)) {
                const fileContent = fs.readFileSync(projectsFile, 'utf8');
                if (fileContent.trim()) {
                    data = JSON.parse(fileContent);
                }
            }
        } catch (error) {
            console.error('Error reading projects file:', error);
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

        // Create project directories
        const projectDir = path.join(__dirname, 'uploads', 'projects', name);
        const iosDir = path.join(projectDir, 'ios');
        const androidDir = path.join(projectDir, 'android');
        const tvosDir = path.join(projectDir, 'tvos');
        const androidtvDir = path.join(projectDir, 'androidtv');

        try {
            // Create all platform directories
            if (!fs.existsSync(projectDir)) {
                fs.mkdirSync(projectDir, { recursive: true, mode: 0o777 });
                fs.mkdirSync(iosDir, { recursive: true, mode: 0o777 });
                fs.mkdirSync(androidDir, { recursive: true, mode: 0o777 });
                fs.mkdirSync(tvosDir, { recursive: true, mode: 0o777 });
                fs.mkdirSync(androidtvDir, { recursive: true, mode: 0o777 });
            }

            // Add project to list
            data.projects.push(newProject);

            // Update projects.json file
            fs.writeFileSync(projectsFile, JSON.stringify(data, null, 2), { mode: 0o666 });

            res.status(201).json({ success: true, project: newProject });
        } catch (error) {
            console.error('Error creating project:', error);
            res.status(500).json({ 
                success: false, 
                error: `Failed to create project: ${error.message}. Please check directory permissions.`
            });
        }
    } catch (error) {
        console.error('Project creation error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create project: ' + error.message 
        });
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
    upload(req, res, function(err) {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({
                success: false,
                error: err.message
            });
        }

        try {
            const { projectId, platform, version, notes, environment } = req.body;
            
            if (!projectId || !platform || !version || !environment) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Missing required fields' 
                });
            }

            const projectsFile = path.join(__dirname, 'data', 'projects.json');
            let data = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
            const project = data.projects.find(p => p.id === projectId);
            
            if (!project) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Project not found' 
                });
            }

            // Versiyon kontrolü - aynı versiyon ve platform varsa hata ver
            const existingVersion = project.versions?.find(v => 
                v.version === version && v.platform === platform.toLowerCase()
            );

            if (existingVersion) {
                return res.status(400).json({
                    success: false,
                    error: `Version ${version} already exists for ${platform}. Please use a different version number.`
                });
            }

            // Yeni versiyon için devam et
            const fileName = `${version}-${req.file.originalname}`;
            const projectDir = path.join(__dirname, 'uploads', 'projects', project.name);
            const platformDir = path.join(projectDir, platform.toLowerCase());
            
            // Dizinleri oluştur
            fs.mkdirSync(projectDir, { recursive: true });
            fs.mkdirSync(platformDir, { recursive: true });

            // Dosyayı kopyala
            const filePath = path.join(platformDir, fileName);
            fs.copyFileSync(req.file.path, filePath);
            fs.unlinkSync(req.file.path); // Geçici dosyayı sil

            const newVersion = {
                id: Date.now().toString(),
                platform: platform.toLowerCase(),
                version,
                environment,
                notes,
                file: fileName,
                uploadedBy: req.session.username,
                uploadedAt: new Date().toISOString()
            };

            if (!Array.isArray(project.versions)) {
                project.versions = [];
            }

            project.versions.push(newVersion);
            project.versions.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
            
            fs.writeFileSync(projectsFile, JSON.stringify(data, null, 2));
            
            res.json({ 
                success: true, 
                version: newVersion 
            });

        } catch (error) {
            // Hata durumunda geçici dosyayı temizle
            if (req.file && req.file.path) {
                fs.unlinkSync(req.file.path);
            }
            console.error('Upload error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to upload file: ' + error.message 
            });
        }
    });
});

app.get('/api/projects', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        const projectsFile = './data/projects.json';
        if (!fs.existsSync(projectsFile)) {
            return res.json({ 
                projects: [],
                totalPages: 0,
                currentPage: page
            });
        }

        const data = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
        const projects = data.projects || [];
        
        // En son yüklenenler en üstte olacak şekilde sırala
        projects.sort((a, b) => new Date(b.created) - new Date(a.created));
        
        const paginatedProjects = projects.slice(startIndex, startIndex + limit);
        const totalPages = Math.ceil(projects.length / limit);

        res.json({
            projects: paginatedProjects,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error('Error listing projects:', error);
        res.status(500).json({ error: 'Failed to load projects' });
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
        const projectsFile = path.join(__dirname, 'data', 'projects.json');
        
        if (!req.session.username) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }

        let data = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
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
        
        // Sadece dosyayı sil, klasörü değil
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (fileError) {
                console.error('File deletion error:', fileError);
            }
        }
        
        // Versiyonu projeden kaldır
        project.versions.splice(versionIndex, 1);
        
        // Projeyi güncelle
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
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ success: false, message: 'Login failed' });
            }
            res.json({
                success: true,
                user: {
                    username: username,
                    displayName: username
                }
            });
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

app.get('/api/check-session', (req, res) => {
    if (req.session && req.session.username) {
        res.json({
            isLoggedIn: true,
            username: req.session.username
        });
    } else {
        res.json({
            isLoggedIn: false
        });
    }
});

// Get port from config
app.listen(config.server.port, () => {
    console.log(`Server running on ${config.urls.base()}`);
    console.log(`Local IP address: ${config.server.host}`);
});
