<?php
/**
 * Yoga Studio Management - API Entry Point
 *
 * Main router for all API requests.
 * URL format: /api/index.php?endpoint=members&action=getAll
 * Or with .htaccess: /api/members/getAll
 */

define('API_ACCESS', true);
require_once __DIR__ . '/config.php';

// Set CORS headers
setCorsHeaders();

// Get endpoint and action from query params or path
$endpoint = getQueryParam('endpoint', '');
$action = getQueryParam('action', '');
$id = getQueryParam('id', '');

// Parse path if using pretty URLs (e.g., /api/leads?action=getByToken)
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Remove 'api' prefix if present
if (isset($pathParts[0]) && $pathParts[0] === 'api') {
    array_shift($pathParts);
}

// Map path parts to endpoint/action/id
if (empty($endpoint) && !empty($pathParts[0])) {
    $endpoint = $pathParts[0];
}
if (empty($action) && !empty($pathParts[1])) {
    $action = $pathParts[1];
}
if (empty($id) && !empty($pathParts[2])) {
    $id = $pathParts[2];
}

// Define public endpoints that don't require API key
// Format: 'endpoint' => ['action1', 'action2']
$publicEndpoints = [
    'leads' => ['getByToken', 'completeRegistration'],
    'chatbot' => ['chat'],
    'member-auth' => ['login', 'activate', 'changePassword', 'check', 'logout'],
];

// Check if this is a public endpoint (after parsing endpoint/action from path)
$isPublicEndpoint = isset($publicEndpoints[$endpoint]) &&
                    in_array($action, $publicEndpoints[$endpoint]);

// Validate API key for all requests (except public endpoints)
if (!$isPublicEndpoint && !validateApiKey()) {
    errorResponse('Invalid or missing API key', 401);
}

// Map HTTP method to action if not specified
if (empty($action)) {
    $method = $_SERVER['REQUEST_METHOD'];
    switch ($method) {
        case 'GET':
            $action = $id ? 'getById' : 'getAll';
            break;
        case 'POST':
            $action = 'create';
            break;
        case 'PUT':
            $action = 'update';
            break;
        case 'DELETE':
            $action = 'delete';
            break;
    }
}

// Validate endpoint
$validEndpoints = [
    'members',
    'leads',
    'subscriptions',
    'slots',
    'plans',
    'invoices',
    'payments',
    'attendance',
    'attendance-locks',
    'notification-logs',
    'trials',
    'settings',
    'auth',
    'health',
    'test',
    // Inventory & Expenses
    'products',
    'inventory',
    'expenses',
    // Chatbot
    'chatbot',
    // Session Planning
    'asanas',
    'session-plans',
    'session-allocations',
    'session-plan-allocations',
    'session-executions',
    // Member Portal
    'member-auth',
];

if (!in_array($endpoint, $validEndpoints)) {
    errorResponse('Invalid endpoint: ' . $endpoint, 404);
}

// Endpoint aliases (frontend name -> backend file name)
$endpointAliases = [
    'session-plan-allocations' => 'session-allocations',
];
$resolvedEndpoint = $endpointAliases[$endpoint] ?? $endpoint;

// Load endpoint handler
$handlerFile = __DIR__ . '/endpoints/' . $resolvedEndpoint . '.php';
if (!file_exists($handlerFile)) {
    errorResponse('Endpoint handler not found', 500);
}

require_once $handlerFile;

// Execute action
// Convert hyphenated endpoint names to PascalCase class names
// e.g., "attendance-locks" -> "AttendanceLocksHandler"
$handlerClass = str_replace('-', '', ucwords($resolvedEndpoint, '-')) . 'Handler';

// Debug: Show what class we're looking for
if (DEBUG_MODE && isset($_GET['debug'])) {
    error_log("Looking for class: $handlerClass");
    error_log("Defined classes: " . implode(', ', get_declared_classes()));
}

if (!class_exists($handlerClass)) {
    if (DEBUG_MODE) {
        errorResponse("Handler class not found: $handlerClass. File: $handlerFile. Classes defined: " . implode(', ', array_filter(get_declared_classes(), fn($c) => stripos($c, 'Handler') !== false)), 500);
    }
    errorResponse('Handler class not found', 500);
}

$handler = new $handlerClass();

if (!method_exists($handler, $action)) {
    errorResponse('Invalid action: ' . $action, 404);
}

try {
    $result = $handler->$action($id);
    jsonResponse($result);
} catch (PDOException $e) {
    // Always show database error details for easier debugging
    errorResponse('Database error: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    errorResponse($e->getMessage(), 400);
}
