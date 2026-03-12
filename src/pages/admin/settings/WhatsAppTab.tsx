import { useState, FormEvent } from 'react';
import { Card, Button, Input, Textarea } from '../../../components/common';
import { settingsService } from '../../../services';
import { DEFAULT_WHATSAPP_TEMPLATES, WHATSAPP_PLACEHOLDERS } from '../../../constants';
import type { WhatsAppTemplates } from '../../../types';
import type { SettingsTabProps } from './types';

// Merge saved general notifications with any new defaults added in code updates
function mergeGeneralNotifications(saved: WhatsAppTemplates['generalNotifications']): WhatsAppTemplates['generalNotifications'] {
  const defaults = DEFAULT_WHATSAPP_TEMPLATES.generalNotifications;
  if (saved.length >= defaults.length) return saved;
  // Append new default templates that don't exist in saved
  return [...saved, ...defaults.slice(saved.length)];
}

export function WhatsAppTab({ setError, setSuccess, success, loading, setLoading }: SettingsTabProps) {
  const settings = settingsService.getOrDefault();

  // WhatsApp templates state - with migration from old structure
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplates>(() => {
    const saved = settings.whatsappTemplates;
    if (!saved) return DEFAULT_WHATSAPP_TEMPLATES;

    // Migrate old structure (single objects) to new structure (arrays)
    // Old: renewalReminder (object), leadFollowUp (object)
    // New: renewalReminders (array), leadFollowUps (array), paymentReminders (array)
    const oldSaved = saved as unknown as Record<string, unknown>;

    return {
      renewalReminders: Array.isArray(saved.renewalReminders)
        ? saved.renewalReminders
        : Array.isArray(oldSaved.renewalReminder)
          ? oldSaved.renewalReminder
          : oldSaved.renewalReminder
            ? [oldSaved.renewalReminder as WhatsAppTemplates['renewalReminders'][number]]
            : DEFAULT_WHATSAPP_TEMPLATES.renewalReminders,
      classReminder: saved.classReminder || DEFAULT_WHATSAPP_TEMPLATES.classReminder,
      paymentConfirmation: saved.paymentConfirmation || DEFAULT_WHATSAPP_TEMPLATES.paymentConfirmation,
      paymentReminders: Array.isArray(saved.paymentReminders)
        ? saved.paymentReminders
        : DEFAULT_WHATSAPP_TEMPLATES.paymentReminders,
      leadFollowUps: Array.isArray(saved.leadFollowUps)
        ? saved.leadFollowUps
        : Array.isArray(oldSaved.leadFollowUp)
          ? oldSaved.leadFollowUp
          : oldSaved.leadFollowUp
            ? [oldSaved.leadFollowUp as WhatsAppTemplates['leadFollowUps'][number]]
            : DEFAULT_WHATSAPP_TEMPLATES.leadFollowUps,
      leadSlotAvailability: saved.leadSlotAvailability || DEFAULT_WHATSAPP_TEMPLATES.leadSlotAvailability,
      leadTrialConfirmation: saved.leadTrialConfirmation || DEFAULT_WHATSAPP_TEMPLATES.leadTrialConfirmation,
      generalNotifications: Array.isArray(saved.generalNotifications)
        ? mergeGeneralNotifications(saved.generalNotifications)
        : DEFAULT_WHATSAPP_TEMPLATES.generalNotifications,
    };
  });

  const handleSaveWhatsAppTemplates = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading('whatsapp-templates');

    try {
      await settingsService.updatePartialAsync({
        whatsappTemplates,
      });
      setSuccess('WhatsApp templates saved to database');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save WhatsApp templates to database');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card title="WhatsApp Message Templates">
      <p className="text-sm text-gray-600 mb-4">
        Customize message templates for WhatsApp notifications. Use placeholders like <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">{'{memberName}'}</code> that will be replaced with actual values when sending.
      </p>

      <form onSubmit={handleSaveWhatsAppTemplates} className="space-y-6">
        {/* Renewal Reminders (Multiple) */}
        <div className="border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Renewal Reminders <span className="text-gray-500 font-normal">({whatsappTemplates.renewalReminders.length} templates)</span>
          </label>
          <div className="space-y-4">
            {whatsappTemplates.renewalReminders.map((template, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                    {index + 1}
                  </span>
                  <Input
                    value={template.name}
                    onChange={(e) => setWhatsappTemplates(prev => {
                      const newTemplates = [...prev.renewalReminders];
                      newTemplates[index] = { ...newTemplates[index], name: e.target.value };
                      return { ...prev, renewalReminders: newTemplates };
                    })}
                    placeholder="Template name"
                    className="flex-1"
                  />
                </div>
                <Textarea
                  value={template.template}
                  onChange={(e) => setWhatsappTemplates(prev => {
                    const newTemplates = [...prev.renewalReminders];
                    newTemplates[index] = { ...newTemplates[index], template: e.target.value };
                    return { ...prev, renewalReminders: newTemplates };
                  })}
                  rows={8}
                  placeholder="Hi {memberName}, your {planName} membership expires on {expiryDate}..."
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Available: {WHATSAPP_PLACEHOLDERS.member.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.subscription.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.studio.map(p => p.key).join(', ')}
          </p>
        </div>

        {/* Class Reminder (Single) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Class Reminder
          </label>
          <Textarea
            value={whatsappTemplates.classReminder.template}
            onChange={(e) => setWhatsappTemplates(prev => ({
              ...prev,
              classReminder: { ...prev.classReminder, template: e.target.value }
            }))}
            rows={5}
            placeholder="Hi {memberName}, reminder: Your yoga class is {classDate} at {classTime}..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Available: {WHATSAPP_PLACEHOLDERS.member.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.class.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.studio.map(p => p.key).join(', ')}
          </p>
        </div>

        {/* Payment Confirmation (Single) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Confirmation
          </label>
          <Textarea
            value={whatsappTemplates.paymentConfirmation.template}
            onChange={(e) => setWhatsappTemplates(prev => ({
              ...prev,
              paymentConfirmation: { ...prev.paymentConfirmation, template: e.target.value }
            }))}
            rows={5}
            placeholder="Hi {memberName}, we received your payment of {amount}..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Available: {WHATSAPP_PLACEHOLDERS.member.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.payment.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.studio.map(p => p.key).join(', ')}
          </p>
        </div>

        {/* Payment Reminders (Multiple) */}
        <div className="border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Payment Reminders <span className="text-gray-500 font-normal">({whatsappTemplates.paymentReminders.length} templates)</span>
          </label>
          <div className="space-y-4">
            {whatsappTemplates.paymentReminders.map((template, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                    {index + 1}
                  </span>
                  <Input
                    value={template.name}
                    onChange={(e) => setWhatsappTemplates(prev => {
                      const newTemplates = [...prev.paymentReminders];
                      newTemplates[index] = { ...newTemplates[index], name: e.target.value };
                      return { ...prev, paymentReminders: newTemplates };
                    })}
                    placeholder="Template name"
                    className="flex-1"
                  />
                </div>
                <Textarea
                  value={template.template}
                  onChange={(e) => setWhatsappTemplates(prev => {
                    const newTemplates = [...prev.paymentReminders];
                    newTemplates[index] = { ...newTemplates[index], template: e.target.value };
                    return { ...prev, paymentReminders: newTemplates };
                  })}
                  rows={8}
                  placeholder="Hi {memberName}, this is a reminder about your pending payment..."
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Available: {WHATSAPP_PLACEHOLDERS.member.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.payment.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.studio.map(p => p.key).join(', ')}
          </p>
        </div>

        {/* Lead Follow-ups (Multiple) */}
        <div className="border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Lead Follow-ups <span className="text-gray-500 font-normal">({whatsappTemplates.leadFollowUps.length} templates)</span>
          </label>
          <div className="space-y-4">
            {whatsappTemplates.leadFollowUps.map((template, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    {index + 1}
                  </span>
                  <Input
                    value={template.name}
                    onChange={(e) => setWhatsappTemplates(prev => {
                      const newTemplates = [...prev.leadFollowUps];
                      newTemplates[index] = { ...newTemplates[index], name: e.target.value };
                      return { ...prev, leadFollowUps: newTemplates };
                    })}
                    placeholder="Template name"
                    className="flex-1"
                  />
                </div>
                <Textarea
                  value={template.template}
                  onChange={(e) => setWhatsappTemplates(prev => {
                    const newTemplates = [...prev.leadFollowUps];
                    newTemplates[index] = { ...newTemplates[index], template: e.target.value };
                    return { ...prev, leadFollowUps: newTemplates };
                  })}
                  rows={6}
                  placeholder="Hi {leadName}, thank you for your interest in {studioName}..."
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Available: {WHATSAPP_PLACEHOLDERS.lead.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.studio.map(p => p.key).join(', ')}
          </p>
        </div>

        {/* Lead Slot Availability (Single) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lead Slot Availability Notification
          </label>
          <Textarea
            value={whatsappTemplates.leadSlotAvailability?.template || ''}
            onChange={(e) => setWhatsappTemplates(prev => ({
              ...prev,
              leadSlotAvailability: {
                name: prev.leadSlotAvailability?.name || 'Slot Availability',
                template: e.target.value,
              }
            }))}
            rows={8}
            placeholder="Hi {leadName}, a slot has become available in our {slotName} session..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Available: {WHATSAPP_PLACEHOLDERS.lead.filter(p => p.key !== '{registrationLink}').map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.studio.map(p => p.key).join(', ')}
          </p>
        </div>

        {/* Lead Trial Confirmation (Single) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trial Booking Confirmation
          </label>
          <Textarea
            value={whatsappTemplates.leadTrialConfirmation?.template || ''}
            onChange={(e) => setWhatsappTemplates(prev => ({
              ...prev,
              leadTrialConfirmation: {
                name: prev.leadTrialConfirmation?.name || 'Trial Booking Confirmation',
                template: e.target.value,
              }
            }))}
            rows={12}
            placeholder="Hi {leadName}, your trial session has been confirmed..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Available: {WHATSAPP_PLACEHOLDERS.lead.filter(p => p.key !== '{registrationLink}').map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.studio.map(p => p.key).join(', ')}
          </p>
        </div>

        {/* General Notifications (Multiple) */}
        <div className="border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            General Notifications <span className="text-gray-500 font-normal">({whatsappTemplates.generalNotifications.length} templates)</span>
          </label>
          <div className="space-y-4">
            {whatsappTemplates.generalNotifications.map((template, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    {index + 1}
                  </span>
                  <Input
                    value={template.name}
                    onChange={(e) => setWhatsappTemplates(prev => {
                      const newTemplates = [...prev.generalNotifications];
                      newTemplates[index] = { ...newTemplates[index], name: e.target.value };
                      return { ...prev, generalNotifications: newTemplates };
                    })}
                    placeholder="Template name"
                    className="flex-1"
                  />
                </div>
                <Textarea
                  value={template.template}
                  onChange={(e) => setWhatsappTemplates(prev => {
                    const newTemplates = [...prev.generalNotifications];
                    newTemplates[index] = { ...newTemplates[index], template: e.target.value };
                    return { ...prev, generalNotifications: newTemplates };
                  })}
                  rows={8}
                  placeholder="Hi {memberName}, ..."
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Available: {WHATSAPP_PLACEHOLDERS.member.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.studio.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.holiday.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.class.filter(p => p.key === '{slotName}').map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.general.map(p => p.key).join(', ')}
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <Button type="submit" loading={loading === 'whatsapp-templates'}>
            Save Templates
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setWhatsappTemplates(DEFAULT_WHATSAPP_TEMPLATES)}
          >
            Reset to Default
          </Button>
          {success === 'WhatsApp templates saved to database' && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
