import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deactivateUser, getAdminSettings, updateSessionTimeout } from '../services/api';
import { validateEmail, validatePassword } from '../utils/validation';
import './UserManagement.css';
export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    
    // Modals state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Form inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('staff');
    const [formError, setFormError] = useState('');

    // Security Settings
    const [sessionTimeout, setSessionTimeout] = useState(30);
    const [savingTimeout, setSavingTimeout] = useState(false);
    const [timeoutSaved, setTimeoutSaved] = useState(false);

    const rolesAvailable = [
        'admin', 'staff', 'inventory_manager', 
        'forecast_manager', 'sales_manager', 
        'product_manager', 'report_analyst'
    ];

    useEffect(() => { 
        loadUsers(); 
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const settings = await getAdminSettings();
            if (settings && settings.session_timeout_minutes) {
                setSessionTimeout(settings.session_timeout_minutes);
            }
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    };

    const loadUsers = async () => {
        try {
            setLoading(true); setErr('');
            setUsers(await getUsers());
        } catch (e) { setErr(e.message); }
        finally { setLoading(false); }
    };

    const handleCreateUser = async () => {
        try {
            setFormError('');
            
            const emailErr = validateEmail(email);
            const passErr = validatePassword(password);
            
            if (emailErr || passErr) {
                return setFormError(emailErr || passErr);
            }
            
            await createUser({ email, password, role });
            setIsAddModalOpen(false);
            resetForm();
            loadUsers();
        } catch (e) {
            setFormError("Failed to create user: " + e.message);
        }
    };

    const handleUpdateRole = async () => {
        try {
            setFormError('');
            await updateUser(selectedUser.uid, { role });
            setIsEditModalOpen(false);
            resetForm();
            loadUsers();
        } catch (e) {
            setFormError("Failed to update: " + e.message);
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            if (user.active) {
                // If active, we deactivate
                await deactivateUser(user.uid);
            } else {
                // If inactive, we re-activate via update
                await updateUser(user.uid, { active: true });
            }
            loadUsers();
        } catch (e) {
            setErr("Status change failed: " + e.message);
        }
    };

    const handleTimeoutChange = async (e) => {
        const val = parseInt(e.target.value);
        setSessionTimeout(val);
        setSavingTimeout(true);
        setTimeoutSaved(false);
        try {
            await updateSessionTimeout(val);
            setTimeoutSaved(true);
            setTimeout(() => setTimeoutSaved(false), 3000);
        } catch (err) {
            setErr("Failed to update session timeout: " + err.message);
        } finally {
            setSavingTimeout(false);
        }
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setRole('staff');
        setSelectedUser(null);
        setFormError('');
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setRole(user.role);
        setIsEditModalOpen(true);
    };

    const openAddModal = () => {
        resetForm();
        setIsAddModalOpen(true);
    };

    if (loading) return <div className="p-8 text-center" style={{color: '#8b5cf6'}}>Decrypting User Matrix...</div>;

    return (
        <div className="user-wrap">

            <div className="blob1" style={{background: 'radial-gradient(circle, rgba(139, 92, 246, .05) 0%, transparent 70%)'}} />
            
            <main style={{ padding: '0 40px' }}>
                <div className="page-header" style={{ marginTop: '40px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>

                        <h1 className="page-title" style={{textShadow: '0 0 30px rgba(139,92,246,.3)'}}>USER <span>MANAGEMENT</span></h1>
                        <div className="title-bar" style={{ background: 'linear-gradient(90deg, #8b5cf6, transparent)', boxShadow: '0 0 10px rgba(139,92,246,.4)' }} />
                    </div>
                    <button className="add-btn" onClick={openAddModal}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        INITIALIZE NEW USER
                    </button>
                </div>

                {/* SECURITY SETTINGS PANEL */}
                <div style={{ background: 'linear-gradient(135deg, rgba(12,12,22,.98), rgba(20,8,35,.98))', border: '1px solid rgba(139,92,246,.4)', borderRadius: '12px', padding: '24px', marginBottom: '32px', animation: 'fadeInUp .4s ease both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '18px' }}>🔐</span>
                        <h2 style={{ fontFamily: "'Outfit', monospace", fontSize: '14px', color: '#e2e8f0', letterSpacing: '2px', margin: 0 }}>GLOBAL SECURITY SETTINGS</h2>
                    </div>
                    
                    <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a78bfa', fontFamily: "'Outfit', monospace", marginBottom: '12px', letterSpacing: '1px' }}>
                            <span>IDLE SESSION TIMEOUT</span>
                            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{sessionTimeout} MINUTES</span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <input 
                                type="range" 
                                min="5" max="120" step="5" 
                                value={sessionTimeout} 
                                onChange={handleTimeoutChange}
                                disabled={savingTimeout}
                                style={{ flex: 1, accentColor: '#8b5cf6', cursor: savingTimeout ? 'wait' : 'pointer' }} 
                            />
                            <div style={{ width: '100px', fontSize: '11px', fontFamily: "'Outfit', monospace", fontWeight: 'bold', letterSpacing: '1px', color: timeoutSaved ? '#22c55e' : (savingTimeout ? '#a78bfa' : 'transparent'), transition: 'color 0.3s' }}>
                                {savingTimeout ? 'SAVING...' : (timeoutSaved ? '✓ SAVED' : '')}
                            </div>
                        </div>
                        <p style={{ fontSize: '11px', color: 'rgba(226,232,240,.5)', marginTop: '12px', fontFamily: "'Outfit', monospace", lineHeight: '1.5' }}>
                            Users will be automatically logged out after this period of inactivity. Changes apply immediately and are enforced system-wide.
                        </p>
                    </div>
                </div>

                {err ? <div className="text-red-500 mb-4 bg-red-900/20 p-4 border border-red-500">{err}</div> : null}

                <div className="cards-grid">
                    {users.map((u, i) => (
                        <div key={u.uid} className="user-card" style={{ animationDelay: `${(i % 9) * 0.05}s` }}>
                            <div className="card-top">
                                <div className="card-email" title={u.email}>{u.email}</div>
                                <div className="user-badge" style={{color: u.active ? '#22c55e' : '#ef4444', borderColor: u.active ? '#22c55e' : '#ef4444', background: u.active ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)'}}>
                                    {u.active ? 'ACTIVE' : 'INACTIVE'}
                                </div>
                            </div>
                            <div className="card-uid">UID: {u.uid}</div>
                            
                            <div className="stat-block">
                                <div className="stat-label-sm">System Role</div>
                                <div className="stat-val-sm">{u.role.toUpperCase()}</div>
                            </div>

                            <div className="divider" />

                            <div className="card-bottom">
                                <button className="action-btn" style={{color: '#a78bfa'}} onClick={() => openEditModal(u)}>
                                    EDIT ROLE
                                </button>
                                <button 
                                    className={`action-btn ${u.active ? 'danger' : 'success'}`} 
                                    onClick={() => handleToggleStatus(u)}
                                >
                                    {u.active ? 'DEACTIVATE' : 'REACTIVATE'}
                                </button>
                            </div>
                        </div>
                    ))}
                    {users.length === 0 && <div className="text-center w-full" style={{gridColumn: '1 / -1', color: '#a78bfa'}}>No users found.</div>}
                </div>
            </main>

            {/* ADD USER MODAL */}
            {isAddModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-content-glow" />
                        <h2>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' }}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                            </div>
                            INITIALIZE USER
                        </h2>
                        
                        {formError && <div style={{ background: 'rgba(239,68,68,.1)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(239,68,68,.3)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '16px' }}>⚠️</span> {formError}</div>}
                        
                        <div className="form-group">
                            <label>
                                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                USER EMAIL
                            </label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="operative@system.com" />
                        </div>
                        <div className="form-group">
                            <label>
                                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                TEMPORARY PASSWORD
                            </label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                        </div>
                        <div className="form-group">
                            <label>
                                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                ASSIGN ROLE
                            </label>
                            <select value={role} onChange={e => setRole(e.target.value)}>
                                {rolesAvailable.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setIsAddModalOpen(false)}>CANCEL</button>
                            <button className="add-btn" onClick={handleCreateUser}>GRANT ACCESS</button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT USER ROLE MODAL */}
            {isEditModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-content-glow" />
                        <h2>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' }}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                            </div>
                            MODIFY CLEARANCE
                        </h2>
                        
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }} />
                            <div style={{ fontSize: '13px', color: '#cbd5e1', fontFamily: "'Inter', sans-serif" }}>Target: <strong style={{ color: '#fff', letterSpacing: '0.5px' }}>{selectedUser?.email}</strong></div>
                        </div>

                        {formError && <div style={{ background: 'rgba(239,68,68,.1)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(239,68,68,.3)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '16px' }}>⚠️</span> {formError}</div>}
                        
                        <div className="form-group">
                            <label>
                                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                UPDATE ROLE
                            </label>
                            <select value={role} onChange={e => setRole(e.target.value)}>
                                {rolesAvailable.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setIsEditModalOpen(false)}>ABORT</button>
                            <button className="add-btn" onClick={handleUpdateRole}>CONFIRM CHANGE</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
