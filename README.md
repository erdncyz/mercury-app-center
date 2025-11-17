# Mercury App Center

Mercury App Center is a centralized platform for managing and distributing your mobile applications. It supports application distribution for iOS, Android, Apple TV, Android TV, and Huawei platforms.

## Features

### Core Features
- Multi-platform support (iOS, Android, Apple TV, Android TV, Huawei)
- Environment-based versioning (Production, Test, Regression)
- Secure file upload and download
- Version history tracking
- User authentication and role management
- Real-time updates
- Role-based access control

### Platform-Specific Features
- **iOS & Apple TV**
  - TestFlight integration
  - Build distribution
  - Version tracking

- **Android & Android TV**
  - Direct APK distribution
  - Version management
  - Build tracking

- **Huawei**
  - AppGallery integration
  - Build management

### Security Features
- **Authentication**
  - User registration with admin approval
  - User role management (admin/user roles)
  - Session management
  - Secure file access control

- **User Management**
  - Admin approval for new users
  - Admin role assignment/revocation
  - User deletion functionality
  - Role-based access control

### Project Management
- Create and manage multiple projects
- Project-based organization
- Version control for each project
- Project icons support
- Environment management (Production/Test/Regression)

### User Interface
- Modern, responsive design
- Real-time updates
- Search and filter capabilities
- Recent uploads tracking
- Version history
- Platform-specific button controls

### Onvo TV Platform Support

- **Onvo TV** platformu artık Mercury App Center'da tam desteklenmektedir.
    - Upload ekranında platform olarak **Onvo TV** seçebilirsiniz.
    - Yüklediğiniz Onvo TV uygulama versiyonları ana ekranda ayrı bir kutuda listelenir.
    - Onvo TV için APK dosyası yükleyebilir, indirebilir ve silebilirsiniz.
    - Diğer platformlarda olduğu gibi, versiyon notları ve ortam (environment) bilgisi ekleyebilirsiniz.

#### Kullanım
1. "Upload New Version" butonuna tıklayın.
2. Platform olarak **Onvo TV** seçin.
3. APK dosyanızı yükleyin ve gerekli bilgileri doldurun.
4. Yükledikten sonra, ana ekranda Onvo TV başlığı altında versiyonunuzu görebilirsiniz.

## API Integration

### Creating an API Key
1. Log in to Admin Panel
2. Navigate to "API Keys" tab
3. Click "Generate New API Key"
4. Enter a description for your API key
5. Securely store the generated API key

### API Endpoints

#### Application Upload
```bash
POST /api/external/upload
```

Headers:
```
x-api-key: YOUR_API_KEY
```

Parameters:
- `file`: Application file (APK, AAB, IPA, etc.)
- `projectName`: Project name
- `platform`: Platform name (ios, android, tvos, androidtv, huawei)
- `version`: Version number
- `environment`: Environment (production, test, regression)
- `notes`: Release notes (optional)

## CI/CD Integration Examples

### GitHub Actions

```yaml
name: Upload to Mercury App Center

on:
  push:
    tags:
      - 'v*'

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      # Android example
      - name: Upload Android APK
        run: |
          curl -X POST "${{ secrets.MERCURY_APP_CENTER_URL }}/api/external/upload" \
            -H "x-api-key: ${{ secrets.MERCURY_API_KEY }}" \
            -F "file=@app/build/outputs/apk/release/app-release.apk" \
            -F "projectName=Your App Name" \
            -F "platform=android" \
            -F "version=${GITHUB_REF#refs/tags/v}" \
            -F "environment=production" \
            -F "notes=Release from GitHub Actions"

      # iOS example
      - name: Upload iOS Build
        run: |
          curl -X POST "${{ secrets.MERCURY_APP_CENTER_URL }}/api/external/upload" \
            -H "x-api-key: ${{ secrets.MERCURY_API_KEY }}" \
            -F "projectName=Your App Name" \
            -F "platform=ios" \
            -F "version=${GITHUB_REF#refs/tags/v}" \
            -F "url=https://testflight.apple.com/join/your-public-link" \
            -F "environment=production" \
            -F "notes=Release from GitHub Actions"
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    environment {
        MERCURY_API_KEY = credentials('mercury-api-key')
        MERCURY_URL = 'https://your-mercury-server.com'
    }
    
    stages {
        stage('Upload to Mercury') {
            steps:
                // Android example
                sh '''
                    curl -X POST "${MERCURY_URL}/api/external/upload" \\
                        -H "x-api-key: ${MERCURY_API_KEY}" \\
                        -F "file=@app/build/outputs/apk/release/app-release.apk" \\
                        -F "projectName=Your App Name" \\
                        -F "platform=android" \\
                        -F "version=${BUILD_NUMBER}" \\
                        -F "environment=production" \\
                        -F "notes=Build from Jenkins Pipeline"
                '''
                
                // iOS example
                sh '''
                    curl -X POST "${MERCURY_URL}/api/external/upload" \\
                        -H "x-api-key: ${MERCURY_API_KEY}" \\
                        -F "projectName=Your App Name" \\
                        -F "platform=ios" \\
                        -F "version=${BUILD_NUMBER}" \\
                        -F "url=https://testflight.apple.com/join/your-public-link" \\
                        -F "environment=production" \\
                        -F "notes=Build from Jenkins Pipeline"
                '''
            }
        }
    }
}
```

### Azure DevOps Pipeline

```yaml
# azure-pipelines.yml
trigger:
  tags:
    include:
      - 'v*'
  branches:
    include:
      - main
      - develop

# Variable group definitions
variables:
- group: mercury-app-center-prod
- group: mercury-app-center-test
- name: MERCURY_URL
  value: 'https://your-mercury-server.com'

stages:
- stage: Build
  jobs:
  - job: BuildApp
    pool:
      vmImage: 'macos-latest'
    steps:
    # Android Build
    - task: Gradle@2
      inputs:
        workingDirectory: 'android'
        gradleWrapperFile: 'android/gradlew'
        gradleOptions: '-Xmx3072m'
        publishJUnitResults: false
        testResultsFiles: '**/TEST-*.xml'
        tasks: 'assembleRelease'
    
    # iOS Build
    - task: Xcode@5
      inputs:
        actions: 'build'
        scheme: 'YourAppScheme'
        sdk: 'iphoneos'
        configuration: 'Release'
        xcWorkspacePath: 'ios/YourApp.xcworkspace'
        xcodeVersion: 'default'
        
    - task: CopyFiles@2
      inputs:
        contents: '**/*.ipa'
        targetFolder: '$(Build.ArtifactStagingDirectory)'
    
    - task: PublishBuildArtifacts@1
      inputs:
        pathToPublish: '$(Build.ArtifactStagingDirectory)'
        artifactName: 'drop'

- stage: DeployTest
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/develop'))
  dependsOn: Build
  jobs:
  - deployment: DeployToTest
    environment: 'test'
    strategy:
      runOnce:
        deploy:
          steps:
          - download: current
            artifact: 'drop'
          
          # Android Test Upload
          - script: |
              curl -X POST "$(MERCURY_URL)/api/external/upload" \
                -H "x-api-key: $(MERCURY_API_KEY)" \
                -F "file=@$(Pipeline.Workspace)/drop/android/app/build/outputs/apk/release/app-release.apk" \
                -F "projectName=$(APP_NAME)" \
                -F "platform=android" \
                -F "version=$(Build.BuildNumber)" \
                -F "environment=test" \
                -F "notes=Test build from Azure DevOps (Build: $(Build.BuildNumber))"
            displayName: 'Upload Android Test Build'
            
          # iOS Test Upload
          - script: |
              curl -X POST "$(MERCURY_URL)/api/external/upload" \
                -H "x-api-key: $(MERCURY_API_KEY)" \
                -F "projectName=$(APP_NAME)" \
                -F "platform=ios" \
                -F "version=$(Build.BuildNumber)" \
                -F "url=$(TESTFLIGHT_URL)" \
                -F "environment=test" \
                -F "notes=Test build from Azure DevOps (Build: $(Build.BuildNumber))"
            displayName: 'Upload iOS Test Build'

- stage: DeployProduction
  condition: and(succeeded(), startsWith(variables['Build.SourceBranch'], 'refs/tags/v'))
  dependsOn: Build
  jobs:
  - deployment: DeployToProduction
    environment: 'production'
    strategy:
      runOnce:
        deploy:
          steps:
          - download: current
            artifact: 'drop'
          
          # Android Production Upload
          - script: |
              curl -X POST "$(MERCURY_URL)/api/external/upload" \
                -H "x-api-key: $(MERCURY_API_KEY)" \
                -F "file=@$(Pipeline.Workspace)/drop/android/app/build/outputs/apk/release/app-release.apk" \
                -F "projectName=$(APP_NAME)" \
                -F "platform=android" \
                -F "version=$(Build.SourceBranchName)" \
                -F "environment=production" \
                -F "notes=Production release from Azure DevOps (Version: $(Build.SourceBranchName))"
            displayName: 'Upload Android Production Build'
            
          # iOS Production Upload
          - script: |
              curl -X POST "$(MERCURY_URL)/api/external/upload" \
                -H "x-api-key: $(MERCURY_API_KEY)" \
                -F "projectName=$(APP_NAME)" \
                -F "platform=ios" \
                -F "version=$(Build.SourceBranchName)" \
                -F "url=$(TESTFLIGHT_URL)" \
                -F "environment=production" \
                -F "notes=Production release from Azure DevOps (Version: $(Build.SourceBranchName))"
            displayName: 'Upload iOS Production Build'
```

Azure DevOps Pipeline Variable Groups:

1. mercury-app-center-prod (For Production)
   - MERCURY_API_KEY: Production API key
   - APP_NAME: Application name
   - TESTFLIGHT_URL: TestFlight URL

2. mercury-app-center-test (For Test)
   - MERCURY_API_KEY: Test API key
   - APP_NAME: Application name
   - TESTFLIGHT_URL: Test TestFlight URL

Pipeline Features:
- Tag and branch-based triggers
- Separate test and production environments
- Secure variable management
- Build and deploy stages
- Environment-based approval mechanism
- Detailed build and version information

## Installation

1. Clone the repository and navigate to the directory:
```bash
git clone https://github.com/erdncyz/mercury-app-center.git
cd mercury-app-center
```

2. Install required dependencies:
```bash
npm install
npm install dotenv
```

3. Create required directories:
```bash
mkdir -p uploads/icons uploads/projects data
chmod 755 uploads
```

If you encounter any permission issues, run the following commands:

```bash
# First, navigate to the project directory
cd /path/to/mercury-app-center

# Remove existing uploads and data directories
rm -rf uploads data

# Create new directories and set permissions
mkdir -p uploads/projects uploads/icons data
chmod -R 777 uploads data

# Set ownership of all project files to current user
sudo chown -R $USER:$USER .

# Create projects.json file
echo '{"projects":[]}' > data/projects.json
chmod 666 data/projects.json

# Create users.json file with admin user
echo '{"users":[{"id":"1","username":"admin","password":"admin","email":"admin@example.com","role":"admin","approved":true,"created":"2023-01-01T00:00:00.000Z"}]}' > data/users.json
chmod 666 data/users.json
```

4. Start the server:
```bash
node server.js
```

## Production Deployment

### Reverse Proxy Configuration

When deploying Mercury App Center in production, you'll typically use a reverse proxy (nginx, Apache, etc.) in front of the Node.js application. This is **critical** for handling large file uploads successfully.

#### Why Reverse Proxy Configuration Matters

Large file uploads (100MB+) can fail with `ERR_CONNECTION_RESET` errors if the reverse proxy is not properly configured. Common issues include:

- **Default timeouts are too short** (typically 60 seconds)
- **Request buffering** causes memory issues and delays
- **Keep-alive settings** may terminate connections prematurely

#### Nginx Configuration (Recommended)

For detailed nginx configuration instructions, see [docs/nginx-config.md](docs/nginx-config.md).

**Quick Setup for Upload Endpoints:**

```nginx
location /api/upload {
    proxy_pass http://localhost:3000;
    
    # Timeout settings (30 minutes for large uploads)
    proxy_connect_timeout 1800s;
    proxy_send_timeout 1800s;
    proxy_read_timeout 1800s;
    send_timeout 1800s;
    
    # Disable buffering for streaming uploads
    proxy_buffering off;
    proxy_request_buffering off;
    
    # Increase body size limit (2GB max)
    client_max_body_size 2048M;
    client_body_timeout 1800s;
    
    # Keep-alive settings
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    
    # Required headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Apply same configuration to external upload endpoint
location /api/external/upload {
    proxy_pass http://localhost:3000;
    
    # Same timeout and buffering settings as above
    proxy_connect_timeout 1800s;
    proxy_send_timeout 1800s;
    proxy_read_timeout 1800s;
    send_timeout 1800s;
    
    proxy_buffering off;
    proxy_request_buffering off;
    
    client_max_body_size 2048M;
    client_body_timeout 1800s;
    
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**After updating nginx configuration:**

```bash
# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

#### Apache Configuration

If using Apache as a reverse proxy, add these settings to your VirtualHost configuration:

```apache
<Location /api/upload>
    ProxyPass http://localhost:3000/api/upload
    ProxyPassReverse http://localhost:3000/api/upload
    
    # Timeout settings (30 minutes)
    ProxyTimeout 1800
    TimeOut 1800
    
    # Disable buffering
    SetEnv proxy-sendcl 1
    
    # Increase body size limit
    LimitRequestBody 2147483648
</Location>

<Location /api/external/upload>
    ProxyPass http://localhost:3000/api/external/upload
    ProxyPassReverse http://localhost:3000/api/external/upload
    
    ProxyTimeout 1800
    TimeOut 1800
    SetEnv proxy-sendcl 1
    LimitRequestBody 2147483648
</Location>
```

### Troubleshooting Upload Issues

#### Connection Reset Errors (ERR_CONNECTION_RESET)

**Symptoms:**
- Uploads fail after 60 seconds or during large file transfers
- Browser shows "ERR_CONNECTION_RESET" or "Network error"
- Server logs show "ECONNRESET" errors

**Solutions:**

1. **Check Reverse Proxy Configuration**
   - Verify timeout settings are at least 1800 seconds (30 minutes)
   - Ensure `proxy_buffering off` and `proxy_request_buffering off` are set
   - Confirm `client_max_body_size` is at least 2048M

2. **Verify Server Configuration**
   - Check that the Node.js server is running and accessible
   - Verify server timeout configuration using the health check endpoint:
     ```bash
     curl http://your-server.com/api/health/upload-config
     ```

3. **Test Without Reverse Proxy**
   - Temporarily access the Node.js server directly (e.g., http://server:3000)
   - If uploads work without the proxy, the issue is in the proxy configuration

4. **Check Network and Firewall**
   - Ensure no intermediate firewalls are terminating long connections
   - Verify network stability for large file transfers
   - Check if any load balancers have timeout settings

5. **Monitor Upload Progress**
   - Open browser developer console (F12) during upload
   - Check for heartbeat messages every 10 seconds
   - Look for progress updates every 2 seconds

#### Slow Upload Speeds

**Symptoms:**
- Uploads take much longer than expected
- Progress bar moves very slowly

**Solutions:**

1. **Check Buffering Settings**
   - Ensure `proxy_request_buffering off` in nginx
   - Buffering can cause the entire file to be stored before forwarding

2. **Network Bandwidth**
   - Test upload speed to the server
   - Check for network congestion or bandwidth limits

3. **Server Resources**
   - Monitor CPU and memory usage during uploads
   - Ensure sufficient disk I/O performance

#### Upload Fails Immediately

**Symptoms:**
- Upload fails right after starting
- Error message about file size or format

**Solutions:**

1. **Check File Size Limits**
   - Maximum file size: 2GB
   - Verify `client_max_body_size` in nginx matches this limit

2. **Verify File Format**
   - Supported formats: .apk, .aab, .ipa, .app
   - Check that file extension is correct

3. **Check Permissions**
   - Ensure `uploads/` directory exists and is writable
   - Verify Node.js process has write permissions

#### Debugging Steps

1. **Enable Detailed Logging**
   - Check Node.js server logs for error details
   - Review nginx error logs: `tail -f /var/log/nginx/error.log`

2. **Test with Small Files First**
   - Upload a small file (< 10MB) to verify basic functionality
   - Gradually increase file size to identify threshold

3. **Use Health Check Endpoint**
   ```bash
   curl http://your-server.com/api/health/upload-config
   ```
   This returns server configuration including timeout settings

4. **Check Browser Console**
   - Open Developer Tools (F12) → Console tab
   - Look for error messages and network activity
   - Monitor Network tab for request/response details

### Deployment Checklist

Before deploying to production:

- [ ] Configure reverse proxy with proper timeout settings (see [docs/nginx-config.md](docs/nginx-config.md))
- [ ] Set `client_max_body_size` to at least 2048M
- [ ] Disable request buffering in reverse proxy
- [ ] Test upload with files > 100MB
- [ ] Verify health check endpoint is accessible
- [ ] Set up monitoring for upload success/failure rates
- [ ] Configure proper SSL/TLS certificates
- [ ] Set up regular backups of `data/` directory
- [ ] Configure firewall rules for required ports
- [ ] Test upload from external network

## Configuration

Server Configuration:
- Default port: 80 (configurable via PORT environment variable)
- Session secret: Update in session middleware configuration
- CORS settings: Configure allowed origins as needed

## Directory Structure

```bash
mercury-app-center/
├── public/                 # Static files
│   ├── index.html         # Main application
│   └── styles.css         # Application styles
├── uploads/               # Upload directory
│   ├── icons/            # Project icons
│   └── projects/         # Application files
├── data/                  # Data storage
│   ├── projects.json     # Project metadata
│   └── users.json        # User accounts
├── server.js             # Server implementation
├── config.js             # Configuration settings
├── setup.js              # Setup utilities
├── package.json          # Project dependencies
└── README.md            # Documentation
```

## Supported File Types

- **iOS Applications**
  - TestFlight URLs

- **Android Applications**
  - `.apk` (Android Package)

- **TV Applications**
  - Apple TV: TestFlight URLs
  - Android TV: APK files
  - Onvo TV: APK files

## Requirements

- **Server Requirements**
  - Node.js (v14 or higher)
  - npm (v6 or higher)
  - Sufficient disk space for uploads

- **Client Requirements**
  - Modern web browser
  - Network access to server
  - Upload/download permissions

## Security

- Role-based authentication and authorization
- Session-based access control
- Secure file upload/download
- Input validation and sanitization
- Admin-only access for critical operations
- API key management and rotation
- Environment-based access control

## Development

1. Clone the repository
2. Install dependencies
3. Create necessary directories
4. Start development server

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For support, please create an issue in the repository.

## Notes

- Ensure proper file permissions for the uploads directory
- Regular backup of projects.json and users.json is recommended
- Monitor disk space for uploads directory
- Admin users have exclusive access to Edit, Delete, and Upload functions

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Email Sending & Password Reset

Mercury App Center supports password reset via email. When a user requests a password reset, an email with a reset link is sent to the user's registered email address.

### How It Works
- Users can request a password reset from the login screen.
- The system sends a reset link to the user's email (using SMTP).
- The user can set a new password using the link.

### Configuration
1. **.env File Setup**

Create a `.env` file in your project root with the following content:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

- `EMAIL_USER`: The Gmail address that will send emails.
- `EMAIL_PASSWORD`: The [App Password](https://support.google.com/accounts/answer/185833?hl=en) generated from your Google Account (not your normal Gmail password!).

2. **Enable 2-Step Verification & App Passwords on Gmail**
   - Go to your [Google Account Security Settings](https://myaccount.google.com/security).
   - Enable 2-Step Verification.
   - After enabling, go to "App Passwords" and generate a password for "Mail".
   - Use this app password in your `.env` file.

3. **Restart the Server**
   - After updating `.env`, restart your Node.js server for changes to take effect.

### Notes
- The email feature uses Gmail SMTP by default. You can change SMTP settings in `config.js` if you use another provider.
- Make sure less secure app access is enabled if using a non-Google SMTP provider.
- All password reset links are time-limited and secure.