import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import AppRoutes from './routes';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import NotificationToast from '../components/common/NotificationToast';
import './App.css';
import '../styles/global.css';
import '../styles/themes/light.css';
import '../styles/themes/dark.css';

const Layout: React.FC = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <AppRoutes />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Header />
        <main className="app-content">
          <AppRoutes />
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout />
      <NotificationToast />
    </BrowserRouter>
  );
};

export default App;
