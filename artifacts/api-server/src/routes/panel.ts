import { Router, type Request } from "express";
import { db } from "@workspace/db";
import { panelState } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { createHash, pbkdf2, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2Async = promisify(pbkdf2);
const PASSWORD_HASH_ITERATIONS = 210_000;

type User = {
  id: number;
  full_name: string;
  email: string;
  password: string;
  referral_code: string;
  referred_by?: string;
  balance: string;
  total_earned: string;
  is_active: boolean;
  is_banned: boolean;
  created_at: string;
  last_login: string;
  isAdmin?: boolean;
  profile_photo?: string;
};

type Transaction = {
  id: number;
  user_id: number;
  type: string;
  amount: string;
  description: string;
  source: string;
  created_at: string;
};

type Withdrawal = {
  id: number;
  user_id: number;
  amount: string;
  charge: string;
  net_amount: string;
  withdraw_method: string;
  account_number: string;
  status: string;
  created_at: string;
};

type Task = {
  id: number;
  title: string;
  url: string;
  category: string;
  reward: string;
  is_active: boolean;
};

type ActivationRequest = {
  id: number;
  user_id: number;
  email: string;
  status: "pending" | "approved" | "used" | "expired";
  code?: string;
  created_at: string;
  approved_at?: string;
  expires_at?: string;
};

type SupportConversation = {
  id: number;
  user_id: number;
  status: "open" | "closed";
  created_at: string;
  closed_at?: string;
  closed_by?: "user" | "admin";
};

type SupportMessage = {
  id: number;
  conversation_id: number;
  user_id: number;
  sender: "user" | "admin" | "ai";
  message: string;
  created_at: string;
};

type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  answer: number;
  category: string;
  is_active: boolean;
};

type QuizSession = {
  id: string;
  user_id: number;
  question_ids: number[];
  current_index: number;
  correct: number;
  started_at: string;
  question_started_at: string;
  total_elapsed_ms: number;
  completed_at?: string;
  reward?: number;
};

type AuthSession = {
  token_hash: string;
  role: "user" | "admin";
  user_id?: number;
  created_at: string;
  expires_at: string;
};

type PasswordResetRequest = {
  id: number;
  user_id: number;
  email: string;
  status: "pending" | "approved" | "used" | "expired";
  code?: string;
  created_at: string;
  expires_at?: string;
  approved_at?: string;
};

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  created_at: string;
  user_id?: number;
};

const router = Router();
const now = () => new Date().toISOString();
const users: User[] = [];
const transactions: Transaction[] = [];
const withdrawals: Withdrawal[] = [];
const completedTasks = new Set<string>();
const gamesPlayed = new Map<string, number>();
const checkins = new Set<string>();
const adWatches = new Map<string, number>();
const claimedEvents = new Set<string>();
const activationRequests: ActivationRequest[] = [];
const passwordResetRequests: PasswordResetRequest[] = [];
const authSessions: AuthSession[] = [];
const supportConversations: SupportConversation[] = [];
const supportMessages: SupportMessage[] = [];
const quizQuestions: QuizQuestion[] = [
  { id: 1, question: "What is the capital city of Bangladesh?", options: ["Dhaka", "Chattogram", "Sylhet", "Rajshahi"], answer: 0, category: "Geography", is_active: true },
  { id: 2, question: "In which year did Bangladesh become independent?", options: ["1969", "1971", "1972", "1975"], answer: 1, category: "History", is_active: true },
  { id: 3, question: "Which planet is known as the Red Planet?", options: ["Venus", "Jupiter", "Mars", "Mercury"], answer: 2, category: "Science", is_active: true },
  { id: 4, question: "Which is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Pacific", "Arctic"], answer: 2, category: "Geography", is_active: true },
  { id: 5, question: "What is the national flower of Bangladesh?", options: ["Rose", "Water lily", "Sunflower", "Tulip"], answer: 1, category: "Culture", is_active: true },
  { id: 6, question: "Which country gifted the Statue of Liberty to the United States?", options: ["France", "Canada", "Italy", "Spain"], answer: 0, category: "History", is_active: true },
  { id: 7, question: "How many continents are there?", options: ["5", "6", "7", "8"], answer: 2, category: "General Knowledge", is_active: true },
  { id: 8, question: "What is the chemical symbol for water?", options: ["CO2", "H2O", "O2", "NaCl"], answer: 1, category: "Science", is_active: true },
  { id: 9, question: "Which country is famous for the Great Wall?", options: ["Japan", "China", "India", "Mongolia"], answer: 1, category: "World", is_active: true },
  { id: 10, question: "What is the currency of Japan?", options: ["Won", "Yuan", "Yen", "Ringgit"], answer: 2, category: "World", is_active: true },
  { id: 11, question: "Which gas do humans need to breathe?", options: ["Oxygen", "Helium", "Hydrogen", "Nitrogen"], answer: 0, category: "Science", is_active: true },
  { id: 12, question: "Which is the longest river in Bangladesh?", options: ["Padma", "Meghna", "Jamuna", "Karnaphuli"], answer: 2, category: "Geography", is_active: true },
  { id: 13, question: "Which country hosted the first modern Olympic Games?", options: ["Greece", "France", "United Kingdom", "Brazil"], answer: 0, category: "History", is_active: true },
  { id: 14, question: "How many days are there in a leap year?", options: ["364", "365", "366", "367"], answer: 2, category: "General Knowledge", is_active: true },
  { id: 15, question: "Which animal is known as the ship of the desert?", options: ["Horse", "Camel", "Elephant", "Donkey"], answer: 1, category: "General Knowledge", is_active: true },
  { id: 16, question: "What is the smallest prime number?", options: ["0", "1", "2", "3"], answer: 2, category: "Math", is_active: true },
  { id: 17, question: "Which country is shaped like a boot?", options: ["Italy", "Portugal", "Chile", "Greece"], answer: 0, category: "Geography", is_active: true },
  { id: 18, question: "Who painted the Mona Lisa?", options: ["Van Gogh", "Leonardo da Vinci", "Picasso", "Rembrandt"], answer: 1, category: "Culture", is_active: true },
  { id: 19, question: "Which is the hottest planet in our solar system?", options: ["Mercury", "Venus", "Mars", "Saturn"], answer: 1, category: "Science", is_active: true },
  { id: 20, question: "What is the national animal of Bangladesh?", options: ["Royal Bengal Tiger", "Lion", "Elephant", "Deer"], answer: 0, category: "Culture", is_active: true },
  { id: 21, question: "Which country was the first to land a human on the Moon?", options: ["Russia", "China", "United States", "India"], answer: 2, category: "History", is_active: true },
  { id: 22, question: "Which instrument has black and white keys?", options: ["Guitar", "Piano", "Violin", "Flute"], answer: 1, category: "Culture", is_active: true },
  { id: 23, question: "What is the largest mammal in the world?", options: ["Elephant", "Blue whale", "Giraffe", "Hippo"], answer: 1, category: "Science", is_active: true },
  { id: 24, question: "Which country celebrates Independence Day on 4 July?", options: ["Canada", "United States", "Australia", "Ireland"], answer: 1, category: "History", is_active: true },
  { id: 25, question: "How many colors are in a rainbow?", options: ["5", "6", "7", "8"], answer: 2, category: "General Knowledge", is_active: true },
];
const quizSessions: QuizSession[] = [];
const readNotifications = new Set<string>();
let nextUserId = 1;
let nextTransactionId = 1;
let nextWithdrawalId = 1;
let nextActivationId = 1;
let nextPasswordResetId = 1;
let nextConversationId = 1;
let nextSupportMessageId = 1;
let nextQuizSessionId = 1;
let nextNotificationId = 3;
let adminPin = process.env.ADMIN_PIN ?? "1234";
let adminPinConfigured = Boolean(process.env.ADMIN_PIN);
const adminLoginFailures = new Map<string, { attempts: number; windowStartedAt: number; blockedUntil: number }>();

const tasks: Task[] = [
  { id: 1, title: "Visit the Earn Wallet community", url: "https://replit.com", category: "Community", reward: "1.00", is_active: true },
  { id: 2, title: "Complete your profile", url: "", category: "Profile", reward: "0.50", is_active: true },
  { id: 3, title: "Invite a friend", url: "", category: "Referral", reward: "2.00", is_active: true },
];

const events = [
  { id: 1, title: "Welcome bonus", type: "bonus", reward: "5.00", is_active: true },
  { id: 2, title: "Weekly earner challenge", type: "challenge", reward: "10.00", is_active: true },
];

let notifications: NotificationItem[] = [
  { id: 1, title: "Welcome to Earn Wallet", message: "Complete your profile and start earning today.", type: "info", created_at: now() },
  { id: 2, title: "Daily check-in available", message: "Claim your daily reward from the home screen.", type: "success", created_at: now() },
];

const settings: Record<string, string> = {
  ads_enabled: "true",
  ads_on_claim: "true",
  ads_on_game: "true",
  ads_on_watch: "true",
  ads_on_checkin: "true",
  ads_on_event: "true",
  ad_reward: "0.50",
  max_ads_per_day: "10",
  checkin_reward: "0.50",
  min_withdraw: "50",
  withdraw_charge: "10",
  free_plays_per_day: "1",
  ad_plays_per_game: "1",
  game_min_reward: "0.10",
  game_max_reward: "3.00",
  withdraw_binance_enabled: "true",
  withdraw_bkash_enabled: "true",
  withdraw_nagad_enabled: "true",
  withdraw_recharge_enabled: "true",
  binance_usd_rate: "110",
  ad_duration: "5",
  ad_max_per_session: "20",
  ad_network: "demo",
  activation_required: "true",
  activation_code_expiry_hours: "24",
  referral_reward_enabled: "true",
  referral_minimum_earning: "1",
  quiz_questions_per_play: "15",
  quiz_max_questions_per_play: "25",
  quiz_base_reward: "5",
  quiz_time_limit_seconds: "12",
  quiz_slow_penalty_percent: "50",
  support_auto_reply_enabled: "true",
  referral_base_url: "https://taskchainaridrop.blogspot.com/",
};

type PersistedState = {
  users: User[];
  transactions: Transaction[];
  withdrawals: Withdrawal[];
  completedTasks: string[];
  gamesPlayed: Array<[string, number]>;
  checkins: string[];
  adWatches: Array<[string, number]>;
  claimedEvents: string[];
  activationRequests: ActivationRequest[];
  passwordResetRequests: PasswordResetRequest[];
  authSessions: AuthSession[];
  supportConversations: SupportConversation[];
  supportMessages: SupportMessage[];
  quizQuestions: QuizQuestion[];
  quizSessions: QuizSession[];
  tasks: Task[];
  events: Array<{ id: number; title: string; type: string; reward: string; is_active: boolean }>;
  readNotifications: string[];
  notifications: NotificationItem[];
  settings: Record<string, string>;
  counters: Record<string, number>;
  adminPin?: string;
};

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let resolveStateReady: (() => void) | undefined;
const stateReady = new Promise<void>((resolve) => { resolveStateReady = resolve; });

async function loadPersistedState() {
  try {
    const rows = await db.select().from(panelState).where(eq(panelState.key, "main"));
    const state = rows[0]?.value as PersistedState | undefined;
    if (!state) {
      resolveStateReady?.();
      return;
    }
    users.push(...(state.users ?? []));
    transactions.push(...(state.transactions ?? []));
    withdrawals.push(...(state.withdrawals ?? []));
    (state.completedTasks ?? []).forEach((value) => completedTasks.add(value));
    (state.gamesPlayed ?? []).forEach(([key, value]) => gamesPlayed.set(key, value));
    (state.checkins ?? []).forEach((value) => checkins.add(value));
    (state.adWatches ?? []).forEach(([key, value]) => adWatches.set(key, value));
    (state.claimedEvents ?? []).forEach((value) => claimedEvents.add(value));
    activationRequests.push(...(state.activationRequests ?? []));
    passwordResetRequests.push(...(state.passwordResetRequests ?? []));
    authSessions.push(...(state.authSessions ?? []));
    supportConversations.push(...(state.supportConversations ?? []));
    supportMessages.push(...(state.supportMessages ?? []));
    if (state.quizQuestions?.length) {
      quizQuestions.splice(0, quizQuestions.length, ...state.quizQuestions);
    }
    quizSessions.push(...(state.quizSessions ?? []));
    if (state.tasks?.length) tasks.splice(0, tasks.length, ...state.tasks);
    if (state.events?.length) events.splice(0, events.length, ...state.events);
    readNotifications.clear();
    (state.readNotifications ?? []).forEach((value) => readNotifications.add(value));
    notifications = state.notifications?.length ? state.notifications : notifications;
    Object.assign(settings, state.settings ?? {});
    nextUserId = state.counters?.nextUserId ?? (Math.max(0, ...users.map((u) => u.id)) + 1);
    nextTransactionId = state.counters?.nextTransactionId ?? (Math.max(0, ...transactions.map((t) => t.id)) + 1);
    nextWithdrawalId = state.counters?.nextWithdrawalId ?? (Math.max(0, ...withdrawals.map((w) => w.id)) + 1);
    nextActivationId = state.counters?.nextActivationId ?? (Math.max(0, ...activationRequests.map((a) => a.id)) + 1);
    nextPasswordResetId = state.counters?.nextPasswordResetId ?? (Math.max(0, ...passwordResetRequests.map((r) => r.id)) + 1);
    nextConversationId = state.counters?.nextConversationId ?? (Math.max(0, ...supportConversations.map((c) => c.id)) + 1);
    nextSupportMessageId = state.counters?.nextSupportMessageId ?? (Math.max(0, ...supportMessages.map((m) => m.id)) + 1);
    nextQuizSessionId = state.counters?.nextQuizSessionId ?? (Math.max(0, ...quizSessions.map((s) => Number(s.id))) + 1);
    nextNotificationId = state.counters?.nextNotificationId ?? (Math.max(0, ...notifications.map((n) => n.id)) + 1);
    if (process.env.ADMIN_PIN && state.adminPin === "1234") {
      adminPin = process.env.ADMIN_PIN;
      adminPinConfigured = true;
    } else if (state.adminPin) {
      adminPin = state.adminPin;
      adminPinConfigured = state.adminPin !== "1234" || Boolean(process.env.ADMIN_PIN);
    }
  } finally {
    resolveStateReady?.();
  }
}

function persistState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const value: PersistedState = {
      users, transactions, withdrawals,
      completedTasks: [...completedTasks],
      gamesPlayed: [...gamesPlayed.entries()],
      checkins: [...checkins],
      adWatches: [...adWatches.entries()],
      claimedEvents: [...claimedEvents],
      activationRequests, passwordResetRequests, authSessions, supportConversations, supportMessages,
      quizQuestions, quizSessions, tasks, events,
      readNotifications: [...readNotifications],
      notifications, settings,
      counters: { nextUserId, nextTransactionId, nextWithdrawalId, nextActivationId, nextPasswordResetId, nextConversationId, nextSupportMessageId, nextQuizSessionId, nextNotificationId },
      adminPin,
    };
    await db.insert(panelState).values({ key: "main", value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: panelState.key, set: { value, updatedAt: new Date() } });
  }, 50);
}

void loadPersistedState();
router.use(async (_req, _res, next) => {
  await stateReady;
  next();
});
router.use((_req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode < 500) persistState();
  });
  next();
});

function publicUser(user: User) {
  const { password: _password, ...safe } = user;
  return { ...safe, isAdmin: user.email === "admin@earnwallet.app" };
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await pbkdf2Async(password, salt, PASSWORD_HASH_ITERATIONS, 32, "sha256");
  return `pbkdf2$${PASSWORD_HASH_ITERATIONS}$${salt.toString("base64")}$${Buffer.from(derived).toString("base64")}`;
}

async function verifyPassword(stored: string, password: string) {
  const [algorithm, iterationText, saltText, hashText] = stored.split("$");
  if (algorithm === "pbkdf2" && iterationText && saltText && hashText) {
    const iterations = Number(iterationText);
    if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return { valid: false };
    const expected = Buffer.from(hashText, "base64");
    const actual = Buffer.from(await pbkdf2Async(password, Buffer.from(saltText, "base64"), iterations, expected.length, "sha256"));
    return { valid: expected.length === actual.length && timingSafeEqual(expected, actual), upgradedHash: undefined as string | undefined };
  }

  const expected = Buffer.from(stored);
  const actual = Buffer.from(password);
  const valid = expected.length === actual.length && timingSafeEqual(expected, actual);
  return { valid, upgradedHash: valid ? await hashPassword(password) : undefined };
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function issueSession(role: AuthSession["role"], userId?: number) {
  const token = randomBytes(32).toString("base64url");
  const lifetimeMs = role === "admin" ? 8 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  authSessions.push({
    token_hash: tokenHash(token),
    role,
    user_id: userId,
    created_at: now(),
    expires_at: new Date(Date.now() + lifetimeMs).toISOString(),
  });
  return token;
}

function sessionFromRequest(req: Request) {
  const authorization = req.header("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return undefined;
  const hash = tokenHash(match[1]);
  const session = authSessions.find((candidate) => candidate.token_hash === hash);
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    if (session) authSessions.splice(authSessions.indexOf(session), 1);
    return undefined;
  }
  return session;
}

function userFromRequest(req: Request) {
  const session = sessionFromRequest(req);
  if (session?.role !== "user" || !session.user_id) return undefined;
  return users.find((user) => user.id === session.user_id && user.is_active && !user.is_banned);
}

function requireUser(req: Request, res: any) {
  const user = userFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return undefined;
  }
  return user;
}

function addBalance(user: User, amount: number) {
  user.balance = (Number(user.balance) + amount).toFixed(2);
  if (amount > 0) user.total_earned = (Number(user.total_earned) + amount).toFixed(2);
}

function addTransaction(userId: number, amount: number, type: string, description: string, source: string) {
  transactions.unshift({
    id: nextTransactionId++,
    user_id: userId,
    type,
    amount: amount.toFixed(2),
    description,
    source,
    created_at: now(),
  });
}

function completeKey(userId: number, taskId: number) {
  return `${userId}:${taskId}`;
}

function gameKey(userId: number, gameType: string) {
  return `${userId}:${new Date().toISOString().slice(0, 10)}:${gameType}`;
}

function dailyUserKey(userId: number) {
  return `${userId}:${new Date().toISOString().slice(0, 10)}`;
}

function generateCode() {
  return String(randomInt(100000, 1_000_000));
}

function activationForUser(userId: number) {
  return activationRequests.find((request) => request.user_id === userId && request.status !== "used" && request.status !== "expired");
}

router.post("/auth/register", async (req, res) => {
  const fullName = String(req.body.fullName ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
    return res.status(400).json({ error: "Enter a valid email, name, and password with at least 6 characters" });
  }
  if (users.some((user) => user.email === email)) return res.status(400).json({ error: "Email already registered" });
  const referralCode = String(req.body.referralCode ?? "").trim();
  if (referralCode && !users.some((candidate) => candidate.referral_code.toLowerCase() === referralCode.toLowerCase())) {
    return res.status(400).json({ error: "Invalid referral code" });
  }

  const user: User = {
    id: nextUserId++,
    full_name: fullName,
    email,
    password: await hashPassword(password),
    referral_code: email.split("@")[0],
    referred_by: referralCode || undefined,
    balance: "0.00",
    total_earned: "0.00",
    is_active: settings.activation_required !== "false" ? false : true,
    is_banned: false,
    created_at: now(),
    last_login: now(),
  };
  users.push(user);
  const activationRequest: ActivationRequest = {
    id: nextActivationId++,
    user_id: user.id,
    email: user.email,
    status: user.is_active ? "used" : "pending",
    created_at: now(),
  };
  activationRequests.push(activationRequest);
  if (!user.is_active) {
    return res.json({
      user: null,
      requiresActivation: true,
      activation: { email: user.email, requestId: activationRequest.id },
      message: "Your account was created. Ask admin for the activation code.",
    });
  }
  return res.json({ user: publicUser(user), token: issueSession("user", user.id) });
});

router.post("/auth/login", async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  const user = users.find((candidate) => candidate.email === email);
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  const passwordCheck = await verifyPassword(user.password, password);
  if (!passwordCheck.valid) return res.status(401).json({ error: "Invalid email or password" });
  if (passwordCheck.upgradedHash) user.password = passwordCheck.upgradedHash;
  if (user.is_banned) return res.status(403).json({ error: "Account suspended" });
  if (!user.is_active) {
    return res.status(403).json({
      error: "Account is not active. Enter the secret activation code.",
      code: "ACCOUNT_NOT_ACTIVE",
      requiresActivation: true,
      email: user.email,
    });
  }
  user.last_login = now();
  return res.json({ user: publicUser(user), token: issueSession("user", user.id) });
});

router.get("/auth/me", (req, res) => {
  const user = requireUser(req, res);
  return user ? res.json({ user: publicUser(user) }) : undefined;
});

router.post("/auth/logout", (req, res) => {
  const session = sessionFromRequest(req);
  if (session) authSessions.splice(authSessions.indexOf(session), 1);
  return res.json({ success: true });
});

router.put("/auth/profile", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  user.full_name = String(req.body.fullName ?? user.full_name);
  return res.json({ user: publicUser(user) });
});

router.put("/auth/profile-photo", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  user.profile_photo = String(req.body.photoUrl ?? "");
  return res.json({ user: publicUser(user) });
});

router.post("/auth/activation/request", (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const user = users.find((candidate) => candidate.email === email);
  if (!user) return res.status(404).json({ error: "Account not found" });
  if (user.is_active) return res.json({ success: true, message: "Account is already active." });
  const existing = activationForUser(user.id);
  if (existing?.status === "pending") return res.json({ success: true, requestId: existing.id });
  const request: ActivationRequest = { id: nextActivationId++, user_id: user.id, email, status: "pending", created_at: now() };
  activationRequests.push(request);
  return res.json({ success: true, requestId: request.id });
});

router.post("/auth/activation/verify", (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const code = String(req.body.code ?? "").trim();
  const user = users.find((candidate) => candidate.email === email);
  const request = user ? activationRequests.find((candidate) =>
    candidate.user_id === user.id &&
    candidate.status === "approved" &&
    candidate.code === code &&
    candidate.expires_at &&
    new Date(candidate.expires_at).getTime() > Date.now()
  ) : undefined;
  if (!user || user.is_banned || !request || !request.code || request.code !== code || !request.expires_at || new Date(request.expires_at) < new Date()) {
    return res.status(400).json({ error: "Invalid or expired activation code" });
  }
  user.is_active = true;
  request.status = "used";
  return res.json({ success: true, user: publicUser(user), token: issueSession("user", user.id) });
});

router.post("/auth/forgot-password", (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const user = users.find((candidate) => candidate.email === email);
  if (user && !user.is_banned) {
    const existing = passwordResetRequests.find((candidate) => candidate.user_id === user.id && candidate.status === "pending");
    const usableApproved = passwordResetRequests.some((candidate) =>
      candidate.user_id === user.id &&
      candidate.status === "approved" &&
      candidate.expires_at &&
      new Date(candidate.expires_at).getTime() > Date.now()
    );
    if (!existing && !usableApproved) {
      passwordResetRequests.push({
        id: nextPasswordResetId++,
        user_id: user.id,
        email: user.email,
        status: "pending",
        created_at: now(),
      });
    }
  }
  return res.json({ success: true, message: "If the account exists, a reset request has been submitted." });
});
router.post("/auth/reset-password", async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const code = String(req.body.code ?? "").trim();
  const newPassword = String(req.body.newPassword ?? "");
  if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const user = users.find((candidate) => candidate.email === email);
  const reset = user && passwordResetRequests.find((candidate) =>
    candidate.user_id === user.id &&
    candidate.status === "approved" &&
    candidate.code === code &&
    Boolean(candidate.expires_at) &&
    new Date(candidate.expires_at!).getTime() > Date.now()
  );
  if (!user || !reset) return res.status(400).json({ error: "Invalid or expired reset code" });
  user.password = await hashPassword(newPassword);
  passwordResetRequests.filter((candidate) => candidate.user_id === user.id).forEach((candidate) => {
    candidate.status = "used";
    delete candidate.code;
  });
  authSessions.splice(0, authSessions.length, ...authSessions.filter((session) => session.user_id !== user.id));
  return res.json({ success: true });
});

router.get("/settings/public", (_req, res) => res.json(settings));

router.get("/ads/status", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const watched = adWatches.get(dailyUserKey(user.id)) ?? 0;
  const maxAds = Number(settings.max_ads_per_day);
  return res.json({ watched, maxAds, remaining: Math.max(0, maxAds - watched), reward: Number(settings.ad_reward), adsEnabled: true });
});

router.post("/ads/watch", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const key = dailyUserKey(user.id);
  const watched = adWatches.get(key) ?? 0;
  const maxAds = Number(settings.max_ads_per_day);
  if (watched >= maxAds) return res.status(400).json({ error: "Daily ad limit reached" });
  const reward = Number(settings.ad_reward);
  adWatches.set(key, watched + 1);
  addBalance(user, reward);
  addTransaction(user.id, reward, "ads", "Watched rewarded video ad", "Ads");
  return res.json({ reward, watched: watched + 1, remaining: maxAds - watched - 1, maxAds });
});

router.get("/checkin/status", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  return res.json({ checkedIn: checkins.has(dailyUserKey(user.id)), reward: Number(settings.checkin_reward) });
});

router.post("/checkin", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const key = dailyUserKey(user.id);
  if (checkins.has(key)) return res.status(400).json({ error: "Already checked in today" });
  checkins.add(key);
  const reward = Number(settings.checkin_reward);
  addBalance(user, reward);
  addTransaction(user.id, reward, "checkin", "Daily check-in bonus", "Daily Task");
  return res.json({ reward });
});

router.get("/tasks", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  return res.json({ tasks, completed: tasks.filter((task) => completedTasks.has(completeKey(user.id, task.id))).map((task) => task.id) });
});

router.post("/tasks/:id/complete", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const task = tasks.find((item) => item.id === Number(req.params.id));
  if (!task || !task.is_active) return res.status(404).json({ error: "Task not found or inactive" });
  const key = completeKey(user.id, task.id);
  if (completedTasks.has(key)) return res.status(400).json({ error: "Task already completed" });
  completedTasks.add(key);
  const reward = Number(task.reward);
  addBalance(user, reward);
  addTransaction(user.id, reward, "task", `Completed: ${task.title}`, "Daily Task");
  return res.json({ reward });
});

router.get("/games/status", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const gameType = String(req.query.gameType ?? "spin_wheel");
  if (gameType === "fun_quiz") {
    const today = new Date().toISOString().slice(0, 10);
    const completedToday = quizSessions.some((session) => session.user_id === user.id && session.completed_at?.slice(0, 10) === today);
    return res.json({
      todayPlays: completedToday ? 1 : 0,
      freePlays: 1,
      adPlays: 0,
      allowedPlays: 1,
      remaining: completedToday ? 0 : 1,
      questionsPerPlay: Number(settings.quiz_questions_per_play),
      maxQuestionsPerPlay: Number(settings.quiz_max_questions_per_play),
    });
  }
  const todayPlays = gamesPlayed.get(gameKey(user.id, gameType)) ?? 0;
  const allowedPlays = Number(settings.free_plays_per_day) + Number(settings.ad_plays_per_game);
  return res.json({ todayPlays, freePlays: Number(settings.free_plays_per_day), adPlays: Number(settings.ad_plays_per_game), allowedPlays, remaining: Math.max(0, allowedPlays - todayPlays) });
});

function dailyQuizQuestions(userId: number) {
  const day = new Date().toISOString().slice(0, 10);
  const active = quizQuestions.filter((question) => question.is_active);
  const ranked = active
    .map((question) => ({
      question,
      score: `${day}:${userId}:${question.id}`.split("").reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7),
    }))
    .sort((a, b) => a.score - b.score)
    .map(({ question }) => question);
  const count = Math.min(Math.max(Number(settings.quiz_questions_per_play) || 15, 15), Math.min(Number(settings.quiz_max_questions_per_play) || 25, ranked.length));
  return ranked.slice(0, count);
}

router.post("/games/quiz/start", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const today = new Date().toISOString().slice(0, 10);
  if (quizSessions.some((session) => session.user_id === user.id && session.completed_at?.slice(0, 10) === today)) {
    return res.status(400).json({ error: "Today's quiz has already been completed." });
  }
  const existing = quizSessions.find((session) =>
    session.user_id === user.id &&
    !session.completed_at &&
    session.started_at.slice(0, 10) === today
  );
  if (existing) {
    const question = quizQuestions.find((candidate) => candidate.id === existing.question_ids[existing.current_index]);
    if (question) {
      return res.json({
        sessionId: existing.id,
        totalQuestions: existing.question_ids.length,
        questionNumber: existing.current_index + 1,
        question: { id: question.id, question: question.question, options: question.options, category: question.category },
        shownAt: existing.question_started_at ?? existing.started_at,
      });
    }
    return res.status(409).json({ error: "This quiz changed. Please contact support before starting another." });
  }
  const questions = dailyQuizQuestions(user.id);
  if (questions.length < 15) return res.status(503).json({ error: "Quiz is being prepared. Please try again later." });
  const startedAt = now();
  const session: QuizSession = {
    id: `quiz-${user.id}-${nextQuizSessionId++}`,
    user_id: user.id,
    question_ids: questions.map((question) => question.id),
    current_index: 0,
    correct: 0,
    started_at: startedAt,
    question_started_at: startedAt,
    total_elapsed_ms: 0,
  };
  quizSessions.push(session);
  return res.json({
    sessionId: session.id,
    totalQuestions: questions.length,
    questionNumber: 1,
    question: { id: questions[0].id, question: questions[0].question, options: questions[0].options, category: questions[0].category },
    shownAt: session.started_at,
  });
});

router.post("/games/quiz/answer", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const session = quizSessions.find((candidate) => candidate.id === String(req.body.sessionId) && candidate.user_id === user.id);
  if (!session || session.completed_at) return res.status(400).json({ error: "Quiz session is not active." });
  if (session.started_at.slice(0, 10) !== new Date().toISOString().slice(0, 10)) {
    return res.status(400).json({ error: "This quiz has expired. Start today's quiz instead." });
  }
  const question = quizQuestions.find((candidate) => candidate.id === session.question_ids[session.current_index]);
  if (!question) return res.status(400).json({ error: "Question not found." });
  const selected = Number(req.body.answer);
  const questionStartedAt = new Date(session.question_started_at ?? session.started_at).getTime();
  const elapsedMs = Math.max(0, Date.now() - (Number.isFinite(questionStartedAt) ? questionStartedAt : Date.now()));
  session.total_elapsed_ms = (session.total_elapsed_ms ?? 0) + elapsedMs;
  const correct = selected === question.answer;
  if (correct) session.correct += 1;
  const nextIndex = session.current_index + 1;
  const total = session.question_ids.length;
  if (nextIndex < total) {
    session.current_index = nextIndex;
    session.question_started_at = now();
    const nextQuestion = quizQuestions.find((candidate) => candidate.id === session.question_ids[nextIndex]);
    return res.json({
      correct,
      next: { id: nextQuestion?.id, question: nextQuestion?.question, options: nextQuestion?.options, category: nextQuestion?.category },
      questionNumber: nextIndex + 1,
      totalQuestions: total,
      shownAt: now(),
    });
  }
  const accuracy = session.correct / total;
  const limit = Math.max(5, Number(settings.quiz_time_limit_seconds) || 12) * 1000;
  const averageAnswerMs = session.total_elapsed_ms / total;
  const speedFactor = Math.max(0.5, Math.min(1, 1 - (averageAnswerMs / limit) * 0.5));
  const reward = Math.max(0.1, Math.round((Number(settings.quiz_base_reward) * accuracy * speedFactor) * 100) / 100);
  session.completed_at = now();
  session.reward = reward;
  gamesPlayed.set(gameKey(user.id, "fun_quiz"), 1);
  addBalance(user, reward);
  addTransaction(user.id, reward, "game", `Completed Fun Quiz (${session.correct}/${total})`, "Games");
  return res.json({ correct, complete: true, correctAnswers: session.correct, totalQuestions: total, reward, speedFactor });
});

router.post("/games/play", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const gameType = String(req.body.gameType ?? "spin_wheel");
  const key = gameKey(user.id, gameType);
  const playsUsed = gamesPlayed.get(key) ?? 0;
  const allowedPlays = Number(settings.free_plays_per_day) + Number(settings.ad_plays_per_game);
  if (playsUsed >= allowedPlays) return res.status(400).json({ error: "No plays remaining for today" });
  const reward = Math.round((0.1 + Math.random() * 2.9) * 100) / 100;
  gamesPlayed.set(key, playsUsed + 1);
  addBalance(user, reward);
  addTransaction(user.id, reward, "game", `Played ${gameType}`, "Games");
  return res.json({ reward, playsUsed: playsUsed + 1, allowedPlays, segmentIndex: 0, symbols: [], isMatch: false });
});

router.get("/withdrawals", (req, res) => {
  const user = requireUser(req, res);
  return user ? res.json({ withdrawals: withdrawals.filter((item) => item.user_id === user.id) }) : undefined;
});

router.post("/withdrawals", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const amount = Number(req.body.amount);
  const method = String(req.body.withdrawMethod ?? req.body.simProvider ?? "bkash");
  const account = String(req.body.accountNumber ?? req.body.phoneNumber ?? "");
  if (!amount || amount < Number(settings.min_withdraw)) return res.status(400).json({ error: `Minimum withdrawal is ${settings.min_withdraw} TK` });
  if (Number(user.balance) < amount) return res.status(400).json({ error: "Insufficient balance" });
  const charge = Math.round(amount * Number(settings.withdraw_charge) / 100 * 100) / 100;
  const withdrawal: Withdrawal = {
    id: nextWithdrawalId++,
    user_id: user.id,
    amount: amount.toFixed(2),
    charge: charge.toFixed(2),
    net_amount: (amount - charge).toFixed(2),
    withdraw_method: method,
    account_number: account,
    status: "pending",
    created_at: now(),
  };
  withdrawals.unshift(withdrawal);
  addBalance(user, -amount);
  addTransaction(user.id, -amount, "withdrawal", `Withdrawal via ${method}`, "Withdrawal");
  return res.json({ withdrawal, currency: method === "binance" ? "USD" : "TK", displayNet: amount - charge });
});

router.get("/transactions", (req, res) => {
  const user = requireUser(req, res);
  return user ? res.json({ transactions: transactions.filter((item) => item.user_id === user.id) }) : undefined;
});

router.get("/referrals", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const referrals = users.filter((candidate) => candidate.referred_by?.toLowerCase() === user.referral_code.toLowerCase()).map((candidate) => ({
    id: candidate.id,
    referred_id: candidate.id,
    full_name: candidate.full_name,
    email: candidate.email,
    level: 1,
    total_earned: "0.00",
  }));
  return res.json({ referrals });
});

router.get("/events", (req, res) => {
  const user = requireUser(req, res);
  return user ? res.json({ events, claimed: events.filter((event) => claimedEvents.has(`${user.id}:${event.id}`)).map((event) => event.id) }) : undefined;
});

router.post("/events/:id/claim", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const event = events.find((item) => item.id === Number(req.params.id));
  if (!event || !event.is_active) return res.status(404).json({ error: "Event not found or inactive" });
  const key = `${user.id}:${event.id}`;
  if (claimedEvents.has(key)) return res.status(400).json({ error: "Already claimed" });
  claimedEvents.add(key);
  const reward = Number(event.reward);
  addBalance(user, reward);
  addTransaction(user.id, reward, "event", `Event bonus: ${event.title}`, "Event Bonus");
  return res.json({ reward });
});

router.get("/leaderboard/:type", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const leaderboard = [...users].sort((a, b) => Number(b.total_earned) - Number(a.total_earned)).map((item, index) => ({
    id: item.id,
    full_name: item.full_name,
    email: item.email,
    total_earned: item.total_earned,
    rank: index + 1,
  }));
  return res.json({ leaderboard });
});

router.get("/notifications", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const visible = notifications.filter((notification) => notification.user_id == null || notification.user_id === user.id);
  const unread = visible.filter((notification) => !readNotifications.has(`${user.id}:${notification.id}`));
  return res.json({ notifications: visible, unreadCount: unread.length });
});

router.post("/notifications/read", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const ids = Array.isArray(req.body.notificationIds) ? req.body.notificationIds : [];
  ids.forEach((id: unknown) => readNotifications.add(`${user.id}:${Number(id)}`));
  return res.json({ success: true });
});

function openConversationFor(userId: number) {
  let conversation = supportConversations.find((candidate) => candidate.user_id === userId && candidate.status === "open");
  if (!conversation) {
    conversation = { id: nextConversationId++, user_id: userId, status: "open", created_at: now() };
    supportConversations.push(conversation);
  }
  return conversation;
}

function conversationView(conversation: SupportConversation) {
  const user = users.find((candidate) => candidate.id === conversation.user_id);
  return {
    ...conversation,
    user: user ? publicUser(user) : null,
    messages: supportMessages.filter((message) => message.conversation_id === conversation.id),
  };
}

router.get("/support/messages", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const conversations = supportConversations.filter((candidate) => candidate.user_id === user.id).map(conversationView);
  const conversation = conversations.find((candidate) => candidate.status === "open") ?? conversations[conversations.length - 1] ?? null;
  const messages = conversation?.messages ?? [];
  return res.json({ conversation, conversations, messages, isClosed: conversation?.status === "closed" });
});

router.post("/support/send", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const message = String(req.body.message ?? "").trim();
  if (!message) return res.status(400).json({ error: "Message required" });
  const conversation = openConversationFor(user.id);
  const userMessage: SupportMessage = { id: nextSupportMessageId++, conversation_id: conversation.id, user_id: user.id, sender: "user", message, created_at: now() };
  supportMessages.push(userMessage);
  if (settings.support_auto_reply_enabled !== "false") {
    const aiReply = message.toLowerCase().includes("withdraw")
      ? "Minimum withdrawal is 50 TK. Open Wallet and choose a supported method."
      : "আপনার message পাওয়া গেছে। Admin support এই conversation-এ reply করবেন।";
    supportMessages.push({ id: nextSupportMessageId++, conversation_id: conversation.id, user_id: user.id, sender: "ai", message: aiReply, created_at: now() });
  }
  return res.json({ conversation: conversationView(conversation), liveSupport: true, queue: { waiting: 0, active: 0 } });
});

router.post("/support/end", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const conversation = supportConversations.find((candidate) => candidate.id === Number(req.body.conversationId) && candidate.user_id === user.id && candidate.status === "open");
  if (!conversation) return res.status(404).json({ error: "Open conversation not found" });
  conversation.status = "closed";
  conversation.closed_at = now();
  conversation.closed_by = "user";
  return res.json({ conversation: conversationView(conversation) });
});

router.post("/support/reopen", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const conversation = openConversationFor(user.id);
  return res.json({ conversation: conversationView(conversation) });
});

function adminLoginKey(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function adminLoginIsBlocked(req: Request) {
  const key = adminLoginKey(req);
  const attempt = adminLoginFailures.get(key);
  if (!attempt) return false;
  if (attempt.blockedUntil > Date.now()) return true;
  if (Date.now() - attempt.windowStartedAt >= 15 * 60 * 1000) adminLoginFailures.delete(key);
  return false;
}

function recordAdminLoginFailure(req: Request) {
  const key = adminLoginKey(req);
  const current = adminLoginFailures.get(key);
  const fresh = !current || Date.now() - current.windowStartedAt >= 15 * 60 * 1000;
  const attempt = fresh ? { attempts: 0, windowStartedAt: Date.now(), blockedUntil: 0 } : current;
  attempt.attempts += 1;
  if (attempt.attempts >= 5) attempt.blockedUntil = Date.now() + 15 * 60 * 1000;
  adminLoginFailures.set(key, attempt);
}

router.post("/admin/login", async (req, res) => {
  if (process.env.NODE_ENV === "production" && !adminPinConfigured) {
    return res.status(503).json({ error: "Admin PIN is not configured for this environment." });
  }
  if (adminLoginIsBlocked(req)) return res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
  const suppliedPin = String(req.body.pin ?? "");
  const pinCheck = await verifyPassword(adminPin, suppliedPin);
  if (!pinCheck.valid) {
    recordAdminLoginFailure(req);
    return res.status(401).json({ error: "Invalid PIN" });
  }
  adminLoginFailures.delete(adminLoginKey(req));
  if (pinCheck.upgradedHash && (adminPinConfigured || suppliedPin !== "1234")) adminPin = pinCheck.upgradedHash;
  return res.json({ success: true, token: issueSession("admin") });
});

router.post("/admin/email-login", async (req, res) => {
  if (adminLoginIsBlocked(req)) return res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const user = users.find((candidate) => candidate.email === email);
  const passwordCheck = user ? await verifyPassword(user.password, String(req.body.password ?? "")) : undefined;
  if (user && passwordCheck?.valid && passwordCheck.upgradedHash) user.password = passwordCheck.upgradedHash;
  if (!user || !user.isAdmin || !user.is_active || user.is_banned || !passwordCheck?.valid) {
    recordAdminLoginFailure(req);
    return res.status(401).json({ error: "Invalid credentials" });
  }
  adminLoginFailures.delete(adminLoginKey(req));
  return res.json({ success: true, token: issueSession("admin", user.id) });
});

function isAdmin(req: Request) {
  return sessionFromRequest(req)?.role === "admin";
}

router.post("/admin/logout", (req, res) => {
  const session = sessionFromRequest(req);
  if (session?.role === "admin") authSessions.splice(authSessions.indexOf(session), 1);
  return res.json({ success: true });
});

function adminOnly(req: Request, res: any) {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

router.get("/admin/stats", (req, res) => {
  if (!adminOnly(req, res)) return;
  return res.json({
    totalUsers: users.length,
    pendingPay: withdrawals.filter((item) => item.status === "pending").length,
    activeTasks: tasks.filter((item) => item.is_active).length,
    paidTotal: transactions.filter((item) => item.type === "withdrawal" && Number(item.amount) < 0).reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0),
    pendingSupport: supportConversations.filter((item) => item.status === "open").length,
    pendingActivations: activationRequests.filter((item) => item.status === "pending").length,
  });
});

router.get("/admin/settings", (req, res) => adminOnly(req, res) ? res.json(settings) : undefined);
router.post("/admin/settings", (req, res) => {
  if (!adminOnly(req, res)) return;
  Object.assign(settings, req.body);
  return res.json({ success: true });
});
router.get("/admin/users", (req, res) => adminOnly(req, res) ? res.json({ users: users.map(publicUser) }) : undefined);
router.get("/admin/users/:id", (req, res) => {
  if (!adminOnly(req, res)) return;
  const user = users.find((candidate) => candidate.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({
    user: publicUser(user),
    games: transactions.filter((item) => item.user_id === user.id && item.type === "game").map((item) => ({ game_type: item.description, reward: item.amount, played_at: item.created_at })),
    transactions: transactions.filter((item) => item.user_id === user.id),
    withdrawals: withdrawals.filter((item) => item.user_id === user.id),
    referrals: users.filter((candidate) => candidate.referred_by?.toLowerCase() === user.referral_code.toLowerCase()),
  });
});
router.post("/admin/users/:id/ban", (req, res) => {
  if (!adminOnly(req, res)) return;
  const user = users.find((candidate) => candidate.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  user.is_banned = Boolean(req.body.banned);
  return res.json({ user: publicUser(user) });
});
router.get("/admin/withdrawals", (req, res) => {
  if (!adminOnly(req, res)) return;
  const status = String(req.query.status ?? "");
  const items = status ? withdrawals.filter((item) => item.status === status) : withdrawals;
  return res.json({ withdrawals: items.map((item) => ({ ...item, full_name: users.find((user) => user.id === item.user_id)?.full_name ?? "Unknown" })) });
});
router.post("/admin/withdrawals/:id/approve", (req, res) => {
  if (!adminOnly(req, res)) return;
  const withdrawal = withdrawals.find((item) => item.id === Number(req.params.id));
  if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });
  withdrawal.status = "approved";
  return res.json({ withdrawal });
});
router.post("/admin/withdrawals/:id/reject", (req, res) => {
  if (!adminOnly(req, res)) return;
  const withdrawal = withdrawals.find((item) => item.id === Number(req.params.id));
  if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });
  const user = users.find((candidate) => candidate.id === withdrawal.user_id);
  if (withdrawal.status === "pending" && user) {
    addBalance(user, Number(withdrawal.amount));
    addTransaction(user.id, Number(withdrawal.amount), "refund", "Withdrawal rejected and refunded", "Withdrawal");
  }
  withdrawal.status = "rejected";
  return res.json({ withdrawal });
});
router.get("/admin/tasks", (req, res) => adminOnly(req, res) ? res.json({ tasks }) : undefined);
router.post("/admin/tasks", (req, res) => {
  if (!adminOnly(req, res)) return;
  const task: Task = { id: Math.max(0, ...tasks.map((item) => item.id)) + 1, title: String(req.body.title ?? ""), url: String(req.body.url ?? ""), category: String(req.body.category ?? "other"), reward: Number(req.body.reward ?? 0).toFixed(2), is_active: true };
  if (!task.title || Number(task.reward) <= 0) return res.status(400).json({ error: "Title and reward are required" });
  tasks.push(task);
  return res.json({ task });
});
router.patch("/admin/tasks/:id", (req, res) => {
  if (!adminOnly(req, res)) return;
  const task = tasks.find((item) => item.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (req.body.title !== undefined) task.title = String(req.body.title);
  if (req.body.url !== undefined) task.url = String(req.body.url);
  if (req.body.category !== undefined) task.category = String(req.body.category);
  if (req.body.reward !== undefined) task.reward = Number(req.body.reward).toFixed(2);
  if (req.body.isActive !== undefined) task.is_active = Boolean(req.body.isActive);
  return res.json({ task });
});
router.delete("/admin/tasks/:id", (req, res) => {
  if (!adminOnly(req, res)) return;
  const index = tasks.findIndex((item) => item.id === Number(req.params.id));
  if (index < 0) return res.status(404).json({ error: "Task not found" });
  tasks.splice(index, 1);
  return res.json({ success: true });
});
router.get("/admin/events", (req, res) => adminOnly(req, res) ? res.json({ events }) : undefined);
router.get("/admin/notifications", (req, res) => adminOnly(req, res) ? res.json({ notifications }) : undefined);
router.post("/admin/notifications", (req, res) => {
  if (!adminOnly(req, res)) return;
  const notification: NotificationItem = { id: nextNotificationId++, title: String(req.body.title ?? ""), message: String(req.body.message ?? ""), type: String(req.body.type ?? "info"), created_at: now(), user_id: req.body.userId ? Number(req.body.userId) : undefined };
  if (!notification.title || !notification.message) return res.status(400).json({ error: "Title and message are required" });
  notifications.unshift(notification);
  return res.json({ notification });
});
router.delete("/admin/notifications/:id", (req, res) => {
  if (!adminOnly(req, res)) return;
  notifications = notifications.filter((notification) => notification.id !== Number(req.params.id));
  return res.json({ success: true });
});

router.get("/admin/activations", (req, res) => {
  if (!adminOnly(req, res)) return;
  return res.json({ activations: activationRequests.map((request) => ({ ...request, user: publicUser(users.find((user) => user.id === request.user_id) as User) })) });
});
router.post("/admin/activations/:id/approve", (req, res) => {
  if (!adminOnly(req, res)) return;
  const request = activationRequests.find((candidate) => candidate.id === Number(req.params.id));
  if (!request) return res.status(404).json({ error: "Activation request not found" });
  const code = generateCode();
  request.status = "approved";
  request.code = code;
  request.approved_at = now();
  request.expires_at = new Date(Date.now() + Number(settings.activation_code_expiry_hours) * 60 * 60 * 1000).toISOString();
  return res.json({ activation: request });
});

router.get("/admin/quiz/questions", (req, res) => adminOnly(req, res) ? res.json({ questions: quizQuestions }) : undefined);
router.post("/admin/quiz/questions", (req, res) => {
  if (!adminOnly(req, res)) return;
  const options = Array.isArray(req.body.options) ? req.body.options.map(String) : [];
  if (!req.body.question || options.length < 2 || Number(req.body.answer) < 0 || Number(req.body.answer) >= options.length) return res.status(400).json({ error: "Question, options, and a valid answer are required" });
  const question: QuizQuestion = { id: Math.max(0, ...quizQuestions.map((item) => item.id)) + 1, question: String(req.body.question), options, answer: Number(req.body.answer), category: String(req.body.category ?? "General Knowledge"), is_active: req.body.isActive !== false };
  quizQuestions.push(question);
  return res.json({ question });
});
router.patch("/admin/quiz/questions/:id", (req, res) => {
  if (!adminOnly(req, res)) return;
  const question = quizQuestions.find((candidate) => candidate.id === Number(req.params.id));
  if (!question) return res.status(404).json({ error: "Question not found" });
  if (req.body.question !== undefined) question.question = String(req.body.question);
  if (Array.isArray(req.body.options)) question.options = req.body.options.map(String);
  if (req.body.answer !== undefined) question.answer = Number(req.body.answer);
  if (req.body.category !== undefined) question.category = String(req.body.category);
  if (req.body.isActive !== undefined) question.is_active = Boolean(req.body.isActive);
  return res.json({ question });
});
router.delete("/admin/quiz/questions/:id", (req, res) => {
  if (!adminOnly(req, res)) return;
  if (quizQuestions.filter((item) => item.is_active).length <= 15) return res.status(400).json({ error: "Keep at least 15 active questions" });
  const index = quizQuestions.findIndex((item) => item.id === Number(req.params.id));
  if (index < 0) return res.status(404).json({ error: "Question not found" });
  quizQuestions.splice(index, 1);
  return res.json({ success: true });
});

router.get("/admin/support", (req, res) => {
  if (!adminOnly(req, res)) return;
  const threads = supportConversations.map(conversationView).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return res.json({
    conversations: threads,
    messages: threads.map((thread) => {
      const latest = thread.messages[thread.messages.length - 1];
      return { id: thread.id, conversation_id: thread.id, full_name: thread.user?.full_name, email: thread.user?.email, status: thread.status === "open" ? "active" : "resolved", message: latest?.message ?? "", messages: thread.messages };
    }),
    queue: { waiting: threads.filter((thread) => thread.status === "open").length, active: threads.filter((thread) => thread.status === "open").length },
  });
});
router.post("/admin/support/:conversationId/reply", (req, res) => {
  if (!adminOnly(req, res)) return;
  const conversation = supportConversations.find((candidate) => candidate.id === Number(req.params.conversationId) && candidate.status === "open");
  if (!conversation) return res.status(404).json({ error: "Open conversation not found" });
  const message = String(req.body.reply ?? "").trim();
  if (!message) return res.status(400).json({ error: "Reply required" });
  supportMessages.push({ id: nextSupportMessageId++, conversation_id: conversation.id, user_id: conversation.user_id, sender: "admin", message, created_at: now() });
  return res.json({ conversation: conversationView(conversation) });
});
router.post("/admin/support/:conversationId/close", (req, res) => {
  if (!adminOnly(req, res)) return;
  const conversation = supportConversations.find((candidate) => candidate.id === Number(req.params.conversationId) && candidate.status === "open");
  if (!conversation) return res.status(404).json({ error: "Open conversation not found" });
  conversation.status = "closed";
  conversation.closed_at = now();
  conversation.closed_by = "admin";
  return res.json({ conversation: conversationView(conversation) });
});
router.post("/admin/support/:conversationId/reopen", (req, res) => {
  if (!adminOnly(req, res)) return;
  const conversation = supportConversations.find((candidate) => candidate.id === Number(req.params.conversationId));
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });
  conversation.status = "open";
  conversation.closed_at = undefined;
  conversation.closed_by = undefined;
  return res.json({ conversation: conversationView(conversation) });
});
router.post("/admin/support/:conversationId/claim", (req, res) => {
  if (!adminOnly(req, res)) return;
  const conversation = supportConversations.find((candidate) => candidate.id === Number(req.params.conversationId) && candidate.status === "open");
  if (!conversation) return res.status(404).json({ error: "Open conversation not found" });
  return res.json({ conversation: conversationView(conversation) });
});

router.get("/admin/password-resets", (req, res) => {
  if (!adminOnly(req, res)) return;
  for (const request of passwordResetRequests) {
    if (request.status === "approved" && request.expires_at && new Date(request.expires_at).getTime() <= Date.now()) {
      request.status = "expired";
      delete request.code;
    }
  }
  return res.json({
    resets: passwordResetRequests.map((request) => ({
      ...request,
      token: request.code,
      display_status: request.status,
      full_name: users.find((user) => user.id === request.user_id)?.full_name ?? "Unknown",
    })),
  });
});
router.post("/admin/password-resets/:id/approve", (req, res) => {
  if (!adminOnly(req, res)) return;
  const request = passwordResetRequests.find((candidate) => candidate.id === Number(req.params.id));
  if (!request || request.status !== "pending") return res.status(404).json({ error: "Pending reset request not found" });
  const user = users.find((candidate) => candidate.id === request.user_id);
  if (!user || user.is_banned) return res.status(400).json({ error: "User account cannot reset its password" });
  request.status = "approved";
  request.code = generateCode();
  request.approved_at = now();
  request.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return res.json({ reset: { id: request.id, token: request.code, expires_at: request.expires_at } });
});
router.post("/admin/generate-reset-code", (req, res) => {
  if (!adminOnly(req, res)) return;
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const user = users.find((candidate) => candidate.email === email);
  if (!user || user.is_banned) return res.status(404).json({ error: "User account not found" });
  let request = passwordResetRequests.find((candidate) => candidate.user_id === user.id && candidate.status === "pending");
  if (!request) {
    request = {
      id: nextPasswordResetId++,
      user_id: user.id,
      email: user.email,
      status: "pending",
      created_at: now(),
    };
    passwordResetRequests.push(request);
  }
  request.status = "approved";
  request.code = generateCode();
  request.approved_at = now();
  request.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return res.json({ code: request.code, expires_at: request.expires_at });
});
router.post("/admin/change-pin", async (req, res) => {
  if (!adminOnly(req, res)) return;
  const currentPinCheck = await verifyPassword(adminPin, String(req.body.currentPin ?? ""));
  if (!currentPinCheck.valid) return res.status(400).json({ error: "Current PIN is invalid" });
  const nextPin = String(req.body.newPin ?? "");
  if (!/^\d{6,8}$/.test(nextPin)) return res.status(400).json({ error: "New PIN must contain 6 to 8 digits" });
  adminPin = await hashPassword(nextPin);
  adminPinConfigured = true;
  persistState();
  return res.json({ success: true });
});
router.post("/admin/reset-inactive-balances", (req, res) => {
  if (!adminOnly(req, res)) return;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let resetCount = 0;
  users.forEach((user) => {
    if (user.is_active && (!user.last_login || new Date(user.last_login).getTime() < cutoff) && Number(user.balance) > 0) {
      user.balance = "0.00";
      resetCount += 1;
    }
  });
  return res.json({ resetCount });
});

export default router;