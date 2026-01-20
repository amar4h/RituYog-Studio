<?php
/**
 * Members API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class MembersHandler extends BaseHandler {
    protected string $table = 'members';
    protected array $jsonFields = ['emergency_contact', 'medical_conditions', 'consent_records'];
    protected array $boolFields = [];

    /**
     * Get members by status
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
     * Get members by slot
     */
    public function getBySlot(): array {
        $slotId = getQueryParam('slotId');
        if (empty($slotId)) {
            throw new Exception('slotId parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE assigned_slot_id = :slotId ORDER BY first_name, last_name",
            ['slotId' => $slotId]
        );
    }

    /**
     * Get member by email
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
     * Get member by phone
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
     * Get active members
     */
    public function getActive(): array {
        return $this->query(
            "SELECT * FROM {$this->table} WHERE status = 'active' ORDER BY first_name, last_name"
        );
    }

    /**
     * Search members
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
             ORDER BY first_name, last_name",
            ['q1' => $searchTerm, 'q2' => $searchTerm, 'q3' => $searchTerm, 'q4' => $searchTerm]
        );
    }

    /**
     * Increment classes attended
     */
    public function incrementClasses(string $id): array {
        if (empty($id)) {
            throw new Exception('Member ID is required');
        }

        $this->execute(
            "UPDATE {$this->table} SET classes_attended = classes_attended + 1 WHERE id = :id",
            ['id' => $id]
        );

        return $this->getById($id);
    }

    /**
     * Decrement classes attended
     */
    public function decrementClasses(string $id): array {
        if (empty($id)) {
            throw new Exception('Member ID is required');
        }

        $this->execute(
            "UPDATE {$this->table} SET classes_attended = GREATEST(0, classes_attended - 1) WHERE id = :id",
            ['id' => $id]
        );

        return $this->getById($id);
    }
}
