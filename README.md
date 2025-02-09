# ☿ Mercury App Center

Mercury App Center is a centralized management system for mobile application distribution. It provides a secure and efficient way to manage, distribute, and track different versions of mobile applications (.apk, .ipa, .app).

<img width="712" alt="image" src="https://github.com/user-attachments/assets/465c51c3-95e9-45f8-9cca-9faff1a73a68" />

<img width="1528" alt="image" src="https://github.com/user-attachments/assets/8cef32f1-135a-4350-8afa-0f4f5aee778a" />

<img width="710" alt="image" src="https://github.com/user-attachments/assets/81d691db-a890-4438-8596-3193c05b4acd" />

<img width="1210" alt="image" src="https://github.com/user-attachments/assets/de31465e-d566-4ec6-8dd6-029f834dfc9c" />

<img width="744" alt="image" src="https://github.com/user-attachments/assets/9abd07f2-e926-4602-94bd-13d29e37d6ad" />

## Features

- **Authentication**
  - Simple admin authentication
  - Session management
  - Secure file access control

- **Project Management**
  - Create and manage multiple projects
  - Project-based organization
  - Version control for each project
  - Project icons support

- **Platform Support**
  - iOS application management (.ipa, .app)
  - Android application management (.apk)
  - Multi-platform version tracking

- **User Interface**
  - Modern, responsive design
  - Real-time updates
  - Search and filter capabilities
  - Recent uploads tracking
  - Version history

- **File Management**
  - Secure file upload/download
  - Automatic file organization
  - Version-based file naming
  - Test notes for each version

## Installation

1. Clone the repository and navigate to the directory:
```bash
git clone https://github.com/erdncyz/mercury-app-center.git
cd mercury-app-center
```

2. Install required dependencies:
```bash
npm install
```

3. Create required directories:
```bash
mkdir -p uploads/icons uploads/projects data
chmod 755 uploads
```

4. Start the server:
```bash
node server.js
```

## Configuration

Server Configuration:
- Default port: 3000 (configurable via PORT environment variable)
- Session secret: Update in session middleware configuration
- CORS settings: Configure allowed origins as needed

## Usage

1. Access the application at `http://localhost:3000`

2. Authentication:
   - Username: admin
   - Password: admin
   - Session-based authentication
   - Automatic session management

3. Project Management:
   - Create new projects
   - Upload application versions
   - Manage existing projects
   - Delete projects or versions

4. Version Control:
   - Upload new versions
   - Add version notes
   - Track version history
   - Download specific versions

## Directory Structure

```bash
mercury-app-center/
├── public/                 # Static files
│   └── index.html         # Main application
├── uploads/               # Upload directory
│   ├── icons/            # Project icons
│   └── projects/         # Application files
├── data/                  # Data storage
│   └── projects.json     # Project metadata
├── server.js             # Server implementation
├── package.json          # Project dependencies
└── README.md            # Documentation
```

## Supported File Types

- **iOS Applications**
  - `.ipa` (iOS App Store Package)
  - `.app` (iOS Application Bundle)

- **Android Applications**
  - `.apk` (Android Package)

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

- Simple admin authentication
- Session-based access control
- Secure file upload/download
- Input validation and sanitization

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

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please create an issue in the repository.

## Notes

- Ensure proper file permissions for the uploads directory
- Regular backup of projects.json is recommended
- Monitor disk space for uploads directory
