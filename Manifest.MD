# Manifest Requirements — EPA Form 8700-22 (Uniform Hazardous Waste Manifest)

This document captures the requirements that the **WasteID** application must satisfy in order to produce a compliant **EPA Form 8700-22 Uniform Hazardous Waste Manifest** for hazardous waste shipments.

Source of truth: U.S. EPA "Instructions for the Uniform Hazardous Waste Manifest (EPA Form 8700-22) and Continuation Sheet (EPA Form 8700-22A)" — https://www.epa.gov/sites/default/files/2020-04/documents/manifest_instructions_web.pdf

This document:
1. Describes the data that must be collected and printed on the manifest.
2. Maps each item to the **current state of the WasteID site** (models, pages, code) and flags any gaps.
3. Defines the business rules the application must enforce so a valid manifest can be created.
4. Specifies the UX requirement that **a Manifest Creation page must exist on the site, reachable from the Shipping page**.

---

## 1. Scope and Applicability

A manifest is required for any shipment of **RCRA hazardous waste** that is transported off-site for treatment, storage, or disposal. Inside WasteID this corresponds to a `Mixture` whose latest `WasteDetermination.is_hazardous_waste = True` AND whose generator status is **SQG** or **LQG**.

| Rule | Detail |
| --- | --- |
| **R-SCOPE-1** | A manifest **must** be generated for every shipment of hazardous waste from an **SQG** or **LQG** generator. |
| **R-SCOPE-2** | A manifest is **not required** for **VSQG** generators shipping to an authorized receiver, but the app should allow producing a non-manifest shipping document (e.g., BOL) instead. |
| **R-SCOPE-3** | Only `Mixture` records whose latest `WasteDetermination.is_hazardous_waste = True` are eligible for manifest creation. |
| **R-SCOPE-4** | International shipments require additional fields (Items 16–17 on the form). |

**Current site mapping:** `backend/api/models.py` already defines `EPAManifest`, `Shipper`, `Mixture.epa_generator_status`, and `WasteDetermination.is_hazardous_waste`. The `Shipping.jsx` page filters to "signed orders" and currently shows a **"Coming Soon"** modal when an order is clicked — this is the point where the manifest creation flow must begin.

---

## 2. Required Manifest Fields (per EPA Instructions)

The numbers below correspond to the boxes on EPA Form 8700-22. For each item we capture:
- **What** is required by EPA.
- **Where** in the current WasteID schema/UI it lives.
- **Rule(s)** the app must enforce.

### Item 1 — Generator ID Number, Manifest Tracking Number, Page Number
| Field | Requirement | Current site | Rule |
| --- | --- | --- | --- |
| Generator EPA ID | 12-character US EPA ID Number assigned to the generator. State ID may be used when generator has no federal ID. | `Shipper.epa_id`, `EPAManifest.generator_epa_id` | **R-1.1** Must be exactly 12 characters when present; allow blank for state-permitted generators with documented state ID. |
| Manifest Tracking Number | Pre-printed 9-digit number followed by a 3-letter suffix (e.g., `123456789ELC`) supplied by the printer of the manifest form, or the e-Manifest system. | `EPAManifest.manifest_tracking_number` | **R-1.2** Validate format `^[0-9]{9}[A-Z]{3}$` when not blank. The system **must not** auto-assign tracking numbers. |
| Page | "Page 1 of __". | Not currently stored; derive from number of continuation sheets. | **R-1.3** If total waste line items > 4, additional pages (Form 8700-22A) must be generated automatically. |

### Item 2 — Page 1 of __
Total page count including all continuation sheets. **R-2.1** Compute as `1 + ceil((waste_items.length - 4) / 6)` (continuation sheet holds up to 6 lines).

### Item 3 — Emergency Response Phone
| Requirement | Current site | Rule |
| --- | --- | --- |
| 24-hour emergency response telephone number, attended by a person knowledgeable about the waste, capable of providing detailed information. | `Shipper.emergency_phone`, `EPAManifest.emergency_response_phone` | **R-3.1** Required, non-blank. **R-3.2** Must be a US/Intl phone number (regex validation). **R-3.3** Must not be a generic switchboard or answering machine — UI must display a confirmation prompt. |

### Item 4 — Generator's Site Address (Name and Mailing Address)
| Field | Current site | Rule |
| --- | --- | --- |
| Generator company name | `EPAManifest.generator_name`, `Shipper.company_name` | **R-4.1** Required. Pre-fill from selected `Shipper`. |
| Mailing address | `EPAManifest.generator_address`, `generator_city`, `generator_state`, `generator_zip` | **R-4.2** All four required. |
| Generator phone | `EPAManifest.generator_phone` | **R-4.3** Required. |

### Item 5 — Generator's Site Address (if different from mailing)
| Field | Current site | Rule |
| --- | --- | --- |
| Site (physical) address where waste was generated | `EPAManifest.generator_site_address`, `Shipper.site_address` / `site_city` / `site_state` / `site_zip_code` | **R-5.1** Required when site address differs from mailing. **R-5.2** UI must offer "same as mailing" checkbox. |

### Items 6 & 7 — Transporters
| Field | Current site | Rule |
| --- | --- | --- |
| Transporter 1 company name + EPA ID | `EPAManifest.transporter1_name`, `transporter1_epa_id` | **R-6.1** Transporter 1 name and EPA ID **required**. |
| Transporter 2 company name + EPA ID | `EPAManifest.transporter2_name`, `transporter2_epa_id` | **R-7.1** Required only if a second transporter is used. |
| Additional transporters | Not currently modeled | **R-7.2** Continuation sheet must support transporters 3+. Add `EPAManifest.additional_transporters` (JSON array of `{name, epa_id}`). |

### Item 8 — Designated Facility (TSDF)
| Field | Current site | Rule |
| --- | --- | --- |
| Designated facility name, address, EPA ID, phone | `EPAManifest.designated_facility_*` | **R-8.1** Name, full address (street/city/state/zip), EPA ID (12 chars), and phone **all required**. |
| Alternate facility | Not modeled | **R-8.2** Optional alternate facility fields should be added to support rejected loads. |

### Item 9 — U.S. DOT Description, Item 9a (HM indicator) and 9b (Description)
This is the **central rule set** for hazardous shipping descriptions. Item 9 is the U.S. DOT Proper Shipping Description per 49 CFR 172.101.

**Item 9a — HM indicator:**
- Mark **"X"** in the HM column for any line that is a DOT hazardous material.

**Item 9b — Proper Shipping Description, in order:**
1. UN/NA identification number (e.g., `UN1090`)
2. Proper Shipping Name (PSN) — **prefixed with the word "Waste"** when applicable (see R-9.2)
3. Hazard class or Division (e.g., `3`)
4. Packing Group in Roman numerals (e.g., `PG II`)

| Rule ID | Rule |
| --- | --- |
| **R-9.1** | Each waste line item must have all four DOT components: UN/NA #, PSN, Hazard Class, Packing Group. Validate before allowing manifest submission. |
| **R-9.2** | **"Waste" prefix rule (49 CFR 172.101(c)(9)):** When the generator's EPA status is **SQG** or **LQG**, the PSN **must be prefixed with the word "Waste"** if it is not already part of the PSN. When generator status is **VSQG**, the PSN **must not** be prefixed. The system must apply this transformation automatically based on `Mixture.epa_generator_status` (or `Customer.epa_generator_status`). |
| **R-9.2.a** | Example — Acetone (UN1090, Class 3, PG II): <ul><li>VSQG: `UN1090, Acetone, 3, PG II`</li><li>SQG / LQG: `UN1090, Waste Acetone, 3, PG II`</li></ul> |
| **R-9.2.b** | Idempotency: if the chemical's PSN already begins with "Waste " (case-insensitive), do not duplicate the prefix. |
| **R-9.3** | If the material is not DOT-regulated but is RCRA-hazardous, use the EPA description (e.g., `Hazardous Waste, Solid, N.O.S.`) — still apply the "Waste" rule. |
| **R-9.4** | Validate UN/NA number format `^(UN|NA)\d{4}$`. |
| **R-9.5** | Packing Group must be one of `PG I`, `PG II`, `PG III`, or blank for materials that do not require one. |

### Item 10 — Containers (Number and Type)
| Field | Current site | Rule |
| --- | --- | --- |
| Number of containers | Stored in `EPAManifest.waste_items[].containers_no` | **R-10.1** Integer ≥ 1, required. |
| Container type code (DM, DW, DF, TP, TT, TC, CY, CM, CF, CW, BA) | `EPAManifest.waste_items[].container_type`; codes already defined in `frontend/src/pages/EPAForm.jsx` | **R-10.2** Must be one of the EPA-approved codes. |

### Item 11 — Total Quantity
| Rule | Detail |
| --- | --- |
| **R-11.1** | Quantity must be a positive number. |
| **R-11.2** | Unit of measure must be a single EPA code: `G` (gallons), `P` (pounds), `T` (tons, 2000 lb), `K` (kilograms), `M` (metric tons, 1000 kg), `N` (cubic yards), `L` (liters). Codes are present in `frontend/src/pages/EPAForm.jsx`. |
| **R-11.3** | The application must reject other units (e.g., `mL`, `%` weight) that exist in the internal `MixtureComponent.UNIT_CHOICES` but are not valid on the manifest. |

### Item 12 — Unit of Measure
See R-11.2.

### Item 13 — Waste Codes
| Rule | Detail |
| --- | --- |
| **R-13.1** | List all applicable federal RCRA waste codes (D, F, K, P, U) for each line item. Source: `WasteDetermination.waste_codes` (JSON list). |
| **R-13.2** | Up to 6 codes per line; if more, use a continuation sheet. |
| **R-13.3** | State waste codes may be appended for state-program generators; UI must allow optional state codes per line. |
| **R-13.4** | Waste codes on the manifest must match the codes from the most recent signed `WasteDetermination` for that profile (`Mixture`). The UI must block manual edits that diverge from the determination unless an authorized reviewer overrides. |

### Item 14 — Special Handling Instructions and Additional Information
| Field | Current site | Rule |
| --- | --- | --- |
| Free-text instructions: profile #, shipping cost code, alternate facility, etc. | `EPAManifest.special_handling_instructions`, `additional_info` | **R-14.1** Optional. **R-14.2** When `Mixture.transaction_id` (profile ID) is available, auto-populate this field with `Profile: <transaction_id>`. |

### Item 15 — Generator's / Offeror's Certification
The generator must certify, sign, and date:
- That the shipment is properly classified, described, packaged, marked, labeled and placarded per DOT.
- A waste minimization statement (LQGs select "large quantity generator"; SQGs select "small quantity generator").

| Rule | Detail |
| --- | --- |
| **R-15.1** | A printed name **and** a signature date are required before status can be advanced to `signed`. |
| **R-15.2** | The certification text shown to the generator must include the waste-minimization clause appropriate to their EPA status (LQG vs SQG). |
| **R-15.3** | `EPAManifest.generator_certification` must be `True` before printing or transmitting. |

### Items 16 & 17 — International Shipments / Port of Entry
| Rule | Detail |
| --- | --- |
| **R-16.1** | When `international_shipment = True`, `port_of_entry_exit` and `date_leaving_us` become required. |
| **R-16.2** | Imports to the U.S. (`import_to_us = True`) require the importer (foreign generator) information in Item 16. |

### Items 18–20 — Transporter and Designated Facility Acknowledgement
Filled in after the manifest is printed (transporter signs Item 18, facility signs Item 20). The app does not collect these at creation time but must:
- **R-20.1** Provide blank, signature-ready space on the rendered/PDF manifest.
- **R-20.2** Capture facility acknowledgement upon e-Manifest return (future scope; data model needs `received_at`, `received_by` fields).

---

## 3. Generator-Status-Driven Business Rules

The generator's EPA generator status drives multiple downstream rules. This is already partially captured in `Mixture.epa_generator_status` and `Customer.epa_generator_status` with choices `VSQG | SQG | LQG`.

| Rule | VSQG | SQG | LQG |
| --- | --- | --- | --- |
| Manifest required? | No | **Yes** | **Yes** |
| DOT PSN "Waste" prefix (R-9.2) | **Not applied** | **Applied** | **Applied** |
| Item 15 certification text | N/A | "Small Quantity Generator" waste-minimization clause | "Large Quantity Generator" waste-minimization clause |
| Hold time (ship-by) | 10 days (existing `EPA_STATUS_HOLD_DAYS`) | 30 days | 60 days |

**R-STATUS-1** The generator status must be present (`epa_generator_status` non-blank) on the source `Mixture` (or its `Customer`) before a manifest can be created.

**R-STATUS-2** The manifest creation flow must read `Mixture.epa_generator_status` (falling back to `Customer.epa_generator_status`) and apply the rules above without further user input.

**R-STATUS-3** Changing the generator status after the manifest has been created must invalidate the draft and force re-validation of all Item 9 descriptions.

---

## 4. Data Integrity & Workflow Rules

| Rule | Detail |
| --- | --- |
| **R-WF-1** | A manifest can only be created from an order whose latest `WasteDetermination` is signed (`reviewer_name` and `reviewer_sign_off_date` are present) — same gate already used in `Shipping.jsx`'s `signedOrders` filter. |
| **R-WF-2** | An `EPAManifest` row must be linked to one or more `WasteDetermination` records via `determination_ids` (already present). The link must be enforced (non-empty) before status can leave `draft`. |
| **R-WF-3** | The selected `Shipper` (transporter or generator role) must have non-blank `epa_id`, `address`, `phone`, and `emergency_phone`. UI must block selection of an incomplete `Shipper`. |
| **R-WF-4** | Status transitions: `draft → signed → shipped → received`. Status may only advance, never regress, except by an Admin role. |
| **R-WF-5** | Once `status = signed`, the form is immutable except for Items 18–20 (acknowledgements). |
| **R-WF-6** | A printable PDF version of the completed manifest must be generated (current `frontend/src/lib/epaFormPdf.js` is reused). The PDF must include all required items and the "Waste" prefix rule must be visible in Item 9. |
| **R-WF-7** | Continuation sheets (Form 8700-22A) must be auto-generated when line items > 4 (R-2.1). |
| **R-WF-8** | Manifest tracking number is supplied by the user (from printed form stock) or by an e-Manifest integration — the system must never invent one. |

---

## 5. UX / Site Requirements

| Rule | Detail |
| --- | --- |
| **R-UX-1** | A **"Create Manifest"** page must exist on the site (route `/manifest/new` or similar; the existing `/epa-form` page can be reused/renamed). |
| **R-UX-2** | The Shipping page (`frontend/src/pages/Shipping.jsx`) **must link to** the Manifest Creation page. Today, clicking a signed order opens a "Coming Soon" modal — this must be replaced with (or augmented by) a button/link such as **"Create Manifest"** that navigates to the manifest page, passing the selected order/mixture context (e.g., `/epa-form?orderId=<id>` or `/manifest/new?mixtureId=<id>`). |
| **R-UX-3** | The Manifest Creation page must pre-populate from the selected `Mixture`, its `Customer`, the latest `WasteDetermination`, and a chosen `Shipper`. |
| **R-UX-4** | The Manifest Creation page must display the computed Item 9 description (with the "Waste" prefix applied per R-9.2) and visibly indicate to the user that the prefix was applied (or not) based on EPA status. |
| **R-UX-5** | Validation errors must be shown inline per item with the Form 8700-22 box number for traceability. |
| **R-UX-6** | The page must offer **"Save Draft"**, **"Validate"**, and **"Generate PDF"** actions. The PDF action is gated on all required items passing validation and on `generator_certification = True`. |
| **R-UX-7** | The Shipping page must show a manifest status column once a manifest exists for an order (e.g., *Draft*, *Signed*, *Shipped*). |

---

## 6. Gap Summary vs. Current Codebase

| Area | Current state | Gap |
| --- | --- | --- |
| Manifest data model | `EPAManifest` exists with most fields | Add `received_at`, `received_by`, alternate facility, additional transporters; persist per-line `un_number`, `hazard_class`, `packing_group` instead of free-text `dot_description`. |
| "Waste" prefix logic | Not implemented | Add a helper (e.g., `buildDotDescription(chemical, epaStatus)`) shared by manifest UI and PDF generator. |
| Shipping → Manifest link | `Shipping.jsx` shows a "Coming Soon" modal | Replace with a navigation link to the Manifest Creation page (R-UX-2). |
| Continuation sheets | Not implemented | Add 8700-22A generation when `waste_items.length > 4`. |
| Validation | Form-level only | Add per-rule validations listed above with EPA box references. |
| Generator-status drift | No enforcement | Implement R-STATUS-3 (invalidate manifest on status change). |
| Tracking number entry | Free text | Add format validation `^[0-9]{9}[A-Z]{3}$` (R-1.2). |
| Item 15 certification text | Static | Switch text based on SQG vs LQG (R-15.2). |

---

## 7. Acceptance Criteria

A manifest creation flow is considered compliant when, for any signed hazardous-waste order:

1. The Shipping page exposes a link/button to create a manifest for the selected order (R-UX-2).
2. The Manifest Creation page validates every rule R-1.* through R-16.* before allowing the user to mark the manifest as signed.
3. Item 9 descriptions are produced according to R-9.2, with the "Waste" prefix correctly added for SQG/LQG and omitted for VSQG generators, demonstrated by the Acetone example in R-9.2.a.
4. A printable PDF that matches EPA Form 8700-22 layout (with 8700-22A continuation sheets where needed) is produced.
5. The manifest record is immutably linked to the `WasteDetermination`(s) it certifies and to the selected `Shipper`(s).

---

## 8. References

- EPA Instructions for the Uniform Hazardous Waste Manifest (Form 8700-22) and Continuation Sheet (Form 8700-22A): https://www.epa.gov/sites/default/files/2020-04/documents/manifest_instructions_web.pdf
- 40 CFR Part 262, Subpart B — The Manifest
- 49 CFR 172.101 — Hazardous Materials Table (including 172.101(c)(9) "Waste" prefix rule)
- 40 CFR 262.20 — General Requirements (manifest)
- 40 CFR 262.14 — Conditions for VSQG exemption
- 40 CFR 262.15 — Satellite accumulation areas
- 40 CFR 262.16 — Conditions for SQG accumulation
- 40 CFR 262.17 — Conditions for LQG accumulation

> **Note on generator-status-driven rules:** The "Waste" prefix rule in R-9.2 and the hold-time table in §3 reflect the **business rules supplied for this application** (matching the existing `EPA_STATUS_HOLD_DAYS` map in `backend/api/models.py` and the user-specified DOT description behavior tied to VSQG/SQG/LQG status). These app-level rules should be reviewed against the current text of 49 CFR 172.101(c)(9) and 40 CFR 262.14–262.17 by a qualified EHS reviewer before production use.
