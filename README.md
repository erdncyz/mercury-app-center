# ☿ Mercury App Center

Mercury App Center is a centralized management system for mobile application distribution. It provides a secure and efficient way to manage, distribute, and track different versions of mobile applications (.apk, .ipa, .app).

<img width="1255" alt="image" src="https://github.com/user-attachments/assets/802ff463-679f-47b0-b311-f8e8398a3743" />

<img width="1326" alt="image" src="https://github.com/user-attachments/assets/2bf2f765-74f2-46c6-b14a-41e18281622b" />

<img width="1318" alt="image" src="https://github.com/user-attachments/assets/8174d8dd-90d5-43cf-8a80-2195fbc0312e" />

<img width="949" alt="image" src="https://github.com/user-attachments/assets/e832622e-0e27-4e64-9ff3-7ca1194b269b" />

<img width="1277" alt="image" src="https://github.com/user-attachments/assets/8c648afb-0e90-4684-aba5-2453c4aa64fc" />

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

if encounter any permission issues, run the following commands:

```bash
# Önce projenin olduğu dizine gidelim
cd /Users/erdincyilmaz/Desktop/mercury-app-center

# Mevcut uploads ve data klasörlerini silelim
rm -rf uploads data

# Yeni klasörleri oluşturup izinleri ayarlayalım
mkdir -p uploads/projects uploads/icons data
chmod -R 777 uploads data

# Projenin tüm dosyalarının sahipliğini mevcut kullanıcıya verelim
sudo chown -R $USER:$USER .

# Projects.json dosyasını oluşturalım
echo '{"projects":[]}' > data/projects.json
chmod 666 data/projects.json
```

4. Start the server:
```bash
npm run setup
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
