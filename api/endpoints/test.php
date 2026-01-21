<?php
/**
 * Test endpoint to debug settings issue
 */

require_once __DIR__ . '/BaseHandler.php';

class TestHandler extends BaseHandler {
    protected string $table = 'studio_settings';
    protected array $jsonFields = [];
    protected array $boolFields = [];

    public function getAll(): array {
        return ['test' => 'ok', 'php' => PHP_VERSION];
    }

    public function check(): array {
        return ['test' => 'ok', 'php' => PHP_VERSION];
    }

    public function testDb(): array {
        try {
            $result = $this->db->query("SELECT * FROM studio_settings WHERE id = 1")->fetch();
            return ['db' => 'ok', 'has_data' => $result ? true : false];
        } catch (Exception $e) {
            return ['db' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function getById(string $id): ?array {
        return $this->check();
    }

    public function create(): array {
        throw new Exception('Not supported');
    }

    public function update(string $id): ?array {
        throw new Exception('Not supported');
    }

    public function delete(string $id): array {
        throw new Exception('Not supported');
    }
}
