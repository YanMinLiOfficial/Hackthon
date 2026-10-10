import { PlaceholderPage } from './PlaceholderPage';
import { useAppStore } from '../../store';

const ROLE_LABELS: Record<string, string> = {
  volunteer: '志愿者',
  lead_volunteer: '骨干志愿者',
  institution: '场所负责人',
};

/** “我的”占位页：M0 先暴露模拟身份切换与演示数据重置，保证闭环可联调 */
export function ProfilePlaceholder() {
  const store = useAppStore();

  return (
    <PlaceholderPage
      title="我的"
      owner="成员 A（偏好/积分/设置）与各成员联调"
      modulePath="src/features/preferences/"
      milestone="M1 / M2"
      facts={[
        `当前模拟身份：${store.currentUser.name}（${ROLE_LABELS[store.currentUser.role] ?? store.currentUser.role}）`,
        `当前身份模拟积分：${store.getUserPoints(store.currentUser.userId)} 分`,
        '无障碍偏好与隐私开关已在共享仓库中持久化',
      ]}
    >
      <fieldset className="placeholder__tools">
        <legend>模拟身份切换（非真实账号）</legend>
        <div className="segmented" role="group" aria-label="选择当前模拟身份">
          {store.demoUsers.map((user) => (
            <button
              key={user.userId}
              type="button"
              className={
                user.userId === store.currentUser.userId
                  ? 'segmented__btn is-active'
                  : 'segmented__btn'
              }
              aria-pressed={user.userId === store.currentUser.userId}
              onClick={() => store.switchUser(user.userId)}
            >
              {user.name}
              <span className="segmented__role">{ROLE_LABELS[user.role] ?? user.role}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        className="reset-button"
        onClick={() => {
          store.resetDemoData();
        }}
      >
        重置为评委演示初始数据
      </button>
      <p className="placeholder__hint">重置只影响本机 localStorage，不发送任何网络请求。</p>
    </PlaceholderPage>
  );
}
