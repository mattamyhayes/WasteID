# State-Specific Hazardous Waste Rules — Requirements Document

This document defines the requirements for applying **state-specific hazardous/dangerous waste rules** within the WasteID application during the **profile creation workflow**. It also incorporates **Manifest Guidelines (EPA Form 8700-22)** and **49 CFR (DOT Hazardous Materials Regulations)** as they interact with state requirements.

---

## 1. Purpose and Scope

Each U.S. state (and territory) may impose hazardous waste requirements **beyond** those established by federal RCRA (40 CFR Parts 260–270) and DOT (49 CFR Parts 171–180). The WasteID system must validate waste profiles against the applicable state rules **before** submission to a reviewer.

### 1.1 Relationship to Existing Workflow

The current WasteID profile creation flow is:

1. **Step 1 — Federal Determination:** User enters waste profile data (mixture, components, characteristics). The system runs the RCRA hazardous waste determination (solid waste check → exclusions → listed waste → characteristics).
2. **Step 2 — State Rules Validation (THIS DOCUMENT):** Upon the user clicking **"Submit"** (which routes to the reviewer), the system performs an **invisible, automatic validation** against the state-specific rules for the generator's state. If additional information is needed, the system presents **follow-up questions** to the user before the profile advances.
3. **Step 3 — Reviewer Sign-Off:** The reviewer evaluates the profile with all federal AND state data collected.

### 1.2 Key Behavioral Requirements

| Req ID | Requirement |
|--------|-------------|
| **SR-FLOW-1** | The "Submit" button on the profile creation page (`NewDetermination.jsx`) must NOT immediately route to the reviewer. Instead, it triggers the state rules validation engine. |
| **SR-FLOW-2** | The state rules engine operates **invisibly** to the user — the user does not see which rules are being checked or their logic. |
| **SR-FLOW-3** | Based on the generator's state (from `CustomerLocation.state`), the engine evaluates all applicable state rules against the submitted profile data. |
| **SR-FLOW-4** | If the profile data is **insufficient** for state compliance, the system presents a **follow-up questionnaire** with only the questions relevant to the triggered state rules. |
| **SR-FLOW-5** | The user must answer all required state-specific questions before the profile can advance to review. |
| **SR-FLOW-6** | Once all state-specific validation passes (or no state-specific rules are triggered), the profile advances to `pending_review` status and routes to the reviewer. |
| **SR-FLOW-7** | State rules must be re-evaluated any time a profile is edited and re-submitted. |
| **SR-FLOW-8** | The state rules engine must be configurable/extensible to accommodate regulatory updates without code redeployment (prefer a data-driven rules table). |

---

## 2. Manifest Guidelines Integration

The state rules engine must also validate manifest-related requirements that vary by state. These are in addition to the federal manifest requirements documented in `Manifest.MD`.

### 2.1 Federal Manifest Baseline (EPA Form 8700-22)

All manifests must comply with:
- **40 CFR Part 262, Subpart B** — Manifest requirements
- **40 CFR 262.20** — General requirements (who must use a manifest)
- **40 CFR 262.21** — Manifest tracking numbers
- **40 CFR 262.22** — Number of copies
- **40 CFR 262.23** — Use of the manifest
- **40 CFR 262.24** — Use of the electronic manifest (e-Manifest)
- **40 CFR 262.25** — Manifest discrepancies

### 2.2 State Manifest Variations

| Req ID | Requirement |
|--------|-------------|
| **SR-MAN-1** | Certain states require **state-specific manifest forms** or **additional copies** beyond the federal 6-copy requirement. The system must flag when a state requires extra copies. |
| **SR-MAN-2** | Some states require **state waste codes** to appear on the manifest in addition to federal RCRA codes (Item 13). The system must auto-populate state waste codes when applicable. |
| **SR-MAN-3** | States with their own manifest tracking systems (e.g., California, Washington) may require additional notifications or registrations. The system must prompt for these. |
| **SR-MAN-4** | Interstate shipments must comply with BOTH the origin state AND destination state manifest rules. The system must validate both sets of rules. |
| **SR-MAN-5** | State-specific manifest fees or surcharges must be flagged to the user (informational). |
| **SR-MAN-6** | States may have different thresholds for when a manifest is required (e.g., California requires manifests for non-RCRA state-only hazardous waste). |

---

## 3. 49 CFR (DOT) Integration with State Rules

### 3.1 Federal DOT Baseline

All hazardous waste shipments must comply with 49 CFR:
- **49 CFR 171** — General information, regulations, and definitions
- **49 CFR 172** — Hazardous Materials Table, special provisions, hazardous materials communications, emergency response information
  - **172.101** — Purpose and use of hazardous materials table
  - **172.101(c)(9)** — "Waste" prefix rule for proper shipping names
  - **172.200–172.205** — Shipping papers (manifest serves as shipping paper)
  - **172.300–172.338** — Marking requirements
  - **172.400–172.450** — Labeling requirements
  - **172.500–172.560** — Placarding requirements
- **49 CFR 173** — Shippers — general requirements for shipments and packagings
  - **173.12** — Exceptions for shipment of waste materials
  - **173.13** — Exceptions for shipment of laboratory waste chemicals
- **49 CFR 177** — Carriage by public highway
- **49 CFR 178** — Specifications for packagings
- **49 CFR 180** — Continuing qualification and maintenance of packagings

### 3.2 State DOT Variations

| Req ID | Requirement |
|--------|-------------|
| **SR-DOT-1** | Some states impose **additional transportation requirements** beyond 49 CFR (e.g., route restrictions, time-of-day shipping limitations, additional placarding). The system must flag these per the generator's state. |
| **SR-DOT-2** | States may define **state-only hazardous materials** that require DOT-level packaging and shipping even when not federally regulated. The system must identify these based on state waste codes. |
| **SR-DOT-3** | The "Waste" prefix rule (49 CFR 172.101(c)(9)) applies to all SQG and LQG manifests. State rules cannot override this federal requirement but may impose additional description requirements. |
| **SR-DOT-4** | When a state classifies a waste as "dangerous" but not federally "hazardous" (e.g., Washington state), the system must determine whether DOT applies based on the material's characteristics per 49 CFR 173. |
| **SR-DOT-5** | The system must validate that container types and sizes comply with both federal (49 CFR 178) and any state-specific packaging requirements. |
| **SR-DOT-6** | For LQG shipments, the system must verify that a preparedness and prevention plan addresses both federal (40 CFR 262.17) and state-specific emergency response requirements. |

---

## 4. Rules Engine Architecture

### 4.1 Engine Design Requirements

| Req ID | Requirement |
|--------|-------------|
| **SR-ENG-1** | The rules engine must accept the complete profile data (Mixture, MixtureComponents, WasteDetermination results, Customer, CustomerLocation) as input. |
| **SR-ENG-2** | The engine resolves the applicable state from `CustomerLocation.state` (the generator's physical location). |
| **SR-ENG-3** | Rules must be evaluated in priority order: (1) Federal baseline, (2) State-specific additions, (3) State-specific manifest requirements. |
| **SR-ENG-4** | Each rule evaluation returns one of: `PASS`, `FAIL`, or `NEEDS_INFO` (requires additional user input). |
| **SR-ENG-5** | When a rule returns `NEEDS_INFO`, the engine must specify which question(s) to present to the user. |
| **SR-ENG-6** | The engine must produce a `StateValidationResult` object containing: all rules checked, pass/fail status, required questions, and any state-specific waste codes or manifest requirements identified. |
| **SR-ENG-7** | Rules must be stored in a data structure (database table or configuration file) that allows updates without application code changes. |
| **SR-ENG-8** | The engine must log all rule evaluations for audit purposes (which rules fired, results, timestamps). |

### 4.2 Data Model Extensions

```
StateRule:
  - id: UUID
  - state_code: CharField (2-letter state/territory code)
  - rule_category: CharField (identification | storage | manifest | transport | reporting | labeling)
  - rule_reference: CharField (regulation citation)
  - description: TextField
  - condition_expression: JSONField (conditions under which this rule applies)
  - question_template: JSONField (questions to ask if NEEDS_INFO)
  - validation_logic: TextField (rule evaluation logic reference)
  - effective_date: DateField
  - sunset_date: DateField (nullable)
  - is_active: BooleanField

StateValidationResult:
  - id: UUID
  - mixture: ForeignKey(Mixture)
  - validated_at: DateTimeField
  - state_code: CharField
  - overall_result: CharField (pass | needs_info | fail)
  - rule_results: JSONField (array of {rule_id, result, details})
  - additional_data_collected: JSONField (answers to state-specific questions)
```

---

## 5. U.S. Territories — State-Specific Rules

### 5.1 Puerto Rico (PR)

**Authority:** Department of Natural and Environmental Resources (DNER)
**Regulations:** Puerto Rico Environmental Quality Board regulations, DNER hazardous waste management rules

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **PR-001** | Identification | Puerto Rico adopts federal RCRA with modifications. Generators must register with DNER in addition to EPA. | Generator state = PR | "Has this facility registered with DNER as a hazardous waste generator?" / "Provide DNER registration number" |
| **PR-002** | Manifest | Puerto Rico requires Spanish-language manifest copies for local transport. | Shipment origin = PR AND destination = PR | "Will this shipment remain entirely within Puerto Rico?" |
| **PR-003** | Storage | PR may impose stricter storage time limits for certain waste categories in tropical climate conditions. | Generator state = PR AND waste is reactive or ignitable | "Is the waste stored in a climate-controlled facility?" |
| **PR-004** | Reporting | DNER requires biennial reporting aligned with but potentially more detailed than federal requirements. | Generator state = PR AND generator status = LQG | "Has the facility submitted its most recent DNER biennial report?" |
| **PR-005** | Transport | Shipments leaving PR (to mainland US) require additional customs/shipping documentation. | Origin = PR AND destination ≠ PR | "Provide ocean/air carrier information for inter-island transport" |
| **PR-006** | Manifest | DNER may require notification prior to shipment for certain waste types. | Generator state = PR AND waste codes include F001-F005 (spent solvents) | "Has DNER been notified of this planned shipment?" |

### 5.2 Guam (GU)

**Authority:** Guam Environmental Protection Agency (Guam EPA)
**Regulations:** Guam Hazardous Waste Management Program (HWMP), 22 GAR Division IV

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **GU-001** | Identification | Guam administers its own RCRA-authorized program. All generators must obtain a Guam EPA ID. | Generator state = GU | "Provide Guam EPA site identification number" |
| **GU-002** | Storage | Due to island geography, Guam may allow extended accumulation periods with prior approval. | Generator state = GU AND accumulation > 90 days | "Has an extended accumulation time extension been granted by Guam EPA?" |
| **GU-003** | Transport | All hazardous waste leaving Guam requires ocean transport coordination and Guam EPA pre-notification. | Generator state = GU AND destination ≠ GU | "Has Guam EPA been pre-notified of off-island shipment?" / "Provide vessel/carrier name and voyage number" |
| **GU-004** | Manifest | Federal manifest form accepted; additional Guam EPA notification copy required. | Generator state = GU | "Confirm that an additional manifest copy will be provided to Guam EPA" |
| **GU-005** | Reporting | Annual reporting to Guam EPA required for all generator categories. | Generator state = GU | "Has the annual Guam EPA hazardous waste report been filed?" |

### 5.3 U.S. Virgin Islands (VI)

**Authority:** Virgin Islands Department of Planning and Natural Resources (DPNR), Division of Environmental Protection
**Regulations:** Solid Waste Management Program rules

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **VI-001** | Identification | USVI operates under EPA Region 2 oversight. Generators must comply with DPNR solid/hazardous waste requirements. | Generator state = VI | "Is this facility registered with DPNR for waste management activities?" |
| **VI-002** | Storage | DPNR may impose additional containment requirements due to hurricane vulnerability. | Generator state = VI AND waste is liquid | "Is secondary containment rated for Category 4+ hurricane wind/rain?" |
| **VI-003** | Transport | All hazardous waste shipments from USVI require ocean transport and DPNR pre-approval. | Generator state = VI AND destination ≠ VI | "Has DPNR pre-approved this off-island shipment?" / "Provide shipping vessel information" |
| **VI-004** | Manifest | Standard federal manifest form used; DPNR copy required within 30 days of shipment. | Generator state = VI | None (system generates reminder) |
| **VI-005** | Identification | DPNR may classify certain locally-generated wastes (e.g., cruise ship waste, rum distillery waste) under additional categories. | Generator state = VI AND waste process involves distillation or marine operations | "Describe the generating process in detail for DPNR classification" |

### 5.4 American Samoa (AS)

**Authority:** American Samoa Environmental Protection Agency (AS-EPA)
**Regulations:** AS-EPA regulations (adopted federal standards with local modifications)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **AS-001** | Identification | AS-EPA administers environmental regulations under local law. Federal RCRA applies as baseline. | Generator state = AS | "Is this facility registered with AS-EPA?" |
| **AS-002** | Transport | All hazardous waste must leave the territory via ocean vessel; AS-EPA pre-notification required. | Generator state = AS | "Has AS-EPA been notified of planned shipment?" / "Provide vessel and routing information" |
| **AS-003** | Storage | Given limited disposal infrastructure, extended storage may require AS-EPA variance. | Generator state = AS AND no local TSDF available | "Has an AS-EPA storage variance been obtained?" |
| **AS-004** | Reporting | AS-EPA may require waste minimization plans from all generators. | Generator state = AS | "Does this facility have a current waste minimization plan on file with AS-EPA?" |

### 5.5 Northern Mariana Islands / CNMI (MP)

**Authority:** CNMI Bureau of Environmental and Coastal Quality (BECQ); EPA Region 9 oversight
**Regulations:** Trust Territory/CNMI hazardous waste regulations; EPA Region 9 manifest requirements

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **MP-001** | Identification | CNMI operates under EPA Region 9 direct implementation. All RCRA rules apply as administered by EPA. | Generator state = MP | "Confirm EPA Region 9 site ID number" |
| **MP-002** | Manifest | EPA Region 9 manifest requirements apply directly. Standard federal manifest used. | Generator state = MP | None |
| **MP-003** | Transport | Off-island shipments require EPA Region 9 pre-notification and ocean transport documentation. | Generator state = MP AND destination ≠ MP | "Has EPA Region 9 been notified of off-island shipment?" / "Provide carrier and routing" |
| **MP-004** | Storage | Limited local disposal capacity; may require EPA Region 9 approval for extended accumulation. | Generator state = MP AND accumulation > 90 days | "Has EPA Region 9 granted extended accumulation approval?" |

---

## 6. United States — State-Specific Rules

### 6.1 Alabama (AL)

**Authority:** Alabama Department of Environmental Management (ADEM)
**Regulations:** ADEM Admin Code Chapter 335-14-3 (Identification and Listing of Hazardous Waste)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **AL-001** | Identification | Alabama adopts 40 CFR 261 with state-specific modifications per Chapter 335-14-3. Additional state-listed wastes may apply. | Generator state = AL | None (system checks against Alabama listing) |
| **AL-002** | Identification | ADEM requires waste determination documentation to be maintained on-site for 3 years (may exceed federal minimum). | Generator state = AL | "Will waste determination records be maintained on-site for at least 3 years?" |
| **AL-003** | Manifest | Alabama requires manifest copies to be submitted to ADEM within specific timeframes. | Generator state = AL AND manifest required | "Confirm that a manifest copy will be submitted to ADEM" |
| **AL-004** | Storage | ADEM Chapter 335-14-5 governs accumulation; specific labeling with "Hazardous Waste" and accumulation start date required. | Generator state = AL AND generator stores waste | "Are all containers labeled with 'Hazardous Waste' and accumulation start date per ADEM 335-14-5?" |
| **AL-005** | Reporting | LQGs must submit biennial reports to ADEM. SQGs must maintain records per state requirements. | Generator state = AL AND status = LQG | "Has the most recent biennial report been submitted to ADEM?" |
| **AL-006** | Identification | Alabama may have additional characteristic waste thresholds or testing requirements per ADEM guidance documents. | Generator state = AL AND waste determination = characteristic | "Has TCLP or other characteristic testing been performed per ADEM guidelines?" |
| **AL-007** | Transport | Alabama requires notification to ADEM for certain waste shipments through the state. | Shipment route passes through AL | "Will ADEM be notified of this shipment as required?" |

### 6.2 Alaska (AK)

**Authority:** Alaska Department of Environmental Conservation (DEC), Division of Environmental Health
**Regulations:** Defaults to federal EPA rules; 18 AAC 62 (Solid Waste Management)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **AK-001** | Identification | Alaska defers to federal EPA rules for hazardous waste identification. No additional state-listed wastes. | Generator state = AK | None |
| **AK-002** | Transport | Due to remote geography, Alaska DEC may require additional transport planning documentation for air/ocean shipment of hazardous waste. | Generator state = AK AND shipment via air/ocean | "Will waste be shipped via air or ocean transport?" / "Provide transport routing and carrier information" |
| **AK-003** | Storage | Alaska DEC hazardous waste program may require cold-weather storage provisions. | Generator state = AK AND waste is liquid | "Are freeze-protection measures in place for liquid hazardous waste storage?" |
| **AK-004** | Reporting | Alaska DEC requires hazardous waste generators to maintain operating records. | Generator state = AK | None (informational — system notes requirement) |

### 6.3 Arizona (AZ)

**Authority:** Arizona Department of Environmental Quality (ADEQ), Waste Programs Division
**Regulations:** Arizona Administrative Code Title 18, Chapter 8; Arizona Revised Statutes §49-921 et seq.

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **AZ-001** | Identification | Arizona adopts federal RCRA rules with Arizona-specific modifications per A.A.C. Title 18, Ch. 8, Article 2. | Generator state = AZ | None (system applies Arizona listing) |
| **AZ-002** | Identification | ADEQ may designate additional wastes as hazardous under state authority. | Generator state = AZ AND waste not federally listed | "Has ADEQ made a specific determination about this waste stream?" |
| **AZ-003** | Storage | Arizona requires specific secondary containment and inspection schedules per A.A.C. R18-8-264. | Generator state = AZ AND generator stores > 90 days (LQG) | "Does the storage area meet ADEQ secondary containment requirements per R18-8-264?" |
| **AZ-004** | Manifest | Arizona accepts standard federal manifest. State copy requirements apply. | Generator state = AZ | None |
| **AZ-005** | Reporting | Arizona requires annual hazardous waste reports from LQGs. | Generator state = AZ AND status = LQG | "Has the annual ADEQ hazardous waste report been filed?" |
| **AZ-006** | Transport | ADEQ requires transporters to have state permits in addition to EPA ID. | Generator state = AZ | "Does the selected transporter hold an Arizona transporter permit?" |
| **AZ-007** | Identification | Arizona has specific provisions for mining waste and mineral processing waste that may differ from federal exclusions. | Generator state = AZ AND process involves mining/mineral processing | "Is this waste from mining or mineral processing operations? If so, describe the specific process." |

### 6.4 Arkansas (AR)

**Authority:** Arkansas Department of Energy & Environment, Division of Environmental Quality (DEQ)
**Regulations:** Arkansas Pollution Control & Ecology Commission Regulation No. 23 (Hazardous Waste Management)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **AR-001** | Identification | Arkansas adopts federal RCRA identification rules with state modifications per Reg. 23. | Generator state = AR | None |
| **AR-002** | Identification | Arkansas DEQ requires SQGs and LQGs to maintain hazardous waste determination records per the generator fact sheet requirements. | Generator state = AR | "Are hazardous waste determination records maintained per DEQ Reg. 23?" |
| **AR-003** | Storage | Arkansas follows federal accumulation time limits with state enforcement. Weekly inspections required for accumulation areas. | Generator state = AR AND generator stores waste | "Are weekly inspections of waste accumulation areas being conducted and documented?" |
| **AR-004** | Manifest | Standard federal manifest accepted. Arkansas DEQ requires copies per federal schedule. | Generator state = AR | None |
| **AR-005** | Reporting | Biennial reporting to DEQ required for LQGs. SQGs have reduced reporting. | Generator state = AR AND status = LQG | "Has the biennial report been submitted to Arkansas DEQ?" |
| **AR-006** | Labeling | Arkansas requires specific labeling: "Hazardous Waste", constituent name, accumulation start date, and generator information. | Generator state = AR | "Are all containers properly labeled per Arkansas Reg. 23 requirements?" |
| **AR-007** | Training | Arkansas requires hazardous waste training for all personnel handling waste. | Generator state = AR AND status ∈ (SQG, LQG) | "Have all personnel handling hazardous waste completed required training?" |

### 6.5 California (CA)

**Authority:** Department of Toxic Substances Control (DTSC)
**Regulations:** California Health & Safety Code Division 20, Chapter 6.5 (Hazardous Waste Control Law); 22 CCR Division 4.5 (California Code of Regulations)

California has the **most extensive** state-specific requirements, defining wastes as hazardous that are NOT hazardous under federal RCRA ("non-RCRA hazardous waste").

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **CA-001** | Identification | California defines hazardous waste per 22 CCR §66261.3. A waste is hazardous if it is RCRA-listed, RCRA-characteristic, OR meets California-only criteria. | Generator state = CA | None (system evaluates both federal AND California criteria) |
| **CA-002** | Identification | **California Toxicity Criteria (non-RCRA):** Soluble Threshold Limit Concentration (STLC) and Total Threshold Limit Concentration (TTLC) per 22 CCR §66261.24. These are LOWER than federal TCLP thresholds for many constituents. | Generator state = CA AND waste has metals/organics | "Has Waste Extraction Test (WET) / STLC testing been performed?" / "Provide STLC results for all applicable constituents" / "Provide TTLC results" |
| **CA-003** | Identification | **California Persistent and Bioaccumulative Toxic Substances:** 22 CCR §66261.24(a)(2)(A) — additional hazardous criteria. | Generator state = CA AND waste contains persistent organics | "Does the waste contain any persistent and bioaccumulative toxic substances per 22 CCR §66261.24(a)(2)(A)?" |
| **CA-004** | Identification | **Waste determination per 22 CCR §66262.11:** Generator must determine if material is excluded from regulation per 22 CCR §66261.4 and HSC §25143.2. | Generator state = CA | "Is this waste excluded from regulation under 22 CCR §66261.4 or HSC §25143.2?" / "Specify applicable exclusion" |
| **CA-005** | Identification | **Additional exclusions:** 22 CCR §66261.6, HSC §§25140–25145.4, HSC §25124. | Generator state = CA AND generator claims exclusion | "Which specific California exclusion or exemption applies? Provide regulatory citation." |
| **CA-006** | Identification | **Used Oil:** Per HSC §25250.1, used oil is presumed hazardous in California unless rebutted per specific testing. | Generator state = CA AND waste contains used oil | "Is this waste stream used oil per HSC §25250.1?" / "Has used oil been tested to rebut the hazardous presumption?" |
| **CA-007** | Identification | **Non-RCRA vs. RCRA classification:** California distinguishes between RCRA hazardous waste (subject to 40 CFR + HSC + 22 CCR) and non-RCRA hazardous waste (subject to HSC + 22 CCR only). | Generator state = CA AND waste is hazardous | System must auto-classify as "RCRA" or "non-RCRA" based on determination results. |
| **CA-008** | Identification | **California characteristic criteria:** In addition to federal ignitability, corrosivity, reactivity, and toxicity, California adds: acute aquatic toxicity, chronic toxicity (fish bioassay), and additional organic persistent criteria. | Generator state = CA | "Has acute aquatic toxicity testing been performed (fish bioassay)?" / "Has chronic toxicity testing been performed?" |
| **CA-009** | Identification | **Debris rule:** Codified in 40 CFR §261.3(f) and 22 CCR §66261.3(e). California-specific provisions for treatment standards. | Generator state = CA AND waste is debris | "Is this waste classified as debris per 22 CCR §66261.3(e)?" |
| **CA-010** | Manifest | California requires use of the Uniform Hazardous Waste Manifest AND registration with the DTSC manifest system. Non-RCRA hazardous waste ALSO requires a manifest in California. | Generator state = CA AND waste is CA-hazardous | "Is the facility registered with the DTSC manifest tracking system?" |
| **CA-011** | Manifest | **State waste codes:** California assigns state-specific hazardous waste codes (100-series, 200-series, 300-series, etc.) that must appear on the manifest alongside federal codes. | Generator state = CA | System must identify applicable California waste codes based on waste characteristics and composition. |
| **CA-012** | Manifest | California requires manifests for ALL hazardous waste (including non-RCRA), unlike federal rules that only require manifests for RCRA-hazardous. | Generator state = CA AND waste is non-RCRA CA-hazardous | None (system auto-triggers manifest requirement) |
| **CA-013** | Storage | DTSC requires a Hazardous Waste Facility Permit for storage > 90 days; specific California-only accumulation requirements. | Generator state = CA | "Does the facility hold a DTSC Hazardous Waste Facility Permit or operate under authorized accumulation time limits?" |
| **CA-014** | Reporting | California requires electronic hazardous waste tracking and annual reporting to DTSC via CalEPA systems. | Generator state = CA | "Is the facility enrolled in the DTSC electronic waste tracking system?" |
| **CA-015** | Transport | California-registered hazardous waste haulers required. DTSC hauler registration number must be on manifest. | Generator state = CA | "Provide the transporter's California DTSC Registered Hazardous Waste Hauler number" |
| **CA-016** | Identification | **Land Disposal Restrictions (LDR):** California may have additional LDR requirements for non-RCRA wastes. | Generator state = CA AND disposal is land-based | "Have California-specific LDR treatment standards been met for this waste?" |
| **CA-017** | Labeling | California requires labels to include: "Hazardous Waste", California waste code, generator information, and accumulation start date with specific formatting. | Generator state = CA | "Are containers labeled with California hazardous waste code and all DTSC-required information?" |
| **CA-018** | Identification | **Tiered Permitting:** California has tiered permitting for treatment (Permit by Rule, Conditional Authorization, Conditional Exemption). | Generator state = CA AND on-site treatment | "Will any on-site treatment be performed?" / "What tier of California permit applies?" |

### 6.6 Colorado (CO)

**Authority:** Colorado Department of Public Health and Environment (CDPHE), Hazardous Materials and Waste Management Division
**Regulations:** 6 CCR 1007-3 (Hazardous Waste Regulations); 6 CCR 1007-2 Part 2 (Siting); 6 CCR 1007-2 Part 3 (Inspection)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **CO-001** | Identification | Colorado adopts federal RCRA per 6 CCR 1007-3 with Colorado-specific provisions. | Generator state = CO | None |
| **CO-002** | Identification | Colorado may impose additional requirements for mining and oil/gas exploration wastes. | Generator state = CO AND waste from mining/oil-gas | "Is this waste from mining, oil exploration, or gas exploration activities?" |
| **CO-003** | Storage | 6 CCR 1007-3 specifies accumulation requirements with state inspection provisions. | Generator state = CO AND generator stores waste | "Does the accumulation area meet 6 CCR 1007-3 requirements including aisle space and containment?" |
| **CO-004** | Manifest | Standard federal manifest accepted. Colorado requires generator copy retention. | Generator state = CO | None |
| **CO-005** | Reporting | CDPHE requires hazardous waste activity reports from LQGs. | Generator state = CO AND status = LQG | "Has the CDPHE hazardous waste activity report been filed?" |
| **CO-006** | Siting | 6 CCR 1007-2 Part 2 governs siting of hazardous waste disposal facilities. Relevant for TSDFs. | Facility in CO receiving waste | "Has the disposal facility been approved per 6 CCR 1007-2 Part 2 siting requirements?" |
| **CO-007** | Transport | Colorado DOT may impose additional routing restrictions for hazardous waste transport. | Shipment route through CO | None (informational flag) |

### 6.7 Connecticut (CT)

**Authority:** Connecticut Department of Energy and Environmental Protection (CT DEEP)
**Regulations:** RCSA §22a-449(c)-100 through -119 (Hazardous Waste Management)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **CT-001** | Identification | Connecticut incorporates 40 CFR 262.11 via RCSA §22a-449(c)-102(a)(1). State-specific modifications apply. | Generator state = CT | None |
| **CT-002** | Identification | Connecticut may list additional state-specific hazardous wastes beyond federal listings. | Generator state = CT AND waste not federally listed | "Has a Connecticut-specific waste determination been performed per RCSA §22a-449(c)-101?" |
| **CT-003** | Manifest | CT DEEP requires manifest copies and may require prior notification for certain waste types. | Generator state = CT | "Has CT DEEP been notified of this waste shipment as required?" |
| **CT-004** | Storage | Connecticut imposes specific requirements for satellite accumulation and central accumulation areas. | Generator state = CT AND generator stores waste | "Are satellite accumulation areas limited to one container per waste stream at the point of generation?" |
| **CT-005** | Reporting | Annual reporting to CT DEEP required for LQGs. | Generator state = CT AND status = LQG | "Has the annual CT DEEP hazardous waste report been submitted?" |
| **CT-006** | Transport | Connecticut requires hazardous waste transporters to hold state permits. | Generator state = CT | "Does the transporter hold a valid Connecticut hazardous waste transporter permit?" |
| **CT-007** | Identification | CT DEEP hazardous waste determination guidance requires specific documentation format. | Generator state = CT | "Is the waste determination documented per CT DEEP format requirements?" |

### 6.8 Delaware (DE)

**Authority:** Delaware Department of Natural Resources and Environmental Control (DNREC)
**Regulations:** 7 DE Admin. Code 1302 (Regulations Governing Hazardous Waste)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **DE-001** | Identification | Delaware's hazardous waste identification follows 7 DE Admin. Code 1302. State-listed wastes based on characteristics or toxic constituents. | Generator state = DE | None |
| **DE-002** | Identification | DNREC requires formal waste determinations with documentation retained for 3 years minimum. | Generator state = DE | "Is the waste determination documented and retained per 7 DE Admin. Code 1302?" |
| **DE-003** | Identification | **Aerosol Can Management:** Delaware has specific provisions for aerosol can waste per DNREC guidance. | Generator state = DE AND waste includes aerosol cans | "Are aerosol cans being managed under the universal waste rule or as hazardous waste?" / "Are aerosol cans punctured and drained per DNREC guidance?" |
| **DE-004** | Identification | **Electronic Waste:** DNREC has specific e-waste management requirements. | Generator state = DE AND waste includes electronics | "Is electronic waste being managed per DNREC e-waste guidance?" |
| **DE-005** | Identification | **Used Oil:** Delaware follows DNREC used oil management fact sheet requirements. | Generator state = DE AND waste is used oil | "Is used oil being managed per DNREC used oil requirements including proper storage and labeling?" |
| **DE-006** | Identification | **Pharmaceutical Waste:** Delaware has DNREC-specific pharmaceutical waste management guidance. | Generator state = DE AND waste includes pharmaceuticals | "Are pharmaceutical wastes being managed per DNREC Pharmaceutical Waste Management Guide?" |
| **DE-007** | Identification | **Nicotine/E-Cigarette Waste:** DNREC has specific fact sheets for vape shops and nicotine waste. | Generator state = DE AND waste contains nicotine/e-cigarettes | "Is nicotine or e-cigarette waste being managed per DNREC guidance for vape shop/nicotine waste?" |
| **DE-008** | Storage | **Satellite Accumulation:** Delaware follows DNREC satellite accumulation requirements. | Generator state = DE AND uses satellite accumulation | "Are satellite accumulation areas compliant with DNREC requirements (≤55 gal hazardous or ≤1 quart acute)?" |
| **DE-009** | Identification | **Episodic Generation:** Delaware recognizes planned and unplanned episodic generation events per DNREC guidance. | Generator state = DE AND generator has episodic event | "Is this an episodic generation event?" / "Has DNREC been notified 30 days in advance (planned) or 72 hours after (unplanned)?" |
| **DE-010** | Identification | **Waste Lamps:** Delaware has mercury-containing lamp management requirements. | Generator state = DE AND waste includes lamps | "Are waste lamps being managed as universal waste or hazardous waste per DNREC requirements?" |
| **DE-011** | Identification | **Battery Recycling:** DNREC has specific battery management/recycling requirements. | Generator state = DE AND waste includes batteries | "Are batteries being managed per DNREC battery recycling guidance?" |
| **DE-012** | Manifest | Standard federal manifest accepted. DNREC copy requirements apply. | Generator state = DE | None |
| **DE-013** | Reporting | DNREC requires biennial reporting from LQGs. | Generator state = DE AND status = LQG | "Has the DNREC biennial report been submitted?" |
| **DE-014** | Identification | **Gas Station/Convenience Store waste:** DNREC has industry-specific guidance. | Generator state = DE AND facility type is gas station/convenience store | "Is the facility following DNREC Gas Station and Convenience Store Hazardous Waste Management guidance?" |
| **DE-015** | Identification | **Vehicle Mercury Switches:** Delaware participates in the mercury switch recovery program. | Generator state = DE AND waste includes vehicle mercury switches | "Are mercury switches being recovered per the DNREC Mercury Switch Recovery Program?" |

### 6.9 Florida (FL)

**Authority:** Florida Department of Environmental Protection (FDEP)
**Regulations:** Chapter 62-730, F.A.C. (Hazardous Waste); Chapter 62-737 (Used Oil)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **FL-001** | Identification | Florida adopts federal RCRA with modifications per Chapter 62-730, F.A.C. | Generator state = FL | None |
| **FL-002** | Identification | Florida may designate additional state-specific hazardous wastes. | Generator state = FL AND waste not federally listed | "Has a Florida-specific waste determination been performed per Chapter 62-730?" |
| **FL-003** | Storage | Florida-specific accumulation and containment requirements per 62-730. | Generator state = FL AND generator stores waste | "Does the facility meet Chapter 62-730 storage requirements?" |
| **FL-004** | Manifest | Florida requires use of the Uniform Hazardous Waste Manifest with FDEP notification. | Generator state = FL | "Has FDEP been notified per Chapter 62-730 manifest requirements?" |
| **FL-005** | Reporting | Annual reporting to FDEP for LQGs. SQGs have reduced requirements. | Generator state = FL AND status = LQG | "Has the annual FDEP hazardous waste report been submitted?" |
| **FL-006** | Transport | Florida requires hazardous waste transporters to be registered with FDEP. | Generator state = FL | "Is the transporter registered with FDEP?" |
| **FL-007** | Identification | Florida has specific provisions for used oil management per Chapter 62-737. | Generator state = FL AND waste is used oil | "Is used oil being managed per Chapter 62-737 requirements?" |
| **FL-008** | Identification | Florida-specific small quantity generator provisions may differ from federal. | Generator state = FL AND status = SQG | None (system checks FL-specific SQG rules) |

### 6.10 Georgia (GA)

**Authority:** Georgia Environmental Protection Division (EPD), Land Protection Branch
**Regulations:** Georgia Hazardous Waste Management Act; Georgia Rules Chapter 391-3-11

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **GA-001** | Identification | Georgia adopts federal RCRA per Chapter 391-3-11 with state modifications. | Generator state = GA | None |
| **GA-002** | Identification | Georgia EPD technical guidance documents provide additional classification requirements. | Generator state = GA | "Has the waste determination followed Georgia EPD technical guidance?" |
| **GA-003** | Manifest | Georgia requires manifest copies to EPD and accepts federal manifest form. | Generator state = GA | None |
| **GA-004** | Storage | Georgia follows federal accumulation rules with state enforcement and inspection requirements. | Generator state = GA | "Are accumulation areas compliant with Georgia Chapter 391-3-11 requirements?" |
| **GA-005** | Reporting | Biennial reporting to Georgia EPD for LQGs. | Generator state = GA AND status = LQG | "Has the Georgia EPD biennial report been submitted?" |
| **GA-006** | Transport | Georgia-registered hazardous waste transporters required. | Generator state = GA | "Is the transporter registered with Georgia EPD?" |

### 6.11 Hawaii (HI)

**Authority:** Hawaii Department of Health (DOH), Solid & Hazardous Waste Branch
**Regulations:** Hawaii Administrative Rules (HAR) Title 11, Chapter 261–268 (Hazardous Waste Rules — 2025 update)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **HI-001** | Identification | Hawaii adopts federal RCRA with state-specific modifications per HAR Title 11, Ch. 261. | Generator state = HI | None |
| **HI-002** | Transport | All hazardous waste leaving Hawaii requires ocean/air transport; DOH pre-notification required. | Generator state = HI AND destination ≠ HI | "Has Hawaii DOH been notified of off-island shipment?" / "Provide vessel/carrier and routing information" |
| **HI-003** | Manifest | Hawaii accepts federal manifest form with DOH copy requirements. | Generator state = HI | None |
| **HI-004** | Storage | Hawaii-specific storage requirements may account for volcanic/seismic hazards. | Generator state = HI AND waste is reactive/ignitable | "Is the storage facility located in a seismically appropriate zone per DOH requirements?" |
| **HI-005** | Reporting | Annual reporting to DOH required. | Generator state = HI AND status = LQG | "Has the annual Hawaii DOH hazardous waste report been filed?" |
| **HI-006** | Identification | Hawaii 2025 rule updates may include additional waste categories or modified thresholds. | Generator state = HI | System checks against current HAR Title 11, Ch. 261 listings. |

### 6.12 Idaho (ID)

**Authority:** Idaho Department of Environmental Quality (DEQ)
**Regulations:** IDAPA 58.01.05 (Rules and Standards for Hazardous Waste)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **ID-001** | Identification | Idaho adopts federal RCRA per IDAPA 58.01.05 with state-specific provisions. | Generator state = ID | None |
| **ID-002** | Identification | Idaho DEQ may have specific provisions for mining and agricultural waste common in the state. | Generator state = ID AND waste from mining/agriculture | "Is this waste from mining or agricultural operations?" / "Has Idaho DEQ been consulted on applicable exemptions?" |
| **ID-003** | Manifest | Standard federal manifest accepted with Idaho DEQ copy requirements. | Generator state = ID | None |
| **ID-004** | Storage | Idaho follows federal accumulation rules with state enforcement. | Generator state = ID | None |
| **ID-005** | Reporting | Biennial reporting to Idaho DEQ for LQGs. | Generator state = ID AND status = LQG | "Has the Idaho DEQ biennial report been submitted?" |

### 6.13 Illinois (IL)

**Authority:** Illinois Environmental Protection Agency (Illinois EPA)
**Regulations:** 35 IAC Part 721–726 (Hazardous Waste); Illinois Environmental Protection Act §3.220 et seq.

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **IL-001** | Identification | Illinois recognizes **"special waste"** as a broader category beyond federal RCRA hazardous waste. Special waste includes: industrial process waste, pollution control waste, and hazardous waste. | Generator state = IL | "Is this waste classified as 'special waste' under the Illinois Environmental Protection Act?" |
| **IL-002** | Identification | Illinois special waste determination requires generator to classify waste into one of three categories: hazardous, potentially hazardous, or non-hazardous special waste. | Generator state = IL AND waste is industrial/pollution control | "Has the waste been classified per Illinois special waste categories?" / "Provide special waste classification (hazardous/potentially hazardous/non-hazardous special)" |
| **IL-003** | Manifest | Illinois requires special waste hauling permits and manifests for ALL special waste (not just RCRA-hazardous). | Generator state = IL AND waste is special waste | "Does the hauler have an Illinois special waste hauling permit?" |
| **IL-004** | Identification | Illinois EPA may impose additional testing requirements for special waste classification. | Generator state = IL | "Has waste analysis been performed per Illinois EPA special waste requirements?" |
| **IL-005** | Reporting | Illinois requires annual reporting for LQGs and special waste generators. | Generator state = IL AND (status = LQG OR generates special waste) | "Has the Illinois EPA annual report been submitted?" |
| **IL-006** | Transport | Illinois requires special waste transportation permits in addition to federal requirements. | Generator state = IL AND waste is special | "Does the transporter hold a valid Illinois special waste hauling permit number?" |

### 6.14 Indiana (IN)

**Authority:** Indiana Department of Environmental Management (IDEM)
**Regulations:** 329 IAC 3.1 (Hazardous Waste Management); Indiana Code Title 13

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **IN-001** | Identification | Indiana adopts federal RCRA per 329 IAC 3.1 with Indiana-specific modifications. | Generator state = IN | None |
| **IN-002** | Identification | IDEM provides waste management guidance distinguishing hazardous, non-hazardous industrial, and special waste. | Generator state = IN | "Has the waste been categorized per IDEM waste management hierarchy?" |
| **IN-003** | Manifest | Indiana requires standard federal manifest with IDEM notification for certain waste types. | Generator state = IN | None |
| **IN-004** | Storage | Indiana follows federal accumulation rules with IDEM enforcement. | Generator state = IN | None |
| **IN-005** | Reporting | Biennial reporting to IDEM for LQGs. | Generator state = IN AND status = LQG | "Has the IDEM biennial report been submitted?" |
| **IN-006** | Identification | Indiana has specific restricted waste site provisions per IC 13-20. | Generator state = IN AND waste disposal planned | "Has the receiving facility been approved per IC 13-20 requirements?" |

### 6.15 Iowa (IA)

**Authority:** Iowa Department of Natural Resources (DNR), Land Quality Bureau
**Regulations:** Iowa Administrative Code 567, Chapters 131–137 (Hazardous Waste); Iowa Code Chapter 455B

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **IA-001** | Identification | Iowa adopts federal RCRA with state modifications. Iowa DNR administers the authorized program. | Generator state = IA | None |
| **IA-002** | Identification | **Special Waste Authorization:** Iowa requires special waste authorization for disposal of wastes that don't meet standard solid waste criteria but aren't RCRA-hazardous. | Generator state = IA AND waste is non-hazardous but non-standard | "Does this waste require Iowa Special Waste Authorization?" / "Has Special Waste Authorization been obtained from Iowa DNR?" |
| **IA-003** | Manifest | Iowa accepts standard federal manifest with Iowa DNR copy requirements. | Generator state = IA | None |
| **IA-004** | Storage | Iowa follows federal accumulation rules with DNR enforcement. | Generator state = IA | None |
| **IA-005** | Reporting | Biennial reporting to Iowa DNR for LQGs. | Generator state = IA AND status = LQG | "Has the Iowa DNR biennial report been submitted?" |
| **IA-006** | Identification | Iowa has specific requirements for agricultural chemical waste and pesticide containers. | Generator state = IA AND waste involves agricultural chemicals | "Is this waste from agricultural chemical operations?" / "Are pesticide containers being triple-rinsed per Iowa requirements?" |

### 6.16 Kansas (KS)

**Authority:** Kansas Department of Health and Environment (KDHE), Bureau of Waste Management
**Regulations:** K.A.R. 28-31 (Hazardous Waste Management)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **KS-001** | Identification | Kansas adopts federal RCRA per K.A.R. 28-31. KDHE administers the authorized program. | Generator state = KS | None |
| **KS-002** | Identification | KDHE hazardous waste ID and management guidance provides state-specific interpretation. | Generator state = KS | "Has waste identification followed KDHE guidance documents?" |
| **KS-003** | Manifest | Kansas accepts standard federal manifest. KDHE copy submission required. | Generator state = KS | None |
| **KS-004** | Storage | Kansas follows federal accumulation rules with KDHE enforcement. | Generator state = KS | "Are accumulation areas compliant with K.A.R. 28-31 requirements?" |
| **KS-005** | Reporting | Annual reporting to KDHE for LQGs. | Generator state = KS AND status = LQG | "Has the KDHE annual hazardous waste report been submitted?" |
| **KS-006** | Identification | Kansas may have specific provisions for oil and gas exploration waste. | Generator state = KS AND waste from oil/gas operations | "Is this waste from oil and gas exploration/production?" |

### 6.17 Kentucky (KY)

**Authority:** Kentucky Energy and Environment Cabinet, Department for Environmental Protection
**Regulations:** 401 KAR Chapter 39 (Hazardous Waste)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **KY-001** | Identification | Kentucky adopts federal RCRA per 401 KAR 39:060 with state-specific modifications. | Generator state = KY | None |
| **KY-002** | Identification | 401 KAR 39:060 contains Kentucky-specific waste identification requirements including additional testing protocols. | Generator state = KY | "Has waste determination been completed per 401 KAR 39:060?" |
| **KY-003** | Manifest | Kentucky requires standard federal manifest with state copy submissions to DEP. | Generator state = KY | None |
| **KY-004** | Storage | Kentucky follows 401 KAR 39 accumulation rules which may include state-specific inspection frequencies. | Generator state = KY AND generator stores waste | "Are accumulation areas inspected per 401 KAR 39 requirements?" |
| **KY-005** | Reporting | Biennial reporting to Kentucky DEP for LQGs. | Generator state = KY AND status = LQG | "Has the Kentucky DEP biennial report been submitted?" |
| **KY-006** | Transport | Kentucky requires hazardous waste transporter permits per 401 KAR 39. | Generator state = KY | "Does the transporter hold a valid Kentucky hazardous waste transporter permit?" |

### 6.18 Louisiana (LA)

**Authority:** Louisiana Department of Environmental Quality (LDEQ)
**Regulations:** LAC 33:V (Hazardous Waste and Hazardous Materials)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **LA-001** | Identification | Louisiana adopts federal RCRA per LAC 33:V with state modifications. Includes both hazardous and solid waste programs. | Generator state = LA | None |
| **LA-002** | Identification | LDEQ may have specific provisions for petrochemical industry waste common in Louisiana. | Generator state = LA AND waste from petrochemical operations | "Is this waste from petrochemical processing or refining operations?" |
| **LA-003** | Manifest | Louisiana requires manifest copies to LDEQ. Additional state notification may apply for certain waste types. | Generator state = LA | "Has LDEQ been notified of this shipment as required by LAC 33:V?" |
| **LA-004** | Storage | Louisiana follows federal accumulation rules with LDEQ enforcement and state-specific inspection requirements. | Generator state = LA | None |
| **LA-005** | Reporting | Annual reporting to LDEQ for LQGs. | Generator state = LA AND status = LQG | "Has the LDEQ annual hazardous waste report been submitted?" |
| **LA-006** | Identification | Louisiana has specific requirements for naturally occurring radioactive material (NORM) waste from oil/gas. | Generator state = LA AND waste may contain NORM | "Does this waste contain naturally occurring radioactive material (NORM)?" |

### 6.19 Maine (ME)

**Authority:** Maine Department of Environmental Protection (DEP), Bureau of Remediation and Waste Management
**Regulations:** 06-096 CMR Chapter 850–857 (Hazardous Waste Management Rules)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **ME-001** | Identification | Maine adopts federal RCRA with state modifications. Maine DEP administers the authorized program. | Generator state = ME | None |
| **ME-002** | Identification | Maine has specific universal waste provisions that may differ from federal. | Generator state = ME AND waste is universal waste type | "Is this waste being managed under Maine's universal waste rule?" |
| **ME-003** | Manifest | Maine requires manifest copies to DEP. | Generator state = ME | None |
| **ME-004** | Storage | Maine follows federal accumulation rules with DEP enforcement. | Generator state = ME | None |
| **ME-005** | Reporting | Biennial reporting to Maine DEP for LQGs. | Generator state = ME AND status = LQG | "Has the Maine DEP biennial report been submitted?" |
| **ME-006** | Identification | Maine may have specific provisions for certain industry sectors (e.g., paper/pulp mills, fishing industry). | Generator state = ME AND waste from paper/pulp/fishing | "Is this waste from paper/pulp manufacturing or fishing industry operations?" |

### 6.20 Maryland (MD)

**Authority:** Maryland Department of the Environment (MDE)
**Regulations:** COMAR 26.13 (Disposal of Controlled Hazardous Substances)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **MD-001** | Identification | Maryland uses the term **"controlled hazardous substance"** which includes RCRA hazardous waste plus additional state-designated materials per COMAR 26.13. | Generator state = MD | "Has the waste been evaluated as a 'controlled hazardous substance' per COMAR 26.13?" |
| **MD-002** | Identification | Maryland may designate additional wastes beyond federal RCRA as controlled hazardous substances. | Generator state = MD AND waste not federally listed | "Has MDE made a determination on this waste stream under COMAR 26.13?" |
| **MD-003** | Manifest | Maryland requires manifest copies to MDE and may require pre-notification for certain waste types. | Generator state = MD | None |
| **MD-004** | Storage | Maryland follows COMAR 26.13 accumulation rules which incorporate federal requirements with state additions. | Generator state = MD | "Does the facility meet COMAR 26.13 storage and accumulation requirements?" |
| **MD-005** | Reporting | Annual reporting to MDE for LQGs. | Generator state = MD AND status = LQG | "Has the MDE annual controlled hazardous substance report been submitted?" |
| **MD-006** | Transport | Maryland requires controlled hazardous substance hauler permits. | Generator state = MD | "Does the transporter hold a valid Maryland controlled hazardous substance hauler permit?" |

### 6.21 Massachusetts (MA)

**Authority:** Massachusetts Department of Environmental Protection (MassDEP)
**Regulations:** 310 CMR 30.000 (Hazardous Waste Regulations)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **MA-001** | Identification | Massachusetts has an **independent** hazardous waste program (310 CMR 30.000) that is MORE stringent than federal RCRA. Massachusetts lists additional wastes and has lower thresholds. | Generator state = MA | System evaluates against Massachusetts-specific listings and thresholds. |
| **MA-002** | Identification | Massachusetts defines **"very small quantity generator" (VSQG)** thresholds that may differ from federal. | Generator state = MA AND status = VSQG | "Confirm monthly generation is below Massachusetts VSQG thresholds per 310 CMR 30.353" |
| **MA-003** | Identification | Massachusetts has state-specific waste oil regulations that differ from federal. | Generator state = MA AND waste is oil/petroleum | "Is the waste classified as 'waste oil' under 310 CMR 30.000?" |
| **MA-004** | Manifest | Massachusetts requires state-specific manifest procedures and copies to MassDEP. | Generator state = MA | None |
| **MA-005** | Storage | Massachusetts accumulation rules per 310 CMR 30.340 may be more restrictive than federal. | Generator state = MA | "Does the facility meet 310 CMR 30.340 accumulation requirements?" |
| **MA-006** | Reporting | Annual reporting to MassDEP. Massachusetts may require more frequent reporting than federal biennial. | Generator state = MA AND status ∈ (SQG, LQG) | "Has the annual MassDEP hazardous waste report been submitted?" |
| **MA-007** | Transport | Massachusetts requires licensed hazardous waste transporters per 310 CMR 30.600. | Generator state = MA | "Does the transporter hold a valid Massachusetts hazardous waste transporter license?" |
| **MA-008** | Identification | MassDEP policies and guidance documents provide additional interpretation of waste classification. | Generator state = MA | "Has waste classification followed MassDEP published guidance and fact sheets?" |

### 6.22 Michigan (MI)

**Authority:** Michigan Department of Environment, Great Lakes, and Energy (EGLE)
**Regulations:** Part 111 of Act 451 (Hazardous Waste Management); Michigan Administrative Code R 299.9101–9902

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **MI-001** | Identification | Michigan adopts federal RCRA per Part 111 with state-specific modifications. Additional state waste listings may apply. | Generator state = MI | None |
| **MI-002** | Identification | Michigan has specific provisions for **liquid industrial waste** that may not meet RCRA criteria but require state permits. | Generator state = MI AND waste is non-hazardous liquid industrial | "Is this liquid industrial waste subject to Michigan Part 121 requirements?" |
| **MI-003** | Manifest | Michigan requires manifests and accepts the federal form with state copy requirements. | Generator state = MI | None |
| **MI-004** | Storage | Michigan follows federal accumulation rules with EGLE enforcement. | Generator state = MI | None |
| **MI-005** | Reporting | Biennial reporting to EGLE for LQGs. | Generator state = MI AND status = LQG | "Has the EGLE biennial hazardous waste report been submitted?" |
| **MI-006** | Transport | Michigan requires hazardous waste transporter permits per Part 111. | Generator state = MI | "Does the transporter hold a valid Michigan Part 111 transporter permit?" |

### 6.23 Minnesota (MN)

**Authority:** Minnesota Pollution Control Agency (MPCA)
**Regulations:** Minnesota Rules Chapter 7045 (Hazardous Waste)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **MN-001** | Identification | Minnesota adopts federal RCRA per MN Rules Ch. 7045 with state-specific additions. MPCA provides identification and management guidance. | Generator state = MN | None |
| **MN-002** | Identification | Minnesota may designate additional state-specific hazardous wastes. | Generator state = MN AND waste not federally listed | "Has MPCA been consulted on state-specific waste classification?" |
| **MN-003** | Manifest | Minnesota requires manifest copies to MPCA. | Generator state = MN | None |
| **MN-004** | Storage | Minnesota follows federal accumulation rules with MPCA enforcement and additional containment requirements for cold climate. | Generator state = MN | "Are cold-weather storage provisions in place per MPCA requirements?" |
| **MN-005** | Reporting | Annual reporting to MPCA for generators. | Generator state = MN AND status ∈ (SQG, LQG) | "Has the annual MPCA hazardous waste generator report been submitted?" |
| **MN-006** | Identification | MPCA has specific guidance for common Minnesota waste streams (agriculture, mining, manufacturing). | Generator state = MN AND waste from agriculture/mining/manufacturing | "Has MPCA industry-specific guidance been consulted?" |

### 6.24 Mississippi (MS)

**Authority:** Mississippi Department of Environmental Quality (MDEQ), Land Division
**Regulations:** Mississippi Hazardous Waste Management Regulations

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **MS-001** | Identification | Mississippi adopts federal RCRA. MDEQ Hazardous Waste Program administers the authorized program. | Generator state = MS | None |
| **MS-002** | Manifest | Mississippi requires manifest copies to MDEQ. | Generator state = MS | None |
| **MS-003** | Storage | Mississippi follows federal accumulation rules with MDEQ enforcement. | Generator state = MS | None |
| **MS-004** | Reporting | Biennial reporting to MDEQ for LQGs. | Generator state = MS AND status = LQG | "Has the MDEQ biennial report been submitted?" |
| **MS-005** | Identification | Mississippi may have specific provisions for oil/gas waste and agricultural waste. | Generator state = MS AND waste from oil/gas/agriculture | "Is this waste from oil/gas or agricultural operations?" |

### 6.25 Missouri (MO)

**Authority:** Missouri Department of Natural Resources (DNR), Hazardous Waste Program
**Regulations:** 10 CSR 25 (Hazardous Waste Management)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **MO-001** | Identification | Missouri adopts federal RCRA per 10 CSR 25 with state modifications. Missouri DNR provides compliance assistance. | Generator state = MO | None |
| **MO-002** | Identification | Missouri has specific provisions and compliance guidance for hazardous waste generators. | Generator state = MO | "Has the Missouri DNR hazardous waste compliance guidance been reviewed?" |
| **MO-003** | Manifest | Missouri requires manifest copies to DNR. | Generator state = MO | None |
| **MO-004** | Storage | Missouri follows federal accumulation rules with DNR enforcement. | Generator state = MO | None |
| **MO-005** | Reporting | Biennial reporting to Missouri DNR for LQGs. | Generator state = MO AND status = LQG | "Has the Missouri DNR biennial report been submitted?" |
| **MO-006** | Transport | Missouri requires hazardous waste transporter permits. | Generator state = MO | "Does the transporter hold a valid Missouri hazardous waste transporter permit?" |

### 6.26 Montana (MT)

**Authority:** Montana Department of Environmental Quality (DEQ)
**Regulations:** ARM 17.53 (Hazardous Waste)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **MT-001** | Identification | Montana adopts federal RCRA per ARM 17.53. Montana DEQ administers the hazardous waste program. | Generator state = MT | None |
| **MT-002** | Identification | Montana has specific provisions for mining waste and mineral processing waste. | Generator state = MT AND waste from mining/mineral processing | "Is this waste from mining or mineral processing?" / "Does the Bevill Amendment exemption apply?" |
| **MT-003** | Manifest | Standard federal manifest accepted. Montana DEQ copy requirements apply. | Generator state = MT | None |
| **MT-004** | Storage | Montana follows federal accumulation rules with DEQ enforcement. | Generator state = MT | None |
| **MT-005** | Reporting | Biennial reporting to Montana DEQ for LQGs. | Generator state = MT AND status = LQG | "Has the Montana DEQ biennial report been submitted?" |

### 6.27 Nebraska (NE)

**Authority:** Nebraska Department of Environment and Energy (NDEE)
**Regulations:** Title 128 (Hazardous Waste Management)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **NE-001** | Identification | Nebraska adopts federal RCRA per Title 128. NDEE administers the program. | Generator state = NE | None |
| **NE-002** | Identification | NDEE Publication 05-176 specifies waste determination and testing requirements including specific protocols for hazardous waste testing. | Generator state = NE | "Has waste testing been performed per NDEE Publication 05-176 requirements?" |
| **NE-003** | Identification | Nebraska requires specific analytical methods for waste determinations as outlined in NDEE guidance. | Generator state = NE AND waste determination requires testing | "Which analytical methods were used for waste determination?" / "Were methods consistent with NDEE 05-176 guidance?" |
| **NE-004** | Manifest | Standard federal manifest accepted. NDEE copy requirements apply. | Generator state = NE | None |
| **NE-005** | Reporting | Biennial reporting to NDEE for LQGs. | Generator state = NE AND status = LQG | "Has the NDEE biennial report been submitted?" |
| **NE-006** | Identification | Nebraska has provisions for agricultural chemical waste and pesticide containers. | Generator state = NE AND waste involves agricultural chemicals | "Is this waste from agricultural chemical operations?" |

### 6.28 Nevada (NV)

**Authority:** Nevada Division of Environmental Protection (NDEP), Bureau of Waste Management
**Regulations:** NAC 444.842–444.9452 (Hazardous Waste)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **NV-001** | Identification | Nevada adopts federal RCRA per NAC 444. NDEP administers the hazardous waste program. | Generator state = NV | None |
| **NV-002** | Identification | Nevada has specific provisions for mining and gaming industry waste. | Generator state = NV AND waste from mining/gaming operations | "Is this waste from mining or gaming facility operations?" |
| **NV-003** | Manifest | Standard federal manifest accepted. NDEP copy requirements apply. | Generator state = NV | None |
| **NV-004** | Storage | Nevada follows federal accumulation rules with NDEP enforcement. High-temperature storage considerations for desert climate. | Generator state = NV AND waste is reactive/volatile | "Are temperature-appropriate storage provisions in place?" |
| **NV-005** | Reporting | Biennial reporting to NDEP for LQGs. | Generator state = NV AND status = LQG | "Has the NDEP biennial report been submitted?" |

### 6.29 New Hampshire (NH)

**Authority:** New Hampshire Department of Environmental Services (DES)
**Regulations:** Env-Hw 100–1100 (Hazardous Waste Rules)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **NH-001** | Identification | New Hampshire adopts federal RCRA with state modifications per Env-Hw rules. | Generator state = NH | None |
| **NH-002** | Identification | New Hampshire DES may designate additional state-specific hazardous wastes. | Generator state = NH AND waste not federally listed | "Has a New Hampshire-specific waste determination been performed?" |
| **NH-003** | Manifest | New Hampshire requires manifest copies to DES. | Generator state = NH | None |
| **NH-004** | Storage | New Hampshire follows federal accumulation rules with DES enforcement. | Generator state = NH | None |
| **NH-005** | Reporting | Biennial reporting to DES for LQGs. | Generator state = NH AND status = LQG | "Has the NH DES biennial report been submitted?" |
| **NH-006** | Transport | New Hampshire requires hazardous waste transporter permits per Env-Hw rules. | Generator state = NH | "Does the transporter hold a valid NH DES hazardous waste transporter permit?" |

### 6.30 New Jersey (NJ)

**Authority:** New Jersey Department of Environmental Protection (NJDEP), Division of Solid and Hazardous Waste
**Regulations:** N.J.A.C. 7:26G (Hazardous Waste Management)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **NJ-001** | Identification | New Jersey has a **comprehensive waste classification system** per NJDEP Guidance Document HWM-009. Waste classification is required before disposal. | Generator state = NJ | "Has waste been classified per NJDEP Guidance Document HWM-009?" |
| **NJ-002** | Identification | NJDEP requires formal **waste classification** that may go beyond federal RCRA determination. Includes physical form, hazard class, and disposal category. | Generator state = NJ | "Provide NJDEP waste classification (physical form, hazard class, disposal category)" |
| **NJ-003** | Identification | New Jersey may designate additional state-specific hazardous wastes and has specific provisions for industrial waste classification. | Generator state = NJ AND waste is industrial | "Has the waste been evaluated under N.J.A.C. 7:26G specific industrial waste provisions?" |
| **NJ-004** | Manifest | New Jersey requires manifests with specific state requirements and NJDEP copy submission. Additional waste classification info required on manifest. | Generator state = NJ | "Is the NJDEP waste classification code included on the manifest?" |
| **NJ-005** | Storage | New Jersey has specific accumulation requirements per N.J.A.C. 7:26G that may exceed federal standards. | Generator state = NJ | "Does the facility meet N.J.A.C. 7:26G accumulation requirements?" |
| **NJ-006** | Reporting | Annual reporting to NJDEP. New Jersey may require more frequent reporting than federal. | Generator state = NJ AND status ∈ (SQG, LQG) | "Has the annual NJDEP hazardous waste report been submitted?" |
| **NJ-007** | Transport | New Jersey requires licensed hazardous waste transporters with state-specific registration. | Generator state = NJ | "Does the transporter hold a valid NJDEP hazardous waste transporter registration?" |

### 6.31 New Mexico (NM)

**Authority:** New Mexico Environment Department (NMED), Hazardous Waste Bureau
**Regulations:** 20.4.1 NMAC (Hazardous Waste Management)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **NM-001** | Identification | New Mexico adopts federal RCRA per 20.4.1 NMAC with state-specific authorization. | Generator state = NM | None |
| **NM-002** | Identification | NMED Hazardous Waste Bureau may have specific provisions for laboratory, military, and DOE facility waste. | Generator state = NM AND facility is laboratory/military/DOE | "Is this a laboratory, military, or DOE facility?" |
| **NM-003** | Manifest | Standard federal manifest accepted with NMED copy requirements. | Generator state = NM | None |
| **NM-004** | Storage | New Mexico follows federal accumulation rules with NMED enforcement. | Generator state = NM | None |
| **NM-005** | Reporting | Biennial reporting to NMED for LQGs. | Generator state = NM AND status = LQG | "Has the NMED biennial report been submitted?" |
| **NM-006** | Identification | New Mexico has specific provisions for uranium mining/milling waste and oil field waste. | Generator state = NM AND waste from mining/oil operations | "Is this waste from uranium mining/milling or oil field operations?" |

### 6.32 New York (NY)

**Authority:** New York State Department of Environmental Conservation (NYSDEC)
**Regulations:** 6 NYCRR Parts 370–376 (Hazardous Waste Management)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **NY-001** | Identification | New York adopts federal RCRA per 6 NYCRR Part 371 with state-specific modifications. Additional state-listed hazardous wastes may apply. | Generator state = NY | None |
| **NY-002** | Identification | NYSDEC hazardous waste guidance provides additional state-specific interpretation and may list additional wastes. | Generator state = NY AND waste not federally listed | "Has NYSDEC hazardous waste guidance been consulted for state-specific classification?" |
| **NY-003** | Manifest | New York requires manifest copies to NYSDEC. State may have additional manifest requirements. | Generator state = NY | None |
| **NY-004** | Storage | New York follows 6 NYCRR Part 373 accumulation rules which may include state-specific provisions. | Generator state = NY | "Does the facility meet 6 NYCRR Part 373 accumulation requirements?" |
| **NY-005** | Reporting | Annual reporting to NYSDEC for LQGs. | Generator state = NY AND status = LQG | "Has the annual NYSDEC hazardous waste report been submitted?" |
| **NY-006** | Transport | New York requires Part 364 hazardous waste transporter permits. | Generator state = NY | "Does the transporter hold a valid NYSDEC Part 364 transporter permit?" |
| **NY-007** | Identification | New York has specific provisions for PCB waste, pharmaceutical waste, and construction/demolition debris containing hazardous materials. | Generator state = NY AND waste contains PCBs OR pharmaceuticals | "Does this waste contain PCBs or pharmaceutical constituents requiring NY-specific management?" |

### 6.33 North Carolina (NC)

**Authority:** North Carolina Department of Environmental Quality (NC DEQ), Division of Waste Management, Hazardous Waste Section
**Regulations:** 15A NCAC 13A (Hazardous Waste Management Rules)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **NC-001** | Identification | North Carolina adopts federal RCRA per 15A NCAC 13A with state-specific modifications. | Generator state = NC | None |
| **NC-002** | Identification | NC DEQ Hazardous Waste Section provides rules, laws, and regulations that may include additional state requirements. | Generator state = NC | "Has waste determination followed NC DEQ Hazardous Waste Section guidance?" |
| **NC-003** | Manifest | North Carolina requires manifest copies to NC DEQ. | Generator state = NC | None |
| **NC-004** | Storage | North Carolina follows federal accumulation rules with NC DEQ enforcement. | Generator state = NC | None |
| **NC-005** | Reporting | Biennial reporting to NC DEQ for LQGs. | Generator state = NC AND status = LQG | "Has the NC DEQ biennial report been submitted?" |
| **NC-006** | Transport | North Carolina requires hazardous waste transporter registration. | Generator state = NC | "Is the transporter registered with NC DEQ?" |

### 6.34 North Dakota (ND)

**Authority:** North Dakota Department of Environmental Quality (DEQ), Waste Management Division
**Regulations:** NDAC 33.1-24 (Hazardous Waste Management)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **ND-001** | Identification | North Dakota adopts federal RCRA per NDAC 33.1-24. ND DEQ Waste Management administers the program. | Generator state = ND | None |
| **ND-002** | Identification | North Dakota has specific provisions for oil field waste and agricultural waste. | Generator state = ND AND waste from oil/agricultural operations | "Is this waste from oil field or agricultural operations?" |
| **ND-003** | Manifest | Standard federal manifest accepted with ND DEQ copy requirements. | Generator state = ND | None |
| **ND-004** | Storage | North Dakota follows federal accumulation rules with DEQ enforcement. Cold-weather provisions may apply. | Generator state = ND | None |
| **ND-005** | Reporting | Biennial reporting to ND DEQ for LQGs. | Generator state = ND AND status = LQG | "Has the ND DEQ biennial report been submitted?" |

### 6.35 Ohio (OH)

**Authority:** Ohio Environmental Protection Agency (Ohio EPA), Division of Environmental Response and Revitalization
**Regulations:** OAC 3745-50 through 3745-69 (Hazardous Waste)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **OH-001** | Identification | Ohio adopts federal RCRA per OAC 3745. Ohio EPA administers the authorized program. | Generator state = OH | None |
| **OH-002** | Identification | Ohio EPA may have specific provisions for industrial waste classification. | Generator state = OH AND waste is industrial | "Has the waste been evaluated under Ohio EPA hazardous waste provisions?" |
| **OH-003** | Manifest | Ohio requires manifest copies to Ohio EPA. | Generator state = OH | None |
| **OH-004** | Storage | Ohio follows OAC 3745 accumulation rules with Ohio EPA enforcement. | Generator state = OH | None |
| **OH-005** | Reporting | Biennial reporting to Ohio EPA for LQGs. | Generator state = OH AND status = LQG | "Has the Ohio EPA biennial report been submitted?" |
| **OH-006** | Transport | Ohio requires hazardous waste transporter registration with Ohio EPA. | Generator state = OH | "Is the transporter registered with Ohio EPA?" |

### 6.36 Oklahoma (OK)

**Authority:** Oklahoma Department of Environmental Quality (ODEQ), Land Protection Division
**Regulations:** OAC 252:205 (Hazardous Waste Management)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **OK-001** | Identification | Oklahoma adopts federal RCRA per OAC 252:205. ODEQ administers the program. | Generator state = OK | None |
| **OK-002** | Identification | Oklahoma has specific provisions for oil and gas exploration/production waste. | Generator state = OK AND waste from oil/gas operations | "Is this waste from oil/gas exploration or production?" / "Does the E&P waste exemption apply?" |
| **OK-003** | Manifest | Standard federal manifest accepted. ODEQ copy requirements apply. | Generator state = OK | None |
| **OK-004** | Storage | Oklahoma follows federal accumulation rules with ODEQ enforcement. | Generator state = OK | None |
| **OK-005** | Reporting | Biennial reporting to ODEQ for LQGs. | Generator state = OK AND status = LQG | "Has the ODEQ biennial report been submitted?" |

### 6.37 Oregon (OR)

**Authority:** Oregon Department of Environmental Quality (DEQ)
**Regulations:** OAR Chapter 340, Division 101 (Identification and Listing of Hazardous Waste); OAR 340-100 through 340-106

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **OR-001** | Identification | Oregon adopts federal RCRA per OAR 340, Division 101 with state-specific modifications. Oregon DEQ provides detailed determination guidance (HWDetermination.pdf, DetWasteHaz.pdf). | Generator state = OR | None |
| **OR-002** | Identification | Oregon DEQ hazardous waste determination process may include additional steps or criteria beyond federal per OAR 340-101. | Generator state = OR | "Has the waste determination followed Oregon DEQ guidance (DetWasteHaz process)?" |
| **OR-003** | Identification | Oregon may designate additional state-listed hazardous wastes per OAR 340-101. | Generator state = OR AND waste not federally listed | "Has Oregon DEQ been consulted on potential state-specific hazardous waste listing?" |
| **OR-004** | Manifest | Oregon requires manifest copies to DEQ. | Generator state = OR | None |
| **OR-005** | Storage | Oregon follows federal accumulation rules with DEQ enforcement per OAR 340-102. | Generator state = OR | None |
| **OR-006** | Reporting | Biennial reporting to Oregon DEQ for LQGs. | Generator state = OR AND status = LQG | "Has the Oregon DEQ biennial report been submitted?" |
| **OR-007** | Transport | Oregon requires hazardous waste transporter registration with DEQ. | Generator state = OR | "Is the transporter registered with Oregon DEQ?" |

### 6.38 Pennsylvania (PA)

**Authority:** Pennsylvania Department of Environmental Protection (PA DEP)
**Regulations:** 25 Pa. Code Chapters 260a–270a (Hazardous Waste Management)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **PA-001** | Identification | Pennsylvania adopts federal RCRA per 25 Pa. Code with state-specific modifications. PA DEP administers the program. | Generator state = PA | None |
| **PA-002** | Identification | PA DEP hazardous waste FAQ provides additional guidance on classification and determination requirements. | Generator state = PA | "Has the waste determination followed PA DEP hazardous waste guidance?" |
| **PA-003** | Identification | Pennsylvania has specific **residual waste** category for non-hazardous industrial waste that requires separate permitting. | Generator state = PA AND waste is non-hazardous industrial | "Is this waste classified as 'residual waste' under Pennsylvania regulations?" |
| **PA-004** | Manifest | Pennsylvania requires manifests with PA DEP copy submission. Residual waste also requires manifests/shipping documents. | Generator state = PA | None |
| **PA-005** | Storage | Pennsylvania follows 25 Pa. Code accumulation rules with DEP enforcement. | Generator state = PA | None |
| **PA-006** | Reporting | Biennial reporting to PA DEP for LQGs. | Generator state = PA AND status = LQG | "Has the PA DEP biennial report been submitted?" |
| **PA-007** | Transport | Pennsylvania requires hazardous waste transporter permits. | Generator state = PA | "Does the transporter hold a valid PA DEP hazardous waste transporter permit?" |

### 6.39 Rhode Island (RI)

**Authority:** Rhode Island Department of Environmental Management (RI DEM), Office of Waste Management
**Regulations:** Rules and Regulations for Hazardous Waste Management (250-RICR-140-10)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **RI-001** | Identification | Rhode Island adopts federal RCRA with state modifications per RI DEM hazardous waste regulations. | Generator state = RI | None |
| **RI-002** | Identification | RI DEM may have additional state-specific waste classifications. | Generator state = RI AND waste not federally listed | "Has RI DEM been consulted on state-specific waste classification?" |
| **RI-003** | Manifest | Rhode Island requires manifest copies to RI DEM. | Generator state = RI | None |
| **RI-004** | Storage | Rhode Island follows federal accumulation rules with RI DEM enforcement. | Generator state = RI | None |
| **RI-005** | Reporting | Biennial reporting to RI DEM for LQGs. | Generator state = RI AND status = LQG | "Has the RI DEM biennial report been submitted?" |
| **RI-006** | Transport | Rhode Island requires hazardous waste transporter licenses. | Generator state = RI | "Does the transporter hold a valid RI DEM hazardous waste transporter license?" |

### 6.40 South Carolina (SC)

**Authority:** South Carolina Department of Environmental Services (SC DES), Bureau of Land and Waste Management
**Regulations:** S.C. Code Regs. 61-79 (Hazardous Waste Management Regulations)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **SC-001** | Identification | South Carolina adopts federal RCRA per R.61-79. SC DES administers the authorized program. | Generator state = SC | None |
| **SC-002** | Identification | SC DES Laws and Regulations for hazardous waste provide state-specific implementation details. | Generator state = SC | "Has waste determination followed SC DES hazardous waste laws and regulations?" |
| **SC-003** | Manifest | South Carolina requires manifest copies to SC DES. | Generator state = SC | None |
| **SC-004** | Storage | South Carolina follows federal accumulation rules with SC DES enforcement. | Generator state = SC | None |
| **SC-005** | Reporting | Biennial reporting to SC DES for LQGs. | Generator state = SC AND status = LQG | "Has the SC DES biennial report been submitted?" |

### 6.41 South Dakota (SD)

**Authority:** South Dakota Department of Agriculture and Natural Resources (DANR), Waste Management Program
**Regulations:** ARSD 74:28 (Hazardous Waste Management)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **SD-001** | Identification | South Dakota adopts federal RCRA per ARSD 74:28. DANR Waste Management Program administers the program. | Generator state = SD | None |
| **SD-002** | Identification | South Dakota has specific provisions for agricultural waste. | Generator state = SD AND waste from agricultural operations | "Is this waste from agricultural operations?" |
| **SD-003** | Manifest | Standard federal manifest accepted. DANR copy requirements apply. | Generator state = SD | None |
| **SD-004** | Storage | South Dakota follows federal accumulation rules with DANR enforcement. | Generator state = SD | None |
| **SD-005** | Reporting | Biennial reporting to DANR for LQGs. | Generator state = SD AND status = LQG | "Has the DANR biennial report been submitted?" |

### 6.42 Tennessee (TN)

**Authority:** Tennessee Department of Environment and Conservation (TDEC)
**Regulations:** TCA 68-212 (Hazardous Waste Management Act); Tennessee Rules Chapter 0400-12-01

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **TN-001** | Identification | Tennessee adopts federal RCRA per TN Rules 0400-12-01. TDEC administers the hazardous waste program. | Generator state = TN | None |
| **TN-002** | Identification | Tennessee may have additional state-specific waste classifications. | Generator state = TN AND waste not federally listed | "Has TDEC been consulted on state-specific waste classification?" |
| **TN-003** | Manifest | Tennessee requires manifest copies to TDEC. | Generator state = TN | None |
| **TN-004** | Storage | Tennessee follows federal accumulation rules with TDEC enforcement. | Generator state = TN | None |
| **TN-005** | Reporting | Biennial reporting to TDEC for LQGs. | Generator state = TN AND status = LQG | "Has the TDEC biennial report been submitted?" |
| **TN-006** | Transport | Tennessee requires hazardous waste transporter registration with TDEC. | Generator state = TN | "Is the transporter registered with TDEC?" |

### 6.43 Texas (TX)

**Authority:** Texas Commission on Environmental Quality (TCEQ)
**Regulations:** 30 TAC Chapter 335 (Industrial Solid Waste and Municipal Hazardous Waste)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **TX-001** | Identification | Texas uses the **Waste Designation Decision Matrix** (TCEQ) for waste classification. This is a structured decision process that may result in different classifications than a standard federal determination. | Generator state = TX | "Has the waste been evaluated through the TCEQ Waste Designation Decision Matrix?" |
| **TX-002** | Identification | Texas defines **Class 1 Industrial Waste** (including hazardous) and **Class 2/3 Industrial Waste** (non-hazardous). State classification may impose requirements on non-RCRA waste. | Generator state = TX AND waste is industrial | "What is the TCEQ waste classification? (Class 1 / Class 2 / Class 3)" |
| **TX-003** | Identification | TCEQ may designate wastes as Class 1 (requiring hazardous-level management) even if not RCRA-listed or characteristic. | Generator state = TX AND waste not federally listed | "Has TCEQ made a Class 1 determination for this waste stream?" |
| **TX-004** | Manifest | Texas requires manifests per 30 TAC 335 and may have state-specific manifest requirements for Class 1 waste. | Generator state = TX AND waste is Class 1 | "Are all TCEQ manifest requirements per 30 TAC 335 being met?" |
| **TX-005** | Storage | Texas follows 30 TAC 335 accumulation rules with TCEQ enforcement. | Generator state = TX | None |
| **TX-006** | Reporting | Annual waste summary reporting to TCEQ for generators. | Generator state = TX AND status ∈ (SQG, LQG) | "Has the TCEQ annual waste summary been submitted?" |
| **TX-007** | Transport | Texas requires hazardous/industrial waste transporters to be registered with TCEQ. | Generator state = TX | "Is the transporter registered with TCEQ?" |
| **TX-008** | Identification | Texas has specific provisions for oil and gas waste, including exemptions and special management standards. | Generator state = TX AND waste from oil/gas operations | "Is this waste from oil and gas operations?" / "Does the TCEQ oil and gas waste exemption apply?" |

### 6.44 Utah (UT)

**Authority:** Utah Department of Environmental Quality (DEQ), Division of Waste Management and Radiation Control
**Regulations:** UAC R315 (Hazardous Waste)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **UT-001** | Identification | Utah adopts federal RCRA per UAC R315. Utah DEQ administers the hazardous waste program. | Generator state = UT | None |
| **UT-002** | Identification | Utah DEQ may have specific provisions for mining and military facility waste. | Generator state = UT AND waste from mining/military | "Is this waste from mining or military facility operations?" |
| **UT-003** | Manifest | Standard federal manifest accepted. Utah DEQ copy requirements apply. | Generator state = UT | None |
| **UT-004** | Storage | Utah follows federal accumulation rules with DEQ enforcement. | Generator state = UT | None |
| **UT-005** | Reporting | Biennial reporting to Utah DEQ for LQGs. | Generator state = UT AND status = LQG | "Has the Utah DEQ biennial report been submitted?" |
| **UT-006** | Identification | Utah has specific requirements for mixed waste (radioactive + hazardous). | Generator state = UT AND waste is mixed (radioactive + hazardous) | "Does this waste contain both radioactive and hazardous constituents (mixed waste)?" |

### 6.45 Vermont (VT)

**Authority:** Vermont Department of Environmental Conservation (DEC), Waste Management and Prevention Division
**Regulations:** Vermont Hazardous Waste Management Regulations (VHWMR)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **VT-001** | Identification | Vermont adopts federal RCRA with state modifications per VHWMR. Vermont DEC administers the program. | Generator state = VT | None |
| **VT-002** | Identification | Vermont may have additional state-specific hazardous waste requirements. | Generator state = VT AND waste not federally listed | "Has Vermont DEC been consulted on state-specific waste classification?" |
| **VT-003** | Manifest | Vermont requires manifest copies to DEC. | Generator state = VT | None |
| **VT-004** | Storage | Vermont follows federal accumulation rules with DEC enforcement. | Generator state = VT | None |
| **VT-005** | Reporting | Biennial reporting to Vermont DEC for LQGs. | Generator state = VT AND status = LQG | "Has the Vermont DEC biennial report been submitted?" |
| **VT-006** | Transport | Vermont requires hazardous waste transporter permits. | Generator state = VT | "Does the transporter hold a valid Vermont DEC hazardous waste transporter permit?" |

### 6.46 Virginia (VA)

**Authority:** Virginia Department of Environmental Quality (VA DEQ)
**Regulations:** 9VAC20-60 (Hazardous Waste Management Regulations)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **VA-001** | Identification | Virginia adopts federal RCRA per 9VAC20-60. VA DEQ administers the authorized program. | Generator state = VA | None |
| **VA-002** | Identification | VA DEQ may have specific provisions for military and government facility waste. | Generator state = VA AND facility is military/government | "Is this a military or government facility?" |
| **VA-003** | Manifest | Virginia requires manifest copies to VA DEQ. | Generator state = VA | None |
| **VA-004** | Storage | Virginia follows 9VAC20-60 accumulation rules with DEQ enforcement. | Generator state = VA | None |
| **VA-005** | Reporting | Biennial reporting to VA DEQ for LQGs. | Generator state = VA AND status = LQG | "Has the VA DEQ biennial report been submitted?" |
| **VA-006** | Transport | Virginia requires hazardous waste transporter permits per 9VAC20-60. | Generator state = VA | "Does the transporter hold a valid Virginia hazardous waste transporter permit?" |

### 6.47 Washington (WA)

**Authority:** Washington State Department of Ecology
**Regulations:** Chapter 173-303 WAC (Dangerous Waste Regulations)

Washington state has **significantly different** terminology and requirements from federal RCRA. Washington uses the term **"dangerous waste"** rather than "hazardous waste" and has its own designation process.

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **WA-001** | Identification | Washington uses a **state-specific designation process** per WAC 173-303-070 through 173-303-104. Wastes may be designated "dangerous" or "extremely hazardous" even if not RCRA-listed. | Generator state = WA | System must run Washington designation process in addition to federal determination. |
| **WA-002** | Identification | **Washington designation criteria** include: (1) Listed dangerous wastes (federal + state), (2) Dangerous waste characteristics (federal + state criteria with different thresholds), (3) Dangerous waste sources, (4) Dangerous waste mixtures. | Generator state = WA | "Has the waste been designated per WAC 173-303 designation process?" |
| **WA-003** | Identification | **Washington toxicity criteria:** Washington may use Toxicity Characteristic Leaching Procedure (TCLP) AND Washington State Leaching Procedure with potentially lower thresholds. | Generator state = WA AND waste has metals/organics | "Has Washington-specific toxicity designation been performed?" |
| **WA-004** | Identification | **Dangerous waste categories:** Washington assigns wastes to categories: DW (Dangerous Waste), EHW (Extremely Hazardous Waste). Category determines management requirements. | Generator state = WA AND waste is designated | System determines DW vs EHW classification based on quantity and persistence. |
| **WA-005** | Manifest | Washington requires dangerous waste manifests per WAC 173-303-180. Standard federal manifest form accepted but state notification through WA Ecology tracking system required. | Generator state = WA | "Is the facility registered with the WA Ecology dangerous waste tracking system?" |
| **WA-006** | Identification | **EPA/State ID Number:** Required for all dangerous waste activities. Must be obtained through WA Ecology notification process per WAC 173-303-060. | Generator state = WA | "Provide the WA Ecology EPA/State ID Number" |
| **WA-007** | Identification | **Episodic Generation:** Washington requires notification for episodic waste generation events (planned or unplanned) per WAC 173-303-171. | Generator state = WA AND generator has episodic event | "Is this an episodic generation event?" / "Has WA Ecology been notified per WAC 173-303-171?" |
| **WA-008** | Identification | **Healthcare Facility Pharmaceutical Waste:** Washington has special requirements for healthcare facilities managing pharmaceutical waste per WAC 173-303-555. | Generator state = WA AND facility is healthcare AND waste includes pharmaceuticals | "Is this a healthcare facility managing pharmaceutical waste?" / "Are requirements of WAC 173-303-555 being met?" |
| **WA-009** | Reporting | **Dangerous Waste Report:** All sites with an active EPA/State ID Number must submit an annual Dangerous Waste Report to WA Ecology. | Generator state = WA | "Has the annual Dangerous Waste Report been submitted to WA Ecology?" |
| **WA-010** | Storage | Washington accumulation requirements per WAC 173-303-171 through 173-303-174. May differ from federal for EHW. | Generator state = WA | "Does the facility meet WAC 173-303 accumulation requirements for the designated waste category?" |
| **WA-011** | Identification | **Large Quantity Consolidation:** Washington allows large quantity generators to consolidate VSQGs' dangerous waste under specific conditions with notification. | Generator state = WA AND uses LQG consolidation | "Has WA Ecology been notified of large quantity consolidation per WAC 173-303?" |
| **WA-012** | Identification | **Hazardous Secondary Materials:** Washington has specific requirements for hazardous secondary materials being reclaimed. | Generator state = WA AND material is being reclaimed | "Is this hazardous secondary material being legitimately reclaimed?" |
| **WA-013** | Transport | Washington requires dangerous waste transporters to comply with WAC 173-303 transportation requirements which may exceed federal DOT. | Generator state = WA | "Does the transporter comply with WAC 173-303 dangerous waste transportation requirements?" |

### 6.48 West Virginia (WV)

**Authority:** West Virginia Department of Environmental Protection (DEP), Division of Water and Waste Management
**Regulations:** 33 CSR 20 (Hazardous Waste Management); WV Code Chapter 22, Article 18

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **WV-001** | Identification | West Virginia adopts federal RCRA per 33 CSR 20. WV DEP administers the program. | Generator state = WV | None |
| **WV-002** | Identification | West Virginia may have specific provisions for coal mining and chemical manufacturing waste. | Generator state = WV AND waste from mining/chemical manufacturing | "Is this waste from coal mining or chemical manufacturing operations?" |
| **WV-003** | Manifest | Standard federal manifest accepted. WV DEP copy requirements apply. | Generator state = WV | None |
| **WV-004** | Storage | West Virginia follows federal accumulation rules with DEP enforcement. | Generator state = WV | None |
| **WV-005** | Reporting | Biennial reporting to WV DEP for LQGs. | Generator state = WV AND status = LQG | "Has the WV DEP biennial report been submitted?" |

### 6.49 Wisconsin (WI)

**Authority:** Wisconsin Department of Natural Resources (DNR)
**Regulations:** NR 600–685 (Hazardous Waste Management)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **WI-001** | Identification | Wisconsin adopts federal RCRA per NR 600 series with state-specific modifications. Wisconsin DNR administers the program. | Generator state = WI | None |
| **WI-002** | Identification | Wisconsin has specific management requirements beyond federal for certain waste streams. | Generator state = WI AND waste requires special management | "Has Wisconsin DNR NR 600 series been consulted for waste-specific management requirements?" |
| **WI-003** | Manifest | Wisconsin requires manifests per NR 600 with DNR copy requirements. | Generator state = WI | None |
| **WI-004** | Storage | Wisconsin follows NR 600 accumulation rules with DNR enforcement. | Generator state = WI | None |
| **WI-005** | Reporting | Annual reporting to Wisconsin DNR for LQGs. Wisconsin may require more frequent reporting than federal. | Generator state = WI AND status = LQG | "Has the Wisconsin DNR annual hazardous waste report been submitted?" |
| **WI-006** | Transport | Wisconsin requires hazardous waste transporter licenses per NR 600. | Generator state = WI | "Does the transporter hold a valid Wisconsin DNR hazardous waste transporter license?" |

### 6.50 Wyoming (WY)

**Authority:** Wyoming Department of Environmental Quality (DEQ), Solid and Hazardous Waste Division
**Regulations:** Wyoming Hazardous Waste Rules (Chapter 1–16)

| Rule ID | Rule Category | Description | Trigger Condition | Follow-up Questions |
|---------|--------------|-------------|-------------------|-------------------|
| **WY-001** | Identification | Wyoming adopts federal RCRA. Wyoming DEQ Solid and Hazardous Waste Division administers the program. | Generator state = WY | None |
| **WY-002** | Identification | Wyoming has specific provisions for oil, gas, and mining waste common in the state. | Generator state = WY AND waste from oil/gas/mining | "Is this waste from oil, gas, or mining operations?" / "Does the E&P waste or Bevill Amendment exemption apply?" |
| **WY-003** | Manifest | Standard federal manifest accepted. Wyoming DEQ copy requirements apply. | Generator state = WY | None |
| **WY-004** | Storage | Wyoming follows federal accumulation rules with DEQ enforcement. | Generator state = WY | None |
| **WY-005** | Reporting | Biennial reporting to Wyoming DEQ for LQGs. | Generator state = WY AND status = LQG | "Has the Wyoming DEQ biennial report been submitted?" |

---

## 7. Cross-Cutting Rules (All States)

These rules apply regardless of the generator's state and integrate with manifest guidelines and 49 CFR.

### 7.1 Interstate Shipment Rules

| Rule ID | Requirement |
|---------|-------------|
| **SR-INTER-1** | When waste is shipped across state lines, the system must validate compliance with BOTH the origin state rules AND the destination state rules. |
| **SR-INTER-2** | Some states require **pre-notification** for incoming hazardous waste shipments. The system must identify and flag these requirements based on the destination state. |
| **SR-INTER-3** | Manifest must include all waste codes required by both origin and destination states. |
| **SR-INTER-4** | The transporter must hold valid permits/registrations in all states through which the shipment will travel. |
| **SR-INTER-5** | DOT requirements (49 CFR) apply uniformly regardless of state; state rules cannot reduce federal DOT requirements but may add to them. |

### 7.2 Manifest Requirements (All States)

| Rule ID | Requirement |
|---------|-------------|
| **SR-MANALL-1** | Every state requires that the Uniform Hazardous Waste Manifest (EPA Form 8700-22) be used for hazardous waste shipments per 40 CFR 262.20. |
| **SR-MANALL-2** | State copy distribution requirements vary. The system must track which state agencies require manifest copies and deadlines. |
| **SR-MANALL-3** | E-Manifest (electronic manifest) is accepted in all states per 40 CFR 262.24 but some states may have additional electronic reporting requirements. |
| **SR-MANALL-4** | The generator must retain manifest copies for 3 years minimum (40 CFR 262.40); some states require longer retention. |
| **SR-MANALL-5** | Exception reports must be filed if the generator does not receive a signed manifest copy from the TSDF within 35 days (SQG: 60 days) per 40 CFR 262.42. State-specific exception report deadlines apply where stricter. |
| **SR-MANALL-6** | Item 9 (DOT description) must comply with 49 CFR 172.101 including the "Waste" prefix rule per 49 CFR 172.101(c)(9) for SQG/LQG generators. |
| **SR-MANALL-7** | Item 13 (waste codes) must include ALL applicable codes — both federal (D, F, K, P, U series) and state-specific codes. |
| **SR-MANALL-8** | Continuation sheets (EPA Form 8700-22A) must be used when waste line items exceed 4 per the main form. |

### 7.3 49 CFR Compliance Rules (All States)

| Rule ID | Requirement |
|---------|-------------|
| **SR-DOT-ALL-1** | All hazardous waste shipments must comply with 49 CFR 172.101 Hazardous Materials Table. The system must validate UN/NA numbers, proper shipping names, hazard classes, and packing groups. |
| **SR-DOT-ALL-2** | The "Waste" prefix must be applied to proper shipping names per 49 CFR 172.101(c)(9) when the generator is SQG or LQG. |
| **SR-DOT-ALL-3** | Shipping papers (manifests) must contain all information required by 49 CFR 172.200–172.205. |
| **SR-DOT-ALL-4** | Marking requirements per 49 CFR 172.300–172.338 must be met. The system should validate that the user has confirmed proper marking. |
| **SR-DOT-ALL-5** | Labeling requirements per 49 CFR 172.400–172.450 must be met. The system should validate hazard class labels are identified. |
| **SR-DOT-ALL-6** | Placarding requirements per 49 CFR 172.500–172.560 must be identified based on the quantity and hazard class of the shipment. |
| **SR-DOT-ALL-7** | 49 CFR 173.12 exceptions for waste material shipments apply. The system must identify when these exceptions are applicable. |
| **SR-DOT-ALL-8** | 49 CFR 173.13 exceptions for laboratory waste chemicals apply when criteria are met. The system must validate eligibility. |
| **SR-DOT-ALL-9** | Emergency response information must be provided per 49 CFR 172.600–172.606 (included as part of the manifest per Item 3 and Item 14). |
| **SR-DOT-ALL-10** | For bulk shipments, 49 CFR 173 Subpart F packaging requirements apply. The system must validate container specifications. |

---

## 8. Validation Flow — Technical Specification

### 8.1 Trigger Point

The state rules validation is triggered when the user clicks **"Submit"** on the profile creation page (`NewDetermination.jsx`). The current flow:

```
User clicks Submit → Save profile → Set review_status = 'pending_review' → Navigate to /review
```

Must become:

```
User clicks Submit → Save profile → Run State Rules Engine → 
  IF all rules PASS → Set review_status = 'pending_review' → Navigate to /review
  IF any rule = NEEDS_INFO → Present follow-up questions → User answers → Re-run validation → ...
  IF any rule = FAIL → Display error (must correct profile data)
```

### 8.2 Input Data for Rules Engine

The engine receives:
- `Mixture` record (name, transaction_id, components, shipment info, EPA generator status)
- `MixtureComponent[]` records (chemical, percentage, concentration)
- `Customer` record (EPA generator status, billing info)
- `CustomerLocation` record (**state** — this determines which state rules apply)
- `WasteDetermination` results (waste codes, characteristics, is_hazardous)
- Any previously answered state-specific questions

### 8.3 Output from Rules Engine

```json
{
  "state_code": "CA",
  "overall_result": "needs_info",
  "rules_evaluated": [
    {"rule_id": "CA-001", "result": "pass", "details": "Federal + CA determination completed"},
    {"rule_id": "CA-002", "result": "needs_info", "questions": [
      {"id": "q1", "text": "Has Waste Extraction Test (WET) / STLC testing been performed?", "type": "yes_no"},
      {"id": "q2", "text": "Provide STLC results for all applicable constituents", "type": "file_upload"}
    ]},
    {"rule_id": "CA-010", "result": "needs_info", "questions": [
      {"id": "q3", "text": "Is the facility registered with the DTSC manifest tracking system?", "type": "yes_no"}
    ]}
  ],
  "state_waste_codes": ["CA-141", "CA-221"],
  "manifest_requirements": {
    "state_copies_required": 2,
    "pre_notification_required": false,
    "state_tracking_system": "DTSC Manifest System",
    "additional_manifest_fields": ["CA waste code", "DTSC hauler registration"]
  },
  "dot_additional_requirements": []
}
```

### 8.4 User Experience for Follow-up Questions

| Req ID | Requirement |
|--------|-------------|
| **SR-UX-1** | Follow-up questions appear as a modal or new section on the same page — the user does NOT navigate away. |
| **SR-UX-2** | Questions are grouped by category (identification, storage, manifest, transport). |
| **SR-UX-3** | Question types supported: yes/no, text input, file upload, single-select, multi-select. |
| **SR-UX-4** | Required questions must be answered before the profile can proceed. |
| **SR-UX-5** | The user is NOT shown which specific state rule triggered the question — the rules engine is invisible. |
| **SR-UX-6** | If no additional information is needed, the user experiences no delay — the profile proceeds directly to review. |
| **SR-UX-7** | Answers to state-specific questions are stored in the `StateValidationResult.additional_data_collected` field and available to the reviewer. |

---

## 9. Regulatory References

### 9.1 Federal References
- 40 CFR Part 260 — Hazardous Waste Management System: General
- 40 CFR Part 261 — Identification and Listing of Hazardous Waste
- 40 CFR Part 262 — Standards Applicable to Generators of Hazardous Waste
- 40 CFR Part 263 — Standards Applicable to Transporters of Hazardous Waste
- 40 CFR Part 264/265 — Standards for Owners and Operators of TSDFs
- 49 CFR Part 171 — General Information, Regulations, and Definitions
- 49 CFR Part 172 — Hazardous Materials Table, Special Provisions, Hazardous Materials Communications
- 49 CFR Part 173 — Shippers — General Requirements for Shipments and Packagings
- 49 CFR Part 177 — Carriage by Public Highway
- 49 CFR Part 178 — Specifications for Packagings
- 49 CFR Part 180 — Continuing Qualification and Maintenance of Packagings

### 9.2 State/Territory References

| State/Territory | Primary Regulation | Website Reference |
|----------------|-------------------|-------------------|
| Puerto Rico | DNER Hazardous Waste | https://www.hazardouswastedisposal.com/hazardous-waste-blog/puerto-rico-dner-hazardous-waste-guide-complete-compliance-resource-for-puerto-rico-generators |
| Guam | 22 GAR Division IV | https://epa.guam.gov/hwmp/ |
| U.S. Virgin Islands | DPNR Solid Waste | https://dpnr.vi.gov/environmental-protection/solid-waste-management-program/ |
| American Samoa | AS-EPA Regulations | https://www.asepa.gov/services-2 |
| Northern Mariana Islands | EPA Region 9 CNMI | https://19january2017snapshot.epa.gov/www3/region9/waste/hazwaste/hazwaste-manifest-cnmi.html |
| Alabama | ADEM Ch. 335-14-3 | https://adem.alabama.gov/waste/guidance-and-reports |
| Alaska | EPA default / 18 AAC 62 | https://dec.alaska.gov/eh/hazardous-waste/ |
| Arizona | A.A.C. Title 18, Ch. 8 | https://azdeq.gov/hazwaste |
| Arkansas | Reg. No. 23 | https://www.adeq.state.ar.us/hazwaste/ |
| California | 22 CCR Div. 4.5; HSC Div. 20, Ch. 6.5 | https://dtsc.ca.gov/defining-hazardous-waste/ |
| Colorado | 6 CCR 1007-3 | https://cdphe.colorado.gov/hm/hazwasteregs |
| Connecticut | RCSA §22a-449(c) | https://portal.ct.gov/deep/waste-management-and-disposal/hazardous-waste/hazardous-waste-determinations |
| Delaware | 7 DE Admin. Code 1302 | https://dnrec.delaware.gov/waste-hazardous/management/hazardous/ |
| Florida | Ch. 62-730, F.A.C. | https://floridadep.gov/waste/permitting-compliance-assistance/content/summary-hazardous-waste-regulations |
| Georgia | Ch. 391-3-11 | https://epd.georgia.gov/about-us/land-protection-branch/land-protection-branch-technical-guidance/hazardous-waste-technical |
| Hawaii | HAR Title 11, Ch. 261 | https://health.hawaii.gov/shwb/hazwaste/hwrules/ |
| Idaho | IDAPA 58.01.05 | https://www.deq.idaho.gov/waste-management-and-remediation/hazardous-waste-in-idaho/ |
| Illinois | 35 IAC Part 721–726 | https://epa.illinois.gov/topics/waste-management/waste-disposal/special-waste/do-i-have.html |
| Indiana | 329 IAC 3.1 | https://www.in.gov/idem/waste/about-waste-and-how-we-manage-it/ |
| Iowa | IAC 567, Ch. 131–137 | https://www.iowadnr.gov/environmental-protection/land-quality/waste-planning-programs/solid-waste/special-waste-authorization |
| Kansas | K.A.R. 28-31 | https://www.kdhe.ks.gov/1889/Hazardous-Waste-ID-Management |
| Kentucky | 401 KAR Ch. 39 | https://apps.legislature.ky.gov/law/kar/titles/401/039/060/ |
| Louisiana | LAC 33:V | https://www.deq.louisiana.gov/page/solid-waste |
| Maine | 06-096 CMR Ch. 850–857 | https://www.maine.gov/dep/waste/hazardouswaste/index.html |
| Maryland | COMAR 26.13 | https://mde.maryland.gov/programs/land/WasteManagement/Pages/HazardousWaste.aspx |
| Massachusetts | 310 CMR 30.000 | https://www.mass.gov/lists/massdep-hazardous-waste-policies-guidance-fact-sheets |
| Michigan | Part 111, Act 451 | https://www.michigan.gov/egle/about/organization/materials-management/waste |
| Minnesota | MN Rules Ch. 7045 | https://www.pca.state.mn.us/business-with-us/hazardous-waste-identification-and-management |
| Mississippi | MDEQ HW Regulations | https://www.mdeq.ms.gov/land/waste-division/hazardouswaste/ |
| Missouri | 10 CSR 25 | https://dnr.mo.gov/waste-recycling/business-industry/guidance-technical-assistance/hazardous-waste-compliance-assistance |
| Montana | ARM 17.53 | https://deq.mt.gov/twr/Programs/hazmat |
| Nebraska | Title 128 | https://dwee.nebraska.gov/sites/default/files/publications/05-176%20Waste%20Determinations%20and%20Hazardous%20Waste%20Testing.pdf |
| Nevada | NAC 444.842–444.9452 | https://ndep.nv.gov/land/waste/hazardous-waste-management |
| New Hampshire | Env-Hw 100–1100 | https://www.des.nh.gov/waste/hazardous-waste |
| New Jersey | N.J.A.C. 7:26G | https://www.nj.gov/dep/dshw/resource/hwm009.htm |
| New Mexico | 20.4.1 NMAC | https://www.env.nm.gov/hazardous-waste/hazardous-waste-regulation-and-authorization/ |
| New York | 6 NYCRR Parts 370–376 | https://dec.ny.gov/environmental-protection/waste-management/hazardous-waste-guidance |
| North Carolina | 15A NCAC 13A | https://www.deq.nc.gov/about/divisions/waste-management/hazardous-waste-section/hazardous-waste-rules-laws-and-regulations |
| North Dakota | NDAC 33.1-24 | https://deq.nd.gov/WM/HazardousWasteProgram/ |
| Ohio | OAC 3745-50 to 3745-69 | https://epa.ohio.gov/divisions-and-offices/environmental-response-revitalization/derr-programs/hazardous-waste |
| Oklahoma | OAC 252:205 | https://oklahoma.gov/deq/divisions/land-protection/waste-management/hazardous-waste.html |
| Oregon | OAR 340, Div. 101 | https://www.oregon.gov/deq/FilterDocs/HWDetermination.pdf |
| Pennsylvania | 25 Pa. Code Ch. 260a–270a | https://www.pa.gov/agencies/dep/programs-and-services/waste-programs/solid-waste-programs/hazardous-waste-program/hazardous-waste-faq |
| Rhode Island | 250-RICR-140-10 | https://dem.ri.gov/sites/g/files/xkgbur861/files/pubs/regs/regs/waste/hwregs14.pdf |
| South Carolina | R.61-79 | https://des.sc.gov/programs/bureau-land-waste-management/hazardous-waste/laws-and-regulations-hazardous-waste |
| South Dakota | ARSD 74:28 | https://danr.sd.gov/Environment/WasteManagement/HazardousWaste/default.aspx |
| Tennessee | TN Rules 0400-12-01 | https://www.tn.gov/environment/program-areas/solid-waste/hw.html |
| Texas | 30 TAC Ch. 335 | https://www.tceq.texas.gov/assistance/waste/waste-matrix |
| Utah | UAC R315 | https://deq.utah.gov/waste-management-and-radiation-control/hazardous-waste-permitting-and-compliance |
| Vermont | VHWMR | https://dec.vermont.gov/waste-management/hazardous-waste |
| Virginia | 9VAC20-60 | https://www.deq.virginia.gov/land-waste/solid-hazardous-waste/hazardous-waste |
| Washington | WAC 173-303 | https://ecology.wa.gov/regulations-permits/guidance-technical-assistance/dangerous-waste-guidance/dangerous-waste-basics/designation |
| West Virginia | 33 CSR 20 | https://dep.wv.gov/WWE/Programs/hazwaste/Pages/default.aspx |
| Wisconsin | NR 600–685 | https://dnr.wisconsin.gov/topic/Waste/Hazardous.html |
| Wyoming | WY DEQ HW Rules | https://deq.wyoming.gov/shwd/ |

---

## 10. Implementation Priority

### Phase 1 — High-Priority States (Most Divergent from Federal)
1. **California (CA)** — Entirely separate state-only hazardous waste program with lower thresholds
2. **Washington (WA)** — Unique "dangerous waste" designation system
3. **Illinois (IL)** — "Special waste" broader category
4. **Massachusetts (MA)** — Independent program more stringent than federal
5. **New Jersey (NJ)** — Comprehensive waste classification system
6. **Texas (TX)** — Waste Designation Decision Matrix with Class 1/2/3 system
7. **Maryland (MD)** — "Controlled hazardous substance" terminology

### Phase 2 — Moderate Divergence States
8. **Pennsylvania (PA)** — Residual waste category
9. **New York (NY)** — Additional state-listed wastes
10. **Michigan (MI)** — Liquid industrial waste provisions
11. **Connecticut (CT)** — State-specific modifications
12. **Delaware (DE)** — Extensive industry-specific guidance
13. **Oregon (OR)** — State-specific designation process

### Phase 3 — States That Adopt Federal with Minor Modifications
14. All remaining states (adopt federal RCRA with state-specific enforcement, reporting, and permitting requirements)

### Phase 4 — U.S. Territories
15. Puerto Rico, Guam, U.S. Virgin Islands, American Samoa, Northern Mariana Islands

---

## 11. Acceptance Criteria

The state rules validation system is considered complete when:

1. **AC-1:** The "Submit" button on profile creation triggers state rules validation BEFORE advancing to reviewer.
2. **AC-2:** The rules engine correctly identifies the generator's state from `CustomerLocation.state`.
3. **AC-3:** All rules documented in this specification are implemented and evaluable for their respective states.
4. **AC-4:** Follow-up questions are presented to the user when triggered, with no visibility into which rules caused the questions.
5. **AC-5:** The user cannot advance a profile to review status until all required state-specific questions are answered.
6. **AC-6:** State-specific waste codes are automatically identified and included in manifest Item 13.
7. **AC-7:** Manifest requirements are adjusted per state rules (extra copies, pre-notifications, state tracking systems).
8. **AC-8:** 49 CFR compliance is validated for all shipments regardless of state, with state-specific DOT additions applied where applicable.
9. **AC-9:** Interstate shipments validate against both origin and destination state rules.
10. **AC-10:** The system logs all rule evaluations for audit purposes.
11. **AC-11:** Rules can be updated without code changes (data-driven configuration).
12. **AC-12:** The reviewer can see all state-specific data collected and applicable state rules in the review interface.

---

## 12. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-20 | WasteID Team | Initial creation — all 50 states + 5 territories + manifest/49 CFR integration |
