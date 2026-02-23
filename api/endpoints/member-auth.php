<?php
/**
 * Member Authentication API Handler
 */

require_once __DIR__ . '/BaseHandler.php';

class MemberAuthHandler extends BaseHandler {
    protected string $table = 'member_sessions';
    protected array $jsonFields = [];
    protected array $boolFields = [];

    /**
     * Member login with phone + password
     */
    public function login(): array {
        $data = getRequestBody();
        $phone = $data['phone'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($phone) || empty($password)) {
            throw new Exception('Phone and password are required');
        }

        // Normalize phone: strip non-digits, remove leading 0 or +91 country code
        $phone = preg_replace('/\D/', '', $phone);
        if (str_starts_with($phone, '0')) {
            $phone = substr($phone, 1);
        } elseif (strlen($phone) > 10 && str_starts_with($phone, '91')) {
            $phone = substr($phone, -10);
        }

        // Find member by phone
        $member = $this->queryOne(
            "SELECT id, password_hash FROM members WHERE phone = :phone LIMIT 1",
            ['phone' => $phone]
        );

        if (!$member || empty($member['passwordHash'])) {
            throw new Exception('Invalid phone number or password');
        }

        // Verify password
        if (!password_verify($password, $member['passwordHash'])) {
            throw new Exception('Invalid phone number or password');
        }

        // Create session
        $sessionToken = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + SESSION_DURATION);

        $sessionId = generateUUID();
        $this->execute(
            "INSERT INTO {$this->table}
             (id, member_id, session_token, login_time, expires_at)
             VALUES (:id, :memberId, :token, NOW(), :expires)",
            [
                'id' => $sessionId,
                'memberId' => $member['id'],
                'token' => $sessionToken,
                'expires' => $expiresAt,
            ]
        );

        return [
            'authenticated' => true,
            'memberId' => $member['id'],
            'sessionToken' => $sessionToken,
            'expiresAt' => $expiresAt,
        ];
    }

    /**
     * Set password for a member (admin action)
     */
    public function setPassword(): array {
        $data = getRequestBody();
        $memberId = $data['memberId'] ?? '';
        $passwordHash = $data['passwordHash'] ?? '';

        if (empty($memberId) || empty($passwordHash)) {
            throw new Exception('memberId and passwordHash are required');
        }

        // Store bcrypt hash (re-hash the SHA-256 hash from frontend with bcrypt)
        // The frontend sends a SHA-256 hash; for API mode we expect the raw password
        // to be hashed with bcrypt server-side. But since the admin sets it via
        // the frontend which pre-hashes with SHA-256, we bcrypt that hash.
        $bcryptHash = password_hash($passwordHash, PASSWORD_BCRYPT);

        $this->execute(
            "UPDATE members SET password_hash = :hash WHERE id = :id",
            ['hash' => $bcryptHash, 'id' => $memberId]
        );

        return ['success' => true, 'message' => 'Password set successfully'];
    }

    /**
     * Clear password for a member (admin action) - allows re-activation
     */
    public function clearPassword(): array {
        $data = getRequestBody();
        $memberId = $data['memberId'] ?? '';

        if (empty($memberId)) {
            throw new Exception('memberId is required');
        }

        $this->execute(
            "UPDATE members SET password_hash = NULL WHERE id = :id",
            ['id' => $memberId]
        );

        return ['success' => true, 'message' => 'Password cleared successfully'];
    }

    /**
     * Change password (member action)
     */
    public function changePassword(): array {
        $data = getRequestBody();
        $memberId = $data['memberId'] ?? '';
        $currentPassword = $data['currentPassword'] ?? '';
        $newPassword = $data['newPassword'] ?? '';

        if (empty($memberId) || empty($currentPassword) || empty($newPassword)) {
            throw new Exception('memberId, currentPassword, and newPassword are required');
        }

        // Get current password hash
        $member = $this->queryOne(
            "SELECT password_hash FROM members WHERE id = :id",
            ['id' => $memberId]
        );

        if (!$member || empty($member['passwordHash'])) {
            throw new Exception('No password set for this member');
        }

        // Verify current password
        if (!password_verify($currentPassword, $member['passwordHash'])) {
            throw new Exception('Current password is incorrect');
        }

        // Hash and save new password
        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $this->execute(
            "UPDATE members SET password_hash = :hash WHERE id = :id",
            ['hash' => $newHash, 'id' => $memberId]
        );

        return ['success' => true, 'message' => 'Password changed successfully'];
    }

    /**
     * Activate account - member sets their own password (phone must exist, no password set)
     */
    public function activate(): array {
        $data = getRequestBody();
        $phone = $data['phone'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($phone) || empty($password)) {
            throw new Exception('Phone and password are required');
        }

        // Normalize phone
        $phone = preg_replace('/\D/', '', $phone);
        if (str_starts_with($phone, '0')) {
            $phone = substr($phone, 1);
        } elseif (strlen($phone) > 10 && str_starts_with($phone, '91')) {
            $phone = substr($phone, -10);
        }

        // Find member by phone
        $member = $this->queryOne(
            "SELECT id, password_hash FROM members WHERE phone = :phone LIMIT 1",
            ['phone' => $phone]
        );

        if (!$member) {
            throw new Exception('No member found with this phone number. Please contact your studio.');
        }

        if (!empty($member['passwordHash'])) {
            throw new Exception('Account already activated. Please use Login.');
        }

        // Set password (bcrypt the SHA-256 hash from frontend)
        $bcryptHash = password_hash($password, PASSWORD_BCRYPT);
        $this->execute(
            "UPDATE members SET password_hash = :hash WHERE id = :id",
            ['hash' => $bcryptHash, 'id' => $member['id']]
        );

        return ['success' => true, 'message' => 'Account activated successfully'];
    }

    /**
     * Check if member session is valid
     */
    public function check(): array {
        $sessionToken = getQueryParam('sessionToken', '');

        if (empty($sessionToken)) {
            return ['authenticated' => false];
        }

        $session = $this->queryOne(
            "SELECT member_id FROM {$this->table}
             WHERE session_token = :token
             AND expires_at > NOW()",
            ['token' => $sessionToken]
        );

        return [
            'authenticated' => $session !== null,
            'memberId' => $session['member_id'] ?? null,
        ];
    }

    /**
     * Logout (invalidate member session)
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
