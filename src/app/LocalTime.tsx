'use client';

import { useEffect, useState } from 'react';

export default function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const [s, setS] = useState('');
  useEffect(() => {
    const d = new Date(iso);
    setS(
      d.toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
  }, [iso]);
  return (
    <span suppressHydrationWarning className={className}>
      {s}
    </span>
  );
}
