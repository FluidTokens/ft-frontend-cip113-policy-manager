/* eslint-disable @next/next/no-img-element */
const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className='mt-4 border-t'>
      <div className='text-foreground z-10 container mx-auto flex w-full flex-col items-center justify-center space-y-6 py-6 md:flex-row md:justify-between md:space-y-0 xl:px-10'>
        {/* Left side: Logo and copyright */}
        <div className='flex items-center justify-center gap-2'>
          <img alt='Fluid tokens' src='/images/fluidADA.png' className='w-8' />
          <div className='flex flex-col'>
            <div className='text-xs font-semibold'>FluidTokens</div>
            <div className='text-[9px]'>© {year}. All Rights Reserved.</div>
          </div>
        </div>

        {/* Right side: Social links */}
        <div className='text-foreground flex items-center justify-center gap-4'>
          <a
            href='https://docs.fluidtokens.com'
            target='_blank'
            rel='noopener noreferrer'
            className='rounded-md border p-1'
          >
            Docs
          </a>
          <a
            href='https://twitter.com/FluidTokens'
            target='_blank'
            rel='noopener noreferrer'
            className='rounded-md border p-1'
          >
            <img alt='X' src='/images/logo/socials/X.png' className='w-5' />
          </a>
          <a
            href='https://discord.gg/kyyCw4h98B'
            target='_blank'
            rel='noopener noreferrer'
            className='rounded-md border p-1'
          >
            <img
              alt='discord'
              src='/images/logo/socials/discord.webp'
              className='w-5'
            />
          </a>
          <a
            href='https://github.com/fluidtokens'
            target='_blank'
            rel='noopener noreferrer'
            className='rounded-md border p-1'
          >
            <img
              alt='github'
              src='/images/logo/socials/github.png'
              className='w-5'
            />
          </a>
          <a
            href='https://www.linkedin.com/company/fluidtokens'
            target='_blank'
            rel='noopener noreferrer'
            className='rounded-md border p-1'
          >
            <img
              alt='linkedin'
              src='/images/logo/socials/linkedin.webp'
              className='w-5'
            />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
