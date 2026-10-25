import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn, UserX, ArrowRight, Mail, KeyRound } from 'lucide-react';
import {
  isValidEmail,
  sendRegistrationCompleteEmail,
  sendVerificationEmail,
} from '../../services/emailService';
import { checkEmailRegistered } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { BaseLayout } from '../../components/layout';
import {
  Button,
  Input,
  PageHeader,
  StatusBadge,
  OptionCard,
} from '../../components/ui';

export function PatientStartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginAsPatientWithOtp, loginAsGuest } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);

  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const name = fullName.trim();
    const validPhone = /^\d{10}$/.test(phoneNumber);
    const validEmail = isValidEmail(email);

    setNameError(name ? '' : t('patient_entry.name_error'));
    setPhoneError(validPhone ? '' : t('patient_entry.phone_error'));
    setEmailError(validEmail ? '' : t('patient_entry.email_error'));
    if (!name || !validPhone || !validEmail) return;

    setSubmitting(true);
    try {
      const existing = await checkEmailRegistered(email);
      setIsExistingUser(Boolean(existing));
      await sendVerificationEmail(email, existing?.name || name);
      setOtpCode('');
      setOtpError('');
      setOtpSent(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('patient_entry.send_error');
      setEmailError(
        message.toLowerCase().includes('failed to fetch')
          ? t('patient_entry.send_unreachable')
          : message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError(t('patient_entry.otp_error'));
      return;
    }
    setOtpError('');
    setSubmitting(true);
    try {
      const profile = await loginAsPatientWithOtp(
        phoneNumber,
        otpCode,
        email,
        fullName.trim()
      );
      if (!isExistingUser) {
        void sendRegistrationCompleteEmail({
          email,
          patientName: profile.name,
          patientId: profile.id,
        });
      }
      navigate('/patient/visit');
    } catch (error) {
      setOtpError(
        error instanceof Error ? error.message : t('patient_entry.verify_error')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuestEntry = () => {
    loginAsGuest();
    navigate('/patient/visit');
  };

  return (
    <BaseLayout showHome={true} headerTitle={t('app.name')}>
      <div className="page-container">
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
          <PageHeader
            title={t('patient_entry.page_title')}
            subtitle={t('patient_entry.page_subtitle')}
            showBack={true}
            onBack={() => navigate('/')}
          />

          <OptionCard
            as="div"
            highlighted
            icon={<LogIn size={24} aria-hidden="true" />}
            iconBgClass="bg-[var(--color-primary-50)] text-[var(--color-primary-500)]"
            title={t('patient_entry.login_tab')}
            description={t('patient_entry.login_description')}
            badge={
              <StatusBadge
                variant="info"
                label={t('patient_entry.login_badge')}
              />
            }
          >
            {!otpSent ? (
              <form
                onSubmit={handleSendOtp}
                className="flex flex-col gap-4 mt-2"
              >
                <Input
                  id="patient-name"
                  label={t('patient_entry.name_label')}
                  placeholder={t('patient_entry.name_placeholder')}
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    setNameError('');
                  }}
                  error={nameError}
                  disabled={submitting}
                  required
                />

                <Input
                  id="patient-phone"
                  label={t('patient_entry.phone_label')}
                  placeholder={t('patient_entry.phone_placeholder')}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(event) => {
                    setPhoneNumber(event.target.value.replace(/\D/g, ''));
                    setPhoneError('');
                  }}
                  error={phoneError}
                  disabled={submitting}
                  required
                />

                <Input
                  id="patient-email"
                  label={t('patient_entry.email_label')}
                  placeholder={t('patient_entry.email_placeholder')}
                  hint={t('patient_entry.email_hint')}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value.trim());
                    setEmailError('');
                  }}
                  error={emailError}
                  disabled={submitting}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={submitting}
                  icon={<Mail size={18} />}
                >
                  {t('patient_entry.send_otp')}
                </Button>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {t('patient_entry.login_benefit')}
                </p>
              </form>
            ) : (
              <form
                onSubmit={handleVerifyOtp}
                className="flex flex-col gap-4 mt-2"
              >
                <div className="p-3 bg-[var(--color-surface-2)] rounded-lg text-sm flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <p className="w-full min-w-0 break-words sm:flex-1">
                    {t('patient_entry.code_sent', { email })}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={submitting}
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                      setOtpError('');
                    }}
                  >
                    {t('patient_entry.change_details')}
                  </Button>
                </div>

                <p
                  role="status"
                  className="text-sm text-[var(--color-text-muted)] leading-relaxed"
                >
                  {t(
                    isExistingUser
                      ? 'patient_entry.user_exists_otp_notice'
                      : 'patient_entry.otp_hint'
                  )}
                </p>

                <Input
                  id="patient-otp"
                  label={t('patient_entry.otp_label')}
                  placeholder={t('patient_entry.otp_placeholder')}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  value={otpCode}
                  onChange={(event) => {
                    setOtpCode(event.target.value.replace(/\D/g, ''));
                    setOtpError('');
                  }}
                  error={otpError}
                  disabled={submitting}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={submitting}
                  icon={<KeyRound size={18} />}
                >
                  {t('patient_entry.verify_btn')}
                </Button>
              </form>
            )}
          </OptionCard>

          <div className="relative my-2 text-center min-w-0">
            <hr className="divider" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-bg)] px-3 text-xs font-bold tracking-wider">
              {t('patient_entry.or_divider')}
            </span>
          </div>

          <OptionCard
            onClick={handleGuestEntry}
            ariaLabel={`${t('patient_entry.guest_title')}: ${t('patient_entry.guest_desc')}`}
            icon={<UserX size={24} aria-hidden="true" />}
            iconBgClass="bg-[var(--color-surface-2)] text-[var(--color-text)]"
            title={t('patient_entry.guest_title')}
            description={t('patient_entry.guest_desc')}
            badge={
              <StatusBadge variant="neutral" label={t('slip.guest_badge')} />
            }
            footer={
              <div className="flex items-center justify-end gap-1 text-[var(--color-primary-500)] font-bold text-sm">
                <span>{t('patient_entry.guest_btn')}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </div>
            }
          />
        </div>
      </div>
    </BaseLayout>
  );
}
