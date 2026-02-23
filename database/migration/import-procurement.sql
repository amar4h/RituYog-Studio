-- ============================================
-- MIGRATION: Import Historical Procurement, Inventory & Expenses
-- Version: 1.6.0
-- Date: 2026-02-19
-- Run in: phpMyAdmin (production or RFS database)
-- ============================================
--
-- What this script does:
--   1. Creates 13 new products (studio supplies & color variants)
--   2. Creates 10 expense records (9 Wiselife purchase orders + 1 Hostinger website)
--      Expense numbers auto-generated from MAX existing
--   3. Creates inventory transactions (purchases, sales, consumption)
--   4. Adjusts current_stock on existing products (relative +/-)
--      Sets current_stock on new products (absolute)
--
-- Totals (from reconciled purchase records):
--   Wiselife (6 purchase orders):  Rs 50,980.00
--   Hostinger (website):           Rs  6,997.56
--   Grand total:                   Rs 57,977.56
--
-- Purchase Orders:
--   R1: Sep 23 = 16,350  |  R2a: Oct 11 = 5,100  |  R2b: Oct 21 = 2,950
--   R2c: Nov 04 = 2,750  |  R3: Nov 05 = 6,000   |  R4a: Nov 13 = 2,300
--   R4b: Nov 17 = 1,200  |  R5: Dec 10 = 10,900  |  R6: Dec 11 = 3,430
--
-- Prerequisites:
--   - Products from import-historical.php must already exist (15 products)
--   - Product-sale invoices must already exist
--   - Existing expenses/purchases/inventory from app usage are preserved
--
-- Safety: INSERT only + relative stock UPDATE. Run once.
-- ============================================


-- ============================================
-- STEP 1: Look up existing product IDs
-- ============================================

SET @pid_socks_green   = (SELECT id FROM products WHERE name = 'Yoga Socks Green' LIMIT 1);
SET @pid_socks_black   = (SELECT id FROM products WHERE name = 'Yoga Socks Black' LIMIT 1);
SET @pid_true_align    = (SELECT id FROM products WHERE name = 'Yoga Mat True Alignment 10 mm' LIMIT 1);
SET @pid_pu_mat        = (SELECT id FROM products WHERE name = 'Yoga Mat PU 2mm' LIMIT 1);
SET @pid_classic_mat   = (SELECT id FROM products WHERE name = 'Yoga Mat Classic' LIMIT 1);
SET @pid_grip_glove    = (SELECT id FROM products WHERE name = 'Yoga Grip Glove' LIMIT 1);
SET @pid_duffle_bag    = (SELECT id FROM products WHERE name = 'Yoga Duffle Bag' LIMIT 1);
SET @pid_yoga_bag      = (SELECT id FROM products WHERE name = 'Yoga Bag' LIMIT 1);
SET @pid_pullup_bar    = (SELECT id FROM products WHERE name = 'Pullup Bar' LIMIT 1);
SET @pid_yoga_wheel    = (SELECT id FROM products WHERE name = 'Pro Yoga Wheel' LIMIT 1);
SET @pid_yoga_block    = (SELECT id FROM products WHERE name = 'Pro Yoga Block' LIMIT 1);
SET @pid_stretch_belt  = (SELECT id FROM products WHERE name = 'Loop Yoga Stretch belt' LIMIT 1);
SET @pid_classic_8mm   = (SELECT id FROM products WHERE name = 'Classic Yoga mat 8 mm' LIMIT 1);
SET @pid_classic_10mm  = (SELECT id FROM products WHERE name = 'Classic Yoga Mat 10 mm - Maroon' LIMIT 1);

-- Verify all found (should return 14 non-NULL values)
SELECT 'VERIFY: Existing product IDs' AS step;
SELECT
  @pid_socks_green   AS socks_green,
  @pid_socks_black   AS socks_black,
  @pid_true_align    AS true_align,
  @pid_pu_mat        AS pu_mat,
  @pid_classic_mat   AS classic_mat,
  @pid_grip_glove    AS grip_glove,
  @pid_duffle_bag    AS duffle_bag,
  @pid_yoga_bag      AS yoga_bag,
  @pid_pullup_bar    AS pullup_bar,
  @pid_yoga_wheel    AS yoga_wheel,
  @pid_yoga_block    AS yoga_block,
  @pid_stretch_belt  AS stretch_belt,
  @pid_classic_8mm   AS classic_8mm,
  @pid_classic_10mm  AS classic_10mm;


-- ============================================
-- STEP 2: Create new products
-- (SKUs auto-generated from MAX existing per category prefix)
-- ============================================

SET @pid_yoga_belt          = UUID();
SET @pid_mat_markesh        = UUID();
SET @pid_mat_shampoo        = UUID();
SET @pid_gym_towel          = UUID();
SET @pid_headband           = UUID();
SET @pid_classic_6mm        = UUID();
SET @pid_classic_10mm_mar   = UUID();
SET @pid_gliding_disk       = UUID();
SET @pid_knee_pad           = UUID();
SET @pid_cushion_pad        = UUID();
SET @pid_classic_8mm_green  = UUID();
SET @pid_classic_8mm_mar    = UUID();
SET @pid_dual_layer_mat     = UUID();

-- Auto-generate SKUs from MAX existing per category prefix
SET @max_acc = (SELECT COALESCE(MAX(CAST(SUBSTRING(sku, 5) AS UNSIGNED)), 0) FROM products WHERE sku LIKE 'ACC-%');
SET @max_yeq = (SELECT COALESCE(MAX(CAST(SUBSTRING(sku, 5) AS UNSIGNED)), 0) FROM products WHERE sku LIKE 'YEQ-%');
SET @max_oth = (SELECT COALESCE(MAX(CAST(SUBSTRING(sku, 5) AS UNSIGNED)), 0) FROM products WHERE sku LIKE 'OTH-%');

-- ACC: Yoga Belt, Head Band, Gym Towel
SET @sku_acc_1 = CONCAT('ACC-', LPAD(@max_acc + 1, 3, '0'));
SET @sku_acc_2 = CONCAT('ACC-', LPAD(@max_acc + 2, 3, '0'));
SET @sku_acc_3 = CONCAT('ACC-', LPAD(@max_acc + 3, 3, '0'));
-- YEQ: Markesh, Gliding Disk, Knee Pad, Cushion Pad, Dual Layer, 6mm, 10mm Maroon, 8mm Green, 8mm Maroon
SET @sku_yeq_1 = CONCAT('YEQ-', LPAD(@max_yeq + 1, 3, '0'));
SET @sku_yeq_2 = CONCAT('YEQ-', LPAD(@max_yeq + 2, 3, '0'));
SET @sku_yeq_3 = CONCAT('YEQ-', LPAD(@max_yeq + 3, 3, '0'));
SET @sku_yeq_4 = CONCAT('YEQ-', LPAD(@max_yeq + 4, 3, '0'));
SET @sku_yeq_5 = CONCAT('YEQ-', LPAD(@max_yeq + 5, 3, '0'));
SET @sku_yeq_6 = CONCAT('YEQ-', LPAD(@max_yeq + 6, 3, '0'));
SET @sku_yeq_7 = CONCAT('YEQ-', LPAD(@max_yeq + 7, 3, '0'));
SET @sku_yeq_8 = CONCAT('YEQ-', LPAD(@max_yeq + 8, 3, '0'));
SET @sku_yeq_9 = CONCAT('YEQ-', LPAD(@max_yeq + 9, 3, '0'));
-- OTH: Yoga Mat Shampoo
SET @sku_oth_1 = CONCAT('OTH-', LPAD(@max_oth + 1, 3, '0'));

SELECT @sku_acc_1 AS first_acc, @sku_acc_3 AS last_acc, @sku_yeq_1 AS first_yeq, @sku_yeq_9 AS last_yeq, @sku_oth_1 AS first_oth;

INSERT INTO products (id, name, sku, category, cost_price, selling_price, current_stock, low_stock_threshold, unit, is_active, notes) VALUES
-- Consumed-only items (is_active = FALSE, low_stock_threshold = 0)
(@pid_yoga_belt,         'Yoga Belt',                     @sku_acc_1, 'accessories',    120.00,  200.00, 0, 0, 'piece', FALSE, 'Studio supply'),
(@pid_mat_markesh,       'Yoga Mat Markesh',              @sku_yeq_1, 'yoga-equipment', 2600.00, 3500.00, 0, 0, 'piece', FALSE, 'Studio supply'),
(@pid_headband,          'Head Band',                     @sku_acc_2, 'accessories',    100.00,  150.00, 0, 0, 'piece', FALSE, 'Studio supply'),
(@pid_gliding_disk,      'Gliding Disk',                  @sku_yeq_2, 'yoga-equipment', 250.00,  400.00, 0, 0, 'piece', FALSE, 'Studio supply'),
(@pid_knee_pad,          'Pro Knee Pad',                  @sku_yeq_3, 'yoga-equipment', 350.00,  500.00, 0, 0, 'piece', FALSE, 'Studio supply'),
(@pid_cushion_pad,       'Cushion Pad',                   @sku_yeq_4, 'yoga-equipment', 450.00,  650.00, 0, 0, 'piece', FALSE, 'Studio supply'),
(@pid_dual_layer_mat,    'Dual Layer Classic Yoga Mat',   @sku_yeq_5, 'yoga-equipment', 600.00,  900.00, 0, 0, 'piece', FALSE, 'Studio supply'),
(@pid_classic_8mm_green, 'Classic Yoga Mat 8 mm Green',   @sku_yeq_8, 'yoga-equipment', 500.00,  850.00, 0, 0, 'piece', FALSE, 'Sold (unrecorded)'),
(@pid_classic_8mm_mar,   'Classic Yoga Mat 8 mm Maroon',  @sku_yeq_9, 'yoga-equipment', 500.00,  850.00, 0, 0, 'piece', FALSE, 'Untracked disposal'),
-- In-stock items (is_active = TRUE)
(@pid_mat_shampoo,       'Yoga Mat Shampoo',              @sku_oth_1, 'other',          180.00,  300.00, 0, 1, 'piece', TRUE, NULL),
(@pid_gym_towel,         'Gym Towel',                     @sku_acc_3, 'accessories',    150.00,  250.00, 0, 1, 'piece', TRUE, NULL),
(@pid_classic_6mm,       'Classic Yoga Mat 6 mm',         @sku_yeq_6, 'yoga-equipment', 400.00,  650.00, 0, 1, 'piece', TRUE, NULL),
(@pid_classic_10mm_mar,  'Classic Yoga Mat 10 mm Maroon', @sku_yeq_7, 'yoga-equipment', 600.00, 1000.00, 0, 1, 'piece', TRUE, NULL);

SELECT 'STEP 2 DONE: 13 new products created' AS step;


-- ============================================
-- STEP 3: Create expense records
-- ============================================
-- 10 expenses from reconciled purchase orders:
--
-- Sep 2025:
--   Sep 23 - Wiselife Purchase Order R1              = 16,350.00
-- Oct 2025:
--   Oct 11 - Wiselife Purchase Order R2a             =  5,100.00
--   Oct 21 - Wiselife Purchase Order R2b             =  2,950.00
-- Nov 2025:
--   Nov 04 - Wiselife Purchase Order R2c             =  2,750.00
--   Nov 05 - Wiselife Purchase Order R3              =  6,000.00
--   Nov 13 - Wiselife Purchase Order R4a             =  2,300.00
--   Nov 17 - Wiselife Purchase Order R4b             =  1,200.00
--   Nov 26 - Hostinger Website Setup                 =  6,997.56
-- Dec 2025:
--   Dec 10 - Wiselife Purchase Order R5              = 10,900.00
--   Dec 11 - Wiselife Purchase Order R6              =  3,430.00
-- (Expense numbers auto-generated from MAX existing)
--                                                         Total = 57,977.56
-- ============================================

SET @eid_sep23    = UUID();
SET @eid_oct11    = UUID();
SET @eid_oct21    = UUID();
SET @eid_nov04    = UUID();
SET @eid_nov05    = UUID();
SET @eid_nov13    = UUID();
SET @eid_nov17    = UUID();
SET @eid_website  = UUID();
SET @eid_dec10    = UUID();
SET @eid_dec11    = UUID();

-- Auto-generate expense numbers from MAX existing
SET @max_exp = (SELECT COALESCE(MAX(CAST(SUBSTRING(expense_number, 5) AS UNSIGNED)), 0) FROM expenses);
SET @exp_01 = CONCAT('EXP-', LPAD(@max_exp + 1, 5, '0'));
SET @exp_02 = CONCAT('EXP-', LPAD(@max_exp + 2, 5, '0'));
SET @exp_03 = CONCAT('EXP-', LPAD(@max_exp + 3, 5, '0'));
SET @exp_04 = CONCAT('EXP-', LPAD(@max_exp + 4, 5, '0'));
SET @exp_05 = CONCAT('EXP-', LPAD(@max_exp + 5, 5, '0'));
SET @exp_06 = CONCAT('EXP-', LPAD(@max_exp + 6, 5, '0'));
SET @exp_07 = CONCAT('EXP-', LPAD(@max_exp + 7, 5, '0'));
SET @exp_08 = CONCAT('EXP-', LPAD(@max_exp + 8, 5, '0'));
SET @exp_09 = CONCAT('EXP-', LPAD(@max_exp + 9, 5, '0'));
SET @exp_10 = CONCAT('EXP-', LPAD(@max_exp + 10, 5, '0'));

SELECT @exp_01 AS first_exp_number, @exp_10 AS last_exp_number;

-- --- Sep 23 - Wiselife R1 (16,350) ---
INSERT INTO expenses (id, expense_number, category, description, vendor_name, amount, tax_amount, shipping_cost, total_amount, amount_paid, items, expense_date, paid_date, payment_status, payment_method, notes)
VALUES (
  @eid_sep23, @exp_01, 'procurement', 'Procurement - Wiselife', 'Wiselife',
  16350.00, 0, 0, 16350.00, 16350.00,
  CONCAT('[',
    '{"description":"Pro Yoga Wheel","productId":"',        @pid_yoga_wheel,   '","quantity":10,"unitCost":800,"total":8000},',
    '{"description":"Pro Yoga Block","productId":"',        @pid_yoga_block,   '","quantity":8,"unitCost":400,"total":3200},',
    '{"description":"Yoga Mat Classic","productId":"',      @pid_classic_mat,  '","quantity":1,"unitCost":750,"total":750},',
    '{"description":"Yoga Belt","productId":"',             @pid_yoga_belt,    '","quantity":6,"unitCost":120,"total":720},',
    '{"description":"Loop Yoga Stretch belt","productId":"',@pid_stretch_belt, '","quantity":2,"unitCost":150,"total":300},',
    '{"description":"Yoga Mat Markesh","productId":"',      @pid_mat_markesh,  '","quantity":1,"unitCost":2600,"total":2600},',
    '{"description":"Yoga Mat Shampoo","productId":"',      @pid_mat_shampoo,  '","quantity":1,"unitCost":180,"total":180},',
    '{"description":"Yoga Socks Black","productId":"',      @pid_socks_black,  '","quantity":1,"unitCost":250,"total":250},',
    '{"description":"Gym Towel","productId":"',             @pid_gym_towel,    '","quantity":1,"unitCost":150,"total":150},',
    '{"description":"Head Band","productId":"',             @pid_headband,     '","quantity":2,"unitCost":100,"total":200}',
  ']'),
  '2025-09-23', '2025-09-23', 'paid', 'bank-transfer', 'Studio supplies and initial stock'
);

-- --- Oct 11 - Wiselife R2a (5,100) ---
INSERT INTO expenses (id, expense_number, category, description, vendor_name, amount, tax_amount, shipping_cost, total_amount, amount_paid, items, expense_date, paid_date, payment_status, payment_method, notes)
VALUES (
  @eid_oct11, @exp_02, 'procurement', 'Procurement - Wiselife', 'Wiselife',
  5100.00, 0, 0, 5100.00, 5100.00,
  CONCAT('[',
    '{"description":"Yoga Mat True Alignment 10 mm","productId":"', @pid_true_align, '","quantity":3,"unitCost":750,"total":2250},',
    '{"description":"Yoga Mat PU 2mm","productId":"',               @pid_pu_mat,     '","quantity":2,"unitCost":1250,"total":2500},',
    '{"description":"Yoga Duffle Bag","productId":"',               @pid_duffle_bag, '","quantity":1,"unitCost":350,"total":350}',
  ']'),
  '2025-10-11', '2025-10-11', 'paid', 'bank-transfer', NULL
);

-- --- Oct 21 - Wiselife R2b (2,950) ---
INSERT INTO expenses (id, expense_number, category, description, vendor_name, amount, tax_amount, shipping_cost, total_amount, amount_paid, items, expense_date, paid_date, payment_status, payment_method, notes)
VALUES (
  @eid_oct21, @exp_03, 'procurement', 'Procurement - Wiselife', 'Wiselife',
  2950.00, 0, 0, 2950.00, 2950.00,
  CONCAT('[',
    '{"description":"Yoga Mat True Alignment 10 mm","productId":"', @pid_true_align, '","quantity":3,"unitCost":750,"total":2250},',
    '{"description":"Yoga Duffle Bag","productId":"',               @pid_duffle_bag, '","quantity":2,"unitCost":350,"total":700}',
  ']'),
  '2025-10-21', '2025-10-21', 'paid', 'bank-transfer', NULL
);

-- --- Nov 04 - Wiselife R2c (2,750) ---
INSERT INTO expenses (id, expense_number, category, description, vendor_name, amount, tax_amount, shipping_cost, total_amount, amount_paid, items, expense_date, paid_date, payment_status, payment_method, notes)
VALUES (
  @eid_nov04, @exp_04, 'procurement', 'Procurement - Wiselife', 'Wiselife',
  2750.00, 0, 0, 2750.00, 2750.00,
  CONCAT('[',
    '{"description":"Classic Yoga Mat 10 mm","productId":"',            @pid_classic_10mm, '","quantity":1,"unitCost":500,"total":500},',
    '{"description":"Yoga Mat True Alignment 10 mm","productId":"',     @pid_true_align,   '","quantity":3,"unitCost":750,"total":2250}',
  ']'),
  '2025-11-04', '2025-11-04', 'paid', 'bank-transfer', NULL
);

-- --- Nov 05 - Wiselife R3 (6,000) ---
INSERT INTO expenses (id, expense_number, category, description, vendor_name, amount, tax_amount, shipping_cost, total_amount, amount_paid, items, expense_date, paid_date, payment_status, payment_method, notes)
VALUES (
  @eid_nov05, @exp_05, 'procurement', 'Procurement - Wiselife', 'Wiselife',
  6000.00, 0, 0, 6000.00, 6000.00,
  CONCAT('[',
    '{"description":"Classic Yoga Mat 6 mm","productId":"',  @pid_classic_6mm,   '","quantity":1,"unitCost":400,"total":400},',
    '{"description":"Classic Yoga mat 8 mm","productId":"',  @pid_classic_8mm,   '","quantity":1,"unitCost":500,"total":500},',
    '{"description":"Yoga Bag","productId":"',               @pid_yoga_bag,      '","quantity":5,"unitCost":300,"total":1500},',
    '{"description":"Yoga Duffle Bag","productId":"',        @pid_duffle_bag,    '","quantity":1,"unitCost":350,"total":350},',
    '{"description":"Gliding Disk","productId":"',           @pid_gliding_disk,  '","quantity":1,"unitCost":250,"total":250},',
    '{"description":"Pro Knee Pad","productId":"',           @pid_knee_pad,      '","quantity":1,"unitCost":350,"total":350},',
    '{"description":"Cushion Pad","productId":"',            @pid_cushion_pad,   '","quantity":1,"unitCost":450,"total":450},',
    '{"description":"Pullup Bar","productId":"',             @pid_pullup_bar,    '","quantity":1,"unitCost":600,"total":600},',
    '{"description":"Pro Yoga Wheel","productId":"',         @pid_yoga_wheel,    '","quantity":2,"unitCost":800,"total":1600}',
  ']'),
  '2025-11-05', '2025-11-05', 'paid', 'bank-transfer', 'Studio supplies and stock replenishment'
);

-- --- Nov 13 - Wiselife R4a (2,300) ---
INSERT INTO expenses (id, expense_number, category, description, vendor_name, amount, tax_amount, shipping_cost, total_amount, amount_paid, items, expense_date, paid_date, payment_status, payment_method, notes)
VALUES (
  @eid_nov13, @exp_06, 'procurement', 'Procurement - Wiselife', 'Wiselife',
  2300.00, 0, 0, 2300.00, 2300.00,
  CONCAT('[',
    '{"description":"Classic Yoga Mat 10 mm","productId":"',  @pid_classic_10mm, '","quantity":2,"unitCost":600,"total":1200},',
    '{"description":"Classic Yoga mat 8 mm","productId":"',   @pid_classic_8mm,  '","quantity":1,"unitCost":500,"total":500},',
    '{"description":"Pullup Bar","productId":"',              @pid_pullup_bar,   '","quantity":1,"unitCost":600,"total":600}',
  ']'),
  '2025-11-13', '2025-11-13', 'paid', 'bank-transfer', NULL
);

-- --- Nov 17 - Wiselife R4b (1,200) ---
INSERT INTO expenses (id, expense_number, category, description, vendor_name, amount, tax_amount, shipping_cost, total_amount, amount_paid, items, expense_date, paid_date, payment_status, payment_method, notes)
VALUES (
  @eid_nov17, @exp_07, 'procurement', 'Procurement - Wiselife', 'Wiselife',
  1200.00, 0, 0, 1200.00, 1200.00,
  CONCAT('[',
    '{"description":"Pullup Bar","productId":"', @pid_pullup_bar, '","quantity":2,"unitCost":600,"total":1200}',
  ']'),
  '2025-11-17', '2025-11-17', 'paid', 'bank-transfer', NULL
);

-- --- Nov 26 - Hostinger Website Setup (6,997.56) ---
INSERT INTO expenses (id, expense_number, category, description, vendor_name, amount, tax_amount, shipping_cost, total_amount, amount_paid, items, expense_date, paid_date, payment_status, payment_method, notes)
VALUES (
  @eid_website, @exp_08, 'other', 'Website Setup & Hosting', 'Hostinger',
  6997.56, 0, 0, 6997.56, 6997.56,
  '[{"description":"Website Setup & Hosting","quantity":1,"unitCost":6997.56,"total":6997.56}]',
  '2025-11-26', '2025-11-26', 'paid', 'card', 'Annual hosting + domain'
);

-- --- Dec 10 - Wiselife R5 (10,900) ---
INSERT INTO expenses (id, expense_number, category, description, vendor_name, amount, tax_amount, shipping_cost, total_amount, amount_paid, items, expense_date, paid_date, payment_status, payment_method, notes)
VALUES (
  @eid_dec10, @exp_09, 'procurement', 'Procurement - Wiselife', 'Wiselife',
  10900.00, 0, 0, 10900.00, 10900.00,
  CONCAT('[',
    '{"description":"Classic Yoga Mat 10 mm","productId":"',            @pid_classic_10mm,    '","quantity":3,"unitCost":600,"total":1800},',
    '{"description":"Classic Yoga Mat 10 mm Maroon","productId":"',     @pid_classic_10mm_mar,'","quantity":1,"unitCost":600,"total":600},',
    '{"description":"Classic Yoga mat 8 mm","productId":"',             @pid_classic_8mm,     '","quantity":1,"unitCost":500,"total":500},',
    '{"description":"Classic Yoga Mat 8 mm Green","productId":"',      @pid_classic_8mm_green,'","quantity":1,"unitCost":500,"total":500},',
    '{"description":"Yoga Mat True Alignment 10 mm","productId":"',     @pid_true_align,      '","quantity":1,"unitCost":700,"total":700},',
    '{"description":"Yoga Duffle Bag","productId":"',                   @pid_duffle_bag,      '","quantity":1,"unitCost":300,"total":300},',
    '{"description":"Yoga Socks Black","productId":"',                  @pid_socks_black,     '","quantity":18,"unitCost":250,"total":4500},',
    '{"description":"Yoga Socks Green","productId":"',                  @pid_socks_green,     '","quantity":8,"unitCost":250,"total":2000}',
  ']'),
  '2025-12-10', '2025-12-10', 'paid', 'bank-transfer', NULL
);

-- --- Dec 11 - Wiselife R6 (3,430) ---
INSERT INTO expenses (id, expense_number, category, description, vendor_name, amount, tax_amount, shipping_cost, total_amount, amount_paid, items, expense_date, paid_date, payment_status, payment_method, notes)
VALUES (
  @eid_dec11, @exp_10, 'procurement', 'Procurement - Wiselife', 'Wiselife',
  3430.00, 0, 0, 3430.00, 3430.00,
  CONCAT('[',
    '{"description":"Dual Layer Classic Yoga Mat","productId":"',       @pid_dual_layer_mat,  '","quantity":1,"unitCost":600,"total":600},',
    '{"description":"Classic Yoga Mat 10 mm Maroon","productId":"',     @pid_classic_10mm_mar,'","quantity":1,"unitCost":600,"total":600},',
    '{"description":"Classic Yoga mat 8 mm","productId":"',             @pid_classic_8mm,     '","quantity":1,"unitCost":500,"total":500},',
    '{"description":"Classic Yoga Mat 8 mm Maroon","productId":"',     @pid_classic_8mm_mar, '","quantity":1,"unitCost":500,"total":500},',
    '{"description":"Yoga Mat True Alignment 10 mm","productId":"',     @pid_true_align,      '","quantity":1,"unitCost":700,"total":700},',
    '{"description":"Yoga Bag","productId":"',                          @pid_yoga_bag,        '","quantity":1,"unitCost":280,"total":280},',
    '{"description":"Yoga Grip Glove","productId":"',                   @pid_grip_glove,      '","quantity":1,"unitCost":250,"total":250}',
  ']'),
  '2025-12-11', '2025-12-11', 'paid', 'bank-transfer', NULL
);

SELECT 'STEP 3 DONE: 10 expenses created (total Rs 57,977.56)' AS step;


-- ============================================
-- STEP 4: Inventory Transactions - PURCHASES
-- One aggregate transaction per product
-- ============================================
-- Total purchased per product = sold + consumed + final_stock

INSERT INTO inventory_transactions
  (id, product_id, type, quantity, unit_cost, total_value, expense_id, vendor_name, previous_stock, new_stock, transaction_date, notes)
VALUES
-- Pro Yoga Wheel: 12 bought (10 Sep + 2 Nov)
(UUID(), @pid_yoga_wheel,    'purchase', 12,  800.00, 9600.00, NULL, 'Wiselife',  0, 12, '2025-09-23', 'Historical procurement (Sep-Nov 2025)'),
-- Pro Yoga Block: 8 bought (Sep)
(UUID(), @pid_yoga_block,    'purchase',  8,  400.00, 3200.00, @eid_sep23, 'Wiselife',  0,  8, '2025-09-23', 'Historical procurement (Sep 2025)'),
-- Yoga Mat Classic: 1 bought (Sep @750)
(UUID(), @pid_classic_mat,   'purchase',  1,  750.00,  750.00, @eid_sep23, 'Wiselife',  0,  1, '2025-09-23', 'Historical procurement (Sep 2025)'),
-- Classic Yoga Mat 10 mm: 6 bought (1@500 Nov + 2@600 Nov + 3@600 Dec)
(UUID(), @pid_classic_10mm,  'purchase',  6,  583.33, 3500.00, NULL, 'Wiselife',  0,  6, '2025-11-04', 'Historical procurement (Nov-Dec 2025)'),
-- Classic Yoga mat 8 mm: 5 bought (1 Nov5 + 1 Nov13 + 1 Dec10 + 1 Dec11 + 1 extra) — 4 sold + 1 exchanged
(UUID(), @pid_classic_8mm,   'purchase',  5,  500.00, 2500.00, NULL, 'Wiselife',  0,  5, '2025-11-05', 'Historical procurement (Nov-Dec 2025)'),
-- Classic Yoga Mat 8 mm Green: 1 bought (Dec10) — in stock
(UUID(), @pid_classic_8mm_green, 'purchase', 1, 500.00, 500.00, @eid_dec10, 'Wiselife', 0, 1, '2025-12-10', 'Stock'),
-- Classic Yoga Mat 8 mm Maroon: 1 bought (Dec11) — in stock
(UUID(), @pid_classic_8mm_mar, 'purchase', 1, 500.00, 500.00, @eid_dec11, 'Wiselife', 0, 1, '2025-12-11', 'Stock'),
-- Loop Yoga Stretch belt: 2 bought (Sep)
(UUID(), @pid_stretch_belt,  'purchase',  2,  150.00,  300.00, @eid_sep23, 'Wiselife',  0,  2, '2025-09-23', 'Historical procurement (Sep 2025)'),
-- Yoga Mat PU 2mm: 2 bought (Oct)
(UUID(), @pid_pu_mat,        'purchase',  2, 1250.00, 2500.00, @eid_oct11, 'Wiselife',  0,  2, '2025-10-11', 'Historical procurement (Oct 2025)'),
-- Pullup Bar: 4 bought (1 Nov5 + 1 Nov13 + 2 Nov17)
(UUID(), @pid_pullup_bar,    'purchase',  4,  600.00, 2400.00, NULL, 'Wiselife',  0,  4, '2025-11-05', 'Historical procurement (Nov 2025)'),
-- Yoga Bag: 6 bought (5@300 Nov + 1@280 Dec)
(UUID(), @pid_yoga_bag,      'purchase',  6,  296.67, 1780.00, NULL, 'Wiselife',  0,  6, '2025-11-05', 'Historical procurement (Nov-Dec 2025)'),
-- Yoga Duffle Bag: 5 bought (1@350 Oct11 + 2@350 Oct21 + 1@350 Nov5 + 1@300 Dec10)
(UUID(), @pid_duffle_bag,    'purchase',  5,  340.00, 1700.00, NULL, 'Wiselife',  0,  5, '2025-10-11', 'Historical procurement (Oct-Dec 2025)'),
-- Yoga Grip Glove: 1 bought (Dec)
(UUID(), @pid_grip_glove,    'purchase',  1,  250.00,  250.00, @eid_dec11, 'Wiselife',  0,  1, '2025-12-11', 'Historical procurement (Dec 2025)'),
-- Yoga Socks Black: 19 bought (1 Sep + 18 Dec)
(UUID(), @pid_socks_black,   'purchase', 19,  250.00, 4750.00, NULL, 'Wiselife',  0, 19, '2025-09-23', 'Historical procurement (Sep-Dec 2025)'),
-- Yoga Socks Green: 8 bought (Dec)
(UUID(), @pid_socks_green,   'purchase',  8,  250.00, 2000.00, @eid_dec10, 'Wiselife',  0,  8, '2025-12-10', 'Historical procurement (Dec 2025)'),
-- Yoga Mat True Alignment 10 mm: 11 bought (3@750 Oct11 + 3@750 Oct21 + 3@750 Nov4 + 1@700 Dec10 + 1@700 Dec11)
(UUID(), @pid_true_align,    'purchase', 11,  740.91, 8150.00, NULL, 'Wiselife',  0, 11, '2025-10-11', 'Historical procurement (Oct-Dec 2025)'),
-- Classic Yoga Mat 10 mm Maroon: 2 bought (1 Dec10 + 1 Dec11)
(UUID(), @pid_classic_10mm_mar, 'purchase', 2, 600.00, 1200.00, NULL, 'Wiselife', 0, 2, '2025-12-10', 'Stock'),
-- New products from Sep 23
(UUID(), @pid_yoga_belt,     'purchase',  6,  120.00,  720.00, @eid_sep23, 'Wiselife',  0,  6, '2025-09-23', 'Studio supplies'),
(UUID(), @pid_mat_markesh,   'purchase',  1, 2600.00, 2600.00, @eid_sep23, 'Wiselife',  0,  1, '2025-09-23', 'Studio supplies'),
(UUID(), @pid_mat_shampoo,   'purchase',  1,  180.00,  180.00, @eid_sep23, 'Wiselife',  0,  1, '2025-09-23', 'Stock'),
(UUID(), @pid_gym_towel,     'purchase',  1,  150.00,  150.00, @eid_sep23, 'Wiselife',  0,  1, '2025-09-23', 'Stock'),
(UUID(), @pid_headband,      'purchase',  2,  100.00,  200.00, @eid_sep23, 'Wiselife',  0,  2, '2025-09-23', 'Studio supplies'),
-- New products from Nov 05
(UUID(), @pid_classic_6mm,   'purchase',  1,  400.00,  400.00, @eid_nov05, 'Wiselife',  0,  1, '2025-11-05', 'Stock'),
(UUID(), @pid_gliding_disk,  'purchase',  1,  250.00,  250.00, @eid_nov05, 'Wiselife',  0,  1, '2025-11-05', 'Studio supplies'),
(UUID(), @pid_knee_pad,      'purchase',  1,  350.00,  350.00, @eid_nov05, 'Wiselife',  0,  1, '2025-11-05', 'Studio supplies'),
(UUID(), @pid_cushion_pad,   'purchase',  1,  450.00,  450.00, @eid_nov05, 'Wiselife',  0,  1, '2025-11-05', 'Studio supplies'),
-- New product from Dec 11
(UUID(), @pid_dual_layer_mat, 'purchase', 1,  600.00,  600.00, @eid_dec11, 'Wiselife',  0,  1, '2025-12-11', 'Studio supplies');

SELECT 'STEP 4 DONE: Purchase transactions created' AS step;


-- ============================================
-- STEP 5: Inventory Transactions - SALES
-- Aggregate per product (total qty sold)
-- ============================================

INSERT INTO inventory_transactions
  (id, product_id, type, quantity, unit_cost, total_value, previous_stock, new_stock, transaction_date, notes)
VALUES
-- Yoga Mat Classic: sold 1, stock 1→0
(UUID(), @pid_classic_mat,   'sale',  -1,  750.00,   750.00,  1,  0, '2025-10-13', 'Historical sale (1 unit, Oct 2025)'),
-- Classic Yoga Mat 10 mm: sold 5 (1 returned for 8mm exchange), stock 6→1
(UUID(), @pid_classic_10mm,  'sale',  -5,  583.33, 2916.67,  6,  1, '2025-12-31', 'Historical sales (5 units, Nov-Dec 2025; 1 returned for 8mm exchange)'),
-- Classic Yoga mat 8 mm: sold 4, stock 5→1
(UUID(), @pid_classic_8mm,   'sale',  -4,  500.00, 2000.00,  5,  1, '2025-12-31', 'Historical sales (4 units, Dec 2025)'),
-- Classic Yoga mat 8 mm: 1 given in exchange for 10mm (invoice HINV-000118), stock 1→0
(UUID(), @pid_classic_8mm,   'sale',  -1,  500.00,  500.00,  1,  0, '2025-12-31', 'Exchange for 10mm on invoice HINV-000118'),
-- Classic Yoga Mat 8 mm Green: sold 1 (unrecorded), stock 1→0
(UUID(), @pid_classic_8mm_green, 'sale', -1, 500.00, 500.00, 1, 0, '2025-12-31', 'Unrecorded sale (1 unit)'),
-- Loop Yoga Stretch belt: sold 1, stock 2→1
(UUID(), @pid_stretch_belt,  'sale',  -1,  150.00,  150.00,  2,  1, '2025-10-11', 'Historical sale (1 unit, Oct 2025)'),
-- Pro Yoga Block: sold 1, stock 8→7
(UUID(), @pid_yoga_block,    'sale',  -1,  400.00,  400.00,  8,  7, '2025-11-12', 'Historical sale (1 unit, Nov 2025)'),
-- Yoga Mat PU 2mm: sold 2, stock 2→0
(UUID(), @pid_pu_mat,        'sale',  -2, 1250.00, 2500.00,  2,  0, '2025-10-11', 'Historical sales (2 units, Oct 2025)'),
-- Pullup Bar: sold 3, stock 4→1
(UUID(), @pid_pullup_bar,    'sale',  -3,  600.00, 1800.00,  4,  1, '2025-11-30', 'Historical sales (3 units, Nov 2025)'),
-- Yoga Bag: sold 3, stock 6→3
(UUID(), @pid_yoga_bag,      'sale',  -3,  300.00,  900.00,  6,  3, '2025-12-31', 'Historical sales (3 units, Nov-Dec 2025)'),
-- Yoga Duffle Bag: sold 4, stock 5→1
(UUID(), @pid_duffle_bag,    'sale',  -4,  350.00, 1400.00,  5,  1, '2025-12-31', 'Historical sales (4 units, Oct-Dec 2025)'),
-- Yoga Grip Glove: sold 1, stock 1→0
(UUID(), @pid_grip_glove,    'sale',  -1,  250.00,  250.00,  1,  0, '2025-12-16', 'Historical sale (1 unit, Dec 2025)'),
-- Yoga Socks Black: sold 17, stock 19→2
(UUID(), @pid_socks_black,   'sale', -17,  250.00, 4250.00, 19,  2, '2026-01-07', 'Historical sales (17 units, Dec 2025-Jan 2026)'),
-- Yoga Socks Green: sold 7, stock 8→1
(UUID(), @pid_socks_green,   'sale',  -7,  250.00, 1750.00,  8,  1, '2025-12-31', 'Historical sales (7 units, Dec 2025)'),
-- Pro Yoga Wheel: sold 2, stock 12→10
(UUID(), @pid_yoga_wheel,    'sale',  -2,  800.00, 1600.00, 12, 10, '2025-11-10', 'Historical sales (2 units, Oct-Nov 2025)'),
-- Yoga Mat True Alignment 10 mm: sold 11, stock 11→0
(UUID(), @pid_true_align,    'sale', -11,  740.91, 8150.00, 11,  0, '2025-12-31', 'Historical sales (11 units, Oct-Dec 2025)');

SELECT 'STEP 5 DONE: Sale transactions created' AS step;


-- ============================================
-- STEP 6: Inventory Transactions - CONSUMED
-- Studio consumption (stock removed)
-- ============================================

INSERT INTO inventory_transactions
  (id, product_id, type, quantity, unit_cost, total_value, previous_stock, new_stock, transaction_date, notes)
VALUES
-- Pro Yoga Wheel: consumed 9, stock 10→1
(UUID(), @pid_yoga_wheel,    'consumed',  -9,  800.00, 7200.00, 10,  1, '2025-09-23', 'Studio use'),
-- Pro Yoga Block: consumed 6, stock 7→1
(UUID(), @pid_yoga_block,    'consumed',  -6,  400.00, 2400.00,  7,  1, '2025-09-23', 'Studio use'),
-- Yoga Belt: consumed 6, stock 6→0
(UUID(), @pid_yoga_belt,     'consumed',  -6,  120.00,  720.00,  6,  0, '2025-09-23', 'Studio use'),
-- Loop Yoga Stretch belt: consumed 1, stock 1→0
(UUID(), @pid_stretch_belt,  'consumed',  -1,  150.00,  150.00,  1,  0, '2025-09-23', 'Studio use'),
-- Yoga Mat Markesh: consumed 1, stock 1→0
(UUID(), @pid_mat_markesh,   'consumed',  -1, 2600.00, 2600.00,  1,  0, '2025-09-23', 'Studio use'),
-- Yoga Socks Black: consumed 2, stock 2→0
(UUID(), @pid_socks_black,   'consumed',  -2,  250.00,  500.00,  2,  0, '2025-12-10', 'Studio use'),
-- Yoga Socks Green: consumed 1, stock 1→0
(UUID(), @pid_socks_green,   'consumed',  -1,  250.00,  250.00,  1,  0, '2025-12-10', 'Studio use'),
-- Head Band: consumed 2, stock 2→0
(UUID(), @pid_headband,      'consumed',  -2,  100.00,  200.00,  2,  0, '2025-09-23', 'Studio use'),
-- Gliding Disk: consumed 1, stock 1→0
(UUID(), @pid_gliding_disk,  'consumed',  -1,  250.00,  250.00,  1,  0, '2025-11-05', 'Studio use'),
-- Pro Knee Pad: consumed 1, stock 1→0
(UUID(), @pid_knee_pad,      'consumed',  -1,  350.00,  350.00,  1,  0, '2025-11-05', 'Studio use'),
-- Cushion Pad: consumed 1, stock 1→0
(UUID(), @pid_cushion_pad,   'consumed',  -1,  450.00,  450.00,  1,  0, '2025-11-05', 'Studio use'),
-- Pullup Bar: consumed 1, stock 1→0
(UUID(), @pid_pullup_bar,    'consumed',  -1,  600.00,  600.00,  1,  0, '2025-11-05', 'Studio use'),
-- Dual Layer Classic Yoga Mat: consumed 1, stock 1→0
(UUID(), @pid_dual_layer_mat,'consumed',  -1,  600.00,  600.00,  1,  0, '2025-12-11', 'Studio use'),
-- Classic Yoga Mat 8 mm Maroon: consumed 1, stock 1→0 (untracked)
(UUID(), @pid_classic_8mm_mar,'consumed', -1,  500.00,  500.00,  1,  0, '2025-12-11', 'Untracked disposal');

SELECT 'STEP 6 DONE: Consumption transactions created' AS step;


-- ============================================
-- STEP 7: Adjust current_stock on products
-- Existing products: relative adjustment (purchased - sold - consumed)
--   import-historical.php did NOT adjust stock for historical sales
--   App may have recorded newer purchases/sales since then
-- New products: absolute SET (just created, no prior stock)
-- ============================================

-- Existing products — only those with net != 0 need updating
-- Net = purchased - historical_sold - consumed
-- Pro Yoga Wheel: 12 - 2 - 9 = +1
UPDATE products SET current_stock = current_stock + 1 WHERE name = 'Pro Yoga Wheel';
-- Pro Yoga Block: 8 - 1 - 6 = +1
UPDATE products SET current_stock = current_stock + 1 WHERE name = 'Pro Yoga Block';
-- Yoga Bag: 6 - 3 - 0 = +3
UPDATE products SET current_stock = current_stock + 3 WHERE name = 'Yoga Bag';
-- Yoga Duffle Bag: 5 - 4 - 0 = +1
UPDATE products SET current_stock = current_stock + 1 WHERE name = 'Yoga Duffle Bag';
-- Classic Yoga Mat 10 mm: 6 - 5 - 0 = +1 (1 returned from exchange on HINV-000118)
UPDATE products SET current_stock = current_stock + 1 WHERE id = @pid_classic_10mm;
-- All others have net = 0 (purchased = sold + consumed), no stock change needed:
-- Classic Yoga mat 8 mm: 5 - 4 - 1 exchange = 0
-- Loop Yoga Stretch belt: 2 - 1 - 1 = 0
-- Yoga Mat PU 2mm: 2 - 2 - 0 = 0
-- Pullup Bar: 4 - 3 - 1 = 0
-- Yoga Grip Glove: 1 - 1 - 0 = 0
-- Yoga Mat Classic: 1 - 1 - 0 = 0
-- Yoga Socks Black: 19 - 17 - 2 = 0
-- Yoga Socks Green: 8 - 7 - 1 = 0
-- Yoga Mat True Alignment 10 mm: 11 - 11 - 0 = 0

-- New products (absolute SET — just created with current_stock = 0)
UPDATE products SET current_stock = 1 WHERE id = @pid_mat_shampoo;
UPDATE products SET current_stock = 1 WHERE id = @pid_gym_towel;
UPDATE products SET current_stock = 1 WHERE id = @pid_classic_6mm;
UPDATE products SET current_stock = 2 WHERE id = @pid_classic_10mm_mar;
-- These new products have net 0 (all sold/consumed/exchanged), already at 0 from INSERT:
-- @pid_yoga_belt, @pid_mat_markesh, @pid_headband, @pid_gliding_disk,
-- @pid_knee_pad, @pid_cushion_pad, @pid_dual_layer_mat,
-- @pid_classic_8mm_green (1 bought, 1 sold), @pid_classic_8mm_mar (1 bought, 1 consumed)

SELECT 'STEP 7 DONE: current_stock updated' AS step;


-- ============================================
-- STEP 8: Update invoice HINV-000118 (10mm → 8mm exchange)
-- Customer returned 10mm Green mat, received 8mm mat instead.
-- Invoice item updated to reflect 8mm. 10mm stock already +1 in STEP 7.
-- ============================================

-- Get selling prices to calculate invoice total adjustment
SET @price_10mm_sell = (SELECT selling_price FROM products WHERE id = @pid_classic_10mm);
SET @price_8mm_sell  = (SELECT selling_price FROM products WHERE id = @pid_classic_8mm);

SELECT @price_10mm_sell AS '10mm_selling_price', @price_8mm_sell AS '8mm_selling_price',
       (@price_8mm_sell - @price_10mm_sell) AS price_diff;

-- Update invoice items JSON: replace productId and description
-- Also adjust invoice amount for price difference
UPDATE invoices SET
  items = REPLACE(
    REPLACE(items,
      @pid_classic_10mm,
      @pid_classic_8mm),
    'Classic Yoga Mat 10 mm - Maroon',
    'Classic Yoga mat 8 mm'),
  amount = amount - @price_10mm_sell + @price_8mm_sell,
  total_amount = total_amount - @price_10mm_sell + @price_8mm_sell
WHERE invoice_number = 'HINV-000118';

-- NOTE: If the unitPrice/total inside the items JSON also needs updating,
-- verify after running: SELECT items FROM invoices WHERE invoice_number = 'HINV-000118';
-- The productId and description are updated above. The line-item unitPrice
-- in the JSON may still show the old 10mm price — update via Data Tools if needed.

SELECT 'STEP 8 DONE: Invoice HINV-000118 updated (10mm → 8mm exchange)' AS step;

-- Verify the updated invoice
SELECT invoice_number, amount, total_amount, status, items
FROM invoices WHERE invoice_number = 'HINV-000118';


-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Products with stock > 0
SELECT 'Products with stock:' AS verification;
SELECT name, current_stock, cost_price, selling_price, is_active
FROM products
WHERE current_stock > 0
ORDER BY name;

-- All expenses by date
SELECT 'All expenses:' AS verification;
SELECT expense_number, expense_date, vendor_name, category, total_amount, payment_status
FROM expenses
ORDER BY expense_date;

-- Inventory transaction summary per product
SELECT 'Inventory summary:' AS verification;
SELECT
  p.name,
  SUM(CASE WHEN it.type = 'purchase' THEN it.quantity ELSE 0 END) AS purchased,
  SUM(CASE WHEN it.type = 'sale' THEN ABS(it.quantity) ELSE 0 END) AS sold,
  SUM(CASE WHEN it.type = 'consumed' THEN ABS(it.quantity) ELSE 0 END) AS consumed,
  p.current_stock AS final_stock
FROM products p
LEFT JOIN inventory_transactions it ON p.id = it.product_id
GROUP BY p.id, p.name, p.current_stock
HAVING purchased > 0 OR sold > 0 OR consumed > 0
ORDER BY p.name;

-- Total expense summary (should show 57,977.56)
SELECT 'Expense totals:' AS verification;
SELECT
  SUM(CASE WHEN vendor_name = 'Wiselife' THEN total_amount ELSE 0 END) AS wiselife_total,
  SUM(CASE WHEN vendor_name = 'Hostinger' THEN total_amount ELSE 0 END) AS hostinger_total,
  SUM(total_amount) AS grand_total
FROM expenses;

-- Monthly expense breakdown
SELECT 'Monthly breakdown:' AS verification;
SELECT
  DATE_FORMAT(expense_date, '%Y-%m') AS month,
  SUM(total_amount) AS monthly_total
FROM expenses
GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
ORDER BY month;

SELECT 'MIGRATION COMPLETE' AS status;
