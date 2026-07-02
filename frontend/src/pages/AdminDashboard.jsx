import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSucs, getOccOfficials, getDateBoardMeetings, createDateBoardMeeting, updateDateBoardMeeting, deleteDateBoardMeeting, getAgendaStatusAll } from '../services/api';
import MeetingReminderModal from '../components/MeetingReminderModal';

function AdminDashboard({ user }) {
  const navigate = useNavigate();
  const [sucs, setSucs] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [agendaStatus, setAgendaStatus] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [alert, setAlert] = useState(null);
  const [filterOfficial, setFilterOfficial] = useState('');
  const [filterSuc, setFilterSuc] = useState('');
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

  // Returns a human-readable countdown relative to today (ignoring time)
  const getDaysLabel = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const meeting = new Date(dateStr + 'T00:00:00');
    const diff = Math.round((meeting - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return { label: 'Today!', color: '#dc2626', bg: 'rgba(220,38,38,0.10)' };
    if (diff > 0) return { label: `${diff} day${diff !== 1 ? 's' : ''} before board meeting`, color: '#b45309', bg: 'rgba(217,119,6,0.10)' };
    return { label: `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} ago`, color: '#64748b', bg: 'rgba(100,116,139,0.10)' };
  };

  const fetchSucs = async () => {
    try { const res = await getSucs(); setSucs(res.data); } catch { }
  };

  const fetchReminders = async () => {
    try {
      const res = await getDateBoardMeetings();
      setReminders(res.data);
    } catch { }
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

  const years = [...new Set(reminders.filter(r => r.meetingDate).map(r => r.meetingDate.split('-')[0]))].sort((a, b) => b - a);

  const filteredSucsForFilter = (user?.role === 'superadmin' && filterOfficial)
    ? sucs.filter((s) => s.occCode === filterOfficial)
    : sucs;

  const filteredReminders = reminders.filter((r) => {
    if (user?.role === 'superadmin' && filterOfficial) {
      const sr = sucs.find((s) => s.abbreviation === r.sucAbbreviation);
      if (!sr || sr.occCode !== filterOfficial) return false;
    }
    if (filterSuc && r.sucAbbreviation !== filterSuc) return false;
    if (filterYear && (!r.meetingDate || r.meetingDate.split('-')[0] !== filterYear)) return false;
    if (filterQuarter) {
      // filterQuarter is like '1st Quarter', '2nd Quarter', '1st Special', '2nd Special'
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

  const handleOfficialFilterChange = (e) => {
    setFilterOfficial(e.target.value);
    setFilterSuc('');
  };

  const hasActiveFilters = filterSuc || filterYear || filterQuarter || filterMeetingType || (user?.role === 'superadmin' && filterOfficial);

  const clearAllFilters = () => {
    setFilterOfficial('');
    setFilterSuc('');
    setFilterYear('');
    setFilterQuarter('');
    setFilterMeetingType('');
  };

  useEffect(() => {
    fetchSucs();
    fetchReminders();
    fetchAgendaStatus();
    getOccOfficials().then((res) => {
      if (user?.role === 'admin' && user?.occCode) {
        setOfficials(res.data.filter((o) => o.code === user.occCode));
      } else {
        setOfficials(res.data);
      }
    }).catch(() => { });
  }, []);

  const showMessage = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3500);
  };

  const handleReminderSave = async (data) => {
    try {
      if (selectedReminder) {
        await updateDateBoardMeeting(selectedReminder._id, data);
        showMessage('success', 'Reminder updated successfully');
      } else {
        await createDateBoardMeeting(data);
        showMessage('success', 'Reminder added successfully');
      }
      setShowReminderModal(false);
      setSelectedReminder(null);
      fetchReminders();
    } catch (err) {
      showMessage('danger', err.response?.data?.message || 'Failed to save reminder');
    }
  };

  const handleDeleteReminder = async (id) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await deleteDateBoardMeeting(id);
      showMessage('success', 'Reminder deleted');
      fetchReminders();
    } catch {
      showMessage('danger', 'Failed to delete reminder');
    }
  };

  // Stats
  const today = new Date().toISOString().split('T')[0];
  const upcomingCount = filteredReminders.filter(r => r.meetingDate && r.meetingDate > today).length;
  const pendingCount = filteredReminders.filter(r => checkAgendaStatus(r) === 'Pending').length;
  const uploadedCount = filteredReminders.filter(r => checkAgendaStatus(r) === 'Uploaded').length;

  return (
    <div>
      {/* Page header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="page-section-title mb-0">
            <i className="bi bi-speedometer2 me-2" style={{ color: 'var(--gold)' }} />
            Dashboard
          </h2>
          <p className="page-section-sub mb-0">
            Welcome back, <strong>{user?.fullname}</strong> — here's your overview.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setSelectedReminder(null); setShowReminderModal(true); }}
          id="add-reminder-btn"
        >
          <i className="bi bi-plus-lg" />
          Add Reminder
        </button>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} mb-4`} role="alert">
          <i className={`bi bi-${alert.type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2`} />
          {alert.msg}
        </div>
      )}

      {/* Stat cards */}
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

      {/* Main table card */}
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
              {/* CHED Official — superadmin only */}
              {user?.role === 'superadmin' && (
                <div className="col-md-4">
                  <div style={{ position: 'relative' }}>
                    <i className="bi bi-person-badge" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.82rem', zIndex: 1, pointerEvents: 'none' }} />
                    <select
                      className="form-select form-select-sm"
                      value={filterOfficial}
                      onChange={handleOfficialFilterChange}
                      id="filter-official"
                      style={{ paddingLeft: 28, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%232563eb' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', fontWeight: filterOfficial ? 600 : 400, borderColor: filterOfficial ? 'var(--accent)' : undefined }}
                    >
                      <option value="">All CHED Officials</option>
                      {officials.map((o) => (
                        <option key={o.code} value={o.code}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* SUC */}
              <div className={user?.role === 'superadmin' ? 'col-md-4' : 'col-md-3'}>
                <div style={{ position: 'relative' }}>
                  <i className="bi bi-building" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.82rem', zIndex: 1, pointerEvents: 'none' }} />
                  <select
                    className="form-select form-select-sm"
                    value={filterSuc}
                    onChange={(e) => setFilterSuc(e.target.value)}
                    id="filter-suc"
                    style={{ paddingLeft: 28, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%232563eb' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', fontWeight: filterSuc ? 600 : 400, borderColor: filterSuc ? 'var(--accent)' : undefined }}
                  >
                    <option value="">All SUCs</option>
                    {filteredSucsForFilter.map((s) => (
                      <option key={s._id} value={s.abbreviation}>{s.abbreviation} — {s.sucName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Year */}
              <div className={user?.role === 'superadmin' ? 'col-md-4' : 'col-md-3'}>
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
              <div className={user?.role === 'superadmin' ? 'col-md-4' : 'col-md-3'}>
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
              <div className={user?.role === 'superadmin' ? 'col-md-4' : 'col-md-3'}>
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
                  {user?.role === 'superadmin' && <th>CHED Official</th>}
                  <th>SUC</th>
                  <th>Meeting Date & Time</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Title</th>
                  <th>Notes</th>
                  <th>e-Agenda</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReminders.length === 0 ? (
                  <tr>
                    <td colSpan={user?.role === 'superadmin' ? 10 : 9}>
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
                    const sucRec = sucs.find((s) => s.abbreviation === r.sucAbbreviation);
                    return (
                      <tr key={r._id} className={isToday ? 'table-danger' : isUpcoming ? 'table-warning' : ''}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{idx + 1}</td>
                        {user?.role === 'superadmin' && (
                          <td style={{ fontSize: '0.82rem' }}>{sucRec ? sucRec.chedOfficial : '—'}</td>
                        )}
                        <td>
                          <strong style={{ color: 'var(--navy)' }}>{r.sucAbbreviation}</strong>
                          {r.sucName && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.sucName}</div>}
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
                          {r.meetingType ? (
                            <span
                              className="badge"
                              style={{
                                background: r.meetingType === 'Online' ? 'rgba(2,132,199,0.12)' : r.meetingType === 'Hybrid' ? 'rgba(124,58,237,0.12)' : 'rgba(5,150,105,0.12)',
                                color: r.meetingType === 'Online' ? '#0369a1' : r.meetingType === 'Hybrid' ? '#6d28d9' : '#047857',
                                border: `1px solid ${r.meetingType === 'Online' ? 'rgba(2,132,199,0.25)' : r.meetingType === 'Hybrid' ? 'rgba(124,58,237,0.25)' : 'rgba(5,150,105,0.25)'}`,
                              }}
                            >
                              <i className={`bi ${r.meetingType === 'Online' ? 'bi-camera-video-fill' : r.meetingType === 'Hybrid' ? 'bi-arrow-left-right' : 'bi-people-fill'} me-1`} />
                              {r.meetingType}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 180 }}>
                          {r.location
                            ? <span title={r.location}>{r.location.length > 32 ? r.location.slice(0, 32) + '…' : r.location}</span>
                            : '—'}
                        </td>
                        <td style={{ maxWidth: 200 }}>{r.title}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 160 }}>{r.notes || '—'}</td>
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
                                <i className={`bi ${st === 'Uploaded' ? 'bi-check-circle' : 'bi-clock'} me-1`} />
                                {st}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-warning"
                              title="Edit"
                              onClick={() => { setSelectedReminder(r); setShowReminderModal(true); }}
                              id={`edit-reminder-${r._id}`}
                            >
                              <i className="bi bi-pencil-square" />
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              title="Delete"
                              onClick={() => handleDeleteReminder(r._id)}
                              id={`delete-reminder-${r._id}`}
                            >
                              <i className="bi bi-trash3" />
                            </button>
                          </div>
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

      <MeetingReminderModal
        show={showReminderModal}
        onClose={() => { setShowReminderModal(false); setSelectedReminder(null); }}
        onSave={handleReminderSave}
        record={selectedReminder}
        sucs={sucs}
        officials={officials}
        reminders={reminders}
      />
    </div>
  );
}

export default AdminDashboard;
