<?php
/**
 * Studio Settings API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class SettingsHandler extends BaseHandler {
    protected string $table = 'studio_settings';
    protected array $jsonFields = ['working_hours', 'holidays', 'invoice_template'];
    protected array $boolFields = ['trial_class_enabled'];

    /**
     * Override getAll to return single settings row
     */
    public function getAll(): ?array {
        return $this->get();
    }

    /**
     * Get settings (single row table)
     */
    public function get(): ?array {
        return $this->queryOne("SELECT * FROM {$this->table} WHERE id = 1");
    }

    /**
     * Save settings
     */
    public function save(): array {
        $data = getRequestBody();
        $transformed = $this->transformToDb($data);

        // Check if settings exist
        $existing = $this->get();

        if ($existing) {
            // Update existing
            $setParts = [];
            foreach ($transformed as $column => $value) {
                if ($column !== 'id') {
                    $setParts[] = "$column = :$column";
                }
            }
            $transformed['id'] = 1;

            $sql = sprintf(
                "UPDATE %s SET %s WHERE id = :id",
                $this->table,
                implode(', ', $setParts)
            );
            $this->db->prepare($sql)->execute($transformed);
        } else {
            // Insert new
            $transformed['id'] = 1;
            $columns = array_keys($transformed);
            $placeholders = array_map(fn($col) => ':' . $col, $columns);

            $sql = sprintf(
                "INSERT INTO %s (%s) VALUES (%s)",
                $this->table,
                implode(', ', $columns),
                implode(', ', $placeholders)
            );
            $this->db->prepare($sql)->execute($transformed);
        }

        return $this->get();
    }

    /**
     * Update partial settings
     */
    public function updatePartial(): array {
        $data = getRequestBody();
        $current = $this->get();

        if (!$current) {
            throw new Exception('Settings not initialized');
        }

        // Merge with existing
        $merged = array_merge($current, $data);
        $_POST = json_encode($merged);

        return $this->save();
    }

    /**
     * Get invoice template
     */
    public function getInvoiceTemplate(): ?array {
        $settings = $this->get();
        return $settings['invoiceTemplate'] ?? null;
    }

    /**
     * Update invoice template
     */
    public function updateInvoiceTemplate(): array {
        $template = getRequestBody();

        $this->execute(
            "UPDATE {$this->table} SET invoice_template = :template WHERE id = 1",
            ['template' => json_encode($template)]
        );

        return $this->getInvoiceTemplate();
    }

    /**
     * Get holidays
     */
    public function getHolidays(): array {
        $settings = $this->get();
        return $settings['holidays'] ?? [];
    }

    /**
     * Update holidays
     */
    public function updateHolidays(): array {
        $holidays = getRequestBody();

        $this->execute(
            "UPDATE {$this->table} SET holidays = :holidays WHERE id = 1",
            ['holidays' => json_encode($holidays)]
        );

        return $this->getHolidays();
    }

    /**
     * Override create to use save
     */
    public function create(): array {
        return $this->save();
    }

    /**
     * Override update to use save
     */
    public function update(string $id = null): array {
        return $this->save();
    }
}
