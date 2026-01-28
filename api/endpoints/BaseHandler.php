<?php
/**
 * Base Handler - Common CRUD operations for all entities
 */

abstract class BaseHandler {
    protected PDO $db;
    protected string $table;
    protected array $jsonFields = [];
    protected array $dateFields = [];      // DATE columns (YYYY-MM-DD)
    protected array $datetimeFields = [];  // DATETIME columns (YYYY-MM-DD HH:MM:SS)
    protected array $boolFields = [];

    public function __construct() {
        $this->db = getDB();
    }

    /**
     * Get all records
     */
    public function getAll(): array {
        $sql = "SELECT * FROM {$this->table} ORDER BY created_at DESC";
        $stmt = $this->db->query($sql);
        $results = $stmt->fetchAll();

        return array_map([$this, 'transformFromDb'], $results);
    }

    /**
     * Get record by ID
     */
    public function getById(string $id): ?array {
        if (empty($id)) {
            throw new Exception('ID is required');
        }

        $sql = "SELECT * FROM {$this->table} WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();

        return $result ? $this->transformFromDb($result) : null;
    }

    /**
     * Create new record
     */
    public function create(): array {
        $data = getRequestBody();
        $data['id'] = $data['id'] ?? generateUUID();

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
     * Get table column names
     */
    protected function getTableColumns(): array {
        $sql = "DESCRIBE {$this->table}";
        $stmt = $this->db->query($sql);
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
        return $columns;
    }

    /**
     * Update record
     */
    public function update(string $id): ?array {
        if (empty($id)) {
            throw new Exception('ID is required');
        }

        $data = getRequestBody();
        $data['id'] = $id; // Ensure ID is preserved

        $transformed = $this->transformToDb($data);

        // Get valid columns from the table
        $validColumns = $this->getTableColumns();

        // Filter out invalid columns and auto-managed columns
        $filtered = [];
        foreach ($transformed as $column => $value) {
            if (in_array($column, $validColumns) && !in_array($column, ['created_at', 'updated_at'])) {
                $filtered[$column] = $value;
            }
        }

        // Build update query
        $setParts = [];
        foreach ($filtered as $column => $value) {
            if ($column !== 'id') {
                $setParts[] = "$column = :$column";
            }
        }

        $sql = sprintf(
            "UPDATE %s SET %s WHERE id = :id",
            $this->table,
            implode(', ', $setParts)
        );

        $stmt = $this->db->prepare($sql);
        $stmt->execute($filtered);

        return $this->getById($id);
    }

    /**
     * Delete record
     */
    public function delete(string $id): array {
        if (empty($id)) {
            throw new Exception('ID is required');
        }

        $sql = "DELETE FROM {$this->table} WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);

        return ['deleted' => $stmt->rowCount() > 0];
    }

    /**
     * Transform data from database to API format
     * Converts snake_case to camelCase and parses JSON fields
     */
    protected function transformFromDb(array $row): array {
        $result = [];

        foreach ($row as $key => $value) {
            $camelKey = $this->snakeToCamel($key);

            // Parse JSON fields
            if (in_array($key, $this->jsonFields) && is_string($value)) {
                $value = json_decode($value, true) ?? [];
            }

            // Convert boolean fields
            if (in_array($key, $this->boolFields)) {
                $value = (bool) $value;
            }

            $result[$camelKey] = $value;
        }

        return $result;
    }

    /**
     * Transform data from API format to database
     * Converts camelCase to snake_case and encodes JSON fields
     */
    protected function transformToDb(array $data): array {
        $result = [];

        foreach ($data as $key => $value) {
            $snakeKey = $this->camelToSnake($key);

            // Encode JSON fields - always encode for MariaDB compatibility
            if (in_array($snakeKey, $this->jsonFields)) {
                // If already a string, validate it's valid JSON and re-encode
                if (is_string($value)) {
                    $decoded = json_decode($value, true);
                    // If invalid JSON string, treat as empty array
                    $value = json_encode($decoded ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                } elseif (is_null($value)) {
                    // Default to empty array for null values
                    $value = '[]';
                } else {
                    // Encode arrays/objects
                    $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                }
                // Ensure we never have false (encoding error)
                if ($value === false) {
                    $value = '[]';
                }
            }

            // Convert boolean to int for database
            if (in_array($snakeKey, $this->boolFields)) {
                $value = $value ? 1 : 0;
            }

            // Convert ISO date strings to MySQL DATE format (YYYY-MM-DD)
            if (in_array($snakeKey, $this->dateFields) && !empty($value) && is_string($value)) {
                // Handle ISO format: 2026-01-28T18:30:45.123Z -> 2026-01-28
                if (strpos($value, 'T') !== false) {
                    $value = substr($value, 0, 10);
                }
            }

            // Convert ISO datetime strings to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
            if (in_array($snakeKey, $this->datetimeFields) && !empty($value) && is_string($value)) {
                // Handle ISO format: 2026-01-28T18:30:45.123Z -> 2026-01-28 18:30:45
                if (strpos($value, 'T') !== false) {
                    $value = str_replace('T', ' ', substr($value, 0, 19));
                }
            }

            $result[$snakeKey] = $value;
        }

        return $result;
    }

    /**
     * Convert snake_case to camelCase
     */
    protected function snakeToCamel(string $input): string {
        return lcfirst(str_replace('_', '', ucwords($input, '_')));
    }

    /**
     * Convert camelCase to snake_case
     */
    protected function camelToSnake(string $input): string {
        return strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $input));
    }

    /**
     * Execute a custom query and return results
     */
    protected function query(string $sql, array $params = []): array {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll();

        return array_map([$this, 'transformFromDb'], $results);
    }

    /**
     * Execute a query and return single result
     */
    protected function queryOne(string $sql, array $params = []): ?array {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();

        return $result ? $this->transformFromDb($result) : null;
    }

    /**
     * Execute a query and return affected count
     */
    protected function execute(string $sql, array $params = []): int {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }
}
