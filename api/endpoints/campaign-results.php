<?php
/**
 * Campaign Results Endpoint
 *
 * Public endpoint (no API key required) that returns
 * campaign attendance data for the promo/winners page.
 */

require_once __DIR__ . '/BaseHandler.php';

class CampaignResultsHandler extends BaseHandler
{
    protected string $table = 'attendance_records';

    /**
     * GET /api/campaign-results/getResults?start=2026-01-23&end=2026-02-28
     *
     * Returns per-batch attendance data for the campaign period.
     * Public endpoint — no API key needed.
     */
    public function getResults(): array
    {
        $campaignStart = getQueryParam('start', '');
        $campaignEnd   = getQueryParam('end', '');

        if (empty($campaignStart) || empty($campaignEnd)) {
            throw new \Exception('start and end query params are required (YYYY-MM-DD)');
        }

        // Clamp end to today if campaign is still running
        $today = date('Y-m-d');
        $effectiveEnd = $campaignEnd <= $today ? $campaignEnd : $today;

        // 1. Get all active slots (sorted by start_time)
        $stmtSlots = $this->db->query(
            "SELECT id, display_name, start_time FROM session_slots WHERE is_active = 1 ORDER BY start_time"
        );
        $slots = $stmtSlots->fetchAll();

        // 2. Get holidays and extra working days from settings
        $stmtSettings = $this->db->query("SELECT holidays, extra_working_days FROM studio_settings WHERE id = 1");
        $settingsRow = $stmtSettings->fetch();
        $holidays = [];
        if ($settingsRow && !empty($settingsRow['holidays'])) {
            $holidayList = json_decode($settingsRow['holidays'], true) ?: [];
            foreach ($holidayList as $h) {
                $holidays[] = $h['date'] ?? '';
            }
        }
        $extraWorkingDaySet = [];
        if ($settingsRow && !empty($settingsRow['extra_working_days'])) {
            $extraList = json_decode($settingsRow['extra_working_days'], true) ?: [];
            foreach ($extraList as $d) {
                $extraWorkingDaySet[$d['date'] ?? ''] = true;
            }
        }

        // 3. Count working days (Mon-Fri + extra working days, excluding holidays) in period
        $totalSessions = 0;
        $d = new \DateTime($campaignStart);
        $endDt = new \DateTime($effectiveEnd);
        while ($d <= $endDt) {
            $dow = (int) $d->format('N'); // 1=Mon..7=Sun
            $ds = $d->format('Y-m-d');
            if (isset($extraWorkingDaySet[$ds]) || ($dow <= 5 && !in_array($ds, $holidays))) {
                $totalSessions++;
            }
            $d->modify('+1 day');
        }

        // 4. Find members who had a subscription overlapping the campaign period
        //    Use the latest subscription to determine slot assignment
        $stmtSubs = $this->db->prepare(
            "SELECT member_id, slot_id, end_date
             FROM membership_subscriptions
             WHERE (status = 'active' OR status = 'expired')
               AND start_date <= :effectiveEnd
               AND end_date >= :campaignStart
             ORDER BY end_date DESC"
        );
        $stmtSubs->execute([
            'effectiveEnd' => $effectiveEnd,
            'campaignStart' => $campaignStart,
        ]);
        $allSubs = $stmtSubs->fetchAll();

        // Latest subscription per member (determines batch)
        $memberSlot = [];
        foreach ($allSubs as $sub) {
            $mid = $sub['member_id'];
            if (!isset($memberSlot[$mid]) || $sub['end_date'] > $memberSlot[$mid]) {
                $memberSlot[$mid] = $sub['slot_id'];
            }
        }

        // 5. Get member names
        $memberIds = array_keys($memberSlot);
        if (empty($memberIds)) {
            return ['totalSessions' => $totalSessions, 'batches' => []];
        }

        $placeholders = implode(',', array_fill(0, count($memberIds), '?'));
        $stmtMembers = $this->db->prepare(
            "SELECT id, first_name, last_name FROM members WHERE id IN ($placeholders)"
        );
        $stmtMembers->execute(array_values($memberIds));
        $membersRows = $stmtMembers->fetchAll();
        $memberNames = [];
        foreach ($membersRows as $row) {
            $memberNames[$row['id']] = trim($row['first_name'] . ' ' . $row['last_name']);
        }

        // 6. Count present days per member in campaign period
        $stmtAttendance = $this->db->prepare(
            "SELECT member_id, COUNT(DISTINCT date) as present_days
             FROM attendance_records
             WHERE member_id IN ($placeholders)
               AND status = 'present'
               AND date >= ?
               AND date <= ?
             GROUP BY member_id"
        );
        $params = array_values($memberIds);
        $params[] = $campaignStart;
        $params[] = $effectiveEnd;
        $stmtAttendance->execute($params);
        $attendanceRows = $stmtAttendance->fetchAll();
        $attendanceCounts = [];
        foreach ($attendanceRows as $row) {
            $attendanceCounts[$row['member_id']] = (int) $row['present_days'];
        }

        // 7. Group members by slot and build batch data
        $slotMembers = [];
        foreach ($memberSlot as $mid => $slotId) {
            if (!isset($slotMembers[$slotId])) {
                $slotMembers[$slotId] = [];
            }
            $slotMembers[$slotId][] = $mid;
        }

        $batches = [];
        foreach ($slots as $slot) {
            $slotId = $slot['id'];
            $mids = $slotMembers[$slotId] ?? [];
            if (empty($mids)) continue;

            $memberData = [];
            foreach ($mids as $mid) {
                $count = $attendanceCounts[$mid] ?? 0;
                $memberData[] = [
                    'name'       => $memberNames[$mid] ?? 'Unknown',
                    'attendance' => $count,
                    'percentage' => $totalSessions > 0 ? round(($count / $totalSessions) * 100) : 0,
                    'isWinner'   => false,
                ];
            }

            // Sort by attendance descending
            usort($memberData, function ($a, $b) {
                return $b['attendance'] - $a['attendance'];
            });

            // Mark ALL members tied at the top as winners (lucky draw for ties)
            if (!empty($memberData) && $memberData[0]['attendance'] > 0) {
                $topCount = $memberData[0]['attendance'];
                for ($i = 0; $i < count($memberData); $i++) {
                    if ($memberData[$i]['attendance'] === $topCount) {
                        $memberData[$i]['isWinner'] = true;
                    } else {
                        break;
                    }
                }
            }

            $batches[] = [
                'name'          => $slot['display_name'],
                'slotId'        => $slotId,
                'totalSessions' => $totalSessions,
                'members'       => $memberData,
            ];
        }

        return [
            'totalSessions' => $totalSessions,
            'batches'       => $batches,
        ];
    }
}
