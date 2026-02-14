import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select, Alert, Modal } from '../../components/common';
import { leadService, settingsService, slotService } from '../../services';
import { validateEmail, validatePhone } from '../../utils/validationUtils';
import { getToday } from '../../utils/dateUtils';
import { GENDER_OPTIONS } from '../../constants';
import type { Lead, MedicalCondition, ConsentRecord } from '../../types';

export function LeadCompletionPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [completedLeadId, setCompletedLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state - personal info (editable)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'' | 'male' | 'female' | 'other'>('');
  const [preferredSlotId, setPreferredSlotId] = useState('');

  // Get available slots
  const slots = slotService.getActive();

  // Form state - health & consent
  const [medicalConditions, setMedicalConditions] = useState<MedicalCondition[]>([]);
  const [newCondition, setNewCondition] = useState('');
  const [consents, setConsents] = useState({
    termsAndConditions: false,
    healthDisclaimer: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Modal states
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  const settings = settingsService.getOrDefault();

  // Fetch lead by token on mount
  useEffect(() => {
    const fetchLead = async () => {
      if (!token) {
        setTokenError('Invalid registration link');
        setLoading(false);
        return;
      }

      try {
        const foundLead = await leadService.async.getByToken(token);
        if (!foundLead) {
          setTokenError('This registration link is invalid or has expired. Please contact the studio for a new link.');
          setLoading(false);
          return;
        }

        setLead(foundLead);
        // Pre-fill all fields from the lead
        setFirstName(foundLead.firstName || '');
        setLastName(foundLead.lastName || '');
        setPhone(foundLead.phone || '');
        if (foundLead.email) {
          setEmail(foundLead.email);
        }
        if (foundLead.age) {
          setAge(foundLead.age.toString());
        }
        if (foundLead.gender) {
          setGender(foundLead.gender);
        }
        if (foundLead.preferredSlotId) {
          setPreferredSlotId(foundLead.preferredSlotId);
        }
        // Pre-fill medical conditions if any
        if (foundLead.medicalConditions?.length > 0) {
          setMedicalConditions(foundLead.medicalConditions);
        }
      } catch (error) {
        console.error('Failed to fetch lead:', error);
        setTokenError('Unable to load registration. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [token]);

  // Render markdown-like content
  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('# ')) {
        return <h2 key={i} className="text-xl font-bold mb-3">{line.substring(2)}</h2>;
      } else if (line.startsWith('## ')) {
        return <h3 key={i} className="text-lg font-semibold mb-2">{line.substring(3)}</h3>;
      } else if (line.match(/^\d+\./)) {
        const htmlContent = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <p key={i} className="ml-4 mb-1" dangerouslySetInnerHTML={{ __html: htmlContent }} />;
      } else if (line.trim() === '') {
        return <br key={i} />;
      } else {
        return <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />;
      }
    });
  };

  const addMedicalCondition = () => {
    if (newCondition.trim()) {
      setMedicalConditions(prev => [
        ...prev,
        { condition: newCondition.trim(), reportedDate: getToday() },
      ]);
      setNewCondition('');
    }
  };

  const removeMedicalCondition = (index: number) => {
    setMedicalConditions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const newErrors: Record<string, string> = {};

    // Validate personal info
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.isValid) {
        newErrors.phone = phoneValidation.error || 'Please enter a valid 10-digit phone number';
      }
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        newErrors.email = emailValidation.error || 'Invalid email format';
      }
    }

    // Validate consents
    if (!consents.termsAndConditions) {
      newErrors.termsAndConditions = 'You must accept the terms and conditions';
    }
    if (!consents.healthDisclaimer) {
      newErrors.healthDisclaimer = 'You must acknowledge the health disclaimer';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!token) return;

    setSubmitting(true);

    try {
      const consentRecords: ConsentRecord[] = [
        {
          type: 'terms-conditions',
          consentGiven: consents.termsAndConditions,
          consentDate: getToday(),
        },
        {
          type: 'health-disclaimer',
          consentGiven: consents.healthDisclaimer,
          consentDate: getToday(),
        },
      ];

      const result = await leadService.async.completeRegistration(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.replace(/\D/g, ''),
        email: email.trim().toLowerCase(),
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        preferredSlotId: preferredSlotId || undefined,
        medicalConditions,
        consentRecords,
      });

      if (!result) {
        throw new Error('Registration failed. The link may have expired.');
      }

      setCompletedLeadId(result.id);
      setSuccess(true);
    } catch (error) {
      console.error('Failed to complete registration:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to complete registration');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your registration...</p>
        </div>
      </div>
    );
  }

  // Token error state
  if (tokenError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
        <Card className="max-w-md w-full text-center">
          <div className="py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Expired or Invalid</h2>
            <p className="text-gray-600 mb-6">{tokenError}</p>
          </div>
        </Card>
      </div>
    );
  }

  // Handle navigation to book trial with lead data
  const handleBookTrial = () => {
    navigate('/book-trial', {
      state: {
        leadId: completedLeadId,
        preferredSlotId: preferredSlotId || undefined,
      },
    });
  };

  // Success state
  if (success) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
        <Card className="max-w-md w-full text-center">
          <div className="py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for completing your registration, {lead?.firstName}! Our team will be in touch with you soon to discuss next steps and schedule your first session.
            </p>
            <div className="space-y-3">
              <Button fullWidth onClick={handleBookTrial}>
                Book a Trial Session
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Complete Your Registration</h1>
          <p className="text-gray-600 mt-2">
            Hi {lead?.firstName}! Please provide a few more details to complete your registration.
          </p>
        </div>

        {submitError && (
          <Alert variant="error" dismissible onDismiss={() => setSubmitError('')} className="mb-6">
            {submitError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Information (editable) */}
          <Card title="Personal Information">
            <p className="text-sm text-gray-600 mb-4">
              Please verify and update your information if needed.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (errors.firstName) setErrors(prev => ({ ...prev, firstName: '' }));
                }}
                error={errors.firstName}
                placeholder="Enter first name"
                required
              />
              <Input
                label="Last Name"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (errors.lastName) setErrors(prev => ({ ...prev, lastName: '' }));
                }}
                error={errors.lastName}
                placeholder="Enter last name"
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                }}
                error={errors.phone}
                placeholder="10-digit mobile number"
                maxLength={10}
                required
              />
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                error={errors.email}
                placeholder="your.email@example.com"
                required
              />
              <Select
                label="Gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as typeof gender)}
                options={GENDER_OPTIONS.map(g => ({ value: g.value, label: g.label }))}
                placeholder="Select gender"
              />
              <Input
                label="Age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Optional"
                min={5}
                max={100}
              />
              <Select
                label="Preferred Session"
                value={preferredSlotId}
                onChange={(e) => setPreferredSlotId(e.target.value)}
                options={[
                  { value: '', label: 'No preference' },
                  ...slots.map(s => ({ value: s.id, label: s.displayName })),
                ]}
                placeholder="Select preferred session"
              />
            </div>
          </Card>

          {/* Medical Conditions */}
          <Card title="Health Information">
            <p className="text-sm text-gray-600 mb-4">
              Please list any medical conditions or health concerns we should be aware of.
              This helps our instructors provide safe and appropriate guidance.
            </p>

            {medicalConditions.length > 0 && (
              <div className="space-y-2 mb-4">
                {medicalConditions.map((condition, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-gray-900">{condition.condition}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedicalCondition(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="e.g., Back pain, High blood pressure"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addMedicalCondition}>
                Add
              </Button>
            </div>
          </Card>

          {/* Consents */}
          <Card title="Acknowledgements">
            <div className="space-y-4">
              <div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="termsCheckbox"
                    checked={consents.termsAndConditions}
                    onChange={(e) => {
                      setConsents(prev => ({ ...prev, termsAndConditions: e.target.checked }));
                      if (errors.termsAndConditions) setErrors(prev => ({ ...prev, termsAndConditions: '' }));
                    }}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="termsCheckbox" className="text-sm text-gray-700">
                    I have read and agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                    >
                      Terms and Conditions
                    </button>
                  </label>
                </div>
                {errors.termsAndConditions && (
                  <p className="text-sm text-red-600 mt-1 ml-7">{errors.termsAndConditions}</p>
                )}
              </div>

              <div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="disclaimerCheckbox"
                    checked={consents.healthDisclaimer}
                    onChange={(e) => {
                      setConsents(prev => ({ ...prev, healthDisclaimer: e.target.checked }));
                      if (errors.healthDisclaimer) setErrors(prev => ({ ...prev, healthDisclaimer: '' }));
                    }}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="disclaimerCheckbox" className="text-sm text-gray-700">
                    I have read and acknowledge the{' '}
                    <button
                      type="button"
                      onClick={() => setShowDisclaimerModal(true)}
                      className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                    >
                      Health Disclaimer
                    </button>
                  </label>
                </div>
                {errors.healthDisclaimer && (
                  <p className="text-sm text-red-600 mt-1 ml-7">{errors.healthDisclaimer}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Submit */}
          <Button type="submit" fullWidth loading={submitting}>
            Complete Registration
          </Button>
        </form>

        {/* Terms and Conditions Modal */}
        <Modal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          title="Terms and Conditions"
          size="lg"
        >
          <div className="prose prose-sm max-w-none text-gray-700">
            {renderContent(settings.termsAndConditions || 'No terms and conditions configured.')}
          </div>
        </Modal>

        {/* Health Disclaimer Modal */}
        <Modal
          isOpen={showDisclaimerModal}
          onClose={() => setShowDisclaimerModal(false)}
          title="Health Disclaimer"
          size="lg"
        >
          <div className="prose prose-sm max-w-none text-gray-700">
            {renderContent(settings.healthDisclaimer || 'No health disclaimer configured.')}
          </div>
        </Modal>
      </div>
    </div>
  );
}
