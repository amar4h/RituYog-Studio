<?php
/**
 * Historical Invoice Data Migration
 *
 * Imports historical invoice data from a CSV into the yoga studio database.
 * Creates members, products, subscriptions, invoices, and payments.
 *
 * SAFETY: INSERT only — never DELETE or UPDATE existing records.
 * IDEMPOTENT: Safe to run multiple times (checks before each insert).
 *
 * Usage: Upload to server, visit in browser, upload CSV, choose mode.
 *        Auth is handled by config.php (.env file on server).
 */

define('API_ACCESS', true);
require_once __DIR__ . '/../config.php';

header('Content-Type: text/html; charset=utf-8');

$pageStyles = "
<style>
body{font-family:monospace;padding:20px;max-width:1200px;margin:auto;font-size:13px}
.info{color:#333}.success{color:green}.warn{color:#b8860b}.error{color:red;font-weight:bold}
table{border-collapse:collapse;margin:10px 0}td,th{border:1px solid #ccc;padding:4px 8px;text-align:left}
h2{margin-top:30px;border-bottom:1px solid #ccc;padding-bottom:5px}
.form-box{background:#f8f9fa;border:1px solid #dee2e6;padding:24px;border-radius:8px;max-width:500px;margin:30px 0}
.form-box label{display:block;margin:12px 0 4px;font-weight:bold}
.form-box input[type=file]{margin:4px 0 16px}
.btn{padding:10px 24px;font-family:monospace;font-size:14px;cursor:pointer;border:none;border-radius:4px;margin-right:8px}
.btn-dry{background:#ffc107;color:#333}.btn-exec{background:#28a745;color:#fff}
.btn:hover{opacity:0.85}
</style>";

// === SHOW UPLOAD FORM (GET request or no file uploaded) ===
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo "<!DOCTYPE html><html><head><title>Historical Migration</title>$pageStyles</head><body>";
    echo "<h1>Historical Invoice Migration</h1>";
    echo "<div class='form-box'>";
    echo "<form method='POST' enctype='multipart/form-data'>";
    echo "<label>Upload Invoice CSV:</label>";
    echo "<input type='file' name='csv_file' accept='.csv' required>";
    echo "<div style='margin-top:16px'>";
    echo "<button type='submit' name='mode' value='dry-run' class='btn btn-dry'>Dry Run (Preview)</button>";
    echo "<button type='submit' name='mode' value='execute' class='btn btn-exec' onclick=\"return confirm('This will INSERT records into the database. Continue?')\">Execute Migration</button>";
    echo "</div></form></div>";
    echo "<h3>What this does:</h3><ul>";
    echo "<li>Creates missing members (matched by phone number)</li>";
    echo "<li>Creates product catalog (15 products)</li>";
    echo "<li>Creates membership subscriptions with discount history</li>";
    echo "<li>Creates invoices (<code>HINV-</code> prefix) and payment records (<code>RCP-H</code> prefix)</li>";
    echo "<li><strong>INSERT only</strong> — never deletes or updates existing records</li>";
    echo "<li><strong>Idempotent</strong> — safe to run multiple times</li>";
    echo "</ul>";
    echo "</body></html>";
    exit;
}

// === HANDLE FILE UPLOAD ===
$mode = $_POST['mode'] ?? 'dry-run';
$isDryRun = ($mode !== 'execute');
$db = getDB();

// Validate uploaded file
if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
    $errCodes = [
        UPLOAD_ERR_INI_SIZE => 'File exceeds server upload limit',
        UPLOAD_ERR_FORM_SIZE => 'File exceeds form limit',
        UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file was uploaded',
    ];
    $errCode = $_FILES['csv_file']['error'] ?? UPLOAD_ERR_NO_FILE;
    $errMsg = $errCodes[$errCode] ?? "Upload error code: $errCode";
    die("<!DOCTYPE html><html><head><title>Error</title>$pageStyles</head><body><p class='error'>$errMsg</p><a href=''>Back</a></body></html>");
}

$csvPath = $_FILES['csv_file']['tmp_name'];

echo "<!DOCTYPE html><html><head><title>Historical Migration</title>$pageStyles</head><body>";
echo "<h1>Historical Invoice Migration " . ($isDryRun ? "(DRY RUN)" : "(EXECUTING)") . "</h1>";

// === LOGGING & STATS ===
$stats = [
    'members_created' => 0, 'members_existing' => 0,
    'products_created' => 0, 'products_existing' => 0,
    'subscriptions_created' => 0, 'subscriptions_skipped_overlap' => 0,
    'subscriptions_skipped_void' => 0,
    'invoices_created' => 0, 'invoices_skipped' => 0,
    'payments_created' => 0,
    'warnings' => 0, 'errors' => 0,
];

function logMsg($type, $msg) {
    global $stats;
    if ($type === 'error') $stats['errors']++;
    if ($type === 'warn') $stats['warnings']++;
    echo "<div class='$type'>[$type] $msg</div>\n";
    flush();
}

// === CONSTANTS ===
$SLOT_MAP = [
    '7.30 AM'  => 'slot-0730',
    '8.45 AM'  => 'slot-0845',
    '08.45 AM' => 'slot-0845',
    '10.00 AM' => 'slot-1000',
    '7.30 PM'  => 'slot-1930',
];

$SLOT_DISPLAY = [
    'slot-0730' => 'Morning 7:30 AM',
    'slot-0845' => 'Morning 8:45 AM',
    'slot-1000' => 'Late Morning 10:00 AM',
    'slot-1930' => 'Evening 7:30 PM',
];

$PRODUCTS = [
    'Yoga Socks Green'              => ['cat'=>'accessories',    'cost'=>250, 'sell'=>350,  'sku'=>'ACC-001'],
    'Yoga Socks Black'              => ['cat'=>'accessories',    'cost'=>250, 'sell'=>350,  'sku'=>'ACC-002'],
    'Yoga Mat True Alignment 10 mm' => ['cat'=>'yoga-equipment', 'cost'=>750, 'sell'=>1250, 'sku'=>'YEQ-001'],
    'Yoga Mat PU 2mm'               => ['cat'=>'yoga-equipment', 'cost'=>2500,'sell'=>4200, 'sku'=>'YEQ-002'],
    'Yoga Mat Classic'              => ['cat'=>'yoga-equipment', 'cost'=>750, 'sell'=>900,  'sku'=>'YEQ-003'],
    'Yoga Grip Glove'               => ['cat'=>'accessories',    'cost'=>250, 'sell'=>350,  'sku'=>'ACC-003'],
    'Yoga Duffle Bag'               => ['cat'=>'accessories',    'cost'=>350, 'sell'=>450,  'sku'=>'ACC-004'],
    'Yoga Bag'                      => ['cat'=>'accessories',    'cost'=>300, 'sell'=>400,  'sku'=>'ACC-005'],
    'Single Yoga Session'           => ['cat'=>'other',          'cost'=>0,   'sell'=>200,  'sku'=>'OTH-001'],
    'Pullup Bar'                    => ['cat'=>'yoga-equipment', 'cost'=>600, 'sell'=>1050, 'sku'=>'YEQ-004'],
    'Pro Yoga Wheel'                => ['cat'=>'yoga-equipment', 'cost'=>800, 'sell'=>1250, 'sku'=>'YEQ-005'],
    'Pro Yoga Block'                => ['cat'=>'yoga-equipment', 'cost'=>400, 'sell'=>600,  'sku'=>'YEQ-006'],
    'Loop Yoga Stretch belt'        => ['cat'=>'accessories',    'cost'=>150, 'sell'=>250,  'sku'=>'ACC-006'],
    'Classic Yoga mat 8 mm'         => ['cat'=>'yoga-equipment', 'cost'=>500, 'sell'=>850,  'sku'=>'YEQ-007'],
    'Classic Yoga Mat 10 mm'        => ['cat'=>'yoga-equipment', 'cost'=>600, 'sell'=>1000, 'sku'=>'YEQ-008'],
];

// === HELPER FUNCTIONS ===

function genId() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0,0xffff), mt_rand(0,0xffff), mt_rand(0,0xffff),
        mt_rand(0,0x0fff)|0x4000, mt_rand(0,0x3fff)|0x8000,
        mt_rand(0,0xffff), mt_rand(0,0xffff), mt_rand(0,0xffff));
}

function splitName($name) {
    $parts = preg_split('/\s+/', trim($name));
    if (count($parts) <= 1) return [trim($name), '.'];
    $last = array_pop($parts);
    return [implode(' ', $parts), $last];
}

function csvDate($str) {
    // MM/DD/YYYY → YYYY-MM-DD
    $p = explode('/', trim($str));
    if (count($p) !== 3) return null;
    return sprintf('%04d-%02d-%02d', (int)$p[2], (int)$p[0], (int)$p[1]);
}

function cleanDate($str) {
    // Remove ordinal suffixes: 1st, 2nd, 3rd, 4th, 11h (typo), etc.
    $str = preg_replace('/(\d+)(st|nd|rd|th|h)\b/i', '$1', $str);
    // Fix specific year typos found in data
    $str = str_replace(['20226', '20256'], '2026', $str);
    // Handle 2-digit years: "12 Jan 26" → "12 Jan 2026"
    $str = preg_replace('/(\d{1,2}\s+[A-Za-z]{3,}\s+)(\d{2})(?!\d)/', '$1 20$2', $str);
    // Normalize whitespace
    $str = preg_replace('/\s+/', ' ', $str);
    return trim($str);
}

function parseDates($desc, $invDate, $months, $qty) {
    $desc = trim($desc);
    $totalMonths = $months * max(1, (int)$qty);

    // Empty description: compute from invoice date
    if (empty($desc)) {
        $s = new DateTime($invDate);
        $e = clone $s;
        $e->modify("+{$totalMonths} months -1 day");
        return [$s->format('Y-m-d'), $e->format('Y-m-d')];
    }

    // Strip batch suffix: (7.30 AM Batch), (8.45 AM), (10.00 AM batch), etc.
    $desc = preg_replace('/\([^)]*(?:AM|PM)[^)]*\)\s*$/i', '', trim($desc));
    $desc = trim($desc);

    // "Active Till:" format — only end date provided
    if (preg_match('/Active\s+Till\s*:?\s*(.*)/i', $desc, $m)) {
        $t = strtotime(cleanDate($m[1]));
        if ($t) {
            $e = new DateTime(date('Y-m-d', $t));
            $s = clone $e;
            $s->modify("-{$totalMonths} months +1 day");
            return [$s->format('Y-m-d'), $e->format('Y-m-d')];
        }
    }

    // Strip prefix: "Subscription Date:", "Membership Details:", etc.
    $desc = preg_replace('/^(Subscription|Membership)\s*(Date|Details)\s*:?\s*/i', '', trim($desc));
    $desc = trim($desc);

    // Split on " - " or " to "
    $parts = preg_split('/\s+[-\x{2013}]\s+|\s+to\s+/iu', $desc, 2);

    if (count($parts) === 2) {
        $st = strtotime(cleanDate($parts[0]));
        $et = strtotime(cleanDate($parts[1]));
        if ($st && $et) {
            // Fix year errors: if end < start, the end year is probably wrong
            if ($et < $st) {
                $et = strtotime('+1 year', $et);
            }
            return [date('Y-m-d', $st), date('Y-m-d', $et)];
        }
    }

    // Fallback: compute from invoice date
    logMsg('warn', "Could not parse dates from: '$desc' — using invoice date fallback");
    $s = new DateTime($invDate);
    $e = clone $s;
    $e->modify("+{$totalMonths} months -1 day");
    return [$s->format('Y-m-d'), $e->format('Y-m-d')];
}

// ==============================================
// STEP 1: READ CSV & GROUP BY INVOICE
// ==============================================
if (!file_exists($csvPath) || filesize($csvPath) === 0) {
    die("<p class='error'>Uploaded CSV file is empty or could not be read.</p></body></html>");
}

logMsg('info', "Reading uploaded CSV (" . number_format(filesize($csvPath)) . " bytes)");

$invoiceGroups = []; // invoice_number => [rows]
$uniquePhones = [];  // array of {phone, name} — may have multiple entries per phone

$fp = fopen($csvPath, 'r');
$header = fgetcsv($fp); // Skip header row
$rowCount = 0;
$seenPhoneNames = []; // track unique phone+name combos

while (($row = fgetcsv($fp)) !== false) {
    if (count($row) < 16) continue;
    $row = array_map('trim', $row);

    $invNum = $row[0];
    $phone  = $row[15];
    $name   = $row[3];

    if (empty($invNum) || empty($phone)) continue;

    $invoiceGroups[$invNum][] = $row;

    // Track unique phone+firstName combinations
    [$firstName, ] = splitName($name);
    $pnKey = $phone . ':' . mb_strtolower(trim($firstName));
    if (!isset($seenPhoneNames[$pnKey])) {
        $seenPhoneNames[$pnKey] = true;
        $uniquePhones[] = ['phone' => $phone, 'name' => $name];
    }
    $rowCount++;
}
fclose($fp);

logMsg('info', "Parsed $rowCount CSV rows → " . count($invoiceGroups) . " unique invoices, " . count($uniquePhones) . " unique phone+name combos");

// ==============================================
// STEP 2: LOOKUP PLAN IDs FROM DB
// ==============================================
$monthlyPlan = $db->query("SELECT id, price, duration_months FROM membership_plans WHERE type='monthly' AND is_active=1 LIMIT 1")->fetch();
$quarterlyPlan = $db->query("SELECT id, price, duration_months FROM membership_plans WHERE type='quarterly' AND is_active=1 LIMIT 1")->fetch();

if (!$monthlyPlan || !$quarterlyPlan) {
    die("<p class='error'>Monthly or Quarterly plan not found in DB. Run schema.sql first.</p></body></html>");
}
logMsg('info', "Plans found — Monthly: {$monthlyPlan['id']} (Rs {$monthlyPlan['price']}), Quarterly: {$quarterlyPlan['id']} (Rs {$quarterlyPlan['price']})");

// ==============================================
// STEP 3: CREATE MISSING MEMBERS
// ==============================================
echo "<h2>Step 3: Members</h2>";

$memberMap = [];   // "phone:firstName" => member_id
$newMembers = [];  // "phone:firstName" => true (newly created)

$stmtFindMembersByPhone = $db->prepare("SELECT id, first_name, last_name FROM members WHERE phone = :phone");
$stmtInsertMember = $db->prepare(
    "INSERT INTO members (id, first_name, last_name, email, phone, whatsapp_number, status, source, medical_conditions, consent_records, classes_attended, notes, created_at)
     VALUES (:id, :first, :last, :email, :phone, :whatsapp, 'inactive', 'walk-in', '[]', '[]', 0, 'Historical import', NOW())"
);

// Helper: build member key from phone + CSV name
function memberKey($phone, $csvName) {
    [$first, ] = splitName($csvName);
    return $phone . ':' . mb_strtolower(trim($first));
}

foreach ($uniquePhones as $phoneAndName) {
    $phone = $phoneAndName['phone'];
    $name  = $phoneAndName['name'];
    [$first, $last] = splitName($name);
    $key = memberKey($phone, $name);

    // Check if already processed (same phone, same first name)
    if (isset($memberMap[$key])) continue;

    // Find all existing members with this phone
    $stmtFindMembersByPhone->execute(['phone' => $phone]);
    $existingMembers = $stmtFindMembersByPhone->fetchAll();

    // Try to match by first name
    $matched = null;
    foreach ($existingMembers as $em) {
        if (mb_strtolower(trim($em['first_name'])) === mb_strtolower(trim($first))) {
            $matched = $em;
            break;
        }
    }

    if ($matched) {
        $memberMap[$key] = $matched['id'];
        $stats['members_existing']++;
        logMsg('info', "Member exists: $name ($phone) → {$matched['id']} ({$matched['first_name']} {$matched['last_name']})");
    } elseif (count($existingMembers) === 1 && count(array_filter($uniquePhones, fn($p) => $p['phone'] === $phone)) === 1) {
        // Only one member in DB with this phone AND only one name in CSV for this phone → safe match
        $memberMap[$key] = $existingMembers[0]['id'];
        $stats['members_existing']++;
        logMsg('info', "Member exists (sole phone match): $name ($phone) → {$existingMembers[0]['id']} ({$existingMembers[0]['first_name']} {$existingMembers[0]['last_name']})");
    } else {
        $id = genId();
        $seq = 1;
        $email = "{$phone}@historical.rituyog.com";
        // Ensure unique email if multiple members share a phone
        $stmtCheckEmail = $db->prepare("SELECT COUNT(*) as cnt FROM members WHERE email = :email");
        $stmtCheckEmail->execute(['email' => $email]);
        if ((int)$stmtCheckEmail->fetch()['cnt'] > 0) {
            $email = "{$phone}_{$seq}@historical.rituyog.com";
            $seq++;
        }

        if (!$isDryRun) {
            try {
                $stmtInsertMember->execute([
                    'id' => $id, 'first' => $first, 'last' => $last,
                    'email' => $email, 'phone' => $phone, 'whatsapp' => $phone,
                ]);
            } catch (PDOException $ex) {
                logMsg('error', "Failed to create member $name ($phone): " . $ex->getMessage());
                continue;
            }
        }
        $memberMap[$key] = $id;
        $newMembers[$key] = true;
        $stats['members_created']++;
        logMsg('success', "Created member: $first $last ($phone) → $id");
    }
}

// ==============================================
// STEP 4: CREATE MISSING PRODUCTS
// ==============================================
echo "<h2>Step 4: Products</h2>";

$productMap = []; // product_name => product_id
$stmtFindProduct = $db->prepare("SELECT id FROM products WHERE name = :name LIMIT 1");
$stmtInsertProduct = $db->prepare(
    "INSERT INTO products (id, name, sku, category, cost_price, selling_price, current_stock, low_stock_threshold, unit, is_active, notes, created_at)
     VALUES (:id, :name, :sku, :cat, :cost, :sell, 0, 5, 'piece', 1, 'Historical import', NOW())"
);

foreach ($PRODUCTS as $name => $p) {
    $stmtFindProduct->execute(['name' => $name]);
    $existing = $stmtFindProduct->fetch();

    if ($existing) {
        $productMap[$name] = $existing['id'];
        $stats['products_existing']++;
        logMsg('info', "Product exists: $name → {$existing['id']}");
    } else {
        $id = genId();
        if (!$isDryRun) {
            try {
                $stmtInsertProduct->execute([
                    'id' => $id, 'name' => $name, 'sku' => $p['sku'],
                    'cat' => $p['cat'], 'cost' => $p['cost'], 'sell' => $p['sell'],
                ]);
            } catch (PDOException $ex) {
                logMsg('error', "Failed to create product $name: " . $ex->getMessage());
                continue;
            }
        }
        $productMap[$name] = $id;
        $stats['products_created']++;
        logMsg('success', "Created product: $name ({$p['sku']}) — cost {$p['cost']}, sell {$p['sell']}");
    }
}

// ==============================================
// STEP 5: PROCESS INVOICES
// ==============================================
echo "<h2>Step 5: Invoices, Subscriptions &amp; Payments</h2>";

// Prepared statements
$stmtCheckInvoice = $db->prepare("SELECT id FROM invoices WHERE invoice_number = :num LIMIT 1");
$stmtCheckOverlap = $db->prepare(
    "SELECT COUNT(*) as cnt FROM membership_subscriptions
     WHERE member_id = :mid AND slot_id = :sid
       AND start_date <= :end_date AND end_date >= :start_date
       AND status != 'cancelled'"
);
$stmtInsertSub = $db->prepare(
    "INSERT INTO membership_subscriptions
     (id, member_id, plan_id, slot_id, start_date, end_date,
      original_amount, discount_amount, discount_reason, payable_amount,
      status, is_extension, payment_status, notes, created_at)
     VALUES (:id, :mid, :pid, :sid, :start, :end,
             :orig, :disc, :reason, :pay,
             :status, 0, :pstatus, 'Historical import', NOW())"
);
$stmtInsertInvoice = $db->prepare(
    "INSERT INTO invoices
     (id, invoice_number, invoice_type, member_id,
      amount, tax, discount, discount_reason, total_amount, amount_paid,
      invoice_date, due_date, paid_date, status, items, subscription_id, notes, created_at)
     VALUES (:id, :num, :type, :mid,
             :amount, 0, :discount, :dreason, :total, :paid,
             :idate, :ddate, :pdate, :status, :items, :sid, :notes, NOW())"
);
$stmtInsertPayment = $db->prepare(
    "INSERT INTO payments
     (id, invoice_id, member_id, amount, payment_method, payment_date,
      status, receipt_number, notes, created_at)
     VALUES (:id, :iid, :mid, :amount, 'upi', :pdate,
             'completed', :receipt, 'Historical import', NOW())"
);

// Receipt number sequence (RCP-H prefix for historical)
$receiptSeq = 1;
$rRow = $db->query("SELECT MAX(CAST(SUBSTRING(receipt_number, 6) AS UNSIGNED)) as mx FROM payments WHERE receipt_number LIKE 'RCP-H%'")->fetch();
if ($rRow && $rRow['mx']) $receiptSeq = (int)$rRow['mx'] + 1;

// Sort invoice groups by number for consistent order
ksort($invoiceGroups);

foreach ($invoiceGroups as $invNum => $rows) {
    $firstRow  = $rows[0];
    $invDate   = csvDate($firstRow[1]);
    $invStatus = $firstRow[2]; // Closed, Void, Draft
    $phone     = $firstRow[15];
    $csvName   = $firstRow[3];
    $csvTotal  = (float)$firstRow[5];
    $mKey      = memberKey($phone, $csvName);
    $memberId  = $memberMap[$mKey] ?? null;

    if (!$memberId) {
        logMsg('error', "$invNum: No member for $csvName ($phone) — skipping");
        continue;
    }
    if (!$invDate) {
        logMsg('error', "$invNum: Invalid date '{$firstRow[1]}' — skipping");
        continue;
    }

    // Historical invoice number: HINV- prefix to avoid collision with current INV- numbers
    $histInvNum = str_replace('INV-', 'HINV-', $invNum);

    // Idempotency: skip if this HINV- number was already imported in a previous run
    $stmtCheckInvoice->execute(['num' => $histInvNum]);
    if ($stmtCheckInvoice->fetch()) {
        $stats['invoices_skipped']++;
        logMsg('warn', "$invNum → $histInvNum: Already imported — skipping");
        continue;
    }

    // Separate subscription rows from product rows, skip Pause Days
    $subRows = [];
    $prodRows = [];
    foreach ($rows as $r) {
        $itemName = trim($r[7]);
        if ($itemName === 'Pause Days') continue;
        if (trim($r[6]) === 'Subscription') {
            $subRows[] = $r;
        } else {
            $prodRows[] = $r;
        }
    }

    // Invoice status mapping
    $invoiceStatus = 'paid';
    if ($invStatus === 'Void') $invoiceStatus = 'cancelled';
    elseif ($invStatus === 'Draft') $invoiceStatus = 'draft';

    $amountPaid = ($invStatus === 'Closed') ? $csvTotal : 0;
    $paidDate   = ($invStatus === 'Closed') ? $invDate : null;

    $invoiceId     = genId();
    $subscriptionId = null;

    // -----------------------------------------------
    // MEMBERSHIP INVOICE (has subscription rows)
    // -----------------------------------------------
    if (!empty($subRows)) {
        $sr         = $subRows[0];
        $planName   = trim($sr[7]);
        $itemDesc   = trim($sr[8]);
        $sessionStr = trim($sr[9]);
        $discType   = trim($sr[10]);
        $discValue  = trim($sr[11]);
        $qty        = max(1, (int)$sr[4]);

        // Determine plan
        $plan = null;
        if (stripos($planName, 'Monthly') !== false) $plan = $monthlyPlan;
        elseif (stripos($planName, 'Quarterly') !== false) $plan = $quarterlyPlan;

        if (!$plan) {
            logMsg('error', "$invNum: Unknown plan '$planName' — skipping");
            continue;
        }

        // Determine slot
        $slotId = $SLOT_MAP[$sessionStr] ?? null;
        if (!$slotId) {
            logMsg('error', "$invNum: Unknown session '$sessionStr' — skipping");
            continue;
        }

        $basePrice      = (float)$plan['price'];
        $durationMonths = (int)$plan['duration_months'];

        // Parse subscription dates from Item Desc
        [$startDate, $endDate] = parseDates($itemDesc, $invDate, $durationMonths, $qty);

        // Compute discount: original - csv total
        $originalAmount = $basePrice * $qty;
        $payableAmount  = $csvTotal;
        $discountAmount = max(0, $originalAmount - $payableAmount);

        // Discount reason from CSV columns
        $discountReason = null;
        if (!empty($discType) && !empty($discValue)) {
            if (strtolower($discType) === 'percentage') {
                $pct = str_replace('%', '', $discValue);
                $discountReason = "{$pct}% discount (historical)";
            } elseif (strtolower($discType) === 'flat') {
                $discountReason = "Rs $discValue flat discount (historical)";
            }
        }
        if ($discountAmount > 0 && !$discountReason) {
            $discountReason = 'Historical discount';
        }

        // Subscription status — all historical subs are expired (current system manages active ones)
        $subStatus = 'expired';
        if ($invStatus === 'Void') $subStatus = 'cancelled';
        $paymentStatus = ($invStatus === 'Closed') ? 'paid' : 'pending';

        // Check for overlap or void — decide whether to create subscription
        $skipSub = false;
        if ($invStatus === 'Void') {
            $skipSub = true;
            $stats['subscriptions_skipped_void']++;
            logMsg('info', "$invNum: Void invoice — skipping subscription");
        } else {
            $stmtCheckOverlap->execute([
                'mid' => $memberId, 'sid' => $slotId,
                'start_date' => $startDate, 'end_date' => $endDate,
            ]);
            $ov = $stmtCheckOverlap->fetch();
            if ($ov && (int)$ov['cnt'] > 0) {
                $skipSub = true;
                $stats['subscriptions_skipped_overlap']++;
                logMsg('warn', "$invNum: Overlap detected ($startDate to $endDate, $slotId) — skipping subscription");
            }
        }

        if (!$skipSub) {
            $subscriptionId = genId();
            if (!$isDryRun) {
                try {
                    $stmtInsertSub->execute([
                        'id' => $subscriptionId, 'mid' => $memberId,
                        'pid' => $plan['id'], 'sid' => $slotId,
                        'start' => $startDate, 'end' => $endDate,
                        'orig' => $originalAmount, 'disc' => $discountAmount,
                        'reason' => $discountReason, 'pay' => $payableAmount,
                        'status' => $subStatus, 'pstatus' => $paymentStatus,
                    ]);
                } catch (PDOException $ex) {
                    logMsg('error', "$invNum: Subscription insert failed: " . $ex->getMessage());
                    $subscriptionId = null;
                }
            }
            if ($subscriptionId) {
                $stats['subscriptions_created']++;
                logMsg('success', "$invNum: Sub $startDate → $endDate ($slotId) Rs $payableAmount [$subStatus]");

            }
        }

        // Build items JSON for membership invoice
        $slotName  = $SLOT_DISPLAY[$slotId] ?? $slotId;
        $planLabel = ($plan === $monthlyPlan)
            ? "Monthly Membership ({$durationMonths} month)"
            : "Quarterly Membership ({$durationMonths} months)";
        if ($qty > 1) $planLabel .= " x{$qty}";

        $itemsJson = json_encode([[
            'description' => "$planLabel - $slotName",
            'quantity'    => $qty,
            'unitPrice'   => $basePrice,
            'total'       => $originalAmount,
        ]], JSON_UNESCAPED_UNICODE);

        // Create invoice (HINV- number, original CSV number in notes)
        $invNotes = "Historical import (original: $invNum)";
        if (!$isDryRun) {
            try {
                $stmtInsertInvoice->execute([
                    'id' => $invoiceId, 'num' => $histInvNum, 'type' => 'membership',
                    'mid' => $memberId, 'amount' => $originalAmount,
                    'discount' => $discountAmount, 'dreason' => $discountReason,
                    'total' => $payableAmount, 'paid' => $amountPaid,
                    'idate' => $invDate, 'ddate' => $startDate,
                    'pdate' => $paidDate, 'status' => $invoiceStatus,
                    'items' => $itemsJson, 'sid' => $subscriptionId,
                    'notes' => $invNotes,
                ]);
            } catch (PDOException $ex) {
                logMsg('error', "$invNum: Invoice insert failed: " . $ex->getMessage());
                continue; // Skip payment too
            }
        }
        $stats['invoices_created']++;
        logMsg('success', "$invNum → $histInvNum: Membership invoice Rs $payableAmount [$invoiceStatus]");

    // -----------------------------------------------
    // PRODUCT-SALE INVOICE (no subscription rows)
    // -----------------------------------------------
    } else {
        // Aggregate product rows by item name
        $itemAgg = []; // name => [qty, price, cost]
        foreach ($prodRows as $pr) {
            $pName  = trim($pr[7]);
            $pQty   = max(1, (int)$pr[4]);
            $pPrice = (float)$pr[13];
            $pCost  = (float)$pr[12];

            if (!isset($itemAgg[$pName])) {
                $itemAgg[$pName] = ['qty' => 0, 'price' => $pPrice, 'cost' => $pCost];
            }
            $itemAgg[$pName]['qty'] += $pQty;
        }

        // Build items JSON
        $items = [];
        $itemSum = 0;
        foreach ($itemAgg as $pName => $ia) {
            $lineTotal = $ia['qty'] * $ia['price'];
            $itemSum += $lineTotal;
            $item = [
                'description' => $pName,
                'quantity'    => $ia['qty'],
                'unitPrice'   => $ia['price'],
                'total'       => $lineTotal,
            ];
            if ($ia['cost'] > 0) $item['cost'] = $ia['cost'];
            $items[] = $item;
        }

        $itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE);
        $amount    = max($itemSum, $csvTotal);
        $discount  = max(0, $itemSum - $csvTotal);
        $discReason = ($discount > 0) ? 'Historical discount' : null;

        $invNotes = "Historical import (original: $invNum)";
        if (!$isDryRun) {
            try {
                $stmtInsertInvoice->execute([
                    'id' => $invoiceId, 'num' => $histInvNum, 'type' => 'product-sale',
                    'mid' => $memberId, 'amount' => $amount,
                    'discount' => $discount, 'dreason' => $discReason,
                    'total' => $csvTotal, 'paid' => $amountPaid,
                    'idate' => $invDate, 'ddate' => $invDate,
                    'pdate' => $paidDate, 'status' => $invoiceStatus,
                    'items' => $itemsJson, 'sid' => null,
                    'notes' => $invNotes,
                ]);
            } catch (PDOException $ex) {
                logMsg('error', "$invNum: Invoice insert failed: " . $ex->getMessage());
                continue;
            }
        }
        $stats['invoices_created']++;
        $itemNames = implode(', ', array_keys($itemAgg));
        logMsg('success', "$invNum → $histInvNum: Product sale ($itemNames) = Rs $csvTotal [$invoiceStatus]");
    }

    // -----------------------------------------------
    // CREATE PAYMENT (Closed invoices only)
    // -----------------------------------------------
    if ($invStatus === 'Closed' && $csvTotal > 0) {
        $paymentId  = genId();
        $receiptNum = sprintf('RCP-H%04d', $receiptSeq++);

        if (!$isDryRun) {
            try {
                $stmtInsertPayment->execute([
                    'id' => $paymentId, 'iid' => $invoiceId,
                    'mid' => $memberId, 'amount' => $csvTotal,
                    'pdate' => $invDate, 'receipt' => $receiptNum,
                ]);
            } catch (PDOException $ex) {
                logMsg('error', "$invNum: Payment insert failed: " . $ex->getMessage());
                continue;
            }
        }
        $stats['payments_created']++;
    }
}

// ==============================================
// SUMMARY
// ==============================================
echo "<h2>Summary</h2><table>";
echo "<tr><th>Metric</th><th>Count</th></tr>";
foreach ($stats as $k => $v) {
    $label = ucwords(str_replace('_', ' ', $k));
    $color = ($k === 'errors' && $v > 0) ? 'color:red;font-weight:bold' : '';
    echo "<tr><td>$label</td><td style='$color'><strong>$v</strong></td></tr>";
}
echo "</table>";

$backLink = "";

if ($isDryRun) {
    echo "<p style='background:#fff3cd;padding:10px;border:1px solid #ffc107'>";
    echo "<strong>DRY RUN — No changes were made.</strong><br>";
    echo "Review the output above, then <a href='$backLink'>go back</a> and click <strong>Execute Migration</strong>.</p>";
} else {
    echo "<p style='background:#d4edda;padding:10px;border:1px solid #28a745'>";
    echo "<strong>Migration completed!</strong></p>";
    echo "<h3>Post-Migration Checklist:</h3><ul>";
    echo "<li>Historical invoices use <code>HINV-</code> prefix — no conflict with current <code>INV-</code> numbers</li>";
    echo "<li>Historical receipts use <code>RCP-H</code> prefix — no conflict with current receipts</li>";
    echo "<li>Verify a few invoices end-to-end in the admin panel (search for HINV-)</li>";
    echo "</ul>";
}

echo "<p style='margin-top:20px'><a href='$backLink'>← Back to upload form</a></p>";
echo "</body></html>";
