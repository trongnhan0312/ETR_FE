import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import RouteErrorBoundary from '../components/RouteErrorBoundary';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import './homepage.scss';

const PublicLayout = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="etr-landing-container">
      <PublicHeader />
      <main className="public-content-wrapper">
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
      <PublicFooter />
    </div>
  );
};

export default PublicLayout;
