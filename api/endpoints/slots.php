<?php
/**
 * Session Slots API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class SlotsHandler extends BaseHandler {
    protected string $table = 'session_slots';
    protected array $jsonFields = [];
    protected array $boolFields = ['is_active'];
    protected array $numericFields = ['capacity', 'exception_capacity'];

    /**
     * Get active slots
     */
    public function getActive(): array {
        return $this->query(
            "SELECT * FROM {$this->table} WHERE is_active = 1 ORDER BY start_time ASC"
        );
    }

    /**
     * Get slot availability for a specific date
     */
    public function getAvailability(): array {
        $slotId = getQueryParam('slotId');
        $date = getQueryParam('date', getToday());

        if (empty($slotId)) {
            throw new Exception('slotId parameter is required');
        }

        $slot = $this->getById($slotId);
        if (!$slot) {
            throw new Exception('Slot not found');
        }

        // Count membership subscriptions active on this date
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) as count FROM membership_subscriptions
             WHERE slot_id = :slotId
             AND status = 'active'
             AND start_date <= :date
             AND end_date >= :date"
        );
        $stmt->execute(['slotId' => $slotId, 'date' => $date]);
        $membershipSubs = (int) $stmt->fetch()['count'];

        // Count slot subscriptions marked as exception
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) as count FROM slot_subscriptions
             WHERE slot_id = :slotId
             AND is_active = 1
             AND is_exception = 1
             AND (start_date IS NULL OR start_date <= :date)
             AND (end_date IS NULL OR end_date >= :date)"
        );
        $stmt->execute(['slotId' => $slotId, 'date' => $date]);
        $exceptionSubs = (int) $stmt->fetch()['count'];

        // Count trial bookings for this date
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) as count FROM trial_bookings
             WHERE slot_id = :slotId
             AND date = :date
             AND status IN ('pending', 'confirmed')"
        );
        $stmt->execute(['slotId' => $slotId, 'date' => $date]);
        $trialBookings = (int) $stmt->fetch()['count'];

        $totalCapacity = (int) $slot['capacity'] + (int) $slot['exceptionCapacity'];
        $availableRegular = max(0, (int) $slot['capacity'] - $membershipSubs - $trialBookings);
        $availableException = max(0, (int) $slot['exceptionCapacity'] - $exceptionSubs);

        return [
            'slotId' => $slotId,
            'date' => $date,
            'regularBookings' => $membershipSubs,
            'exceptionBookings' => $exceptionSubs,
            'trialBookings' => $trialBookings,
            'totalCapacity' => $totalCapacity,
            'availableRegular' => $availableRegular,
            'availableException' => $availableException,
            'isFull' => $availableRegular <= 0 && $availableException <= 0
        ];
    }

    /**
     * Get availability for all active slots
     */
    public function getAllAvailability(): array {
        $date = getQueryParam('date', getToday());
        $slots = $this->getActive();

        $results = [];
        foreach ($slots as $slot) {
            $_GET['slotId'] = $slot['id'];
            $_GET['date'] = $date;
            $results[] = $this->getAvailability();
        }

        return $results;
    }

    /**
     * Check if slot has capacity
     */
    public function hasCapacity(): array {
        $slotId = getQueryParam('slotId');
        $date = getQueryParam('date', getToday());
        $useException = getQueryParam('useException', 'false') === 'true';

        $availability = $this->getAvailability();

        $hasCapacity = $useException
            ? $availability['availableException'] > 0
            : $availability['availableRegular'] > 0;

        return ['hasCapacity' => $hasCapacity];
    }

    /**
     * Update slot capacity
     */
    public function updateCapacity(string $id): array {
        $data = getRequestBody();
        $capacity = (int) ($data['capacity'] ?? 10);
        $exceptionCapacity = (int) ($data['exceptionCapacity'] ?? 1);

        $this->execute(
            "UPDATE {$this->table}
             SET capacity = :capacity, exception_capacity = :exceptionCapacity
             WHERE id = :id",
            ['id' => $id, 'capacity' => $capacity, 'exceptionCapacity' => $exceptionCapacity]
        );

        return $this->getById($id);
    }
}
