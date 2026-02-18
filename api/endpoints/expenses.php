<?php
/**
 * Expenses API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class ExpensesHandler extends BaseHandler {
    protected string $table = 'expenses';
    protected array $jsonFields = ['items'];
    protected array $boolFields = ['is_recurring'];
    protected array $dateFields = ['expense_date', 'due_date', 'paid_date'];
    protected array $numericFields = ['amount', 'tax_amount', 'shipping_cost', 'total_amount', 'amount_paid'];

    /**
     * Get expenses by category
     */
    public function getByCategory(): array {
        $category = getQueryParam('category');
        if (empty($category)) {
            throw new Exception('Category parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE category = :category ORDER BY expense_date DESC",
            ['category' => $category]
        );
    }

    /**
     * Get expenses by vendor
     */
    public function getByVendor(): array {
        $vendorName = getQueryParam('vendorName');
        if (empty($vendorName)) {
            throw new Exception('vendorName parameter is required');
        }

        $searchTerm = '%' . $vendorName . '%';
        return $this->query(
            "SELECT * FROM {$this->table} WHERE vendor_name LIKE :vendorName ORDER BY expense_date DESC",
            ['vendorName' => $searchTerm]
        );
    }

    /**
     * Get expenses by date range
     */
    public function getByDateRange(): array {
        $startDate = getQueryParam('startDate');
        $endDate = getQueryParam('endDate');

        if (empty($startDate) || empty($endDate)) {
            throw new Exception('startDate and endDate parameters are required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE expense_date >= :startDate AND expense_date <= :endDate ORDER BY expense_date DESC",
            ['startDate' => $startDate, 'endDate' => $endDate]
        );
    }

    /**
     * Get pending expenses
     */
    public function getPending(): array {
        return $this->query(
            "SELECT * FROM {$this->table} WHERE payment_status IN ('pending', 'partial') ORDER BY expense_date DESC"
        );
    }

    /**
     * Get recurring expenses
     */
    public function getRecurring(): array {
        return $this->query(
            "SELECT * FROM {$this->table} WHERE is_recurring = 1 ORDER BY expense_date DESC"
        );
    }

    /**
     * Generate expense number
     */
    public function generateNumber(): array {
        // Get settings for prefix and start number
        require_once __DIR__ . '/settings.php';
        $settingsHandler = new SettingsHandler();
        $settings = $settingsHandler->get();

        $prefix = $settings['expensePrefix'] ?? 'EXP';
        $startNumber = $settings['expenseStartNumber'] ?? 1;

        // Find highest existing number
        $sql = "SELECT expense_number FROM {$this->table} WHERE expense_number LIKE :pattern";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['pattern' => $prefix . '-%']);
        $results = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $maxNum = 0;
        foreach ($results as $num) {
            if (preg_match('/' . preg_quote($prefix) . '-(\d+)/', $num, $matches)) {
                $parsed = (int) $matches[1];
                if ($parsed > $maxNum) {
                    $maxNum = $parsed;
                }
            }
        }

        // Next number is max of (highest existing, startNumber - 1) + 1
        $nextNumber = max($maxNum, $startNumber - 1) + 1;
        $expenseNumber = $prefix . '-' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);

        return ['expenseNumber' => $expenseNumber];
    }

    /**
     * Get total expenses by category for a period
     */
    public function getTotalByCategory(): array {
        $startDate = getQueryParam('startDate');
        $endDate = getQueryParam('endDate');

        if (empty($startDate) || empty($endDate)) {
            throw new Exception('startDate and endDate parameters are required');
        }

        $sql = "SELECT category, SUM(total_amount) as total
                FROM {$this->table}
                WHERE expense_date >= :startDate AND expense_date <= :endDate
                GROUP BY category";

        $stmt = $this->db->prepare($sql);
        $stmt->execute(['startDate' => $startDate, 'endDate' => $endDate]);
        $results = $stmt->fetchAll();

        // Convert to associative array
        $totals = [];
        foreach ($results as $row) {
            $totals[$row['category']] = (float) $row['total'];
        }

        return $totals;
    }

    /**
     * Get monthly expense totals
     */
    public function getMonthlyTotals(): array {
        $months = (int) getQueryParam('months', 6);

        $sql = "SELECT
                    DATE_FORMAT(expense_date, '%Y-%m') as month,
                    SUM(total_amount) as total
                FROM {$this->table}
                WHERE expense_date >= DATE_SUB(CURDATE(), INTERVAL :months MONTH)
                GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
                ORDER BY month ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute(['months' => $months]);
        $results = $stmt->fetchAll();

        return $results;
    }

    /**
     * Record payment for an expense
     */
    public function recordPayment(string $id): ?array {
        if (empty($id)) {
            throw new Exception('ID is required');
        }

        $data = getRequestBody();
        if (!isset($data['amount'])) {
            throw new Exception('amount is required');
        }

        // Get current expense
        $expense = $this->getById($id);
        if (!$expense) {
            throw new Exception('Expense not found');
        }

        $newAmountPaid = $expense['amountPaid'] + (float) $data['amount'];
        $today = date('Y-m-d');

        $paymentStatus = 'partial';
        if ($newAmountPaid >= $expense['totalAmount']) {
            $paymentStatus = 'paid';
        }

        $sql = "UPDATE {$this->table} SET
                    amount_paid = :amountPaid,
                    payment_status = :paymentStatus,
                    payment_method = :paymentMethod,
                    payment_reference = :paymentReference,
                    paid_date = :paidDate,
                    updated_at = NOW()
                WHERE id = :id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'amountPaid' => $newAmountPaid,
            'paymentStatus' => $paymentStatus,
            'paymentMethod' => $data['paymentMethod'] ?? null,
            'paymentReference' => $data['paymentReference'] ?? null,
            'paidDate' => $paymentStatus === 'paid' ? $today : null,
            'id' => $id
        ]);

        return $this->getById($id);
    }

    /**
     * Get total expenses for a period
     */
    public function getTotal(): array {
        $startDate = getQueryParam('startDate');
        $endDate = getQueryParam('endDate');

        if (empty($startDate) || empty($endDate)) {
            throw new Exception('startDate and endDate parameters are required');
        }

        $sql = "SELECT SUM(total_amount) as total FROM {$this->table}
                WHERE expense_date >= :startDate AND expense_date <= :endDate";

        $stmt = $this->db->prepare($sql);
        $stmt->execute(['startDate' => $startDate, 'endDate' => $endDate]);
        $result = $stmt->fetch();

        return ['total' => (float) ($result['total'] ?? 0)];
    }
}
