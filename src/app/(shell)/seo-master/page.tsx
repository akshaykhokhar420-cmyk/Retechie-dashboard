'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function Moved() { const r = useRouter(); useEffect(() => { r.replace('/seo-analysis' + (location.hash || '')); }, [r]); return null; }
