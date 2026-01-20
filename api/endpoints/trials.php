<?php
/**
 * Trial Bookings API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class TrialsHandler extends BaseHandler {
    protected string $table = 'trial_bookings';
    protected array $jsonFields = [];
    protected array $boolFields = ['is_exception', 'confirmation_sent', 'reminder_sent'];

    /**
     * Get bookings by lead
     */
    public function getByLead(): array {
        $leadId = getQueryParam('leadId');
        if (empty($leadId)) {
            throw new Exception('leadId parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE lead_id = :leadId
             ORDER BY date DESC",
            ['leadId' => $leadId]
        );
    }

    /**
     * Get bookings by slot and date
     */
    public function getBySlotAndDate(): array {
        $slotId = getQueryParam('slotId');
        $date = getQueryParam('date');

        if (empty($slotId) || empty($date)) {
            throw new Exception('slotId and date parameters are required');
        }

        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE slot_id = :slotId AND date = :date",
            ['slotId' => $slotId, 'date' => $date]
        );
    }

    /**
     * Get upcoming trial bookings
     */
    public function getUpcoming(): array {
        $today = getToday();
        return $this->query(
            "SELECT tb.*, l.first_name, l.last_name, l.email, l.phone
             FROM {$this->table} tb
             JOIN leads l ON tb.lead_id = l.id
             WHERE tb.date >= :today
             AND tb.status IN ('pending', 'confirmed')
             ORDER BY tb.date ASC",
            ['today' => $today]
        );
    }

    /**
     * Get today's trial bookings
     */
    public function getToday(): array {
        $today = getToday();
        return $this->query(
            "SELECT tb.*, l.first_name, l.last_name, l.email, l.phone, s.display_name as slot_name
             FROM {$this->table} tb
             JOIN leads l ON tb.lead_id = l.id
             JOIN session_slots s ON tb.slot_id = s.id
             WHERE tb.date = :today
             AND tb.status IN ('pending', 'confirmed')
             ORDER BY s.start_time ASC",
            ['today' => $today]
        );
    }

    /**
     * Book a trial session
     */
    public function book(): array {
        $data = getRequestBody();
        $leadId = $data['leadId'] ?? null;
        $slotId = $data['slotId'] ?? null;
        $date = $data['date'] ?? null;
        $isException = $data['isException'] ?? false;

        if (empty($leadId) || empty($slotId) || empty($date)) {
            throw new Exception('leadId, slotId, and date are required');
        }

        // Validate lead exists
        $lead = $this->queryOne(
            "SELECT * FROM leads WHERE id = :id",
            ['id' => $leadId]
        );
        if (!$lead) {
            throw new Exception('Lead not found');
        }

        // Check if lead was already converted to member with active subscription
        if ($lead['convertedToMemberId']) {
            $activeSub = $this->queryOne(
                "SELECT id FROM membership_subscriptions
                 WHERE member_id = :memberId
                 AND status = 'active'
                 AND start_date <= :date AND end_date >= :date",
                ['memberId' => $lead['convertedToMemberId'], 'date' => $date]
            );
            if ($activeSub) {
                throw new Exception('This person already has an active membership. Trial booking not allowed.');
            }
        }

        // Check max trials per person
        $settings = $this->queryOne("SELECT * FROM studio_settings WHERE id = 1");
        $maxTrials = (int) ($settings['maxTrialsPerPerson'] ?? 1);

        $completedTrials = $this->query(
            "SELECT id FROM {$this->table}
             WHERE lead_id = :leadId AND status IN ('attended', 'no-show')",
            ['leadId' => $leadId]
        );
        if (count($completedTrials) >= $maxTrials) {
            throw new Exception('Maximum trial sessions reached');
        }

        // Check for existing trial on same date
        $existingTrials = $this->query(
            "SELECT id FROM {$this->table}
             WHERE lead_id = :leadId AND date = :date AND status IN ('pending', 'confirmed')",
            ['leadId' => $leadId, 'date' => $date]
        );
        if (count($existingTrials) > 0) {
            throw new Exception('A trial session is already booked for this date');
        }

        // Check if it's a working day
        $dayOfWeek = (int) date('N', strtotime($date));
        if ($dayOfWeek === 6 || $dayOfWeek === 7) {
            throw new Exception('Sessions only available Monday to Friday');
        }

        // Check slot capacity
        require_once __DIR__ . '/slots.php';
        $_GET['slotId'] = $slotId;
        $_GET['date'] = $date;
        $_GET['useException'] = $isException ? 'true' : 'false';

        $slotsHandler = new SlotsHandler();
        $hasCapacity = $slotsHandler->hasCapacity();
        if (!$hasCapacity['hasCapacity']) {
            throw new Exception($isException ? 'Exception capacity full' : 'Slot is full for this date');
        }

        // Create the booking
        $id = generateUUID();
        $this->execute(
            "INSERT INTO {$this->table}
             (id, lead_id, slot_id, date, status, is_exception, confirmation_sent, reminder_sent)
             VALUES (:id, :leadId, :slotId, :date, 'confirmed', :isException, 0, 0)",
            [
                'id' => $id,
                'leadId' => $leadId,
                'slotId' => $slotId,
                'date' => $date,
                'isException' => $isException ? 1 : 0
            ]
        );

        // Update lead status
        $this->execute(
            "UPDATE leads
             SET status = 'trial-scheduled',
                 trial_date = :date,
                 trial_slot_id = :slotId,
                 trial_status = 'scheduled'
             WHERE id = :leadId",
            ['leadId' => $leadId, 'date' => $date, 'slotId' => $slotId]
        );

        return $this->getById($id);
    }

    /**
     * Mark trial as attended
     */
    public function markAttended(string $id): array {
        $booking = $this->getById($id);
        if (!$booking) {
            throw new Exception('Booking not found');
        }

        $this->execute(
            "UPDATE {$this->table} SET status = 'attended' WHERE id = :id",
            ['id' => $id]
        );

        // Update lead
        $this->execute(
            "UPDATE leads SET status = 'trial-completed', trial_status = 'attended' WHERE id = :leadId",
            ['leadId' => $booking['leadId']]
        );

        return $this->getById($id);
    }

    /**
     * Mark trial as no-show
     */
    public function markNoShow(string $id): array {
        $booking = $this->getById($id);
        if (!$booking) {
            throw new Exception('Booking not found');
        }

        $this->execute(
            "UPDATE {$this->table} SET status = 'no-show' WHERE id = :id",
            ['id' => $id]
        );

        // Update lead
        $this->execute(
            "UPDATE leads SET status = 'follow-up', trial_status = 'no-show' WHERE id = :leadId",
            ['leadId' => $booking['leadId']]
        );

        return $this->getById($id);
    }

    /**
     * Cancel trial booking
     */
    public function cancel(string $id): array {
        $this->execute(
            "UPDATE {$this->table} SET status = 'cancelled' WHERE id = :id",
            ['id' => $id]
        );

        return $this->getById($id);
    }
}
