import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './theme.css';
import './app.css';
import { AppStoreProvider } from '../store';
import { AppLayout } from './AppLayout';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ProfilePlaceholder } from './pages/ProfilePlaceholder';
import { HomePage } from '../features/journey/pages/HomePage';
import { MapPage } from '../features/journey/pages/MapPage';
import { PlaceDetailPage } from '../features/journey/pages/PlaceDetailPage';
import '../features/journey/journey.css';

/** 路由表：路径为共享约定，成员页面后续在对应 feature 目录实现并在此挂载 */
function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/places/:placeId" element={<PlaceDetailPage />} />
        <Route
          path="/publish"
          element={
            <PlaceholderPage
              title="发布 · 设施观察"
              owner="成员 C"
              modulePath="src/features/publish/"
              milestone="M2"
              facts={[
                '已就绪 3 张本地示例照片与模拟拍摄时间/定位字段',
                'AI 图片分析为确定性模拟，结果必须标注并由志愿者复核',
                '发布后写入地点时间线与积分，不生成重复大头针',
              ]}
            />
          }
        />
        <Route
          path="/ask-ai"
          element={
            <PlaceholderPage
              title="问 AI · 模拟问答"
              owner="成员 C"
              modulePath="src/features/ai/"
              milestone="M3"
              facts={[
                '三个预设问题：东门能否进入 / 最近核验卫生间 / 坡道标签与标准',
                '回答引用本地地点、帖子与条款，并显示更新时间与核验状态',
                '全程标注“AI 模拟问答 · 原型数据”',
              ]}
            />
          }
        />
        <Route path="/me" element={<ProfilePlaceholder />} />
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
