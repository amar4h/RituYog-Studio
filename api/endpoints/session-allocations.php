<?php
/**
 * Session Allocations API Handler
 * Handles pre-scheduling of session plans to slots/dates
 */

require_once __DIR__ . '/BaseHandler.php';

class SessionAllocationsHandler extends BaseHandler {
    protected string $table = 'session_plan_allocations';
    protected array $jsonFields = [];
    protected array $boolFields = [];
    protected array $dateFields = ['date'];

    /**
     * Get allocations for a specific date
     */
    public function getByDate(): array {
        $date = getQueryParam('date');
        if (empty($date)) {
            throw new Exception('Date parameter is required');
        }

        return $this->query(
            "SELECT a.*, sp.name as session_plan_name, sp.level as session_plan_level
             FROM {$this->table} a
             LEFT JOIN session_plans sp ON a.session_plan_id = sp.id
             WHERE a.date = :date
             ORDER BY a.slot_id",
            ['date' => $date]
        );
    }

    /**
     * Get allocations for a date range
     */
    public function getByDateRange(): array {
        $startDate = getQueryParam('startDate');
        $endDate = getQueryParam('endDate');

        if (empty($startDate) || empty($endDate)) {
            throw new Exception('startDate and endDate parameters are required');
        }

        return $this->query(
            "SELECT a.*, sp.name as session_plan_name, sp.level as session_plan_level
             FROM {$this->table} a
             LEFT JOIN session_plans sp ON a.session_plan_id = sp.id
             WHERE a.date BETWEEN :startDate AND :endDate
             ORDER BY a.date, a.slot_id",
            ['startDate' => $startDate, 'endDate' => $endDate]
        );
    }

    /**
     * Get allocation for a specific slot and date
     */
    public function getBySlotAndDate(): ?array {
        $slotId = getQueryParam('slotId');
        $date = getQueryParam('date');

        if (empty($slotId) || empty($date)) {
            throw new Exception('slotId and date parameters are required');
        }

        return $this->queryOne(
            "SELECT a.*, sp.name as session_plan_name, sp.level as session_plan_level, sp.sections
             FROM {$this->table} a
             LEFT JOIN session_plans sp ON a.session_plan_id = sp.id
             WHERE a.slot_id = :slotId AND a.date = :date",
            ['slotId' => $slotId, 'date' => $date]
        );
    }

    /**
     * Get pending (scheduled) allocations
     */
    public function getPending(): array {
        return $this->query(
            "SELECT a.*, sp.name as session_plan_name, sp.level as session_plan_level
             FROM {$this->table} a
             LEFT JOIN session_plans sp ON a.session_plan_id = sp.id
             WHERE a.status = 'scheduled' AND a.date >= CURDATE()
             ORDER BY a.date, a.slot_id"
        );
    }

    /**
     * Override create to update existing allocation for same slot+date
     */
    public function create(): array {
        $data = getRequestBody();
        $slotId = $data['slotId'] ?? null;
        $date = $data['date'] ?? null;

        if (!empty($slotId) && !empty($date)) {
            $existing = $this->queryOne(
                "SELECT id FROM {$this->table} WHERE slot_id = :slotId AND date = :date",
                ['slotId' => $slotId, 'date' => $date]
            );

            if ($existing) {
                // Update existing allocation with new plan
                $this->db->prepare(
                    "UPDATE {$this->table}
                     SET session_plan_id = :sessionPlanId, allocated_by = :allocatedBy, status = 'scheduled', updated_at = NOW()
                     WHERE id = :id"
                )->execute([
                    'sessionPlanId' => $data['sessionPlanId'] ?? null,
                    'allocatedBy' => $data['allocatedBy'] ?? null,
                    'id' => $existing['id'],
                ]);
                return $this->getById($existing['id']);
            }
        }

        return parent::create();
    }

    /**
     * Cancel an allocation
     */
    public function cancel($id = null): array {
        if (empty($id)) {
            $id = getQueryParam('id');
        }
        if (empty($id)) {
            throw new Exception('ID is required');
        }

        $this->db->prepare(
            "UPDATE {$this->table} SET status = 'cancelled', updated_at = NOW() WHERE id = :id"
        )->execute(['id' => $id]);

        return $this->getById($id);
    }

    /**
     * Mark allocation as executed
     */
    public function markExecuted($id = null): array {
        if (empty($id)) {
            $id = getQueryParam('id');
        }
        $executionId = getQueryParam('executionId');

        if (empty($id)) {
            throw new Exception('ID is required');
        }

        $this->db->prepare(
            "UPDATE {$this->table}
             SET status = 'executed', execution_id = :executionId, updated_at = NOW()
             WHERE id = :id"
        )->execute(['id' => $id, 'executionId' => $executionId]);

        return $this->getById($id);
    }

    /**
     * Allocate a plan to all slots for a given date
     */
    public function allocateToAllSlots(): array {
        $data = getRequestBody();
        $sessionPlanId = $data['sessionPlanId'] ?? null;
        $date = $data['date'] ?? null;
        $allocatedBy = $data['allocatedBy'] ?? null;

        if (empty($sessionPlanId) || empty($date)) {
            throw new Exception('sessionPlanId and date are required');
        }

        // Get all active slots
        $slots = $this->query("SELECT id FROM session_slots WHERE is_active = 1");

        $created = [];
        foreach ($slots as $slot) {
            // Check if allocation already exists
            $existing = $this->queryOne(
                "SELECT id FROM {$this->table} WHERE slot_id = :slotId AND date = :date",
                ['slotId' => $slot['id'], 'date' => $date]
            );

            if ($existing) {
                // Update existing allocation with new plan
                $this->db->prepare(
                    "UPDATE {$this->table}
                     SET session_plan_id = :sessionPlanId, allocated_by = :allocatedBy, status = 'scheduled', updated_at = NOW()
                     WHERE id = :id"
                )->execute([
                    'sessionPlanId' => $sessionPlanId,
                    'allocatedBy' => $allocatedBy,
                    'id' => $existing['id'],
                ]);
                $created[] = $this->getById($existing['id']);
            } else {
                $id = generateUuid();
                $this->db->prepare(
                    "INSERT INTO {$this->table}
                     (id, session_plan_id, slot_id, date, allocated_by, status, created_at, updated_at)
                     VALUES (:id, :sessionPlanId, :slotId, :date, :allocatedBy, 'scheduled', NOW(), NOW())"
                )->execute([
                    'id' => $id,
                    'sessionPlanId' => $sessionPlanId,
                    'slotId' => $slot['id'],
                    'date' => $date,
                    'allocatedBy' => $allocatedBy,
                ]);
                $created[] = $this->getById($id);
            }
        }

        return $created;
    }
}
