import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './theme.css';
import './app.css';
import { AppStoreProvider } from '../store';
import { AppLayout } from './AppLayout';
import { PublishPage } from '../features/journey/pages/PublishPage';
import { ProfilePlaceholder } from './pages/ProfilePlaceholder';
import { MyPostsPage } from '../features/journey/pages/MyPostsPage';
import { HomePage } from '../features/journey/pages/HomePage';
import { MapPage } from '../features/journey/pages/MapPage';
import { PlaceDetailPage } from '../features/journey/pages/PlaceDetailPage';
import { AskAiPage } from '../features/ai/AskAiPage';
import { HelpPage } from '../features/journey/pages/HelpPage';
import { LeaderboardPage } from '../features/journey/pages/LeaderboardPage';
import { PointsShopPage } from '../features/journey/pages/PointsShopPage';
import '../features/journey/journey.css';

/** 路由表：路径为共享约定，成员页面后续在对应 feature 目录实现并在此挂载 */
function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/places/:placeId" element={<PlaceDetailPage />} />
        <Route path="/publish" element={<PublishPage />} />
        <Route path="/ask-ai" element={<AskAiPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/me" element={<ProfilePlaceholder />} />
        <Route path="/me/posts" element={<MyPostsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/points-shop" element={<PointsShopPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <AppStoreProvider>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </BrowserRouter>
    </AppStoreProvider>
  );
}
