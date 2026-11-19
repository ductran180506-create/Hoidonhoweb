'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ShortCodeRedirectPage() {
  const params = useParams();
  const code = params?.code as string;
  const router = useRouter();

  useEffect(() => {
    if (code) {
      router.replace(`/truyen/${code}`);
    }
  }, [code, router]);

  return (
    <div className="py-24 text-center text-xs text-[#6B7280]">
      Đang chuyển đến truyện...
    </div>
  );
}
