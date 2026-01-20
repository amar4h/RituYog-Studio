import { useState, FormEvent, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Textarea, Alert, Modal } from '../../components/common';
import { leadService, slotService, trialBookingService, settingsService } from '../../services';
import { validateEmail, validatePhone } from '../../utils/validationUtils';
import { getToday, formatDate, isHoliday, getHolidayName } from '../../utils/dateUtils';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWeekend, isBefore, startOfToday } from 'date-fns';
import type { MedicalCondition, ConsentRecord, Holiday } from '../../types';

export function BookTrialPage() {
  const slots = slotService.getActive();
  const settings = settingsService.getOrDefault();
  const holidays: Holiday[] = settings.holidays || [];

  const [step, setStep] = useState<'form' | 'slots' | 'success'>('form');
  const [leadId, setLeadId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  });

  const [medicalConditions, setMedicalConditions] = useState<MedicalCondition[]>([]);
  const [newCondition, setNewCondition] = useState('');

  const [consents, setConsents] = useState({
    termsAndConditions: false,
    healthDisclaimer: false,
  });

  // Slot selection first, then date
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Modal states for T&C and health disclaimer
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  // Get the day of week the month starts on (0 = Sunday)
  const firstDayOfMonth = useMemo(() => {
    return startOfMonth(currentMonth).getDay();
  }, [currentMonth]);

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

  const handleFormSubmit = async (e: FormEvent) => {
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
      // Build consent records
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

      // Check if lead already exists
      const existingLeads = leadService.getAll();
      const existingLead = existingLeads.find(
        l => l.email.toLowerCase() === formData.email.trim().toLowerCase() ||
             l.phone.replace(/\D/g, '') === formData.phone.replace(/\D/g, '')
      );

      let lead;
      if (existingLead) {
        // Update existing lead with new information
        lead = leadService.update(existingLead.id, {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.replace(/\D/g, ''),
          notes: formData.notes.trim() || undefined,
          medicalConditions: medicalConditions.length > 0 ? medicalConditions : existingLead.medicalConditions,
          consentRecords,
        });
      } else {
        lead = leadService.create({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.replace(/\D/g, ''),
          status: 'new',
          source: 'online',
          notes: formData.notes.trim() || undefined,
          medicalConditions,
          consentRecords,
        });
      }

      if (!lead) {
        throw new Error('Failed to create or update lead');
      }

      setLeadId(lead.id);
      setStep('slots');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleBookTrial = async () => {
    if (!leadId || !selectedSlotId || !selectedDate) {
      setSubmitError('Please select a time slot and date');
      return;
    }

    setLoading(true);

    try {
      trialBookingService.bookTrial(leadId, selectedSlotId, selectedDate);
      leadService.update(leadId, {
        status: 'trial-scheduled',
        trialSlotId: selectedSlotId,
        trialDate: selectedDate,
      });
      setStep('success');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to book trial');
    } finally {
      setLoading(false);
    }
  };

  const getSlotAvailability = (slotId: string, date: string) => {
    return slotService.getSlotAvailability(slotId, date);
  };

  // Get availability status for a date (for the selected slot)
  const getDateAvailability = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const today = startOfToday();

    // Check if date is in the past
    if (isBefore(date, today)) {
      return { status: 'past', available: 0, tooltip: 'Past date' };
    }

    // Check if weekend
    if (isWeekend(date)) {
      return { status: 'weekend', available: 0, tooltip: 'Weekend - Studio closed' };
    }

    // Check if holiday
    if (isHoliday(dateString, holidays)) {
      const holidayName = getHolidayName(dateString, holidays);
      return { status: 'holiday', available: 0, tooltip: `Holiday - ${holidayName}` };
    }

    // If no slot selected, show as available (generic)
    if (!selectedSlotId) {
      return { status: 'available', available: -1, tooltip: 'Select a time slot first' };
    }

    // Get slot availability - only use regular capacity for public booking
    // Exception slots are reserved for admin use only
    const availability = getSlotAvailability(selectedSlotId, dateString);
    const availableSpots = availability.availableRegular;

    if (availableSpots === 0) {
      return { status: 'full', available: 0, tooltip: 'Fully booked' };
    } else if (availableSpots <= 2) {
      return { status: 'limited', available: availableSpots, tooltip: `${availableSpots} spots left` };
    } else {
      return { status: 'available', available: availableSpots, tooltip: `${availableSpots} spots available` };
    }
  };

  // Navigate months
  const goToPreviousMonth = () => {
    const prevMonth = addMonths(currentMonth, -1);
    // Don't allow going before current month
    if (!isBefore(prevMonth, startOfMonth(new Date()))) {
      setCurrentMonth(prevMonth);
    }
  };

  const goToNextMonth = () => {
    const nextMonth = addMonths(currentMonth, 1);
    // Allow up to 2 months ahead
    const maxMonth = addMonths(new Date(), 2);
    if (!isBefore(endOfMonth(maxMonth), startOfMonth(nextMonth))) {
      setCurrentMonth(nextMonth);
    }
  };

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

  if (step === 'success') {
    const selectedSlot = slots.find(s => s.id === selectedSlotId);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
        <Card className="max-w-md w-full text-center">
          <div className="py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Trial Booked!</h2>
            <p className="text-gray-600 mb-6">
              Your trial session has been scheduled.
            </p>

            <div className="bg-indigo-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-indigo-600">Your Trial Session</p>
              <p className="text-lg font-semibold text-indigo-900">
                {formatDate(selectedDate)}
              </p>
              <p className="text-indigo-700">
                {selectedSlot?.displayName}
              </p>
              <p className="text-sm text-indigo-600">
                {selectedSlot?.startTime} - {selectedSlot?.endTime}
              </p>
            </div>

            <div className="text-sm text-gray-600 mb-6">
              <p className="font-medium mb-2">What to bring:</p>
              <ul className="text-left list-disc list-inside space-y-1">
                <li>Comfortable clothing</li>
                <li>Water bottle</li>
                <li>Small towel</li>
                <li>Arrive 10 minutes early</li>
              </ul>
            </div>

            <Link to="/">
              <Button fullWidth>Back to Home</Button>
            </Link>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{settings.studioName}</h1>
          <p className="text-gray-600 mt-2">Book Your Free Trial Session</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          <div className={`flex items-center ${step === 'form' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'form' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}>
              1
            </div>
            <span className="ml-2 font-medium">Your Details</span>
          </div>
          <div className="w-12 h-px bg-gray-300 mx-4" />
          <div className={`flex items-center ${step === 'slots' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'slots' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}>
              2
            </div>
            <span className="ml-2 font-medium">Book Slot</span>
          </div>
        </div>

        {submitError && (
          <Alert variant="error" dismissible onDismiss={() => setSubmitError('')} className="mb-6">
            {submitError}
          </Alert>
        )}

        {step === 'form' && (
          <form onSubmit={handleFormSubmit} className="space-y-6">
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
            <Button type="submit" fullWidth loading={loading}>
              Continue to Select Slot
            </Button>

            <p className="text-center text-sm text-gray-500">
              Just want to register your interest?{' '}
              <Link to="/register" className="text-indigo-600 hover:text-indigo-700">
                Register without booking
              </Link>
            </p>
          </form>
        )}

        {step === 'slots' && (
          <div className="space-y-6">
            {/* Step 1: Select Time Slot */}
            <Card title="Step 1: Select Time Slot">
              <p className="text-sm text-gray-600 mb-4">
                Choose your preferred session time. Sessions run Monday to Friday.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {slots.map(slot => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      setSelectedSlotId(slot.id);
                      setSelectedDate(''); // Reset date when slot changes
                    }}
                    className={`p-4 rounded-lg text-left transition-all ${
                      selectedSlotId === slot.id
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-2'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="font-semibold">{slot.displayName}</p>
                    <p className={`text-sm ${selectedSlotId === slot.id ? 'text-indigo-200' : 'text-gray-500'}`}>
                      {slot.startTime} - {slot.endTime}
                    </p>
                  </button>
                ))}
              </div>
            </Card>

            {/* Step 2: Calendar Date Selection */}
            <Card title="Step 2: Select Date">
              {!selectedSlotId ? (
                <p className="text-center text-gray-500 py-8">
                  Please select a time slot first
                </p>
              ) : (
                <>
                  {/* Calendar Legend */}
                  <div className="flex flex-wrap gap-4 mb-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
                      <span>Limited</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
                      <span>Full</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-gray-200"></div>
                      <span>Weekend/Holiday</span>
                    </div>
                  </div>

                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={goToPreviousMonth}
                      className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                      disabled={isSameMonth(currentMonth, new Date())}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h3 className="text-lg font-semibold">
                      {format(currentMonth, 'MMMM yyyy')}
                    </h3>
                    <button
                      type="button"
                      onClick={goToNextMonth}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Day headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    ))}

                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <div key={`empty-${i}`} className="p-2"></div>
                    ))}

                    {/* Calendar days */}
                    {calendarDays.map(day => {
                      const dateString = format(day, 'yyyy-MM-dd');
                      const availability = getDateAvailability(day);
                      const isSelected = selectedDate === dateString;
                      const isDisabled = availability.status === 'past' ||
                                        availability.status === 'weekend' ||
                                        availability.status === 'holiday' ||
                                        availability.status === 'full';

                      let bgColor = 'bg-white hover:bg-gray-50';
                      let textColor = 'text-gray-900';
                      let borderColor = 'border-gray-200';

                      if (isSelected) {
                        bgColor = 'bg-indigo-600';
                        textColor = 'text-white';
                        borderColor = 'border-indigo-600';
                      } else if (availability.status === 'past') {
                        bgColor = 'bg-gray-100';
                        textColor = 'text-gray-400';
                      } else if (availability.status === 'weekend' || availability.status === 'holiday') {
                        bgColor = 'bg-gray-200';
                        textColor = 'text-gray-500';
                      } else if (availability.status === 'full') {
                        bgColor = 'bg-red-50';
                        textColor = 'text-red-400';
                        borderColor = 'border-red-200';
                      } else if (availability.status === 'limited') {
                        bgColor = 'bg-yellow-50 hover:bg-yellow-100';
                        borderColor = 'border-yellow-300';
                      } else if (availability.status === 'available') {
                        bgColor = 'bg-green-50 hover:bg-green-100';
                        borderColor = 'border-green-300';
                      }

                      return (
                        <button
                          key={dateString}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => setSelectedDate(dateString)}
                          title={availability.tooltip}
                          className={`
                            p-2 rounded-lg border text-center transition-all
                            ${bgColor} ${textColor} ${borderColor}
                            ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                            ${isSelected ? 'ring-2 ring-offset-1 ring-indigo-600' : ''}
                          `}
                        >
                          <span className="text-sm font-medium">{format(day, 'd')}</span>
                          {availability.status === 'holiday' && (
                            <div className="text-xs truncate" title={availability.tooltip}>
                              {getHolidayName(dateString, holidays)?.substring(0, 3)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </Card>

            {/* Summary */}
            {selectedSlotId && selectedDate && (
              <Card title="Your Trial Session">
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-lg font-semibold text-indigo-900">
                    {formatDate(selectedDate)}
                  </p>
                  <p className="text-indigo-700">
                    {slots.find(s => s.id === selectedSlotId)?.displayName}
                  </p>
                  <p className="text-sm text-indigo-600">
                    {slots.find(s => s.id === selectedSlotId)?.startTime} - {slots.find(s => s.id === selectedSlotId)?.endTime}
                  </p>
                </div>
              </Card>
            )}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('form')}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleBookTrial}
                loading={loading}
                disabled={!selectedSlotId || !selectedDate}
                className="flex-1"
              >
                Book Trial Session
              </Button>
            </div>
          </div>
        )}

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
