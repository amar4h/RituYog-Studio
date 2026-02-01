<?php
/**
 * Products API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class ProductsHandler extends BaseHandler {
    protected string $table = 'products';
    protected array $jsonFields = [];
    protected array $boolFields = ['is_active'];
    protected array $dateFields = [];

    /**
     * Get product by SKU
     */
    public function getBySku(): ?array {
        $sku = getQueryParam('sku');
        if (empty($sku)) {
            throw new Exception('SKU parameter is required');
        }

        return $this->queryOne(
            "SELECT * FROM {$this->table} WHERE sku = :sku",
            ['sku' => $sku]
        );
    }

    /**
     * Get products by category
     */
    public function getByCategory(): array {
        $category = getQueryParam('category');
        if (empty($category)) {
            throw new Exception('Category parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE category = :category ORDER BY name",
            ['category' => $category]
        );
    }

    /**
     * Get active products
     */
    public function getActive(): array {
        return $this->query(
            "SELECT * FROM {$this->table} WHERE is_active = 1 ORDER BY name"
        );
    }

    /**
     * Get low stock products
     */
    public function getLowStock(): array {
        return $this->query(
            "SELECT * FROM {$this->table} WHERE is_active = 1 AND current_stock <= low_stock_threshold ORDER BY current_stock ASC"
        );
    }

    /**
     * Search products
     */
    public function search(): array {
        $query = getQueryParam('query', '');
        if (empty($query)) {
            return $this->getAll();
        }

        $searchTerm = '%' . $query . '%';
        return $this->query(
            "SELECT * FROM {$this->table} WHERE name LIKE :q OR sku LIKE :q OR description LIKE :q ORDER BY name",
            ['q' => $searchTerm]
        );
    }

    /**
     * Get total stock value
     */
    public function getStockValue(): array {
        $sql = "SELECT SUM(current_stock * cost_price) as total_value FROM {$this->table} WHERE is_active = 1";
        $stmt = $this->db->query($sql);
        $result = $stmt->fetch();
        return ['totalValue' => (float) ($result['total_value'] ?? 0)];
    }

    /**
     * Update stock level
     */
    public function updateStock(string $id): ?array {
        if (empty($id)) {
            throw new Exception('ID is required');
        }

        $data = getRequestBody();
        if (!isset($data['currentStock'])) {
            throw new Exception('currentStock is required');
        }

        $sql = "UPDATE {$this->table} SET current_stock = :stock, updated_at = NOW() WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'stock' => (int) $data['currentStock'],
            'id' => $id
        ]);

        return $this->getById($id);
    }
}
