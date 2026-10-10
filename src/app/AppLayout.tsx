import { Outlet } from 'react-router-dom';
import { PRODUCT } from './config';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-header__name">{PRODUCT.name}</h1>
        <span className="prototype-badge">{PRODUCT.prototypeBadge}</span>
      </header>
      <main className="app-main" id="main-content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
