/* ============================================
   NOTES PRO V2 - Application JavaScript
   ============================================ */

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = 'https://rnjcrfsrqunnpafuekrp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuamNyZnNycXVubnBhZnVla3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjA3NzksImV4cCI6MjA4MzczNjc3OX0.H7LVxvbsMBllG-WDVOxC5n5EQjIbVdt23jJt7g99rrI';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// STATE
// ============================================

let allNotes = [];
let allClips = [];
let currentNoteId = null;
let noteToDelete = null;
let deferredInstallPrompt = null;
let currentDeviceFilter = 'all';

// ============================================
// DOM ELEMENTS
// ============================================

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Auth
const authSection = $('#auth-section');
const notesSection = $('#notes-section');
const authForm = $('#auth-form');
const loginBtn = $('#login-btn');
const signupBtn = $('#signup-btn');
const logoutBtn = $('#logout-btn');
const authError = $('#auth-error');
const emailInput = $('#email');
const passwordInput = $('#password');
const togglePasswordBtn = $('#toggle-password');
const rememberMeCheckbox = $('#remember-me');

// Notes
const notesList = $('#notes-list');
const emptyState = $('#empty-state');
const noResults = $('#no-results');
const searchInput = $('#search-input');
const clearSearchBtn = $('#clear-search');
const sortSelect = $('#sort-select');
const newNoteBtn = $('#new-note-btn');
const notesCount = $('#notes-count');
const pinnedCount = $('#pinned-count');

// Note Modal
const noteModal = $('#note-modal');
const noteForm = $('#note-form');
const modalTitle = $('#modal-title');
const noteIdInput = $('#note-id');
const noteTitleInput = $('#note-title');
const noteContentInput = $('#note-content');
const titleCount = $('#title-count');
const contentCount = $('#content-count');
const closeModalBtn = $('#close-modal');
const cancelBtn = $('#cancel-btn');
const saveBtn = $('#save-btn');
const colorBtns = $$('.color-btn');

// Delete Modal
const deleteModal = $('#delete-modal');
const cancelDeleteBtn = $('#cancel-delete');
const confirmDeleteBtn = $('#confirm-delete');

// Reset Password Modal
const resetModal = $('#reset-modal');
const resetForm = $('#reset-form');
const resetEmailInput = $('#reset-email');
const forgotPasswordBtn = $('#forgot-password-btn');
const closeResetModalBtn = $('#close-reset-modal');
const cancelResetBtn = $('#cancel-reset');
const sendResetBtn = $('#send-reset-btn');

// New Password Modal (after recovery)
const newPasswordModal = $('#new-password-modal');
const newPasswordForm = $('#new-password-form');
const newPasswordInput = $('#new-password');
const confirmPasswordInput = $('#confirm-password');
const savePasswordBtn = $('#save-password-btn');

// Theme
const themeToggle = $('#theme-toggle');

// PWA
const installPrompt = $('#install-prompt');
const installDismiss = $('#install-dismiss');
const installAccept = $('#install-accept');

// Toast
const toastContainer = $('#toast-container');

// Tabs
const tabBtns = $$('.tab-btn');
const tabNotes = $('#tab-notes');
const tabClipboard = $('#tab-clipboard');

// Clipboard
const clipsList = $('#clips-list');
const clipSearchInput = $('#clip-search-input');
const clearClipSearchBtn = $('#clear-clip-search');
const deviceFilter = $('#device-filter');
const refreshClipsBtn = $('#refresh-clips-btn');
const clipsCount = $('#clips-count');
const clipsDevice = $('#clips-device');
const emptyClips = $('#empty-clips');

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    lucide.createIcons();

    // Load theme preference
    loadTheme();

    // Check for password recovery in URL
    checkPasswordRecovery();

    // Check authentication
    checkUser();

    // Setup event listeners
    setupEventListeners();

    // Setup PWA
    setupPWA();
});

// ============================================
// EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
    // Auth
    authForm.addEventListener('submit', handleLogin);
    signupBtn.addEventListener('click', handleSignup);
    logoutBtn.addEventListener('click', handleLogout);
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);

    // Theme
    themeToggle.addEventListener('click', toggleTheme);

    // Search & Sort
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    clearSearchBtn.addEventListener('click', clearSearch);
    sortSelect.addEventListener('change', handleSort);

    // Notes
    newNoteBtn.addEventListener('click', () => openNoteModal());
    noteForm.addEventListener('submit', handleSaveNote);
    closeModalBtn.addEventListener('click', closeNoteModal);
    cancelBtn.addEventListener('click', closeNoteModal);
    noteModal.querySelector('.modal-backdrop').addEventListener('click', closeNoteModal);

    // Character counters
    noteTitleInput.addEventListener('input', () => {
        titleCount.textContent = noteTitleInput.value.length;
    });
    noteContentInput.addEventListener('input', () => {
        contentCount.textContent = noteContentInput.value.length;
    });

    // Color picker
    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Delete modal
    deleteModal.querySelector('.modal-backdrop').addEventListener('click', closeDeleteModal);
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    confirmDeleteBtn.addEventListener('click', confirmDelete);

    // Reset password modal
    forgotPasswordBtn.addEventListener('click', openResetModal);
    resetModal.querySelector('.modal-backdrop').addEventListener('click', closeResetModal);
    closeResetModalBtn.addEventListener('click', closeResetModal);
    cancelResetBtn.addEventListener('click', closeResetModal);
    resetForm.addEventListener('submit', handleResetPassword);

    // New password modal (after recovery)
    newPasswordForm.addEventListener('submit', handleNewPassword);

    // PWA Install
    installDismiss.addEventListener('click', dismissInstallPrompt);
    installAccept.addEventListener('click', acceptInstallPrompt);

    // Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Clipboard
    if (clipSearchInput) {
        clipSearchInput.addEventListener('input', debounce(handleClipSearch, 300));
    }
    if (clearClipSearchBtn) {
        clearClipSearchBtn.addEventListener('click', clearClipSearch);
    }
    if (deviceFilter) {
        deviceFilter.addEventListener('change', handleDeviceFilter);
    }
    if (refreshClipsBtn) {
        refreshClipsBtn.addEventListener('click', loadClips);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Auth state changes
    db.auth.onAuthStateChange((event, session) => {
        // Check for password recovery
        handleAuthStateForRecovery(event);

        if (event === 'SIGNED_IN') {
            showNotesSection();
            loadNotes();
        } else if (event === 'SIGNED_OUT') {
            showAuthSection();
        }
    });
}

// ============================================
// AUTHENTICATION
// ============================================

async function checkUser() {
    const { data: { user } } = await db.auth.getUser();

    if (user) {
        showNotesSection();
        loadNotes();
    } else {
        showAuthSection();
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showAuthError('Remplis tous les champs');
        return;
    }

    setButtonLoading(loginBtn, true);
    showAuthError('');

    const { data, error } = await db.auth.signInWithPassword({
        email,
        password
    });

    setButtonLoading(loginBtn, false);

    if (error) {
        showAuthError(translateAuthError(error.message));
        return;
    }

    showNotesSection();
    loadNotes();
    showToast('Connexion réussie !', 'success');
}

async function handleSignup() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showAuthError('Remplis tous les champs');
        return;
    }

    if (password.length < 6) {
        showAuthError('Le mot de passe doit faire au moins 6 caractères');
        return;
    }

    setButtonLoading(signupBtn, true);
    showAuthError('');

    const { data, error } = await db.auth.signUp({
        email,
        password
    });

    setButtonLoading(signupBtn, false);

    if (error) {
        showAuthError(translateAuthError(error.message));
        return;
    }

    if (data.user && !data.user.confirmed_at) {
        showAuthError('Vérifie tes emails pour confirmer ton compte !');
        showToast('Email de confirmation envoyé', 'success');
    } else {
        showNotesSection();
        loadNotes();
        showToast('Compte créé avec succès !', 'success');
    }
}

async function handleLogout() {
    await db.auth.signOut();
    allNotes = [];
    showAuthSection();
    showToast('Déconnexion réussie', 'success');
}

function togglePasswordVisibility() {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;

    const icon = togglePasswordBtn.querySelector('i');
    icon.setAttribute('data-lucide', type === 'password' ? 'eye' : 'eye-off');
    lucide.createIcons();
}

function showAuthError(message) {
    authError.textContent = message;
}

function translateAuthError(message) {
    const translations = {
        'Invalid login credentials': 'Email ou mot de passe incorrect',
        'User already registered': 'Cet email est déjà utilisé',
        'Password should be at least 6 characters': 'Le mot de passe doit faire au moins 6 caractères',
        'Unable to validate email address: invalid format': 'Format d\'email invalide',
        'Anonymous sign-ins are disabled': 'Remplis l\'email et le mot de passe'
    };
    return translations[message] || message;
}

// Reset Password
function openResetModal() {
    resetForm.reset();
    // Pré-remplir avec l'email déjà saisi si disponible
    if (emailInput.value) {
        resetEmailInput.value = emailInput.value;
    }
    resetModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    resetEmailInput.focus();
}

function closeResetModal() {
    resetModal.classList.add('hidden');
    document.body.style.overflow = '';
}

async function handleResetPassword(e) {
    e.preventDefault();

    const email = resetEmailInput.value.trim();

    if (!email) {
        showToast('Entre ton email', 'warning');
        return;
    }

    setButtonLoading(sendResetBtn, true);

    const { error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
    });

    setButtonLoading(sendResetBtn, false);

    if (error) {
        showToast(translateAuthError(error.message), 'error');
        return;
    }

    closeResetModal();
    showToast('Email envoyé ! Vérifie ta boîte mail.', 'success');
}

// Check if user arrived via password recovery link
function checkPasswordRecovery() {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
        // Store flag - we'll show the modal after Supabase processes the token
        sessionStorage.setItem('passwordRecovery', 'true');
    }
}

// Called when Supabase auth state changes
function handleAuthStateForRecovery(event) {
    if (event === 'PASSWORD_RECOVERY' || sessionStorage.getItem('passwordRecovery') === 'true') {
        sessionStorage.removeItem('passwordRecovery');
        // Clean URL
        history.replaceState(null, '', window.location.pathname);
        // Show modal after a short delay to ensure session is ready
        setTimeout(() => {
            openNewPasswordModal();
        }, 300);
    }
}

function openNewPasswordModal() {
    newPasswordModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    newPasswordInput.focus();
    lucide.createIcons();
}

function closeNewPasswordModal() {
    newPasswordModal.classList.add('hidden');
    document.body.style.overflow = '';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
}

async function handleNewPassword(e) {
    e.preventDefault();

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (newPassword.length < 6) {
        showToast('Le mot de passe doit faire au moins 6 caractères', 'warning');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('Les mots de passe ne correspondent pas', 'warning');
        return;
    }

    setButtonLoading(savePasswordBtn, true);

    const { error } = await db.auth.updateUser({
        password: newPassword
    });

    setButtonLoading(savePasswordBtn, false);

    if (error) {
        showToast('Erreur: ' + error.message, 'error');
        return;
    }

    closeNewPasswordModal();
    showToast('Mot de passe modifié avec succès !', 'success');
}

// ============================================
// NOTES CRUD
// ============================================

async function loadNotes() {
    showSkeletonLoading();

    const { data: notes, error } = await db
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement:', error);
        showToast('Erreur de chargement', 'error');
        return;
    }

    allNotes = notes || [];
    displayNotes(allNotes);
    updateStats();
}

function displayNotes(notes) {
    // Apply current search filter
    const searchTerm = searchInput.value.toLowerCase().trim();
    let filteredNotes = notes;

    if (searchTerm) {
        filteredNotes = notes.filter(note =>
            note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm)
        );
    }

    // Apply current sort
    filteredNotes = sortNotes(filteredNotes, sortSelect.value);

    // Separate pinned and unpinned
    const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
    const unpinnedNotes = filteredNotes.filter(n => !n.is_pinned);
    const sortedNotes = [...pinnedNotes, ...unpinnedNotes];

    // Update UI
    if (allNotes.length === 0) {
        notesList.innerHTML = '';
        emptyState.classList.remove('hidden');
        noResults.classList.add('hidden');
        return;
    }

    if (sortedNotes.length === 0) {
        notesList.innerHTML = '';
        emptyState.classList.add('hidden');
        noResults.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    noResults.classList.add('hidden');

    notesList.innerHTML = sortedNotes.map(note => createNoteCard(note)).join('');
    lucide.createIcons();
}

function createNoteCard(note) {
    const pinClass = note.is_pinned ? 'pinned' : '';
    const colorAttr = note.color && note.color !== 'default' ? `data-color="${note.color}"` : '';

    return `
        <div class="note-card ${pinClass}" ${colorAttr} data-id="${note.id}" onclick="openNoteModal('${note.id}')">
            <div class="note-card-header">
                <h3>${escapeHtml(note.title)}</h3>
                ${note.is_pinned ? '<i data-lucide="pin" class="pin-indicator"></i>' : ''}
            </div>
            <p>${escapeHtml(note.content)}</p>
            <div class="note-card-footer">
                <span class="note-date">${formatDate(note.updated_at || note.created_at)}</span>
                <div class="note-actions" onclick="event.stopPropagation()">
                    <button class="btn-icon" onclick="togglePin('${note.id}')" title="${note.is_pinned ? 'Désépingler' : 'Épingler'}">
                        <i data-lucide="${note.is_pinned ? 'pin-off' : 'pin'}"></i>
                    </button>
                    <button class="btn-icon" onclick="copyNote('${note.id}')" title="Copier">
                        <i data-lucide="copy"></i>
                    </button>
                    <button class="btn-icon" onclick="downloadNote('${note.id}')" title="Télécharger">
                        <i data-lucide="download"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="openDeleteModal('${note.id}')" title="Supprimer">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function handleSaveNote(e) {
    e.preventDefault();

    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();
    const color = document.querySelector('.color-btn.active')?.dataset.color || 'default';
    const isEditing = !!noteIdInput.value;

    if (!title || !content) {
        showToast('Remplis le titre et le contenu', 'warning');
        return;
    }

    setButtonLoading(saveBtn, true);

    if (isEditing) {
        // Update existing note
        const { error } = await db
            .from('notes')
            .update({
                title,
                content,
                color,
                updated_at: new Date().toISOString()
            })
            .eq('id', noteIdInput.value);

        setButtonLoading(saveBtn, false);

        if (error) {
            console.error('Erreur modification:', error);
            showToast('Erreur lors de la modification', 'error');
            return;
        }

        showToast('Note modifiée', 'success');
    } else {
        // Create new note
        const { data: { user } } = await db.auth.getUser();

        const { error } = await db
            .from('notes')
            .insert([{
                title,
                content,
                color,
                user_id: user.id,
                is_pinned: false
            }]);

        setButtonLoading(saveBtn, false);

        if (error) {
            console.error('Erreur création:', error);
            showToast('Erreur lors de la création', 'error');
            return;
        }

        showToast('Note créée', 'success');
    }

    closeNoteModal();
    loadNotes();
}

async function togglePin(noteId) {
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;

    const { error } = await db
        .from('notes')
        .update({ is_pinned: !note.is_pinned })
        .eq('id', noteId);

    if (error) {
        showToast('Erreur', 'error');
        return;
    }

    showToast(note.is_pinned ? 'Note désépinglée' : 'Note épinglée', 'success');
    loadNotes();
}

async function confirmDelete() {
    if (!noteToDelete) return;

    const { error } = await db
        .from('notes')
        .delete()
        .eq('id', noteToDelete);

    if (error) {
        showToast('Erreur lors de la suppression', 'error');
        return;
    }

    closeDeleteModal();
    showToast('Note supprimée', 'success');
    loadNotes();
}

// ============================================
// MODALS
// ============================================

function openNoteModal(noteId = null) {
    currentNoteId = noteId;
    noteForm.reset();
    colorBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector('.color-btn[data-color="default"]').classList.add('active');
    titleCount.textContent = '0';
    contentCount.textContent = '0';

    if (noteId) {
        const note = allNotes.find(n => n.id === noteId);
        if (note) {
            modalTitle.textContent = 'Modifier la note';
            noteIdInput.value = note.id;
            noteTitleInput.value = note.title;
            noteContentInput.value = note.content;
            titleCount.textContent = note.title.length;
            contentCount.textContent = note.content.length;

            if (note.color) {
                colorBtns.forEach(btn => btn.classList.remove('active'));
                document.querySelector(`.color-btn[data-color="${note.color}"]`)?.classList.add('active');
            }
        }
    } else {
        modalTitle.textContent = 'Nouvelle note';
        noteIdInput.value = '';
    }

    noteModal.classList.remove('hidden');
    noteTitleInput.focus();
    document.body.style.overflow = 'hidden';
}

function closeNoteModal() {
    noteModal.classList.add('hidden');
    document.body.style.overflow = '';
    currentNoteId = null;
}

function openDeleteModal(noteId) {
    noteToDelete = noteId;
    deleteModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    document.body.style.overflow = '';
    noteToDelete = null;
}

// ============================================
// SEARCH & SORT
// ============================================

function handleSearch() {
    const term = searchInput.value.trim();
    clearSearchBtn.classList.toggle('hidden', !term);
    displayNotes(allNotes);
}

function clearSearch() {
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    displayNotes(allNotes);
}

function handleSort() {
    displayNotes(allNotes);
}

function sortNotes(notes, sortBy) {
    const sorted = [...notes];

    switch (sortBy) {
        case 'date-desc':
            return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        case 'date-asc':
            return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        case 'title-asc':
            return sorted.sort((a, b) => a.title.localeCompare(b.title));
        case 'title-desc':
            return sorted.sort((a, b) => b.title.localeCompare(a.title));
        default:
            return sorted;
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function copyNote(noteId) {
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;

    const text = `${note.title}\n\n${note.content}`;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Note copiée !', 'success');
    }).catch(() => {
        showToast('Erreur de copie', 'error');
    });
}

function downloadNote(noteId) {
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;

    const text = `${note.title}\n\n${note.content}\n\n---\nCréé le: ${formatDate(note.created_at)}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();

    URL.revokeObjectURL(url);
    showToast('Note téléchargée', 'success');
}

// ============================================
// THEME
// ============================================

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    lucide.createIcons();
}

// ============================================
// PWA
// ============================================

function setupPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;

        // Show install prompt after a delay
        setTimeout(() => {
            if (deferredInstallPrompt && !localStorage.getItem('installDismissed')) {
                installPrompt.classList.remove('hidden');
            }
        }, 3000);
    });

    window.addEventListener('appinstalled', () => {
        installPrompt.classList.add('hidden');
        deferredInstallPrompt = null;
        showToast('App installée !', 'success');
    });
}

function dismissInstallPrompt() {
    installPrompt.classList.add('hidden');
    localStorage.setItem('installDismissed', 'true');
}

async function acceptInstallPrompt() {
    if (!deferredInstallPrompt) return;

    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;

    if (outcome === 'accepted') {
        showToast('Installation en cours...', 'success');
    }

    deferredInstallPrompt = null;
    installPrompt.classList.add('hidden');
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-circle',
        info: 'info'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i data-lucide="${icons[type]}"></i>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// UI HELPERS
// ============================================

function showAuthSection() {
    authSection.classList.remove('hidden');
    notesSection.classList.add('hidden');
}

function showNotesSection() {
    authSection.classList.add('hidden');
    notesSection.classList.remove('hidden');
}

function setButtonLoading(btn, loading) {
    btn.classList.toggle('loading', loading);
    btn.disabled = loading;
}

function showSkeletonLoading() {
    notesList.innerHTML = `
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
    `;
    emptyState.classList.add('hidden');
    noResults.classList.add('hidden');
}

function updateStats() {
    const total = allNotes.length;
    const pinned = allNotes.filter(n => n.is_pinned).length;

    notesCount.textContent = `${total} note${total !== 1 ? 's' : ''}`;
    pinnedCount.textContent = `${pinned} épinglée${pinned !== 1 ? 's' : ''}`;
}

// ============================================
// UTILITIES
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(isoDate) {
    const date = new Date(isoDate);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
        return 'À l\'instant';
    }

    // Less than 1 hour
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `Il y a ${mins} min`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `Il y a ${hours}h`;
    }

    // Less than 7 days
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `Il y a ${days}j`;
    }

    // Older
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function handleKeyboard(e) {
    // Escape to close modals
    if (e.key === 'Escape') {
        if (!noteModal.classList.contains('hidden')) {
            closeNoteModal();
        }
        if (!deleteModal.classList.contains('hidden')) {
            closeDeleteModal();
        }
    }

    // Ctrl+N for new note (when logged in)
    if (e.ctrlKey && e.key === 'n' && !notesSection.classList.contains('hidden')) {
        e.preventDefault();
        openNoteModal();
    }

    // Ctrl+F to focus search
    if (e.ctrlKey && e.key === 'f' && !notesSection.classList.contains('hidden')) {
        e.preventDefault();
        searchInput.focus();
    }
}

// ============================================
// TABS
// ============================================

function switchTab(tabName) {
    // Update tab buttons
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    if (tabNotes) tabNotes.classList.toggle('active', tabName === 'notes');
    if (tabClipboard) tabClipboard.classList.toggle('active', tabName === 'clipboard');

    // Load clips if switching to clipboard tab
    if (tabName === 'clipboard' && allClips.length === 0) {
        loadClips();
    }

    // Refresh icons
    lucide.createIcons();
}

// ============================================
// CLIPBOARD
// ============================================

async function loadClips() {
    if (!clipsList) return;

    clipsList.innerHTML = `
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
    `;
    if (emptyClips) emptyClips.classList.add('hidden');

    const { data: clips, error } = await db
        .from('clipboard_history')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement clips:', error);
        showToast('Erreur de chargement des clips', 'error');
        clipsList.innerHTML = '';
        return;
    }

    allClips = clips || [];
    updateDeviceFilter();
    displayClips(allClips);
    updateClipStats();
}

function updateDeviceFilter() {
    if (!deviceFilter) return;

    // Get unique devices
    const devices = [...new Set(allClips.map(c => c.device_name).filter(Boolean))];

    // Keep current selection
    const currentValue = deviceFilter.value;

    // Rebuild options
    deviceFilter.innerHTML = '<option value="all">Tous les appareils</option>';
    devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device;
        option.textContent = device;
        deviceFilter.appendChild(option);
    });

    // Restore selection if still valid
    if (devices.includes(currentValue) || currentValue === 'all') {
        deviceFilter.value = currentValue;
    }
}

function displayClips(clips) {
    if (!clipsList) return;

    // Apply device filter
    let filteredClips = clips;
    if (currentDeviceFilter !== 'all') {
        filteredClips = clips.filter(c => c.device_name === currentDeviceFilter);
    }

    // Apply search filter
    const searchTerm = clipSearchInput?.value.toLowerCase().trim();
    if (searchTerm) {
        filteredClips = filteredClips.filter(c =>
            c.content.toLowerCase().includes(searchTerm)
        );
    }

    // Update UI
    if (filteredClips.length === 0) {
        clipsList.innerHTML = '';
        if (emptyClips) emptyClips.classList.remove('hidden');
        return;
    }

    if (emptyClips) emptyClips.classList.add('hidden');

    clipsList.innerHTML = filteredClips.map(clip => createClipCard(clip)).join('');
    lucide.createIcons();
}

function createClipCard(clip) {
    const isShort = clip.content.length < 100;
    const pinnedClass = clip.is_pinned ? 'pinned' : '';
    const deviceIcon = clip.is_pinned ? 'pin' : 'monitor';

    return `
        <div class="clip-card" data-id="${clip.id}">
            <div class="clip-header">
                <div class="clip-device ${pinnedClass}">
                    <i data-lucide="${deviceIcon}"></i>
                    <span>${escapeHtml(clip.device_name || 'Appareil inconnu')}</span>
                </div>
                <span class="clip-date">${formatDate(clip.created_at)}</span>
            </div>
            <div class="clip-content ${isShort ? 'short' : ''}">${escapeHtml(clip.content)}</div>
            <div class="clip-actions">
                <button class="btn btn-primary btn-small" onclick="copyClip('${clip.id}')">
                    <i data-lucide="copy"></i>
                    Copier
                </button>
                <button class="btn btn-secondary btn-small" onclick="deleteClip('${clip.id}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>
    `;
}

async function copyClip(clipId) {
    const clip = allClips.find(c => c.id === clipId);
    if (!clip) return;

    try {
        await navigator.clipboard.writeText(clip.content);
        showToast('Copie dans le presse-papiers !', 'success');
    } catch (err) {
        showToast('Erreur de copie', 'error');
    }
}

async function deleteClip(clipId) {
    const { error } = await db
        .from('clipboard_history')
        .delete()
        .eq('id', clipId);

    if (error) {
        showToast('Erreur de suppression', 'error');
        return;
    }

    showToast('Clip supprime', 'success');
    loadClips();
}

function handleClipSearch() {
    const term = clipSearchInput?.value.trim();
    if (clearClipSearchBtn) {
        clearClipSearchBtn.classList.toggle('hidden', !term);
    }
    displayClips(allClips);
}

function clearClipSearch() {
    if (clipSearchInput) clipSearchInput.value = '';
    if (clearClipSearchBtn) clearClipSearchBtn.classList.add('hidden');
    displayClips(allClips);
}

function handleDeviceFilter() {
    currentDeviceFilter = deviceFilter?.value || 'all';
    if (clipsDevice) {
        clipsDevice.textContent = currentDeviceFilter === 'all'
            ? 'Tous les appareils'
            : currentDeviceFilter;
    }
    displayClips(allClips);
}

function updateClipStats() {
    if (!clipsCount) return;

    let count = allClips.length;
    if (currentDeviceFilter !== 'all') {
        count = allClips.filter(c => c.device_name === currentDeviceFilter).length;
    }

    clipsCount.textContent = `${count} clip${count !== 1 ? 's' : ''}`;
}

// Make functions globally available for onclick handlers
window.openNoteModal = openNoteModal;
window.togglePin = togglePin;
window.copyNote = copyNote;
window.downloadNote = downloadNote;
window.openDeleteModal = openDeleteModal;
window.copyClip = copyClip;
window.deleteClip = deleteClip;
