import { Router, type Request } from "express";

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
const supportMessages: Array<Record<string, unknown>> = [];
let nextUserId = 1;
let nextTransactionId = 1;
let nextWithdrawalId = 1;
let nextSupportId = 1;

const tasks: Task[] = [
  { id: 1, title: "Visit the Earn Wallet community", url: "https://replit.com", category: "Community", reward: "1.00", is_active: true },
  { id: 2, title: "Complete your profile", url: "", category: "Profile", reward: "0.50", is_active: true },
  { id: 3, title: "Invite a friend", url: "", category: "Referral", reward: "2.00", is_active: true },
];

const events = [
  { id: 1, title: "Welcome bonus", type: "bonus", reward: "5.00", is_active: true },
  { id: 2, title: "Weekly earner challenge", type: "challenge", reward: "10.00", is_active: true },
];

const notifications = [
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
};

function publicUser(user: User) {
  const { password: _password, ...safe } = user;
  return { ...safe, isAdmin: user.email === "admin@earnwallet.app" };
}

function userFromRequest(req: Request) {
  const id = Number(req.header("x-user-id"));
  return Number.isFinite(id) ? users.find((user) => user.id === id) : undefined;
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
  return `${userId}:${gameType}`;
}

router.post("/auth/register", (req, res) => {
  const fullName = String(req.body.fullName ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  if (!fullName || !email || !password) return res.status(400).json({ error: "Name, email, and password are required" });
  if (users.some((user) => user.email === email)) return res.status(400).json({ error: "Email already registered" });

  const user: User = {
    id: nextUserId++,
    full_name: fullName,
    email,
    password,
    referral_code: email.split("@")[0],
    referred_by: req.body.referralCode ? String(req.body.referralCode) : undefined,
    balance: "0.00",
    total_earned: "0.00",
    is_active: true,
    is_banned: false,
    created_at: now(),
    last_login: now(),
  };
  users.push(user);
  return res.json({ user: publicUser(user) });
});

router.post("/auth/login", (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  const user = users.find((candidate) => candidate.email === email && candidate.password === password);
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  if (user.is_banned) return res.status(403).json({ error: "Account suspended" });
  user.last_login = now();
  return res.json({ user: publicUser(user) });
});

router.get("/auth/me", (req, res) => {
  const user = requireUser(req, res);
  return user ? res.json({ user: publicUser(user) }) : undefined;
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

router.post("/auth/forgot-password", (_req, res) => res.json({ success: true, message: "Reset request submitted." }));
router.post("/auth/reset-password", (_req, res) => res.json({ success: true }));

router.get("/settings/public", (_req, res) => res.json(settings));

router.get("/ads/status", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const watched = adWatches.get(String(user.id)) ?? 0;
  const maxAds = Number(settings.max_ads_per_day);
  return res.json({ watched, maxAds, remaining: Math.max(0, maxAds - watched), reward: Number(settings.ad_reward), adsEnabled: true });
});

router.post("/ads/watch", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const key = String(user.id);
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
  return res.json({ checkedIn: checkins.has(String(user.id)), reward: Number(settings.checkin_reward) });
});

router.post("/checkin", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const key = String(user.id);
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
  if (!task) return res.status(404).json({ error: "Task not found" });
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
  const todayPlays = gamesPlayed.get(gameKey(user.id, gameType)) ?? 0;
  const allowedPlays = Number(settings.free_plays_per_day) + Number(settings.ad_plays_per_game);
  return res.json({ todayPlays, freePlays: Number(settings.free_plays_per_day), adPlays: Number(settings.ad_plays_per_game), allowedPlays, remaining: Math.max(0, allowedPlays - todayPlays) });
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
  if (!event) return res.status(404).json({ error: "Event not found" });
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
  return user ? res.json({ notifications, unreadCount: notifications.length }) : undefined;
});

router.post("/notifications/read", (_req, res) => res.json({ success: true }));

router.get("/support/messages", (req, res) => {
  const user = requireUser(req, res);
  return user ? res.json({ messages: supportMessages.filter((message) => message.user_id === user.id) }) : undefined;
});

router.post("/support/send", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const message = String(req.body.message ?? "").trim();
  if (!message) return res.status(400).json({ error: "Message required" });
  const aiReply = message.toLowerCase().includes("withdraw")
    ? "Minimum withdrawal is 50 TK. Open Wallet and choose a supported method."
    : "Your message was received. Support will follow up as soon as possible.";
  const record = { id: nextSupportId++, user_id: user.id, message, reply: aiReply, is_ai: true, status: "ai_answered", created_at: now() };
  supportMessages.push(record);
  return res.json({ message: record, aiReply, liveSupport: false, queue: { waiting: 0, active: 0 } });
});

router.post("/admin/login", (req, res) => {
  if (String(req.body.pin ?? "") !== "1234") return res.status(401).json({ error: "Invalid PIN" });
  return res.json({ success: true, token: "demo-admin-token" });
});

router.post("/admin/email-login", (req, res) => {
  const email = String(req.body.email ?? "").toLowerCase();
  const user = users.find((candidate) => candidate.email === email && candidate.password === String(req.body.password ?? ""));
  if (!user || !user.isAdmin) return res.status(401).json({ error: "Invalid credentials" });
  return res.json({ success: true, token: "demo-admin-token" });
});

function isAdmin(req: Request) {
  return req.header("x-admin-token") === "demo-admin-token";
}

router.get("/admin/stats", (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  return res.json({ totalUsers: users.length, pendingPay: withdrawals.filter((item) => item.status === "pending").length, activeTasks: tasks.length, paidTotal: 0, pendingSupport: supportMessages.length });
});

router.get("/admin/settings", (req, res) => isAdmin(req) ? res.json(settings) : res.status(401).json({ error: "Unauthorized" }));
router.post("/admin/settings", (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  Object.assign(settings, req.body);
  return res.json({ success: true });
});
router.get("/admin/users", (req, res) => isAdmin(req) ? res.json({ users: users.map(publicUser) }) : res.status(401).json({ error: "Unauthorized" }));
router.get("/admin/withdrawals", (req, res) => isAdmin(req) ? res.json({ withdrawals }) : res.status(401).json({ error: "Unauthorized" }));
router.get("/admin/tasks", (req, res) => isAdmin(req) ? res.json({ tasks }) : res.status(401).json({ error: "Unauthorized" }));
router.get("/admin/events", (req, res) => isAdmin(req) ? res.json({ events }) : res.status(401).json({ error: "Unauthorized" }));
router.get("/admin/notifications", (req, res) => isAdmin(req) ? res.json({ notifications }) : res.status(401).json({ error: "Unauthorized" }));
router.get("/admin/support", (req, res) => isAdmin(req) ? res.json({ messages: supportMessages, queue: { waiting: 0, active: 0 } }) : res.status(401).json({ error: "Unauthorized" }));

export default router;