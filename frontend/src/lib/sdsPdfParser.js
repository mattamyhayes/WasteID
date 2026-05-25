/**
 * SDS PDF Parser - Extracts structured data from Safety Data Sheet PDFs
 * using pdfjs-dist for text extraction and pattern matching for field identification.
 */
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

/**
 * Extract all text content from a PDF file.
 * @param {File|ArrayBuffer} fileOrBuffer - PDF file or ArrayBuffer
 * @returns {Promise<{text: string, pages: string[]}>} Full text and per-page text
 */
export async function extractTextFromPdf(fileOrBuffer) {
  let data
  if (fileOrBuffer instanceof File) {
    data = await fileOrBuffer.arrayBuffer()
  } else {
    data = fileOrBuffer
  }

  const pdf = await pdfjsLib.getDocument({ data }).promise
  const pages = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // Reconstruct text with line breaks by detecting Y-position changes
    let pageText = ''
    let lastY = null
    for (const item of content.items) {
      const y = item.transform ? item.transform[5] : null
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        pageText += '\n'
      }
      pageText += item.str
      lastY = y
    }
    pages.push(pageText)
  }

  return { text: pages.join('\n'), pages }
}

/**
 * Render a specific page of a PDF to a canvas and return as data URL.
 * @param {ArrayBuffer} pdfData - PDF file as ArrayBuffer
 * @param {number} pageNum - Page number (1-based)
 * @param {number} scale - Render scale (default 1.5)
 * @returns {Promise<string>} Data URL of rendered page
 */
export async function renderPdfPage(pdfData, pageNum, scale = 1.5) {
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise
  if (pageNum > pdf.numPages) return null
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas.toDataURL('image/png')
}

/**
 * Get total page count of a PDF.
 */
export async function getPdfPageCount(pdfData) {
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise
  return pdf.numPages
}

// ─── Section Parsing Logic ────────────────────────────────────────────────────

// Common section header patterns in SDS documents
const SECTION_PATTERNS = [
  { section: 1, patterns: [/section\s*1[:\s.\-–]+\s*identification/i, /1\.\s*identification/i] },
  { section: 2, patterns: [/section\s*2[:\s.\-–]+\s*hazard/i, /2\.\s*hazard/i] },
  { section: 3, patterns: [/section\s*3[:\s.\-–]+\s*composition/i, /3\.\s*composition/i] },
  { section: 4, patterns: [/section\s*4[:\s.\-–]+\s*first[- ]?aid/i, /4\.\s*first[- ]?aid/i] },
  { section: 5, patterns: [/section\s*5[:\s.\-–]+\s*fire/i, /5\.\s*fire/i] },
  { section: 6, patterns: [/section\s*6[:\s.\-–]+\s*accidental/i, /6\.\s*accidental/i] },
  { section: 7, patterns: [/section\s*7[:\s.\-–]+\s*handling/i, /7\.\s*handling/i] },
  { section: 8, patterns: [/section\s*8[:\s.\-–]+\s*exposure/i, /8\.\s*exposure/i] },
  { section: 9, patterns: [/section\s*9[:\s.\-–]+\s*physical/i, /9\.\s*physical/i] },
  { section: 10, patterns: [/section\s*10[:\s.\-–]+\s*stability/i, /10\.\s*stability/i] },
  { section: 11, patterns: [/section\s*11[:\s.\-–]+\s*toxicol/i, /11\.\s*toxicol/i] },
  { section: 12, patterns: [/section\s*12[:\s.\-–]+\s*ecolog/i, /12\.\s*ecolog/i] },
  { section: 13, patterns: [/section\s*13[:\s.\-–]+\s*disposal/i, /13\.\s*disposal/i] },
  { section: 14, patterns: [/section\s*14[:\s.\-–]+\s*transport/i, /14\.\s*transport/i] },
  { section: 15, patterns: [/section\s*15[:\s.\-–]+\s*regulat/i, /15\.\s*regulat/i] },
  { section: 16, patterns: [/section\s*16[:\s.\-–]+\s*other/i, /16\.\s*other/i] },
]

/**
 * Split full SDS text into sections.
 */
function splitIntoSections(text) {
  const sections = {}
  const lines = text.split('\n')
  const fullText = text

  // Find section boundaries
  const boundaries = []
  for (const { section, patterns } of SECTION_PATTERNS) {
    for (const pattern of patterns) {
      const match = fullText.match(pattern)
      if (match) {
        boundaries.push({ section, index: match.index })
        break
      }
    }
  }

  // Sort by position in text
  boundaries.sort((a, b) => a.index - b.index)

  // Extract text between boundaries
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i].index
    const end = i + 1 < boundaries.length ? boundaries[i + 1].index : fullText.length
    sections[boundaries[i].section] = fullText.slice(start, end).trim()
  }

  return sections
}

// ─── Field Extraction Helpers ─────────────────────────────────────────────────

function extractField(text, patterns, { multiline = false } = {}) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      let value = match[1].trim()
      // Clean up common artifacts
      value = value.replace(/\s+/g, ' ').trim()
      // Remove trailing section headers
      value = value.replace(/\s*section\s*\d+.*/i, '').trim()
      if (value && value !== '-' && value !== 'N/A' && value !== 'Not available' && value.length > 0) {
        return value
      }
    }
  }
  return ''
}

function extractCasNumber(text) {
  // CAS number pattern: digits-digits-digits
  const patterns = [
    /CAS[\s\-#:]*(?:No\.?|Number)?[\s:]*(\d{1,7}-\d{2}-\d)/i,
    /(\d{1,7}-\d{2}-\d)/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) return match[1]
  }
  return ''
}

// ─── Section 1: Identification ────────────────────────────────────────────────

function parseSection1(text, fullText) {
  const result = {}

  // Product name - usually the first prominent field
  result.product_name = extractField(text, [
    /product\s*(?:name|identifier)\s*[:\s]+([^\n]+)/i,
    /trade\s*name\s*[:\s]+([^\n]+)/i,
    /chemical\s*name\s*[:\s]+([^\n]+)/i,
    /product\s*[:\s]+([^\n]+)/i,
  ]) || extractField(fullText, [
    /product\s*(?:name|identifier)\s*[:\s]+([^\n]+)/i,
    /trade\s*name\s*[:\s]+([^\n]+)/i,
  ])

  result.product_code = extractField(text, [
    /product\s*(?:code|number|#)\s*[:\s]+([^\n]+)/i,
    /catalog\s*(?:number|#|no\.?)\s*[:\s]+([^\n]+)/i,
    /stock\s*number\s*[:\s]+([^\n]+)/i,
  ])

  result.cas_number = extractCasNumber(text) || extractCasNumber(fullText)

  result.manufacturer_name = extractField(text, [
    /(?:manufacturer|company|supplier|distributed\s*by)\s*(?:name)?\s*[:\s]+([^\n]+)/i,
    /(?:company|manufacturer)\s*[:\s]+([^\n]+)/i,
  ])

  result.manufacturer_address = extractField(text, [
    /(?:address)\s*[:\s]+([^\n]+(?:\n[^\n]+)?)/i,
  ])

  result.manufacturer_phone = extractField(text, [
    /(?:phone|telephone|tel\.?)\s*(?:number|#|no\.?)?\s*[:\s]+([^\n]+)/i,
    /(?:information\s*number|contact)\s*[:\s]+([+\d()\s\-]+)/i,
  ])

  result.emergency_phone = extractField(text, [
    /emergency\s*(?:phone|telephone|tel|contact|number)\s*[:\s]+([^\n]+)/i,
    /chemtrec\s*[:\s]+([+\d()\s\-]+)/i,
    /(?:24.?hour|emergency)\s*[:\s]+([+\d()\s\-]+)/i,
  ])

  result.recommended_use = extractField(text, [
    /(?:recommended|intended)\s*use\s*[:\s]+([^\n]+)/i,
    /use\s*of\s*(?:the\s*)?(?:substance|chemical|product)\s*[:\s]+([^\n]+)/i,
  ])

  result.restrictions_on_use = extractField(text, [
    /restrictions?\s*(?:on\s*)?use\s*[:\s]+([^\n]+)/i,
    /uses\s*advised\s*against\s*[:\s]+([^\n]+)/i,
  ])

  result.sds_version = extractField(fullText, [
    /(?:version|revision)\s*(?:number|#|no\.?)?\s*[:\s]+([^\n]+)/i,
    /SDS\s*(?:version|rev\.?)\s*[:\s]+([^\n]+)/i,
  ])

  // Revision date
  const dateMatch = fullText.match(/(?:revision|issue|print)\s*date\s*[:\s]+([^\n]+)/i)
  if (dateMatch && dateMatch[1]) {
    result.sds_revision_date = dateMatch[1].trim()
  }

  return result
}

// ─── Section 2: Hazards Identification ────────────────────────────────────────

function parseSection2(text) {
  const result = {}

  result.signal_word = extractField(text, [
    /signal\s*word\s*[:\s]+(danger|warning)/i,
  ])

  // Hazard statements (H-codes)
  const hStatements = text.match(/H\d{3}[^\n]*/gi) || []
  if (hStatements.length > 0) {
    result.hazard_statements = JSON.stringify(hStatements.map(s => s.trim()))
  }

  // Precautionary statements (P-codes)
  const pStatements = text.match(/P\d{3}[^\n]*/gi) || []
  if (pStatements.length > 0) {
    result.precautionary_statements = JSON.stringify(pStatements.map(s => s.trim()))
  }

  result.other_hazards = extractField(text, [
    /other\s*hazards?\s*[:\s]+([^\n]+)/i,
  ])

  // GHS classification
  const ghsMatch = text.match(/(?:GHS|classification)\s*[:\s]+([^\n]+)/i)
  if (ghsMatch) {
    result.ghs_classification = JSON.stringify([ghsMatch[1].trim()])
  }

  return result
}

// ─── Section 3: Composition ───────────────────────────────────────────────────

function parseSection3(text) {
  const result = {}

  // Look for composition table entries: name, CAS, concentration
  const entries = []
  const casPattern = /(\d{1,7}-\d{2}-\d)/g
  const lines = text.split(/\n/)

  for (const line of lines) {
    const casMatch = line.match(/(\d{1,7}-\d{2}-\d)/)
    const concMatch = line.match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)\s*%|(\d+\.?\d*)\s*%|([<>≤≥]\s*\d+\.?\d*\s*%)/i)

    if (casMatch) {
      const entry = { cas_number: casMatch[1] }
      if (concMatch) {
        entry.concentration = concMatch[0].trim()
      }
      // Try to extract name (text before CAS)
      const beforeCas = line.substring(0, line.indexOf(casMatch[1])).trim()
      if (beforeCas) {
        entry.name = beforeCas.replace(/[|:;,]$/, '').trim()
      }
      entries.push(entry)
    }
  }

  if (entries.length > 0) {
    result.composition = JSON.stringify(entries)
  }

  return result
}

// ─── Section 4: First-Aid Measures ────────────────────────────────────────────

function parseSection4(text) {
  return {
    first_aid_inhalation: extractField(text, [
      /inhalation\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
      /if\s*inhaled\s*[:\s]+([^\n]+)/i,
    ]),
    first_aid_skin: extractField(text, [
      /skin\s*(?:contact)?\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
      /if\s*on\s*skin\s*[:\s]+([^\n]+)/i,
    ]),
    first_aid_eye: extractField(text, [
      /eye\s*(?:contact)?\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
      /if\s*in\s*eyes?\s*[:\s]+([^\n]+)/i,
    ]),
    first_aid_ingestion: extractField(text, [
      /ingestion\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
      /if\s*(?:swallowed|ingested)\s*[:\s]+([^\n]+)/i,
    ]),
    first_aid_notes: extractField(text, [
      /(?:notes?\s*to\s*physician|most\s*important)\s*[:\s]+([^\n]+)/i,
    ]),
  }
}

// ─── Section 5: Fire-Fighting ─────────────────────────────────────────────────

function parseSection5(text) {
  return {
    extinguishing_media: extractField(text, [
      /(?:suitable\s*)?extinguishing\s*media\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
    ]),
    special_fire_hazards: extractField(text, [
      /(?:special|specific)\s*(?:hazards?|fire)\s*[:\s]+([^\n]+)/i,
      /unusual\s*fire.*?hazards?\s*[:\s]+([^\n]+)/i,
    ]),
    firefighter_equipment: extractField(text, [
      /(?:protective\s*equipment|firefighter|advice)\s*[:\s]+([^\n]+)/i,
    ]),
  }
}

// ─── Section 6: Accidental Release ───────────────────────────────────────────

function parseSection6(text) {
  return {
    personal_precautions: extractField(text, [
      /personal\s*precautions?\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
    ]),
    environmental_precautions: extractField(text, [
      /environmental\s*precautions?\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
    ]),
    containment_cleanup: extractField(text, [
      /(?:containment|clean[- ]?up|methods)\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
    ]),
  }
}

// ─── Section 7: Handling and Storage ──────────────────────────────────────────

function parseSection7(text) {
  return {
    handling_precautions: extractField(text, [
      /(?:precautions?\s*for\s*safe\s*)?handling\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
    ]),
    storage_conditions: extractField(text, [
      /(?:conditions\s*for\s*safe\s*)?storage\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
    ]),
    incompatible_materials: extractField(text, [
      /incompatible\s*(?:materials?|products?)\s*[:\s]+([^\n]+)/i,
    ]),
  }
}

// ─── Section 8: Exposure Controls ────────────────────────────────────────────

function parseSection8(text) {
  const result = {}

  result.engineering_controls = extractField(text, [
    /engineering\s*controls?\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
  ])
  result.respiratory_protection = extractField(text, [
    /respiratory\s*(?:protection)?\s*[:\s]+([^\n]+)/i,
  ])
  result.hand_protection = extractField(text, [
    /hand\s*(?:protection)?\s*[:\s]+([^\n]+)/i,
    /(?:protective\s*)?gloves?\s*[:\s]+([^\n]+)/i,
  ])
  result.eye_protection = extractField(text, [
    /eye\s*(?:protection|\/face)?\s*[:\s]+([^\n]+)/i,
  ])
  result.skin_protection = extractField(text, [
    /skin\s*(?:and\s*body\s*)?protection\s*[:\s]+([^\n]+)/i,
  ])

  // Exposure limits
  const limits = []
  const oelPatterns = [
    /(?:TWA|PEL|TLV|STEL|REL)\s*[:\s]*([^\n]+)/gi,
  ]
  for (const pattern of oelPatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      limits.push(match[0].trim())
    }
  }
  if (limits.length > 0) {
    result.exposure_limits = JSON.stringify(limits)
  }

  return result
}

// ─── Section 9: Physical and Chemical Properties ─────────────────────────────

function parseSection9(text) {
  return {
    physical_state: extractField(text, [
      /(?:physical\s*state|form|appearance)\s*[:\s]+([^\n]+)/i,
    ]),
    color: extractField(text, [
      /colou?r\s*[:\s]+([^\n]+)/i,
    ]),
    odor: extractField(text, [
      /odou?r\s*[:\s]+([^\n]+)/i,
    ]),
    odor_threshold: extractField(text, [
      /odou?r\s*threshold\s*[:\s]+([^\n]+)/i,
    ]),
    ph: extractField(text, [
      /\bpH\s*[:\s]+([^\n]+)/i,
    ]),
    melting_point: extractField(text, [
      /melting\s*(?:point|range)?\s*[:\s/]+([^\n]+)/i,
      /freezing\s*point\s*[:\s]+([^\n]+)/i,
    ]),
    boiling_point: extractField(text, [
      /boiling\s*(?:point|range)?\s*[:\s/]+([^\n]+)/i,
    ]),
    flash_point: extractField(text, [
      /flash\s*point\s*[:\s]+([^\n]+)/i,
    ]),
    evaporation_rate: extractField(text, [
      /evaporation\s*rate\s*[:\s]+([^\n]+)/i,
    ]),
    flammability: extractField(text, [
      /flammability\s*[:\s]+([^\n]+)/i,
    ]),
    upper_explosive_limit: extractField(text, [
      /upper\s*(?:explosive|flammab)\s*limit\s*[:\s]+([^\n]+)/i,
    ]),
    lower_explosive_limit: extractField(text, [
      /lower\s*(?:explosive|flammab)\s*limit\s*[:\s]+([^\n]+)/i,
    ]),
    vapor_pressure: extractField(text, [
      /vapo[u]?r\s*pressure\s*[:\s]+([^\n]+)/i,
    ]),
    vapor_density: extractField(text, [
      /vapo[u]?r\s*density\s*[:\s]+([^\n]+)/i,
    ]),
    relative_density: extractField(text, [
      /relative\s*density\s*[:\s]+([^\n]+)/i,
      /specific\s*gravity\s*[:\s]+([^\n]+)/i,
    ]),
    solubility: extractField(text, [
      /solubility\s*(?:in\s*water)?\s*[:\s]+([^\n]+)/i,
      /water\s*solubility\s*[:\s]+([^\n]+)/i,
    ]),
    partition_coefficient: extractField(text, [
      /partition\s*coefficient\s*[:\s]+([^\n]+)/i,
      /log\s*[KP]ow\s*[:\s]+([^\n]+)/i,
    ]),
    auto_ignition_temp: extractField(text, [
      /auto[- ]?ignition\s*(?:temperature|temp\.?)\s*[:\s]+([^\n]+)/i,
    ]),
    decomposition_temp: extractField(text, [
      /decomposition\s*(?:temperature|temp\.?)\s*[:\s]+([^\n]+)/i,
    ]),
    viscosity: extractField(text, [
      /viscosity\s*[:\s]+([^\n]+)/i,
    ]),
    molecular_weight: extractField(text, [
      /molecular\s*weight\s*[:\s]+([^\n]+)/i,
      /molar\s*mass\s*[:\s]+([^\n]+)/i,
    ]),
    molecular_formula: extractField(text, [
      /molecular\s*formula\s*[:\s]+([^\n]+)/i,
      /chemical\s*formula\s*[:\s]+([^\n]+)/i,
    ]),
  }
}

// ─── Section 10: Stability and Reactivity ─────────────────────────────────────

function parseSection10(text) {
  return {
    chemical_stability: extractField(text, [
      /(?:chemical\s*)?stability\s*[:\s]+([^\n]+)/i,
    ]),
    conditions_to_avoid: extractField(text, [
      /conditions?\s*to\s*avoid\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
    ]),
    incompatible_materials_sec10: extractField(text, [
      /incompatible\s*materials?\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
    ]),
    hazardous_decomposition: extractField(text, [
      /hazardous\s*decomposition\s*(?:products?)?\s*[:\s]+([^\n]+)/i,
    ]),
    possibility_of_reactions: extractField(text, [
      /(?:possibility\s*of\s*)?hazardous\s*(?:reactions?|polymerization)\s*[:\s]+([^\n]+)/i,
    ]),
  }
}

// ─── Section 11: Toxicological Information ────────────────────────────────────

function parseSection11(text) {
  const result = {}

  result.skin_corrosion_irritation = extractField(text, [
    /skin\s*(?:corrosion|irritation)\s*[:\s]+([^\n]+)/i,
  ])
  result.eye_damage_irritation = extractField(text, [
    /(?:serious\s*)?eye\s*(?:damage|irritation)\s*[:\s]+([^\n]+)/i,
  ])
  result.respiratory_sensitization = extractField(text, [
    /respiratory\s*sensitiz/i,
  ]) ? extractField(text, [/respiratory\s*sensitization\s*[:\s]+([^\n]+)/i]) : ''
  result.skin_sensitization = extractField(text, [
    /skin\s*sensitization\s*[:\s]+([^\n]+)/i,
  ])
  result.germ_cell_mutagenicity = extractField(text, [
    /(?:germ\s*cell\s*)?mutagenicity\s*[:\s]+([^\n]+)/i,
  ])
  result.carcinogenicity = extractField(text, [
    /carcinogenicity\s*[:\s]+([^\n]+)/i,
  ])
  result.reproductive_toxicity = extractField(text, [
    /reproductive\s*toxicity\s*[:\s]+([^\n]+)/i,
  ])

  // Acute toxicity - LD50/LC50
  const toxValues = []
  const toxPattern = /(?:LD50|LC50)\s*[:\s]*([^\n]+)/gi
  let match
  while ((match = toxPattern.exec(text)) !== null) {
    toxValues.push(match[0].trim())
  }
  if (toxValues.length > 0) {
    result.acute_toxicity = JSON.stringify(toxValues)
  }

  return result
}

// ─── Section 12: Ecological Information ───────────────────────────────────────

function parseSection12(text) {
  const result = {}

  result.persistence_degradability = extractField(text, [
    /persistence\s*(?:and\s*)?degradability\s*[:\s]+([^\n]+)/i,
  ])
  result.bioaccumulative_potential = extractField(text, [
    /bioaccumulative\s*potential\s*[:\s]+([^\n]+)/i,
  ])
  result.mobility_in_soil = extractField(text, [
    /mobility\s*(?:in\s*soil)?\s*[:\s]+([^\n]+)/i,
  ])
  result.other_ecological_info = extractField(text, [
    /other\s*(?:adverse\s*)?(?:ecological|environmental)\s*[:\s]+([^\n]+)/i,
  ])

  // Aquatic toxicity
  const aquaticValues = []
  const aquaPattern = /(?:EC50|LC50|IC50)\s*[:\s]*([^\n]+)/gi
  let match
  while ((match = aquaPattern.exec(text)) !== null) {
    aquaticValues.push(match[0].trim())
  }
  if (aquaticValues.length > 0) {
    result.aquatic_toxicity = JSON.stringify(aquaticValues)
  }

  return result
}

// ─── Section 13: Disposal Considerations ─────────────────────────────────────

function parseSection13(text) {
  return {
    waste_disposal_method: extractField(text, [
      /(?:waste\s*)?disposal\s*(?:method|consideration)s?\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
      /waste\s*treatment\s*[:\s]+([^\n]+)/i,
    ]),
    epa_waste_code: extractField(text, [
      /(?:EPA|RCRA)\s*(?:waste\s*)?code\s*[:\s]+([^\n]+)/i,
      /(?:waste\s*code|hazardous\s*waste)\s*[:\s]+([^\n]+)/i,
    ]),
    contaminated_packaging: extractField(text, [
      /contaminated\s*packaging\s*[:\s]+([^\n]+)/i,
    ]),
  }
}

// ─── Section 14: Transport Information ────────────────────────────────────────

function parseSection14(text) {
  return {
    un_number: extractField(text, [
      /UN[\s\-]?(?:number|no\.?|#)?\s*[:\s]*(UN\s*\d{4}|\d{4})/i,
    ]),
    un_proper_shipping_name: extractField(text, [
      /(?:proper\s*)?shipping\s*name\s*[:\s]+([^\n]+)/i,
      /UN\s*proper\s*shipping\s*name\s*[:\s]+([^\n]+)/i,
    ]),
    transport_hazard_class: extractField(text, [
      /(?:transport\s*)?hazard\s*class\s*(?:es)?\s*[:\s]+([^\n]+)/i,
    ]),
    packing_group: extractField(text, [
      /packing\s*group\s*[:\s]+([^\n]+)/i,
    ]),
    dot_description: extractField(text, [
      /DOT\s*(?:description|classification)?\s*[:\s]+([^\n]+)/i,
    ]),
    environmental_hazard_transport: extractField(text, [
      /environmental\s*hazard\s*[:\s]+([^\n]+)/i,
      /marine\s*pollutant\s*[:\s]+([^\n]+)/i,
    ]),
    special_precautions_transport: extractField(text, [
      /special\s*precautions?\s*[:\s]+([^\n]+)/i,
    ]),
  }
}

// ─── Section 15: Regulatory Information ───────────────────────────────────────

function parseSection15(text) {
  return {
    sara_311_312: extractField(text, [
      /SARA\s*(?:Title\s*III\s*)?(?:Section\s*)?311[\s/]*312\s*[:\s]+([^\n]+)/i,
      /311\/312\s*(?:categories?)?\s*[:\s]+([^\n]+)/i,
    ]),
    sara_313: extractField(text, [
      /SARA\s*(?:Title\s*III\s*)?(?:Section\s*)?313\s*[:\s]+([^\n]+)/i,
    ]),
    cercla_rq: extractField(text, [
      /CERCLA\s*(?:RQ|Reportable\s*Quantity)\s*[:\s]+([^\n]+)/i,
    ]),
    rcra_waste_code: extractField(text, [
      /RCRA\s*(?:waste\s*)?(?:code|status)\s*[:\s]+([^\n]+)/i,
    ]),
    tsca_status: extractField(text, [
      /TSCA\s*(?:status|inventory|listing)?\s*[:\s]+([^\n]+)/i,
    ]),
    california_prop65: extractField(text, [
      /(?:california\s*)?prop(?:osition)?\s*65\s*[:\s]+([^\n]+)/i,
    ]),
    state_regulations: extractField(text, [
      /state\s*regulations?\s*[:\s]+([^\n]+)/i,
    ]),
    international_regulations: extractField(text, [
      /international\s*(?:regulations?|inventories)\s*[:\s]+([^\n]+)/i,
    ]),
  }
}

// ─── Section 16: Other Information ────────────────────────────────────────────

function parseSection16(text) {
  return {
    revision_notes: extractField(text, [
      /(?:revision|change)\s*(?:notes?|summary|information)\s*[:\s]+([^\n]+)/i,
    ]),
    disclaimer: extractField(text, [
      /disclaimer\s*[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
    ]),
    other_information: extractField(text, [
      /(?:other|additional)\s*information\s*[:\s]+([^\n]+)/i,
    ]),
  }
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

/**
 * Parse an SDS PDF file and extract all structured data.
 * @param {File} file - The PDF file to parse
 * @returns {Promise<object>} Parsed SDS data fields
 */
export async function parseSdsPdf(file) {
  const { text, pages } = await extractTextFromPdf(file)

  if (!text || text.trim().length < 50) {
    throw new Error('Could not extract text from PDF. The file may be image-based (scanned). Please ensure you upload a text-based PDF file, or enter the SDS data manually using the form fields.')
  }

  const sections = splitIntoSections(text)
  const result = {}

  // Parse each section
  Object.assign(result, parseSection1(sections[1] || text, text))
  Object.assign(result, parseSection2(sections[2] || ''))
  Object.assign(result, parseSection3(sections[3] || text))
  Object.assign(result, parseSection4(sections[4] || ''))
  Object.assign(result, parseSection5(sections[5] || ''))
  Object.assign(result, parseSection6(sections[6] || ''))
  Object.assign(result, parseSection7(sections[7] || ''))
  Object.assign(result, parseSection8(sections[8] || ''))
  Object.assign(result, parseSection9(sections[9] || ''))
  Object.assign(result, parseSection10(sections[10] || ''))
  Object.assign(result, parseSection11(sections[11] || ''))
  Object.assign(result, parseSection12(sections[12] || ''))
  Object.assign(result, parseSection13(sections[13] || ''))
  Object.assign(result, parseSection14(sections[14] || ''))
  Object.assign(result, parseSection15(sections[15] || ''))
  Object.assign(result, parseSection16(sections[16] || ''))

  // Remove empty fields
  for (const key of Object.keys(result)) {
    if (!result[key] || result[key] === '' || result[key] === '[]') {
      delete result[key]
    }
  }

  // Ensure product_name has a value
  if (!result.product_name) {
    result.product_name = file.name.replace(/\.pdf$/i, '')
  }

  result.import_status = 'complete'

  return result
}
