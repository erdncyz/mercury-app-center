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

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (!req.session.username) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    next();
};

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
        
        if (req.session.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Only admin users can create projects' });
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
        if (!req.session.username) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }
        
        if (req.session.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Only admin users can delete projects' });
        }
        
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
        // File upload validation errors should be bypassed for URL-only platforms
        if (err && !(req.body.platform === 'ios' || req.body.platform === 'tvos')) {
            console.error('Upload error:', err);
            return res.status(400).json({
                success: false,
                error: err.message
            });
        }

        try {
            if (!req.session.username) {
                return res.status(401).json({ success: false, error: 'User not authenticated' });
            }
            
            if (req.session.role !== 'admin') {
                return res.status(403).json({ success: false, error: 'Only admin users can upload files' });
            }
            
            const { projectId, platform, version, notes, environment, url } = req.body;
            
            if (!projectId || !platform || !version || !environment) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Missing required fields' 
                });
            }

            // Check that URL is provided for iOS/tvOS platforms
            if ((platform === 'ios' || platform === 'tvos') && !url) {
                return res.status(400).json({
                    success: false,
                    error: 'Public test URL is required for iOS and Apple TV platforms'
                });
            }

            // Check that file is provided for other platforms
            if (platform !== 'ios' && platform !== 'tvos' && !req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'App file is required for this platform'
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

            // Version check - show error if same version and platform already exists
            const existingVersion = project.versions?.find(v => 
                v.version === version && v.platform === platform.toLowerCase()
            );

            if (existingVersion) {
                return res.status(400).json({
                    success: false,
                    error: `Version ${version} already exists for ${platform}. Please use a different version number.`
                });
            }

            let newVersion;

            // Handle URL uploads for iOS and tvOS platforms
            if (platform === 'ios' || platform === 'tvos') {
                if (!url) {
                    return res.status(400).json({
                        success: false,
                        error: 'Public test URL is required for iOS and Apple TV platforms'
                    });
                }
                
                newVersion = {
                    id: Date.now().toString(),
                    platform: platform.toLowerCase(),
                    version: version || 'URL Only',
                    environment: environment || 'production',
                    notes: notes || '',
                    url: url,
                    uploadedBy: req.session.username,
                    uploadedAt: new Date().toISOString()
                };
            } 
            // Handle file uploads for other platforms
            else {
                const fileName = `${version}-${req.file.originalname}`;
                const projectDir = path.join(__dirname, 'uploads', 'projects', project.name);
                const platformDir = path.join(projectDir, platform.toLowerCase());
                
                // Create directories
                fs.mkdirSync(projectDir, { recursive: true });
                fs.mkdirSync(platformDir, { recursive: true });

                // Copy the file
                const filePath = path.join(platformDir, fileName);
                fs.copyFileSync(req.file.path, filePath);
                fs.unlinkSync(req.file.path); // Delete temporary file

                newVersion = {
                    id: Date.now().toString(),
                    platform: platform.toLowerCase(),
                    version,
                    environment,
                    notes,
                    file: fileName,
                    uploadedBy: req.session.username,
                    uploadedAt: new Date().toISOString()
                };
            }

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
            // In case of error, clean up the temporary file
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
        
        // Sort with most recent uploads at the top
        projects.sort((a, b) => new Date(b.created) - new Date(a.created));
        
        // Sort with most recent uploads at the top
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

        // For iOS and Apple TV platforms with URL, redirect to the test URL
        if ((version.platform === 'ios' || version.platform === 'tvos') && version.url) {
            return res.redirect(version.url);
        }

        // For file-based platforms, serve the file
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
        if (!req.session.username) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }
        
        if (req.session.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Only admin users can delete versions' });
        }

        const { projectId, versionId } = req.params;
        const projectsFile = path.join(__dirname, 'data', 'projects.json');
        
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
        
        // Only delete the file, not the folder
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (fileError) {
                console.error('File deletion error:', fileError);
            }
        }
        
        // Remove version from the project
        project.versions.splice(versionIndex, 1);
        
        // Update the project
        fs.writeFileSync(projectsFile, JSON.stringify(data, null, 2));
        
        res.status(200).json({ success: true, message: 'Version deleted successfully' });
    } catch (error) {
        console.error('Delete version error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete version: ' + error.message });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Read users from file
        const usersFile = path.join(__dirname, 'data', 'users.json');
        if (!fs.existsSync(usersFile)) {
            return res.status(500).json({ success: false, message: 'User database not found' });
        }
        
        const userData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        const user = userData.users.find(u => u.username === username && u.password === password);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }
        
        // Check if user is approved
        if (!user.approved) {
            return res.status(403).json({
                success: false,
                message: 'Your account is pending approval by an administrator'
            });
        }
        
        // Set session data
        req.session.username = user.username;
        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.isAuthenticated = true;
        
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ success: false, message: 'Login failed' });
            }
            res.json({
                success: true,
                user: {
                    username: user.username,
                    displayName: user.username,
                    role: user.role
                }
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// Register new user
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email, fullName } = req.body;
        
        // Validate input
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password are required' });
        }
        
        // Read current users
        const usersFile = path.join(__dirname, 'data', 'users.json');
        let userData = { users: [] };
        
        if (fs.existsSync(usersFile)) {
            userData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        }
        
        // Check if user already exists
        if (userData.users.some(u => u.username === username)) {
            return res.status(400).json({ success: false, error: 'Username already exists' });
        }
        
        // Create new user object
        const newUser = {
            id: Date.now().toString(),
            username,
            password,
            email: email || '',
            fullName: fullName || '',
            role: 'user',
            approved: false,
            created: new Date().toISOString()
        };
        
        // Add user to array
        userData.users.push(newUser);
        
        // Save to file
        fs.writeFileSync(usersFile, JSON.stringify(userData, null, 2));
        
        res.status(201).json({ 
            success: true, 
            message: 'Registration successful. Your account is pending approval by an administrator.' 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});

// Admin-only API: Get all users
app.get('/api/users', async (req, res) => {
    try {
        // Check if user is admin
        if (!req.session.username || req.session.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        
        // Read users file
        const usersFile = path.join(__dirname, 'data', 'users.json');
        if (!fs.existsSync(usersFile)) {
            return res.status(200).json({ users: [] });
        }
        
        const userData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        
        // Remove passwords before sending
        const safeUsers = userData.users.map(({ password, ...user }) => user);
        
        res.json({ users: safeUsers });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, error: 'Failed to get users' });
    }
});

// Admin-only API: Approve or reject user
app.put('/api/users/:userId/approval', async (req, res) => {
    try {
        // Check if user is admin
        if (!req.session.username || req.session.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        
        const { userId } = req.params;
        const { approved } = req.body;
        
        if (approved === undefined) {
            return res.status(400).json({ success: false, error: 'Approval status required' });
        }
        
        // Read users file
        const usersFile = path.join(__dirname, 'data', 'users.json');
        const userData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        
        // Find user
        const userIndex = userData.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Prevent modifying own account
        if (userData.users[userIndex].username === req.session.username) {
            return res.status(403).json({ success: false, error: 'Cannot modify your own account' });
        }
        
        // Update approval status
        userData.users[userIndex].approved = approved;
        
        // Save to file
        fs.writeFileSync(usersFile, JSON.stringify(userData, null, 2));
        
        res.json({ 
            success: true, 
            message: `User ${approved ? 'approved' : 'rejected'} successfully` 
        });
    } catch (error) {
        console.error('User approval error:', error);
        res.status(500).json({ success: false, error: 'Failed to update user approval status' });
    }
});

// Admin-only API: Change user role to admin
app.put('/api/users/:userId/role', async (req, res) => {
    try {
        // Check if user is admin
        if (!req.session.username || req.session.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        
        const { userId } = req.params;
        const { role } = req.body;
        
        if (!role || !['admin', 'user'].includes(role)) {
            return res.status(400).json({ success: false, error: 'Valid role required (admin or user)' });
        }
        
        // Read users file
        const usersFile = path.join(__dirname, 'data', 'users.json');
        const userData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        
        // Find user
        const userIndex = userData.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Prevent modifying own account
        if (userData.users[userIndex].username === req.session.username) {
            return res.status(403).json({ success: false, error: 'Cannot modify your own account' });
        }
        
        // Update role
        userData.users[userIndex].role = role;
        
        // Save to file
        fs.writeFileSync(usersFile, JSON.stringify(userData, null, 2));
        
        res.json({ 
            success: true, 
            message: `User role updated to ${role} successfully` 
        });
    } catch (error) {
        console.error('User role update error:', error);
        res.status(500).json({ success: false, error: 'Failed to update user role' });
    }
});

// Admin-only API: Delete user
app.delete('/api/users/:userId', async (req, res) => {
    try {
        // Check if user is admin
        if (!req.session.username || req.session.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        
        const { userId } = req.params;
        
        // Read users file
        const usersFile = path.join(__dirname, 'data', 'users.json');
        const userData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        
        // Find user
        const userIndex = userData.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Prevent deleting own account
        if (userData.users[userIndex].username === req.session.username) {
            return res.status(403).json({ success: false, error: 'Cannot delete your own account' });
        }
        
        // Remove user
        userData.users.splice(userIndex, 1);
        
        // Save to file
        fs.writeFileSync(usersFile, JSON.stringify(userData, null, 2));
        
        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });
    } catch (error) {
        console.error('User deletion error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
});

// Check admin status
app.get('/api/check-admin', (req, res) => {
    if (req.session && req.session.username && req.session.role === 'admin') {
        res.json({
            isAdmin: true,
            username: req.session.username
        });
    } else {
        res.json({
            isAdmin: false
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
            username: req.session.username,
            userRole: req.session.role
        });
    } else {
        res.json({
            isLoggedIn: false
        });
    }
});

// Version update endpoint
app.put('/api/projects/:projectId/versions/:versionId', isAuthenticated, async (req, res) => {
    try {
        if (req.session.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        const { projectId, versionId } = req.params;
        const { version, environment, notes, url, platform } = req.body;

        const projectsFile = './data/projects.json';
        if (!fs.existsSync(projectsFile)) {
            return res.status(404).json({ success: false, error: 'Projects file not found' });
        }

        const data = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
        const projectIndex = data.projects.findIndex(p => p.id === projectId);
        
        if (projectIndex === -1) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const project = data.projects[projectIndex];
        const versionIndex = project.versions.findIndex(v => v.id === versionId);
        
        if (versionIndex === -1) {
            return res.status(404).json({ success: false, error: 'Version not found' });
        }

        // Update the version fields
        const versionToUpdate = project.versions[versionIndex];
        
        versionToUpdate.version = version;
        versionToUpdate.environment = environment;
        versionToUpdate.notes = notes;
        versionToUpdate.url = url;
        versionToUpdate.platform = platform;
        versionToUpdate.updatedAt = new Date().toISOString();
        
        // Write the updated data back to the file
        fs.writeFileSync(projectsFile, JSON.stringify(data, null, 2));
        
        res.json({ 
            success: true, 
            version: versionToUpdate
        });
    } catch (error) {
        console.error('Version update error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update version: ' + error.message 
        });
    }
});

// GET a specific version
app.get('/api/projects/:projectId/versions/:versionId', isAuthenticated, async (req, res) => {
    try {
        const { projectId, versionId } = req.params;

        const projectsFile = './data/projects.json';
        if (!fs.existsSync(projectsFile)) {
            return res.status(404).json({ success: false, error: 'Projects file not found' });
        }

        const data = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
        const project = data.projects.find(p => p.id === projectId);
        
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const version = project.versions.find(v => v.id === versionId);
        
        if (!version) {
            return res.status(404).json({ success: false, error: 'Version not found' });
        }

        res.json({ 
            success: true, 
            version
        });
    } catch (error) {
        console.error('Get version error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get version: ' + error.message 
        });
    }
});

// Get port from config
app.listen(config.server.port, () => {
    console.log(`Server running on ${config.urls.base()}`);
    console.log(`Local IP address: ${config.server.host}`);
});
