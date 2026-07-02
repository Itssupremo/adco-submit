import { useState, useEffect } from 'react';
import { getSucs, getAgendaStatusAll, getDateBoardMeetings } from '../services/api';

const QUARTERS = ['1st', '2nd', '3rd', '4th'];
const SPECIAL_SLOTS = ['1st', '2nd'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const OCC_OFFICIALS = [
  { code: 'OCSCA', label: 'Chairperson Shirley C. Agrupis' },
  { code: 'OCDRA', label: 'Commissioner Desiderio R. Apag III' },
  { code: 'OCRPA', label: 'Commissioner Ricmar P. Aquino' },
  { code: 'OCMQM', label: 'Commissioner Myrna Q. Mallari' },
  { code: 'OCMAO', label: 'Commissioner Michelle Aguilar-Ong' },
];

const QUARTER_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed'];

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

function Analytics({ user }) {
  const [sucs, setSucs] = useState([]);
  const [uploadStatus, setUploadStatus] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedOfficial, setSelectedOfficial] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('1st');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sucsRes, statusRes, remindersRes] = await Promise.all([
          getSucs(),
          getAgendaStatusAll(),
          getDateBoardMeetings()
        ]);
        setSucs(sucsRes.data);
        setUploadStatus(statusRes.data);
        setReminders(remindersRes.data);
      } catch (err) {
        console.error('Failed to load analytics data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredSucs = selectedOfficial ? sucs.filter((s) => s.occCode === selectedOfficial) : sucs;
  const totalSucsCount = filteredSucs.length;
  const filteredSucAbbrevs = new Set(filteredSucs.map((s) => s.abbreviation));

  const currentYearStatus = uploadStatus.filter(
    (item) => item.year === selectedYear && filteredSucAbbrevs.has(item.sucAbbreviation)
  );

  const getStats = (type, timeKey, timeValue) => {
    const uploaded = currentYearStatus.filter((item) => {
      if (item.type !== type) return false;
      return item[timeKey] === timeValue;
    });
    const uploadedAbbrevs = new Set(uploaded.map((u) => u.sucAbbreviation));

    const pendingSucs = filteredSucs.filter((s) => {
      if (uploadedAbbrevs.has(s.abbreviation)) return false;

      // SUC only pending if they have a schedule set for this year, type, and quarter/slot
      const hasSchedule = reminders.some((r) => {
        if (r.sucAbbreviation !== s.abbreviation) return false;
        if (!r.meetingDate) return false;
        const rYear = parseInt(r.meetingDate.split('-')[0]);
        if (rYear !== selectedYear) return false;

        const title = r.title || '';
        if (type === 'regular' || type === 'minutes-regular') {
          return title.includes('Regular Board Meeting') && title.includes(`${timeValue} Quarter`);
        } else if (type === 'special') {
          return title.includes('Special Board Meeting') && title.endsWith(timeValue);
        } else if (type === 'minutes-special') {
          const slotPrefix = timeValue.split('-')[0]; // '1st' or '2nd'
          return title.includes('Special Board Meeting') && title.endsWith(slotPrefix);
        }
        return false;
      });

      return hasSchedule;
    });

    const uploadedList = uploaded.map((u) => u.sucAbbreviation).sort();
    const pendingList = pendingSucs.map((s) => s.abbreviation).sort();
    const totalRelevant = uploadedList.length + pendingList.length;
    const percentage = totalRelevant > 0 ? Math.round((uploadedList.length / totalRelevant) * 100) : 100;

    return {
      uploadedCount: uploadedList.length,
      percentage,
      uploadedList,
      pendingList,
    };
  };

  // Overall upload rate (Regular Agendas) across all quarters based on schedules/uploads
  const allRegularStats = QUARTERS.map(q => getStats('regular', 'quarter', q));
  const overallUploaded = allRegularStats.reduce((s, q) => s + q.uploadedCount, 0);
  const overallTotal = allRegularStats.reduce((s, q) => s + q.uploadedCount + q.pendingList.length, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallUploaded / overallTotal) * 100) : 100;

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

  const renderRateCard = (title, icon, type, items, timeKey, colorMap) => (
    <div className="card h-100">
      <div className="card-header bg-primary d-flex align-items-center gap-2">
        <i className={`bi ${icon}`} style={{ color: 'var(--gold-light)' }} />
        <span className="fw-semibold" style={{ fontSize: '0.95rem' }}>{title} — {selectedYear}</span>
      </div>
      <div className="card-body">
        {items.map((item, i) => {
          const stats = getStats(type, timeKey, item);
          const color = colorMap[i];
          const itemName = (type === 'regular' || type === 'minutes-regular')
            ? `${item} Quarter`
            : `${item.split('-')[0]} Special Meeting`;
          return (
            <div key={item} className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="d-flex align-items-center gap-2">
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: color, display: 'inline-block', flexShrink: 0,
                  }} />
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{itemName}</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {stats.uploadedCount}/{stats.uploadedCount + stats.pendingList.length}
                  </span>
                  <span style={{
                    fontWeight: 800, fontSize: '0.85rem', color,
                    background: `${color}12`, padding: '2px 10px',
                    borderRadius: 'var(--r-pill)',
                  }}>
                    {stats.percentage}%
                  </span>
                </div>
              </div>
              <ProgressBar pct={stats.percentage} color={color} />
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDetailedCard = (type, timeKey, item, color) => {
    const stats = getStats(type, timeKey, item);
    const itemName = (type === 'regular' || type === 'minutes-regular')
      ? `${item} Quarter`
      : `${item.split('-')[0]} Special Meeting`;

    return (
      <div className="card h-100">
        <div className="detailed-card-header" style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
          color: '#fff', border: 'none', padding: '0.9rem 1.4rem',
          fontWeight: 700,
        }}>
          <div className="d-flex justify-content-between align-items-center">
            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
              <i className="bi bi-calendar-event me-2" />{itemName}
            </span>
            <span style={{
              background: 'rgba(255,255,255,0.22)', color: '#fff',
              fontWeight: 800, fontSize: '0.8rem',
              padding: '3px 10px', borderRadius: 'var(--r-pill)',
            }}>{stats.percentage}%</span>
          </div>
        </div>
        <div className="card-body" style={{ fontSize: '0.84rem', padding: '1.25rem' }}>
          <div className="mb-3">
            <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              ✓ Uploaded ({stats.uploadedCount})
            </div>
            <div className="d-flex flex-wrap gap-1">
              {stats.uploadedList.length > 0 ? stats.uploadedList.map((abbr) => (
                <span key={abbr} style={{
                  background: 'rgba(5,150,105,0.09)', color: '#059669',
                  border: '1px solid rgba(5,150,105,0.2)',
                  padding: '2px 9px', borderRadius: 'var(--r-pill)',
                  fontSize: '0.72rem', fontWeight: 700,
                }}>{abbr}</span>
              )) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              ⚠ Pending ({stats.pendingList.length})
            </div>
            <div className="d-flex flex-wrap gap-1">
              {stats.pendingList.length > 0 ? stats.pendingList.map((abbr) => (
                <span key={abbr} style={{
                  background: 'rgba(220,38,38,0.07)', color: '#dc2626',
                  border: '1px solid rgba(220,38,38,0.18)',
                  padding: '2px 9px', borderRadius: 'var(--r-pill)',
                  fontSize: '0.72rem', fontWeight: 700,
                }}>{abbr}</span>
              )) : (
                <span style={{ color: '#059669', fontSize: '0.8rem', fontWeight: 700 }}>
                  <i className="bi bi-check-circle me-1" />All Uploaded!
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const quarterIndex = QUARTERS.indexOf(selectedQuarter);
  
  // Calculate stats for the selected quarter to show in summary cards
  const selectedStats = getStats('regular', 'quarter', selectedQuarter);
  const qUploaded = selectedStats.uploadedCount;
  const qPending = selectedStats.pendingList.length;
  const qScheduled = qUploaded + qPending;
  const qPct = selectedStats.percentage;

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="page-section-title mb-0">
            <i className="bi bi-bar-chart-line me-2" style={{ color: 'var(--gold)' }} />
            Analytics Dashboard
          </h2>
          <p className="page-section-sub mb-0">Upload compliance rates for {selectedYear}</p>
        </div>
      </div>

      {/* Top summary stats */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-navy">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Active SUCs</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{totalSucsCount}</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-building" /></div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-blue">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Scheduled ({selectedQuarter} Qtr)</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{qScheduled}</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-calendar3" /></div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-green">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Uploaded ({selectedQuarter} Qtr)</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{qUploaded}</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-file-earmark-check" /></div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-gold">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Compliance Rate</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{qPct}%</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-percent" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card mb-4">
        <div className="card-body" style={{ background: '#f8fafd', padding: '1rem 1.25rem' }}>
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Year</label>
              <select className="form-select form-select-sm" value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))} id="select-year">
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {user?.role === 'superadmin' && (
              <div className="col-md-5">
                <label className="form-label">Filter by CHED Official</label>
                <select className="form-select form-select-sm" value={selectedOfficial}
                  onChange={(e) => setSelectedOfficial(e.target.value)} id="filter-official">
                  <option value="">— All Officials —</option>
                  {OCC_OFFICIALS.map((o) => (
                    <option key={o.code} value={o.code}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Regular Board Meetings Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
          <h4 style={{ fontWeight: 800, color: 'var(--text-navy)', margin: 0 }}>
            <i className="bi bi-calendar-range me-2" style={{ color: 'var(--gold)' }} />
            Regular Board Meetings
          </h4>
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted fw-semibold me-2" style={{ fontSize: '0.88rem' }}>Quarter:</span>
            {QUARTERS.map((q) => {
              const isActive = selectedQuarter === q;
              const color = QUARTER_COLORS[QUARTERS.indexOf(q)];
              return (
                <button
                  key={q}
                  className={`btn btn-sm ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedQuarter(q)}
                  style={{
                    borderRadius: 'var(--r-pill)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    padding: '6px 14px',
                    backgroundColor: isActive ? color : 'var(--surface)',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${isActive ? color : 'var(--border)'}`,
                    boxShadow: isActive ? `0 4px 10px ${color}2d` : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {q} Quarter
                </button>
              );
            })}
          </div>
        </div>

        {/* Regular Rate Cards Side-by-Side */}
        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            {renderRateCard('Regular Board Agendas', 'bi-journal-check', 'regular', [selectedQuarter], 'quarter', [QUARTER_COLORS[quarterIndex]])}
          </div>
          <div className="col-lg-6">
            {renderRateCard('Regular Board Minutes', 'bi-file-earmark-text', 'minutes-regular', [selectedQuarter], 'slot', [QUARTER_COLORS[quarterIndex]])}
          </div>
        </div>

        {/* Regular Detailed Cards Side-by-Side */}
        <div className="row g-4">
          <div className="col-lg-6">
            <h5 className="mb-3" style={{ fontWeight: 700, color: 'var(--text-navy)', fontSize: '0.95rem' }}>
              <i className="bi bi-list-check me-2" style={{ color: 'var(--gold)' }} />
              Detailed SUC Upload Status (Regular Agendas)
            </h5>
            {renderDetailedCard('regular', 'quarter', selectedQuarter, QUARTER_COLORS[quarterIndex])}
          </div>
          <div className="col-lg-6">
            <h5 className="mb-3" style={{ fontWeight: 700, color: 'var(--text-navy)', fontSize: '0.95rem' }}>
              <i className="bi bi-list-check me-2" style={{ color: 'var(--gold)' }} />
              Detailed SUC Upload Status (Regular Minutes)
            </h5>
            {renderDetailedCard('minutes-regular', 'slot', selectedQuarter, QUARTER_COLORS[quarterIndex])}
          </div>
        </div>
      </div>

      {/* Special Board Meetings Section */}
      <div className="mt-5 pt-4 border-top mb-5">
        <h4 style={{ fontWeight: 800, color: 'var(--text-navy)', marginBottom: '1.5rem' }}>
          <i className="bi bi-star-fill me-2" style={{ color: 'var(--gold)' }} />
          Special Board Meetings
        </h4>

        {/* Special Rate Cards Side-by-Side */}
        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            {renderRateCard('Special Board Agendas', 'bi-journal-text', 'special', SPECIAL_SLOTS, 'slot', ['#0284c7', '#7c3aed'])}
          </div>
          <div className="col-lg-6">
            {renderRateCard('Special Board Minutes', 'bi-file-earmark-text-fill', 'minutes-special', ['1st-minutes', '2nd-minutes'], 'slot', ['#0284c7', '#7c3aed'])}
          </div>
        </div>

        {/* Special Detailed Cards Side-by-Side */}
        <div className="row g-4">
          <div className="col-lg-6">
            <h5 className="mb-3" style={{ fontWeight: 700, color: 'var(--text-navy)', fontSize: '0.95rem' }}>
              <i className="bi bi-list-check me-2" style={{ color: 'var(--gold)' }} />
              Detailed SUC Upload Status (Special Agendas)
            </h5>
            <div className="row g-3">
              {SPECIAL_SLOTS.map((slot, i) => (
                <div key={slot} className="col-12">
                  {renderDetailedCard('special', 'slot', slot, i === 0 ? '#0284c7' : '#7c3aed')}
                </div>
              ))}
            </div>
          </div>
          <div className="col-lg-6">
            <h5 className="mb-3" style={{ fontWeight: 700, color: 'var(--text-navy)', fontSize: '0.95rem' }}>
              <i className="bi bi-list-check me-2" style={{ color: 'var(--gold)' }} />
              Detailed SUC Upload Status (Special Minutes)
            </h5>
            <div className="row g-3">
              {['1st-minutes', '2nd-minutes'].map((slot, i) => (
                <div key={slot} className="col-12">
                  {renderDetailedCard('minutes-special', 'slot', slot, i === 0 ? '#0284c7' : '#7c3aed')}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Analytics;
