'use client';
import dynamic from 'next/dynamic';

const TokensOverview = dynamic(() => import('@/components/dashboard/TokensOverview'), {
  ssr: false,
});

function Dashboard() {
  return (
    <div className='container mx-auto py-8'>
      <TokensOverview />
    </div>
  );
}

export default Dashboard;
