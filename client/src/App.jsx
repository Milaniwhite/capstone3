import React, { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './components/HomePage';
import { AdminDashboard } from './components/AdminDashboard';
import { Navigation } from './components/Navigation';
import { useAuth } from './hooks/useAuth.js';

const App = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const { auth, login, register, logout, isAdmin } = useAuth();

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const renderContent = () => {
    switch (currentPath) {
      case '/login':
        return <LoginPage login={login} />;
      case '/signup':
        return <RegisterPage register={register} />;
      case '/admin':
        return isAdmin ? <AdminDashboard /> : navigate('/');
      default:
        return <HomePage />;
    }
  };

  return (
    <>
      <Navigation 
        auth={auth} 
        isAdmin={isAdmin} 
        navigate={navigate} 
        logout={logout} 
      />
      <main>{renderContent()}</main>
    </>
  );
};

export default App;