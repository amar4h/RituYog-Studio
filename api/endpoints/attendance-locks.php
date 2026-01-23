<?php
/**
 * Attendance Locks API Handler
 *
 * Manages per-day per-slot attendance lock/unlock state.
 * Locks are stored in the attendance_locks table with composite key (date, slot_id).
 */

require_once __DIR__ . '/BaseHandler.php';

class AttendanceLocksHandler extends BaseHandler {
    protected string $table = 'attendance_locks';
    protected array $jsonFields = [];
    protected array $boolFields = ['is_locked'];

    /**
     * Get all lock states
     * Returns an object keyed by "date:slotId": { "2026-01-23:slot-0730": true }
     */
    public function getAll(): array {
        try {
            $stmt = $this->db->query("SELECT date, slot_id, is_locked FROM {$this->table}");
            $records = $stmt->fetchAll();

            $result = [];
            foreach ($records as $record) {
                // Use composite key: date:slotId
                $key = $record['date'] . ':' . $record['slot_id'];
                $result[$key] = (bool) $record['is_locked'];
            }
            return $result;
        } catch (PDOException $e) {
            // Table might not exist yet - return empty
            return [];
        }
    }

    /**
     * Set lock state for a date and slot (create or update)
     */
    public function setLock(): array {
        $data = getRequestBody();
        $date = $data['date'] ?? null;
        $slotId = $data['slotId'] ?? null;
        $isLocked = $data['isLocked'] ?? true;
        $lockedBy = $data['lockedBy'] ?? null;

        if (empty($date)) {
            throw new Exception('date is required');
        }
        if (empty($slotId)) {
            throw new Exception('slotId is required');
        }

        // Check if record exists
        $stmt = $this->db->prepare("SELECT date FROM {$this->table} WHERE date = :date AND slot_id = :slotId");
        $stmt->execute(['date' => $date, 'slotId' => $slotId]);
        $existing = $stmt->fetch();

        if ($existing) {
            // Update existing record
            $stmt = $this->db->prepare(
                "UPDATE {$this->table} SET is_locked = :isLocked, locked_by = :lockedBy, locked_at = NOW() WHERE date = :date AND slot_id = :slotId"
            );
            $stmt->execute([
                'date' => $date,
                'slotId' => $slotId,
                'isLocked' => $isLocked ? 1 : 0,
                'lockedBy' => $lockedBy
            ]);
        } else {
            // Insert new record
            $stmt = $this->db->prepare(
                "INSERT INTO {$this->table} (date, slot_id, is_locked, locked_by, locked_at) VALUES (:date, :slotId, :isLocked, :lockedBy, NOW())"
            );
            $stmt->execute([
                'date' => $date,
                'slotId' => $slotId,
                'isLocked' => $isLocked ? 1 : 0,
                'lockedBy' => $lockedBy
            ]);
        }

        return [
            'date' => $date,
            'slotId' => $slotId,
            'isLocked' => (bool) $isLocked,
            'lockedBy' => $lockedBy,
        ];
    }

    /**
     * Alias for setLock (handles POST requests)
     */
    public function create(): array {
        return $this->setLock();
    }

    /**
     * Alias for setLock (handles PUT requests)
     */
    public function update($id = ''): array {
        return $this->setLock();
    }
}
