<?php
/**
 * Leads API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class LeadsHandler extends BaseHandler {
    protected string $table = 'leads';
    protected array $jsonFields = ['interested_plan_ids', 'medical_conditions', 'consent_records'];
    protected array $boolFields = ['has_yoga_experience', 'is_profile_complete'];
    protected array $dateFields = ['trial_date', 'last_contact_date', 'next_follow_up_date'];
    protected array $datetimeFields = ['conversion_date', 'completion_token_expiry'];

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

    /**
     * Get lead by completion token (PUBLIC - no auth required)
     * Used by the public registration completion page
     */
    public function getByToken(): ?array {
        $token = getQueryParam('token');
        if (empty($token)) {
            throw new Exception('Token parameter is required');
        }

        $result = $this->queryOne(
            "SELECT * FROM {$this->table}
             WHERE completion_token = :token
             AND completion_token_expiry > NOW()
             AND is_profile_complete = FALSE",
            ['token' => $token]
        );

        return $result;
    }

    /**
     * Complete lead registration (PUBLIC - token auth)
     * Updates lead with personal info, email, medical conditions, and consent records
     */
    public function completeRegistration(): ?array {
        $data = getRequestBody();
        $token = $data['token'] ?? '';

        if (empty($token)) {
            throw new Exception('Token is required');
        }

        // Verify token is valid
        $lead = $this->queryOne(
            "SELECT * FROM {$this->table}
             WHERE completion_token = :token
             AND completion_token_expiry > NOW()
             AND is_profile_complete = FALSE",
            ['token' => $token]
        );

        if (!$lead) {
            throw new Exception('Invalid or expired registration link');
        }

        // Validate required fields
        if (empty($data['firstName'])) {
            throw new Exception('First name is required');
        }
        if (empty($data['lastName'])) {
            throw new Exception('Last name is required');
        }
        if (empty($data['phone'])) {
            throw new Exception('Phone is required');
        }
        if (empty($data['email'])) {
            throw new Exception('Email is required');
        }

        // Update lead with completed data
        $this->execute(
            "UPDATE {$this->table} SET
             first_name = :firstName,
             last_name = :lastName,
             phone = :phone,
             email = :email,
             age = :age,
             gender = :gender,
             preferred_slot_id = :preferredSlotId,
             medical_conditions = :medicalConditions,
             consent_records = :consentRecords,
             is_profile_complete = TRUE,
             completion_token = NULL,
             completion_token_expiry = NULL,
             updated_at = NOW()
             WHERE id = :id",
            [
                'id' => $lead['id'],
                'firstName' => $data['firstName'],
                'lastName' => $data['lastName'],
                'phone' => $data['phone'],
                'email' => $data['email'],
                'age' => $data['age'] ?? null,
                'gender' => $data['gender'] ?? null,
                'preferredSlotId' => $data['preferredSlotId'] ?? null,
                'medicalConditions' => json_encode($data['medicalConditions'] ?? []),
                'consentRecords' => json_encode($data['consentRecords'] ?? []),
            ]
        );

        return $this->getById($lead['id']);
    }
}
