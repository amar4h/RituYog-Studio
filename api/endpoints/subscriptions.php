<?php
/**
 * Membership Subscriptions API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class SubscriptionsHandler extends BaseHandler {
    protected string $table = 'membership_subscriptions';
    protected array $jsonFields = [];
    protected array $boolFields = ['is_extension'];
    protected array $dateFields = ['start_date', 'end_date'];
    protected array $numericFields = ['price', 'discount', 'classes_attended'];

    /**
     * Get subscriptions by member
     */
    public function getByMember(): array {
        $memberId = getQueryParam('memberId');
        if (empty($memberId)) {
            throw new Exception('memberId parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE member_id = :memberId
             ORDER BY start_date DESC",
            ['memberId' => $memberId]
        );
    }

    /**
     * Get active subscription for a member
     */
    public function getActiveMember(): ?array {
        $memberId = getQueryParam('memberId');
        if (empty($memberId)) {
            throw new Exception('memberId parameter is required');
        }

        $today = getToday();
        return $this->queryOne(
            "SELECT * FROM {$this->table}
             WHERE member_id = :memberId
             AND status = 'active'
             AND start_date <= :todayStart
             AND end_date >= :todayEnd
             LIMIT 1",
            ['memberId' => $memberId, 'todayStart' => $today, 'todayEnd' => $today]
        );
    }

    /**
     * Get subscriptions expiring soon
     */
    public function getExpiringSoon(): array {
        $days = (int) getQueryParam('days', 7);
        $today = getToday();
        $futureDate = date('Y-m-d', strtotime("+{$days} days"));

        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE status = 'active'
             AND end_date >= :today
             AND end_date <= :futureDate
             ORDER BY end_date ASC",
            ['today' => $today, 'futureDate' => $futureDate]
        );
    }

    /**
     * Get active subscriptions for a slot on a specific date
     */
    public function getActiveForSlotOnDate(): array {
        $slotId = getQueryParam('slotId');
        $date = getQueryParam('date', getToday());

        if (empty($slotId)) {
            throw new Exception('slotId parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE slot_id = :slotId
             AND status IN ('active', 'expired')
             AND start_date <= :dateStart
             AND end_date >= :dateEnd",
            ['slotId' => $slotId, 'dateStart' => $date, 'dateEnd' => $date]
        );
    }

    /**
     * Check slot capacity for a date range
     */
    public function checkSlotCapacity(): array {
        $slotId = getQueryParam('slotId');
        $startDate = getQueryParam('startDate');
        $endDate = getQueryParam('endDate');

        if (empty($slotId) || empty($startDate) || empty($endDate)) {
            throw new Exception('slotId, startDate, and endDate parameters are required');
        }

        // Get slot info
        $slot = $this->queryOne(
            "SELECT * FROM session_slots WHERE id = :id",
            ['id' => $slotId]
        );

        if (!$slot) {
            throw new Exception('Slot not found');
        }

        // Count overlapping subscriptions (deduplicated by member)
        $stmt = $this->db->prepare(
            "SELECT COUNT(DISTINCT member_id) as count
             FROM {$this->table}
             WHERE slot_id = :slotId
             AND status IN ('active', 'scheduled', 'pending')
             AND start_date <= :endDate
             AND end_date >= :startDate"
        );
        $stmt->execute(['slotId' => $slotId, 'startDate' => $startDate, 'endDate' => $endDate]);
        $result = $stmt->fetch();
        $currentBookings = (int) $result['count'];

        $normalCapacity = (int) $slot['capacity'];
        $totalCapacity = $normalCapacity + (int) $slot['exceptionCapacity'];

        $available = $currentBookings < $totalCapacity;
        $isExceptionOnly = $currentBookings >= $normalCapacity && $currentBookings < $totalCapacity;

        return [
            'available' => $available,
            'isExceptionOnly' => $isExceptionOnly,
            'currentBookings' => $currentBookings,
            'normalCapacity' => $normalCapacity,
            'totalCapacity' => $totalCapacity,
            'message' => $available
                ? ($isExceptionOnly ? 'Exception capacity only' : 'Available')
                : 'Full'
        ];
    }

    /**
     * Check if member has active subscription
     */
    public function hasActiveSubscription(): array {
        $memberId = getQueryParam('memberId');
        if (empty($memberId)) {
            throw new Exception('memberId parameter is required');
        }

        $active = $this->getActiveMember();
        return ['hasActive' => $active !== null];
    }

    /**
     * Check if member has pending renewal
     */
    public function hasPendingRenewal(): array {
        $memberId = getQueryParam('memberId');
        if (empty($memberId)) {
            throw new Exception('memberId parameter is required');
        }

        $today = getToday();

        // Check for active subscription
        $active = $this->queryOne(
            "SELECT id FROM {$this->table}
             WHERE member_id = :memberId
             AND status = 'active'
             AND start_date <= :todayStart
             AND end_date >= :todayEnd
             LIMIT 1",
            ['memberId' => $memberId, 'todayStart' => $today, 'todayEnd' => $today]
        );

        if (!$active) {
            return ['hasPendingRenewal' => false];
        }

        // Check for future subscription
        $future = $this->queryOne(
            "SELECT id FROM {$this->table}
             WHERE member_id = :memberId
             AND id != :activeId
             AND (status = 'scheduled' OR (status = 'active' AND start_date > :today))
             LIMIT 1",
            ['memberId' => $memberId, 'activeId' => $active['id'], 'today' => $today]
        );

        return ['hasPendingRenewal' => $future !== null];
    }
}
