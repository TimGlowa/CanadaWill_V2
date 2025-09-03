# CanadaWill Stance Detection Workflow

*Timestamp: 2 September 2025 18:39*

## **Stage 1 – SERPHouse Capture**

* Use **only SERPHouse** for discovery.
* Run one consistent query per official (365-day window, separation/remain keywords).
* Store JSONs in `articles/raw/serp/<slug>/<ts>.json`.
* Quick script → flatten into `sep_candidates.csv` with:
  `date | url | person | title | snippet`.
* This is your **candidate pool**.

---

## **Stage 2 – Manual Review of Known Separatists**

* Focus first on the ~10–11 MLAs already publicly linked to separation.
* Manually read their candidate snippets.
* Confirm stance → build a **stance.json** file:

  ```json
  [
    {"slug": "chelsea-petrovic", "stance": "pro_separation", "confidence": 0.9, "evidence_url": "..."},
    {"slug": "danielle-smith", "stance": "pro_separation", "confidence": 0.9, "evidence_url": "..."},
    {"slug": "rachel-notley", "stance": "pro_canada", "confidence": 0.9, "evidence_url": "..."}
  ]
  ```

---

## **Stage 3 – Email Outreach**

* For all MLAs marked `"Unknown"`, generate **mailto:** outreach links.
* Template: *"Constituents deserve clarity: do you support Alberta remaining in Canada, or leaving?"*
* Capture responses (or silence) → update **stance.json**.
* This will quickly expand beyond the initial 10–11.

---

## **Stage 4 – App Goes Live**

* Integrate `stance.json` into **app.canadawill.ca**.
* Visitors search their official → see stance:

  * **Pro-Canada** (green)
  * **Pro-Separation** (red)
  * **Unknown** (gray, plus "Contact" button)
* Add a "Contact" button = mailto link with subject/body pre-filled.
* Outcome: public accountability + direct citizen action.

---

## **Stage 5 – Add Mayors**

* Expand roster to include municipal leaders.
* Re-use the same SERPHouse + stance pipeline.
* Update `stance.json` with mayors as you classify them.
* Constituents can now check MLAs + mayors in one place.

---

### Why this is KISS

* **One data source (SERPHouse)** → one CSV → one stance.json.
* **No new Azure services.**
* **Fast launch**: Stages 1–2 can be done this week.
* **Expandable**: Later add automation (daily SERPHouse, stance agents, full-text extractor).

---

Would you like me to **write the ready-to-run Stage 1 filter script** (turn all `raw/serp/*.json` into `sep_candidates.csv`), so you can immediately see which articles are usable for manual stance review in Stage 2?
