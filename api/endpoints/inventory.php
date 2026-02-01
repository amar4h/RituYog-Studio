<?php
/**
 * Inventory Transactions API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class InventoryHandler extends BaseHandler {
    protected string $table = 'inventory_transactions';
    protected array $jsonFields = [];
    protected array $boolFields = [];
    protected array $dateFields = ['transaction_date'];
    protected array $numericFields = ['quantity', 'unit_cost', 'total_value', 'previous_stock', 'new_stock'];

    /**
     * Create new inventory transaction
     * Override to handle FK constraints gracefully
     */
    public function create(): array {
        $data = getRequestBody();
        $data['id'] = $data['id'] ?? generateUUID();

        // Check if invoice exists before setting FK (race condition handling)
        if (!empty($data['invoiceId'])) {
            $stmt = $this->db->prepare("SELECT id FROM invoices WHERE id = :id");
            $stmt->execute(['id' => $data['invoiceId']]);
            if (!$stmt->fetch()) {
                // Invoice doesn't exist yet, set to null to avoid FK constraint error
                $data['invoiceId'] = null;
            }
        }

        // Check if expense exists before setting FK
        if (!empty($data['expenseId'])) {
            $stmt = $this->db->prepare("SELECT id FROM expenses WHERE id = :id");
            $stmt->execute(['id' => $data['expenseId']]);
            if (!$stmt->fetch()) {
                $data['expenseId'] = null;
            }
        }

        // Check if product exists (required FK)
        if (!empty($data['productId'])) {
            $stmt = $this->db->prepare("SELECT id FROM products WHERE id = :id");
            $stmt->execute(['id' => $data['productId']]);
            if (!$stmt->fetch()) {
                throw new Exception('Product not found: ' . $data['productId']);
            }
        }

        // Transform and insert
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
     * Get transactions by product
     */
    public function getByProduct(): array {
        $productId = getQueryParam('productId');
        if (empty($productId)) {
            throw new Exception('productId parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE product_id = :productId ORDER BY transaction_date DESC, created_at DESC",
            ['productId' => $productId]
        );
    }

    /**
     * Get transactions by type
     */
    public function getByType(): array {
        $type = getQueryParam('type');
        if (empty($type)) {
            throw new Exception('type parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE type = :type ORDER BY transaction_date DESC",
            ['type' => $type]
        );
    }

    /**
     * Get transactions by date range
     */
    public function getByDateRange(): array {
        $startDate = getQueryParam('startDate');
        $endDate = getQueryParam('endDate');

        if (empty($startDate) || empty($endDate)) {
            throw new Exception('startDate and endDate parameters are required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE transaction_date >= :startDate AND transaction_date <= :endDate ORDER BY transaction_date DESC",
            ['startDate' => $startDate, 'endDate' => $endDate]
        );
    }

    /**
     * Get Cost of Goods Sold for a period
     */
    public function getCostOfGoodsSold(): array {
        $startDate = getQueryParam('startDate');
        $endDate = getQueryParam('endDate');

        if (empty($startDate) || empty($endDate)) {
            throw new Exception('startDate and endDate parameters are required');
        }

        $sql = "SELECT SUM(total_value) as cogs FROM {$this->table}
                WHERE type = 'sale'
                AND transaction_date >= :startDate
                AND transaction_date <= :endDate";

        $stmt = $this->db->prepare($sql);
        $stmt->execute(['startDate' => $startDate, 'endDate' => $endDate]);
        $result = $stmt->fetch();

        return ['cogs' => (float) ($result['cogs'] ?? 0)];
    }

    /**
     * Get transactions by expense
     */
    public function getByExpense(): array {
        $expenseId = getQueryParam('expenseId');
        if (empty($expenseId)) {
            throw new Exception('expenseId parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE expense_id = :expenseId ORDER BY created_at DESC",
            ['expenseId' => $expenseId]
        );
    }

    /**
     * Get transactions by invoice
     */
    public function getByInvoice(): array {
        $invoiceId = getQueryParam('invoiceId');
        if (empty($invoiceId)) {
            throw new Exception('invoiceId parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE invoice_id = :invoiceId ORDER BY created_at DESC",
            ['invoiceId' => $invoiceId]
        );
    }

    /**
     * Get stock movement summary for a product
     */
    public function getProductSummary(): array {
        $productId = getQueryParam('productId');
        if (empty($productId)) {
            throw new Exception('productId parameter is required');
        }

        $sql = "SELECT
                    type,
                    SUM(ABS(quantity)) as total_quantity,
                    SUM(total_value) as total_value,
                    COUNT(*) as transaction_count
                FROM {$this->table}
                WHERE product_id = :productId
                GROUP BY type";

        $stmt = $this->db->prepare($sql);
        $stmt->execute(['productId' => $productId]);
        $results = $stmt->fetchAll();

        return $results;
    }
}
