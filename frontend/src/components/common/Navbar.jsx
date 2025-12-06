import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="navbar">
      <h1>LegalFlow</h1>
      {user && (
        <nav style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/documents">Documents</Link>
          <Link to="/upload">Upload</Link>
          <Link to="/search">Search</Link>
          <span style={{ marginLeft: '1.5rem', marginRight: '1rem' }}>
            {user.name} ({user.role})
          </span>
          <button onClick={handleLogout}>Logout</button>
        </nav>
      )}
    </div>
  );
}

export default Navbar;
