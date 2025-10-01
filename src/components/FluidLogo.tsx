/* eslint-disable @next/next/no-img-element */
import { AppRoute } from '@/shared/route';
import Link from 'next/link';
import React from 'react';

type Props = {
  withLink?: boolean;
  href?: AppRoute;
};

function FluidLogo({ withLink, href }: Props) {
  const content = (
    <div className='flex items-center gap-2'>
      <img
        alt='Fluid Tokens Logo'
        src={`/images/fluidADA.png`}
        className='w-8'
      />
      <div>
        <div className='text-sm font-extrabold tracking-[0.15rem] uppercase'>
          Fluid Tokens
        </div>
        <div className='text-[10px] font-semibold tracking-wider'>
          Minswap - CIP113
        </div>
      </div>
    </div>
  );

  if (withLink) {
    return <Link href={href || AppRoute.HOME}>{content}</Link>;
  }

  return <div>{content}</div>;
}

export default FluidLogo;
