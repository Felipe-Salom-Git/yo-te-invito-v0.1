'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components';
import { Logo } from '@/components/brand/Logo';
import { RegisterWizardProgress } from './RegisterWizardProgress';
import {
  REGISTER_WIZARD_COPY,
  type RegisterWizardStepKey,
  getWizardProgressSteps,
} from './register-wizard-copy';
import type { RegistrationProfileType } from '@yo-te-invito/shared';

type Props = {
  step: RegisterWizardStepKey;
  profileType: RegistrationProfileType;
  heading: string;
  subtitle: string;
  children: ReactNode;
};

export function RegisterWizardShell({
  step,
  profileType,
  heading,
  subtitle,
  children,
}: Props) {
  const progressSteps = getWizardProgressSteps(profileType);
  const showProgress = step !== 'legal-retry';

  return (
    <div className="flex min-h-[60vh] w-full min-w-0 flex-col items-center justify-center gap-6 overflow-x-hidden px-4 py-6 pb-[max(6rem,env(safe-area-inset-bottom,0px))] pt-6 sm:px-6 sm:py-8">
      <Logo variant="auth" showText />
      <Card className="w-full min-w-0 max-w-lg overflow-hidden">
        <CardHeader className="space-y-1 border-b border-border/60 pb-4">
          <h1 className="text-xl font-semibold text-text">{REGISTER_WIZARD_COPY.title}</h1>
          <p id="register-step-heading" className="break-words text-sm font-medium text-text">
            {heading}
          </p>
          <p className="break-words text-sm leading-relaxed text-text-muted">{subtitle}</p>
        </CardHeader>
        <CardContent className="min-w-0 pt-6">
          {showProgress ? (
            <RegisterWizardProgress steps={progressSteps} currentStep={step} />
          ) : null}
          {children}
        </CardContent>
      </Card>
      <p className="text-center text-sm text-text-muted">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
