import { SignIn } from '@clerk/nextjs';
import { Logo } from '@/components/shared/Logo';
import Link from 'next/link';

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F0E6D2] p-4 py-8 md:py-12 overflow-y-auto">
      <div className="m-auto w-full max-w-[480px] bg-[#002B40] rounded-3xl p-6 sm:p-8 md:p-12 shadow-2xl flex flex-col items-center">
        {/* Logo */}
        <Link href="/">
          <Logo className="mb-8 hover:opacity-80 transition-opacity cursor-pointer" />
        </Link>

        {/* Welcome Text */}
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          Boas-vindas!
        </h1>
        <p className="text-white/80 text-center mb-8">
          Entre com sua conta.
          {/* Cadastro temporariamente oculto
          {' '}ou{' '}
          <Link
            href="/sign-up"
            className="text-[#FF6B00] hover:underline font-medium"
          >
            cadastre-se.
          </Link>
          */}
        </p>

        {/* Clerk SignIn */}
        <div className="w-full">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                cardBox: 'w-full max-w-full shadow-none bg-transparent mx-0',
                card: 'bg-transparent shadow-none w-full max-w-full p-0 sm:p-0',
                header: 'hidden', // Removes the extra Clerk logo
                main: 'gap-4',
                formFieldLabel: 'hidden',
                formFieldInput:
                  'bg-white border-none h-12 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#FF6B00] w-full',
                formButtonPrimary:
                  'bg-[#FF6B00] hover:bg-[#E66000] h-12 rounded-lg text-lg font-bold normal-case shadow-lg transition-all w-full',
                footer: 'hidden',
                identityPreviewText: 'text-white',
                identityPreviewEditButton: 'text-[#FF6B00]',
                formResendCodeLink: 'text-[#FF6B00]',
                dividerLine: 'bg-white/10',
                dividerText: 'text-white/50',
                socialButtonsBlockButton: 'bg-white border-none w-full h-12',
                socialButtonsBlockButtonText: 'text-gray-900 font-medium',
                alert: 'bg-red-500/10 border-red-500/20 text-red-200 text-sm',
                formFieldAction:
                  'text-[#FF6B00] hover:text-[#E66000] font-medium text-sm no-underline hover:underline',
              },
            }}
            routing="path"
            path="/sign-in"
          />
        </div>
      </div>
    </div>
  );
}
