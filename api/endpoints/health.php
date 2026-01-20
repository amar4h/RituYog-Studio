<?php
/**
 * Health Check API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class HealthHandler extends BaseHandler {
    protected string $table = 'studio_settings';
    protected array $jsonFields = [];
    protected array $boolFields = [];

    /**
     * Basic health check
     */
    public function check(): array {
        return [
            'status' => 'ok',
            'timestamp' => getCurrentTimestamp(),
            'version' => '1.0.0'
        ];
    }

    /**
     * Detailed health check including database
     */
    public function detailed(): array {
        $dbStatus = 'ok';
        $dbMessage = null;

        try {
            // Test database connection
            $this->db->query("SELECT 1");

            // Check tables exist
            $tables = ['members', 'leads', 'membership_subscriptions', 'invoices', 'payments', 'attendance_records', 'session_slots', 'membership_plans', 'studio_settings'];
            foreach ($tables as $table) {
                $this->db->query("SELECT 1 FROM $table LIMIT 1");
            }
        } catch (Exception $e) {
            $dbStatus = 'error';
            $dbMessage = DEBUG_MODE ? $e->getMessage() : 'Database error';
        }

        return [
            'status' => $dbStatus === 'ok' ? 'ok' : 'degraded',
            'timestamp' => getCurrentTimestamp(),
            'version' => '1.0.0',
            'components' => [
                'database' => [
                    'status' => $dbStatus,
                    'message' => $dbMessage
                ],
                'api' => [
                    'status' => 'ok'
                ]
            ]
        ];
    }

    /**
     * Get API info
     */
    public function info(): array {
        return [
            'name' => 'Yoga Studio Management API',
            'version' => '1.0.0',
            'endpoints' => [
                'members', 'leads', 'subscriptions', 'slots', 'plans',
                'invoices', 'payments', 'attendance', 'trials', 'settings', 'auth'
            ],
            'documentation' => '/api/docs'
        ];
    }

    /**
     * Get database statistics
     */
    public function stats(): array {
        $stats = [];

        $tables = [
            'members' => 'members',
            'leads' => 'leads',
            'subscriptions' => 'membership_subscriptions',
            'invoices' => 'invoices',
            'payments' => 'payments',
            'attendance' => 'attendance_records',
            'trialBookings' => 'trial_bookings'
        ];

        foreach ($tables as $name => $table) {
            $stmt = $this->db->query("SELECT COUNT(*) as count FROM $table");
            $stats[$name] = (int) $stmt->fetch()['count'];
        }

        return $stats;
    }

    /**
     * Override CRUD methods
     */
    public function getAll(): array {
        return $this->check();
    }

    public function getById(string $id): ?array {
        return match($id) {
            'detailed' => $this->detailed(),
            'info' => $this->info(),
            'stats' => $this->stats(),
            default => $this->check()
        };
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
