'use client';
import FluidLogo from '@/components/FluidLogo';

import { AppRoute } from '@/shared/route';
import Link from 'next/link';

import ConnectWalletModal from '@/components/modal/ConnectWalletModal';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
function Header() {
  const pathname = usePathname();

  return (
    <header className='container mx-auto flex items-center justify-between px-6 py-4'>
      <nav className='flex items-center gap-12'>
        {' '}
        <FluidLogo withLink />
        <Link
          className={cn(
            'hover:text-shadow-fluid text-sm font-bold',
            pathname === AppRoute.HOME && 'text-primary text-shadow-fluid'
          )}
          href={AppRoute.HOME}
        >
          HOME
        </Link>
        <Link
          className={cn(
            'hover:text-shadow-fluid text-sm font-bold',
            pathname === AppRoute.DASHBOARD && 'text-primary text-shadow-fluid'
          )}
          href={AppRoute.DASHBOARD}
        >
          DASHBOARD
        </Link>
      </nav>
      <div className='flex items-center space-x-2'>
        <ConnectWalletModal />
      </div>
    </header>
  );
}

export default Header;
