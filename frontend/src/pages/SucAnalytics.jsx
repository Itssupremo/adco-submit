import { useState, useEffect } from 'react';
import { getAgendaStatusAll, getDateBoardMeetings } from '../services/api';

const QUARTERS = ['1st', '2nd', '3rd', '4th'];
const SPECIAL_SLOTS = ['1st', '2nd'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const QUARTER_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed'];
const SPECIAL_COLORS = ['#0284c7', '#7c3aed'];

function ProgressBar({ pct, color }) {
  return (
    <div style={{
      height: 10, borderRadius: 999, background: '#e8eef8', overflow: 'hidden',
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        height: '100%', width: `${pct}%`, borderRadius: 999,
        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)',
      }} />
    </div>
  );
}

function SucAnalytics({ user }) {
  const [uploadStatus, setUploadStatus] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);

  const sucAbbr = user?.sucAbbreviation || '';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statusRes, remindersRes] = await Promise.all([
          getAgendaStatusAll(),
          getDateBoardMeetings(),
        ]);
        setUploadStatus(statusRes.data);
        setReminders(remindersRes.data);
      } catch (err) {
        console.error('Failed to load SUC analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Check if this SUC has a schedule for a given type/timeKey/timeValue
  const hasSchedule = (type, timeKey, timeValue) => {
    return reminders.some((r) => {
      if (r.sucAbbreviation !== sucAbbr) return false;
      if (!r.meetingDate) return false;
      const rYear = parseInt(r.meetingDate.split('-')[0]);
      if (rYear !== selectedYear) return false;
      const title = r.title || '';
      if (type === 'regular' || type === 'minutes-regular') {
        return title.includes('Regular Board Meeting') && title.includes(`${timeValue} Quarter`);
      } else if (type === 'special') {
        return title.includes('Special Board Meeting') && title.endsWith(timeValue);
      } else if (type === 'minutes-special') {
        const slotPrefix = timeValue.split('-')[0];
        return title.includes('Special Board Meeting') && title.endsWith(slotPrefix);
      }
      return false;
    });
  };

  // Check if this SUC has uploaded for a given type/timeKey/timeValue
  const hasUploaded = (type, timeKey, timeValue) => {
    return uploadStatus.some(
      (item) =>
        item.sucAbbreviation === sucAbbr &&
        item.year === selectedYear &&
        item.type === type &&
        item[timeKey] === timeValue
    );
  };

  // Get status for a specific slot: 'uploaded', 'pending', 'no-schedule'
  const getSlotStatus = (type, timeKey, timeValue) => {
    if (hasUploaded(type, timeKey, timeValue)) return 'uploaded';
    if (hasSchedule(type, timeKey, timeValue)) return 'pending';
    return 'no-schedule';
  };

  // Aggregate stats for a category
  const getCategoryStats = (type, timeKey, items) => {
    let uploaded = 0;
    let pending = 0;
    let noSchedule = 0;
    items.forEach((item) => {
      const status = getSlotStatus(type, timeKey, item);
      if (status === 'uploaded') uploaded++;
      else if (status === 'pending') pending++;
      else noSchedule++;
    });
    const total = uploaded + pending;
    const pct = total > 0 ? Math.round((uploaded / total) * 100) : 100;
    return { uploaded, pending, noSchedule, total, pct };
  };

  const regularAgendaStats = getCategoryStats('regular', 'quarter', QUARTERS);
  const regularMinutesStats = getCategoryStats('minutes-regular', 'slot', QUARTERS);
  const specialAgendaStats = getCategoryStats('special', 'slot', SPECIAL_SLOTS);
  const specialMinutesStats = getCategoryStats('minutes-special', 'slot', ['1st-minutes', '2nd-minutes']);

  const totalUploaded = regularAgendaStats.uploaded + regularMinutesStats.uploaded + specialAgendaStats.uploaded + specialMinutesStats.uploaded;
  const totalRequired = regularAgendaStats.total + regularMinutesStats.total + specialAgendaStats.total + specialMinutesStats.total;
  const overallPct = totalRequired > 0 ? Math.round((totalUploaded / totalRequired) * 100) : 100;

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: 360, gap: 14 }}>
        <div className="spinner-border" style={{ width: 44, height: 44, color: 'var(--text-navy)', borderWidth: 3 }} role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.88rem' }}>Loading analytics…</span>
      </div>
    );
  }

  const renderStatusBadge = (status) => {
    if (status === 'uploaded') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'rgba(5,150,105,0.09)', color: '#059669',
          border: '1px solid rgba(5,150,105,0.2)',
          padding: '4px 12px', borderRadius: 'var(--r-pill)',
          fontSize: '0.78rem', fontWeight: 700,
        }}>
          <i className="bi bi-check-circle-fill" /> Uploaded
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'rgba(220,38,38,0.07)', color: '#dc2626',
          border: '1px solid rgba(220,38,38,0.18)',
          padding: '4px 12px', borderRadius: 'var(--r-pill)',
          fontSize: '0.78rem', fontWeight: 700,
        }}>
          <i className="bi bi-hourglass-split" /> Pending
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'rgba(100,116,139,0.08)', color: '#64748b',
        border: '1px solid rgba(100,116,139,0.18)',
        padding: '4px 12px', borderRadius: 'var(--r-pill)',
        fontSize: '0.78rem', fontWeight: 700,
      }}>
        <i className="bi bi-dash-circle" /> No Schedule
      </span>
    );
  };

  const renderCategoryCard = (title, icon, type, timeKey, items, colors, stats) => (
    <div className="card h-100">
      <div className="card-header bg-primary d-flex align-items-center gap-2">
        <i className={`bi ${icon}`} style={{ color: 'var(--gold-light)' }} />
        <span className="fw-semibold" style={{ fontSize: '0.95rem' }}>{title} — {selectedYear}</span>
      </div>
      <div className="card-body">
        {/* Progress summary */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
            Overall Progress
          </span>
          <span style={{
            fontWeight: 800, fontSize: '0.85rem', color: stats.pct === 100 ? '#059669' : '#d97706',
            background: stats.pct === 100 ? 'rgba(5,150,105,0.1)' : 'rgba(217,119,6,0.1)',
            padding: '2px 10px', borderRadius: 'var(--r-pill)',
          }}>
            {stats.uploaded}/{stats.total} — {stats.pct}%
          </span>
        </div>
        <ProgressBar pct={stats.pct} color={stats.pct === 100 ? '#059669' : '#d97706'} />

        {/* Per-item breakdown */}
        <div className="mt-4">
          {items.map((item, i) => {
            const status = getSlotStatus(type, timeKey, item);
            const color = colors[i % colors.length];
            const label = (type === 'regular' || type === 'minutes-regular')
              ? `${item} Quarter`
              : `${item.split('-')[0]} Special Meeting`;
            return (
              <div key={item} className="d-flex justify-content-between align-items-center py-2"
                style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="d-flex align-items-center gap-2">
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: color, display: 'inline-block', flexShrink: 0,
                  }} />
                  <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>{label}</span>
                </div>
                {renderStatusBadge(status)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="page-section-title mb-0">
            <i className="bi bi-bar-chart-line me-2" style={{ color: 'var(--gold)' }} />
            My Analytics
          </h2>
          <p className="page-section-sub mb-0">
            Upload compliance overview for <strong>{sucAbbr || user?.fullname}</strong>
          </p>
        </div>
      </div>

      {/* Top summary stats */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-navy">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Total Required</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{totalRequired}</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-clipboard-data" /></div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-green">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Uploaded</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{totalUploaded}</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-file-earmark-check" /></div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-purple">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Pending</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{totalRequired - totalUploaded}</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-hourglass-split" /></div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-gold">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Compliance Rate</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{overallPct}%</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-percent" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Year Filter */}
      <div className="card mb-4">
        <div className="card-body" style={{ background: '#f8fafd', padding: '1rem 1.25rem' }}>
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Year</label>
              <select className="form-select form-select-sm" value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))} id="suc-select-year">
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Regular Board Meetings */}
      <div className="mb-5">
        <h4 style={{ fontWeight: 800, color: 'var(--text-navy)', marginBottom: '1.25rem' }}>
          <i className="bi bi-calendar-range me-2" style={{ color: 'var(--gold)' }} />
          Regular Board Meetings
        </h4>
        <div className="row g-4">
          <div className="col-lg-6">
            {renderCategoryCard('Regular Board Agendas', 'bi-journal-check', 'regular', 'quarter', QUARTERS, QUARTER_COLORS, regularAgendaStats)}
          </div>
          <div className="col-lg-6">
            {renderCategoryCard('Regular Board Minutes', 'bi-file-earmark-text', 'minutes-regular', 'slot', QUARTERS, QUARTER_COLORS, regularMinutesStats)}
          </div>
        </div>
      </div>

      {/* Special Board Meetings */}
      <div className="mt-5 pt-4 border-top mb-5">
        <h4 style={{ fontWeight: 800, color: 'var(--text-navy)', marginBottom: '1.25rem' }}>
          <i className="bi bi-star-fill me-2" style={{ color: 'var(--gold)' }} />
          Special Board Meetings
        </h4>
        <div className="row g-4">
          <div className="col-lg-6">
            {renderCategoryCard('Special Board Agendas', 'bi-journal-text', 'special', 'slot', SPECIAL_SLOTS, SPECIAL_COLORS, specialAgendaStats)}
          </div>
          <div className="col-lg-6">
            {renderCategoryCard('Special Board Minutes', 'bi-file-earmark-text-fill', 'minutes-special', 'slot', ['1st-minutes', '2nd-minutes'], SPECIAL_COLORS, specialMinutesStats)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SucAnalytics;
