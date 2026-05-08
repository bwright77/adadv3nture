# Apple Health → adadv3nture Setup

Syncs resting heart rate, HRV, and sleep duration from Apple Watch into
`recovery_signals` using a daily iOS Shortcut automation.

---

## What gets synced

| Apple Health metric | Field in DB | Notes |
|---|---|---|
| Resting Heart Rate | `rhr` | bpm, rounded to integer |
| Heart Rate Variability SDNN | `hrv_ms` | milliseconds |
| Sleep Analysis (Asleep) | `sleep_duration_hours` | last night only |

If Apple Watch wasn't worn, the field is omitted — stored as `null`, not zero.
The recovery score handles nulls gracefully.

---

## Step 1 — Deploy the edge function

From the project root:

```bash
npx supabase functions deploy apple-health-webhook
```

---

## Step 2 — Set environment variables in Supabase

Go to **Supabase Dashboard → Project → Edge Functions → apple-health-webhook → Secrets**
and add:

| Key | Value |
|---|---|
| `HEALTH_WEBHOOK_SECRET` | A random string you make up — e.g. `adadv3nture-health-2026` |
| `HEALTH_WEBHOOK_USER_ID` | Your Supabase user UUID (find it in Authentication → Users) |

Save both. Keep the secret somewhere — you'll need it in the Shortcut.

Your webhook URL will be:
```
https://<your-project-ref>.supabase.co/functions/v1/apple-health-webhook
```

---

## Step 3 — Build the Shortcut

Open the **Shortcuts** app on your iPhone. Tap **+** to create a new shortcut.
Name it **adadv3nture Health Sync**.

Add the following actions in order:

---

### Action 1 — Get yesterday's date (for sleep/HRV)

- Action: **Adjust Date**
- Input: `Current Date`
- Adjust by: `-1 Days`
- Save result to variable: **Yesterday**

---

### Action 2 — Format yesterday as YYYY-MM-DD

- Action: **Format Date**
- Date: **Yesterday**
- Format: `Custom`  
- Custom format: `yyyy-MM-dd`
- Save result to variable: **DateStr**

---

### Action 3 — Get resting heart rate

- Action: **Find Health Samples**
- Type: `Resting Heart Rate`
- Sort by: `Start Date` → `Latest First`
- Limit: `1`
- Save result to variable: **RHR Sample**

---

### Action 4 — Get HRV

- Action: **Find Health Samples**
- Type: `Heart Rate Variability SDNN`
- Sort by: `Start Date` → `Latest First`
- Limit: `1`
- Save result to variable: **HRV Sample**

---

### Action 5 — Get last night's sleep

- Action: **Find Health Samples**
- Type: `Sleep Analysis`
- Filter: `Category` → `Asleep`
- Filter: `Start Date` → `is after` → **Yesterday** at `8:00 PM`
- Filter: `End Date` → `is before` → `Current Date` at `12:00 PM`
- Save result to variable: **Sleep Samples**

---

### Action 6 — Calculate sleep duration in hours

- Action: **Calculate Statistics**
- Input: **Sleep Samples**
- Statistic: `Sum`
- Property: `Duration`
- Save result to variable: **Sleep Seconds**

Then add:

- Action: **Calculate**
- Expression: `Sleep Seconds / 3600`
- Save result to variable: **Sleep Hours**

---

### Action 7 — Build the JSON payload

- Action: **Dictionary**

Add these key/value pairs:

| Key | Type | Value |
|---|---|---|
| `secret` | Text | `adadv3nture-health-2026` ← your secret from Step 2 |
| `date` | Text | **DateStr** (variable) |
| `rhr` | Number | **RHR Sample** (variable) |
| `hrv_ms` | Number | **HRV Sample** (variable) |
| `sleep_hours` | Number | **Sleep Hours** (variable) |

Save result to variable: **Payload**

---

### Action 8 — POST to the webhook

- Action: **Get Contents of URL**
- URL: `https://<your-project-ref>.supabase.co/functions/v1/apple-health-webhook`
- Method: `POST`
- Request Body: `JSON`
- JSON Body: **Payload** (variable)

---

### Action 9 — (Optional) Confirm it worked

- Action: **Show Notification**
- Title: `Health synced`
- Body: `Contents of URL` (the response from action 8)

---

## Step 4 — Set up the automation

1. In Shortcuts, tap the **Automation** tab (clock icon at bottom)
2. Tap **+** → **Create Personal Automation**
3. Choose trigger: **Sleep** → **When I Wake Up**
4. Tap **Next**
5. Tap **Add Action** → search for **Run Shortcut**
6. Choose **adadv3nture Health Sync**
7. Turn **OFF** "Ask Before Running" so it fires silently
8. Tap **Done**

The shortcut will now run automatically each morning when you dismiss your
alarm or turn off Sleep Focus.

---

## Step 5 — Test it manually

Before waiting for the automation to fire:

1. Open Shortcuts → find **adadv3nture Health Sync** → tap the play button
2. Check the notification — you should see `{"ok":true,"date":"...","fields":[...]}`
3. Open Supabase → Table Editor → `recovery_signals` — you should see a new row

If you get a 401, the secret doesn't match. If you get a 500, check the
function logs in Supabase Dashboard → Edge Functions → Logs.

---

## Troubleshooting

**RHR or HRV is empty:** Apple Watch may not have recorded a value yet today.
The shortcut sends `null` which is handled gracefully — try again after
wearing the watch overnight.

**Sleep hours is 0 or wrong:** The Sleep Analysis filter depends on Sleep
Focus being enabled on your iPhone. If you don't use Sleep Focus, the
samples may not be tagged as "Asleep." Check Health app → Browse →
Sleep → Show All Data to confirm samples exist.

**Shortcut asks for permission the first time:** Normal — iOS requires
explicit approval to read each Health category the first time.
