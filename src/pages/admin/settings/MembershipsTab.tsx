import { useState } from 'react';
import { Card, Button, Input, Modal, StatusBadge } from '../../../components/common';
import { membershipPlanService } from '../../../services';
import { formatCurrency } from '../../../utils/formatUtils';
import type { MembershipPlan } from '../../../types';
import type { SettingsTabProps } from './types';

export function MembershipsTab({ setError, setSuccess }: SettingsTabProps) {
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    type: 'monthly' as MembershipPlan['type'],
    price: 0,
    durationMonths: 1,
    description: '',
    isActive: true,
  });

  const plans = membershipPlanService.getAll();

  const handleOpenPlanModal = (plan?: MembershipPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanFormData({
        name: plan.name,
        type: plan.type,
        price: plan.price,
        durationMonths: plan.durationMonths,
        description: plan.description || '',
        isActive: plan.isActive,
      });
    } else {
      setEditingPlan(null);
      setPlanFormData({
        name: '',
        type: 'monthly',
        price: 0,
        durationMonths: 1,
        description: '',
        isActive: true,
      });
    }
    setShowPlanModal(true);
  };

  const handleSavePlan = () => {
    if (!planFormData.name.trim()) {
      setError('Plan name is required');
      return;
    }

    if (planFormData.price <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    try {
      if (editingPlan) {
        membershipPlanService.update(editingPlan.id, {
          name: planFormData.name.trim(),
          type: planFormData.type,
          price: planFormData.price,
          durationMonths: planFormData.durationMonths,
          description: planFormData.description.trim() || undefined,
          isActive: planFormData.isActive,
        });
        setSuccess('Plan updated successfully');
      } else {
        membershipPlanService.create({
          name: planFormData.name.trim(),
          type: planFormData.type,
          price: planFormData.price,
          durationMonths: planFormData.durationMonths,
          description: planFormData.description.trim() || undefined,
          isActive: planFormData.isActive,
          allowedSessionTypes: ['offline'],
        });
        setSuccess('Plan created successfully');
      }
      setShowPlanModal(false);
      setEditingPlan(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    }
  };

  const handleTogglePlanActive = (plan: MembershipPlan) => {
    try {
      membershipPlanService.update(plan.id, { isActive: !plan.isActive });
      setSuccess(`Plan ${plan.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    }
  };

  return (
    <>
      <Card
        title="Membership Plans"
        subtitle="Manage available membership options"
        actions={
          <Button size="sm" onClick={() => handleOpenPlanModal()}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Plan
          </Button>
        }
      >
        {plans.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No membership plans yet</p>
            <Button className="mt-4" onClick={() => handleOpenPlanModal()}>
              Create First Plan
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
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
                    onClick={() => handleOpenPlanModal(plan)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant={plan.isActive ? 'ghost' : 'outline'}
                    size="sm"
                    fullWidth
                    onClick={() => handleTogglePlanActive(plan)}
                  >
                    {plan.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Plan Modal */}
      <Modal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title={editingPlan ? 'Edit Plan' : 'Add New Plan'}
      >
        <div className="space-y-4">
          <Input
            label="Plan Name"
            value={planFormData.name}
            onChange={(e) => setPlanFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Monthly Standard"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={planFormData.type}
                onChange={(e) => setPlanFormData(prev => ({
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
              value={planFormData.durationMonths}
              onChange={(e) => setPlanFormData(prev => ({ ...prev, durationMonths: parseInt(e.target.value) || 1 }))}
            />
          </div>

          <Input
            label="Price (₹)"
            type="number"
            min={0}
            value={planFormData.price}
            onChange={(e) => setPlanFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
            required
          />

          <Input
            label="Description (optional)"
            value={planFormData.description}
            onChange={(e) => setPlanFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the plan"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="planIsActive"
              checked={planFormData.isActive}
              onChange={(e) => setPlanFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="planIsActive" className="text-sm text-gray-700">
              Active (available for new subscriptions)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowPlanModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan}>
              {editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
