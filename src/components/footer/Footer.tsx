/* eslint-disable @next/next/no-img-element */
const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className='mt-4 border-t'>
      <div className='text-foreground z-10 container mx-auto flex w-full flex-col items-center justify-center space-y-6 py-6 md:flex-row md:justify-between md:space-y-0 xl:px-10'>
        {/* Left side: Logo and copyright */}
        <div className='flex items-center justify-center gap-2'>
          <img alt='Fluid tokens' src='/images/genius.png' className='w-24' />
        </div>

        {/* Right side: Social links */}
      </div>
    </footer>
  );
};

export default Footer;
