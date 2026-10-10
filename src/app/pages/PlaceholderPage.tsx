import type { ReactNode } from 'react';

interface PlaceholderPageProps {
  title: string;
  owner: string;
  modulePath: string;
  milestone: string;
  facts: readonly string[];
  children?: ReactNode;
}

/**
 * M0 频道占位页：只证明路由、导航与共享数据已贯通。
 * 各频道完整页面由 TEAM_PLAN.md 指定的成员在自己的 feature 分支实现，
 * 不在 M0 由项目负责人提前完成。
 */
export function PlaceholderPage({
  title,
  owner,
  modulePath,
  milestone,
  facts,
  children,
}: PlaceholderPageProps) {
  return (
    <section className="placeholder" aria-labelledby="placeholder-title">
      <h2 id="placeholder-title" className="placeholder__title">
        {title}
      </h2>
      <p className="placeholder__note">
        该频道将在「{milestone}」由{owner}实现（<code>{modulePath}</code>）。M0
        阶段只提供占位，项目骨架与共享数据已就绪：
      </p>
      <ul className="placeholder__facts">
        {facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
      {children}
    </section>
  );
}
