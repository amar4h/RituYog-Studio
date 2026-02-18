import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Button, Input, Select, Textarea, Alert, Checkbox } from '../../components/common';
import { leadService, slotService } from '../../services';
import { LEAD_SOURCE_OPTIONS, SESSION_TYPE_OPTIONS } from '../../constants';
import type { LeadSource, SessionType } from '../../types';

export function LeadFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const lead = id ? leadService.getById(id) : null;
  const slots = slotService.getActive();

  const [formData, setFormData] = useState({
    firstName: lead?.firstName || '',
    lastName: lead?.lastName || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    whatsappNumber: lead?.whatsappNumber || '',
    age: lead?.age?.toString() || '',
    gender: lead?.gender || '',
    address: lead?.address || '',
    emergencyContact: lead?.emergencyContact || '',
    emergencyPhone: lead?.emergencyPhone || '',
    source: lead?.source || 'walk-in',
    sourceDetails: lead?.sourceDetails || '',
    preferredSlotId: lead?.preferredSlotId || '',
    preferredSessionType: lead?.preferredSessionType || '',
    hasYogaExperience: lead?.hasYogaExperience || false,
    notes: lead?.notes || '',
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!lead) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="error">Lead not found.</Alert>
        <Link to="/admin/leads" className="text-sm text-gray-500 hover:text-gray-700 mt-4 inline-block">
          ← Back to Leads
        </Link>
      </div>
    );
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return;
    }

    setSaving(true);

    try {
      leadService.update(id!, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        whatsappNumber: formData.whatsappNumber.trim() || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: (formData.gender as 'male' | 'female' | 'other') || undefined,
        address: formData.address.trim() || undefined,
        emergencyContact: formData.emergencyContact.trim() || undefined,
        emergencyPhone: formData.emergencyPhone.trim() || undefined,
        source: formData.source as LeadSource,
        sourceDetails: formData.sourceDetails.trim() || undefined,
        preferredSlotId: formData.preferredSlotId || undefined,
        preferredSessionType: (formData.preferredSessionType as SessionType) || undefined,
        hasYogaExperience: formData.hasYogaExperience,
        notes: formData.notes.trim() || undefined,
      });

      navigate(`/admin/leads/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <Link to={`/admin/leads/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Lead
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Lead</h1>
        <p className="text-gray-600">{lead.firstName} {lead.lastName}</p>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal Information */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              required
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              required
            />
            <Input
              label="WhatsApp Number"
              value={formData.whatsappNumber}
              onChange={(e) => handleChange('whatsappNumber', e.target.value)}
              placeholder="If different from phone"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Age"
                type="number"
                min={1}
                max={120}
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
              />
              <Select
                label="Gender"
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                options={[
                  { value: '', label: 'Select' },
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>
          </div>
          <div className="mt-4">
            <Textarea
              label="Address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={2}
            />
          </div>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Contact Name"
              value={formData.emergencyContact}
              onChange={(e) => handleChange('emergencyContact', e.target.value)}
            />
            <Input
              label="Contact Phone"
              value={formData.emergencyPhone}
              onChange={(e) => handleChange('emergencyPhone', e.target.value)}
            />
          </div>
        </Card>

        {/* Lead Info & Preferences */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Lead Info & Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Source"
              value={formData.source}
              onChange={(e) => handleChange('source', e.target.value)}
              options={LEAD_SOURCE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            />
            <Input
              label="Source Details"
              value={formData.sourceDetails}
              onChange={(e) => handleChange('sourceDetails', e.target.value)}
              placeholder="e.g. Referred by John"
            />
            <Select
              label="Preferred Time Slot"
              value={formData.preferredSlotId}
              onChange={(e) => handleChange('preferredSlotId', e.target.value)}
              options={[
                { value: '', label: 'No preference' },
                ...slots.map(s => ({ value: s.id, label: `${s.displayName} (${s.startTime})` })),
              ]}
            />
            <Select
              label="Preferred Session Type"
              value={formData.preferredSessionType}
              onChange={(e) => handleChange('preferredSessionType', e.target.value)}
              options={[
                { value: '', label: 'No preference' },
                ...SESSION_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label })),
              ]}
            />
          </div>
          <div className="mt-4">
            <Checkbox
              label="Has yoga experience"
              checked={formData.hasYogaExperience}
              onChange={(e) => handleChange('hasYogaExperience', e.target.checked)}
            />
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            placeholder="Additional notes about this lead..."
          />
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Link to={`/admin/leads/${id}`} className="flex-1">
            <Button type="button" variant="outline" fullWidth>
              Cancel
            </Button>
          </Link>
          <Button type="submit" fullWidth disabled={saving} className="flex-1">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
