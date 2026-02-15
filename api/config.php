<?php
/**
 * Yoga Studio Management - API Configuration
 *
 * Configuration file for database connection and API settings.
 * For Hostinger deployment, update these values in hPanel or create a .env file.
 */

// CRITICAL: Suppress all PHP errors from being output as HTML
// This MUST be at the very top to prevent breaking JSON responses
ini_set('display_errors', 0);
error_reporting(0);

// Prevent direct access
if (!defined('API_ACCESS')) {
    http_response_code(403);
    die(json_encode(['error' => 'Direct access forbidden']));
}

// ============================================
// ENVIRONMENT DETECTION
// ============================================

// Check for environment file (preferred for Hostinger)
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $envLines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($envLines as $line) {
        if (strpos($line, '#') === 0) continue; // Skip comments
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

// ============================================
// DATABASE CONFIGURATION
// ============================================

// Get database credentials from environment or use defaults
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_PORT', $_ENV['DB_PORT'] ?? '3306');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'yoga_studio');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASSWORD', $_ENV['DB_PASSWORD'] ?? '');
define('DB_CHARSET', 'utf8mb4');

// ============================================
// API CONFIGURATION
// ============================================

// API key for authenticating requests (change this in production!)
define('API_KEY', $_ENV['API_KEY'] ?? 'yoga_studio_api_key_change_me_in_production');

// Session duration in seconds (24 hours)
define('SESSION_DURATION', 86400);

// Enable CORS for frontend
define('CORS_ORIGIN', $_ENV['CORS_ORIGIN'] ?? '*');

// Debug mode (disable in production)
define('DEBUG_MODE', ($_ENV['DEBUG_MODE'] ?? 'false') === 'true');

// ============================================
// ERROR HANDLING
// ============================================

// ALWAYS keep display_errors off to prevent HTML in JSON responses
// Errors are logged to the server error log instead
ini_set('display_errors', 0);
ini_set('log_errors', 1);

if (DEBUG_MODE) {
    error_reporting(E_ALL);
} else {
    error_reporting(0);
}

// ============================================
// DATABASE CONNECTION
// ============================================

/**
 * Get PDO database connection
 * Uses singleton pattern to reuse connection
 */
function getDB(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_PORT,
            DB_NAME,
            DB_CHARSET
        );

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, $options);
        } catch (PDOException $e) {
            if (DEBUG_MODE) {
                throw $e;
            }
            http_response_code(500);
            die(json_encode(['error' => 'Database connection failed']));
        }
    }

    return $pdo;
}

// ============================================
// CORS HEADERS
// ============================================

function setCorsHeaders(): void {
    header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');
    header('Access-Control-Allow-Credentials: true');
    header('Content-Type: application/json; charset=utf-8');

    // Handle preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// ============================================
// API KEY VALIDATION
// ============================================

function validateApiKey(): bool {
    $headers = getallheaders();
    $apiKey = $headers['X-API-Key'] ?? $headers['x-api-key'] ?? $_GET['api_key'] ?? '';

    return $apiKey === API_KEY;
}

// ============================================
// RESPONSE HELPERS
// ============================================

function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function errorResponse(string $message, int $statusCode = 400): void {
    jsonResponse(['error' => $message], $statusCode);
}

function successResponse($data, string $message = 'Success'): void {
    jsonResponse(['success' => true, 'message' => $message, 'data' => $data]);
}

// ============================================
// REQUEST HELPERS
// ============================================

function getRequestBody(): array {
    // Allow internal override (used by chatbot function calling)
    if (isset($GLOBALS['__chatbot_request_body'])) {
        $data = $GLOBALS['__chatbot_request_body'];
        unset($GLOBALS['__chatbot_request_body']);
        return $data;
    }
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return $data ?? [];
}

function getQueryParam(string $key, $default = null) {
    return $_GET[$key] ?? $default;
}

// ============================================
// UUID GENERATION
// ============================================

function generateUUID(): string {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// ============================================
// DATE HELPERS
// ============================================

function getToday(): string {
    return date('Y-m-d');
}

function getCurrentTimestamp(): string {
    return date('Y-m-d H:i:s');
}
