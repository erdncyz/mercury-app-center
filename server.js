const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');
const config = require('./config');
const { v4: uuidv4 } = require('uuid');

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
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    next();
};

// Authorization middleware
const isAdmin = (req, res, next) => {
    if (!req.session.isAuthenticated || req.session.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized: Admin access required' });
    }
    next();
};

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'uploads', 'temp');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.ipa', '.apk', '.aab', '.app'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only .ipa, .apk, .aab, and .app files are allowed.'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024 // 2GB limit
    }
});

// Helper function to read JSON data files safely
function readJsonFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            // Handle potentially empty files
            return fileContent.trim() ? JSON.parse(fileContent) : {}; 
        }
    } catch (error) {
        console.error(`Error reading JSON file ${filePath}:`, error);
    }
    // Return default structure if file doesn't exist or is invalid
    if (filePath.includes('projects.json')) return { projects: [] };
    if (filePath.includes('users.json')) return { users: [] };
    return {};
}

// Helper function to write JSON data files safely
function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { mode: 0o666 });
    } catch (error) {
        console.error(`Error writing JSON file ${filePath}:`, error);
        // Optionally, re-throw or handle the error appropriately
        throw error; 
    }
}

app.post('/api/projects', isAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Project name is required' });
        }

        const projectsFile = path.join(__dirname, 'data', 'projects.json');
        let data = readJsonFile(projectsFile);
        
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
            writeJsonFile(projectsFile, data);

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

app.delete('/api/projects/:projectId', isAdmin, async (req, res) => {
    try {
        const { projectId } = req.params;
        const projectsFile = path.join(__dirname, 'data', 'projects.json');
        let data = readJsonFile(projectsFile);
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
        writeJsonFile(projectsFile, data);
        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
});

app.post('/api/upload', isAdmin, upload.single('file'), (req, res) => {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
        const { projectId, platform, version, notes, environment, url } = req.body;
        
        if (!projectId || !platform || !version || !environment) {
            res.write(`data: ${JSON.stringify({ success: false, error: 'Missing required fields' })}\n\n`);
            res.end();
            return;
        }

        // Check that URL is provided for iOS/tvOS platforms
        if ((platform === 'ios' || platform === 'tvos') && !url) {
            res.write(`data: ${JSON.stringify({ success: false, error: 'Public test URL is required for iOS and Apple TV platforms' })}\n\n`);
            res.end();
            return;
        }

        // Check that file is provided for other platforms
        if (platform !== 'ios' && platform !== 'tvos' && !req.file) {
            res.write(`data: ${JSON.stringify({ success: false, error: 'App file is required for this platform' })}\n\n`);
            res.end();
            return;
        }

        const projectsFile = path.join(__dirname, 'data', 'projects.json');
        let data = readJsonFile(projectsFile);
        const project = data.projects.find(p => p.id === projectId);
        
        if (!project) {
            res.write(`data: ${JSON.stringify({ success: false, error: 'Project not found' })}\n\n`);
            res.end();
            return;
        }

        // Version check - show error if same version and platform already exists
        const existingVersion = project.versions?.find(v => 
            v.version === version && v.platform === platform.toLowerCase()
        );

        if (existingVersion) {
            res.write(`data: ${JSON.stringify({ success: false, error: `Version ${version} already exists for ${platform}. Please use a different version number.` })}\n\n`);
            res.end();
            return;
        }

        let newVersion;

        // Handle URL uploads for iOS and tvOS platforms
        if (platform === 'ios' || platform === 'tvos') {
            if (!url) {
                res.write(`data: ${JSON.stringify({ success: false, error: 'Public test URL is required for iOS and Apple TV platforms' })}\n\n`);
                res.end();
                return;
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

            // Copy the file with progress tracking and optimized streaming
            const filePath = path.join(platformDir, fileName);
            const readStream = fs.createReadStream(req.file.path, {
                highWaterMark: 1024 * 1024 // 1MB chunks for better performance
            });
            const writeStream = fs.createWriteStream(filePath, {
                highWaterMark: 1024 * 1024 // 1MB chunks for better performance
            });
            const fileSize = fs.statSync(req.file.path).size;
            let uploadedBytes = 0;
            let lastProgressUpdate = 0;

            // Set up error handling for both streams
            readStream.on('error', (error) => {
                console.error('Read stream error:', error);
                fs.unlinkSync(req.file.path); // Clean up temp file
                res.write(`data: ${JSON.stringify({ success: false, error: 'Failed to read file' })}\n\n`);
                res.end();
            });

            writeStream.on('error', (error) => {
                console.error('Write stream error:', error);
                fs.unlinkSync(req.file.path); // Clean up temp file
                res.write(`data: ${JSON.stringify({ success: false, error: 'Failed to write file' })}\n\n`);
                res.end();
            });

            // Track progress with throttling
            readStream.on('data', (chunk) => {
                uploadedBytes += chunk.length;
                const progress = (uploadedBytes / fileSize) * 100;
                
                // Only send progress updates every 1% to reduce overhead
                if (progress - lastProgressUpdate >= 1) {
                    res.write(`data: ${JSON.stringify({ progress })}\n\n`);
                    lastProgressUpdate = progress;
                }
            });

            // Handle successful completion
            writeStream.on('finish', () => {
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

                if (!Array.isArray(project.versions)) {
                    project.versions = [];
                }

                project.versions.push(newVersion);
                project.versions.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
                
                writeJsonFile(projectsFile, data);
                
                res.write(`data: ${JSON.stringify({ success: true, version: newVersion })}\n\n`);
                res.end();
            });

            // Pipe the streams
            readStream.pipe(writeStream);

            return; // Early return as we're handling the response in the stream events
        }

        // For URL-based uploads, update the project immediately
        if (!Array.isArray(project.versions)) {
            project.versions = [];
        }

        project.versions.push(newVersion);
        project.versions.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        
        writeJsonFile(projectsFile, data);
        
        res.write(`data: ${JSON.stringify({ success: true, version: newVersion })}\n\n`);
        res.end();

    } catch (error) {
        // In case of error, clean up the temporary file
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Upload error:', error);
        res.write(`data: ${JSON.stringify({ success: false, error: 'Failed to upload file: ' + error.message })}\n\n`);
        res.end();
    }
});

app.get('/api/projects', isAuthenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        const projectsFile = path.join(__dirname, 'data', 'projects.json');
        const usersFile = path.join(__dirname, 'data', 'users.json');

        const projectsData = readJsonFile(projectsFile);
        let allProjects = projectsData.projects || [];

        // Filter projects based on user access if not admin
        if (req.session.role !== 'admin') {
            const userData = readJsonFile(usersFile);
            const currentUser = userData.users.find(u => u.id === req.session.userId);
            
            if (currentUser && currentUser.projectIds && Array.isArray(currentUser.projectIds)) {
                allProjects = allProjects.filter(p => currentUser.projectIds.includes(p.id));
            } else {
                allProjects = []; // User has no assigned projects or data is missing
            }
        }
        
        // Sort with most recent uploads/creation at the top
        // Consider sorting based on latest version upload time if available
        allProjects.sort((a, b) => {
             const lastVersionA = a.versions?.length ? new Date(Math.max(...a.versions.map(v => new Date(v.uploadedAt)))) : new Date(a.created);
             const lastVersionB = b.versions?.length ? new Date(Math.max(...b.versions.map(v => new Date(v.uploadedAt)))) : new Date(b.created);
             return lastVersionB - lastVersionA;
        });
        
        const paginatedProjects = allProjects.slice(startIndex, startIndex + limit);
        const totalPages = Math.ceil(allProjects.length / limit);

        res.json({
            projects: paginatedProjects,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error('Error listing projects:', error);
        res.status(500).json({ success: false, error: 'Failed to load projects' });
    }
});

app.get('/api/download/:projectId/:versionId', isAuthenticated, async (req, res) => {
    try {
        const { projectId, versionId } = req.params;
        const projectsFile = path.join(__dirname, 'data', 'projects.json');
        const data = readJsonFile(projectsFile);

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

        // Get file stats for content length
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;

        // Handle range requests for partial content
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });

            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${version.file}"`,
                'Cache-Control': 'public, max-age=3600'
            };

            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // Stream the entire file with optimized settings
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${version.file}"`,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=3600'
            };

            res.writeHead(200, head);

            // Use a larger highWaterMark for faster streaming
            const stream = fs.createReadStream(filePath, { 
                highWaterMark: 64 * 1024 // 64KB chunks
            });

            // Handle stream errors
            stream.on('error', (error) => {
                console.error('Stream error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to stream file' });
                }
            });

            stream.pipe(res);
        }
    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to download file' });
        }
    }
});

app.delete('/api/projects/:projectId/versions/:versionId', isAdmin, async (req, res) => {
    try {
        const { projectId, versionId } = req.params;
        const projectsFile = path.join(__dirname, 'data', 'projects.json');
        
        let data = readJsonFile(projectsFile);
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
        writeJsonFile(projectsFile, data);
        
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
        
        const userData = readJsonFile(usersFile);
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
            userData = readJsonFile(usersFile);
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
            projectIds: [],
            created: new Date().toISOString()
        };
        
        // Add user to array
        userData.users.push(newUser);
        
        // Save to file
        writeJsonFile(usersFile, userData);
        
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
app.get('/api/users', isAdmin, async (req, res) => {
    try {
        // Read users file
        const usersFile = path.join(__dirname, 'data', 'users.json');
        const projectsFile = path.join(__dirname, 'data', 'projects.json');

        const userData = readJsonFile(usersFile);
        const projectsData = readJsonFile(projectsFile);
        const allProjects = projectsData.projects || [];
        
        // Create a map for quick project lookup
        const projectMap = new Map(allProjects.map(p => [p.id, p.name]));

        // Prepare safe user list, removing passwords and resolving project names
        const safeUsers = userData.users.map(({ password, ...user }) => {
             // Resolve project IDs to names
             const assignedProjects = (user.projectIds || [])
                .map(id => ({ id, name: projectMap.get(id) || 'Unknown Project' }))
                .filter(p => p.name !== 'Unknown Project'); // Optionally filter out projects that no longer exist

            return {
                ...user,
                projects: assignedProjects, // Add resolved projects array
                projectIds: user.projectIds || [] // Ensure projectIds always exists
            };
        });
        
        res.json({ users: safeUsers });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, error: 'Failed to get users' });
    }
});

// Admin-only API: Approve or reject user
app.put('/api/users/:userId/approval', isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { approved } = req.body;
        
        if (approved === undefined) {
            return res.status(400).json({ success: false, error: 'Approval status required' });
        }
        
        // Read users file
        const usersFile = path.join(__dirname, 'data', 'users.json');
        const userData = readJsonFile(usersFile);
        
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
        writeJsonFile(usersFile, userData);
        
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
app.put('/api/users/:userId/role', isAdmin, async (req, res) => {
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
app.delete('/api/users/:userId', isAdmin, async (req, res) => {
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
app.put('/api/projects/:projectId/versions/:versionId', isAdmin, async (req, res) => {
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

// API Keys file path
const API_KEYS_FILE = path.join(__dirname, 'data', 'api_keys.json');

// Initialize API keys file if it doesn't exist
if (!fs.existsSync(API_KEYS_FILE)) {
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify([], null, 2));
}

// Middleware to validate API key
const apiKeyMiddleware = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
    }

    try {
        const keys = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
        const key = keys.find(k => k.key === apiKey && k.isActive);
        
        if (!key) {
            return res.status(401).json({ error: 'Invalid or inactive API key' });
        }

        // Update last used timestamp
        key.lastUsed = new Date().toISOString();
        fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2));
        
        next();
    } catch (error) {
        console.error('API key validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// API Key Management Endpoints
app.get('/api/keys', isAdmin, (req, res) => {
    try {
        const keys = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
        res.json(keys);
    } catch (error) {
        console.error('Error reading API keys:', error);
        res.status(500).json({ error: 'Failed to read API keys' });
    }
});

app.post('/api/keys', isAdmin, (req, res) => {
    try {
        const { description } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        const keys = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
        const newKey = {
            id: uuidv4(),
            key: `mk_${uuidv4()}`, // Prefix with 'mk_' to identify Mercury keys
            description,
            createdBy: req.session.username,
            createdAt: new Date().toISOString(),
            lastUsed: null,
            isActive: true
        };

        keys.push(newKey);
        fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2));
        
        res.json(newKey);
    } catch (error) {
        console.error('Error creating API key:', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
});

app.delete('/api/keys/:keyId', isAdmin, (req, res) => {
    try {
        const { keyId } = req.params;
        const keys = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
        const keyIndex = keys.findIndex(k => k.id === keyId);
        
        if (keyIndex === -1) {
            return res.status(404).json({ error: 'API key not found' });
        }

        keys.splice(keyIndex, 1);
        fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting API key:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

// External Upload Endpoint
app.post('/api/external/upload', apiKeyMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { projectName, platform, version, environment = 'production', notes = '' } = req.body;
        
        if (!projectName || !platform) {
            return res.status(400).json({ error: 'Project name and platform are required' });
        }

        // Validate platform
        const validPlatforms = ['ios', 'android', 'tvos', 'androidtv', 'huawei'];
        if (!validPlatforms.includes(platform.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        // For iOS/tvOS, require URL instead of file
        if ((platform === 'ios' || platform === 'tvos') && !req.body.url) {
            return res.status(400).json({ error: 'URL is required for iOS/tvOS platforms' });
        }

        // For other platforms, require file
        if (platform !== 'ios' && platform !== 'tvos' && !req.file) {
            return res.status(400).json({ error: 'File is required for this platform' });
        }

        // Check if project exists, if not create it
        const projectsFile = path.join(__dirname, 'data', 'projects.json');
        let projectsData = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
        let project = projectsData.projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
        
        if (!project) {
            project = {
                id: Date.now().toString(),
                name: projectName,
                owner: 'API',
                created: new Date().toISOString(),
                versions: []
            };
            projectsData.projects.push(project);
        }

        // Create version entry
        const versionEntry = {
            id: Date.now().toString(),
            version: version || '1.0.0',
            platform,
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'API',
            environment,
            notes,
            downloads: 0
        };

        if (platform === 'ios' || platform === 'tvos') {
            versionEntry.url = req.body.url;
        } else if (req.file) {
            const fileExt = path.extname(req.file.originalname);
            const fileName = `${version}-${req.file.originalname}`;
            const platformDir = path.join(__dirname, 'uploads', 'projects', project.name, platform.toLowerCase());
            const filePath = path.join(platformDir, fileName);
            
            // Create platform directory if it doesn't exist
            fs.mkdirSync(platformDir, { recursive: true });
            
            // Move file from temp to final location
            fs.renameSync(req.file.path, filePath);
            versionEntry.file = fileName;
        }

        project.versions.unshift(versionEntry);
        fs.writeFileSync(projectsFile, JSON.stringify(projectsData, null, 2));

        res.json({
            success: true,
            project: {
                id: project.id,
                name: project.name
            },
            version: versionEntry
        });
    } catch (error) {
        console.error('External upload error:', error);
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Upload failed: ' + error.message });
    }
});

// Get port from config
app.listen(config.server.port, () => {
    console.log(`Server running on ${config.urls.base()}`);
    console.log(`Local IP address: ${config.server.host}`);
});

// Get a list of all project IDs and names (for admin UI)
app.get('/api/all-projects', isAdmin, async (req, res) => {
    try {
        const projectsFile = path.join(__dirname, 'data', 'projects.json');
        const projectsData = readJsonFile(projectsFile);
        const projectList = (projectsData.projects || []).map(p => ({ id: p.id, name: p.name }));
        
        res.json({ success: true, projects: projectList });
    } catch (error) {
        console.error('Error fetching all projects list:', error);
        res.status(500).json({ success: false, error: 'Failed to load project list' });
    }
});

// Admin-only API: Update user's project access
app.put('/api/users/:userId/projects', isAdmin, async (req, res) => { 
    try {
        const { userId } = req.params;
        const { projectIds } = req.body;

        if (!Array.isArray(projectIds)) {
            return res.status(400).json({ success: false, error: 'Invalid input: projectIds must be an array.' });
        }
        
        // Optional: You could add validation here to check if projectIds actually exist
        // in projects.json, but skipping for brevity.

        const usersFile = path.join(__dirname, 'data', 'users.json');
        const userData = readJsonFile(usersFile);
        
        const userIndex = userData.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Prevent modifying admin project access (admins see all by default)
        if (userData.users[userIndex].role === 'admin') {
             return res.status(400).json({ success: false, error: 'Cannot modify project access for admin users.' });
        }
        
        // Update user's project IDs
        // Ensure projectIds field exists even if it was missing before
        userData.users[userIndex].projectIds = projectIds;
        
        // Save to file
        writeJsonFile(usersFile, userData);
        
        res.json({ 
            success: true, 
            message: 'User project access updated successfully' 
        });
    } catch (error) {
        console.error('User project update error:', error);
        res.status(500).json({ success: false, error: 'Failed to update user project access' });
    }
});
