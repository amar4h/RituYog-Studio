import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Button, Input, Select, Alert, PageLoading, Modal } from '../../../components/common';
import { asanaService } from '../../../services';
import { ASANA_TYPE_OPTIONS, DIFFICULTY_LEVEL_OPTIONS, BODY_AREA_OPTIONS, BODY_AREA_LABELS, BREATHING_CUE_OPTIONS } from '../../../constants';
import { useFreshData } from '../../../hooks';
import type { AsanaType, DifficultyLevel, BodyArea, VinyasaItem, Asana, BreathingCue } from '../../../types';

export function AsanaFormPage() {
  const { isLoading } = useFreshData(['asanas']);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    sanskritName: '',
    type: 'asana' as AsanaType,
    difficulty: 'beginner' as DifficultyLevel,
    primaryBodyAreas: [] as BodyArea[],
    secondaryBodyAreas: [] as BodyArea[],
    benefits: [] as string[],
    contraindications: [] as string[],
    breathingCue: '' as BreathingCue | '',
    isActive: true,
    childAsanas: [] as VinyasaItem[],
  });

  const [newBenefit, setNewBenefit] = useState('');
  const [newContraindication, setNewContraindication] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAsanaPicker, setShowAsanaPicker] = useState(false);
  const [asanaSearch, setAsanaSearch] = useState('');

  // Get non-vinyasa asanas for the picker (exclude self when editing)
  const availableAsanas = useMemo(() => {
    if (isLoading) return [];
    return asanaService.getNonVinyasaAsanas().filter(a => a.id !== id);
  }, [isLoading, id]);

  // Filtered asanas for picker search
  const filteredAsanas = useMemo(() => {
    if (!asanaSearch.trim()) return availableAsanas;
    const lower = asanaSearch.toLowerCase();
    return availableAsanas.filter(a =>
      a.name.toLowerCase().includes(lower) ||
      (a.sanskritName && a.sanskritName.toLowerCase().includes(lower))
    );
  }, [availableAsanas, asanaSearch]);

  // Computed body areas and benefits for vinyasa/surya_namaskar preview
  const computedVinyasa = useMemo(() => {
    const isSequenceType = formData.type === 'vinyasa' || formData.type === 'surya_namaskar';
    if (!isSequenceType || formData.childAsanas.length === 0) {
      return { primaryBodyAreas: [] as BodyArea[], secondaryBodyAreas: [] as BodyArea[], benefits: [] as string[] };
    }

    const primarySet = new Set<BodyArea>();
    const secondarySet = new Set<BodyArea>();
    const benefitSet = new Set<string>();

    for (const item of formData.childAsanas) {
      const asana = asanaService.getById(item.asanaId);
      if (asana) {
        asana.primaryBodyAreas.forEach(a => primarySet.add(a));
        asana.secondaryBodyAreas.forEach(a => secondarySet.add(a));
        asana.benefits.forEach(b => benefitSet.add(b));
      }
    }

    // Primary areas override secondary
    secondarySet.forEach(a => {
      if (primarySet.has(a)) secondarySet.delete(a);
    });

    return {
      primaryBodyAreas: Array.from(primarySet),
      secondaryBodyAreas: Array.from(secondarySet),
      benefits: Array.from(benefitSet),
    };
  }, [formData.type, formData.childAsanas]);

  useEffect(() => {
    if (isEditing && id && !isLoading) {
      const asana = asanaService.getById(id);
      if (asana) {
        setFormData({
          name: asana.name,
          sanskritName: asana.sanskritName || '',
          type: asana.type,
          difficulty: asana.difficulty,
          primaryBodyAreas: asana.primaryBodyAreas,
          secondaryBodyAreas: asana.secondaryBodyAreas,
          benefits: asana.benefits,
          contraindications: asana.contraindications || [],
          breathingCue: asana.breathingCue || '',
          isActive: asana.isActive,
          childAsanas: asana.childAsanas || [],
        });
      } else {
        setError('Asana not found');
      }
    }
  }, [id, isEditing, isLoading]);

  if (isLoading) {
    return <PageLoading />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Name is required');
      }

      // Type-specific validation
      const isVinyasa = formData.type === 'vinyasa';
      const isSuryaNamaskar = formData.type === 'surya_namaskar';
      const hasChildAsanas = formData.childAsanas.length > 0;

      if (isVinyasa) {
        // Vinyasa requires at least 2 child asanas
        if (formData.childAsanas.length < 2) {
          throw new Error('A vinyasa must contain at least 2 asanas');
        }
      } else if (isSuryaNamaskar) {
        // Surya Namaskar - child asanas are optional
        // If child asanas provided, need at least 2
        if (hasChildAsanas && formData.childAsanas.length < 2) {
          throw new Error('If adding a sequence, include at least 2 asanas');
        }
        // If no child asanas, require body areas and benefits
        if (!hasChildAsanas) {
          if (formData.primaryBodyAreas.length === 0) {
            throw new Error('At least one primary body area is required');
          }
          if (formData.benefits.length === 0) {
            throw new Error('At least one benefit is required');
          }
        }
      } else {
        // Regular asana types - require body areas and benefits
        if (formData.primaryBodyAreas.length === 0) {
          throw new Error('At least one primary body area is required');
        }
        if (formData.benefits.length === 0) {
          throw new Error('At least one benefit is required');
        }
      }

      // Build asana data
      let asanaData: any = {
        name: formData.name.trim(),
        sanskritName: formData.sanskritName.trim() || undefined,
        type: formData.type,
        difficulty: formData.difficulty,
        isActive: formData.isActive,
      };

      // Determine if we should use computed values from child asanas
      const useComputedValues = isVinyasa || (isSuryaNamaskar && hasChildAsanas);

      if (useComputedValues) {
        // Use computed values from child asanas
        asanaData.primaryBodyAreas = computedVinyasa.primaryBodyAreas;
        asanaData.secondaryBodyAreas = computedVinyasa.secondaryBodyAreas;
        asanaData.benefits = computedVinyasa.benefits;
        asanaData.childAsanas = formData.childAsanas;
        asanaData.contraindications = undefined;
      } else {
        // Use form values (regular asanas or surya_namaskar without sequence)
        asanaData.primaryBodyAreas = formData.primaryBodyAreas;
        asanaData.secondaryBodyAreas = formData.secondaryBodyAreas;
        asanaData.benefits = formData.benefits;
        asanaData.contraindications = formData.contraindications.length > 0 ? formData.contraindications : undefined;
        asanaData.breathingCue = formData.breathingCue || undefined;
        asanaData.childAsanas = isSuryaNamaskar ? [] : undefined;
      }

      if (isEditing && id) {
        asanaService.update(id, asanaData);
      } else {
        asanaService.create(asanaData);
      }

      navigate('/admin/asanas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save asana');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | boolean | BodyArea[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (newType: AsanaType) => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      // Clear vinyasa children when switching away from vinyasa
      childAsanas: newType === 'vinyasa' ? prev.childAsanas : [],
    }));
  };

  const toggleBodyArea = (area: BodyArea, isPrimary: boolean) => {
    const field = isPrimary ? 'primaryBodyAreas' : 'secondaryBodyAreas';
    const otherField = isPrimary ? 'secondaryBodyAreas' : 'primaryBodyAreas';

    setFormData(prev => {
      const current = prev[field];
      const other = prev[otherField];

      if (current.includes(area)) {
        // Remove from current
        return { ...prev, [field]: current.filter(a => a !== area) };
      } else {
        // Add to current and remove from other if present
        return {
          ...prev,
          [field]: [...current, area],
          [otherField]: other.filter(a => a !== area),
        };
      }
    });
  };

  const addBenefit = () => {
    if (newBenefit.trim() && !formData.benefits.includes(newBenefit.trim())) {
      setFormData(prev => ({
        ...prev,
        benefits: [...prev.benefits, newBenefit.trim()],
      }));
      setNewBenefit('');
    }
  };

  const removeBenefit = (benefit: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter(b => b !== benefit),
    }));
  };

  const addContraindication = () => {
    if (newContraindication.trim() && !formData.contraindications.includes(newContraindication.trim())) {
      setFormData(prev => ({
        ...prev,
        contraindications: [...prev.contraindications, newContraindication.trim()],
      }));
      setNewContraindication('');
    }
  };

  const removeContraindication = (contraindication: string) => {
    setFormData(prev => ({
      ...prev,
      contraindications: prev.contraindications.filter(c => c !== contraindication),
    }));
  };

  // Vinyasa sequence management
  const addAsanaToSequence = (asana: Asana) => {
    setFormData(prev => ({
      ...prev,
      childAsanas: [
        ...prev.childAsanas,
        { asanaId: asana.id, order: prev.childAsanas.length + 1 },
      ],
    }));
  };

  const removeFromSequence = (index: number) => {
    setFormData(prev => ({
      ...prev,
      childAsanas: prev.childAsanas
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, order: i + 1 })),
    }));
  };

  const removeAsanaById = (asanaId: string) => {
    setFormData(prev => ({
      ...prev,
      childAsanas: prev.childAsanas
        .filter(item => item.asanaId !== asanaId)
        .map((item, i) => ({ ...item, order: i + 1 })),
    }));
  };

  const toggleAsanaInSequence = (asana: Asana) => {
    const isSelected = formData.childAsanas.some(c => c.asanaId === asana.id);
    if (isSelected) {
      removeAsanaById(asana.id);
    } else {
      addAsanaToSequence(asana);
    }
  };

  const moveInSequence = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= formData.childAsanas.length) return;

    setFormData(prev => {
      const items = [...prev.childAsanas];
      [items[index], items[newIndex]] = [items[newIndex], items[index]];
      return {
        ...prev,
        childAsanas: items.map((item, i) => ({ ...item, order: i + 1 })),
      };
    });
  };

  const getAsanaName = (asanaId: string): string => {
    const asana = asanaService.getById(asanaId);
    return asana?.name || 'Unknown';
  };

  // Helper to get full asana details for vinyasa display
  const getAsanaDetails = (asanaId: string) => {
    const asana = asanaService.getById(asanaId);
    return asana || null;
  };

  // Helper to get breathing cue label with color
  const getBreathingCueLabel = (cue?: string) => {
    if (!cue) return null;
    const option = BREATHING_CUE_OPTIONS.find(o => o.value === cue);
    return option ? { label: option.label, color: option.color } : null;
  };

  // Format vinyasa flow as inline string with arrows
  const formatVinyasaFlowPreview = () => {
    if (formData.childAsanas.length === 0) return '';
    return formData.childAsanas
      .sort((a, b) => a.order - b.order)
      .map(item => {
        const asana = getAsanaDetails(item.asanaId);
        if (!asana) return '?';
        let text = asana.name;
        if (asana.sanskritName && asana.sanskritName !== asana.name) {
          text += ` (${asana.sanskritName})`;
        }
        const cue = getBreathingCueLabel(asana.breathingCue);
        if (cue) {
          text += ` [${cue.label}]`;
        }
        return text;
      })
      .join(' → ');
  };

  const isVinyasa = formData.type === 'vinyasa';
  const isSuryaNamaskar = formData.type === 'surya_namaskar';
  const isSequenceType = isVinyasa || isSuryaNamaskar;
  const hasChildAsanas = formData.childAsanas.length > 0;
  // Show body areas/benefits for non-sequence types, OR for surya_namaskar without a sequence
  const showBodyAreasBenefits = !isVinyasa && (!isSuryaNamaskar || !hasChildAsanas);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Asana' : 'Add Asana'}
          </h1>
          <p className="text-gray-600">
            {isEditing ? 'Update asana details' : 'Add a new asana to your library'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/asanas')}>
          Cancel
        </Button>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="space-y-6">
          {/* Basic Info Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>

            {/* Type Selection - Touch-friendly tiles */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {ASANA_TYPE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleTypeChange(option.value)}
                    className={`
                      p-3 rounded-lg text-sm font-medium transition-all touch-manipulation
                      flex flex-col items-center justify-center min-h-[52px]
                      ${formData.type === option.value
                        ? option.color === 'blue'
                          ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-1'
                          : option.color === 'purple'
                          ? 'bg-purple-600 text-white ring-2 ring-purple-600 ring-offset-1'
                          : option.color === 'cyan'
                          ? 'bg-cyan-600 text-white ring-2 ring-cyan-600 ring-offset-1'
                          : option.color === 'orange'
                          ? 'bg-orange-600 text-white ring-2 ring-orange-600 ring-offset-1'
                          : option.color === 'green'
                          ? 'bg-green-600 text-white ring-2 ring-green-600 ring-offset-1'
                          : option.color === 'amber'
                          ? 'bg-amber-600 text-white ring-2 ring-amber-600 ring-offset-1'
                          : 'bg-pink-600 text-white ring-2 ring-pink-600 ring-offset-1'
                        : option.color === 'blue'
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                        : option.color === 'purple'
                        ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                        : option.color === 'cyan'
                        ? 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200'
                        : option.color === 'orange'
                        ? 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                        : option.color === 'green'
                        ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                        : option.color === 'amber'
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Selection - Touch-friendly tiles */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTY_LEVEL_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleChange('difficulty', option.value)}
                    className={`
                      p-3 rounded-lg text-sm font-medium transition-all touch-manipulation
                      flex flex-col items-center justify-center min-h-[52px]
                      ${formData.difficulty === option.value
                        ? option.color === 'green'
                          ? 'bg-green-600 text-white ring-2 ring-green-600 ring-offset-1'
                          : option.color === 'yellow'
                          ? 'bg-yellow-500 text-white ring-2 ring-yellow-500 ring-offset-1'
                          : 'bg-red-600 text-white ring-2 ring-red-600 ring-offset-1'
                        : option.color === 'green'
                        ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                        : option.color === 'yellow'
                        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                        : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Breathing Cue Tiles - Hidden for vinyasa, show for surya_namaskar without sequence */}
            {showBodyAreasBenefits && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Breathing Cue
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {/* No specific cue option */}
                  <button
                    type="button"
                    onClick={() => handleChange('breathingCue', '')}
                    className={`
                      p-3 rounded-lg text-sm font-medium transition-all touch-manipulation
                      flex flex-col items-center justify-center min-h-[52px]
                      ${formData.breathingCue === ''
                        ? 'bg-gray-700 text-white ring-2 ring-gray-700 ring-offset-1'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }
                    `}
                  >
                    None
                  </button>
                  {/* Breathing cue options */}
                  {BREATHING_CUE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange('breathingCue', option.value)}
                      className={`
                        p-3 rounded-lg text-sm font-medium transition-all touch-manipulation
                        flex flex-col items-center justify-center min-h-[52px]
                        ${formData.breathingCue === option.value
                          ? option.color === 'blue'
                            ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-1'
                            : option.color === 'purple'
                            ? 'bg-purple-600 text-white ring-2 ring-purple-600 ring-offset-1'
                            : 'bg-orange-600 text-white ring-2 ring-orange-600 ring-offset-1'
                          : option.color === 'blue'
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                          : option.color === 'purple'
                          ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                          : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Name and Sanskrit Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={isSequenceType ? "e.g., Surya Namaskar A" : "e.g., Tadasana"}
                required
              />
              <Input
                label="Sanskrit Name"
                value={formData.sanskritName}
                onChange={(e) => handleChange('sanskritName', e.target.value)}
                placeholder={isSequenceType ? "e.g., Sun Salutation A" : "e.g., Mountain Pose"}
              />
            </div>
          </div>

          {/* Vinyasa/Surya Namaskar Sequence Builder */}
          {isSequenceType && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Asana Sequence {isVinyasa && <span className="text-red-500">*</span>}
                {isSuryaNamaskar && <span className="text-gray-400 text-sm font-normal ml-2">(Optional)</span>}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {isVinyasa
                  ? 'Add asanas in the order they should be performed (minimum 2 asanas)'
                  : 'Optionally add asanas to show the sequence. If not provided, enter body areas and benefits below.'}
              </p>

              {/* Inline Flow Preview */}
              {formData.childAsanas.length > 0 && (
                <div className="mb-4 p-3 bg-pink-100 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-pink-600 font-medium">
                      Flow Preview ({formData.childAsanas.length} asanas):
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, childAsanas: [] }))}
                      className="text-xs text-pink-500 hover:text-red-600 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="text-sm text-pink-900 break-words leading-relaxed">
                    {formatVinyasaFlowPreview()}
                  </div>
                </div>
              )}

              {formData.childAsanas.length === 0 && (
                <p className="text-sm text-gray-500 mb-4 p-4 bg-gray-50 rounded-lg text-center">
                  No asanas added yet. Click the button below to add asanas to the sequence.
                </p>
              )}

              {/* Add Asana Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAsanaPicker(true)}
                className="w-full sm:w-auto"
              >
                + Add Asana to Sequence
              </Button>

              {/* Computed Preview */}
              {formData.childAsanas.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Auto-computed from sequence:
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Primary Body Areas: </span>
                      <span className="text-gray-900">
                        {computedVinyasa.primaryBodyAreas.length > 0
                          ? computedVinyasa.primaryBodyAreas.map(a => BODY_AREA_LABELS[a]).join(', ')
                          : 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Secondary Body Areas: </span>
                      <span className="text-gray-900">
                        {computedVinyasa.secondaryBodyAreas.length > 0
                          ? computedVinyasa.secondaryBodyAreas.map(a => BODY_AREA_LABELS[a]).join(', ')
                          : 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Benefits: </span>
                      <span className="text-gray-900">
                        {computedVinyasa.benefits.length > 0
                          ? computedVinyasa.benefits.slice(0, 5).join(', ') +
                            (computedVinyasa.benefits.length > 5 ? ` (+${computedVinyasa.benefits.length - 5} more)` : '')
                          : 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Body Areas - Hidden for vinyasa, shown for surya_namaskar without sequence */}
          {showBodyAreasBenefits && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Body Areas</h3>

              {/* Primary Body Areas */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Body Areas <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-500 mb-2">Select the main body areas targeted by this asana</p>
                <div className="flex flex-wrap gap-2">
                  {BODY_AREA_OPTIONS.map(area => (
                    <button
                      key={`primary-${area.value}`}
                      type="button"
                      onClick={() => toggleBodyArea(area.value, true)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        formData.primaryBodyAreas.includes(area.value)
                          ? 'bg-indigo-600 text-white'
                          : formData.secondaryBodyAreas.includes(area.value)
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      disabled={formData.secondaryBodyAreas.includes(area.value)}
                    >
                      {area.label}
                      {formData.primaryBodyAreas.includes(area.value) && (
                        <span className="ml-1">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary Body Areas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Body Areas
                </label>
                <p className="text-sm text-gray-500 mb-2">Select additional body areas that receive some benefit</p>
                <div className="flex flex-wrap gap-2">
                  {BODY_AREA_OPTIONS.map(area => (
                    <button
                      key={`secondary-${area.value}`}
                      type="button"
                      onClick={() => toggleBodyArea(area.value, false)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        formData.secondaryBodyAreas.includes(area.value)
                          ? 'bg-purple-600 text-white'
                          : formData.primaryBodyAreas.includes(area.value)
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      disabled={formData.primaryBodyAreas.includes(area.value)}
                    >
                      {area.label}
                      {formData.secondaryBodyAreas.includes(area.value) && (
                        <span className="ml-1">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Benefits - Hidden for vinyasa, shown for surya_namaskar without sequence */}
          {showBodyAreasBenefits && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Benefits</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addBenefit();
                      }
                    }}
                    placeholder="Add a benefit (e.g., Improves posture)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <Button type="button" onClick={addBenefit} variant="outline">
                    Add
                  </Button>
                </div>

                {formData.benefits.length === 0 && (
                  <p className="text-sm text-gray-500">No benefits added yet. Add at least one benefit.</p>
                )}

                <ul className="space-y-2">
                  {formData.benefits.map((benefit, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg"
                    >
                      <span className="text-green-800">{benefit}</span>
                      <button
                        type="button"
                        onClick={() => removeBenefit(benefit)}
                        className="text-green-600 hover:text-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Contraindications - Hidden for vinyasa, shown for surya_namaskar without sequence */}
          {showBodyAreasBenefits && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contraindications (Optional)</h3>
              <p className="text-sm text-gray-500 mb-3">Add any conditions where this asana should be avoided</p>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newContraindication}
                    onChange={(e) => setNewContraindication(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addContraindication();
                      }
                    }}
                    placeholder="Add a contraindication (e.g., High blood pressure)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <Button type="button" onClick={addContraindication} variant="outline">
                    Add
                  </Button>
                </div>

                {formData.contraindications.length > 0 && (
                  <ul className="space-y-2">
                    {formData.contraindications.map((contraindication, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between bg-red-50 px-3 py-2 rounded-lg"
                      >
                        <span className="text-red-800">{contraindication}</span>
                        <button
                          type="button"
                          onClick={() => removeContraindication(contraindication)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="border-t pt-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                {isVinyasa ? 'Vinyasa' : isSuryaNamaskar ? 'Surya Namaskar' : 'Asana'} is active (can be used in session plans)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate('/admin/asanas')} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Saving...' : isEditing ? 'Update Asana' : 'Create Asana'}
            </Button>
          </div>
        </Card>
      </form>

      {/* Asana Picker Modal */}
      <Modal
        isOpen={showAsanaPicker}
        onClose={() => {
          setShowAsanaPicker(false);
          setAsanaSearch('');
        }}
        title="Select Asanas for Sequence"
        size="lg"
      >
        <div className="space-y-4">
          {/* Current Sequence Preview */}
          {formData.childAsanas.length > 0 && (
            <div className="p-3 bg-pink-50 rounded-lg">
              <div className="text-xs font-medium text-pink-700 mb-2">
                Current Sequence ({formData.childAsanas.length} asanas):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {formData.childAsanas.map((item, idx) => (
                  <span
                    key={item.asanaId}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full"
                  >
                    <span className="font-semibold">{idx + 1}.</span>
                    {getAsanaName(item.asanaId)}
                    <button
                      type="button"
                      onClick={() => removeAsanaById(item.asanaId)}
                      className="ml-0.5 hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <Input
            placeholder="Search asanas..."
            value={asanaSearch}
            onChange={(e) => setAsanaSearch(e.target.value)}
          />

          {/* Asana List - Toggle selection */}
          <div className="max-h-80 overflow-y-auto space-y-2">
            {filteredAsanas.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {asanaSearch ? 'No asanas found matching your search' : 'No asanas available'}
              </p>
            ) : (
              filteredAsanas.map(asana => {
                const isSelected = formData.childAsanas.some(c => c.asanaId === asana.id);
                const sequenceNumber = formData.childAsanas.findIndex(c => c.asanaId === asana.id) + 1;
                return (
                  <div
                    key={asana.id}
                    onClick={() => toggleAsanaInSequence(asana)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-pink-50 border-pink-300 ring-1 ring-pink-300'
                        : 'bg-white border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Checkbox indicator */}
                      <div className={`w-5 h-5 flex items-center justify-center rounded border-2 flex-shrink-0 ${
                        isSelected
                          ? 'bg-pink-600 border-pink-600 text-white'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <span className="text-xs font-bold">{sequenceNumber}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{asana.name}</div>
                        {asana.sanskritName && (
                          <div className="text-sm text-gray-500">{asana.sanskritName}</div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`px-1.5 py-0.5 text-xs rounded ${
                            asana.type === 'asana' ? 'bg-blue-100 text-blue-700' :
                            asana.type === 'pranayama' ? 'bg-purple-100 text-purple-700' :
                            asana.type === 'kriya' ? 'bg-cyan-100 text-cyan-700' :
                            asana.type === 'exercise' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {asana.type}
                          </span>
                          <span className={`px-1.5 py-0.5 text-xs rounded ${
                            asana.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                            asana.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {asana.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Selection hint */}
                    <span className={`text-xs ${isSelected ? 'text-pink-600 font-medium' : 'text-gray-400'}`}>
                      {isSelected ? 'Click to remove' : 'Click to add'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with count and Done button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-gray-500">
              {formData.childAsanas.length} asanas selected
              {formData.childAsanas.length < 2 && (
                <span className="text-red-500 ml-1">(minimum 2 required)</span>
              )}
            </span>
            <Button
              variant="outline"
              onClick={() => {
                setShowAsanaPicker(false);
                setAsanaSearch('');
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
