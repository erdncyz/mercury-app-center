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
            steps {
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