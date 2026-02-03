import { useState, FormEvent } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { GENDER_OPTIONS } from '../../constants';
import { validatePhone } from '../../utils/validationUtils';
import { leadService, slotService } from '../../services/storage';
import type { Lead } from '../../types';

interface QuickAddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lead: Lead) => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  gender: '' | 'male' | 'female' | 'other';
  age: string;
  preferredSlotId: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  gender?: string;
}

export function QuickAddLeadModal({ isOpen, onClose, onSuccess }: QuickAddLeadModalProps) {
  const slots = slotService.getActive();

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    gender: '',
    age: '',
    preferredSlotId: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.isValid) {
        newErrors.phone = phoneValidation.error || 'Please enter a valid 10-digit phone number';
      }
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Check if phone number already exists
      const existingLead = await leadService.async.getByPhone(formData.phone.replace(/\D/g, ''));
      if (existingLead) {
        setSubmitError('A lead with this phone number already exists');
        setLoading(false);
        return;
      }

      // Create quick lead with completion token
      const lead = await leadService.async.createQuick({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.replace(/\D/g, ''),
        gender: formData.gender as 'male' | 'female' | 'other',
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        preferredSlotId: formData.preferredSlotId || undefined,
      });

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        gender: '',
        age: '',
        preferredSlotId: '',
      });
      setErrors({});

      onSuccess(lead);
    } catch (error) {
      console.error('Failed to create lead:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        gender: '',
        age: '',
        preferredSlotId: '',
      });
      setErrors({});
      setSubmitError('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Quick Add Lead"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <Alert variant="error" dismissible onDismiss={() => setSubmitError('')}>
            {submitError}
          </Alert>
        )}

        <p className="text-sm text-gray-600 mb-4">
          Add a lead quickly with basic details. You can share a registration link via WhatsApp for them to complete their profile.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            error={errors.firstName}
            required
            placeholder="Enter first name"
            autoFocus
          />

          <Input
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            error={errors.lastName}
            required
            placeholder="Enter last name"
          />
        </div>

        <Input
          label="Phone Number"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          error={errors.phone}
          required
          placeholder="10-digit mobile number"
          maxLength={10}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Gender"
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value as FormData['gender'] })}
            options={GENDER_OPTIONS.map(g => ({ value: g.value, label: g.label }))}
            error={errors.gender}
            required
            placeholder="Select gender"
          />

          <Input
            label="Age"
            type="number"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            placeholder="Optional"
            min={5}
            max={100}
          />
        </div>

        <Select
          label="Preferred Session"
          value={formData.preferredSlotId}
          onChange={(e) => setFormData({ ...formData, preferredSlotId: e.target.value })}
          options={[
            { value: '', label: 'No preference' },
            ...slots.map(s => ({ value: s.id, label: s.displayName })),
          ]}
          placeholder="Select preferred session"
        />

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
          >
            Add Lead
          </Button>
        </div>
      </form>
    </Modal>
  );
}
