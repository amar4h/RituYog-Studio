<?php
/**
 * Base Handler - Common CRUD operations for all entities
 */

abstract class BaseHandler {
    protected PDO $db;
    protected string $table;
    protected array $jsonFields = [];
    protected array $dateFields = [];
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

        // Build insert query
        $columns = array_keys($transformed);
        $placeholders = array_map(fn($col) => ':' . $col, $columns);

        $sql = sprintf(
            "INSERT INTO %s (%s) VALUES (%s)",
            $this->table,
            implode(', ', $columns),
            implode(', ', $placeholders)
        );

        $stmt = $this->db->prepare($sql);
        $stmt->execute($transformed);

        return $this->getById($data['id']);
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

        // Remove created_at from update
        unset($transformed['created_at']);

        // Build update query
        $setParts = [];
        foreach ($transformed as $column => $value) {
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
        $stmt->execute($transformed);

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

            // Encode JSON fields
            if (in_array($snakeKey, $this->jsonFields) && !is_string($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE);
            }

            // Convert boolean to int for database
            if (in_array($snakeKey, $this->boolFields)) {
                $value = $value ? 1 : 0;
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
