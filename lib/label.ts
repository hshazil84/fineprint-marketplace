import { jsPDF } from 'jspdf'
import bwipjs from 'bwip-js'

export interface LabelData {
  invoiceNumber:  string
  orderSku:       string
  buyerName:      string
  buyerPhone:     string
  deliveryIsland: string
  deliveryAtoll:  string
  deliveryMethod: 'delivery' | 'pickup'
  artworkTitle:   string
  artistName:     string
  printSize:      string
  paperType:      string
  approvedAt:     string
}

function generateBarcode(text: string): string {
  const canvas = document.createElement('canvas')
  bwipjs.toCanvas(canvas, {
    bcid:            'code128',
    text,
    scale:           3,
    height:          12,
    includetext:     false,
    backgroundcolor: 'ffffff',
  })
  return canvas.toDataURL('image/png')
}

export function printLabel(data: LabelData) {
  const doc = new jsPDF({ unit: 'pt', format: [288, 432], orientation: 'portrait' })
  const W   = 288
  const pad = 18
  let   y   = pad

  function text(str: string, x: number, yPos: number, size: number, weight: 'normal' | 'bold' = 'normal', color = '#1a1a1a') {
    doc.setFontSize(size)
    doc.setFont('helvetica', weight)
    doc.setTextColor(color)
    doc.text(str, x, yPos)
  }

  function line(yPos: number) {
    doc.setDrawColor('#e0e0e0')
    doc.setLineWidth(0.5)
    doc.line(pad, yPos, W - pad, yPos)
  }

  function label(str: string, x: number, yPos: number) {
    text(str, x, yPos, 6.5, 'normal', '#888888')
  }

  function value(str: string, x: number, yPos: number, size = 9) {
    text(str, x, yPos, size, 'normal', '#1a1a1a')
  }

  function bold(str: string, x: number, yPos: number, size = 9) {
    text(str, x, yPos, size, 'bold', '#1a1a1a')
  }

  // ── Header ────────────────────────────────────────────────────────────────
  bold('fineprint', pad, y + 10, 13)
  const fw = doc.getTextWidth('fineprint')
  bold('studio', pad + fw, y + 10, 13)

  const colors = ['#00adee', '#4fc3f7', '#fff100', '#f05a28', '#be1e2d']
  const barW   = 60
  colors.forEach((c, i) => {
    doc.setFillColor(c)
    doc.rect(pad + (i * barW / colors.length), y + 14, barW / colors.length, 2, 'F')
  })

  const date = data.approvedAt
    ? new Date(data.approvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#888888')
  doc.text(data.invoiceNumber, W - pad, y + 6, { align: 'right' })
  doc.text(date, W - pad, y + 14, { align: 'right' })

  y += 28
  line(y); y += 10

  // ── Ship to / From ────────────────────────────────────────────────────────
  const col2 = W / 2 + 4

  label('SHIP TO', pad, y)
  label('FROM', col2, y)
  y += 9

  bold(data.buyerName, pad, y, 9)
  bold('FinePrint Studio', col2, y, 9)
  y += 11

  if (data.deliveryMethod === 'pickup') {
    value('Pickup — Male studio', pad, y)
  } else {
    value(data.deliveryIsland || '--', pad, y)
  }
  value('H. Dhunburimaage', col2, y)
  y += 9

  if (data.deliveryMethod === 'delivery' && data.deliveryAtoll) {
    value(data.deliveryAtoll + ', Maldives', pad, y)
  }
  value('Janavaree Magu, Male', col2, y)
  y += 9

  if (data.buyerPhone) value(data.buyerPhone, pad, y)
  value('+960 999 8124', col2, y)
  y += 14

  line(y); y += 10

  // ── Artwork details ───────────────────────────────────────────────────────
  label('ARTWORK', pad, y)
  label('PRINT DETAILS', col2, y)
  y += 9

  const titleTrunc = data.artworkTitle.length > 28 ? data.artworkTitle.slice(0, 28) + '...' : data.artworkTitle
  bold(titleTrunc, pad, y, 9)
  bold(data.printSize, col2, y, 9)
  y += 11

  value('by ' + data.artistName, pad, y)
  value(data.paperType || 'Photo Luster', col2, y)
  y += 9

  value('Giclee archival print', pad, y)
  value('Rolled · Tube packaging', col2, y)
  y += 14

  line(y); y += 10

  // ── Order SKU ─────────────────────────────────────────────────────────────
  label('ORDER SKU', pad, y)
  y += 9
  doc.setFontSize(9)
  doc.setFont('courier', 'bold')
  doc.setTextColor('#1a1a1a')
  doc.text(data.orderSku, pad, y)
  y += 14

  line(y); y += 12

  // ── Barcode ───────────────────────────────────────────────────────────────
  try {
    const barcodeData  = data.orderSku.replace(/[^A-Za-z0-9\-]/g, '')
    const barcodeImage = generateBarcode(barcodeData)
    const barcodeW     = W - pad * 2
    const barcodeH     = 36
    doc.addImage(barcodeImage, 'PNG', pad, y, barcodeW, barcodeH)
    y += barcodeH + 6
    doc.setFontSize(7)
    doc.setFont('courier', 'normal')
    doc.setTextColor('#555555')
    doc.text(barcodeData, W / 2, y, { align: 'center' })
    y += 10
  } catch (e) {
    console.error('Barcode generation failed:', e)
  }

  line(y); y += 10

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#aaaaaa')
  doc.text('hello@fineprintmv.com · fineprintmv.com · +960 999 8124', W / 2, y + 6, { align: 'center' })

  doc.save('FP-label-' + data.invoiceNumber + '.pdf')
}
