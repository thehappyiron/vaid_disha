import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn, UserX, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BaseLayout } from '../../components/layout';
import { Button, Input, PageHeader, StatusBadge, OptionCard } from '../../components/ui';

export function PatientStartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginAsDemoPatient, loginAsGuest } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleDemoSignIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = fullName.trim();
    const validPhone = /^\d{10}$/.test(phoneNumber);

    setNameError(name ? '' : t('patient_entry.name_error'));
    setPhoneError(validPhone ? '' : t('patient_entry.phone_error'));
    if (!name || !validPhone) return;

    loginAsDemoPatient(phoneNumber, email, name);
    navigate('/patient/visit');
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
            description={t('patient_entry.demo_description')}
            badge={<StatusBadge variant="info" label={t('patient_entry.demo_badge')} />}
          >
            <form onSubmit={handleDemoSignIn} className="flex flex-col gap-4 mt-2">
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
                onChange={(event) => setEmail(event.target.value.trim())}
              />

              <Button type="submit" variant="primary" fullWidth icon={<ArrowRight size={18} />}>
                {t('patient_entry.demo_sign_in')}
              </Button>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                {t('patient_entry.login_benefit')}
              </p>
            </form>
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
            badge={<StatusBadge variant="neutral" label={t('slip.guest_badge')} />}
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
