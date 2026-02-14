<?php
/**
 * Session Plans API Handler
 * Handles CRUD operations for reusable yoga session plan templates
 */

require_once __DIR__ . '/BaseHandler.php';

class SessionPlansHandler extends BaseHandler {
    protected string $table = 'session_plans';
    protected array $jsonFields = ['sections'];
    protected array $boolFields = ['is_active'];
    protected array $dateFields = [];

    /**
     * Get all active session plans
     */
    public function getActive(): array {
        return $this->query(
            "SELECT * FROM {$this->table} WHERE is_active = 1 ORDER BY name ASC"
        );
    }

    /**
     * Get session plans by level
     */
    public function getByLevel(): array {
        $level = getQueryParam('level');
        if (empty($level)) {
            throw new Exception('Level parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE level = :level AND is_active = 1 ORDER BY name ASC",
            ['level' => $level]
        );
    }

    /**
     * Search session plans by name or description
     */
    public function search(): array {
        $query = getQueryParam('q');
        if (empty($query)) {
            throw new Exception('Query parameter (q) is required');
        }

        $searchTerm = '%' . $query . '%';
        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE is_active = 1
             AND (name LIKE :term1 OR description LIKE :term2)
             ORDER BY name ASC",
            ['term1' => $searchTerm, 'term2' => $searchTerm]
        );
    }

    /**
     * Get recently used session plans
     */
    public function getRecentlyUsed(): array {
        $limit = getQueryParam('limit', 10);
        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE is_active = 1 AND last_used_at IS NOT NULL
             ORDER BY last_used_at DESC
             LIMIT :limit",
            ['limit' => (int) $limit]
        );
    }

    /**
     * Get most used session plans
     */
    public function getMostUsed(): array {
        $limit = getQueryParam('limit', 10);
        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE is_active = 1
             ORDER BY usage_count DESC
             LIMIT :limit",
            ['limit' => (int) $limit]
        );
    }

    /**
     * Increment usage count and update last_used_at
     */
    public function recordUsage($id = null): array {
        if (empty($id)) {
            $id = getQueryParam('id');
        }
        if (empty($id)) {
            throw new Exception('ID is required');
        }

        $this->db->prepare(
            "UPDATE {$this->table}
             SET usage_count = usage_count + 1, last_used_at = NOW(), updated_at = NOW()
             WHERE id = :id"
        )->execute(['id' => $id]);

        return $this->getById($id);
    }

    /**
     * Clone a session plan
     */
    public function clone($id = null): array {
        if (empty($id)) {
            $id = getQueryParam('id');
        }
        if (empty($id)) {
            throw new Exception('ID is required');
        }

        // Get the original plan
        $original = $this->getById($id);
        if (!$original) {
            throw new Exception('Session plan not found');
        }

        // Create new plan with copied data
        $newId = generateUuid();
        $newName = $original['name'] . ' (Copy)';

        $stmt = $this->db->prepare(
            "INSERT INTO {$this->table}
             (id, name, description, level, version, sections, created_by, usage_count, is_active, created_at, updated_at)
             VALUES (:id, :name, :description, :level, 1, :sections, :created_by, 0, 1, NOW(), NOW())"
        );

        $stmt->execute([
            'id' => $newId,
            'name' => $newName,
            'description' => $original['description'],
            'level' => $original['level'],
            'sections' => json_encode($original['sections']),
            'created_by' => $original['createdBy'] ?? 'System',
        ]);

        return $this->getById($newId);
    }

    /**
     * Check for overuse warning
     * Returns warning if plan was used in last 3 days OR 5+ times in last 30 days
     */
    public function checkOveruse($id = null): array {
        if (empty($id)) {
            $id = getQueryParam('id');
        }
        if (empty($id)) {
            throw new Exception('ID is required');
        }

        // Check if used in last 3 days
        $recentUsage = $this->queryOne(
            "SELECT COUNT(*) as count FROM session_executions
             WHERE session_plan_id = :id AND date >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)",
            ['id' => $id]
        );

        // Check usage in last 30 days
        $monthlyUsage = $this->queryOne(
            "SELECT COUNT(*) as count FROM session_executions
             WHERE session_plan_id = :id AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)",
            ['id' => $id]
        );

        $warnings = [];

        if ($recentUsage && $recentUsage['count'] > 0) {
            $warnings[] = "This plan was used in the last 3 days ({$recentUsage['count']} time(s))";
        }

        if ($monthlyUsage && $monthlyUsage['count'] >= 5) {
            $warnings[] = "This plan has been used {$monthlyUsage['count']} times in the last 30 days";
        }

        return [
            'hasWarning' => count($warnings) > 0,
            'warnings' => $warnings,
            'recentUsageCount' => (int) ($recentUsage['count'] ?? 0),
            'monthlyUsageCount' => (int) ($monthlyUsage['count'] ?? 0),
        ];
    }
}
