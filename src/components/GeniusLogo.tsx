/* eslint-disable @next/next/no-img-element */
import { AppRoute } from '@/shared/route';
import Link from 'next/link';
import React from 'react';

type Props = {
  withLink?: boolean;
  href?: AppRoute;
};

function GeniusLogo({ withLink, href }: Props) {
  const content = (
    <div className='flex items-center gap-2'>
      <img
        alt='Fluid Tokens Logo'
        src={`/images/genius.png`}
        className='w-32'
      />
    </div>
  );

  if (withLink) {
    return <Link href={href || AppRoute.HOME}>{content}</Link>;
  }

  return <div>{content}</div>;
}

export default GeniusLogo;
