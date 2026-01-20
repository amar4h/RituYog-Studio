import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons, Alert } from '../../components/common';
import { leadService, slotService } from '../../services';
import { formatPhone } from '../../utils/formatUtils';
import { formatDate } from '../../utils/dateUtils';
import type { Lead } from '../../types';
import type { Column } from '../../components/common';

export function LeadListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const allLeads = leadService.getAll();
  const slots = slotService.getActive();

  // Filter leads
  const leads = allLeads.filter(lead => {
    const matchesSearch = !search ||
      `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search);

    const matchesStatus = !statusFilter || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Navigate to lead detail page to use the full conversion flow with subscription options
  const handleConvertClick = (lead: Lead) => {
    navigate(`/admin/leads/${lead.id}`, { state: { openConvertModal: true } });
  };

  const columns: Column<Lead>[] = [
    {
      key: 'name',
      header: 'Lead',
      render: (lead) => (
        <div>
          <Link
            to={`/admin/leads/${lead.id}`}
            className="font-medium text-gray-900 hover:text-indigo-600"
          >
            {lead.firstName} {lead.lastName}
          </Link>
          <p className="text-sm text-gray-500">{lead.email}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (lead) => (
        <span className="text-gray-600">{formatPhone(lead.phone)}</span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (lead) => (
        <span className="text-gray-600 capitalize">{lead.source}</span>
      ),
    },
    {
      key: 'preferredSlot',
      header: 'Preferred Slot',
      render: (lead) => {
        if (!lead.preferredSlotId) {
          return <span className="text-gray-400">Not specified</span>;
        }
        const slot = slots.find(s => s.id === lead.preferredSlotId);
        return <span className="text-gray-600">{slot?.displayName || 'Unknown'}</span>;
      },
    },
    {
      key: 'trial',
      header: 'Trial',
      render: (lead) => {
        if (lead.trialDate && lead.trialSlotId) {
          const slot = slots.find(s => s.id === lead.trialSlotId);
          return (
            <div className="text-sm">
              <p className="text-gray-900">{formatDate(lead.trialDate)}</p>
              <p className="text-gray-500">{slot?.displayName}</p>
            </div>
          );
        }
        return <span className="text-gray-400">No trial</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (lead) => <StatusBadge status={lead.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (lead) => (
        <div className="flex gap-2 justify-end">
          {lead.status !== 'converted' && lead.status !== 'lost' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleConvertClick(lead)}
            >
              Convert
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">Manage prospective members and trial bookings</p>
        </div>
        <Link to="/admin/leads/new">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Lead
          </Button>
        </Link>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {allLeads.filter(l => l.status === 'new').length}
            </p>
            <p className="text-sm text-gray-600">New Leads</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {allLeads.filter(l => l.status === 'contacted').length}
            </p>
            <p className="text-sm text-gray-600">Contacted</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {allLeads.filter(l => l.status === 'trial-scheduled').length}
            </p>
            <p className="text-sm text-gray-600">Trial Scheduled</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {allLeads.filter(l => l.status === 'converted').length}
            </p>
            <p className="text-sm text-gray-600">Converted</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'new', label: 'New' },
              { value: 'contacted', label: 'Contacted' },
              { value: 'trial-scheduled', label: 'Trial Scheduled' },
              { value: 'trial-completed', label: 'Trial Completed' },
              { value: 'negotiating', label: 'Negotiating' },
              { value: 'converted', label: 'Converted' },
              { value: 'lost', label: 'Lost' },
            ]}
          />
          <div className="flex items-center">
            <span className="text-sm text-gray-600">
              {leads.length} {leads.length === 1 ? 'lead' : 'leads'} found
            </span>
          </div>
        </div>
      </Card>

      {/* Leads table */}
      {leads.length === 0 ? (
        <EmptyState
          icon={EmptyIcons.users}
          title="No leads found"
          description={search || statusFilter
            ? "Try adjusting your filters to find what you're looking for."
            : "Get started by adding your first lead."
          }
          action={
            !search && !statusFilter && (
              <Link to="/admin/leads/new">
                <Button>Add Lead</Button>
              </Link>
            )
          }
        />
      ) : (
        <Card>
          <DataTable
            data={leads}
            columns={columns}
            keyExtractor={(lead) => lead.id}
          />
        </Card>
      )}

    </div>
  );
}
