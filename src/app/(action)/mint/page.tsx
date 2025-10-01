'use client';
import dynamic from 'next/dynamic';

const MintForm = dynamic(() => import('@/components/form/MintForm/MintForm'), {
  ssr: false,
});

function Mint() {
  return (
    <div>
      <MintForm />
    </div>
  );
}

export default Mint;
