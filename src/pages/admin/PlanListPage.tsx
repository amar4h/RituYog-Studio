import { useState } from 'react';
import { Card, Button, Input, Modal, Alert, StatusBadge } from '../../components/common';
import { membershipPlanService } from '../../services';
import { formatCurrency } from '../../utils/formatUtils';
import type { MembershipPlan } from '../../types';

export function PlanListPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    type: 'monthly' as MembershipPlan['type'],
    price: 0,
    durationMonths: 1,
    description: '',
    isActive: true,
  });

  const plans = membershipPlanService.getAll();

  const handleOpenModal = (plan?: MembershipPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        type: plan.type,
        price: plan.price,
        durationMonths: plan.durationMonths,
        description: plan.description || '',
        isActive: plan.isActive,
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        type: 'monthly',
        price: 0,
        durationMonths: 1,
        description: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      setError('Plan name is required');
      return;
    }

    if (formData.price <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    try {
      if (editingPlan) {
        membershipPlanService.update(editingPlan.id, {
          name: formData.name.trim(),
          type: formData.type,
          price: formData.price,
          durationMonths: formData.durationMonths,
          description: formData.description.trim() || undefined,
          isActive: formData.isActive,
        });
        setSuccess('Plan updated successfully');
      } else {
        membershipPlanService.create({
          name: formData.name.trim(),
          type: formData.type,
          price: formData.price,
          durationMonths: formData.durationMonths,
          description: formData.description.trim() || undefined,
          isActive: formData.isActive,
          allowedSessionTypes: ['offline'],
        });
        setSuccess('Plan created successfully');
      }
      setShowModal(false);
      setEditingPlan(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    }
  };

  const handleToggleActive = (plan: MembershipPlan) => {
    try {
      membershipPlanService.update(plan.id, { isActive: !plan.isActive });
      setSuccess(`Plan ${plan.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Membership Plans</h1>
          <p className="text-gray-600">Manage available membership options</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Plan
        </Button>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onDismiss={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => (
          <Card key={plan.id}>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{plan.type}</p>
                </div>
                <StatusBadge status={plan.isActive ? 'active' : 'inactive'} />
              </div>

              <div className="text-center py-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-indigo-600">
                  {formatCurrency(plan.price)}
                </p>
                <p className="text-sm text-gray-500">
                  for {plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'}
                </p>
              </div>

              {plan.description && (
                <p className="text-sm text-gray-600">{plan.description}</p>
              )}

              <div className="text-sm text-gray-600">
                <p>Per month: {formatCurrency(Math.round(plan.price / plan.durationMonths))}</p>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => handleOpenModal(plan)}
                >
                  Edit
                </Button>
                <Button
                  variant={plan.isActive ? 'ghost' : 'outline'}
                  size="sm"
                  fullWidth
                  onClick={() => handleToggleActive(plan)}
                >
                  {plan.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {plans.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500">No membership plans yet</p>
            <Button className="mt-4" onClick={() => handleOpenModal()}>
              Create First Plan
            </Button>
          </div>
        </Card>
      )}

      {/* Plan Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingPlan ? 'Edit Plan' : 'Add New Plan'}
      >
        <div className="space-y-4">
          <Input
            label="Plan Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Monthly Standard"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  type: e.target.value as MembershipPlan['type'],
                  durationMonths: e.target.value === 'monthly' ? 1 : e.target.value === 'quarterly' ? 3 : e.target.value === 'semi-annual' ? 6 : 12,
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="monthly">Monthly (1 month)</option>
                <option value="quarterly">Quarterly (3 months)</option>
                <option value="semi-annual">Semi-Annual (6 months)</option>
                <option value="yearly">Yearly (12 months)</option>
              </select>
            </div>

            <Input
              label="Duration (months)"
              type="number"
              min={1}
              value={formData.durationMonths}
              onChange={(e) => setFormData(prev => ({ ...prev, durationMonths: parseInt(e.target.value) || 1 }))}
            />
          </div>

          <Input
            label="Price (₹)"
            type="number"
            min={0}
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
            required
          />

          <Input
            label="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the plan"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Active (available for new subscriptions)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
