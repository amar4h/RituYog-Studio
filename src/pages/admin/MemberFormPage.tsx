import { useState, FormEvent, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Button, Input, Select, Textarea, Alert, Checkbox } from '../../components/common';
import { memberService } from '../../services';
import { validateMemberForm } from '../../utils/validationUtils';
import { getToday } from '../../utils/dateUtils';
import type { Member, MedicalCondition, ConsentRecord } from '../../types';

export function MemberFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const existingMember = id ? memberService.getById(id) : null;

  const [formData, setFormData] = useState({
    firstName: existingMember?.firstName || '',
    lastName: existingMember?.lastName || '',
    email: existingMember?.email || '',
    phone: existingMember?.phone || '',
    age: existingMember?.age?.toString() || '',
    gender: existingMember?.gender || '',
    address: existingMember?.address || '',
    emergencyContactName: existingMember?.emergencyContact?.name || '',
    emergencyContactPhone: existingMember?.emergencyContact?.phone || '',
    emergencyContactRelationship: existingMember?.emergencyContact?.relationship || '',
    status: existingMember?.status || 'active',
    source: existingMember?.source || 'walk-in',
  });

  const [medicalConditions, setMedicalConditions] = useState<MedicalCondition[]>(
    existingMember?.medicalConditions || []
  );

  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>(
    existingMember?.consentRecords || []
  );

  const [newCondition, setNewCondition] = useState({ condition: '', details: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  const errorAlertRef = useRef<HTMLDivElement>(null);

  // Scroll to error alert when validation errors appear
  useEffect(() => {
    if (showValidationSummary && errorAlertRef.current) {
      errorAlertRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showValidationSummary]);

  // Count of validation errors
  const errorCount = Object.values(errors).filter(e => e).length;

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // Hide validation summary when user starts fixing errors
    if (showValidationSummary && Object.values(errors).filter(e => e).length <= 1) {
      setShowValidationSummary(false);
    }
  };

  const addMedicalCondition = () => {
    if (newCondition.condition.trim()) {
      setMedicalConditions(prev => [
        ...prev,
        { ...newCondition, reportedDate: getToday() },
      ]);
      setNewCondition({ condition: '', details: '' });
    }
  };

  const removeMedicalCondition = (index: number) => {
    setMedicalConditions(prev => prev.filter((_, i) => i !== index));
  };

  const handleConsentChange = (type: ConsentRecord['type'], given: boolean) => {
    setConsentRecords(prev => {
      const existing = prev.find(c => c.type === type);
      if (existing) {
        return prev.map(c =>
          c.type === type ? { ...c, consentGiven: given, consentDate: getToday() } : c
        );
      }
      return [...prev, { type, consentGiven: given, consentDate: getToday() }];
    });
  };

  const getConsentValue = (type: string): boolean => {
    return consentRecords.find(c => c.type === type)?.consentGiven || false;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setShowValidationSummary(false);

    const validation = validateMemberForm({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
    });

    if (!validation.isValid) {
      setErrors(validation.errors as Record<string, string>);
      setShowValidationSummary(true);
      return;
    }

    setLoading(true);

    try {
      const memberData: Omit<Member, 'id' | 'createdAt' | 'updatedAt'> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.replace(/\D/g, ''),
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        gender: formData.gender as Member['gender'] || undefined,
        address: formData.address.trim() || undefined,
        status: formData.status as Member['status'],
        source: formData.source as Member['source'],
        assignedSlotId: existingMember?.assignedSlotId, // Preserve existing slot (managed via subscription)
        medicalConditions,
        consentRecords,
        classesAttended: existingMember?.classesAttended || 0,
        emergencyContact: formData.emergencyContactName
          ? {
              name: formData.emergencyContactName.trim(),
              phone: formData.emergencyContactPhone.replace(/\D/g, ''),
              relationship: formData.emergencyContactRelationship.trim() || undefined,
            }
          : undefined,
      };

      if (isEditing && existingMember) {
        memberService.update(existingMember.id, memberData);
        navigate(`/admin/members/${existingMember.id}`);
      } else {
        const newMember = memberService.create(memberData);
        navigate(`/admin/members/${newMember.id}`);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/admin/members" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Members
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {isEditing ? 'Edit Member' : 'Add New Member'}
        </h1>
      </div>

      {/* Validation Error Summary */}
      {showValidationSummary && errorCount > 0 && (
        <div ref={errorAlertRef}>
          <Alert variant="error">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-red-800">
                  Please fix {errorCount} {errorCount === 1 ? 'error' : 'errors'} before submitting
                </p>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                  {errors.firstName && <li>First Name: {errors.firstName}</li>}
                  {errors.lastName && <li>Last Name: {errors.lastName}</li>}
                  {errors.email && <li>Email: {errors.email}</li>}
                  {errors.phone && <li>Phone: {errors.phone}</li>}
                </ul>
              </div>
            </div>
          </Alert>
        </div>
      )}

      {/* Server/Submit Error */}
      {submitError && (
        <Alert variant="error" dismissible onDismiss={() => setSubmitError('')}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{submitError}</span>
          </div>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card title="Basic Information" className={errorCount > 0 ? 'ring-2 ring-red-200' : ''}>
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
            <Input
              label="Age"
              type="number"
              value={formData.age}
              onChange={(e) => handleChange('age', e.target.value)}
              placeholder="e.g., 35"
              min="5"
              max="100"
            />
            <Select
              label="Gender"
              value={formData.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              options={[
                { value: '', label: 'Select Gender' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </Card>

        {/* Source */}
        <Card title="Member Source">
          <Select
            label="How did this member join?"
            value={formData.source}
            onChange={(e) => handleChange('source', e.target.value)}
            options={[
              { value: 'walk-in', label: 'Walk-in' },
              { value: 'referral', label: 'Referral' },
              { value: 'online', label: 'Online' },
              { value: 'lead-conversion', label: 'Lead Conversion' },
              { value: 'free-yoga-campaign', label: 'Free Yoga Campaign' },
            ]}
          />
          <p className="text-sm text-gray-500 mt-2">
            Session slot is assigned when creating a subscription.
          </p>
        </Card>

        {/* Emergency Contact */}
        <Card title="Emergency Contact">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Contact Name"
              value={formData.emergencyContactName}
              onChange={(e) => handleChange('emergencyContactName', e.target.value)}
            />
            <Input
              label="Contact Phone"
              value={formData.emergencyContactPhone}
              onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
            />
            <Input
              label="Relationship"
              value={formData.emergencyContactRelationship}
              onChange={(e) => handleChange('emergencyContactRelationship', e.target.value)}
              placeholder="e.g., Spouse, Parent"
            />
          </div>
        </Card>

        {/* Medical Conditions */}
        <Card title="Medical Conditions">
          <div className="space-y-4">
            {medicalConditions.map((condition, index) => (
              <div key={index} className="flex items-start gap-4 p-3 bg-red-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-red-900">{condition.condition}</p>
                  {condition.details && (
                    <p className="text-sm text-red-700">{condition.details}</p>
                  )}
                </div>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <Input
                label="Condition"
                value={newCondition.condition}
                onChange={(e) => setNewCondition(prev => ({ ...prev, condition: e.target.value }))}
                placeholder="e.g., Back pain, Diabetes"
              />
              <Input
                label="Details (optional)"
                value={newCondition.details}
                onChange={(e) => setNewCondition(prev => ({ ...prev, details: e.target.value }))}
                placeholder="Additional details"
              />
              <Button type="button" variant="outline" onClick={addMedicalCondition}>
                Add Condition
              </Button>
            </div>
          </div>
        </Card>

        {/* Consent Records */}
        <Card title="Consent & Acknowledgements">
          <div className="space-y-4">
            <Checkbox
              label="Terms & Conditions"
              description="Member has read and agreed to the studio's terms and conditions"
              checked={getConsentValue('terms-conditions')}
              onChange={(e) => handleConsentChange('terms-conditions', e.target.checked)}
            />
            <Checkbox
              label="Health Disclaimer"
              description="Member acknowledges the health risks and has disclosed all relevant medical conditions"
              checked={getConsentValue('health-disclaimer')}
              onChange={(e) => handleConsentChange('health-disclaimer', e.target.checked)}
            />
            <Checkbox
              label="Photo/Video Consent"
              description="Member consents to photos/videos being taken during sessions for promotional purposes"
              checked={getConsentValue('photo-consent')}
              onChange={(e) => handleConsentChange('photo-consent', e.target.checked)}
            />
          </div>
        </Card>

        {/* Status */}
        <Card title="Status">
          <Select
            label="Member Status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link to="/admin/members">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" loading={loading}>
            {isEditing ? 'Update Member' : 'Create Member'}
          </Button>
        </div>
      </form>
    </div>
  );
}
