<?php
/**
 * Notification Logs API Handler
 * Tracks WhatsApp notification attempts (pending, sent, cancelled)
 */

require_once __DIR__ . '/BaseHandler.php';

class NotificationLogsHandler extends BaseHandler {
    protected string $table = 'notification_logs';
    protected array $dateFields = ['sent_at'];

    /**
     * Get all pending notifications
     */
    public function getPending(): array {
        $sql = "SELECT * FROM {$this->table} WHERE status = 'pending' ORDER BY created_at DESC";
        $stmt = $this->db->query($sql);
        $results = $stmt->fetchAll();
        return array_map([$this, 'transformFromDb'], $results);
    }

    /**
     * Get notifications by type
     */
    public function getByType(): array {
        $type = $_GET['type'] ?? null;
        if (!$type) {
            throw new Exception('Type parameter is required');
        }

        $sql = "SELECT * FROM {$this->table} WHERE type = :type ORDER BY created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['type' => $type]);
        $results = $stmt->fetchAll();
        return array_map([$this, 'transformFromDb'], $results);
    }

    /**
     * Get notifications by recipient
     */
    public function getByRecipient(): array {
        $recipientType = $_GET['recipientType'] ?? null;
        $recipientId = $_GET['recipientId'] ?? null;

        if (!$recipientType || !$recipientId) {
            throw new Exception('recipientType and recipientId parameters are required');
        }

        $sql = "SELECT * FROM {$this->table} WHERE recipient_type = :recipientType AND recipient_id = :recipientId ORDER BY created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['recipientType' => $recipientType, 'recipientId' => $recipientId]);
        $results = $stmt->fetchAll();
        return array_map([$this, 'transformFromDb'], $results);
    }

    /**
     * Mark notification as sent
     */
    public function markSent(): array {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            throw new Exception('ID parameter is required');
        }

        $sql = "UPDATE {$this->table} SET status = 'sent', sent_at = NOW() WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);

        return $this->getById($id);
    }

    /**
     * Mark notification as cancelled
     */
    public function cancel(): array {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            throw new Exception('ID parameter is required');
        }

        $sql = "UPDATE {$this->table} SET status = 'cancelled' WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);

        return $this->getById($id);
    }

    /**
     * Get notification counts by status
     */
    public function getCounts(): array {
        $sql = "SELECT
                    type,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
                FROM {$this->table}
                GROUP BY type";
        $stmt = $this->db->query($sql);
        $results = $stmt->fetchAll();

        // Transform to keyed object
        $counts = [];
        foreach ($results as $row) {
            $counts[$row['type']] = [
                'pending' => (int) $row['pending'],
                'sent' => (int) $row['sent'],
                'cancelled' => (int) $row['cancelled'],
            ];
        }
        return $counts;
    }

    /**
     * Bulk mark as sent
     */
    public function bulkMarkSent(): array {
        $data = getRequestBody();
        $ids = $data['ids'] ?? [];

        if (empty($ids)) {
            throw new Exception('ids array is required');
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $sql = "UPDATE {$this->table} SET status = 'sent', sent_at = NOW() WHERE id IN ($placeholders)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($ids);

        return ['updated' => count($ids)];
    }
}
