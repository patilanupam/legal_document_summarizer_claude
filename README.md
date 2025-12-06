# LegalFlow - Legal Document Management System

A full-stack MERN (MongoDB, Express, React, Node.js) application for managing legal documents with role-based access control, document versioning, and search capabilities.

## Features

- **User Authentication**: JWT-based authentication with role management (admin, lawyer, client)
- **Document Management**: Upload, download, and manage legal documents
- **Document Versioning**: Track document versions and history
- **Search**: Search documents by title, description, and content
- **Role-Based Access Control**: Different permissions for admins, lawyers, and clients
- **Document Comments**: Add comments and collaborate on documents

## Tech Stack

**Backend:**
- Node.js & Express
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads
- Jest for testing

**Frontend:**
- React 18
- React Router for navigation
- Axios for API calls
- Context API for state management

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB 7.0+
- Docker & Docker Compose (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd legalflow-master
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Create environment files:
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI and JWT secret

# Frontend
cp frontend/.env.example frontend/.env
```

### Running with Docker (Recommended)

```bash
docker-compose up
```

This will start:
- MongoDB on port 27017
- Backend API on port 5000
- Frontend on port 3000

### Running Locally

1. Start MongoDB:
```bash
mongod
```

2. Start backend:
```bash
cd backend
npm start
```

3. Start frontend:
```bash
cd frontend
npm start
```

## Running Tests

Run all tests:
```bash
./run_tests.sh
```

Run backend tests only:
```bash
cd backend
npm test
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Document Endpoints

- `POST /api/documents/upload` - Upload document (protected)
- `GET /api/documents` - Get all documents (protected)
- `GET /api/documents/:id` - Get document by ID (protected)
- `PUT /api/documents/:id` - Update document (protected)
- `DELETE /api/documents/:id` - Delete document (protected, admin/lawyer)
- `GET /api/documents/search` - Search documents (protected)
- `POST /api/documents/:id/version` - Upload new version (protected)
- `GET /api/documents/:id/download` - Download document (protected)

### User Endpoints

- `GET /api/users` - Get all users (protected, admin)
- `GET /api/users/:id` - Get user by ID (protected)
- `PUT /api/users/:id` - Update user (protected)
- `DELETE /api/users/:id` - Delete user (protected, admin)

## Project Structure

```
legalflow-master/
├── backend/              # Node.js/Express backend
│   ├── config/          # Database and JWT configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, role check, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── utils/           # Helper functions
│   ├── tests/           # Jest tests
│   └── server.js        # Entry point
├── frontend/            # React frontend
│   ├── public/          # Static files
│   └── src/
│       ├── components/  # React components
│       ├── context/     # Context providers
│       ├── services/    # API services
│       └── App.jsx      # Main app component
├── tasks/               # Task descriptions and tests
├── docker-compose.yml   # Docker configuration
└── README.md

```

## User Roles

1. **Admin**: Full access to all features, can manage users
2. **Lawyer**: Can upload, manage, and delete documents
3. **Client**: Can view and download documents assigned to them

## Known Issues

- Document version control has some bugs (being fixed)
- Search performance needs optimization for large datasets
- Text extraction from PDFs is not fully implemented

## License

ISC

## Contributing

This is a project submission for IDE Arena / Project Puzzle. Contributions are not currently accepted.
