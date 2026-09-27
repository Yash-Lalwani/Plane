import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/plane/providers';
export const metadata: Metadata = { title: 'Plane — A little structure. A lot of progress.', description:'Bring your projects, tasks, and team together. A clear workspace for everything you’re building.', icons:{icon:'/brand/plane.png',shortcut:'/brand/plane.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>}
