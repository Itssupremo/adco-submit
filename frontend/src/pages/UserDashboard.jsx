import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDateBoardMeetings, getAgendaStatusAll } from '../services/api';

function UserDashboard({ user }) {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [agendaStatus, setAgendaStatus] = useState([]);
  const [alert, setAlert] = useState(null);

  const [filterYear, setFilterYear] = useState('');
  const [filterQuarter, setFilterQuarter] = useState('');
  const [filterMeetingType, setFilterMeetingType] = useState('');

  const formatDate = (val) => {
    if (!val) return '—';
    const parts = val.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const m = parseInt(parts[1], 10) - 1;
      if (m >= 0 && m < 12) return `${months[m]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
    }
    return val;
  };

  const formatTime = (val) => {
    if (!val) return '';
    const [h, m] = val.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return val;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const getDaysLabel = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const meeting = new Date(dateStr + 'T00:00:00');
    const diff = Math.round((meeting - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return { label: 'Today!', color: 'var(--danger-label-color)', bg: 'var(--danger-label-bg)' };
    if (diff > 0) return { label: `${diff} day${diff !== 1 ? 's' : ''} before board meeting`, color: 'var(--warning-label-color)', bg: 'var(--warning-label-bg)' };
    return { label: `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} ago`, color: 'var(--muted-label-color)', bg: 'var(--muted-label-bg)' };
  };

  const fetchReminders = async () => {
    try {
      const res = await getDateBoardMeetings();
      let data = res.data;
      if (['user', 'board_member'].includes(user?.role) && user?.sucAbbreviation) {
        data = data.filter(r => r.sucAbbreviation === user.sucAbbreviation);
      }
      setReminders(data);
    } catch {
      setAlert({ type: 'danger', msg: 'Failed to load reminders' });
    }
  };

  const fetchAgendaStatus = async () => {
    try {
      const res = await getAgendaStatusAll();
      setAgendaStatus(res.data);
    } catch { }
  };

  const checkAgendaStatus = (reminder) => {
    if (!reminder.meetingDate) return 'Pending';
    const year = parseInt(reminder.meetingDate.split('-')[0]);
    const title = reminder.title;
    if (title.startsWith('Regular Board Meeting')) {
      const match = title.match(/(1st|2nd|3rd|4th) Quarter/);
      if (!match) return 'Pending';
      return agendaStatus.some(
        (s) => s.type === 'regular' && s.sucAbbreviation === reminder.sucAbbreviation && s.year === year && s.quarter === match[1]
      ) ? 'Uploaded' : 'Pending';
    }
    if (title.startsWith('Special Board Meeting')) {
      const match = title.match(/- (1st|2nd)$/);
      if (!match) return 'Pending';
      return agendaStatus.some(
        (s) => s.type === 'special' && s.sucAbbreviation === reminder.sucAbbreviation && s.year === year && s.slot === match[1]
      ) ? 'Uploaded' : 'Pending';
    }
    return 'Pending';
  };

  const handleStatusClick = (reminder) => {
    if (!reminder.title) return;
    const year = reminder.meetingDate ? reminder.meetingDate.split('-')[0] : new Date().getFullYear();
    if (reminder.title.startsWith('Regular Board Meeting')) {
      const match = reminder.title.match(/(1st|2nd|3rd|4th) Quarter/);
      const quarter = match ? match[1] : null;
      navigate('/admin/regular-board', {
        state: {
          sucAbbreviation: reminder.sucAbbreviation,
          year: year,
          quarter: quarter
        }
      });
    } else if (reminder.title.startsWith('Special Board Meeting')) {
      const match = reminder.title.match(/- (1st|2nd)$/);
      const slot = match ? match[1] : null;
      navigate('/admin/special-board', {
        state: {
          sucAbbreviation: reminder.sucAbbreviation,
          year: year,
          slot: slot
        }
      });
    }
  };

  useEffect(() => {
    fetchReminders();
    fetchAgendaStatus();
  }, []);

  const years = [...new Set(reminders.filter(r => r.meetingDate).map(r => r.meetingDate.split('-')[0]))].sort((a, b) => b - a);

  const filteredReminders = reminders.filter((r) => {
    if (filterYear && (!r.meetingDate || r.meetingDate.split('-')[0] !== filterYear)) return false;
    if (filterQuarter) {
      if (filterQuarter.includes('Special')) {
        const slot = filterQuarter.replace(' Special', '');
        if (!r.title || !r.title.startsWith('Special Board Meeting') || !r.title.endsWith(slot)) return false;
      } else {
        if (!r.title || !r.title.includes(filterQuarter)) return false;
      }
    }
    if (filterMeetingType && r.meetingType !== filterMeetingType) return false;
    return true;
  });

  const sortedReminders = [...filteredReminders].sort((a, b) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const dateA = a.meetingDate || '';
    const dateB = b.meetingDate || '';

    const isUpcomingOrTodayA = dateA >= todayStr;
    const isUpcomingOrTodayB = dateB >= todayStr;

    if (isUpcomingOrTodayA && !isUpcomingOrTodayB) return -1;
    if (!isUpcomingOrTodayA && isUpcomingOrTodayB) return 1;

    if (isUpcomingOrTodayA && isUpcomingOrTodayB) {
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.meetingTime || '').localeCompare(b.meetingTime || '');
    } else {
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.meetingTime || '').localeCompare(a.meetingTime || '');
    }
  });

  const hasActiveFilters = filterYear || filterQuarter || filterMeetingType;

  const clearAllFilters = () => {
    setFilterYear('');
    setFilterQuarter('');
    setFilterMeetingType('');
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingCount = filteredReminders.filter(r => r.meetingDate && r.meetingDate > todayStr).length;
  const pendingCount = filteredReminders.filter(r => checkAgendaStatus(r) === 'Pending').length;
  const uploadedCount = filteredReminders.filter(r => checkAgendaStatus(r) === 'Uploaded').length;

  return (
    <div>
      {/* Page header */}
      <div className="mb-4">
        <h2 className="page-section-title mb-0">
          <i className="bi bi-house-door me-2" style={{ color: 'var(--gold)' }} />
          My Dashboard
        </h2>
        <p className="page-section-sub mb-0">
          Welcome back, <strong>{user?.fullname}</strong> — {user?.sucAbbreviation || 'SUC'} overview.
        </p>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} mb-3`}>
          <i className="bi bi-exclamation-circle me-2" />{alert.msg}
        </div>
      )}

      {/* Stats */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-navy">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Total Reminders</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{filteredReminders.length}</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-bell-fill" /></div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-blue">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Upcoming</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{upcomingCount}</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-calendar-event-fill" /></div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-purple">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Upload Pending</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{pendingCount}</div>
              </div>
              <div className="stat-card-icon">
                <i className="bi bi-hourglass-split" />
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-green">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Uploaded Agenda</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{uploadedCount}</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-file-earmark-check-fill" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="card">
        <div className="card-header bg-primary d-flex justify-content-between align-items-center">
          <h5 className="mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-bell-fill" />
            Board Meeting Reminders
          </h5>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.28)' }}>
            {filteredReminders.length} record{filteredReminders.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="card-body">
          {/* ── Filter Bar ── */}
          <div style={{ background: '#f8fafd', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: 16 }}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <i className="bi bi-funnel-fill" style={{ color: 'var(--accent)', fontSize: '0.8rem' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Filters</span>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 6 }}
                >
                  <i className="bi bi-x-circle" /> Clear all
                </button>
              )}
            </div>
            <div className="row g-2">
              {/* Year */}
              <div className="col-md-4">
                <div style={{ position: 'relative' }}>
                  <i className="bi bi-calendar3" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.82rem', zIndex: 1, pointerEvents: 'none' }} />
                  <select
                    className="form-select form-select-sm"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    id="filter-year"
                    style={{ paddingLeft: 28, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%232563eb' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', fontWeight: filterYear ? 600 : 400, borderColor: filterYear ? 'var(--accent)' : undefined }}
                  >
                    <option value="">All Years</option>
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quarter */}
              <div className="col-md-4">
                <div style={{ position: 'relative' }}>
                  <i className="bi bi-grid-3x3-gap" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.82rem', zIndex: 1, pointerEvents: 'none' }} />
                  <select
                    className="form-select form-select-sm"
                    value={filterQuarter}
                    onChange={(e) => setFilterQuarter(e.target.value)}
                    id="filter-quarter"
                    style={{ paddingLeft: 28, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%232563eb' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', fontWeight: filterQuarter ? 600 : 400, borderColor: filterQuarter ? 'var(--accent)' : undefined }}
                  >
                    <option value="">All Quarters</option>
                    <optgroup label="Regular Board Meeting">
                      <option value="1st Quarter">1st Quarter</option>
                      <option value="2nd Quarter">2nd Quarter</option>
                      <option value="3rd Quarter">3rd Quarter</option>
                      <option value="4th Quarter">4th Quarter</option>
                    </optgroup>
                    <optgroup label="Special Board Meeting">
                      <option value="1st Special">1st Special</option>
                      <option value="2nd Special">2nd Special</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Meeting Type */}
              <div className="col-md-4">
                <div style={{ position: 'relative' }}>
                  <i className="bi bi-camera-video" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.82rem', zIndex: 1, pointerEvents: 'none' }} />
                  <select
                    className="form-select form-select-sm"
                    value={filterMeetingType}
                    onChange={(e) => setFilterMeetingType(e.target.value)}
                    id="filter-meeting-type"
                    style={{ paddingLeft: 28, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%232563eb' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', fontWeight: filterMeetingType ? 600 : 400, borderColor: filterMeetingType ? 'var(--accent)' : undefined }}
                  >
                    <option value="">All Meeting Types</option>
                    <option value="Face-to-Face">👥 Face-to-Face</option>
                    <option value="Online">🎥 Online</option>
                    <option value="Hybrid">🔀 Hybrid</option>
                  </select>
                </div>
              </div>

            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle mb-0" id="reminders-table">
              <thead>
                <tr>
                  <th style={{ width: 42 }}>#</th>
                  <th>Title</th>
                  <th>Meeting Date & Time</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>e-Agenda Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredReminders.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <i className="bi bi-calendar-x empty-state-icon" />
                        <span className="empty-state-text">No reminders found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedReminders.map((r, idx) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isPast = r.meetingDate && r.meetingDate < todayStr;
                    const isToday = r.meetingDate === todayStr;
                    const isUpcoming = r.meetingDate && r.meetingDate > todayStr;
                    return (
                      <tr key={r._id} className={isToday ? 'table-danger' : isUpcoming ? 'table-warning' : ''}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</div>
                          {r.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{r.notes}</div>}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDate(r.meetingDate)}</span>
                          {r.meetingTime && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                              <i className="bi bi-clock me-1" />{formatTime(r.meetingTime)}
                            </div>
                          )}
                          {(() => {
                            const dl = getDaysLabel(r.meetingDate);
                            return dl ? (
                              <div
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  marginTop: 5, fontSize: '0.7rem', fontWeight: 700,
                                  color: dl.color, background: dl.bg,
                                  border: `1px solid ${dl.color}30`,
                                  borderRadius: 20, padding: '2px 8px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <i className={`bi ${dl.label === 'Today!' ? 'bi-alarm-fill' : dl.label.includes('ago') ? 'bi-check-circle-fill' : 'bi-hourglass-split'}`} />
                                {dl.label}
                              </div>
                            ) : null;
                          })()}
                          <div style={{ marginTop: 3 }}>
                            {isPast && <span className="badge bg-success">Done</span>}
                            {isToday && <span className="badge bg-danger">TODAY</span>}
                            {isUpcoming && <span className="badge bg-warning">Upcoming</span>}
                          </div>
                        </td>
                        <td>
                          {r.meetingType === 'Online' && <span className="badge" style={{ background: 'var(--online-bg)', color: 'var(--online-color)', border: '1px solid var(--online-color)30' }}><i className="bi bi-camera-video-fill me-1" />Online</span>}
                          {r.meetingType === 'Face-to-Face' && <span className="badge" style={{ background: 'var(--f2f-bg)', color: 'var(--f2f-color)', border: '1px solid var(--f2f-color)30' }}><i className="bi bi-people-fill me-1" />Face-to-Face</span>}
                          {r.meetingType === 'Hybrid' && <span className="badge" style={{ background: 'var(--hybrid-bg)', color: 'var(--hybrid-color)', border: '1px solid var(--hybrid-color)30' }}><i className="bi bi-diagram-2-fill me-1" />Hybrid</span>}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <i className="bi bi-geo-alt-fill me-1" style={{ color: 'var(--text-muted)' }} />
                            {r.location || '—'}
                          </div>
                        </td>
                        <td>
                          {(() => {
                            const st = checkAgendaStatus(r);
                            const isLinkable = r.title && (r.title.startsWith('Regular Board Meeting') || r.title.startsWith('Special Board Meeting'));
                            return (
                              <span
                                className={`badge ${st === 'Uploaded' ? 'bg-success' : 'bg-secondary'}`}
                                style={isLinkable ? { cursor: 'pointer', transition: 'all 0.2s' } : {}}
                                onClick={() => isLinkable && handleStatusClick(r)}
                                title={isLinkable ? `Go to upload page for this meeting` : undefined}
                                onMouseEnter={(e) => { if (isLinkable) { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)'; } }}
                                onMouseLeave={(e) => { if (isLinkable) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; } }}
                              >
                                <i className={`bi ${st === 'Uploaded' ? 'bi-check-circle' : 'bi-hourglass-split'} me-1`} />
                                {st}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
