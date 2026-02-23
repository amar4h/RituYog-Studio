<?php
/**
 * Session Executions API Handler
 * Handles immutable records of conducted yoga sessions
 */

require_once __DIR__ . '/BaseHandler.php';

class SessionExecutionsHandler extends BaseHandler {
    protected string $table = 'session_executions';
    protected array $jsonFields = ['sections_snapshot', 'member_ids'];
    protected array $boolFields = [];
    protected array $dateFields = ['date'];

    /**
     * Get executions for a specific date
     */
    public function getByDate(): array {
        $date = getQueryParam('date');
        if (empty($date)) {
            throw new Exception('Date parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE date = :date ORDER BY slot_id",
            ['date' => $date]
        );
    }

    /**
     * Get executions for a date range
     */
    public function getByDateRange(): array {
        $startDate = getQueryParam('startDate');
        $endDate = getQueryParam('endDate');

        if (empty($startDate) || empty($endDate)) {
            throw new Exception('startDate and endDate parameters are required');
        }

        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE date BETWEEN :startDate AND :endDate
             ORDER BY date DESC, slot_id",
            ['startDate' => $startDate, 'endDate' => $endDate]
        );
    }

    /**
     * Get execution for a specific slot and date
     */
    public function getBySlotAndDate(): ?array {
        $slotId = getQueryParam('slotId');
        $date = getQueryParam('date');

        if (empty($slotId) || empty($date)) {
            throw new Exception('slotId and date parameters are required');
        }

        return $this->queryOne(
            "SELECT * FROM {$this->table} WHERE slot_id = :slotId AND date = :date",
            ['slotId' => $slotId, 'date' => $date]
        );
    }

    /**
     * Get executions by session plan
     */
    public function getBySessionPlan(): array {
        $sessionPlanId = getQueryParam('sessionPlanId');
        if (empty($sessionPlanId)) {
            throw new Exception('sessionPlanId parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE session_plan_id = :sessionPlanId
             ORDER BY date DESC",
            ['sessionPlanId' => $sessionPlanId]
        );
    }

    /**
     * Get recent executions
     */
    public function getRecent(): array {
        $limit = getQueryParam('limit', 20);
        return $this->query(
            "SELECT * FROM {$this->table} ORDER BY date DESC, created_at DESC LIMIT :limit",
            ['limit' => (int) $limit]
        );
    }

    /**
     * Create execution with automatic attendance integration
     * Also updates session plan usage count
     */
    public function create(): array {
        $data = getRequestBody();

        // Required fields
        $required = ['sessionPlanId', 'slotId', 'date', 'sectionsSnapshot'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("$field is required");
            }
        }

        // Check for duplicate execution
        $existing = $this->queryOne(
            "SELECT id FROM {$this->table} WHERE slot_id = :slotId AND date = :date",
            ['slotId' => $data['slotId'], 'date' => $data['date']]
        );

        if ($existing) {
            throw new Exception('An execution already exists for this slot and date');
        }

        // Get session plan details for snapshot
        $sessionPlan = $this->queryOne(
            "SELECT name, level FROM session_plans WHERE id = :id",
            ['id' => $data['sessionPlanId']]
        );

        if (!$sessionPlan) {
            throw new Exception('Session plan not found');
        }

        // Auto-populate member_ids from attendance if not provided
        $memberIds = $data['memberIds'] ?? [];
        if (empty($memberIds)) {
            $attendance = $this->query(
                "SELECT member_id FROM attendance_records
                 WHERE slot_id = :slotId AND date = :date AND status = 'present'",
                ['slotId' => $data['slotId'], 'date' => $data['date']]
            );
            $memberIds = array_column($attendance, 'memberId');
        }

        $id = $data['id'] ?? generateUuid();
        $attendeeCount = count($memberIds);

        $stmt = $this->db->prepare(
            "INSERT INTO {$this->table}
             (id, session_plan_id, session_plan_name, session_plan_level, sections_snapshot,
              slot_id, date, instructor, notes, member_ids, attendee_count, created_at, updated_at)
             VALUES (:id, :sessionPlanId, :sessionPlanName, :sessionPlanLevel, :sectionsSnapshot,
                     :slotId, :date, :instructor, :notes, :memberIds, :attendeeCount, NOW(), NOW())"
        );

        $stmt->execute([
            'id' => $id,
            'sessionPlanId' => $data['sessionPlanId'],
            'sessionPlanName' => $sessionPlan['name'],
            'sessionPlanLevel' => $sessionPlan['level'],
            'sectionsSnapshot' => json_encode($data['sectionsSnapshot']),
            'slotId' => $data['slotId'],
            'date' => $data['date'],
            'instructor' => $data['instructor'] ?? null,
            'notes' => $data['notes'] ?? null,
            'memberIds' => json_encode($memberIds),
            'attendeeCount' => $attendeeCount,
        ]);

        // Update session plan usage count (only once per day, not per slot)
        $alreadyUsedToday = $this->queryOne(
            "SELECT id FROM {$this->table}
             WHERE session_plan_id = :planId AND date = :date AND id != :currentId",
            ['planId' => $data['sessionPlanId'], 'date' => $data['date'], 'currentId' => $id]
        );
        if (!$alreadyUsedToday) {
            $this->db->prepare(
                "UPDATE session_plans
                 SET usage_count = usage_count + 1, last_used_at = NOW(), updated_at = NOW()
                 WHERE id = :id"
            )->execute(['id' => $data['sessionPlanId']]);
        } else {
            $this->db->prepare(
                "UPDATE session_plans SET last_used_at = NOW(), updated_at = NOW() WHERE id = :id"
            )->execute(['id' => $data['sessionPlanId']]);
        }

        // Update allocation status if exists
        $this->db->prepare(
            "UPDATE session_plan_allocations
             SET status = 'executed', execution_id = :executionId, updated_at = NOW()
             WHERE slot_id = :slotId AND date = :date AND status = 'scheduled'"
        )->execute([
            'executionId' => $id,
            'slotId' => $data['slotId'],
            'date' => $data['date'],
        ]);

        return $this->getById($id);
    }

    /**
     * Get analytics: asana usage frequency
     */
    public function getAsanaUsage(): array {
        $startDate = getQueryParam('startDate');
        $endDate = getQueryParam('endDate');

        $params = [];
        $dateFilter = '';

        if ($startDate && $endDate) {
            $dateFilter = 'WHERE date BETWEEN :startDate AND :endDate';
            $params = ['startDate' => $startDate, 'endDate' => $endDate];
        }

        // This would require parsing JSON in MySQL which is complex
        // Return raw executions and let frontend compute
        return $this->query(
            "SELECT sections_snapshot, date FROM {$this->table} {$dateFilter} ORDER BY date DESC",
            $params
        );
    }

    /**
     * Override update to prevent modifications (immutable)
     */
    public function update($id = null): array {
        throw new Exception('Session executions are immutable and cannot be updated');
    }

    /**
     * Override delete to prevent deletions (immutable)
     */
    public function delete($id = null): array {
        throw new Exception('Session executions are immutable and cannot be deleted');
    }
}
