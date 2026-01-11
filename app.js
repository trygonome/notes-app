/* ============================================
   NOTES APP - Logique principale
   ============================================ */

// Configuration Supabase
const SUPABASE_URL = 'https://rnjcrfsrqunnpafuekrp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuamNyZnNycXVubnBhZnVla3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjA3NzksImV4cCI6MjA4MzczNjc3OX0.H7LVxvbsMBllG-WDVOxC5n5EQjIbVdt23jJt7g99rrI';

// Initialise le client Supabase (on utilise "db" pour éviter conflit avec le SDK global)
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// ÉLÉMENTS DU DOM
// ============================================

const authSection = document.getElementById('auth-section');
const notesSection = document.getElementById('notes-section');
const authForm = document.getElementById('auth-form');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');
const noteForm = document.getElementById('note-form');
const notesList = document.getElementById('notes-list');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');

// ============================================
// AUTHENTIFICATION
// ============================================

// Vérifie si l'utilisateur est déjà connecté au chargement
async function checkUser() {
    const { data: { user } } = await db.auth.getUser();

    if (user) {
        // Utilisateur connecté → affiche les notes
        showNotesSection();
        loadNotes();
    } else {
        // Non connecté → affiche le login
        showAuthSection();
    }
}

// Connexion
async function login(email, password) {
    showError(''); // Reset erreur

    const { data, error } = await db.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        showError('Erreur de connexion : ' + error.message);
        return;
    }

    showNotesSection();
    loadNotes();
}

// Inscription
async function signup(email, password) {
    showError('');

    const { data, error } = await db.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        showError('Erreur d\'inscription : ' + error.message);
        return;
    }

    // Supabase peut demander une confirmation email
    // Pour simplifier, on connecte directement si pas de confirmation requise
    if (data.user && !data.user.confirmed_at) {
        showError('Vérifie tes emails pour confirmer ton compte !');
    } else {
        showNotesSection();
        loadNotes();
    }
}

// Déconnexion
async function logout() {
    await db.auth.signOut();
    showAuthSection();
    notesList.innerHTML = '';
}

// ============================================
// GESTION DES NOTES (CRUD)
// ============================================

// Charger toutes les notes de l'utilisateur
async function loadNotes() {
    notesList.innerHTML = '<p style="text-align:center;color:#999;">Chargement...</p>';

    const { data: notes, error } = await db
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false }); // Plus récentes en premier

    if (error) {
        notesList.innerHTML = '<p class="error">Erreur de chargement</p>';
        console.error(error);
        return;
    }

    displayNotes(notes);
}

// Afficher les notes dans le DOM
function displayNotes(notes) {
    if (notes.length === 0) {
        notesList.innerHTML = '<p style="text-align:center;color:#999;">Aucune note. Crée ta première note !</p>';
        return;
    }

    notesList.innerHTML = notes.map(note => `
        <div class="note-card" data-id="${note.id}">
            <h3>${escapeHtml(note.title)}</h3>
            <p>${escapeHtml(note.content)}</p>
            <div class="note-date">${formatDate(note.created_at)}</div>
            <div class="note-actions">
                <button class="btn-edit" onclick="editNote('${note.id}')">Modifier</button>
                <button class="btn-delete" onclick="deleteNote('${note.id}')">Supprimer</button>
            </div>
        </div>
    `).join('');
}

// Créer une nouvelle note
async function createNote(title, content) {
    // Récupère l'ID de l'utilisateur connecté
    const { data: { user } } = await db.auth.getUser();

    if (!user) {
        showError('Tu dois être connecté !');
        return;
    }

    const { data, error } = await db
        .from('notes')
        .insert([{
            title: title,
            content: content,
            user_id: user.id
        }])
        .select(); // Retourne la note créée

    if (error) {
        console.error('Erreur création:', error);
        alert('Erreur lors de la création de la note');
        return;
    }

    // Recharge les notes pour afficher la nouvelle
    loadNotes();

    // Vide le formulaire
    noteTitleInput.value = '';
    noteContentInput.value = '';
}

// Supprimer une note
async function deleteNote(noteId) {
    if (!confirm('Supprimer cette note ?')) return;

    const { error } = await db
        .from('notes')
        .delete()
        .eq('id', noteId);

    if (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur lors de la suppression');
        return;
    }

    loadNotes(); // Recharge la liste
}

// Modifier une note (simple prompt pour l'instant)
async function editNote(noteId) {
    // Récupère la note actuelle
    const { data: note, error } = await db
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

    if (error || !note) {
        alert('Note introuvable');
        return;
    }

    // Demande les nouvelles valeurs (simple pour V1)
    const newTitle = prompt('Nouveau titre :', note.title);
    if (newTitle === null) return; // Annulé

    const newContent = prompt('Nouveau contenu :', note.content);
    if (newContent === null) return; // Annulé

    // Met à jour dans Supabase
    const { error: updateError } = await db
        .from('notes')
        .update({
            title: newTitle,
            content: newContent
        })
        .eq('id', noteId);

    if (updateError) {
        console.error('Erreur modification:', updateError);
        alert('Erreur lors de la modification');
        return;
    }

    loadNotes(); // Recharge
}

// ============================================
// UTILITAIRES
// ============================================

// Affiche la section auth, cache les notes
function showAuthSection() {
    authSection.classList.remove('hidden');
    notesSection.classList.add('hidden');
}

// Affiche les notes, cache l'auth
function showNotesSection() {
    authSection.classList.add('hidden');
    notesSection.classList.remove('hidden');
}

// Affiche un message d'erreur
function showError(message) {
    authError.textContent = message;
}

// Échappe le HTML pour éviter les injections XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Formate une date ISO en format lisible
function formatDate(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: 'numeric'
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

// Formulaire de login/signup
authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    login(emailInput.value, passwordInput.value);
});

// Bouton inscription
signupBtn.addEventListener('click', () => {
    signup(emailInput.value, passwordInput.value);
});

// Bouton déconnexion
logoutBtn.addEventListener('click', logout);

// Formulaire nouvelle note
noteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    createNote(noteTitleInput.value, noteContentInput.value);
});

// ============================================
// INITIALISATION
// ============================================

// Vérifie l'utilisateur au chargement de la page
checkUser();

// Écoute les changements d'état d'authentification (utile pour la synchro)
db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        showNotesSection();
        loadNotes();
    } else if (event === 'SIGNED_OUT') {
        showAuthSection();
    }
});
