'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppRoute } from '@/shared/route';
import { usePathname, useRouter } from 'next/navigation';

type Props = {
  children: React.ReactNode;
};

function ActionLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const action = pathname.includes(AppRoute.MINT) ? 'mint' : 'policy';

  const handleTabChange = (value: string) => {
    router.push(`/${value}`);
  };

  return (
    <div className='flex w-full flex-col space-y-4'>
      <div className='border-border bg-soft mx-auto flex w-full max-w-xl items-center justify-between rounded-4xl border px-4 py-3'>
        <h4 className='font-bold uppercase'>
          {action === 'policy' && 'Create Policy'}
          {action === 'mint' && 'Mint token'}
        </h4>
        <div>
          <Tabs value={action} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value='policy'>POLICY</TabsTrigger>
              <TabsTrigger value='mint'>MINT</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {children}
    </div>
  );
}

export default ActionLayout;
