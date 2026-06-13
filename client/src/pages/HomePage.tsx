import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Clock, BookOpen, MessageSquare, Database, Settings2, Sparkles } from 'lucide-react';
import { AuthModal } from '../components/AuthModal';
import { useState } from 'react';

const styles: Record<string, React.CSSProperties> = {
  hero: {
    textAlign: 'center',
    padding: 'var(--space-12) 0',
    marginBottom: 'var(--space-12)',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-4)',
    background: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: 500,
    marginBottom: 'var(--space-6)',
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    fontWeight: 800,
    lineHeight: 1.1,
    marginBottom: 'var(--space-6)',
    background: 'linear-gradient(135deg, var(--color-text) 0%, var(--color-primary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '1.25rem',
    color: 'var(--color-text-secondary)',
    maxWidth: '600px',
    margin: '0 auto var(--space-8)',
    lineHeight: 1.6,
  },
  ctaSection: {
    display: 'flex',
    gap: 'var(--space-4)',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-4) var(--space-8)',
    background: 'var(--color-primary)',
    color: 'white',
    borderRadius: 'var(--radius-lg)',
    fontSize: '1.125rem',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'all 0.2s',
    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-4) var(--space-8)',
    background: 'var(--color-bg-secondary)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    fontSize: '1.125rem',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
  features: {
    marginBottom: 'var(--space-12)',
  },
  sectionTitle: {
    textAlign: 'center',
    marginBottom: 'var(--space-10)',
  },
  sectionTitleText: {
    fontSize: '1.75rem',
    fontWeight: 700,
    marginBottom: 'var(--space-3)',
  },
  sectionSubtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: '1.0625rem',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 'var(--space-6)',
  },
  featureCard: {
    padding: 'var(--space-6)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    transition: 'all 0.2s',
  },
  featureIcon: {
    width: '48px',
    height: '48px',
    background: 'var(--color-primary-light)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 'var(--space-4)',
    color: 'var(--color-primary)',
  },
  featureTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: 'var(--space-2)',
  },
  featureDesc: {
    color: 'var(--color-text-secondary)',
    fontSize: '0.9375rem',
    lineHeight: 1.6,
  },
  platforms: {
    marginBottom: 'var(--space-12)',
  },
  platformsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-4)',
  },
  platformCard: {
    padding: 'var(--space-6)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  platformIcon: {
    fontSize: '3rem',
    marginBottom: 'var(--space-3)',
  },
  platformName: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: 'var(--space-2)',
  },
  platformDesc: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
  },
  steps: {
    marginBottom: 'var(--space-12)',
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 'var(--space-6)',
    position: 'relative',
  },
  stepCard: {
    padding: 'var(--space-5)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    position: 'relative',
  },
  stepNumber: {
    width: '32px',
    height: '32px',
    background: 'var(--color-primary)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 700,
    fontSize: '0.875rem',
    marginBottom: 'var(--space-4)',
  },
  stepTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: 'var(--space-2)',
  },
  stepDesc: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
  },
};

const features = [
  {
    icon: Zap,
    title: '一键迁移',
    desc: '只需几步操作，即可将配置从一个平台迁移到另一个平台，省时省力。',
  },
  {
    icon: Shield,
    title: '数据安全',
    desc: '敏感信息自动脱敏处理，确保您的 API Key 和密码不会泄露。',
  },
  {
    icon: Clock,
    title: '断点续传',
    desc: '支持草稿保存，中断后可继续，未完成的迁移不会丢失。',
  },
  {
    icon: BookOpen,
    title: '字段映射',
    desc: '智能识别不同平台的字段，自动转换为目标平台的格式。',
  },
  {
    icon: MessageSquare,
    title: '智能提示词',
    desc: '自动生成导入/导出提示词，通过 AI 引导完成复杂配置。',
  },
  {
    icon: Database,
    title: '全面覆盖',
    desc: '支持技能、自动化、记忆、设置、提示词等多种配置类型。',
  },
];

const platforms = [
  { id: 'coze', name: '扣子 Coze', icon: '🤖', desc: '字节跳动 AI 开发平台' },
  { id: 'claude', name: 'Claude', icon: '🧠', desc: 'Anthropic 大模型助手' },
  { id: 'kimi', name: 'Kimi', icon: '🌙', desc: '月之暗面 AI 助手' },
  { id: 'openclaw', name: 'OpenClaw', icon: '🦞', desc: '开源 AI 助手平台' },
];

const steps = [
  {
    num: 1,
    title: '选择源平台',
    desc: '选择你当前使用的 AI 助手平台，系统会生成导出提示词。',
  },
  {
    num: 2,
    title: '复制导出提示词',
    desc: '将提示词粘贴到源平台对话中，获取你的配置 JSON 数据。',
  },
  {
    num: 3,
    title: '粘贴解析数据',
    desc: '将获取的 JSON 数据粘贴回来，系统自动解析并预览。',
  },
  {
    num: 4,
    title: '选择目标平台',
    desc: '选择要迁移到的目标平台，生成对应的导入提示词。',
  },
  {
    num: 5,
    title: '完成导入',
    desc: '按照导入提示词操作，完成目标平台的配置。',
  },
];

export const HomePage: React.FC = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <div>
      <section style={styles.hero}>
        <div style={styles.badge}>
          <Sparkles size={16} />
          AI 助手配置迁移工具
        </div>
        <h1 style={styles.title}>
          一键迁移你的 AI 助手配置
        </h1>
        <p style={styles.subtitle}>
          无需手动复制粘贴，ClawMigrate 可以帮助你在不同 AI 助手平台之间
          安全、快速地迁移技能、自动化、记忆和设置。
        </p>
        <div style={styles.ctaSection}>
          <Link
            to="/migrate"
            style={styles.primaryBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.4)';
            }}
          >
            开始迁移
            <ArrowRight size={20} />
          </Link>
          <button
            style={styles.secondaryBtn}
            onClick={() => setAuthModalOpen(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-bg-secondary)';
            }}
          >
            登录账户
          </button>
        </div>
      </section>

      <section style={styles.steps}>
        <div style={styles.sectionTitle}>
          <h2 style={styles.sectionTitleText}>简单五步，完成迁移</h2>
          <p style={styles.sectionSubtitle}>整个过程只需要几分钟，无需任何技术背景</p>
        </div>
        <div style={styles.stepsGrid}>
          {steps.map((step) => (
            <div key={step.num} style={styles.stepCard}>
              <div style={styles.stepNumber}>{step.num}</div>
              <h3 style={styles.stepTitle}>{step.title}</h3>
              <p style={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.platforms}>
        <div style={styles.sectionTitle}>
          <h2 style={styles.sectionTitleText}>支持的主流平台</h2>
          <p style={styles.sectionSubtitle}>持续更新中，敬请期待更多平台支持</p>
        </div>
        <div style={styles.platformsGrid}>
          {platforms.map((platform) => (
            <div key={platform.id} style={styles.platformCard}>
              <div style={styles.platformIcon}>{platform.icon}</div>
              <h3 style={styles.platformName}>{platform.name}</h3>
              <p style={styles.platformDesc}>{platform.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.features}>
        <div style={styles.sectionTitle}>
          <h2 style={styles.sectionTitleText}>为什么选择 ClawMigrate</h2>
          <p style={styles.sectionSubtitle}>专为 AI 助手用户设计的功能特性</p>
        </div>
        <div style={styles.featuresGrid}>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} style={styles.featureCard}>
                <div style={styles.featureIcon}>
                  <Icon size={24} />
                </div>
                <h3 style={styles.featureTitle}>{feature.title}</h3>
                <p style={styles.featureDesc}>{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode="login"
      />
    </div>
  );
};

export default HomePage;
