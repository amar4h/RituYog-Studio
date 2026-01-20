import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons } from '../../components/common';
import { memberService, slotService, subscriptionService } from '../../services';
import { formatPhone } from '../../utils/formatUtils';
import type { Member } from '../../types';
import type { Column } from '../../components/common';

export function MemberListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [slotFilter, setSlotFilter] = useState<string>('');

  const allMembers = memberService.getAll();
  const slots = slotService.getActive();

  // Filter members
  const members = allMembers.filter(member => {
    const matchesSearch = !search ||
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase()) ||
      member.phone.includes(search);

    const matchesStatus = !statusFilter || member.status === statusFilter;
    const matchesSlot = !slotFilter || member.assignedSlotId === slotFilter;

    return matchesSearch && matchesStatus && matchesSlot;
  });

  const columns: Column<Member>[] = [
    {
      key: 'name',
      header: 'Member',
      render: (member) => (
        <div>
          <Link
            to={`/admin/members/${member.id}`}
            className="font-medium text-gray-900 hover:text-indigo-600"
          >
            {member.firstName} {member.lastName}
          </Link>
          <p className="text-sm text-gray-500">{member.email}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (member) => (
        <span className="text-gray-600">{formatPhone(member.phone)}</span>
      ),
    },
    {
      key: 'slot',
      header: 'Session Slot',
      render: (member) => {
        if (!member.assignedSlotId) {
          return <span className="text-gray-400">Not assigned</span>;
        }
        const slot = slots.find(s => s.id === member.assignedSlotId);
        return <span className="text-gray-600">{slot?.displayName || 'Unknown'}</span>;
      },
    },
    {
      key: 'subscription',
      header: 'Membership',
      render: (member) => {
        const subscription = subscriptionService.getActiveMemberSubscription(member.id);
        if (!subscription) {
          return <StatusBadge status="inactive" />;
        }
        return (
          <div>
            <StatusBadge status={subscription.status} />
            <p className="text-xs text-gray-500 mt-1">Expires: {subscription.endDate}</p>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (member) => <StatusBadge status={member.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (member) => (
        <div className="flex gap-2 justify-end">
          <Link to={`/admin/members/${member.id}`}>
            <Button variant="ghost" size="sm">View</Button>
          </Link>
          <Link to={`/admin/members/${member.id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-600">Manage your yoga studio members</p>
        </div>
        <Button onClick={() => navigate('/admin/members/new')}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Member
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
          <Select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            options={[
              { value: '', label: 'All Slots' },
              ...slots.map(slot => ({ value: slot.id, label: slot.displayName })),
            ]}
          />
          <div className="flex items-center">
            <span className="text-sm text-gray-600">
              {members.length} {members.length === 1 ? 'member' : 'members'} found
            </span>
          </div>
        </div>
      </Card>

      {/* Members table */}
      {members.length === 0 ? (
        <EmptyState
          icon={EmptyIcons.users}
          title="No members found"
          description={search || statusFilter || slotFilter
            ? "Try adjusting your filters to find what you're looking for."
            : "Get started by adding your first member."
          }
          action={
            !search && !statusFilter && !slotFilter && (
              <Link to="/admin/members/new">
                <Button>Add Member</Button>
              </Link>
            )
          }
        />
      ) : (
        <Card>
          <DataTable
            data={members}
            columns={columns}
            keyExtractor={(member) => member.id}
          />
        </Card>
      )}
    </div>
  );
}
