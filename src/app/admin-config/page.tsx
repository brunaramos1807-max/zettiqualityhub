'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminConfigRedirect() {
  const router = useRouter();
  useEffect(() => {
    router?.replace('/configuracoes');
  }, [router]);
  return null;
}
