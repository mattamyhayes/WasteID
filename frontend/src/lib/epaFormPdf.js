/**
 * Client-side EPA Form 8700-22 PDF generator.
 * Used in offline / static mode when no backend is available.
 */
import { jsPDF } from 'jspdf'
import { applyPlugin } from 'jspdf-autotable'

applyPlugin(jsPDF)

const CONTAINER_TYPE_LABELS = {
  DM: 'DM', DW: 'DW', DF: 'DF', TP: 'TP', TT: 'TT', TC: 'TC',
  CY: 'CY', CM: 'CM', CF: 'CF', CW: 'CW', BA: 'BA',
}

const UNIT_LABELS = {
  G: 'G', P: 'P', T: 'T', K: 'K', M: 'M', N: 'N', L: 'L',
}

/**
 * Generate and download a PDF of an EPA 8700-22 manifest.
 * @param {object} manifest – a manifest object from local store or API
 */
export function generateEpaFormPdf(manifest) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 36 // 0.5 inch
  const usable = pageWidth - 2 * margin
  let y = 36

  const darkGreen = [26, 86, 50]
  const borderGrey = [55, 65, 75]

  // --- Title ---
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('UNIFORM HAZARDOUS WASTE MANIFEST', pageWidth / 2, y, { align: 'center' })
  y += 14
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('(EPA Form 8700-22)', pageWidth / 2, y, { align: 'center' })
  y += 12

  function sectionHeader(num, title) {
    doc.setFillColor(...darkGreen)
    doc.rect(margin, y, usable, 13, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(`${num}. ${title}`, margin + 4, y + 9.5)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    y += 13
  }

  function fieldBox(x, w, label, value, h = 28) {
    doc.setDrawColor(...borderGrey)
    doc.setLineWidth(0.5)
    doc.rect(x, y, w, h)
    doc.setFontSize(6)
    doc.setTextColor(100, 100, 100)
    doc.text(label, x + 3, y + 7)
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    const val = String(value || '')
    // Truncate if too long for box
    const maxChars = Math.floor(w / 4.5)
    doc.text(val.substring(0, maxChars), x + 3, y + 20)
  }

  function fieldRow(fields, h = 28) {
    for (const f of fields) {
      fieldBox(f.x, f.w, f.label, f.value, h)
    }
    y += h
  }

  const half = usable / 2
  const twoThirds = (usable * 2) / 3
  const oneThird = usable / 3

  // --- Section 1: Generator ---
  sectionHeader(1, 'Generator Information')

  fieldRow([
    { x: margin, w: half, label: 'Manifest Tracking Number', value: manifest.manifest_tracking_number },
    { x: margin + half, w: half, label: 'Emergency Response Phone', value: manifest.emergency_response_phone },
  ])

  fieldRow([
    { x: margin, w: twoThirds, label: "Generator's Name", value: manifest.generator_name },
    { x: margin + twoThirds, w: oneThird, label: "Generator's US EPA ID No.", value: manifest.generator_epa_id },
  ])

  const genAddr = [manifest.generator_address, manifest.generator_city,
    manifest.generator_state, manifest.generator_zip].filter(Boolean).join(', ')
  fieldRow([
    { x: margin, w: usable, label: "Generator's Mailing Address", value: genAddr },
  ])

  const siteAddr = manifest.generator_site_address || genAddr
  fieldRow([
    { x: margin, w: usable, label: "Generator's Site Address (if different from mailing address)", value: siteAddr },
  ])

  fieldRow([
    { x: margin, w: usable, label: "Generator's Phone", value: manifest.generator_phone },
  ])

  y += 4

  // --- Section 2: Transporters ---
  sectionHeader(2, 'Transporters')

  fieldRow([
    { x: margin, w: twoThirds, label: 'Transporter 1 Company Name', value: manifest.transporter1_name },
    { x: margin + twoThirds, w: oneThird, label: 'US EPA ID Number', value: manifest.transporter1_epa_id },
  ])

  if (manifest.transporter2_name) {
    fieldRow([
      { x: margin, w: twoThirds, label: 'Transporter 2 Company Name', value: manifest.transporter2_name },
      { x: margin + twoThirds, w: oneThird, label: 'US EPA ID Number', value: manifest.transporter2_epa_id },
    ])
  }

  y += 4

  // --- Section 3: Designated Facility ---
  sectionHeader(3, 'Designated Facility')

  fieldRow([
    { x: margin, w: twoThirds, label: 'Facility Name', value: manifest.designated_facility_name },
    { x: margin + twoThirds, w: oneThird, label: 'US EPA ID Number', value: manifest.designated_facility_epa_id },
  ])

  const facAddr = [manifest.designated_facility_address, manifest.designated_facility_city,
    manifest.designated_facility_state, manifest.designated_facility_zip].filter(Boolean).join(', ')
  fieldRow([
    { x: margin, w: twoThirds, label: 'Facility Address', value: facAddr },
    { x: margin + twoThirds, w: oneThird, label: 'Phone', value: manifest.designated_facility_phone },
  ])

  y += 4

  // --- Section 4: Waste Items ---
  sectionHeader(4, 'US DOT Description / Waste Items')

  let wasteItems = []
  try {
    wasteItems = typeof manifest.waste_items === 'string'
      ? JSON.parse(manifest.waste_items || '[]')
      : (manifest.waste_items_list || manifest.waste_items || [])
  } catch {
    wasteItems = []
  }

  const wasteHead = [['HM', 'US DOT Description', 'Containers\nNo.', 'Type', 'Total\nQty', 'Unit\nWt/Vol', 'Waste Codes']]
  const wasteBody = wasteItems.map(item => [
    'X',
    String(item.dot_description || ''),
    String(item.containers_no || ''),
    CONTAINER_TYPE_LABELS[item.container_type] || String(item.container_type || ''),
    String(item.quantity || ''),
    UNIT_LABELS[item.unit] || String(item.unit || ''),
    String(item.waste_codes || ''),
  ])
  // Pad to 4 rows minimum
  while (wasteBody.length < 4) {
    wasteBody.push(['', '', '', '', '', '', ''])
  }

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: wasteHead,
    body: wasteBody,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2, lineWidth: 0.5, lineColor: borderGrey },
    headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 6.5 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 185 },
      2: { cellWidth: 42 },
      3: { cellWidth: 42 },
      4: { cellWidth: 48 },
      5: { cellWidth: 42 },
      6: { cellWidth: usable - 381 },
    },
  })
  y = doc.lastAutoTable.finalY + 4

  // --- Section 5: Special Handling ---
  sectionHeader(5, 'Special Handling Instructions & Additional Information')

  let handlingText = manifest.special_handling_instructions || ''
  if (manifest.additional_info) handlingText += '\n' + manifest.additional_info
  fieldRow([
    { x: margin, w: usable, label: '', value: handlingText.trim() },
  ], 36)

  y += 4

  // --- International Shipments (if applicable) ---
  let certNum = 6
  if (manifest.international_shipment) {
    sectionHeader(6, 'International Shipments')
    const intlParts = []
    intlParts.push(manifest.import_to_us ? 'Import to US' : 'Export from US')
    if (manifest.port_of_entry_exit) intlParts.push(`Port: ${manifest.port_of_entry_exit}`)
    if (manifest.date_leaving_us) intlParts.push(`Date leaving US: ${manifest.date_leaving_us}`)
    fieldRow([
      { x: margin, w: usable, label: 'International Shipment Details', value: intlParts.join('  |  ') },
    ])
    y += 4
    certNum = 7
  }

  // --- Generator Certification ---
  // Check if we need a new page
  if (y > 620) {
    doc.addPage()
    y = 36
  }

  sectionHeader(certNum, "Generator's/Offeror's Certification")

  const certText =
    "I hereby declare that the contents of this consignment are fully and accurately " +
    "described above by the proper shipping name, and are classified, packaged, marked " +
    "and labeled/placarded, and are in all respects in proper condition for transport " +
    "according to applicable international and national governmental regulations."

  const certCheck = manifest.generator_certification ? '☑' : '☐'
  doc.setFontSize(6.5)
  const lines = doc.splitTextToSize(`${certCheck} ${certText}`, usable - 6)
  doc.setDrawColor(...borderGrey)
  doc.setLineWidth(0.5)
  const certH = Math.max(lines.length * 8 + 6, 30)
  doc.rect(margin, y, usable, certH)
  doc.text(lines, margin + 3, y + 8)
  y += certH

  fieldRow([
    { x: margin, w: oneThird, label: 'Printed/Typed Name', value: manifest.generator_printed_name },
    { x: margin + oneThird, w: oneThird, label: 'Signature', value: '' },
    { x: margin + 2 * oneThird, w: oneThird, label: 'Date', value: manifest.generator_signature_date || '' },
  ])

  // --- Footer ---
  y += 16
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text('EPA Form 8700-22 (Rev. 3-05)', pageWidth / 2, y, { align: 'center' })
  y += 10
  doc.text(
    `Generated by WasteID — Manifest ID: ${manifest.id || 'draft'}  |  Status: ${manifest.status || 'draft'}  |  Created: ${manifest.created_at ? new Date(manifest.created_at).toLocaleDateString() : 'N/A'}`,
    pageWidth / 2, y, { align: 'center' }
  )

  // Save
  const tracking = manifest.manifest_tracking_number || `manifest_${manifest.id || 'draft'}`
  const safeTracking = tracking.replace(/[^a-zA-Z0-9_-]/g, '_')
  doc.save(`EPA_8700-22_${safeTracking}.pdf`)
}
