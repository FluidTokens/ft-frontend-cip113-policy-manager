'use client';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TokensOverview = dynamic(
  () => import('@/components/dashboard/TokensOverview'),
  {
    ssr: false,
  }
);

const ClaimListViewer = dynamic(
  () =>
    import('@/components/dashboard/ClaimListViewer').then(
      (mod) => mod.ClaimListViewer
    ),
  {
    ssr: false,
  }
);

const ClaimantView = dynamic(
  () =>
    import('@/components/dashboard/ClaimantView').then(
      (mod) => mod.ClaimantView
    ),
  {
    ssr: false,
  }
);

function Dashboard() {
  return (
    <div className='container mx-auto py-8'>
      <h1 className='mb-6 text-3xl font-bold'>Dashboard</h1>

      <Tabs defaultValue='tokens' className='w-full'>
        <TabsList className='w-full max-w-[600px]'>
          <TabsTrigger value='tokens'>My Tokens</TabsTrigger>
          <TabsTrigger value='claimable'>Claimable</TabsTrigger>
        </TabsList>

        <TabsContent value='tokens' className='mt-6'>
          <TokensOverview />
        </TabsContent>

        <TabsContent value='claimable' className='mt-6'>
          <ClaimantView />
        </TabsContent>
        {/* 
        <TabsContent value='admin' className='mt-6'>
          <ClaimListViewer />
        </TabsContent> */}
      </Tabs>
    </div>
  );
}

export default Dashboard;
