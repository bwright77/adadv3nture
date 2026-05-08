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

---

## Step 1 — Deploy the edge function

Already done.

Webhook URL:
```
https://asxlvpjijkhdcvrwnruj.supabase.co/functions/v1/apple-health-webhook
```

---

## Step 2 — Build the Shortcut

Open the **Shortcuts** app on your iPhone. Tap **+** (top right) to create
a new shortcut. Tap the title at the top and name it **adadv3nture Health Sync**.

> **How variables work in Shortcuts:**
> Each action produces an output (shown as a colored pill, e.g. "Adjusted Date").
> To use that output in a later action, tap any blue input field — a picker
> appears showing all previous outputs. Select the one you want.
> To give an output a memorable name, add a **Set Variable** action immediately
> after: set "Variable Name" to your chosen name, and set "Input" by tapping
> it and selecting the previous action's output pill.

---

### Actions 1–2 — Get yesterday's date as a string

**Action 1**
- Search for and add: **Adjust Date**
- Date: tap the field → select **Current Date** (top of the picker)
- Adjust: `-1` `Days`

**Action 2**
- Search for and add: **Set Variable**
- Variable Name: type `Yesterday`
- Input: tap the field → select **Adjusted Date** (the output of Action 1)

**Action 3**
- Search for and add: **Format Date**
- Date: tap → select **Yesterday**
- Format: tap → choose **Custom**
- Custom format: type `yyyy-MM-dd`

**Action 4**
- Search for and add: **Set Variable**
- Variable Name: type `DateStr`
- Input: tap → select **Formatted Date** (output of Action 3)

---

### Actions 5–6 — Get resting heart rate

**Action 5**
- Search for and add: **Find Health Samples**
- Tap **Health Sample Type** → search for and select **Resting Heart Rate**
- Tap **Add Filter** → skip (no filter needed)
- Sort: tap **Newest First** (should be default)
- Limit: tap **All** → change to **1**

**Action 6**
- Search for and add: **Set Variable**
- Variable Name: type `RHR`
- Input: tap → select **Health Samples** (output of Action 5)

---

### Actions 7–8 — Get HRV

**Action 7**
- Search for and add: **Find Health Samples**
- Health Sample Type → **Heart Rate Variability SDNN**
- Sort: Newest First
- Limit: **1**

**Action 8**
- Search for and add: **Set Variable**
- Variable Name: type `HRV`
- Input: tap → select **Health Samples** (output of Action 7)

---

### Actions 9–12 — Get last night's sleep duration

**Action 9**
- Search for and add: **Find Health Samples**
- Health Sample Type → **Sleep Analysis**
- Tap **Add Filter**:
  - First filter: **Category** `is` **Asleep**
  - Tap **Add Filter** again: **Start Date** `is after` → tap the date field → select **Yesterday** variable → set time to **8:00 PM**
- Sort: Newest First
- Limit: leave as All

**Action 10**
- Search for and add: **Set Variable**
- Variable Name: type `SleepSamples`
- Input: tap → select **Health Samples** (output of Action 9)

**Action 11**
- Search for and add: **Calculate Statistics on** (search "calculate statistics")
- Input: tap → select **SleepSamples**
- Statistic: **Sum**
- Property: **Duration** (in seconds)

**Action 12**
- Search for and add: **Set Variable**
- Variable Name: type `SleepSeconds`
- Input: tap → select **Statistics Result** (output of Action 11)

**Action 13**
- Search for and add: **Calculate**
- First value: tap → select **SleepSeconds**
- Operation: **÷**
- Second value: `3600`

**Action 14**
- Search for and add: **Set Variable**
- Variable Name: type `SleepHours`
- Input: tap → select **Calculation Result** (output of Action 13)

---

### Actions 15–16 — Build the payload and send it

**Action 15**
- Search for and add: **Dictionary**
- Tap **+** to add each key. Set type to **Text** or **Number** as noted:

| Key | Type | Value |
|---|---|---|
| `secret` | Text | `adadv3nture-bw-health-k7x9m2p` |
| `date` | Text | tap value field → select **DateStr** variable |
| `rhr` | Number | tap value field → select **RHR** variable |
| `hrv_ms` | Number | tap value field → select **HRV** variable |
| `sleep_hours` | Number | tap value field → select **SleepHours** variable |

**Action 16**
- Search for and add: **Get Contents of URL**
- URL: `https://asxlvpjijkhdcvrwnruj.supabase.co/functions/v1/apple-health-webhook`
- Tap **Show More**
- Method: **POST**
- Request Body: **JSON**
- JSON Body: tap → select **Dictionary** (output of Action 15)

---

### Action 17 — Confirm it worked (optional but useful for testing)

**Action 17**
- Search for and add: **Show Notification**
- Title: `Health synced`
- Body: tap → select **Contents of URL** (output of Action 16)

---

## Step 3 — Set up the automation

1. In Shortcuts, tap the **Automation** tab (bottom of screen)
2. Tap **+** (top right) → **Create Personal Automation**
3. Scroll down and choose **Sleep** → **When I Wake Up**
4. Tap **Next**
5. Tap **Add Action** → search **Run Shortcut**
6. Tap the Shortcut field → choose **adadv3nture Health Sync**
7. **Important:** Toggle off **Ask Before Running** so it fires silently
8. Tap **Done**

The shortcut now fires automatically each morning when Sleep Focus ends
(when you dismiss your alarm or turn off the focus mode).

---

## Step 4 — Test it manually first

Before waiting for the automation:

1. Open Shortcuts → find **adadv3nture Health Sync** → tap **▶ Play**
2. Grant any Health permissions it asks for (required the first time)
3. You should see a notification: `{"ok":true,"date":"...","fields":[...]}`
4. Open Supabase → Table Editor → `recovery_signals` — a new row should appear

**If you get `{"error":"Unauthorized"}`** — the secret in the Dictionary
doesn't match what's in Supabase. Double-check both.

**If RHR or HRV is missing from the response fields** — Apple Watch didn't
record a value. Wear the watch overnight and try again tomorrow.

**If sleep_hours is 0** — Sleep Focus may not be enabled. Check Health app →
Browse → Sleep → Show All Data to confirm "Asleep" samples exist.

---

## What happens with the data

Once rows are landing in `recovery_signals`, the recovery score (step 13
in the build order) can be computed: RHR vs baseline + sleep score + drinks
→ tier of Go Hard / Moderate / Recovery Day.
