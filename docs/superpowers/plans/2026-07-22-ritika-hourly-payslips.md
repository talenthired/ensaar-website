# Ritika Hourly Payslips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and verify six branded Zoho-style hourly payslips for Ritika Nikhara covering January through June 2026.

**Architecture:** A focused Python generator owns the approved payroll data, deterministic earnings calculations, Indian currency wording, and ReportLab drawing primitives. A separate verification script reads each generated PDF and checks pagination, text fields, dates, arithmetic, and expected output membership before the PDFs are rendered for visual inspection.

**Tech Stack:** Python 3.12, ReportLab, Pillow, pypdf, Poppler PDF rendering utilities

## Global Constraints

- Use the supplied logo at `C:/Users/nidhi/Pictures/Saved Pictures/ensaar_logo.png`.
- Preserve unrelated existing PDFs in `output/pdf/`.
- Produce exactly six targeted Ritika payslips, one page per PDF.
- Use Basic 50%, HRA 20%, Special Allowance residual, and Professional Tax INR 200.
- Use bank-derived net pay and payment dates as authoritative.
- Display Paid Hours derived from INR 54,000 per 110 hours and show LOP Hours as 0.

---

### Task 1: Deterministic payroll calculations and verification expectations

**Files:**
- Create: `tmp/pdfs/ritika_hourly_data.py`
- Create: `tmp/pdfs/test_ritika_hourly_data.py`

**Interfaces:**
- Produces: `MONTHLY_PAYMENTS`, `calculate_month(month_record)`, and `amount_in_indian_words(amount)` for the PDF generator and verifier.

- [ ] **Step 1: Write a failing calculation test**

Create test cases asserting all six gross amounts equal net plus INR 200, earnings components sum to gross, hours use the exact INR 54,000 / 110 basis, and wording is correct for at least one month.

- [ ] **Step 2: Run the calculation test and confirm it fails**

Run: `python tmp/pdfs/test_ritika_hourly_data.py`

Expected: failure because `ritika_hourly_data` does not exist.

- [ ] **Step 3: Implement the approved data and calculations**

Use `Decimal`, `ROUND_HALF_UP`, and an exact contractual rate. Define six immutable month records with the payment dates and bank net amounts from the approved design.

- [ ] **Step 4: Run the calculation test and confirm it passes**

Run: `python tmp/pdfs/test_ritika_hourly_data.py`

Expected: `ALL_CALCULATION_TESTS_PASSED`.

### Task 2: Zoho-style branded PDF generation

**Files:**
- Create: `tmp/pdfs/generate_ritika_hourly_payslips.py`
- Read: `C:/Users/nidhi/Pictures/Saved Pictures/ensaar_logo.png`
- Create: `output/pdf/Payslip_E015_Ritika_Nikhara_January_2026.pdf`
- Create: `output/pdf/Payslip_E015_Ritika_Nikhara_February_2026.pdf`
- Create: `output/pdf/Payslip_E015_Ritika_Nikhara_March_2026.pdf`
- Create: `output/pdf/Payslip_E015_Ritika_Nikhara_April_2026.pdf`
- Create: `output/pdf/Payslip_E015_Ritika_Nikhara_May_2026.pdf`
- Replace: `output/pdf/Payslip_E015_Ritika_Nikhara_June_2026.pdf`

**Interfaces:**
- Consumes: `MONTHLY_PAYMENTS`, `calculate_month`, and `amount_in_indian_words` from Task 1.
- Produces: six A4 one-page PDFs with extractable text.

- [ ] **Step 1: Implement reusable drawing helpers**

Create helpers for text, dotted separators, rounded cards, employee metadata, earnings tables, the net-pay callout, amount in words, and the footer.

- [ ] **Step 2: Implement the six-document generation loop**

For every approved month, calculate the exact earnings split, draw the Ensaar logo and Zoho-style layout, and save the month-specific PDF without altering unrelated PDFs.

- [ ] **Step 3: Generate the PDFs**

Run: `python tmp/pdfs/generate_ritika_hourly_payslips.py`

Expected: six `GENERATED` lines naming non-empty files under `output/pdf/`.

### Task 3: Programmatic and visual verification

**Files:**
- Create: `tmp/pdfs/verify_ritika_hourly_payslips.py`
- Create: `tmp/pdfs/ritika-hourly-rendered/*.png`

**Interfaces:**
- Consumes: the six PDFs from Task 2 and the approved calculations from Task 1.
- Produces: a deterministic verification result and six rendered review images.

- [ ] **Step 1: Implement content and pagination verification**

Check each targeted filename exists, is non-empty, contains one page, includes the logo-adjacent employer identity, employee data, part-time label, pay basis, Paid Hours, LOP Hours 0, earnings components, INR 200 Professional Tax, correct payment date, and exact net pay.

- [ ] **Step 2: Run programmatic verification**

Run: `python tmp/pdfs/verify_ritika_hourly_payslips.py`

Expected: six `PASS` lines followed by `ALL_RITIKA_PAYSLIPS_VERIFIED`.

- [ ] **Step 3: Render all PDFs**

Run the PDF skill render script once per PDF, writing PNG pages beneath `tmp/pdfs/ritika-hourly-rendered/`.

Expected: six page images, one for each month.

- [ ] **Step 4: Inspect the complete rendered set**

Review all six page images for the attached logo, consistent alignment, readable currency symbols, no overlap, no clipping, and no extra pages. Correct and repeat verification if any issue is visible.

