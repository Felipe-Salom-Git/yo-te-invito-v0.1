'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { z } from 'zod';
import { Button, Input } from '@/components';
import { LegalFlowAcceptanceBlock } from '@/components/legal/LegalFlowAcceptanceBlock';
import { useRepositories } from '@/repositories/context';
import {
  isRegisterEmailDuplicateError,
  mapRegisterApiError,
  REGISTER_ERROR_MESSAGES,
} from '@/lib/auth/register-error-messages';
import { getErrorMessage } from '@/lib/errors';
import { cityLabelFromValue } from '@yo-te-invito/shared';
import {
  scheduleFocusRegisterError,
  zodIssuesToFieldMap,
} from '@/lib/auth/register-validation';
import { usePublicLegalRequirements } from '@/lib/query/public-legal-requirements';
import {
  validateSignupLegalState,
  LEGAL_ACCEPTANCE_REQUIRED_MSG,
} from '@/lib/legal/legal-acceptance-validation';
import {
  gastroProfileSignupSchema,
  hotelProfileSignupSchema,
  producerProfileSignupSchema,
  referrerProfileSignupSchema,
  LEGAL_SIGNUP_USER_MESSAGES,
  type GastroProfileSignupInput,
  type HotelProfileSignupInput,
  type ReferrerProfileSignupInput,
} from '@yo-te-invito/shared';
import type { AuthRegisterRequest, RegistrationProfileType } from '@yo-te-invito/shared';
import { RegisterBuyerStep } from './register/RegisterBuyerStep';
import { RegisterGastroStep, type GastroSignupFormValues } from './register/RegisterGastroStep';
import { RegisterHotelStep, type HotelSignupFormValues } from './register/RegisterHotelStep';
import { RegisterProducerStep } from './register/RegisterProducerStep';
import { RegisterReferrerStep } from './register/RegisterReferrerStep';
import { RegisterProfileStep } from './register/RegisterProfileStep';
import { RegisterWizardErrorAlert } from './register/RegisterWizardErrorAlert';
import { RegisterWizardShell } from './register/RegisterWizardShell';
import {
  REGISTER_WIZARD_COPY,
  getStepMeta,
  profileSignupDataStep,
  type RegisterWizardStepKey,
} from './register/register-wizard-copy';

const EMPTY_GASTRO_FORM: GastroSignupFormValues = {
  displayName: '',
  contactEmail: '',
  province: '',
  city: '',
  address: '',
};

const EMPTY_HOTEL_FORM: HotelSignupFormValues = {
  displayName: '',
  websiteUrl: '',
  province: '',
  city: '',
};

const accountSchema = z
  .object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'Nombre requerido'),
    lastName: z.string().min(1, 'Apellido requerido'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type AccountData = z.infer<typeof accountSchema> & { city: string };

type SubmitPhase = 'idle' | 'register' | 'signin' | 'retry';

function redirectForProfile(type: RegistrationProfileType): string {
  switch (type) {
    case 'PRODUCER':
      return '/producer';
    case 'GASTRO':
      return '/gastro';
    case 'HOTEL':
      return '/hotel';
    case 'REFERRER':
      return '/referrer';
    default:
      return '/me';
  }
}

function buildRegisterPayload(
  account: AccountData,
  profileType: RegistrationProfileType,
  profileData: unknown | undefined,
  selectedLegalVersionIds: string[],
  signupRequiredCount: number,
): AuthRegisterRequest {
  const payload: AuthRegisterRequest = {
    email: account.email,
    password: account.password,
    firstName: account.firstName,
    lastName: account.lastName,
    city: account.city,
    tenantId: 'tenant-demo',
    profileType,
    profileData: profileType === 'USER' ? undefined : profileData,
  };
  if (signupRequiredCount > 0 && selectedLegalVersionIds.length > 0) {
    payload.signupLegalAcceptance = {
      documentVersionIds: selectedLegalVersionIds,
      context: 'SIGNUP',
    };
  }
  return payload;
}

export function RegisterWizard() {
  const router = useRouter();
  const repos = useRepositories();
  const contentRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<RegisterWizardStepKey>('account');
  const [account, setAccount] = useState<AccountData | null>(null);
  const [profileType, setProfileType] = useState<RegistrationProfileType>('USER');
  const [error, setError] = useState<string | null>(null);
  const [legalError, setLegalError] = useState<string | null>(null);
  const [legalConfigError, setLegalConfigError] = useState<string | null>(null);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [buyerCityError, setBuyerCityError] = useState<string | null>(null);
  const [producerDisplayName, setProducerDisplayName] = useState('');
  const [producerDisplayNameError, setProducerDisplayNameError] = useState<string | null>(null);
  const [producerProfileData, setProducerProfileData] = useState<{ displayName: string } | null>(
    null,
  );
  const [gastroForm, setGastroForm] = useState<GastroSignupFormValues>(EMPTY_GASTRO_FORM);
  const [gastroFieldErrors, setGastroFieldErrors] = useState<
    Partial<Record<keyof GastroSignupFormValues, string>>
  >({});
  const [gastroProfileData, setGastroProfileData] = useState<GastroProfileSignupInput | null>(null);
  const [hotelForm, setHotelForm] = useState<HotelSignupFormValues>(EMPTY_HOTEL_FORM);
  const [hotelFieldErrors, setHotelFieldErrors] = useState<
    Partial<Record<keyof HotelSignupFormValues, string>>
  >({});
  const [hotelProfileData, setHotelProfileData] = useState<HotelProfileSignupInput | null>(null);
  const [referrerDisplayName, setReferrerDisplayName] = useState('');
  const [referrerDisplayNameError, setReferrerDisplayNameError] = useState<string | null>(null);
  const [referrerProfileData, setReferrerProfileData] = useState<ReferrerProfileSignupInput | null>(
    null,
  );
  const [regCity, setRegCity] = useState('Bariloche');
  const [selectedLegalVersionIds, setSelectedLegalVersionIds] = useState<string[]>([]);

  const submitting = submitPhase !== 'idle';

  const needsLegalQuery =
    step === 'buyer' ||
    step === 'producer' ||
    step === 'gastro' ||
    step === 'hotel' ||
    step === 'referrer' ||
    step === 'legal' ||
    step === 'legal-retry';
  const {
    data: signupLegal,
    isLoading: signupLegalLoading,
    isError: signupLegalFetchError,
    refetch: refetchSignupLegal,
  } = usePublicLegalRequirements('SIGNUP', profileType, needsLegalQuery);

  const signupLegalItems = signupLegal?.required ?? [];
  const signupRequiredCount = signupLegalItems.length;
  const legalSubmitBlocked =
    signupLegalLoading ||
    signupLegalFetchError ||
    (signupLegal != null && !signupLegal.canProceed);

  const stepMeta = getStepMeta(step, profileType);

  useEffect(() => {
    contentRef.current?.focus();
  }, [step]);

  useEffect(() => {
    setSelectedLegalVersionIds([]);
    setLegalError(null);
    setLegalConfigError(null);
    if (profileType !== 'PRODUCER') {
      setProducerDisplayName('');
      setProducerProfileData(null);
      setProducerDisplayNameError(null);
    }
    if (profileType !== 'GASTRO') {
      setGastroForm(EMPTY_GASTRO_FORM);
      setGastroFieldErrors({});
      setGastroProfileData(null);
    }
    if (profileType !== 'HOTEL') {
      setHotelForm(EMPTY_HOTEL_FORM);
      setHotelFieldErrors({});
      setHotelProfileData(null);
    }
    if (profileType !== 'REFERRER') {
      setReferrerDisplayName('');
      setReferrerProfileData(null);
      setReferrerDisplayNameError(null);
    }
  }, [profileType]);

  useEffect(() => {
    if (signupLegal && !signupLegal.canProceed) {
      setLegalConfigError(LEGAL_SIGNUP_USER_MESSAGES.configUnavailable);
    } else {
      setLegalConfigError(null);
    }
  }, [signupLegal]);

  const handleAccountSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const raw = {
      email: String(fd.get('email') ?? '').trim(),
      password: String(fd.get('password') ?? ''),
      confirmPassword: String(fd.get('confirmPassword') ?? ''),
      firstName: String(fd.get('firstName') ?? '').trim(),
      lastName: String(fd.get('lastName') ?? '').trim(),
    };
    const parsed = accountSchema.safeParse(raw);
    if (!parsed.success) {
      const errs: Partial<Record<string, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      scheduleFocusRegisterError(contentRef.current);
      return;
    }
    setFieldErrors({});
    setAccount({ ...parsed.data, city: regCity });
    setStep('profile');
  };

  const handleBuyerContinue = () => {
    const city = regCity.trim();
    if (!city) {
      setBuyerCityError(REGISTER_ERROR_MESSAGES.buyerCityRequired);
      scheduleFocusRegisterError(contentRef.current);
      return;
    }
    setBuyerCityError(null);
    if (account) {
      setAccount({ ...account, city });
    }
    setStep('legal');
  };

  const handleProducerContinue = () => {
    setError(null);
    const parsed = producerProfileSignupSchema.safeParse({
      displayName: producerDisplayName.trim(),
    });
    if (!parsed.success) {
      const nameIssue = parsed.error.issues.find((i) => i.path[0] === 'displayName');
      setProducerDisplayNameError(nameIssue?.message ?? 'Ingresá el nombre de la productora');
      scheduleFocusRegisterError(contentRef.current);
      return;
    }
    setProducerDisplayNameError(null);
    setProducerProfileData(parsed.data);
    setStep('legal');
  };

  const handleGastroContinue = () => {
    const parsed = gastroProfileSignupSchema.safeParse({
      displayName: gastroForm.displayName.trim(),
      contactEmail: gastroForm.contactEmail.trim(),
      location: {
        province: gastroForm.province.trim(),
        city: gastroForm.city.trim(),
        address: gastroForm.address.trim(),
      },
    });
    if (!parsed.success) {
      setGastroFieldErrors(
        zodIssuesToFieldMap(parsed.error.issues, Object.keys(EMPTY_GASTRO_FORM)) as Partial<
          Record<keyof GastroSignupFormValues, string>
        >,
      );
      scheduleFocusRegisterError(contentRef.current);
      return;
    }
    setGastroFieldErrors({});
    setGastroProfileData(parsed.data);
    if (account) {
      const cityPref =
        cityLabelFromValue(parsed.data.location.city) || parsed.data.location.city;
      setAccount({ ...account, city: cityPref });
    }
    setStep('legal');
  };

  const handleHotelContinue = () => {
    const parsed = hotelProfileSignupSchema.safeParse({
      displayName: hotelForm.displayName.trim(),
      websiteUrl: hotelForm.websiteUrl.trim(),
      location: {
        province: hotelForm.province.trim(),
        city: hotelForm.city.trim(),
      },
    });
    if (!parsed.success) {
      setHotelFieldErrors(
        zodIssuesToFieldMap(parsed.error.issues, Object.keys(EMPTY_HOTEL_FORM)) as Partial<
          Record<keyof HotelSignupFormValues, string>
        >,
      );
      scheduleFocusRegisterError(contentRef.current);
      return;
    }
    setHotelFieldErrors({});
    setHotelProfileData(parsed.data);
    if (account) {
      setAccount({ ...account, city: parsed.data.location.city });
    }
    setStep('legal');
  };

  const handleRegisterSubmitError = (err: unknown): void => {
    if (getErrorMessage(err) === LEGAL_ACCEPTANCE_REQUIRED_MSG) return;
    if (isRegisterEmailDuplicateError(err)) {
      setStep('account');
      setError(null);
      setFieldErrors({ email: REGISTER_ERROR_MESSAGES.emailDuplicate });
      scheduleFocusRegisterError(contentRef.current);
      return;
    }
    const msg = mapRegisterApiError(err);
    setError(msg);
    scheduleFocusRegisterError(contentRef.current);
  };

  const handleReferrerContinue = () => {
    const parsed = referrerProfileSignupSchema.safeParse({
      displayName: referrerDisplayName.trim(),
    });
    if (!parsed.success) {
      const nameIssue = parsed.error.issues.find((i) => i.path[0] === 'displayName');
      setReferrerDisplayNameError(nameIssue?.message ?? 'Nombre público requerido');
      scheduleFocusRegisterError(contentRef.current);
      return;
    }
    setReferrerDisplayNameError(null);
    setReferrerProfileData(parsed.data);
    setStep('legal');
  };

  const assertSignupLegalReady = (): boolean => {
    const validation = validateSignupLegalState(signupLegal, selectedLegalVersionIds, {
      loading: signupLegalLoading,
      fetchError: signupLegalFetchError,
    });
    if (validation.ok) {
      setLegalError(null);
      return true;
    }
    if (validation.reason !== 'loading') {
      setLegalError(validation.error);
      scheduleFocusRegisterError(contentRef.current);
    }
    return false;
  };

  const completeSessionAfterRegister = async (
    registerPayload: AuthRegisterRequest,
    targetProfile: RegistrationProfileType,
  ): Promise<boolean> => {
    setSubmitPhase('signin');
    const signInResult = await signIn('credentials', {
      email: registerPayload.email,
      password: registerPayload.password,
      redirect: false,
    });
    setSubmitPhase('idle');

    if (signInResult?.error) {
      setError(REGISTER_ERROR_MESSAGES.signInAfterRegister);
      scheduleFocusRegisterError(contentRef.current);
      router.push('/login?registered=1');
      return false;
    }

    if (signupRequiredCount > 0) {
      try {
        const pending = await repos.legalDocuments.getMyLegalRequirements({
          context: 'SIGNUP',
          profileType: targetProfile,
        });
        if (!pending.allAccepted && pending.pending.length > 0) {
          setStep('legal-retry');
          setLegalError(LEGAL_SIGNUP_USER_MESSAGES.acceptFailedPostRegister);
          return false;
        }
      } catch {
        setStep('legal-retry');
        setLegalError(LEGAL_SIGNUP_USER_MESSAGES.acceptFailedPostRegister);
        return false;
      }
    }

    return true;
  };

  const registerWithLegal = async (registerPayload: AuthRegisterRequest) => {
    if (!assertSignupLegalReady()) {
      throw new Error(LEGAL_ACCEPTANCE_REQUIRED_MSG);
    }
    setSubmitPhase('register');
    try {
      await repos.auth.register(registerPayload);
    } finally {
      setSubmitPhase((prev) => (prev === 'register' ? 'idle' : prev));
    }
    return completeSessionAfterRegister(registerPayload, registerPayload.profileType ?? 'USER');
  };

  const retryLegalAcceptance = async () => {
    if (!assertSignupLegalReady()) return;
    setSubmitPhase('retry');
    setLegalError(null);
    try {
      await repos.legalDocuments.acceptMyLegalDocuments({
        documentVersionIds: selectedLegalVersionIds,
        context: 'SIGNUP',
      });
      router.push(redirectForProfile(profileType));
      router.refresh();
    } catch (err) {
      setLegalError(
        mapRegisterApiError(err) || LEGAL_SIGNUP_USER_MESSAGES.acceptFailedPostRegister,
      );
      scheduleFocusRegisterError(contentRef.current);
    } finally {
      setSubmitPhase('idle');
    }
  };

  const finishUserRegistration = async () => {
    if (!account) return;
    setError(null);
    setLegalError(null);
    try {
      const payload = buildRegisterPayload(
        account,
        'USER',
        undefined,
        selectedLegalVersionIds,
        signupRequiredCount,
      );
      const ok = await registerWithLegal(payload);
      if (!ok) return;
      router.push('/me');
      router.refresh();
    } catch (err) {
      handleRegisterSubmitError(err);
    } finally {
      setSubmitPhase('idle');
    }
  };

  const finishGastroRegistration = async () => {
    if (!account || !gastroProfileData) return;
    setError(null);
    setLegalError(null);
    try {
      const payload = buildRegisterPayload(
        account,
        'GASTRO',
        gastroProfileData,
        selectedLegalVersionIds,
        signupRequiredCount,
      );
      const ok = await registerWithLegal(payload);
      if (!ok) return;
      router.push('/gastro');
      router.refresh();
    } catch (err) {
      handleRegisterSubmitError(err);
    } finally {
      setSubmitPhase('idle');
    }
  };

  const finishHotelRegistration = async () => {
    if (!account || !hotelProfileData) return;
    setError(null);
    setLegalError(null);
    try {
      const payload = buildRegisterPayload(
        account,
        'HOTEL',
        hotelProfileData,
        selectedLegalVersionIds,
        signupRequiredCount,
      );
      const ok = await registerWithLegal(payload);
      if (!ok) return;
      router.push('/hotel');
      router.refresh();
    } catch (err) {
      handleRegisterSubmitError(err);
    } finally {
      setSubmitPhase('idle');
    }
  };

  const finishProducerRegistration = async () => {
    if (!account || !producerProfileData) return;
    setError(null);
    setLegalError(null);
    try {
      const payload = buildRegisterPayload(
        account,
        'PRODUCER',
        producerProfileData,
        selectedLegalVersionIds,
        signupRequiredCount,
      );
      const ok = await registerWithLegal(payload);
      if (!ok) return;
      router.push('/producer');
      router.refresh();
    } catch (err) {
      handleRegisterSubmitError(err);
    } finally {
      setSubmitPhase('idle');
    }
  };

  const finishReferrerRegistration = async () => {
    if (!account || !referrerProfileData) return;
    setError(null);
    setLegalError(null);
    try {
      const payload = buildRegisterPayload(
        account,
        'REFERRER',
        referrerProfileData,
        selectedLegalVersionIds,
        signupRequiredCount,
      );
      const ok = await registerWithLegal(payload);
      if (!ok) return;
      router.push('/referrer');
      router.refresh();
    } catch (err) {
      handleRegisterSubmitError(err);
    } finally {
      setSubmitPhase('idle');
    }
  };

  const legalBlockProps = {
    items: signupLegalItems,
    selectedVersionIds: selectedLegalVersionIds,
    onChange: setSelectedLegalVersionIds,
    disabled: submitting || legalSubmitBlocked,
    loading: signupLegalLoading,
    error:
      legalError ??
      legalConfigError ??
      (signupLegalFetchError ? LEGAL_SIGNUP_USER_MESSAGES.loadError : null),
    configBlocked: Boolean(signupLegal && !signupLegal.canProceed),
    missingRequiredDocuments: signupLegal?.missingRequiredDocuments ?? [],
    fetchError: signupLegalFetchError,
    onRetryFetch: () => void refetchSignupLegal(),
  };

  const submitLabel =
    submitPhase === 'signin'
      ? REGISTER_WIZARD_COPY.submitting.signIn
      : submitPhase === 'register'
        ? REGISTER_WIZARD_COPY.submitting.register
        : submitPhase === 'retry'
          ? REGISTER_WIZARD_COPY.submitting.retry
          : REGISTER_WIZARD_COPY.cta.createAccount;

  return (
    <RegisterWizardShell
      step={step}
      profileType={profileType}
      heading={stepMeta.heading}
      subtitle={stepMeta.subtitle}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className="min-w-0 outline-none focus:outline-none"
        aria-labelledby="register-step-heading"
      >
        {step === 'account' && (
          <form onSubmit={handleAccountSubmit} className="min-w-0 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nombre"
                name="firstName"
                required
                autoComplete="given-name"
                error={fieldErrors.firstName}
                defaultValue={account?.firstName}
              />
              <Input
                label="Apellido"
                name="lastName"
                required
                autoComplete="family-name"
                error={fieldErrors.lastName}
                defaultValue={account?.lastName}
              />
            </div>
            <div>
              <Input
                label="Email"
                name="email"
                type="email"
                required
                autoComplete="email"
                error={fieldErrors.email}
                defaultValue={account?.email}
              />
              {fieldErrors.email === REGISTER_ERROR_MESSAGES.emailDuplicate ? (
                <p className="mt-1.5 text-sm text-text-muted">
                  <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
                    Iniciar sesión
                  </Link>
                </p>
              ) : null}
            </div>
            <Input
              label="Contraseña"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              error={fieldErrors.password}
            />
            <Input
              label="Confirmar contraseña"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              error={fieldErrors.confirmPassword}
            />
            {error ? <RegisterWizardErrorAlert message={error} /> : null}
            <Button type="submit" className="w-full min-h-11" disabled={submitting}>
              {REGISTER_WIZARD_COPY.cta.continue}
            </Button>
          </form>
        )}

        {step === 'profile' && (
          <RegisterProfileStep
            profileType={profileType}
            disabled={submitting}
            onBack={() => setStep('account')}
            onSelect={(type) => {
              setProfileType(type);
              if (type === 'USER') {
                setStep('buyer');
              } else if (type === 'PRODUCER') {
                setStep('producer');
              } else if (type === 'GASTRO') {
                setGastroForm((prev) => ({
                  ...prev,
                  contactEmail: prev.contactEmail || account?.email || '',
                }));
                setStep('gastro');
              } else if (type === 'HOTEL') {
                setStep('hotel');
              } else if (type === 'REFERRER') {
                setStep('referrer');
              }
            }}
            errorAlert={error ? <RegisterWizardErrorAlert message={error} /> : null}
          />
        )}

        {step === 'buyer' && account && profileType === 'USER' && (
          <RegisterBuyerStep
            city={regCity}
            onCityChange={(value) => {
              setRegCity(value);
              if (buyerCityError) setBuyerCityError(null);
            }}
            cityError={buyerCityError ?? undefined}
            email={account.email}
            firstName={account.firstName}
            lastName={account.lastName}
            onBack={() => setStep('profile')}
            onContinue={handleBuyerContinue}
            disabled={submitting}
          />
        )}

        {step === 'producer' && account && profileType === 'PRODUCER' && (
          <RegisterProducerStep
            displayName={producerDisplayName}
            onDisplayNameChange={(value) => {
              setProducerDisplayName(value);
              if (producerDisplayNameError) setProducerDisplayNameError(null);
            }}
            displayNameError={producerDisplayNameError ?? undefined}
            onBack={() => setStep('profile')}
            onContinue={handleProducerContinue}
            disabled={submitting}
          />
        )}

        {step === 'gastro' && account && profileType === 'GASTRO' && (
          <RegisterGastroStep
            values={gastroForm}
            onChange={(patch) => {
              setGastroForm((prev) => ({ ...prev, ...patch }));
              if (Object.keys(patch).length > 0) setGastroFieldErrors({});
            }}
            fieldErrors={gastroFieldErrors}
            onBack={() => setStep('profile')}
            onContinue={handleGastroContinue}
            disabled={submitting}
          />
        )}

        {step === 'hotel' && account && profileType === 'HOTEL' && (
          <RegisterHotelStep
            values={hotelForm}
            onChange={(patch) => {
              setHotelForm((prev) => ({ ...prev, ...patch }));
              if (Object.keys(patch).length > 0) setHotelFieldErrors({});
            }}
            fieldErrors={hotelFieldErrors}
            onBack={() => setStep('profile')}
            onContinue={handleHotelContinue}
            disabled={submitting}
          />
        )}

        {step === 'referrer' && account && profileType === 'REFERRER' && (
          <RegisterReferrerStep
            displayName={referrerDisplayName}
            onDisplayNameChange={(value) => {
              setReferrerDisplayName(value);
              if (referrerDisplayNameError) setReferrerDisplayNameError(null);
            }}
            displayNameError={referrerDisplayNameError ?? undefined}
            onBack={() => setStep('profile')}
            onContinue={handleReferrerContinue}
            disabled={submitting}
          />
        )}

        {step === 'legal' &&
          account &&
          (profileType === 'USER' ||
            profileType === 'PRODUCER' ||
            profileType === 'GASTRO' ||
            profileType === 'HOTEL' ||
            profileType === 'REFERRER') && (
            <div className="min-w-0 space-y-4">
              {profileType === 'PRODUCER' ? (
                <p className="text-xs text-text-muted">
                  {REGISTER_WIZARD_COPY.producer.afterRegister}
                </p>
              ) : null}
              {profileType === 'GASTRO' ? (
                <p className="text-xs text-text-muted">
                  {REGISTER_WIZARD_COPY.gastro.afterRegister}
                </p>
              ) : null}
              {profileType === 'HOTEL' ? (
                <p className="text-xs text-text-muted">
                  {REGISTER_WIZARD_COPY.hotel.afterRegister}
                </p>
              ) : null}
              {profileType === 'REFERRER' ? (
                <p className="text-xs text-text-muted">
                  {REGISTER_WIZARD_COPY.referrer.afterRegister}
                </p>
              ) : null}
              <LegalFlowAcceptanceBlock {...legalBlockProps} />
              {error ? <RegisterWizardErrorAlert message={error} /> : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 sm:w-auto"
                  onClick={() => setStep(profileSignupDataStep(profileType))}
                  disabled={submitting}
                >
                  ← {REGISTER_WIZARD_COPY.cta.back}
                </Button>
                <Button
                  type="button"
                  className="min-h-11 flex-1"
                  disabled={submitting || legalSubmitBlocked}
                  onClick={() => {
                    if (profileType === 'USER') void finishUserRegistration();
                    else if (profileType === 'PRODUCER') void finishProducerRegistration();
                    else if (profileType === 'GASTRO') void finishGastroRegistration();
                    else if (profileType === 'HOTEL') void finishHotelRegistration();
                    else if (profileType === 'REFERRER') void finishReferrerRegistration();
                  }}
                >
                  {submitLabel}
                </Button>
              </div>
            </div>
          )}

        {step === 'legal-retry' && account && (
          <div className="space-y-4">
            <RegisterWizardErrorAlert
              message={LEGAL_SIGNUP_USER_MESSAGES.acceptFailedPostRegister}
              className="border-amber-500/40 bg-amber-500/10 text-amber-200"
            />
            <LegalFlowAcceptanceBlock {...legalBlockProps} />
            {legalError ? <RegisterWizardErrorAlert message={legalError} /> : null}
            <p className="text-xs text-text-muted">Cuenta: {account.email}</p>
            <Button
              type="button"
              className="w-full min-h-11"
              disabled={submitting || legalSubmitBlocked}
              onClick={() => void retryLegalAcceptance()}
            >
              {submitting ? submitLabel : REGISTER_WIZARD_COPY.cta.retryLegal}
            </Button>
          </div>
        )}

      </div>
    </RegisterWizardShell>
  );
}
