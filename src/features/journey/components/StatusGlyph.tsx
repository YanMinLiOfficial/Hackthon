import type { MarkerShape } from '../../../app/config';

/**
 * 状态图形编码：与颜色、文字同时使用，状态表达不只依赖颜色。
 * 地图大头针与状态徽标共用此图形集合。
 */
export function StatusGlyph({
  shape,
  size = 16,
}: {
  shape: MarkerShape;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    'aria-hidden': true,
    focusable: false,
  } as const;

  switch (shape) {
    case 'pin-ring':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'pin-dot':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5" fill="currentColor" />
        </svg>
      );
    case 'pin-square':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="10" height="10" rx="1.5" fill="currentColor" />
        </svg>
      );
    case 'pin-triangle':
      return (
        <svg {...common}>
          <path d="M8 2.5 14.5 13.5h-13L8 2.5Z" fill="currentColor" />
        </svg>
      );
    case 'pin-clock':
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.6">
          <circle cx="8" cy="8.5" r="5.5" fill="none" />
          <path d="M8 5.5v3l2.2 1.4" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'pin-check':
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.8">
          <circle cx="8" cy="8" r="5.5" fill="none" />
          <path d="m5.2 8.2 2 2 3.6-4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
  }
}
