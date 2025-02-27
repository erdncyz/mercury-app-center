# Mercury App Center

A centralized platform for managing and distributing mobile applications across different platforms and environments.

## Features

- Multi-platform support (iOS, Android, Apple TV, Android TV)
- Environment-based versioning (Production, Test, Regression)
- Secure file upload and download
- Version history tracking
- User authentication and role management
- Real-time updates
- Role-based access control

<img width="1255" alt="image" src="https://github.com/user-attachments/assets/802ff463-679f-47b0-b311-f8e8398a3743" />

<img width="1326" alt="image" src="https://github.com/user-attachments/assets/2bf2f765-74f2-46c6-b14a-41e18281622b" />

<img width="1318" alt="image" src="https://github.com/user-attachments/assets/8174d8dd-90d5-43cf-8a80-2195fbc0312e" />

<img width="949" alt="image" src="https://github.com/user-attachments/assets/e832622e-0e27-4e64-9ff3-7ca1194b269b" />

<img width="1277" alt="image" src="https://github.com/user-attachments/assets/8c648afb-0e90-4684-aba5-2453c4aa64fc" />

## Features

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

- **Project Management**
  - Create and manage multiple projects
  - Project-based organization
  - Version control for each project
  - Project icons support

- **Platform Support**
  - iOS, Apple TV application management with TestFlight integration
  - Android, Android TV application management (.apk)
  - Multi-platform version tracking

- **User Interface**
  - Modern, responsive design
  - Real-time updates
  - Search and filter capabilities
  - Recent uploads tracking
  - Version history
  - Platform-specific button controls

- **File Management**
  - Secure file upload/download
  - Automatic file organization
  - Version-based file naming
  - Test notes for each version

- **Role-Based Access Control**
  - Admin users: Full access to create, edit, upload, delete, and manage users
  - Regular users: Download-only access
  - Restricted access to admin panels based on user role
  - Platform-specific controls (Edit, Download, Delete buttons)

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
- Default port: 3000 (configurable via PORT environment variable)
- Session secret: Update in session middleware configuration
- CORS settings: Configure allowed origins as needed

## Usage

1. Access the application at `http://localhost:3000`

2. Authentication:
   - Default admin: username: admin, password: admin
   - User registration with admin approval
   - Role-based access (admin vs regular users)
   - Session-based authentication

3. User Management (Admin Only):
   - Approve/reject new user registrations
   - Grant/revoke admin privileges
   - Delete users (except primary admin)
   - View all users and their status

4. Project Management:
   - Create new projects (admin only)
   - Upload application versions (admin only)
   - Download application versions (all users)
   - Edit version information (admin only)
   - Delete projects or versions (admin only)

5. Version Control:
   - Upload new versions (admin only)
   - Edit version details (admin only)
   - Add version notes
   - Track version history
   - Download specific versions (all users)

6. Platform-Specific Features:
   - iOS and Apple TV: TestFlight integration with instructions
   - Android and Android TV: Direct APK downloads
   - Platform-specific button visibility (Edit button only for admin users)

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
- Regular backup of projects.json and users.json is recommended
- Monitor disk space for uploads directory
- Admin users have exclusive access to Edit, Delete, and Upload functions