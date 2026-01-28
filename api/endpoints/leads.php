<?php
/**
 * Leads API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class LeadsHandler extends BaseHandler {
    protected string $table = 'leads';
    protected array $jsonFields = ['interested_plan_ids', 'medical_conditions', 'consent_records'];
    protected array $boolFields = ['has_yoga_experience'];
    protected array $dateFields = ['trial_date', 'last_contact_date', 'next_follow_up_date'];
    protected array $datetimeFields = ['conversion_date'];

    /**
     * Get leads by status
     */
    public function getByStatus(): array {
        $status = getQueryParam('status');
        if (empty($status)) {
            throw new Exception('Status parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE status = :status ORDER BY created_at DESC",
            ['status' => $status]
        );
    }

    /**
     * Get pending leads (not converted or lost)
     */
    public function getPending(): array {
        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE status IN ('new', 'contacted', 'trial-scheduled', 'follow-up', 'interested', 'negotiating')
             ORDER BY created_at DESC"
        );
    }

    /**
     * Get leads for follow-up (next follow-up date is today or past)
     */
    public function getForFollowUp(): array {
        $today = getToday();
        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE next_follow_up_date <= :today
             AND status NOT IN ('converted', 'not-interested', 'lost')
             ORDER BY next_follow_up_date ASC",
            ['today' => $today]
        );
    }

    /**
     * Get lead by email
     */
    public function getByEmail(): ?array {
        $email = getQueryParam('email');
        if (empty($email)) {
            throw new Exception('Email parameter is required');
        }

        return $this->queryOne(
            "SELECT * FROM {$this->table} WHERE LOWER(email) = LOWER(:email)",
            ['email' => $email]
        );
    }

    /**
     * Get lead by phone
     */
    public function getByPhone(): ?array {
        $phone = getQueryParam('phone');
        if (empty($phone)) {
            throw new Exception('Phone parameter is required');
        }

        return $this->queryOne(
            "SELECT * FROM {$this->table} WHERE phone = :phone",
            ['phone' => $phone]
        );
    }

    /**
     * Search leads
     */
    public function search(): array {
        $query = getQueryParam('query', '');
        if (empty($query)) {
            return $this->getAll();
        }

        $searchTerm = '%' . $query . '%';
        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE first_name LIKE :q1 OR last_name LIKE :q2
             OR email LIKE :q3 OR phone LIKE :q4
             ORDER BY created_at DESC",
            ['q1' => $searchTerm, 'q2' => $searchTerm, 'q3' => $searchTerm, 'q4' => $searchTerm]
        );
    }

    /**
     * Convert lead to member
     * Note: This is handled by the frontend service layer to maintain business logic
     * This endpoint just marks the lead as converted
     */
    public function markConverted(string $id): array {
        $data = getRequestBody();
        $memberId = $data['memberId'] ?? null;

        if (empty($memberId)) {
            throw new Exception('memberId is required');
        }

        $this->execute(
            "UPDATE {$this->table}
             SET status = 'converted',
                 converted_to_member_id = :memberId,
                 conversion_date = NOW()
             WHERE id = :id",
            ['id' => $id, 'memberId' => $memberId]
        );

        return $this->getById($id);
    }
}
