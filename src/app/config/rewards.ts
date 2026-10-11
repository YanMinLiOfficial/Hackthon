/** 全部为演示商品，不代表真实库存、发货或认证承诺。 */
export const REWARDS = [
  { id: 'guide', category: '书籍', icon: '📖', title: '无障碍生活入门手册', description: '易读版电子手册，认识常见设施与沟通方式。', cost: 10, review: false },
  { id: 'badge', category: '周边', icon: '🌱', title: '无碍共创志愿者徽章', description: '让每一次共创被看见，纪念徽章与贴纸套装。', cost: 20, review: false },
  { id: 'book', category: '书籍', icon: '📚', title: '通用设计主题书籍', description: '从日常生活理解包容性设计，纸质书兑换占位。', cost: 30, review: false },
  { id: 'hours', category: '志愿时长', icon: '⏱', title: '志愿时长审核申请', description: '演示目标：申请核验 1 小时实际服务记录。积分不等于服务时长，须由合作机构核验实际服务后认定。', cost: 50, review: true },
] as const;
