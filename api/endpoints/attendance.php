<?php
/**
 * Attendance Records API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class AttendanceHandler extends BaseHandler {
    protected string $table = 'attendance_records';
    protected array $jsonFields = [];
    protected array $boolFields = [];
    protected array $dateFields = ['date'];

    /**
     * Get attendance by slot and date
     */
    public function getBySlotAndDate(): array {
        $slotId = getQueryParam('slotId');
        $date = getQueryParam('date', getToday());

        if (empty($slotId)) {
            throw new Exception('slotId parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE slot_id = :slotId AND date = :date",
            ['slotId' => $slotId, 'date' => $date]
        );
    }

    /**
     * Get attendance by member
     */
    public function getByMember(): array {
        $memberId = getQueryParam('memberId');
        if (empty($memberId)) {
            throw new Exception('memberId parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE member_id = :memberId
             ORDER BY date DESC",
            ['memberId' => $memberId]
        );
    }

    /**
     * Get attendance by member and slot
     */
    public function getByMemberAndSlot(): array {
        $memberId = getQueryParam('memberId');
        $slotId = getQueryParam('slotId');

        if (empty($memberId) || empty($slotId)) {
            throw new Exception('memberId and slotId parameters are required');
        }

        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE member_id = :memberId AND slot_id = :slotId
             ORDER BY date DESC",
            ['memberId' => $memberId, 'slotId' => $slotId]
        );
    }

    /**
     * Get existing attendance record
     */
    public function getExisting(): ?array {
        $memberId = getQueryParam('memberId');
        $slotId = getQueryParam('slotId');
        $date = getQueryParam('date');

        if (empty($memberId) || empty($slotId) || empty($date)) {
            throw new Exception('memberId, slotId, and date parameters are required');
        }

        return $this->queryOne(
            "SELECT * FROM {$this->table}
             WHERE member_id = :memberId AND slot_id = :slotId AND date = :date",
            ['memberId' => $memberId, 'slotId' => $slotId, 'date' => $date]
        );
    }

    /**
     * Mark attendance (create or update)
     */
    public function markAttendance(): array {
        $data = getRequestBody();
        $memberId = $data['memberId'] ?? null;
        $slotId = $data['slotId'] ?? null;
        $date = $data['date'] ?? getToday();
        $status = $data['status'] ?? 'present';
        $notes = $data['notes'] ?? null;

        if (empty($memberId) || empty($slotId)) {
            throw new Exception('memberId and slotId are required');
        }

        // Validate date is not more than 3 days in the past
        $today = new DateTime();
        $attendanceDate = new DateTime($date);
        $daysDiff = $today->diff($attendanceDate)->days;
        if ($attendanceDate < $today && $daysDiff > 3) {
            throw new Exception('Cannot mark attendance for more than 3 days in the past');
        }

        // Check for existing record
        $_GET['memberId'] = $memberId;
        $_GET['slotId'] = $slotId;
        $_GET['date'] = $date;
        $existing = $this->getExisting();

        // Get active subscription for context
        $_GET['memberId'] = $memberId;
        $subscriptionHandler = new SubscriptionsHandler();
        $subscription = $subscriptionHandler->getActiveMember();
        $subscriptionId = $subscription['id'] ?? null;

        if ($existing) {
            // Update existing record
            $wasPresent = $existing['status'] === 'present';
            $isNowPresent = $status === 'present';

            // Update member's classes attended if status changed
            if (!$wasPresent && $isNowPresent) {
                // Changed to present: increment
                $this->execute(
                    "UPDATE members SET classes_attended = classes_attended + 1 WHERE id = :id",
                    ['id' => $memberId]
                );
            } else if ($wasPresent && !$isNowPresent) {
                // Changed to absent: decrement
                $this->execute(
                    "UPDATE members SET classes_attended = GREATEST(0, classes_attended - 1) WHERE id = :id",
                    ['id' => $memberId]
                );
            }

            // Update attendance record
            $this->execute(
                "UPDATE {$this->table}
                 SET status = :status, marked_at = NOW(), notes = :notes
                 WHERE id = :id",
                ['id' => $existing['id'], 'status' => $status, 'notes' => $notes]
            );

            return $this->getById($existing['id']);
        }

        // Create new record
        $id = generateUUID();
        $this->execute(
            "INSERT INTO {$this->table}
             (id, member_id, slot_id, date, status, subscription_id, marked_at, notes)
             VALUES (:id, :memberId, :slotId, :date, :status, :subscriptionId, NOW(), :notes)",
            [
                'id' => $id,
                'memberId' => $memberId,
                'slotId' => $slotId,
                'date' => $date,
                'status' => $status,
                'subscriptionId' => $subscriptionId,
                'notes' => $notes
            ]
        );

        // Increment classes attended if present
        if ($status === 'present') {
            $this->execute(
                "UPDATE members SET classes_attended = classes_attended + 1 WHERE id = :id",
                ['id' => $memberId]
            );
        }

        return $this->getById($id);
    }

    /**
     * Check if member is marked present
     */
    public function isMarkedPresent(): array {
        $existing = $this->getExisting();
        return ['isPresent' => $existing && $existing['status'] === 'present'];
    }

    /**
     * Get member summary for period
     */
    public function getMemberSummary(): array {
        $memberId = getQueryParam('memberId');
        $slotId = getQueryParam('slotId');
        $periodStart = getQueryParam('periodStart');
        $periodEnd = getQueryParam('periodEnd');

        if (empty($memberId) || empty($slotId) || empty($periodStart) || empty($periodEnd)) {
            throw new Exception('memberId, slotId, periodStart, and periodEnd parameters are required');
        }

        // Count present days
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) as count FROM {$this->table}
             WHERE member_id = :memberId AND slot_id = :slotId
             AND date >= :periodStart AND date <= :periodEnd
             AND status = 'present'"
        );
        $stmt->execute([
            'memberId' => $memberId,
            'slotId' => $slotId,
            'periodStart' => $periodStart,
            'periodEnd' => $periodEnd
        ]);
        $presentDays = (int) $stmt->fetch()['count'];

        // Calculate working days (simplified - count weekdays in subscription period overlap)
        // This would need to exclude weekends and holidays for accuracy
        $totalWorkingDays = $this->calculateWorkingDays($memberId, $slotId, $periodStart, $periodEnd);

        return [
            'presentDays' => $presentDays,
            'totalWorkingDays' => $totalWorkingDays
        ];
    }

    /**
     * Get slot attendance with member details
     */
    public function getSlotAttendanceWithMembers(): array {
        $slotId = getQueryParam('slotId');
        $date = getQueryParam('date', getToday());
        $periodStart = getQueryParam('periodStart', date('Y-m-01'));
        $periodEnd = getQueryParam('periodEnd', date('Y-m-t'));

        if (empty($slotId)) {
            throw new Exception('slotId parameter is required');
        }

        // Get active subscriptions for this slot on this date
        $subscriptions = $this->query(
            "SELECT ms.member_id, m.first_name, m.last_name, m.email, m.phone, m.classes_attended
             FROM membership_subscriptions ms
             JOIN members m ON ms.member_id = m.id
             WHERE ms.slot_id = :slotId
             AND ms.status = 'active'
             AND ms.start_date <= :date
             AND ms.end_date >= :date",
            ['slotId' => $slotId, 'date' => $date]
        );

        $results = [];
        foreach ($subscriptions as $sub) {
            // Check if marked present today
            $attendance = $this->queryOne(
                "SELECT status FROM {$this->table}
                 WHERE member_id = :memberId AND slot_id = :slotId AND date = :date",
                ['memberId' => $sub['memberId'], 'slotId' => $slotId, 'date' => $date]
            );
            $isPresent = $attendance && $attendance['status'] === 'present';

            // Get summary for period
            $_GET['memberId'] = $sub['memberId'];
            $_GET['slotId'] = $slotId;
            $_GET['periodStart'] = $periodStart;
            $_GET['periodEnd'] = $periodEnd;
            $summary = $this->getMemberSummary();

            $results[] = [
                'member' => [
                    'id' => $sub['memberId'],
                    'firstName' => $sub['firstName'],
                    'lastName' => $sub['lastName'],
                    'email' => $sub['email'],
                    'phone' => $sub['phone'],
                    'classesAttended' => (int) $sub['classesAttended']
                ],
                'isPresent' => $isPresent,
                'presentDays' => $summary['presentDays'],
                'totalWorkingDays' => $summary['totalWorkingDays']
            ];
        }

        return $results;
    }

    /**
     * Calculate working days for a member's subscription within a period
     */
    private function calculateWorkingDays(string $memberId, string $slotId, string $periodStart, string $periodEnd): int {
        // Get member's subscriptions for this slot
        $subscriptions = $this->query(
            "SELECT start_date, end_date FROM membership_subscriptions
             WHERE member_id = :memberId AND slot_id = :slotId
             AND status IN ('active', 'expired')
             AND start_date <= :periodEnd AND end_date >= :periodStart",
            ['memberId' => $memberId, 'slotId' => $slotId, 'periodStart' => $periodStart, 'periodEnd' => $periodEnd]
        );

        $workingDays = 0;
        foreach ($subscriptions as $sub) {
            // Calculate overlap between subscription and period
            $start = max(new DateTime($sub['startDate']), new DateTime($periodStart));
            $end = min(new DateTime($sub['endDate']), new DateTime($periodEnd));

            if ($start > $end) continue;

            // Count weekdays (Monday=1 to Friday=5)
            $current = clone $start;
            while ($current <= $end) {
                $dayOfWeek = (int) $current->format('N');
                if ($dayOfWeek >= 1 && $dayOfWeek <= 5) {
                    $workingDays++;
                }
                $current->modify('+1 day');
            }
        }

        return $workingDays;
    }

    /**
     * Export attendance to CSV format data
     */
    public function exportCSV(): array {
        $slotId = getQueryParam('slotId');
        $date = getQueryParam('date');

        if (empty($slotId)) {
            throw new Exception('slotId parameter is required');
        }

        $records = $date
            ? $this->getBySlotAndDate()
            : $this->query(
                "SELECT * FROM {$this->table} WHERE slot_id = :slotId ORDER BY date DESC",
                ['slotId' => $slotId]
            );

        // Enrich with member and slot names
        $enriched = [];
        foreach ($records as $record) {
            $member = $this->queryOne(
                "SELECT first_name, last_name FROM members WHERE id = :id",
                ['id' => $record['memberId']]
            );
            $slot = $this->queryOne(
                "SELECT display_name FROM session_slots WHERE id = :id",
                ['id' => $record['slotId']]
            );

            $enriched[] = [
                'date' => $record['date'],
                'memberName' => $member ? $member['firstName'] . ' ' . $member['lastName'] : 'Unknown',
                'slot' => $slot['displayName'] ?? 'Unknown',
                'status' => $record['status'],
                'markedAt' => $record['markedAt']
            ];
        }

        return $enriched;
    }
}

// Include subscriptions handler for getting active subscription
require_once __DIR__ . '/subscriptions.php';
