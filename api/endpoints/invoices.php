<?php
/**
 * Invoices API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class InvoicesHandler extends BaseHandler {
    protected string $table = 'invoices';
    protected array $jsonFields = ['items'];
    protected array $boolFields = [];
    protected array $dateFields = ['invoice_date', 'due_date', 'paid_date'];

    /**
     * Override create to ensure items is properly formatted
     * Also handles race condition where subscription might not exist yet
     */
    public function create(): array {
        $data = getRequestBody();
        $data['id'] = $data['id'] ?? generateUUID();

        // Ensure items is a valid array before processing
        if (!isset($data['items']) || !is_array($data['items'])) {
            $data['items'] = [];
        }

        // Clean items array - ensure all values are properly typed
        $cleanItems = [];
        foreach ($data['items'] as $item) {
            $cleanItems[] = [
                'description' => (string)($item['description'] ?? ''),
                'quantity' => (int)($item['quantity'] ?? 1),
                'unitPrice' => (float)($item['unitPrice'] ?? 0),
                'total' => (float)($item['total'] ?? 0),
            ];
        }
        $data['items'] = $cleanItems;

        // Handle race condition: subscription might not exist yet in DB
        // If subscriptionId is provided, check if it exists
        // If not, set to null (foreign key allows null) - will be synced later
        if (!empty($data['subscriptionId'])) {
            $stmt = $this->db->prepare("SELECT id FROM membership_subscriptions WHERE id = :id");
            $stmt->execute(['id' => $data['subscriptionId']]);
            if (!$stmt->fetch()) {
                // Subscription doesn't exist yet, set to null to avoid FK constraint error
                $data['subscriptionId'] = null;
            }
        }

        // Use parent's create logic but with cleaned data
        $transformed = $this->transformToDb($data);

        // Get valid columns from the table
        $validColumns = $this->getTableColumns();

        // Filter out invalid columns and remove created_at/updated_at (auto-managed)
        $filtered = [];
        foreach ($transformed as $column => $value) {
            if (in_array($column, $validColumns) && !in_array($column, ['created_at', 'updated_at'])) {
                $filtered[$column] = $value;
            }
        }

        // Build insert query
        $columns = array_keys($filtered);
        $placeholders = array_map(fn($col) => ':' . $col, $columns);

        $sql = sprintf(
            "INSERT INTO %s (%s) VALUES (%s)",
            $this->table,
            implode(', ', $columns),
            implode(', ', $placeholders)
        );

        $stmt = $this->db->prepare($sql);
        $stmt->execute($filtered);

        return $this->getById($data['id']);
    }

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
        // Get settings for prefix and starting number
        $settings = $this->queryOne("SELECT * FROM studio_settings WHERE id = 1");
        $prefix = $settings['invoice_prefix'] ?? 'INV';
        $startNumber = (int) ($settings['invoice_start_number'] ?? 1);

        // Find the highest invoice number (extract numeric part after prefix)
        // SUBSTRING starts at position after "INV-" (prefix length + 2 for the dash)
        $prefixLen = strlen($prefix) + 2;
        $stmt = $this->db->prepare(
            "SELECT MAX(CAST(SUBSTRING(invoice_number, {$prefixLen}) AS UNSIGNED)) as max_num
             FROM {$this->table}
             WHERE invoice_number LIKE :pattern"
        );
        $stmt->execute(['pattern' => $prefix . '-%']);
        $result = $stmt->fetch();
        $maxNum = (int) ($result['max_num'] ?? 0);

        // Next number is max of (highest existing, startNumber - 1) + 1
        $nextNumber = max($maxNum, $startNumber - 1) + 1;
        return ['invoiceNumber' => $prefix . '-' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT)];
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
