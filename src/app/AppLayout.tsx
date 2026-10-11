import { Outlet, useLocation } from 'react-router-dom';
import { PRODUCT } from './config';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  const isMap = useLocation().pathname === '/map';
  return (
    <div className={`app-shell${isMap ? ' app-shell--map' : ''}`}>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="app-header">
        <h1 className="app-header__name">{PRODUCT.name}</h1>
        <span className="prototype-badge">{PRODUCT.prototypeBadge}</span>
      </header>
      <main className="app-main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
