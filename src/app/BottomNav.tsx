import { NavLink } from 'react-router-dom';
import { NAV_ITEMS, type NavIcon } from './config';
import { useAppStore } from '../store';
import { helpEntryLabel } from '../store/helpRequests';

/** 底部导航图标（线条风格；激活时由 CSS 变为填充色，同时有文字与指示条双重提示） */
function NavGlyph({ icon }: { icon: NavIcon }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  };
  switch (icon) {
    case 'help':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v10M7 12h10" /></svg>;
    case 'ranking':
      return <svg {...common}><path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6v3" /></svg>;
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      );
    case 'map':
      return (
        <svg {...common}>
          <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case 'publish':
      return (
        <svg {...common}>
          <rect x="3.5" y="6.5" width="17" height="13" rx="2.5" />
          <path d="M9.5 4l2.5 2.5L14.5 4" />
          <path d="M12 10.5v6M9 13.5h6" />
        </svg>
      );
    case 'ai':
      return (
        <svg {...common}>
          <path d="M5 5.5h14a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H9l-4 3.5v-15a1 1 0 0 1 0-0Z" />
          <path d="M9.5 10.5h.01M14.5 10.5h.01" />
        </svg>
      );
    case 'me':
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="3.5" />
          <path d="M4.5 20c.8-3.6 3.8-5 7.5-5s6.7 1.4 7.5 5" />
        </svg>
      );
  }
}

export function BottomNav() {
  const store = useAppStore();
  const waiting = store.helpRequests.filter((item) => item.status === 'pending' && item.recipientIds.includes(store.currentUserId)).length;
  return (
    <nav className="bottom-nav" aria-label="主导航">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.end}
          className="bottom-nav__item"
        >
          <NavGlyph icon={item.icon} />
          <span>{item.icon === 'help' ? helpEntryLabel(store.currentUser.role) : item.label}{item.icon === 'help' && waiting > 0 ? `（${waiting}）` : ''}</span>
        </NavLink>
      ))}
    </nav>
  );
}
