<?php
/**
 * Invoices API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class InvoicesHandler extends BaseHandler {
    protected string $table = 'invoices';
    protected array $jsonFields = ['items'];
    protected array $boolFields = [];

    /**
     * Get invoices by member
     */
    public function getByMember(): array {
        $memberId = getQueryParam('memberId');
        if (empty($memberId)) {
            throw new Exception('memberId parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE member_id = :memberId
             ORDER BY invoice_date DESC",
            ['memberId' => $memberId]
        );
    }

    /**
     * Get pending invoices (not fully paid)
     */
    public function getPending(): array {
        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE status IN ('sent', 'partially-paid', 'overdue')
             ORDER BY due_date ASC"
        );
    }

    /**
     * Get overdue invoices
     */
    public function getOverdue(): array {
        $today = getToday();
        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE status IN ('sent', 'partially-paid')
             AND due_date < :today
             ORDER BY due_date ASC",
            ['today' => $today]
        );
    }

    /**
     * Get invoice by subscription
     */
    public function getBySubscription(): ?array {
        $subscriptionId = getQueryParam('subscriptionId');
        if (empty($subscriptionId)) {
            throw new Exception('subscriptionId parameter is required');
        }

        return $this->queryOne(
            "SELECT * FROM {$this->table} WHERE subscription_id = :subscriptionId",
            ['subscriptionId' => $subscriptionId]
        );
    }

    /**
     * Generate next invoice number
     */
    public function generateNumber(): array {
        // Get settings for prefix
        $settings = $this->queryOne("SELECT * FROM studio_settings WHERE id = 1");
        $prefix = $settings['invoicePrefix'] ?? 'INV';

        // Count existing invoices
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM {$this->table}");
        $count = (int) $stmt->fetch()['count'];

        $nextNumber = str_pad($count + 1, 5, '0', STR_PAD_LEFT);
        return ['invoiceNumber' => $prefix . '-' . $nextNumber];
    }

    /**
     * Update payment status on invoice
     */
    public function updatePaymentStatus(string $id): array {
        $data = getRequestBody();

        $amountPaid = $data['amountPaid'] ?? 0;
        $status = $data['status'] ?? 'partially-paid';
        $paymentMethod = $data['paymentMethod'] ?? null;
        $paymentReference = $data['paymentReference'] ?? null;
        $paidDate = $data['paidDate'] ?? null;

        $sql = "UPDATE {$this->table}
                SET amount_paid = :amountPaid,
                    status = :status";
        $params = ['id' => $id, 'amountPaid' => $amountPaid, 'status' => $status];

        if ($paymentMethod) {
            $sql .= ", payment_method = :paymentMethod";
            $params['paymentMethod'] = $paymentMethod;
        }
        if ($paymentReference) {
            $sql .= ", payment_reference = :paymentReference";
            $params['paymentReference'] = $paymentReference;
        }
        if ($paidDate) {
            $sql .= ", paid_date = :paidDate";
            $params['paidDate'] = $paidDate;
        }

        $sql .= " WHERE id = :id";
        $this->execute($sql, $params);

        return $this->getById($id);
    }
}
