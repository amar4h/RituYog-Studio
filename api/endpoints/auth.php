<?php
/**
 * Authentication API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class AuthHandler extends BaseHandler {
    protected string $table = 'api_sessions';
    protected array $jsonFields = [];
    protected array $boolFields = ['is_authenticated'];

    /**
     * Login with password
     */
    public function login(): array {
        $data = getRequestBody();
        $password = $data['password'] ?? '';

        if (empty($password)) {
            throw new Exception('Password is required');
        }

        // Get settings for password
        $settings = $this->queryOne("SELECT admin_password FROM studio_settings WHERE id = 1");
        $adminPassword = $settings['adminPassword'] ?? 'admin123';

        if ($password !== $adminPassword) {
            throw new Exception('Invalid password');
        }

        // Create session
        $sessionToken = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + SESSION_DURATION);

        $sessionId = generateUUID();
        $this->execute(
            "INSERT INTO {$this->table}
             (id, session_token, is_authenticated, login_time, expires_at, ip_address, user_agent)
             VALUES (:id, :token, 1, NOW(), :expires, :ip, :ua)",
            [
                'id' => $sessionId,
                'token' => $sessionToken,
                'expires' => $expiresAt,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
                'ua' => $_SERVER['HTTP_USER_AGENT'] ?? null
            ]
        );

        return [
            'authenticated' => true,
            'sessionToken' => $sessionToken,
            'expiresAt' => $expiresAt
        ];
    }

    /**
     * Logout (invalidate session)
     */
    public function logout(): array {
        $data = getRequestBody();
        $sessionToken = $data['sessionToken'] ?? '';

        if (!empty($sessionToken)) {
            $this->execute(
                "DELETE FROM {$this->table} WHERE session_token = :token",
                ['token' => $sessionToken]
            );
        }

        return ['success' => true, 'message' => 'Logged out'];
    }

    /**
     * Check if session is valid
     */
    public function check(): array {
        $data = getRequestBody();
        $sessionToken = $data['sessionToken'] ?? getQueryParam('sessionToken', '');

        if (empty($sessionToken)) {
            return ['authenticated' => false];
        }

        $session = $this->queryOne(
            "SELECT * FROM {$this->table}
             WHERE session_token = :token
             AND is_authenticated = 1
             AND expires_at > NOW()",
            ['token' => $sessionToken]
        );

        return [
            'authenticated' => $session !== null,
            'expiresAt' => $session['expiresAt'] ?? null
        ];
    }

    /**
     * Change admin password
     */
    public function changePassword(): array {
        $data = getRequestBody();
        $currentPassword = $data['currentPassword'] ?? '';
        $newPassword = $data['newPassword'] ?? '';

        if (empty($currentPassword) || empty($newPassword)) {
            throw new Exception('Current and new passwords are required');
        }

        // Verify current password
        $settings = $this->queryOne("SELECT admin_password FROM studio_settings WHERE id = 1");
        $adminPassword = $settings['adminPassword'] ?? 'admin123';

        if ($currentPassword !== $adminPassword) {
            throw new Exception('Current password is incorrect');
        }

        // Update password
        $this->execute(
            "UPDATE studio_settings SET admin_password = :password WHERE id = 1",
            ['password' => $newPassword]
        );

        return ['success' => true, 'message' => 'Password changed successfully'];
    }

    /**
     * Clean up expired sessions
     */
    public function cleanup(): array {
        $deleted = $this->execute(
            "DELETE FROM {$this->table} WHERE expires_at < NOW()"
        );

        return ['deleted' => $deleted];
    }

    /**
     * Disable default CRUD operations
     */
    public function getAll(): array {
        throw new Exception('Not supported');
    }

    public function getById(string $id): ?array {
        throw new Exception('Not supported');
    }

    public function create(): array {
        throw new Exception('Use login instead');
    }

    public function update(string $id): ?array {
        throw new Exception('Not supported');
    }

    public function delete(string $id): array {
        throw new Exception('Use logout instead');
    }
}
