import { useState, FormEvent } from 'react';
import { Card, Button, Textarea } from '../../../components/common';
import { settingsService } from '../../../services';
import type { SettingsTabProps } from './types';

export function LegalTab({ setError, setSuccess, success, loading, setLoading }: SettingsTabProps) {
  const settings = settingsService.getOrDefault();

  const [termsData, setTermsData] = useState({
    termsAndConditions: settings.termsAndConditions || '',
    healthDisclaimer: settings.healthDisclaimer || '',
  });

  const handleSaveTerms = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading('terms');

    try {
      await settingsService.updatePartialAsync({
        termsAndConditions: termsData.termsAndConditions.trim(),
        healthDisclaimer: termsData.healthDisclaimer.trim(),
      });
      setSuccess('Terms and disclaimers saved to database');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings to database');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card title="Terms & Disclaimers">
      <form onSubmit={handleSaveTerms} className="space-y-4">
        <Textarea
          label="Terms and Conditions"
          value={termsData.termsAndConditions}
          onChange={(e) => setTermsData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
          rows={8}
          helperText="These terms will be shown to members during registration (supports Markdown)"
        />
        <Textarea
          label="Health Disclaimer"
          value={termsData.healthDisclaimer}
          onChange={(e) => setTermsData(prev => ({ ...prev, healthDisclaimer: e.target.value }))}
          rows={6}
          helperText="Health-related disclaimer for yoga practice (supports Markdown)"
        />
        <div className="flex gap-3 items-center">
          <Button type="submit" loading={loading === 'terms'}>
            Save Terms
          </Button>
          {success === 'Terms and disclaimers saved to database' && (
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
