<?php
/**
 * Membership Plans API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class PlansHandler extends BaseHandler {
    protected string $table = 'membership_plans';
    protected array $jsonFields = ['allowed_session_types', 'features'];
    protected array $boolFields = ['is_active'];
    protected array $numericFields = ['price', 'duration_months'];

    /**
     * Get active plans
     */
    public function getActive(): array {
        return $this->query(
            "SELECT * FROM {$this->table} WHERE is_active = 1 ORDER BY price ASC"
        );
    }

    /**
     * Get plans by type
     */
    public function getByType(): array {
        $type = getQueryParam('type');
        if (empty($type)) {
            throw new Exception('type parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE type = :type ORDER BY price ASC",
            ['type' => $type]
        );
    }
}
