'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ArrowDownToLine, ShieldCheck } from 'lucide-react';
import { MediaAnalyzer } from '@/components/media-analyzer';
import { JobList } from '@/components/job-list';
import { useT } from '@/lib/i18n/context';

export default function DashboardPage() {
  const { t } = useT();
  const queueRef = useRef<HTMLDivElement>(null);
  const cancelPendingWaitRef = useRef<(() => void) | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const scrollToQueue = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = window.requestAnimationFrame(() => {
      queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      animationFrameRef.current = null;
    });
  }, []);

  const scrollToTop = useCallback(() => {
    cancelPendingWaitRef.current?.();
    cancelPendingWaitRef.current = null;
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    animationFrameRef.current = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      animationFrameRef.current = null;
    });
  }, []);

  useEffect(() => {
    const handleJobCreated = () => {
      cancelPendingWaitRef.current?.();
      cancelPendingWaitRef.current = null;

      const queueAnchor = queueRef.current;
      if (!queueAnchor) return;

      const scrollWhenReady = () => {
        if (!queueAnchor.querySelector('#download-queue')) return false;
        cancelPendingWaitRef.current?.();
        cancelPendingWaitRef.current = null;
        scrollToQueue();
        return true;
      };

      if (scrollWhenReady()) return;

      const observer = new MutationObserver(() => void scrollWhenReady());
      observer.observe(queueAnchor, { childList: true, subtree: true });
      cancelPendingWaitRef.current = () => observer.disconnect();
    };

    window.addEventListener('media-loader:job-created', handleJobCreated);
    window.addEventListener('media-loader:queue-closed', scrollToTop);

    return () => {
      window.removeEventListener('media-loader:job-created', handleJobCreated);
      window.removeEventListener('media-loader:queue-closed', scrollToTop);
      cancelPendingWaitRef.current?.();
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scrollToQueue, scrollToTop]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-9">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="ui-kicker">{t('dashboard.kicker', {}, 'ดาวน์โหลดไฟล์ใหม่')}</p>
          <h1 className="ui-page-title mt-2">{t('dashboard.title')}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            {t('download.autoCheck', {}, 'ตรวจสอบลิงก์อัตโนมัติ')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-surface/60 px-3 py-1.5">
            <ArrowDownToLine aria-hidden="true" className="size-3.5 text-primary" />
            MP4 · MP3
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-5">
        <div className="ui-panel min-w-0 flex-1 rounded-3xl p-4 shadow-none sm:p-5 lg:p-6">
          <MediaAnalyzer />
        </div>
        <div ref={queueRef} id="download-queue-anchor" className="w-full scroll-mt-24">
          <JobList mode="queue" compact={true} onQueueClosed={scrollToTop} />
        </div>
      </div>
    </div>
  );
}
