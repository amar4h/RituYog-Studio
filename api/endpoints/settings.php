<?php
/**
 * Studio Settings API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class SettingsHandler extends BaseHandler {
    protected string $table = 'studio_settings';
    protected array $jsonFields = ['working_hours', 'holidays', 'invoice_template', 'whatsapp_templates'];
    protected array $boolFields = ['trial_class_enabled'];

    // Valid columns in the studio_settings table (snake_case)
    private array $validColumns = [
        'studio_name', 'logo_url', 'logo_data', 'address', 'phone', 'email',
        'website', 'google_review_url', 'whatsapp_business_number', 'currency', 'timezone',
        'working_hours', 'terms_and_conditions', 'health_disclaimer',
        'renewal_reminder_days', 'class_reminder_hours', 'tax_rate',
        'invoice_prefix', 'receipt_prefix', 'invoice_start_number', 'receipt_start_number',
        'trial_class_enabled', 'max_trials_per_person', 'holidays',
        'admin_password', 'invoice_template', 'whatsapp_templates'
    ];

    /**
     * Override getAll to return single settings row
     */
    public function getAll(): array {
        return $this->get() ?? [];
    }

    /**
     * Health check for debugging
     */
    public function health(): array {
        return ['status' => 'ok', 'table' => $this->table, 'php_version' => PHP_VERSION];
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

        if (empty($data)) {
            throw new Exception('No data received in request body');
        }

        $transformed = $this->transformToDb($data);

        // Filter to only valid columns to avoid SQL errors
        $filtered = [];
        foreach ($transformed as $column => $value) {
            if (in_array($column, $this->validColumns)) {
                $filtered[$column] = $value;
            }
        }

        if (empty($filtered)) {
            throw new Exception('No valid settings fields to save. Keys received: ' . implode(', ', array_keys($transformed)));
        }

        // Check if settings exist
        $existing = $this->get();

        if ($existing) {
            // Update existing
            $setParts = [];
            foreach ($filtered as $column => $value) {
                $setParts[] = "$column = :$column";
            }
            $filtered['id'] = 1;

            $sql = sprintf(
                "UPDATE %s SET %s WHERE id = :id",
                $this->table,
                implode(', ', $setParts)
            );
            $stmt = $this->db->prepare($sql);
            $stmt->execute($filtered);
        } else {
            // Insert new
            $filtered['id'] = 1;
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
     * Get WhatsApp templates
     */
    public function getWhatsappTemplates(): ?array {
        $settings = $this->get();
        return $settings['whatsappTemplates'] ?? null;
    }

    /**
     * Update WhatsApp templates
     */
    public function updateWhatsappTemplates(): array {
        $templates = getRequestBody();

        $this->execute(
            "UPDATE {$this->table} SET whatsapp_templates = :templates WHERE id = 1",
            ['templates' => json_encode($templates)]
        );

        return $this->getWhatsappTemplates();
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
    public function update(string $id): ?array {
        return $this->save();
    }
}
