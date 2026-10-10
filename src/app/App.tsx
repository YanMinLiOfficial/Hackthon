import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './theme.css';
import './app.css';
import { AppStoreProvider, useAppStore } from '../store';
import { AppLayout } from './AppLayout';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ProfilePlaceholder } from './pages/ProfilePlaceholder';

/** 路由表：路径为共享约定，成员页面后续在对应 feature 目录实现并在此挂载 */
function AppRoutes() {
  const { posts, places, observations } = useAppStore();

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path="/"
          element={
            <PlaceholderPage
              title="首页 · 社区帖子流"
              owner="成员 A"
              modulePath="src/features/feed/"
              milestone="M1"
              facts={[
                `已就绪 ${posts.length} 条种子帖子（设施观察/科普/工具/经验）`,
                '筛选：全部 · 设施观察 · 科普 · 工具',
                '设施观察帖可一键跳转到地图地点（M1 贯通）',
              ]}
            />
          }
        />
        <Route
          path="/map"
          element={
            <PlaceholderPage
              title="地图 · 地点与时间线"
              owner="成员 B"
              modulePath="src/features/map/、src/features/place/"
              milestone="M1"
              facts={[
                `已就绪 ${places.length} 个校园地点，每地点唯一大头针`,
                `已就绪 ${observations.length} 条观察，按时间线归入地点`,
                '五种状态颜色 + 图形双重编码图例；无 Key 使用本地 SVG 地图',
              ]}
            />
          }
        />
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
