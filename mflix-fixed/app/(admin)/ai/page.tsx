'use client';

import AiControlCenter from '@/components/AiControlCenter';

/**
 * AI Assistant page — Phase 5
 * AiControlCenter ko full-page mode mein embed karta hai
 */
export default function AiPage() {
  return (
    <div className="h-full flex flex-col">
      <AiControlCenter pageMode />
    </div>
  );
}
