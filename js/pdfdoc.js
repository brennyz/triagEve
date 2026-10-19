function pdfText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[–—−]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\n\r\t\x20-\x7E\u00A0-\u00FF]/g, '');
}

function wrap(text, font, size, maxWidth) {
  const lines = [];
  for (const raw of pdfText(text).split('\n')) {
    const words = raw.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(next, size) > maxWidth) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function buildPdf(blocks, footer = 'triagEve') {
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const width = 595.28;
  const height = 841.89;
  const margin = 48;
  const maxW = width - margin * 2;
  const ink = rgb(0.12, 0.1, 0.14);
  const muted = rgb(0.35, 0.32, 0.38);
  let page = doc.addPage([width, height]);
  let y = height - margin;

  function nextPage() {
    page = doc.addPage([width, height]);
    y = height - margin;
  }
  function room(need) {
    if (y - need < margin) nextPage();
  }
  function write(text, face, size, gap, color = ink) {
    for (const line of wrap(text, face, size, maxW)) {
      room(gap);
      if (line) page.drawText(line, { x: margin, y: y - size, size, font: face, color });
      y -= gap;
    }
  }

  for (const block of blocks) {
    if (block.heading) {
      room(26);
      y -= 6;
      write(block.heading, bold, block.size || 13, 17);
      y -= 2;
    }
    for (const line of block.lines || []) {
      write(line, line.startsWith('•') || block.plain ? font : font, 11, 14.5);
      y -= 3;
    }
    if (block.gap) y -= block.gap;
  }

  const pages = doc.getPages();
  pages.forEach((item, index) => {
    item.drawText(pdfText(`${footer}  ${index + 1}/${pages.length}`), {
      x: margin, y: 28, size: 9, font, color: muted,
    });
  });
  return doc.save();
}

export function blocksFrom(root) {
  if (!root) return [];
  const parts = [...root.querySelectorAll('.print-head, .print-section')];
  if (!parts.length) {
    const text = root.innerText.trim();
    return text ? [{ heading: '', lines: text.split(/\n+/).map((s) => s.trim()).filter(Boolean) }] : [];
  }
  return parts.map((sec) => {
    const heading = sec.querySelector('h1, h2')?.innerText.trim() || '';
    const lines = [];
    sec.querySelectorAll('h3, p, li').forEach((el) => {
      const text = el.innerText.replace(/\s+/g, ' ').trim();
      if (text) lines.push(el.tagName === 'LI' ? `• ${text}` : text);
    });
    return { heading, lines };
  });
}

export function downloadPdf(name, bytes) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

export async function sharePdf(name, bytes, title, text) {
  const file = new File([bytes], name, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancel';
    }
  }
  downloadPdf(name, bytes);
  return 'downloaded';
}
