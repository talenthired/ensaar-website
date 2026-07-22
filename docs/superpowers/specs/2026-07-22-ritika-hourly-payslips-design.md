# Ritika Hourly Payslips Design

## Objective

Create six one-page, Zoho-style payslips for Ritika Nikhara covering January through June 2026. Each payslip must use the supplied Ensaar logo, identify Ritika as a part-time hourly employee, and reconcile exactly to the matching salary transfer in the bank statement.

## Employee and employer details

- Employer: ENSAAR GLOBAL PRIVATE LIMITED
- Employer address: H.No. 16-11-20/G/204, Bhavani Apartments, 2nd Floor, Saleem Nagar, Malakpet, Hyderabad, Telangana 500036, India
- Employee: Ritika Nikhara
- Employee ID: E015
- Designation: Sr. QA Analyst
- Employment type: Part-time
- Contractual pay basis: INR 54,000 per 110 hours
- Exact hourly basis used for calculations: INR 54,000 / 110 hours
- Loss of pay hours: 0 for every month

## Source payment mapping

| Pay period | Payment date | Net pay | Gross pay | Equivalent paid hours |
|---|---:|---:|---:|---:|
| January 2026 | 04/02/2026 | INR 68,073 | INR 68,273 | 139.07 |
| February 2026 | 09/03/2026 | INR 73,145 | INR 73,345 | 149.41 |
| March 2026 | 06/04/2026 | INR 84,727 | INR 84,927 | 173.00 |
| April 2026 | 04/05/2026 | INR 83,745 | INR 83,945 | 171.00 |
| May 2026 | 05/06/2026 | INR 82,782 | INR 82,982 | 169.04 |
| June 2026 | 04/07/2026 | INR 82,273 | INR 82,473 | 168.00 |

Gross pay is defined as bank net pay plus INR 200 Professional Tax. Equivalent paid hours are derived from gross pay using the exact contractual rate, then displayed to two decimal places. The bank-derived gross and net amounts remain authoritative.

## Earnings and deductions

Each gross amount is split as follows:

- Basic: 50%, rounded to the nearest rupee using half-up rounding
- House Rent Allowance: 20%, rounded to the nearest rupee using half-up rounding
- Special Allowance: the residual required to make earnings total exactly equal gross pay
- Income Tax: INR 0
- Provident Fund: INR 0
- Professional Tax: INR 200

## Layout

Use an A4 portrait, one-page Zoho-style layout:

1. Ensaar logo at top left, with the legal company name and address beside it.
2. Pay-period title at top right.
3. Employee summary at left and a pale-green net-pay card at right.
4. Replace the salaried template's Paid Days and LOP Days with Paid Hours and LOP Hours.
5. Show designation, employment type, and pay basis beneath the employee summary.
6. Use a two-column earnings and deductions table.
7. Show total net payable and amount in words.
8. End with a system-generated-document note. Do not include Zoho branding in the footer.

## Output and validation

- Save the final PDFs in `output/pdf/` using `Payslip_E015_Ritika_Nikhara_<Month>_2026.pdf`.
- Preserve unrelated existing PDFs.
- Validate all six files for one-page pagination, expected extracted text, earnings arithmetic, INR 200 deductions, exact net pay, and correct payment dates.
- Render every PDF to PNG and inspect the complete set for clipping, overlap, inconsistent spacing, missing logo, or broken currency symbols.

