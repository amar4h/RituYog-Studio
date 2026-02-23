<?php
/**
 * Chatbot API Handler
 *
 * AI chatbot with configurable LLM backend.
 * Answers customer queries and takes actions (register leads, book trials)
 * via existing API handlers using LLM function calling.
 *
 * Supported providers (set LLM_PROVIDER in api/.env):
 *   - gemini  (Google Gemini — default)
 *   - openai  (OpenAI, Groq, Together, or any OpenAI-compatible API)
 *
 * .env configuration:
 *   LLM_PROVIDER=gemini|openai          (default: gemini)
 *   LLM_API_KEY=your_api_key            (required)
 *   LLM_MODEL=model-name                (default: gemini-2.5-flash / gpt-4o-mini)
 *   LLM_API_URL=https://custom-url      (optional, overrides default endpoint)
 *
 * Backward-compatible: GEMINI_API_KEY still works if LLM_API_KEY is not set.
 *
 * Does NOT extend BaseHandler — no dedicated DB table.
 */

class ChatbotHandler {
    private PDO $db;
    private string $provider;
    private string $apiKey;
    private string $model;
    private string $apiUrl;
    private int $maxFunctionCallRounds = 5;
    private int $rateLimitPerMinute = 10;
    private ?string $lastError = null;
    private string $fallbackContact = '';

    // Default endpoints per provider
    private const DEFAULTS = [
        'gemini' => [
            'model' => 'gemini-2.5-flash',
            'url'   => 'https://generativelanguage.googleapis.com/v1beta',
        ],
        'openai' => [
            'model' => 'gpt-4o-mini',
            'url'   => 'https://api.openai.com/v1',
        ],
    ];

    public function __construct() {
        $this->db = getDB();

        // Load LLM config from environment
        $this->provider = strtolower($_ENV['LLM_PROVIDER'] ?? 'gemini');
        if (!isset(self::DEFAULTS[$this->provider])) {
            $this->provider = 'gemini';
        }

        $defaults = self::DEFAULTS[$this->provider];

        // API key: try LLM_API_KEY first, fall back to GEMINI_API_KEY
        $this->apiKey = $_ENV['LLM_API_KEY'] ?? $_ENV['GEMINI_API_KEY'] ?? '';
        $this->model  = $_ENV['LLM_MODEL'] ?? $defaults['model'];
        $this->apiUrl = $_ENV['LLM_API_URL'] ?? $defaults['url'];
    }

    /**
     * Check if the request is from an authenticated admin (X-API-Key header present and valid)
     */
    private function isAdminMode(): bool {
        $headers = getallheaders();
        $apiKey = $headers['X-API-Key'] ?? $headers['x-api-key'] ?? '';
        return !empty($apiKey) && $apiKey === API_KEY;
    }

    /**
     * Main chat endpoint
     * Receives: { message: string, history: [{role, content}] }
     * Returns: { reply: string }
     */
    public function chat(): array {
        if (empty($this->apiKey)) {
            throw new Exception('Chatbot is not configured. Please set LLM_API_KEY in api/.env');
        }

        $this->checkRateLimit();

        $data = getRequestBody();
        $userMessage = trim($data['message'] ?? '');
        $history = $data['history'] ?? [];

        if (empty($userMessage)) {
            throw new Exception('Message is required');
        }

        if (mb_strlen($userMessage) > 500) {
            throw new Exception('Message too long (max 500 characters)');
        }

        $isAdmin = $this->isAdminMode();
        $systemPrompt = $this->buildSystemPrompt($isAdmin);

        // Load studio contact for fallback error messages
        $settings = $this->queryOne("SELECT phone, email FROM studio_settings WHERE id = 1");
        $phone = $settings['phone'] ?? '';
        $email = $settings['email'] ?? '';
        $contactParts = [];
        if ($phone) $contactParts[] = "call/WhatsApp $phone";
        if ($email) $contactParts[] = "email $email";
        $this->fallbackContact = $contactParts ? ' You can also reach us at ' . implode(' or ', $contactParts) . '.' : '';

        // Dispatch to provider-specific chat loop
        if ($this->provider === 'openai') {
            $reply = $this->chatOpenAI($systemPrompt, $history, $userMessage, $isAdmin);
        } else {
            $reply = $this->chatGemini($systemPrompt, $history, $userMessage, $isAdmin);
        }

        return ['reply' => $reply];
    }

    // =========================================================================
    // SYSTEM PROMPT (shared across providers)
    // =========================================================================

    private function buildSystemPrompt(bool $isAdmin = false): string {
        $settings = $this->queryOne("SELECT * FROM studio_settings WHERE id = 1");

        $slots = $this->queryAll(
            "SELECT id, display_name, start_time, capacity, exception_capacity
             FROM session_slots WHERE is_active = 1 ORDER BY start_time ASC"
        );

        $plans = $this->queryAll(
            "SELECT name, duration_months, price
             FROM membership_plans WHERE is_active = 1 ORDER BY price ASC"
        );

        // Upcoming holidays
        $holidays = [];
        if (!empty($settings['holidays'])) {
            $decoded = json_decode($settings['holidays'], true);
            if (is_array($decoded)) {
                $today = date('Y-m-d');
                foreach ($decoded as $h) {
                    if (isset($h['date']) && $h['date'] >= $today) {
                        $holidays[] = $h;
                    }
                }
                $holidays = array_slice($holidays, 0, 5);
            }
        }

        $studioName = $settings['studio_name'] ?? 'RituYog';
        $address    = $settings['address'] ?? '';
        $phone      = $settings['phone'] ?? '';
        $email      = $settings['email'] ?? '';
        $website    = $settings['website'] ?? '';
        $maxTrials  = $settings['max_trials_per_person'] ?? 1;

        $slotLines = [];
        foreach ($slots as $s) {
            $slotLines[] = "- {$s['display_name']} (ID: {$s['id']}, capacity: {$s['capacity']})";
        }
        $slotInfo = implode("\n", $slotLines);

        $planLines = [];
        foreach ($plans as $p) {
            $planLines[] = "- {$p['name']}: Rs {$p['price']} for {$p['duration_months']} month(s)";
        }
        $planInfo = implode("\n", $planLines);

        $holidayInfo = 'None upcoming';
        if (!empty($holidays)) {
            $hLines = [];
            foreach ($holidays as $h) {
                $hLines[] = "- {$h['date']}: {$h['name']}";
            }
            $holidayInfo = implode("\n", $hLines);
        }

        $todayDate = date('Y-m-d');
        $todayDay  = date('l');

        $prompt = <<<PROMPT
You are the friendly AI assistant for {$studioName}, a yoga studio. You help visitors and students with information and actions.

## Studio Information
- Name: {$studioName}
- Founded by: Ritu Dubey

## Team
- Ritu Dubey – Founder & Lead Yoga Instructor. Masters in Yoga, certified from MDNIY (Morarji Desai National Institute of Yoga), New Delhi. Specializes in mindful, balanced sequences that blend classical yoga with modern flow.
- Amrendra Dubey – Program Advisor. Certified yoga instructor from MDNIY, New Delhi. Works full-time as an Enterprise Architect in IT. Contributes in a volunteer capacity, helping design class programs and practice flows.
- Address: {$address}
- Area: Greater Noida West (Noida Extension)
- Phone: {$phone}
- Email: {$email}
- Website: {$website}
- Instagram: @rituyog_
- Today: {$todayDate} ({$todayDay})
- Sessions run Monday to Friday only (no weekends)

## About RituYog
RituYog is a peaceful yoga space that helps you strengthen your body, calm your mind, improve posture, and reconnect with your inner balance. The studio offers a comforting, aromatic, and deeply grounding yoga experience with small-batch sessions (8-10 members per batch) for personal attention.

## What We Offer
- Small-batch daily yoga classes (Mon-Fri)
- Surya Namaskar variations (classical, slow-paced, dynamic)
- Vinyasa flow sessions
- Asana sequences with alignment guidance
- Pranayama (breathwork) practices
- Guided relaxation and meditation
- Meditation Wednesday: weekly restorative session with mindful movements, breathwork, and extended guided meditation
- Private one-on-one sessions available upon request
- Online sessions also available

## Class Structure (55-60 minutes, 7-Step Flow)
1. Warm-up
2. Surya Namaskar variations
3. Vinyasa flow
4. Main asana sequence
5. Pranayama
6. Guided relaxation
7. Closing reflection

## Session Timings
{$slotInfo}

## Membership Plans
{$planInfo}

## Trial Policy
- First trial session is FREE
- Maximum {$maxTrials} trial(s) per person
- Trials available on weekdays only (Monday-Friday)
- What to bring: yoga mat (we can guide you on buying one), small towel, water bottle, comfortable clothing

## Upcoming Holidays (studio closed)
{$holidayInfo}

## Frequently Asked Questions
- No prior yoga experience is required — instructors guide step-by-step with proper alignment and breathing
- Classes are suitable for all levels — instructors adjust intensity and postures to individual fitness
- Each session is 55-60 minutes
- Batch size: 8-10 members per session for personal attention
- Batch change: Yes, you can request a change based on availability
- Health concerns: Inform instructors of medical conditions; postures will be modified. Consult doctor for serious conditions
- Results: Most members see improved flexibility, energy, and lightness within 3-4 weeks of regular practice
- Online sessions: Available with guided, personalized experience
- Private sessions: Available upon request

## Member Testimonials (highlights)
- "Significant improvements in my flexibility, posture, and stress levels" — Bhawana
- "The instructors are knowledgeable, patient, and genuinely committed" — Anoop
- "I find myself doing yoga postures I never thought I could do in just 2 months!" — Sarla
- "Joining has been a game-changer for my flexibility, strength, and mental clarity" — Reena Singh
- "The atmosphere is very calm and has a positive aura" — Suhani Agarwal

## Your Capabilities
You can:
1. Answer questions about the studio, founder, pricing, timings, classes, and policies
2. Check slot availability for a specific date (use check_availability tool)
3. Get current pricing details (use get_pricing tool)
4. Register a new visitor as a lead (use register_lead tool)
5. Book a free trial session for a registered lead (use book_trial tool)

## MANDATORY Trial Booking Process (MUST follow exactly)
When a user wants to book a trial, you MUST follow these steps IN ORDER. Do NOT skip any step. Do NOT tell the user a trial is booked unless the book_trial tool returns success.

**Step 1: Collect user details** — Ask for ALL of the following before proceeding:
  - First name
  - Last name
  - Phone number (10-digit Indian mobile)
  - Email address
  Do NOT proceed until you have all 4 pieces of information.

**Step 2: Register the lead** — Call the register_lead tool with the collected details.
  - If it returns an error like "phone already registered" or "email already registered", tell the user they are already registered and suggest contacting the studio.
  - If it returns an error like "already registered as a member", tell them they already have a membership.
  - Only proceed to Step 3 if registration succeeds.

**Step 3: Collect trial preferences** — Ask the user:
  - Which date they prefer (must be a weekday, Monday-Friday)
  - Which time slot they prefer (show available slots from the session timings)
  You may use check_availability to show available spots.

**Step 4: Book the trial** — Call the book_trial tool with the leadId from Step 2, the chosen slotId, and date.
  - If it returns an error like "Maximum trial sessions reached" or "already booked", relay the error message to the user.
  - Only confirm the booking if the tool returns success.

CRITICAL RULES:
- NEVER say a trial is booked without actually calling the book_trial tool and getting a success response.
- NEVER skip the registration step. Every trial booking requires registration first.
- NEVER fabricate or assume a leadId — you must get it from the register_lead tool response.
- If any tool call fails, tell the user what went wrong based on the error message.

## Conversation Rules
- Be friendly, warm, concise, and helpful — reflect the welcoming spirit of the studio
- You can respond in Hindi, English, or Hinglish based on the user's language
- Never reveal internal IDs (slot IDs, lead IDs) to the user — use display names instead
- When showing availability, present it in a user-friendly way (e.g., "Morning 7:30 AM has 3 spots available")
- If a slot is full, suggest alternative slots or dates
- Keep responses concise — 2-3 sentences max unless listing information
- NEVER make up actions or confirmations. Only confirm actions that were actually performed via tools.
- Do not make up information. If you don't know something, say so and suggest contacting the studio directly
- If asked about things unrelated to yoga or the studio, politely redirect the conversation
- When sharing testimonials, only quote from the ones listed above

## Handling Short Replies (CRITICAL)
When YOU asked a follow-up question (e.g., "Would you like to see a list of all expired members?", "Shall I check availability?", "Do you want more details?") and the user's next message is a short reply like "yes", "no", "ok", "sure", "haan", "ha", "nahi", "nope", "please", "go ahead", "show me", "tell me" — you MUST interpret it as an answer to YOUR previous question and act accordingly:
- If the user says YES (yes, ok, sure, haan, ha, please, go ahead, show me, tell me, do it): Perform the action you offered. Use the appropriate tool if needed.
- If the user says NO (no, nahi, nope, not now, skip): Acknowledge and move on politely.
- NEVER respond with "I'm not sure how to respond" or "Can you try asking in a different way?" to a yes/no reply. Always look at your previous message for context.
PROMPT;

        // Append admin capabilities when authenticated
        if ($isAdmin) {
            $prompt .= <<<'ADMIN'


## Admin Capabilities (only available to authenticated studio admins)
You can also:
6. Add a new asana, pranayama, kriya, or vinyasa flow to the master data (use add_asana tool)
7. Search and browse existing asanas in the master data (use search_asanas tool)
8. Look up studio data: members, leads, subscriptions, products, invoices, payments, expenses (use admin_query tool)

### Searching Asanas
When the admin asks about existing asanas (e.g., "what asanas do we have?", "show me all pranayama", "which asanas target the spine?", "do we have Trikonasana?", "list all advanced asanas"):
- Use the search_asanas tool to query the database
- You can search by name, type, body area, or difficulty
- Present the results in a clear, readable format
- If no results found, suggest alternatives or offer to add the asana

### Admin Data Queries
When the admin asks about studio data (e.g., "how many active members?", "show pending payments", "any low stock products?", "list recent expenses", "who are our leads?", "show overdue invoices"):
- Use the admin_query tool with the appropriate entity type
- Supported entities: members, leads, subscriptions, products, invoices, payments, expenses
- You can search by name/text and filter by status
- Present results in a clear, concise format — use names not IDs
- For financial data, show amounts in Rs (Indian Rupees)
- NEVER expose internal IDs to the admin — use names, phone numbers, invoice numbers instead

### How to Add an Asana or Vinyasa Flow
When asked to add an asana (e.g., "add Trikonasana", "add Bhastrika pranayama") or a vinyasa flow:
1. You are an expert yoga assistant. You MUST auto-populate ALL fields yourself using your yoga knowledge. Do NOT ask the admin for type, body areas, benefits, difficulty, contraindications, or breathing cue — fill them in yourself based on the asana name.
2. IMMEDIATELY show a formatted preview with ALL fields filled in (see Preview Format below)
3. Ask "Should I add this to the asana master?"
4. ONLY call the add_asana tool AFTER the admin explicitly confirms (e.g., "yes", "go ahead", "add it")
5. If the admin wants changes, adjust the preview and ask again
6. NEVER call add_asana without explicit admin confirmation
7. NEVER ask the admin to provide details — you must fill everything yourself

### Vinyasa Flow Rules
When adding a vinyasa flow (type = "vinyasa" or "surya_namaskar"):
- Set the type to "vinyasa" or "surya_namaskar" as appropriate
- You MUST include the childAsanas field — the ordered sequence of poses in the flow
- Each child asana is specified by its English name and order number
- The child asanas MUST already exist in the master data. If the admin asks to add a vinyasa flow, list the child asanas in the preview. The system will check if they exist.
- The benefits, body areas, and difficulty of a vinyasa flow should reflect the OVERALL flow, not individual poses

### Handling Confirmation After Preview
CRITICAL: When you have just shown an asana preview in the conversation, and the admin's next message is a short confirmation like "yes", "ok", "sure", "go ahead", "add it", "confirmed", "do it", "proceed", "haan", "ha" — you MUST immediately call the add_asana tool with the EXACT data from the preview you just showed. Do NOT ask again. Do NOT get confused. The admin is confirming the preview. Call the tool right away.

### Controlled Vocabularies (use ONLY these values)
- **type**: asana, pranayama, kriya, exercise, relaxation, vinyasa, surya_namaskar
- **bodyAreas**: spine, upper_back, lower_back, shoulders, chest, arms, wrists, core, hips, glutes, groin, quadriceps, hamstrings, knees, calves, ankles, feet, neck, respiratory, nervous_system
- **difficulty**: beginner, intermediate, advanced
- **breathingCue**: inhale, exhale, hold (optional — only if one cue dominates)

### Preview Format for Regular Asana
**Name**: Triangle Pose
**Sanskrit**: Trikonasana
**Type**: asana
**Difficulty**: beginner
**Primary Areas**: spine, hips, hamstrings
**Secondary Areas**: shoulders, core
**Benefits**: Stretches hamstrings, Strengthens legs, Improves balance, Opens chest and shoulders
**Contraindications**: Low blood pressure, Neck injury, Diarrhea
**Breathing Cue**: exhale

### Preview Format for Vinyasa Flow
**Name**: Sun Salutation A
**Sanskrit**: Surya Namaskar A
**Type**: surya_namaskar
**Difficulty**: beginner
**Primary Areas**: spine, shoulders, hamstrings, core
**Secondary Areas**: hips, calves, ankles
**Benefits**: Warms up the entire body, Improves flexibility, Builds strength, Connects breath with movement
**Contraindications**: Wrist injury, Severe back pain, High blood pressure
**Flow Sequence**:
1. Mountain Pose (Tadasana)
2. Upward Salute (Urdhva Hastasana)
3. Standing Forward Bend (Uttanasana)
4. Low Lunge (Anjaneyasana)
5. Plank Pose (Phalakasana)
6. Four-Limbed Staff Pose (Chaturanga Dandasana)
7. Upward-Facing Dog (Urdhva Mukha Svanasana)
8. Downward-Facing Dog (Adho Mukha Svanasana)
ADMIN;
        }

        return $prompt;
    }

    // =========================================================================
    // GEMINI PROVIDER
    // =========================================================================

    private function chatGemini(string $systemPrompt, array $history, string $userMessage, bool $isAdmin = false): string {
        $contents = $this->buildGeminiContents($history, $userMessage);
        $tools = $this->getGeminiFunctionDeclarations($isAdmin);

        for ($round = 0; $round <= $this->maxFunctionCallRounds; $round++) {
            $response = $this->callGeminiApi($systemPrompt, $contents, $tools);

            if (!$response) {
                // If tool call failed, retry without tools
                if ($round === 0 && strpos($this->lastError ?? '', 'tool_use_failed') !== false) {
                    $response = $this->callGeminiApi($systemPrompt, $contents, []);
                }
                if (!$response) {
                    $err = $this->lastError ?? 'unknown';
                    error_log("Chatbot Gemini error: " . $err);
                    $debugHint = $this->isAdminMode() ? "\n\n[Debug: {$err}]" : '';
                    return "I'm sorry, I'm having trouble responding right now. Please try again later." . $this->fallbackContact . $debugHint;
                }
            }

            $candidate = $response['candidates'][0] ?? null;
            if (!$candidate) {
                return "I'm sorry, I couldn't generate a response. Please try again." . $this->fallbackContact;
            }

            $parts = $candidate['content']['parts'] ?? [];
            $functionCall = null;
            $textResponse = '';

            foreach ($parts as $part) {
                if (isset($part['functionCall'])) {
                    $functionCall = $part['functionCall'];
                    break;
                }
                if (isset($part['text'])) {
                    $textResponse .= $part['text'];
                }
            }

            if (!$functionCall) {
                return $textResponse ?: "I'm not sure how to respond to that. Can you try asking in a different way?";
            }

            // Execute function call
            $fnName = $functionCall['name'];
            $fnArgs = $functionCall['args'] ?? [];

            try {
                $fnResult = $this->executeFunctionCall($fnName, $fnArgs);
            } catch (Exception $e) {
                $fnResult = ['error' => $e->getMessage()];
            }

            // Append function call + result to conversation
            $contents[] = [
                'role' => 'model',
                'parts' => [['functionCall' => $functionCall]]
            ];
            $contents[] = [
                'role' => 'user',
                'parts' => [[
                    'functionResponse' => [
                        'name' => $fnName,
                        'response' => $fnResult
                    ]
                ]]
            ];
        }

        return "I'm sorry, I wasn't able to complete that action. Please try again." . $this->fallbackContact;
    }

    private function buildGeminiContents(array $history, string $userMessage): array {
        $contents = [];
        $history = array_slice($history, -20);
        foreach ($history as $msg) {
            $role = ($msg['role'] ?? 'user') === 'assistant' ? 'model' : 'user';
            $contents[] = [
                'role' => $role,
                'parts' => [['text' => $msg['content'] ?? '']]
            ];
        }
        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $userMessage]]
        ];
        return $contents;
    }

    private function callGeminiApi(string $systemPrompt, array $contents, array $tools): ?array {
        $url = "{$this->apiUrl}/models/{$this->model}:generateContent?key={$this->apiKey}";

        $payload = [
            'system_instruction' => [
                'parts' => [['text' => $systemPrompt]]
            ],
            'contents' => $contents,
            'tools' => [['function_declarations' => $tools]],
            'generationConfig' => [
                'temperature' => 0.7,
                'maxOutputTokens' => 800,
            ]
        ];

        return $this->httpPost($url, $payload, [
            'Content-Type: application/json'
        ]);
    }

    private function getGeminiFunctionDeclarations(bool $isAdmin = false): array {
        $bodyAreaEnum = ['spine','upper_back','lower_back','shoulders','chest','arms','wrists','core','hips','glutes','groin','quadriceps','hamstrings','knees','calves','ankles','feet','neck','respiratory','nervous_system'];

        $tools = [
            [
                'name' => 'check_availability',
                'description' => 'Check slot availability for all yoga session time slots on a specific date.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'date' => [
                            'type' => 'string',
                            'description' => 'Date in YYYY-MM-DD format'
                        ]
                    ],
                    'required' => ['date']
                ]
            ],
            [
                'name' => 'get_pricing',
                'description' => 'Get all active membership plans with current pricing.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => (object)[],
                ]
            ],
            [
                'name' => 'register_lead',
                'description' => 'Register a new visitor as a lead. Must be done before booking a trial.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'firstName' => ['type' => 'string', 'description' => 'First name'],
                        'lastName'  => ['type' => 'string', 'description' => 'Last name'],
                        'phone'     => ['type' => 'string', 'description' => 'Phone number (10-digit Indian mobile)'],
                        'email'     => ['type' => 'string', 'description' => 'Email address']
                    ],
                    'required' => ['firstName', 'lastName', 'phone', 'email']
                ]
            ],
            [
                'name' => 'book_trial',
                'description' => 'Book a free trial yoga session for a registered lead. Weekdays only.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'leadId' => ['type' => 'string', 'description' => 'Lead ID from register_lead'],
                        'slotId' => ['type' => 'string', 'description' => 'Slot ID (e.g., slot-0730, slot-0845, slot-1000, slot-1930)'],
                        'date'   => ['type' => 'string', 'description' => 'Date in YYYY-MM-DD format (must be weekday)']
                    ],
                    'required' => ['leadId', 'slotId', 'date']
                ]
            ]
        ];

        if ($isAdmin) {
            $tools[] = [
                'name' => 'add_asana',
                'description' => 'Add a new asana, pranayama, kriya, or vinyasa flow to the studio master data. Admin only. IMPORTANT: You MUST show a preview and get explicit confirmation from the admin before calling this tool.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'name'               => ['type' => 'string', 'description' => 'English name (e.g., Triangle Pose)'],
                        'sanskritName'       => ['type' => 'string', 'description' => 'Sanskrit name (e.g., Trikonasana)'],
                        'asanaType'          => ['type' => 'string', 'enum' => ['asana','pranayama','kriya','exercise','relaxation','vinyasa','surya_namaskar'], 'description' => 'Category of the practice'],
                        'primaryBodyAreas'   => ['type' => 'array', 'items' => ['type' => 'string', 'enum' => $bodyAreaEnum], 'description' => 'Primary body areas worked'],
                        'secondaryBodyAreas' => ['type' => 'array', 'items' => ['type' => 'string', 'enum' => $bodyAreaEnum], 'description' => 'Secondary body areas worked'],
                        'benefits'           => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'List of benefits (e.g., ["Improves balance", "Stretches hamstrings"])'],
                        'difficulty'         => ['type' => 'string', 'enum' => ['beginner','intermediate','advanced'], 'description' => 'Difficulty level'],
                        'contraindications'  => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Contraindications (e.g., ["Knee injury", "Low blood pressure"])'],
                        'breathingCue'       => ['type' => 'string', 'enum' => ['inhale','exhale','hold'], 'description' => 'Primary breathing cue (optional)'],
                        'childAsanas'        => ['type' => 'array', 'items' => ['type' => 'object', 'properties' => ['asanaName' => ['type' => 'string', 'description' => 'English name of the child asana (must already exist in master data)'], 'order' => ['type' => 'integer', 'description' => '1-based sequence order']], 'required' => ['asanaName', 'order']], 'description' => 'Ordered sequence of child asanas for vinyasa/surya_namaskar flows. Each item has asanaName and order.'],
                    ],
                    'required' => ['name', 'asanaType', 'primaryBodyAreas', 'benefits', 'difficulty']
                ]
            ];
            $tools[] = [
                'name' => 'search_asanas',
                'description' => 'Search and browse existing asanas in the studio master data. Admin only. Use this to answer questions about what asanas exist, filter by type/body area/difficulty, or look up a specific asana by name.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'query'      => ['type' => 'string', 'description' => 'Search by name (partial match, case-insensitive). Leave empty to list all.'],
                        'asanaType'  => ['type' => 'string', 'enum' => ['asana','pranayama','kriya','exercise','relaxation','vinyasa','surya_namaskar'], 'description' => 'Filter by type'],
                        'bodyArea'   => ['type' => 'string', 'enum' => $bodyAreaEnum, 'description' => 'Filter by body area (matches primary or secondary)'],
                        'difficulty' => ['type' => 'string', 'enum' => ['beginner','intermediate','advanced'], 'description' => 'Filter by difficulty level'],
                    ],
                    'required' => []
                ]
            ];
            $tools[] = [
                'name' => 'admin_query',
                'description' => 'Look up studio data: members, leads, subscriptions, products, invoices, payments, or expenses. Admin only. Use this to answer questions about studio operations, finances, membership status, inventory, etc.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'entity' => ['type' => 'string', 'enum' => ['members','leads','subscriptions','products','invoices','payments','expenses'], 'description' => 'The type of data to query'],
                        'query'  => ['type' => 'string', 'description' => 'Search text (name, phone, invoice number, etc.). Leave empty to list all.'],
                        'status' => ['type' => 'string', 'description' => 'Filter by status. Values depend on entity: members(active/inactive/expired), leads(new/contacted/converted/etc), subscriptions(active/expired/cancelled), invoices(paid/sent/overdue/partially-paid), payments(completed/pending), expenses(paid/pending/partial), products(low-stock)'],
                    ],
                    'required' => ['entity']
                ]
            ];
        }

        return $tools;
    }

    // =========================================================================
    // OPENAI-COMPATIBLE PROVIDER (OpenAI, Groq, Together, etc.)
    // =========================================================================

    /**
     * OpenAI-compatible chat with text-based tool calling.
     * Instead of using native API tool calling (which fails on many open-source models),
     * tools are described in the system prompt and the model outputs JSON to call them.
     * This approach works reliably with all models (Llama, Mixtral, GPT, etc.).
     */
    private function chatOpenAI(string $systemPrompt, array $history, string $userMessage, bool $isAdmin = false): string {
        $toolPrompt = $this->getToolInstructions($isAdmin);
        $messages = $this->buildOpenAIMessages($systemPrompt . "\n\n" . $toolPrompt, $history, $userMessage);

        error_log("Chatbot request: model={$this->model} msg=" . substr($userMessage, 0, 100));

        for ($round = 0; $round <= $this->maxFunctionCallRounds; $round++) {
            $response = $this->callOpenAIApi($messages, []);

            if (!$response) {
                $err = $this->lastError ?? 'unknown';
                error_log("Chatbot API error (round $round): " . $err);
                $debugHint = $this->isAdminMode() ? "\n\n[Debug: {$err}]" : '';
                return "I'm sorry, I'm having trouble responding right now. Please try again later." . $this->fallbackContact . $debugHint;
            }

            $choice = $response['choices'][0] ?? null;
            if (!$choice) {
                error_log("Chatbot no choice in response (round $round)");
                return "I'm sorry, I couldn't generate a response. Please try again." . $this->fallbackContact;
            }

            $content = $choice['message']['content'] ?? '';
            error_log("Chatbot round $round response (" . strlen($content) . " chars): " . substr($content, 0, 200));

            // Check if the model wants to call a tool
            $toolCall = $this->parseToolCall($content);

            if (!$toolCall) {
                error_log("Chatbot round $round: text response (no tool call)");
                return $content ?: "I'm not sure how to respond to that. Can you try asking in a different way?";
            }

            $fnName = $toolCall['name'];
            $fnArgs = $toolCall['arguments'];

            error_log("Chatbot round $round tool: $fnName(" . json_encode($fnArgs) . ")");

            try {
                $fnResult = $this->executeFunctionCall($fnName, $fnArgs);
                error_log("Chatbot round $round result: " . substr(json_encode($fnResult), 0, 200));
            } catch (Exception $e) {
                $fnResult = ['error' => $e->getMessage()];
                error_log("Chatbot round $round tool error: " . $e->getMessage());
            }

            // Append the assistant's tool-call message and the tool result
            $messages[] = ['role' => 'assistant', 'content' => $content];
            $messages[] = [
                'role' => 'user',
                'content' => '[Tool Result for ' . $fnName . ']: ' . json_encode($fnResult, JSON_UNESCAPED_UNICODE),
            ];
        }

        error_log("Chatbot exhausted all $this->maxFunctionCallRounds tool rounds, forcing text response");

        // Safety net: force a text response after exhausting tool rounds
        $messages[] = [
            'role' => 'user',
            'content' => '[System] You have used all available tool calls. Now respond to the user with a helpful text message summarizing what happened and what they should do next. Do NOT output any JSON or tool calls.',
        ];

        $response = $this->callOpenAIApi($messages, []);
        if ($response) {
            $content = $response['choices'][0]['message']['content'] ?? '';
            error_log("Chatbot safety-net response: " . substr($content, 0, 200));
            if ($content && !$this->parseToolCall($content)) {
                return $content;
            }
        } else {
            error_log("Chatbot safety-net API error: " . ($this->lastError ?? 'unknown'));
        }

        return "I'm sorry, I wasn't able to complete that action. Please try again." . $this->fallbackContact;
    }

    private function buildOpenAIMessages(string $systemPrompt, array $history, string $userMessage): array {
        $messages = [
            ['role' => 'system', 'content' => $systemPrompt]
        ];

        $history = array_slice($history, -20);
        foreach ($history as $msg) {
            $messages[] = [
                'role' => $msg['role'] ?? 'user',
                'content' => $msg['content'] ?? ''
            ];
        }

        $messages[] = ['role' => 'user', 'content' => $userMessage];
        return $messages;
    }

    private function callOpenAIApi(array $messages, array $tools): ?array {
        $url = rtrim($this->apiUrl, '/') . '/chat/completions';

        $payload = [
            'model' => $this->model,
            'messages' => $messages,
            'temperature' => 0.7,
            'max_tokens' => 800,
        ];

        // Only include tools if provided
        if (!empty($tools)) {
            $payload['tools'] = $tools;
            $payload['parallel_tool_calls'] = false;
        }

        return $this->httpPost($url, $payload, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->apiKey,
        ]);
    }

    private function getOpenAITools(): array {
        return [
            [
                'type' => 'function',
                'function' => [
                    'name' => 'check_availability',
                    'description' => 'Check slot availability for all yoga session time slots on a specific date.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'date' => ['type' => 'string', 'description' => 'Date in YYYY-MM-DD format']
                        ],
                        'required' => ['date']
                    ]
                ]
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_pricing',
                    'description' => 'Get all active membership plans with current pricing.',
                    'parameters' => ['type' => 'object', 'properties' => (object)[]]
                ]
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'register_lead',
                    'description' => 'Register a new visitor as a lead. Must be done before booking a trial.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'firstName' => ['type' => 'string', 'description' => 'First name'],
                            'lastName'  => ['type' => 'string', 'description' => 'Last name'],
                            'phone'     => ['type' => 'string', 'description' => 'Phone number'],
                            'email'     => ['type' => 'string', 'description' => 'Email address']
                        ],
                        'required' => ['firstName', 'lastName', 'phone', 'email']
                    ]
                ]
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'book_trial',
                    'description' => 'Book a free trial yoga session for a registered lead. Weekdays only.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'leadId' => ['type' => 'string', 'description' => 'Lead ID from register_lead'],
                            'slotId' => ['type' => 'string', 'description' => 'Slot ID (e.g., slot-0730)'],
                            'date'   => ['type' => 'string', 'description' => 'Date in YYYY-MM-DD (weekday)']
                        ],
                        'required' => ['leadId', 'slotId', 'date']
                    ]
                ]
            ]
        ];
    }

    // =========================================================================
    // TEXT-BASED TOOL CALLING (for OpenAI-compatible providers)
    // =========================================================================

    /**
     * Tool instructions appended to system prompt.
     * The model outputs JSON to call tools instead of using native API tool calling.
     */
    private function getToolInstructions(bool $isAdmin = false): string {
        $tools = <<<'TOOLS'
## Available Tools
You have access to the following tools. To use a tool, respond with ONLY a JSON object in this exact format (no other text before or after):

{"tool_call": "function_name", "arguments": {"param1": "value1"}}

### Tools:

1. **check_availability** — Check slot availability for all yoga sessions on a specific date.
   Arguments: `{"date": "YYYY-MM-DD"}`

2. **get_pricing** — Get all active membership plans with current pricing.
   Arguments: `{}` (no arguments needed)

3. **register_lead** — Register a new visitor as a lead. Must be done BEFORE booking a trial.
   Arguments: `{"firstName": "...", "lastName": "...", "phone": "10-digit-number", "email": "..."}`

4. **book_trial** — Book a free trial for a registered lead. Weekdays only.
   Arguments: `{"leadId": "id-from-register_lead-result", "slotId": "slot-0730 or slot-0845 or slot-1000 or slot-1930", "date": "YYYY-MM-DD"}`

RULES:
- When calling a tool, output ONLY the JSON object. No other text.
- After I provide the tool result (in a [Tool Result] message), respond with a NORMAL TEXT message to the user. Do NOT call another tool unless absolutely necessary.
- NEVER make up tool results. Always call the tool and wait for the result.
- Only call ONE tool at a time. After getting the result, respond to the user with text.
- If a tool returns an error, tell the user what went wrong in plain text. Do NOT retry the same tool.
- When helping with trial booking, first ASK the user for their details in plain text. Only call register_lead AFTER the user provides all 4 details (name, phone, email).
TOOLS;

        if ($isAdmin) {
            $tools .= <<<'ADMIN_TOOLS'


5. **add_asana** — Add a new asana/pranayama/kriya/vinyasa flow to the master data. Admin only.
   Arguments: `{"name": "English Name", "sanskritName": "Sanskrit Name", "asanaType": "asana|pranayama|kriya|exercise|relaxation|vinyasa|surya_namaskar", "primaryBodyAreas": ["spine", "hips"], "secondaryBodyAreas": ["core"], "benefits": ["Benefit 1", "Benefit 2"], "difficulty": "beginner|intermediate|advanced", "contraindications": ["Condition 1"], "breathingCue": "inhale|exhale|hold", "childAsanas": [{"asanaName": "Mountain Pose", "order": 1}, {"asanaName": "Standing Forward Bend", "order": 2}]}`
   Required: name, asanaType, primaryBodyAreas, benefits, difficulty
   For vinyasa/surya_namaskar: childAsanas is required (ordered sequence of poses by English name)
   IMPORTANT: Always show a preview to the admin and get explicit confirmation BEFORE calling this tool.

6. **search_asanas** — Search and browse existing asanas in the master data. Admin only.
   Arguments: `{"query": "partial name", "asanaType": "asana|pranayama|kriya|...", "bodyArea": "spine|shoulders|...", "difficulty": "beginner|intermediate|advanced"}`
   All arguments are optional. Use any combination of filters. Omit all to list all asanas.

7. **admin_query** — Look up studio data: members, leads, subscriptions, products, invoices, payments, expenses. Admin only.
   Arguments: `{"entity": "members|leads|subscriptions|products|invoices|payments|expenses", "query": "search text", "status": "filter by status"}`
   Required: entity. Optional: query (search by name/phone/number), status (entity-specific filter).
   Status values: members(active/inactive/expired), leads(new/contacted/converted), subscriptions(active/expired), invoices(paid/overdue/partially-paid), payments(completed/pending), expenses(paid/pending), products(use status="low-stock" for low stock items).
ADMIN_TOOLS;
        }

        return $tools;
    }

    /**
     * Parse a tool call from model's text response.
     * Handles: raw JSON, JSON in ```code blocks```, and JSON embedded in text.
     * Accepts both "tool_call" and "tool_calls" keys (models vary).
     */
    private function parseToolCall(string $content): ?array {
        $content = trim($content);

        // Strategy 1: Entire response is a JSON object
        $decoded = json_decode($content, true);
        if (is_array($decoded)) {
            $tc = $this->extractToolFromJson($decoded);
            if ($tc) return $tc;
        }

        // Strategy 2: JSON inside ```json ... ``` or ``` ... ``` markers
        if (preg_match('/```(?:json)?\s*(\{[\s\S]*?\})\s*```/', $content, $matches)) {
            $decoded = json_decode($matches[1], true);
            if (is_array($decoded)) {
                $tc = $this->extractToolFromJson($decoded);
                if ($tc) return $tc;
            }
        }

        // Strategy 3: JSON object embedded in text — find balanced braces around tool_call key
        if (preg_match('/"tool_calls?"/', $content, $m, PREG_OFFSET_CAPTURE)) {
            $pos = $m[0][1];
            $start = strrpos(substr($content, 0, $pos), '{');
            if ($start !== false) {
                $depth = 0;
                $len = strlen($content);
                for ($i = $start; $i < $len; $i++) {
                    if ($content[$i] === '{') $depth++;
                    if ($content[$i] === '}') $depth--;
                    if ($depth === 0) {
                        $json = substr($content, $start, $i - $start + 1);
                        $decoded = json_decode($json, true);
                        if (is_array($decoded)) {
                            $tc = $this->extractToolFromJson($decoded);
                            if ($tc) return $tc;
                        }
                        break;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Extract tool name and arguments from a decoded JSON object.
     * Handles both "tool_call" and "tool_calls" keys.
     */
    private function extractToolFromJson(array $data): ?array {
        // Accept "tool_call" or "tool_calls" as the key
        $name = $data['tool_call'] ?? $data['tool_calls'] ?? null;
        if ($name && is_string($name)) {
            return ['name' => $name, 'arguments' => $data['arguments'] ?? []];
        }
        return null;
    }

    // =========================================================================
    // FUNCTION CALL EXECUTION (shared across providers)
    // =========================================================================

    private function executeFunctionCall(string $name, array $args): array {
        switch ($name) {
            case 'check_availability':
                return $this->execCheckAvailability($args);
            case 'get_pricing':
                return $this->execGetPricing();
            case 'register_lead':
                return $this->execRegisterLead($args);
            case 'book_trial':
                return $this->execBookTrial($args);
            case 'add_asana':
                if (!$this->isAdminMode()) {
                    return ['error' => 'Admin authentication required'];
                }
                return $this->execAddAsana($args);
            case 'search_asanas':
                if (!$this->isAdminMode()) {
                    return ['error' => 'Admin authentication required'];
                }
                return $this->execSearchAsanas($args);
            case 'admin_query':
                if (!$this->isAdminMode()) {
                    return ['error' => 'Admin authentication required'];
                }
                return $this->execAdminQuery($args);
            default:
                return ['error' => 'Unknown function: ' . $name];
        }
    }

    private function execCheckAvailability(array $args): array {
        $date = $args['date'] ?? date('Y-m-d');

        require_once __DIR__ . '/slots.php';
        $_GET['date'] = $date;

        $handler = new SlotsHandler();
        $results = $handler->getAllAvailability();

        $availability = [];
        foreach ($results as $r) {
            $slot = $this->queryOne(
                "SELECT display_name FROM session_slots WHERE id = :id",
                ['id' => $r['slotId']]
            );
            $availability[] = [
                'slotId' => $r['slotId'],
                'slotName' => $slot['display_name'] ?? $r['slotId'],
                'date' => $r['date'],
                'availableSpots' => $r['availableRegular'] + $r['availableException'],
                'totalCapacity' => $r['totalCapacity'],
                'isFull' => $r['isFull'],
            ];
        }

        return ['date' => $date, 'slots' => $availability];
    }

    private function execGetPricing(): array {
        require_once __DIR__ . '/plans.php';
        $handler = new PlansHandler();
        $plans = $handler->getActive();

        $pricing = [];
        foreach ($plans as $p) {
            $pricing[] = [
                'name' => $p['name'],
                'durationMonths' => $p['durationMonths'],
                'price' => $p['price'],
            ];
        }

        return ['plans' => $pricing];
    }

    private function execRegisterLead(array $args): array {
        require_once __DIR__ . '/leads.php';

        $GLOBALS['__chatbot_request_body'] = [
            'firstName' => $args['firstName'] ?? '',
            'lastName' => $args['lastName'] ?? '',
            'phone' => $args['phone'] ?? '',
            'email' => $args['email'] ?? '',
            'source' => 'chatbot',
            'status' => 'new',
        ];

        $handler = new LeadsHandler();
        $result = $handler->create();

        return [
            'success' => true,
            'leadId' => $result['id'],
            'message' => "Successfully registered {$args['firstName']} {$args['lastName']}",
        ];
    }

    private function execBookTrial(array $args): array {
        require_once __DIR__ . '/trials.php';

        $GLOBALS['__chatbot_request_body'] = [
            'leadId' => $args['leadId'] ?? '',
            'slotId' => $args['slotId'] ?? '',
            'date' => $args['date'] ?? '',
        ];

        $handler = new TrialsHandler();
        $result = $handler->book();

        $slot = $this->queryOne(
            "SELECT display_name FROM session_slots WHERE id = :id",
            ['id' => $args['slotId']]
        );
        $slotName = $slot['display_name'] ?? $args['slotId'];

        return [
            'success' => true,
            'bookingId' => $result['id'],
            'date' => $args['date'],
            'slotName' => $slotName,
            'message' => "Trial booked for {$args['date']} at {$slotName}",
        ];
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    private function execAddAsana(array $args): array {
        $name = trim($args['name'] ?? '');
        if (empty($name)) {
            return ['error' => 'Asana name is required'];
        }

        // Duplicate check (case-insensitive)
        $existing = $this->queryOne(
            "SELECT id, name FROM asanas WHERE LOWER(name) = LOWER(:name)",
            ['name' => $name]
        );
        if ($existing) {
            return ['error' => "Asana already exists: {$existing['name']} (ID: {$existing['id']})"];
        }

        // Also check by sanskrit name if provided
        $sanskritName = trim($args['sanskritName'] ?? '');
        if (!empty($sanskritName)) {
            $existingSanskrit = $this->queryOne(
                "SELECT id, name FROM asanas WHERE LOWER(sanskrit_name) = LOWER(:sname)",
                ['sname' => $sanskritName]
            );
            if ($existingSanskrit) {
                return ['error' => "Asana with Sanskrit name '{$sanskritName}' already exists: {$existingSanskrit['name']}"];
            }
        }

        // Validate controlled vocabularies
        $validTypes = ['asana','pranayama','kriya','exercise','relaxation','vinyasa','surya_namaskar'];
        $validBodyAreas = ['spine','upper_back','lower_back','shoulders','chest','arms','wrists','core','hips','glutes','groin','quadriceps','hamstrings','knees','calves','ankles','feet','neck','respiratory','nervous_system'];
        $validDifficulty = ['beginner','intermediate','advanced'];
        $validBreathingCues = ['inhale','exhale','hold'];

        $type = $args['asanaType'] ?? 'asana';
        if (!in_array($type, $validTypes)) {
            return ['error' => "Invalid type: {$type}. Must be one of: " . implode(', ', $validTypes)];
        }

        $difficulty = $args['difficulty'] ?? 'beginner';
        if (!in_array($difficulty, $validDifficulty)) {
            return ['error' => "Invalid difficulty: {$difficulty}. Must be one of: " . implode(', ', $validDifficulty)];
        }

        $primaryBodyAreas = $args['primaryBodyAreas'] ?? [];
        $secondaryBodyAreas = $args['secondaryBodyAreas'] ?? [];
        foreach (array_merge($primaryBodyAreas, $secondaryBodyAreas) as $area) {
            if (!in_array($area, $validBodyAreas)) {
                return ['error' => "Invalid body area: {$area}. Must be one of: " . implode(', ', $validBodyAreas)];
            }
        }

        $breathingCue = $args['breathingCue'] ?? null;
        if ($breathingCue !== null && !in_array($breathingCue, $validBreathingCues)) {
            return ['error' => "Invalid breathing cue: {$breathingCue}. Must be one of: " . implode(', ', $validBreathingCues)];
        }

        // Resolve childAsanas (for vinyasa/surya_namaskar flows)
        $childAsanas = [];
        $rawChildren = $args['childAsanas'] ?? [];
        if (!empty($rawChildren) && in_array($type, ['vinyasa', 'surya_namaskar'])) {
            $notFound = [];
            foreach ($rawChildren as $child) {
                $childName = trim($child['asanaName'] ?? '');
                $childOrder = (int) ($child['order'] ?? 0);
                if (empty($childName) || $childOrder < 1) continue;

                // Look up by name (case-insensitive)
                $found = $this->queryOne(
                    "SELECT id, name FROM asanas WHERE LOWER(name) = LOWER(:name)",
                    ['name' => $childName]
                );
                if (!$found) {
                    $notFound[] = $childName;
                } else {
                    $childAsanas[] = ['asanaId' => $found['id'], 'order' => $childOrder];
                }
            }
            if (!empty($notFound)) {
                return [
                    'error' => "The following child asanas were not found in the master data: " . implode(', ', $notFound) . ". Please add them first before creating this flow."
                ];
            }
        }

        // Build asana data for creation via AsanasHandler
        $asanaData = [
            'name' => $name,
            'sanskritName' => $sanskritName ?: null,
            'type' => $type,
            'primaryBodyAreas' => $primaryBodyAreas,
            'secondaryBodyAreas' => $secondaryBodyAreas,
            'benefits' => $args['benefits'] ?? [],
            'difficulty' => $difficulty,
            'contraindications' => $args['contraindications'] ?? [],
            'breathingCue' => $breathingCue,
            'isActive' => true,
        ];

        // Add child asanas for vinyasa/surya_namaskar
        if (!empty($childAsanas)) {
            $asanaData['childAsanas'] = $childAsanas;
        }

        require_once __DIR__ . '/asanas.php';
        $GLOBALS['__chatbot_request_body'] = $asanaData;
        $handler = new AsanasHandler();
        $result = $handler->create();

        return [
            'success' => true,
            'id' => $result['id'],
            'name' => $name,
            'message' => "Successfully added '{$name}' to the asana master data." . (!empty($childAsanas) ? " Flow includes " . count($childAsanas) . " poses." : ""),
        ];
    }

    private function execSearchAsanas(array $args): array {
        $query = trim($args['query'] ?? '');
        $type = $args['asanaType'] ?? null;
        $bodyArea = $args['bodyArea'] ?? null;
        $difficulty = $args['difficulty'] ?? null;

        $sql = "SELECT id, name, sanskrit_name, type, difficulty, primary_body_areas, secondary_body_areas, benefits, contraindications, breathing_cue, child_asanas, is_active FROM asanas WHERE is_active = 1";
        $params = [];

        if (!empty($query)) {
            $sql .= " AND LOWER(name) LIKE LOWER(:query)";
            $params['query'] = '%' . $query . '%';
        }
        if ($type) {
            $sql .= " AND type = :type";
            $params['type'] = $type;
        }
        if ($difficulty) {
            $sql .= " AND difficulty = :difficulty";
            $params['difficulty'] = $difficulty;
        }
        if ($bodyArea) {
            // Search in both primary and secondary body areas (stored as JSON arrays)
            $sql .= " AND (JSON_CONTAINS(primary_body_areas, :ba1) OR JSON_CONTAINS(secondary_body_areas, :ba2))";
            $params['ba1'] = json_encode($bodyArea);
            $params['ba2'] = json_encode($bodyArea);
        }

        $sql .= " ORDER BY name ASC LIMIT 50";

        $results = $this->queryAll($sql, $params);

        if (empty($results)) {
            return ['asanas' => [], 'count' => 0, 'message' => 'No asanas found matching the criteria.'];
        }

        $asanas = [];
        foreach ($results as $row) {
            $asana = [
                'name' => $row['name'],
                'sanskritName' => $row['sanskrit_name'] ?? null,
                'type' => $row['type'],
                'difficulty' => $row['difficulty'],
                'primaryBodyAreas' => json_decode($row['primary_body_areas'] ?: '[]', true),
                'secondaryBodyAreas' => json_decode($row['secondary_body_areas'] ?: '[]', true),
                'benefits' => json_decode($row['benefits'] ?: '[]', true),
                'contraindications' => json_decode($row['contraindications'] ?: '[]', true),
                'breathingCue' => $row['breathing_cue'] ?? null,
            ];

            // Include child asanas for vinyasa/surya_namaskar
            $childAsanas = json_decode($row['child_asanas'] ?: '[]', true);
            if (!empty($childAsanas)) {
                // Resolve asana IDs to names for display
                $childNames = [];
                foreach ($childAsanas as $child) {
                    $childAsana = $this->queryOne(
                        "SELECT name FROM asanas WHERE id = :id",
                        ['id' => $child['asanaId'] ?? $child['asana_id'] ?? '']
                    );
                    $childNames[] = [
                        'name' => $childAsana['name'] ?? 'Unknown',
                        'order' => $child['order'] ?? 0,
                    ];
                }
                usort($childNames, fn($a, $b) => $a['order'] - $b['order']);
                $asana['flowSequence'] = array_map(fn($c) => $c['name'], $childNames);
            }

            $asanas[] = $asana;
        }

        return ['asanas' => $asanas, 'count' => count($asanas)];
    }

    private function execAdminQuery(array $args): array {
        $entity = $args['entity'] ?? '';
        $query = trim($args['query'] ?? '');
        $status = trim($args['status'] ?? '');

        switch ($entity) {
            case 'members':
                return $this->queryMembers($query, $status);
            case 'leads':
                return $this->queryLeads($query, $status);
            case 'subscriptions':
                return $this->querySubscriptions($query, $status);
            case 'products':
                return $this->queryProducts($query, $status);
            case 'invoices':
                return $this->queryInvoices($query, $status);
            case 'payments':
                return $this->queryPayments($query, $status);
            case 'expenses':
                return $this->queryExpenses($query, $status);
            default:
                return ['error' => "Unknown entity: {$entity}. Supported: members, leads, subscriptions, products, invoices, payments, expenses"];
        }
    }

    private function queryMembers(string $query, string $status): array {
        $sql = "SELECT m.first_name, m.last_name, m.phone, m.email, m.status, m.gender, m.age, m.classes_attended, m.assigned_slot_id,
                       s.display_name AS slot_name
                FROM members m
                LEFT JOIN session_slots s ON m.assigned_slot_id = s.id
                WHERE 1=1";
        $params = [];

        if ($query) {
            $sql .= " AND (LOWER(m.first_name) LIKE LOWER(:q1) OR LOWER(m.last_name) LIKE LOWER(:q2) OR m.phone LIKE :q3 OR LOWER(m.email) LIKE LOWER(:q4))";
            $params['q1'] = "%{$query}%";
            $params['q2'] = "%{$query}%";
            $params['q3'] = "%{$query}%";
            $params['q4'] = "%{$query}%";
        }
        if ($status) {
            $sql .= " AND m.status = :status";
            $params['status'] = $status;
        }
        $sql .= " ORDER BY m.first_name ASC LIMIT 30";

        $rows = $this->queryAll($sql, $params);
        $results = [];
        foreach ($rows as $r) {
            $results[] = [
                'name' => $r['first_name'] . ' ' . $r['last_name'],
                'phone' => $r['phone'],
                'email' => $r['email'],
                'status' => $r['status'],
                'slot' => $r['slot_name'] ?? 'Not assigned',
                'classesAttended' => (int)$r['classes_attended'],
            ];
        }

        // Also get summary counts
        $counts = $this->queryOne("SELECT COUNT(*) as total, SUM(status='active') as active, SUM(status='inactive') as inactive, SUM(status='expired') as expired FROM members");

        return ['results' => $results, 'count' => count($results), 'summary' => [
            'total' => (int)($counts['total'] ?? 0),
            'active' => (int)($counts['active'] ?? 0),
            'inactive' => (int)($counts['inactive'] ?? 0),
            'expired' => (int)($counts['expired'] ?? 0),
        ]];
    }

    private function queryLeads(string $query, string $status): array {
        $sql = "SELECT l.first_name, l.last_name, l.phone, l.email, l.status, l.source, l.trial_date, l.trial_status,
                       s.display_name AS trial_slot
                FROM leads l
                LEFT JOIN session_slots s ON l.trial_slot_id = s.id
                WHERE 1=1";
        $params = [];

        if ($query) {
            $sql .= " AND (LOWER(l.first_name) LIKE LOWER(:q1) OR LOWER(l.last_name) LIKE LOWER(:q2) OR l.phone LIKE :q3 OR LOWER(l.email) LIKE LOWER(:q4))";
            $params['q1'] = "%{$query}%";
            $params['q2'] = "%{$query}%";
            $params['q3'] = "%{$query}%";
            $params['q4'] = "%{$query}%";
        }
        if ($status) {
            $sql .= " AND l.status = :status";
            $params['status'] = $status;
        }
        $sql .= " ORDER BY l.created_at DESC LIMIT 30";

        $rows = $this->queryAll($sql, $params);
        $results = [];
        foreach ($rows as $r) {
            $results[] = [
                'name' => $r['first_name'] . ' ' . $r['last_name'],
                'phone' => $r['phone'],
                'email' => $r['email'],
                'status' => $r['status'],
                'source' => $r['source'],
                'trialDate' => $r['trial_date'],
                'trialSlot' => $r['trial_slot'],
                'trialStatus' => $r['trial_status'],
            ];
        }

        $counts = $this->queryOne("SELECT COUNT(*) as total, SUM(status='new') as new_leads, SUM(status='converted') as converted, SUM(status IN ('contacted','follow-up','interested','negotiating')) as active_pipeline FROM leads");

        return ['results' => $results, 'count' => count($results), 'summary' => [
            'total' => (int)($counts['total'] ?? 0),
            'new' => (int)($counts['new_leads'] ?? 0),
            'converted' => (int)($counts['converted'] ?? 0),
            'activePipeline' => (int)($counts['active_pipeline'] ?? 0),
        ]];
    }

    private function querySubscriptions(string $query, string $status): array {
        $sql = "SELECT m.first_name, m.last_name, m.phone,
                       ms.start_date, ms.end_date, ms.status, ms.payment_status, ms.payable_amount,
                       mp.name AS plan_name,
                       s.display_name AS slot_name
                FROM membership_subscriptions ms
                JOIN members m ON ms.member_id = m.id
                LEFT JOIN membership_plans mp ON ms.plan_id = mp.id
                LEFT JOIN session_slots s ON ms.slot_id = s.id
                WHERE 1=1";
        $params = [];

        if ($query) {
            $sql .= " AND (LOWER(m.first_name) LIKE LOWER(:q1) OR LOWER(m.last_name) LIKE LOWER(:q2) OR m.phone LIKE :q3)";
            $params['q1'] = "%{$query}%";
            $params['q2'] = "%{$query}%";
            $params['q3'] = "%{$query}%";
        }
        if ($status) {
            $sql .= " AND ms.status = :status";
            $params['status'] = $status;
        }
        $sql .= " ORDER BY ms.end_date DESC LIMIT 30";

        $rows = $this->queryAll($sql, $params);
        $results = [];
        foreach ($rows as $r) {
            $results[] = [
                'member' => $r['first_name'] . ' ' . $r['last_name'],
                'phone' => $r['phone'],
                'plan' => $r['plan_name'],
                'slot' => $r['slot_name'],
                'startDate' => $r['start_date'],
                'endDate' => $r['end_date'],
                'status' => $r['status'],
                'paymentStatus' => $r['payment_status'],
                'amount' => (float)$r['payable_amount'],
            ];
        }

        $counts = $this->queryOne("SELECT COUNT(*) as total, SUM(status='active') as active, SUM(status='expired') as expired, SUM(status='cancelled') as cancelled FROM membership_subscriptions");

        return ['results' => $results, 'count' => count($results), 'summary' => [
            'total' => (int)($counts['total'] ?? 0),
            'active' => (int)($counts['active'] ?? 0),
            'expired' => (int)($counts['expired'] ?? 0),
            'cancelled' => (int)($counts['cancelled'] ?? 0),
        ]];
    }

    private function queryProducts(string $query, string $status): array {
        $sql = "SELECT name, sku, category, cost_price, selling_price, current_stock, low_stock_threshold, unit, is_active FROM products WHERE 1=1";
        $params = [];

        if ($query) {
            $sql .= " AND (LOWER(name) LIKE LOWER(:q1) OR LOWER(sku) LIKE LOWER(:q2))";
            $params['q1'] = "%{$query}%";
            $params['q2'] = "%{$query}%";
        }
        if ($status === 'low-stock') {
            $sql .= " AND current_stock <= low_stock_threshold AND is_active = 1";
        } elseif ($status) {
            // Treat as category filter
            $sql .= " AND category = :status";
            $params['status'] = $status;
        }
        $sql .= " ORDER BY name ASC LIMIT 30";

        $rows = $this->queryAll($sql, $params);
        $results = [];
        foreach ($rows as $r) {
            $results[] = [
                'name' => $r['name'],
                'sku' => $r['sku'],
                'category' => $r['category'],
                'costPrice' => (float)$r['cost_price'],
                'sellingPrice' => (float)$r['selling_price'],
                'currentStock' => (int)$r['current_stock'],
                'lowStockThreshold' => (int)$r['low_stock_threshold'],
                'unit' => $r['unit'],
                'isLowStock' => (int)$r['current_stock'] <= (int)$r['low_stock_threshold'],
            ];
        }

        $stockValue = $this->queryOne("SELECT SUM(current_stock * cost_price) as total_value, SUM(current_stock) as total_units, COUNT(*) as total_products FROM products WHERE is_active = 1");
        $lowStockCount = $this->queryOne("SELECT COUNT(*) as cnt FROM products WHERE is_active = 1 AND current_stock <= low_stock_threshold");

        return ['results' => $results, 'count' => count($results), 'summary' => [
            'totalProducts' => (int)($stockValue['total_products'] ?? 0),
            'totalUnits' => (int)($stockValue['total_units'] ?? 0),
            'totalStockValue' => (float)($stockValue['total_value'] ?? 0),
            'lowStockItems' => (int)($lowStockCount['cnt'] ?? 0),
        ]];
    }

    private function queryInvoices(string $query, string $status): array {
        $sql = "SELECT i.invoice_number, i.invoice_type, i.total_amount, i.amount_paid, i.status, i.invoice_date, i.due_date,
                       m.first_name, m.last_name, m.phone
                FROM invoices i
                LEFT JOIN members m ON i.member_id = m.id
                WHERE 1=1";
        $params = [];

        if ($query) {
            $sql .= " AND (LOWER(i.invoice_number) LIKE LOWER(:q1) OR LOWER(m.first_name) LIKE LOWER(:q2) OR LOWER(m.last_name) LIKE LOWER(:q3) OR m.phone LIKE :q4)";
            $params['q1'] = "%{$query}%";
            $params['q2'] = "%{$query}%";
            $params['q3'] = "%{$query}%";
            $params['q4'] = "%{$query}%";
        }
        if ($status) {
            $sql .= " AND i.status = :status";
            $params['status'] = $status;
        }
        $sql .= " ORDER BY i.invoice_date DESC LIMIT 30";

        $rows = $this->queryAll($sql, $params);
        $results = [];
        foreach ($rows as $r) {
            $results[] = [
                'invoiceNumber' => $r['invoice_number'],
                'type' => $r['invoice_type'],
                'member' => ($r['first_name'] ?? '') . ' ' . ($r['last_name'] ?? ''),
                'phone' => $r['phone'],
                'totalAmount' => (float)$r['total_amount'],
                'amountPaid' => (float)$r['amount_paid'],
                'balance' => (float)$r['total_amount'] - (float)$r['amount_paid'],
                'status' => $r['status'],
                'invoiceDate' => $r['invoice_date'],
                'dueDate' => $r['due_date'],
            ];
        }

        $counts = $this->queryOne("SELECT COUNT(*) as total, SUM(status='paid') as paid, SUM(status='partially-paid') as partial, SUM(status IN ('sent','overdue')) as unpaid, SUM(total_amount) as total_invoiced, SUM(amount_paid) as total_collected FROM invoices");

        return ['results' => $results, 'count' => count($results), 'summary' => [
            'total' => (int)($counts['total'] ?? 0),
            'paid' => (int)($counts['paid'] ?? 0),
            'partiallyPaid' => (int)($counts['partial'] ?? 0),
            'unpaid' => (int)($counts['unpaid'] ?? 0),
            'totalInvoiced' => (float)($counts['total_invoiced'] ?? 0),
            'totalCollected' => (float)($counts['total_collected'] ?? 0),
        ]];
    }

    private function queryPayments(string $query, string $status): array {
        $sql = "SELECT p.receipt_number, p.amount, p.payment_method, p.payment_date, p.status, p.transaction_reference,
                       m.first_name, m.last_name, m.phone,
                       i.invoice_number
                FROM payments p
                LEFT JOIN members m ON p.member_id = m.id
                LEFT JOIN invoices i ON p.invoice_id = i.id
                WHERE 1=1";
        $params = [];

        if ($query) {
            $sql .= " AND (LOWER(m.first_name) LIKE LOWER(:q1) OR LOWER(m.last_name) LIKE LOWER(:q2) OR m.phone LIKE :q3 OR LOWER(p.receipt_number) LIKE LOWER(:q4) OR LOWER(i.invoice_number) LIKE LOWER(:q5))";
            $params['q1'] = "%{$query}%";
            $params['q2'] = "%{$query}%";
            $params['q3'] = "%{$query}%";
            $params['q4'] = "%{$query}%";
            $params['q5'] = "%{$query}%";
        }
        if ($status) {
            $sql .= " AND p.status = :status";
            $params['status'] = $status;
        }
        $sql .= " ORDER BY p.payment_date DESC LIMIT 30";

        $rows = $this->queryAll($sql, $params);
        $results = [];
        foreach ($rows as $r) {
            $results[] = [
                'receiptNumber' => $r['receipt_number'],
                'member' => ($r['first_name'] ?? '') . ' ' . ($r['last_name'] ?? ''),
                'phone' => $r['phone'],
                'invoiceNumber' => $r['invoice_number'],
                'amount' => (float)$r['amount'],
                'paymentMethod' => $r['payment_method'],
                'paymentDate' => $r['payment_date'],
                'status' => $r['status'],
                'reference' => $r['transaction_reference'],
            ];
        }

        $counts = $this->queryOne("SELECT COUNT(*) as total, SUM(status='completed') as completed, SUM(status='pending') as pending, SUM(CASE WHEN status='completed' THEN amount ELSE 0 END) as total_received FROM payments");

        return ['results' => $results, 'count' => count($results), 'summary' => [
            'total' => (int)($counts['total'] ?? 0),
            'completed' => (int)($counts['completed'] ?? 0),
            'pending' => (int)($counts['pending'] ?? 0),
            'totalReceived' => (float)($counts['total_received'] ?? 0),
        ]];
    }

    private function queryExpenses(string $query, string $status): array {
        $sql = "SELECT expense_number, category, description, vendor_name, total_amount, amount_paid, payment_status, expense_date FROM expenses WHERE 1=1";
        $params = [];

        if ($query) {
            $sql .= " AND (LOWER(description) LIKE LOWER(:q1) OR LOWER(vendor_name) LIKE LOWER(:q2) OR LOWER(expense_number) LIKE LOWER(:q3))";
            $params['q1'] = "%{$query}%";
            $params['q2'] = "%{$query}%";
            $params['q3'] = "%{$query}%";
        }
        if ($status) {
            $sql .= " AND payment_status = :status";
            $params['status'] = $status;
        }
        $sql .= " ORDER BY expense_date DESC LIMIT 30";

        $rows = $this->queryAll($sql, $params);
        $results = [];
        foreach ($rows as $r) {
            $results[] = [
                'expenseNumber' => $r['expense_number'],
                'category' => $r['category'],
                'description' => $r['description'],
                'vendor' => $r['vendor_name'],
                'totalAmount' => (float)$r['total_amount'],
                'amountPaid' => (float)$r['amount_paid'],
                'paymentStatus' => $r['payment_status'],
                'expenseDate' => $r['expense_date'],
            ];
        }

        $counts = $this->queryOne("SELECT COUNT(*) as total, SUM(total_amount) as total_expenses, SUM(amount_paid) as total_paid, SUM(payment_status='pending') as pending FROM expenses");

        return ['results' => $results, 'count' => count($results), 'summary' => [
            'total' => (int)($counts['total'] ?? 0),
            'totalExpenses' => (float)($counts['total_expenses'] ?? 0),
            'totalPaid' => (float)($counts['total_paid'] ?? 0),
            'pending' => (int)($counts['pending'] ?? 0),
        ]];
    }

    // =========================================================================
    // SHARED UTILITIES
    // =========================================================================

    /**
     * Generic HTTP POST with error tracking
     */
    private function httpPost(string $url, array $payload, array $headers): ?array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            $this->lastError = "curl: $curlError";
            return null;
        }

        if ($httpCode !== 200) {
            $this->lastError = "HTTP $httpCode: " . substr($response, 0, 300);
            return null;
        }

        return json_decode($response, true);
    }

    /**
     * Rate limiter: 10 requests per minute per IP
     */
    private function checkRateLimit(): void {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $rateLimitDir = sys_get_temp_dir() . '/yoga_chatbot_ratelimit';

        if (!is_dir($rateLimitDir)) {
            @mkdir($rateLimitDir, 0755, true);
        }

        $file = $rateLimitDir . '/' . md5($ip) . '.json';
        $now = time();
        $windowStart = $now - 60;

        $timestamps = [];
        if (file_exists($file)) {
            $content = @file_get_contents($file);
            $timestamps = json_decode($content, true) ?: [];
        }

        $timestamps = array_filter($timestamps, fn($t) => $t > $windowStart);

        if (count($timestamps) >= $this->rateLimitPerMinute) {
            throw new Exception('Too many messages. Please wait a moment before trying again.');
        }

        $timestamps[] = $now;
        @file_put_contents($file, json_encode(array_values($timestamps)));
    }

    private function queryOne(string $sql, array $params = []): ?array {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    private function queryAll(string $sql, array $params = []): array {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
