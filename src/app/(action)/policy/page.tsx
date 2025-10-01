'use client';
import dynamic from 'next/dynamic';

const CreatePolicyForm = dynamic(() => import('@/components/form/CreatePolicyForm/CreatePolicyForm'), {
  ssr: false,
});

function Policy() {
  return (
    <div>
      <CreatePolicyForm />
    </div>
  );
}

export default Policy;
