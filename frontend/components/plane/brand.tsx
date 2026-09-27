/* eslint-disable @next/next/no-img-element -- 32px static logo; next/image adds nothing here */
import Link from 'next/link';
export function Brand({ dark = false }: { dark?: boolean }) { return <Link href="/" aria-label="Plane home" className={`brand ${dark ? 'brand-dark' : ''}`}><img src="/brand/plane.png" alt="" width="32" height="32"/><span>Plane</span></Link> }
