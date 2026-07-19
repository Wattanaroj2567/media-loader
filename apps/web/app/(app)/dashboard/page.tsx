'use client';

import { useEffect, useRef } from 'react';
import { ArrowDownToLine, ShieldCheck } from 'lucide-react';
import { MediaAnalyzer } from '@/components/media-analyzer';
import { JobList } from '@/components/job-list';
import { useT } from '@/lib/i18n/context';

export default function DashboardPage() {
  const { t } = useT();
  const queueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleJobsChanged = () => {
      // If mobile view, scroll the active queue panel into view smoothly when a new job starts
      if (window.innerWidth < 1024 && queueRef.current) {
        // Add a slight delay to allow rendering/state updates to align
        setTimeout(() => {
          queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    };
    window.addEventListener('media-loader:jobs-changed', handleJobsChanged);
    return () => window.removeEventListener('media-loader:jobs-changed', handleJobsChanged);
  }, []);

  return (
    <div className="mx-auto max-w-[1540px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9 xl:px-10">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="ui-kicker">{t('dashboard.kicker', {}, 'ดาวน์โหลดไฟล์ใหม่')}</p>
          <h1 className="ui-page-title mt-2">{t('dashboard.title')}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            {t('download.autoCheck', {}, 'ตรวจสอบลิงก์อัตโนมัติ')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-surface/60 px-3 py-1.5">
            <ArrowDownToLine aria-hidden="true" className="size-3.5 text-primary" />
            MP4 · MP3
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6 xl:gap-7">
        <div className="ui-panel min-w-0 flex-1 rounded-3xl p-4 sm:p-5 lg:p-6">
          <MediaAnalyzer />
        </div>
        <JobList mode="queue" compact={true} containerRef={queueRef} />
      </div>
    </div>
  );
}
