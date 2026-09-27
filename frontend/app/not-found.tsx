import Link from 'next/link';
import {Brand} from '@/components/plane/brand';
export default function NotFound(){return <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center"><Brand/><h1 className="text-3xl tracking-tight">This page has flown off.</h1><p className="text-slate-500">We couldn’t find the page you’re looking for.</p><Link href="/" className="underline underline-offset-4">Return to Plane</Link></main>}
