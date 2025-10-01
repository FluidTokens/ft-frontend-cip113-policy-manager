import { Button } from '@/components/ui/button';
import { AppRoute } from '@/shared/route';
import Link from 'next/link';

// Data array for CTAs
const ctaItems = [
  {
    title: 'Create Policy',
    description: 'Make transactions without gas fees',
    content: 'Create policy with CIP113',
    buttonText: 'Create now',
    href: AppRoute.POLICY,
  },
  {
    title: 'Mint tokens',
    description: 'Select policy and mint CIP113 tokens.',
    content: 'Just select policy and how many tokens to mint',
    buttonText: 'Mint now',
    href: AppRoute.MINT,
  },
  {
    title: 'Transfer tokens',
    description: 'Send CIP113 tokens',
    content: 'Add a receiver and quantity and send tokens',
    buttonText: 'Transfer Now',
    href: AppRoute.DASHBOARD,
  },
];
export default function Home() {
  return (
    <div className='container m-auto'>
      <div className='py-10 text-center md:pt-24'>
        <h1 className='relative mb-4 text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl'>
          <span className='text-white'>
            Interact with <br />
            <span className='from-primary relative bg-gradient-to-r to-[#50d1b3] bg-clip-text text-transparent'>
              CIP113
            </span>
          </span>
        </h1>

        {/* Subtitle */}
        <p className='mx-auto mb-8 max-w-2xl text-xl text-gray-500'>
          Create Policy. Mint and Transfer tokens.
        </p>
        <section className='grid grid-cols-1 gap-6 p-4 pb-24 md:grid-cols-3'>
          {ctaItems.map((item, index) => (
            <div
              key={index}
              className='border-border] bg-soft overflow-hidden rounded-[30px] border text-white transition-all hover:shadow-lg'
            >
              <div className={`bg-gradient-to-r p-6 text-white`}>
                <h3 className='flex items-center justify-center gap-2 text-center text-xl font-semibold'>
                  {item.title}
                </h3>
                <p className='mt-1 text-sm text-gray-100'>{item.description}</p>
              </div>
              <div className='p-6'>
                <p className='text-muted-foreground'>{item.content}</p>
              </div>
              <div className='px-6 pb-6'>
                <Link href={item.href}>
                  <Button className='btn group w-full'>
                    {item.buttonText}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
