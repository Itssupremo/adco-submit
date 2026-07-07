import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function normalizePdfError(error) {
  const message = String(error?.message || '').trim();
  const normalized = message.toLowerCase();

  if (
    normalized.includes('offset is out of bounds') ||
    normalized.includes('invalid pdf') ||
    normalized.includes('malformed') ||
    normalized.includes('unexpected server response') ||
    normalized.includes('missing pdf')
  ) {
    return 'Unable to preview this file in the built-in viewer. Download the file to open it locally.';
  }

  return message || 'Failed to load PDF.';
}

function PdfPage({ pdf, pageNumber, scale }) {
  const canvasRef = useRef(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [links, setLinks] = useState([]);

  useEffect(() => {
    let cancelled = false;
    let renderTask = null;

    const renderPage = async () => {
      const page = await pdf.getPage(pageNumber);
      const outputScale = window.devicePixelRatio || 1;
      const displayViewport = page.getViewport({ scale });
      const renderViewport = page.getViewport({ scale: scale * outputScale });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;

      const context = canvas.getContext('2d');
      canvas.width = Math.ceil(renderViewport.width);
      canvas.height = Math.ceil(renderViewport.height);
      canvas.style.width = `${Math.ceil(displayViewport.width)}px`;
      canvas.style.height = `${Math.ceil(displayViewport.height)}px`;
      setPageSize({ width: Math.ceil(displayViewport.width), height: Math.ceil(displayViewport.height) });

      renderTask = page.render({ canvasContext: context, viewport: renderViewport });
      await renderTask.promise;
      if (cancelled) return;

      const annotations = await page.getAnnotations();
      if (cancelled) return;

      const nextLinks = annotations
        .filter((annotation) => annotation.subtype === 'Link' && (annotation.url || annotation.unsafeUrl))
        .map((annotation, index) => {
          const [x1, y1, x2, y2] = displayViewport.convertToViewportRectangle(annotation.rect);
          return {
            id: `${pageNumber}-${index}`,
            href: annotation.url || annotation.unsafeUrl,
            left: Math.min(x1, x2),
            top: Math.min(y1, y2),
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1),
          };
        });

      setLinks(nextLinks);
    };

    renderPage().catch(() => {
      if (!cancelled) setLinks([]);
    });

    return () => {
      cancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNumber, scale]);

  return (
    <div
      style={{
        position: 'relative',
        width: pageSize.width || 'fit-content',
        marginBottom: 24,
        background: '#fff',
        boxShadow: '0 6px 40px rgba(0,0,0,0.7)',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {links.map((link) => (
        <a
          key={link.id}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          title={link.href}
          style={{
            position: 'absolute',
            left: link.left,
            top: link.top,
            width: link.width,
            height: link.height,
            background: 'rgba(37, 99, 235, 0.08)',
            border: '1px solid rgba(37, 99, 235, 0.18)',
            boxSizing: 'border-box',
          }}
        />
      ))}
    </div>
  );
}

export default function PdfViewer({ url, title, onClose }) {
  const [zoom, setZoom] = useState(100);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let task = null;

    const loadPdf = async () => {
      setLoading(true);
      setError('');
      setPdfDoc(null);
      setPageCount(0);

      task = pdfjsLib.getDocument({ url, withCredentials: false });
      const pdf = await task.promise;
      if (cancelled) {
        await pdf.destroy();
        return;
      }
      setPdfDoc(pdf);
      setPageCount(pdf.numPages);
      setLoading(false);
    };

    loadPdf().catch((err) => {
      if (!cancelled) {
        setError(normalizePdfError(err));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      if (task) {
        task.destroy();
      }
    };
  }, [url]);

  const scale = zoom / 100;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: '#1b1d27', display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px', height: 50, flexShrink: 0,
        background: '#111318', borderBottom: '1px solid #2a2d3a',
        color: '#e2e2e2',
      }}>
        {/* Filename + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </span>
          <span style={{ background: '#2a2d3a', color: '#99aabb', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 3, flexShrink: 0 }}>
            PDF
          </span>
        </div>

        {/* Zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => setZoom(z => Math.max(50, z - 10))}
            style={{ width: 30, height: 30, background: '#2a2d3a', border: 'none', color: '#e2e2e2', borderRadius: 4, cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
          >−</button>
          <span style={{ minWidth: 44, textAlign: 'center', fontSize: '0.85rem', color: '#e2e2e2' }}>{zoom}%</span>
          <button
            onClick={() => setZoom(z => Math.min(200, z + 10))}
            style={{ width: 30, height: 30, background: '#2a2d3a', border: 'none', color: '#e2e2e2', borderRadius: 4, cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
          >+</button>
          <button
            onClick={() => setZoom(100)}
            style={{ height: 30, padding: '0 12px', background: '#2a2d3a', border: 'none', color: '#e2e2e2', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}
          >Reset</button>
        </div>

        {/* Download + Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <a
            href={url}
            download
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              height: 32, padding: '0 14px',
              background: '#1a56db', color: '#fff',
              borderRadius: 5, textDecoration: 'none', fontSize: '0.82rem', fontWeight: 500,
            }}
          >
            <i className="bi bi-download me-1" />Download
          </a>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, background: 'transparent', border: 'none', color: '#99aabb', cursor: 'pointer', fontSize: '1.4rem', borderRadius: 4, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Close"
          >×</button>
        </div>
      </div>

      {/* ── PDF content ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '28px 20px' }}>
        {loading ? (
          <div style={{ color: '#e2e2e2', paddingTop: 80, fontSize: '0.95rem' }}>
            Loading PDF...
          </div>
        ) : error ? (
          <div style={{ color: '#fca5a5', paddingTop: 80, fontSize: '0.95rem', textAlign: 'center' }}>
            {error}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {Array.from({ length: pageCount }, (_, index) => (
              <PdfPage
                key={`${url}-${index + 1}-${zoom}`}
                pdf={pdfDoc}
                pageNumber={index + 1}
                scale={scale}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

