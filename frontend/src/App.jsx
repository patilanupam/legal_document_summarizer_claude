import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import PrivateRoute from './components/common/PrivateRoute';
import Navbar from './components/common/Navbar';
import DocumentList from './components/documents/DocumentList';
import DocumentUpload from './components/documents/DocumentUpload';
import DocumentViewer from './components/documents/DocumentViewer';
import DocumentSearch from './components/documents/DocumentSearch';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <div className="container">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/documents"
                element={
                  <PrivateRoute>
                    <DocumentList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <PrivateRoute>
                    <DocumentUpload />
                  </PrivateRoute>
                }
              />
              <Route
                path="/documents/:id"
                element={
                  <PrivateRoute>
                    <DocumentViewer />
                  </PrivateRoute>
                }
              />
              <Route
                path="/search"
                element={
                  <PrivateRoute>
                    <DocumentSearch />
                  </PrivateRoute>
                }
              />
              <Route path="/" element={<Navigate to="/documents" />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
