import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Select, Textarea, Alert, Modal } from '../../components/common';
import { leadService, slotService, settingsService } from '../../services';
import { validateEmail, validatePhone } from '../../utils/validationUtils';
import { getToday } from '../../utils/dateUtils';
import type { MedicalCondition, ConsentRecord } from '../../types';

export function RegisterPage() {
  const slots = slotService.getActive();
  const settings = settingsService.getOrDefault();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    preferredSlotId: '',
    source: 'online',
    notes: '',
  });

  const [medicalConditions, setMedicalConditions] = useState<MedicalCondition[]>([]);
  const [newCondition, setNewCondition] = useState('');

  const [consents, setConsents] = useState({
    termsAndConditions: false,
    healthDisclaimer: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal states for T&C and health disclaimer
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  // Render markdown-like content (basic)
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

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
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

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Invalid phone number (10 digits required)';
    }
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

    setLoading(true);

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

      leadService.create({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.replace(/\D/g, ''),
        status: 'new',
        source: 'online',
        preferredSlotId: formData.preferredSlotId || undefined,
        notes: formData.notes.trim() || undefined,
        medicalConditions,
        consentRecords,
      });

      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit registration');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
        <Card className="max-w-md w-full text-center">
          <div className="py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your interest! Our team will contact you shortly to discuss
              membership options and schedule your trial session.
            </p>
            <div className="space-y-3">
              <Link to="/book-trial">
                <Button fullWidth>Book a Trial Session</Button>
              </Link>
              <Link to="/">
                <Button variant="outline" fullWidth>Back to Home</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{settings.studioName}</h1>
          <p className="text-gray-600 mt-2">Register Your Interest</p>
        </div>

        {submitError && (
          <Alert variant="error" dismissible onDismiss={() => setSubmitError('')} className="mb-6">
            {submitError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Information */}
          <Card title="Personal Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                error={errors.firstName}
                required
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                error={errors.lastName}
                required
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={errors.email}
                required
              />
              <Input
                label="Phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                error={errors.phone}
                placeholder="10-digit mobile number"
                required
              />
            </div>
          </Card>

          {/* Preferred Slot */}
          <Card title="Preferred Session Time">
            <Select
              label="Which time slot works best for you?"
              value={formData.preferredSlotId}
              onChange={(e) => handleChange('preferredSlotId', e.target.value)}
              options={[
                { value: '', label: 'No preference' },
                ...slots.map(slot => ({
                  value: slot.id,
                  label: `${slot.displayName} (${slot.startTime} - ${slot.endTime})`,
                })),
              ]}
            />
            <p className="text-sm text-gray-500 mt-2">
              Sessions are held Monday to Friday. Select your preferred timing.
            </p>
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

          {/* Additional Notes */}
          <Card title="Additional Information">
            <Textarea
              label="Anything else you'd like us to know?"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              placeholder="Previous yoga experience, specific goals, questions, etc."
            />
          </Card>

          {/* Consents with hyperlinks */}
          <Card title="Acknowledgements">
            <div className="space-y-4">
              <div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="termsCheckbox"
                    checked={consents.termsAndConditions}
                    onChange={(e) => setConsents(prev => ({ ...prev, termsAndConditions: e.target.checked }))}
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
                    onChange={(e) => setConsents(prev => ({ ...prev, healthDisclaimer: e.target.checked }))}
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
          <div className="flex flex-col gap-4">
            <Button type="submit" fullWidth loading={loading}>
              Submit Registration
            </Button>
            <p className="text-center text-sm text-gray-500">
              Already registered?{' '}
              <Link to="/book-trial" className="text-indigo-600 hover:text-indigo-700">
                Book a trial session
              </Link>
            </p>
          </div>
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
