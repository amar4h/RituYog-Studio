import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons, Alert, WhatsAppTemplateModal, PageLoading } from '../../components/common';
import { leadService, slotService, whatsappService } from '../../services';
import { formatPhone } from '../../utils/formatUtils';
import { formatDate } from '../../utils/dateUtils';
import { useFreshData } from '../../hooks';
import type { Lead } from '../../types';
import type { Column } from '../../components/common';

export function LeadListPage() {
  // Fetch fresh data from API on mount
  const { isLoading } = useFreshData(['leads']);

  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Show loading state while fetching data
  if (isLoading) {
    return <PageLoading />;
  }

  // Get data after loading is complete
  const allLeads = leadService.getUnconverted();
  const slots = slotService.getActive();

  // Filter leads (converted leads already excluded by getUnconverted)
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
            <>
              <button
                onClick={() => {
                  setSelectedLead(lead);
                  setWhatsappModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
                title="Send WhatsApp message"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConvertClick(lead)}
              >
                Convert
              </Button>
            </>
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

      {/* WhatsApp Template Modal */}
      <WhatsAppTemplateModal
        isOpen={whatsappModalOpen}
        onClose={() => {
          setWhatsappModalOpen(false);
          setSelectedLead(null);
        }}
        templates={whatsappService.getLeadFollowUpTemplates()}
        title="Send Message to Lead"
        recipientName={selectedLead ? `${selectedLead.firstName} ${selectedLead.lastName}` : ''}
        onSelect={(templateIndex) => {
          if (!selectedLead) return '';
          return whatsappService.generateLeadFollowUp({
            lead: selectedLead,
            templateIndex,
          }).link;
        }}
      />
    </div>
  );
}
