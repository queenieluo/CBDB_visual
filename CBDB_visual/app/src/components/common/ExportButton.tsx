import { useCallback } from 'react';
import { useTreeState } from '../../state/TreeContext';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(gridData: { personID: number; group: string; variable: string; value: number; text: string; info: string; isEmpty: boolean }[]) {
  const rows = gridData
    .filter(c => !c.isEmpty && c.personID > 0)
    .map(c => `${c.personID},${c.text},"${c.info}",${c.group},${c.variable},${c.value}`);
  const csv = 'personID,name,info,group,variable,value\n' + rows.join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv' }), 'cbdb-family-tree.csv');
}

function exportPNG() {
  const svg = document.querySelector<SVGSVGElement>('.grid-svg');
  if (!svg) return;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  // Reset zoom transform on clone
  const zoomGroup = clone.querySelector('.zoom-group');
  if (zoomGroup) zoomGroup.setAttribute('transform', '');

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const scale = 2; // retina
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#f0f1f5';
    ctx.fillRect(0, 0, img.width, img.height);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(blob => {
      if (blob) downloadBlob(blob, 'cbdb-family-tree.png');
      URL.revokeObjectURL(url);
    });
  };
  img.src = url;
}

export function ExportButton() {
  const { gridData } = useTreeState();
  const hasData = gridData.some(c => !c.isEmpty);

  const handleExportPNG = useCallback(() => exportPNG(), []);
  const handleExportCSV = useCallback(() => exportCSV(gridData), [gridData]);

  if (!hasData) return null;

  return (
    <div className="export-buttons">
      <button className="export-btn" onClick={handleExportPNG} title="Export as PNG">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>
        PNG
      </button>
      <button className="export-btn" onClick={handleExportCSV} title="Export as CSV">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>
        CSV
      </button>
    </div>
  );
}
