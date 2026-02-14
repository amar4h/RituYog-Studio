<?php
/**
 * Asanas API Handler
 * Handles CRUD operations for yoga asanas (poses, pranayama, kriyas, etc.)
 */

require_once __DIR__ . '/BaseHandler.php';

class AsanasHandler extends BaseHandler {
    protected string $table = 'asanas';
    protected array $jsonFields = ['primary_body_areas', 'secondary_body_areas', 'benefits', 'contraindications', 'child_asanas'];
    protected array $boolFields = ['is_active'];
    protected array $dateFields = [];

    /**
     * Get all active asanas
     */
    public function getActive(): array {
        return $this->query(
            "SELECT * FROM {$this->table} WHERE is_active = 1 ORDER BY name ASC"
        );
    }

    /**
     * Get asanas by type
     */
    public function getByType(): array {
        $type = getQueryParam('type');
        if (empty($type)) {
            throw new Exception('Type parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE type = :type AND is_active = 1 ORDER BY name ASC",
            ['type' => $type]
        );
    }

    /**
     * Get asanas by difficulty level
     */
    public function getByDifficulty(): array {
        $difficulty = getQueryParam('difficulty');
        if (empty($difficulty)) {
            throw new Exception('Difficulty parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table} WHERE difficulty = :difficulty AND is_active = 1 ORDER BY name ASC",
            ['difficulty' => $difficulty]
        );
    }

    /**
     * Get asanas by body area (searches both primary and secondary)
     */
    public function getByBodyArea(): array {
        $bodyArea = getQueryParam('bodyArea');
        if (empty($bodyArea)) {
            throw new Exception('bodyArea parameter is required');
        }

        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE is_active = 1
             AND (JSON_CONTAINS(primary_body_areas, :bodyArea1) OR JSON_CONTAINS(secondary_body_areas, :bodyArea2))
             ORDER BY name ASC",
            ['bodyArea1' => json_encode($bodyArea), 'bodyArea2' => json_encode($bodyArea)]
        );
    }

    /**
     * Search asanas by name or sanskrit name
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
             AND (name LIKE :term1 OR sanskrit_name LIKE :term2)
             ORDER BY name ASC",
            ['term1' => $searchTerm, 'term2' => $searchTerm]
        );
    }

    /**
     * Get vinyasa/surya_namaskar asanas with their child asanas expanded
     */
    public function getSequences(): array {
        return $this->query(
            "SELECT * FROM {$this->table}
             WHERE type IN ('vinyasa', 'surya_namaskar') AND is_active = 1
             ORDER BY name ASC"
        );
    }
}
