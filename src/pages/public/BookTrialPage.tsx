import { useState, useEffect, useCallback, FormEvent, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, Button, Input, Textarea, Alert, Modal } from '../../components/common';
import { leadService, memberService, slotService, trialBookingService, settingsService } from '../../services';
import { isApiMode, trialsApi } from '../../services/api';
import { renderMarkdownContent } from '../../utils/renderMarkdown';
import { validateEmail, validatePhone } from '../../utils/validationUtils';
import { getToday, formatDate, isHoliday, getHolidayName } from '../../utils/dateUtils';
import { format, addDays, subDays, addWeeks, isWeekend, isBefore, isAfter, startOfToday, parseISO } from 'date-fns';
import type { MedicalCondition, ConsentRecord, Holiday, Lead, TrialBooking, SlotAvailability, SessionSlot } from '../../types';

// Route state interface for pre-filled data
interface LocationState {
  leadId?: string;
  preferredSlotId?: string;
}

export function BookTrialPage() {
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  const [slots, setSlots] = useState<SessionSlot[]>(() =>
    slotService.getActive().filter(s => s.sessionType !== 'online')
  );

  // In API mode, fetch slots from server to avoid stale localStorage defaults
  useEffect(() => {
    if (isApiMode()) {
      slotService.async.getActive().then((freshSlots) => {
        setSlots(freshSlots.filter(s => s.sessionType !== 'online'));
      }).catch(() => {});
    }
  }, []);
  const settings = settingsService.getOrDefault();
  const holidays: Holiday[] = settings.holidays || [];

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [prefilledLead, setPrefilledLead] = useState<Lead | null>(null);

  // Initialize from location state (e.g., coming from lead completion page)
  useEffect(() => {
    if (locationState?.leadId) {
      const lead = leadService.getById(locationState.leadId);
      if (lead) {
        setLeadId(lead.id);
        setPrefilledLead(lead);
        if (locationState.preferredSlotId || lead.preferredSlotId) {
          setSelectedSlotId(locationState.preferredSlotId || lead.preferredSlotId || '');
        }
      }
    }
  }, [locationState]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: '',
    gender: '' as '' | 'male' | 'female' | 'other',
    notes: '',
  });

  const [medicalConditions, setMedicalConditions] = useState<MedicalCondition[]>([]);
  const [newCondition, setNewCondition] = useState('');

  const [consents, setConsents] = useState({
    termsAndConditions: false,
    healthDisclaimer: false,
  });

  // Slot + date selection
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Modal states for T&C and health disclaimer
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  // Slot availability
  const [slotAvailability, setSlotAvailability] = useState<SlotAvailability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);

  // Booking window: 7 days from today
  const bookingWindowEnd = useMemo(() => addDays(startOfToday(), 7), []);

  // Get next valid working day (skip weekends + holidays), moving forward
  const getNextValidDay = useCallback((fromDate: string, direction: 'forward' | 'backward') => {
    let current = parseISO(fromDate);
    const today = startOfToday();

    const tomorrow = addDays(today, 1);

    for (let i = 0; i < 30; i++) { // safety limit
      current = direction === 'forward' ? addDays(current, 1) : subDays(current, 1);
      const dateStr = format(current, 'yyyy-MM-dd');

      // Don't go before tomorrow (no same-day booking)
      if (isBefore(current, tomorrow)) continue;
      // Don't go beyond booking window
      if (isAfter(current, bookingWindowEnd)) return null;
      // Skip weekends
      if (isWeekend(current)) continue;
      // Skip holidays
      if (isHoliday(dateStr, holidays)) continue;

      return dateStr;
    }
    return null;
  }, [holidays, bookingWindowEnd]);

  // Get initial valid date (always next working day, never today)
  const getInitialDate = useCallback(() => {
    const todayStr = format(startOfToday(), 'yyyy-MM-dd');
    return getNextValidDay(todayStr, 'forward') || format(addDays(startOfToday(), 1), 'yyyy-MM-dd');
  }, [getNextValidDay]);

  // Fetch availability for a given date
  const fetchAvailability = useCallback(async (date: string) => {
    setAvailabilityLoading(true);
    try {
      const availability = await slotService.async.getAllSlotsAvailability(date);
      setSlotAvailability(availability);
    } catch (err) {
      console.error('Failed to load slot availability:', err);
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);

  // Initialize date and fetch availability on mount
  useEffect(() => {
    const initialDate = getInitialDate();
    setSelectedDate(initialDate);
    fetchAvailability(initialDate);
  }, []);

  // Navigate to previous valid day
  const goToPreviousDay = () => {
    if (!selectedDate) return;
    const prevDay = getNextValidDay(selectedDate, 'backward');
    if (prevDay) {
      setSelectedDate(prevDay);
      setSelectedSlotId(''); // Reset slot when date changes
      fetchAvailability(prevDay);
    }
  };

  // Navigate to next valid day
  const goToNextDay = () => {
    if (!selectedDate) return;
    const nextDay = getNextValidDay(selectedDate, 'forward');
    if (nextDay) {
      setSelectedDate(nextDay);
      setSelectedSlotId(''); // Reset slot when date changes
      fetchAvailability(nextDay);
    }
  };

  // Check if we can go backward (not before today)
  const canGoPrevious = useMemo(() => {
    if (!selectedDate) return false;
    return getNextValidDay(selectedDate, 'backward') !== null;
  }, [selectedDate, getNextValidDay]);

  // Check if we can go forward (within 2-week window)
  const canGoNext = useMemo(() => {
    if (!selectedDate) return false;
    return getNextValidDay(selectedDate, 'forward') !== null;
  }, [selectedDate, getNextValidDay]);

  // Check if a slot's time has already passed for today
  const isSlotTimePassed = useCallback((slotId: string) => {
    const todayStr = format(startOfToday(), 'yyyy-MM-dd');
    if (selectedDate !== todayStr) return false;

    const slot = slots.find(s => s.id === slotId);
    if (!slot) return false;

    const now = new Date();
    const [hours, minutes] = slot.startTime.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    return now > slotTime;
  }, [selectedDate, slots]);

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

    // Validate slot + date selection
    if (!selectedSlotId || !selectedDate) {
      setSubmitError('Please select a batch and date at the top');
      return;
    }

    const newErrors: Record<string, string> = {};

    // Skip form validation if we already have a lead (pre-filled from navigation)
    if (!prefilledLead) {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else {
        const emailResult = validateEmail(formData.email);
        if (!emailResult.isValid) newErrors.email = emailResult.error || 'Invalid email format';
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone is required';
      } else {
        const phoneResult = validatePhone(formData.phone);
        if (!phoneResult.isValid) newErrors.phone = phoneResult.error || 'Invalid phone number';
      }
      if (!formData.age.trim()) {
        newErrors.age = 'Age is required';
      } else {
        const ageNum = parseInt(formData.age, 10);
        if (isNaN(ageNum) || ageNum < 5 || ageNum > 100) {
          newErrors.age = 'Please enter a valid age (5-100)';
        }
      }
      if (!formData.gender) {
        newErrors.gender = 'Gender is required';
      }
      if (!consents.termsAndConditions) {
        newErrors.termsAndConditions = 'You must accept the terms and conditions';
      }
      if (!consents.healthDisclaimer) {
        newErrors.healthDisclaimer = 'You must acknowledge the health disclaimer';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTimeout(() => {
        const errorEl = document.querySelector('.text-red-600');
        if (errorEl) {
          errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    setLoading(true);

    try {
      let currentLeadId = leadId;

      // Create or find lead if not pre-filled
      if (!prefilledLead) {
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

        const phone = formData.phone.replace(/\D/g, '');
        const email = formData.email.trim().toLowerCase();

        const [existingMemberByPhone, existingMemberByEmail, existingLeadByPhone, existingLeadByEmail] = await Promise.all([
          memberService.async.getByPhone(phone),
          memberService.async.getByEmail(email),
          leadService.async.getByPhone(phone),
          leadService.async.getByEmail(email),
        ]);

        if (existingMemberByPhone || existingMemberByEmail) {
          throw new Error('You are already registered as a member. Please contact the studio for any queries.');
        }
        const existingLead = existingLeadByPhone || existingLeadByEmail;

        let lead;
        if (existingLead) {
          const existingTrials: TrialBooking[] = isApiMode()
            ? (await trialsApi.getByLead(existingLead.id)) as TrialBooking[]
            : trialBookingService.getByLead(existingLead.id);
          const pendingTrial = existingTrials.find(t => ['pending', 'confirmed'].includes(t.status));
          if (pendingTrial) {
            throw new Error('A trial session is already booked. Multiple trials are not allowed. Please contact the studio for any queries.');
          }
          lead = existingLead;
        } else {
          lead = await leadService.async.create({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email,
            phone,
            age: parseInt(formData.age, 10),
            gender: formData.gender as 'male' | 'female' | 'other',
            status: 'new',
            source: 'online',
            notes: formData.notes.trim() || undefined,
            medicalConditions,
            consentRecords,
          } as Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>);
        }

        if (!lead) {
          throw new Error('Failed to create or update lead');
        }
        currentLeadId = lead.id;
      }

      // Book the trial
      if (!currentLeadId) {
        throw new Error('Lead not found');
      }

      if (isApiMode()) {
        await trialsApi.book({ leadId: currentLeadId, slotId: selectedSlotId, date: selectedDate });
        await leadService.async.update(currentLeadId, {
          status: 'trial-scheduled',
          trialSlotId: selectedSlotId,
          trialDate: selectedDate,
        });
      } else {
        trialBookingService.bookTrial(currentLeadId, selectedSlotId, selectedDate);
        leadService.update(currentLeadId, {
          status: 'trial-scheduled',
          trialSlotId: selectedSlotId,
          trialDate: selectedDate,
        });
      }
      setStep('success');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to book trial');
    } finally {
      setLoading(false);
    }
  };

  // Render markdown-like content (safe — no dangerouslySetInnerHTML)
  const renderContent = renderMarkdownContent;

  // Scroll to top on success
  useEffect(() => {
    if (step === 'success') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  if (step === 'success') {
    const selectedSlot = slots.find(s => s.id === selectedSlotId);
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
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
              {selectedSlot?.sessionType !== 'online' && (
                <p className="text-sm text-indigo-600">
                  {selectedSlot?.startTime} - {selectedSlot?.endTime}
                </p>
              )}
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
          <h1 className="text-3xl font-bold text-gray-900">Book Your Free Trial Session</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Batch Availability & Selection */}
          <Card title="Select Batch & Date">
            {/* Date Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={goToPreviousDay}
                disabled={!canGoPrevious}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {selectedDate ? formatDate(selectedDate) : '...'}
                </p>
                <p className="text-xs text-gray-500">
                  {!selectedDate ? '' : selectedDate === format(startOfToday(), 'yyyy-MM-dd') ? 'Today' : format(parseISO(selectedDate), 'EEEE')}
                </p>
              </div>
              <button
                type="button"
                onClick={goToNextDay}
                disabled={!canGoNext}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Slot Tiles */}
            <div className="relative mb-4">
              {availabilityLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-lg">
                  <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              )}
              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 transition-opacity ${availabilityLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                {slots.map(slot => {
                  const avail = slotAvailability.find(a => a.slotId === slot.id);
                  const spotsLeft = avail ? avail.availableRegular : 0;
                  const hasData = slotAvailability.length > 0;
                  const isFull = hasData && spotsLeft === 0;
                  const isLimited = hasData && spotsLeft > 0 && spotsLeft <= 2;
                  const isSelected = selectedSlotId === slot.id;
                  const timePassed = isSlotTimePassed(slot.id);
                  const isDisabled = isFull || timePassed;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isDisabled || availabilityLoading}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`rounded-lg p-3 text-center border-2 transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                          : isDisabled
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : isLimited
                          ? 'border-yellow-200 bg-yellow-50 hover:border-yellow-400 cursor-pointer'
                          : 'border-green-200 bg-green-50 hover:border-green-400 cursor-pointer'
                      }`}
                    >
                      <div className={`text-xs font-medium mb-1 ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {slot.displayName}
                      </div>
                      <div className={`text-sm font-semibold ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                        {slot.sessionType === 'online' ? 'Flexible' : slot.startTime}
                      </div>
                      <div className={`text-xs font-medium mt-1 ${
                        isSelected
                          ? 'text-indigo-600'
                          : timePassed
                          ? 'text-gray-400'
                          : isFull
                          ? 'text-red-600'
                          : isLimited
                          ? 'text-yellow-700'
                          : 'text-green-700'
                      }`}>
                        {!hasData ? '...' : timePassed ? 'Time passed' : isFull ? 'Full' : `${spotsLeft} spots left`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-50 border-2 border-green-200"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-50 border-2 border-yellow-200"></div>
                <span>Limited</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-50 border-2 border-gray-200 opacity-50"></div>
                <span>Full / Unavailable</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-indigo-50 border-2 border-indigo-600"></div>
                <span>Selected</span>
              </div>
            </div>

            {/* Selected summary */}
            {selectedSlotId && selectedDate && (
              <div className="mt-3 p-3 bg-indigo-50 rounded-lg text-center">
                <p className="text-sm font-medium text-indigo-900">
                  {slots.find(s => s.id === selectedSlotId)?.displayName} &middot; {formatDate(selectedDate)}
                </p>
                {(() => { const s = slots.find(s => s.id === selectedSlotId); return s?.sessionType !== 'online' ? (
                  <p className="text-xs text-indigo-600">{s?.startTime} - {s?.endTime}</p>
                ) : null; })()}
              </div>
            )}

            {/* Note about weekends/holidays */}
            <p className="text-xs text-gray-400 mt-2 text-center">
              Sessions run Monday to Friday. Booking available from next working day onwards.
            </p>
          </Card>

          {/* Personal Information - hide if pre-filled lead */}
          {!prefilledLead && (
            <>
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
                  <Input
                    label="Age"
                    type="number"
                    min={5}
                    max={100}
                    value={formData.age}
                    onChange={(e) => handleChange('age', e.target.value)}
                    error={errors.age}
                    placeholder="Your age"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.gender ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.gender && (
                      <p className="text-sm text-red-600 mt-1">{errors.gender}</p>
                    )}
                  </div>
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

              {/* Consents */}
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
            </>
          )}

          {/* Submit */}
          {submitError && (
            <Alert variant="error" dismissible onDismiss={() => setSubmitError('')}>
              {submitError}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={!selectedSlotId || !selectedDate}
          >
            Book Trial Session
          </Button>

          {!prefilledLead && (
            <p className="text-center text-sm text-gray-500">
              Just want to register your interest?{' '}
              <Link to="/register" className="text-indigo-600 hover:text-indigo-700">
                Register without booking
              </Link>
            </p>
          )}
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
