'use client';

import { MotionConfig } from 'motion/react';
import { useEffect } from 'react';
import { trackVisit } from '@/lib/db';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Günlük tekil ziyaretçi sayacı (Yönetim → Analitik)
  useEffect(() => trackVisit(), []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
