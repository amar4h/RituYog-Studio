<?php
/**
 * Payments API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class PaymentsHandler extends BaseHandler {
    protected string $table = 'payments';
    protected array $jsonFields = [];
    protected array $boolFields = [];
    protected array $dateFields = ['payment_date'];
    protected array $numericFields = ['amount'];

    /**
     * Get payments by invoice
     */
    public function getByInvoice(): array {
        $invoiceId = getQueryParam('invoiceId');
        if (empty($invoiceId)) {
            throw new Exception('invoiceId parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE invoice_id = :invoiceId
             ORDER BY payment_date DESC",
            ['invoiceId' => $invoiceId]
        );
    }

    /**
     * Get payments by member
     */
    public function getByMember(): array {
        $memberId = getQueryParam('memberId');
        if (empty($memberId)) {
            throw new Exception('memberId parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE member_id = :memberId
             ORDER BY payment_date DESC",
            ['memberId' => $memberId]
        );
    }

    /**
     * Generate next receipt number
     */
    public function generateReceiptNumber(): array {
        // Get settings for prefix and starting number
        $settings = $this->queryOne("SELECT * FROM studio_settings WHERE id = 1");
        $prefix = $settings['receipt_prefix'] ?? 'RCP';
        $startNumber = (int) ($settings['receipt_start_number'] ?? 1);

        // Find the highest receipt number (extract numeric part after prefix)
        $prefixLen = strlen($prefix) + 2;
        $stmt = $this->db->prepare(
            "SELECT MAX(CAST(SUBSTRING(receipt_number, {$prefixLen}) AS UNSIGNED)) as max_num
             FROM {$this->table}
             WHERE receipt_number LIKE :pattern"
        );
        $stmt->execute(['pattern' => $prefix . '-%']);
        $result = $stmt->fetch();
        $maxNum = (int) ($result['max_num'] ?? 0);

        // Next number is max of (highest existing, startNumber - 1) + 1
        $nextNumber = max($maxNum, $startNumber - 1) + 1;
        return ['receiptNumber' => $prefix . '-' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT)];
    }

    /**
     * Get revenue for a date range
     */
    public function getRevenue(): array {
        $startDate = getQueryParam('startDate');
        $endDate = getQueryParam('endDate');

        if (empty($startDate) || empty($endDate)) {
            throw new Exception('startDate and endDate parameters are required');
        }

        $stmt = $this->db->prepare(
            "SELECT COALESCE(SUM(amount), 0) as total
             FROM {$this->table}
             WHERE status = 'completed'
             AND payment_date >= :startDate
             AND payment_date <= :endDate"
        );
        $stmt->execute(['startDate' => $startDate, 'endDate' => $endDate]);
        $result = $stmt->fetch();

        return ['revenue' => (float) $result['total']];
    }

    /**
     * Get payment statistics
     */
    public function getStats(): array {
        $startDate = getQueryParam('startDate', date('Y-m-01'));
        $endDate = getQueryParam('endDate', date('Y-m-t'));

        // Total revenue in period
        $stmt = $this->db->prepare(
            "SELECT COALESCE(SUM(amount), 0) as total
             FROM {$this->table}
             WHERE status = 'completed'
             AND payment_date >= :startDate
             AND payment_date <= :endDate"
        );
        $stmt->execute(['startDate' => $startDate, 'endDate' => $endDate]);
        $revenue = (float) $stmt->fetch()['total'];

        // Payment count by method
        $stmt = $this->db->prepare(
            "SELECT payment_method, COUNT(*) as count, SUM(amount) as total
             FROM {$this->table}
             WHERE status = 'completed'
             AND payment_date >= :startDate
             AND payment_date <= :endDate
             GROUP BY payment_method"
        );
        $stmt->execute(['startDate' => $startDate, 'endDate' => $endDate]);
        $byMethod = $stmt->fetchAll();

        return [
            'period' => ['startDate' => $startDate, 'endDate' => $endDate],
            'totalRevenue' => $revenue,
            'byPaymentMethod' => $byMethod
        ];
    }
}
