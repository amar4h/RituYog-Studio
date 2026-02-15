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
 *   LLM_MODEL=model-name                (default: gemini-2.0-flash / gpt-4o-mini)
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
            'model' => 'gemini-2.0-flash',
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

        $systemPrompt = $this->buildSystemPrompt();

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
            $reply = $this->chatOpenAI($systemPrompt, $history, $userMessage);
        } else {
            $reply = $this->chatGemini($systemPrompt, $history, $userMessage);
        }

        return ['reply' => $reply];
    }

    // =========================================================================
    // SYSTEM PROMPT (shared across providers)
    // =========================================================================

    private function buildSystemPrompt(): string {
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

        return <<<PROMPT
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
PROMPT;
    }

    // =========================================================================
    // GEMINI PROVIDER
    // =========================================================================

    private function chatGemini(string $systemPrompt, array $history, string $userMessage): string {
        $contents = $this->buildGeminiContents($history, $userMessage);
        $tools = $this->getGeminiFunctionDeclarations();

        for ($round = 0; $round <= $this->maxFunctionCallRounds; $round++) {
            $response = $this->callGeminiApi($systemPrompt, $contents, $tools);

            if (!$response) {
                // If tool call failed, retry without tools
                if ($round === 0 && strpos($this->lastError ?? '', 'tool_use_failed') !== false) {
                    $response = $this->callGeminiApi($systemPrompt, $contents, []);
                }
                if (!$response) {
                    error_log("Chatbot Gemini error: " . ($this->lastError ?? 'unknown'));
                    return "I'm sorry, I'm having trouble responding right now. Please try again later." . $this->fallbackContact;
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
                'maxOutputTokens' => 500,
            ]
        ];

        return $this->httpPost($url, $payload, [
            'Content-Type: application/json'
        ]);
    }

    private function getGeminiFunctionDeclarations(): array {
        return [
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
    private function chatOpenAI(string $systemPrompt, array $history, string $userMessage): string {
        $toolPrompt = $this->getToolInstructions();
        $messages = $this->buildOpenAIMessages($systemPrompt . "\n\n" . $toolPrompt, $history, $userMessage);

        error_log("Chatbot request: model={$this->model} msg=" . substr($userMessage, 0, 100));

        for ($round = 0; $round <= $this->maxFunctionCallRounds; $round++) {
            $response = $this->callOpenAIApi($messages, []);

            if (!$response) {
                error_log("Chatbot API error (round $round): " . ($this->lastError ?? 'unknown'));
                return "I'm sorry, I'm having trouble responding right now. Please try again later." . $this->fallbackContact;
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
            'max_tokens' => 500,
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
    private function getToolInstructions(): string {
        return <<<'TOOLS'
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
