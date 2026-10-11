/**
 * 本地模拟校园底图（800×600，纯装饰，aria-hidden）。
 * 用建筑体块、道路网、绿地与水域模拟真实电子地图的平面呈现，
 * 不含任何真实地理数据；成员 B 交付正式地图视觉时可替换或细化。
 */
export function CampusBasemap() {
  return (
    <g aria-hidden="true">
      {/* 地表 */}
      <rect x="0" y="0" width="800" height="600" fill="#eaf0e8" />

      {/* 绿地 */}
      <rect x="36" y="392" width="110" height="170" rx="18" fill="#cfe3c6" />
      <rect x="672" y="48" width="92" height="118" rx="18" fill="#cfe3c6" />
      <rect x="56" y="60" width="84" height="70" rx="14" fill="#d7e8cf" />

      {/* 中心草坪与广场（学生活动中心所在） */}
      <circle cx="400" cy="300" r="118" fill="#d9e9cf" />
      <circle cx="400" cy="300" r="72" fill="#e7f0de" />

      {/* 水域 */}
      <path
        d="M660 440 Q 730 410 772 460 Q 800 505 752 560 Q 690 590 640 545 Q 615 495 660 440 Z"
        fill="#c4dded"
      />
      <path
        d="M682 462 Q 724 444 750 470 Q 768 498 736 534 Q 696 552 662 528 Q 646 494 682 462 Z"
        fill="#cfe4f1"
      />

      {/* 道路网（灰边白心；环路绕中心广场，不穿过建筑） */}
      <g fill="none" strokeLinecap="round">
        <g stroke="#d5dcd5" strokeWidth="18">
          <path d="M400 0 V182" />
          <path d="M400 418 V600" />
          <path d="M0 300 H258" />
          <path d="M542 300 H800" />
          <ellipse cx="400" cy="300" rx="140" ry="112" />
          <path d="M150 96 V300" />
          <path d="M648 120 V492" />
        </g>
        <g stroke="#fcfdfc" strokeWidth="13">
          <path d="M400 0 V182" />
          <path d="M400 418 V600" />
          <path d="M0 300 H258" />
          <path d="M542 300 H800" />
          <ellipse cx="400" cy="300" rx="140" ry="112" />
          <path d="M150 96 V300" />
          <path d="M648 120 V492" />
        </g>
      </g>

      {/* 建筑体块（浅色 + 细边，对应 5 个业务地点 + 装饰建筑） */}
      <g fill="#f4f1e8" stroke="#d9d3c3" strokeWidth="2">
        <rect x="176" y="92" width="128" height="86" rx="6" /> {/* 图书馆 */}
        <rect x="466" y="126" width="108" height="76" rx="6" /> {/* 第三教学楼 */}
        <rect x="500" y="352" width="120" height="98" rx="10" /> {/* 体育馆 */}
        <rect x="168" y="332" width="112" height="80" rx="6" /> {/* 第一食堂 */}
        <rect x="366" y="272" width="68" height="56" rx="8" /> {/* 学生活动中心 */}
        <rect x="64" y="150" width="80" height="56" rx="6" /> {/* 装饰：宿舍 */}
        <rect x="80" y="222" width="64" height="44" rx="6" /> {/* 装饰：宿舍 */}
        <rect x="668" y="212" width="96" height="62" rx="6" /> {/* 装饰：实验楼 */}
      </g>

      {/* 树木点缀 */}
      <g fill="#b7d4ab">
        <circle cx="170" cy="270" r="7" />
        <circle cx="120" cy="340" r="6" />
        <circle cx="620" cy="330" r="7" />
        <circle cx="700" cy="180" r="6" />
        <circle cx="330" cy="120" r="7" />
        <circle cx="480" cy="430" r="6" />
        <circle cx="240" cy="480" r="7" />
        <circle cx="560" cy="90" r="6" />
      </g>
    </g>
  );
}
