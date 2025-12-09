// --- 1. Firebase Auth and Initialization ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    setDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    orderBy,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Your Firebase configuration object (UPDATED)
const firebaseConfig = {
  apiKey: "AIzaSyCqqW_fryqigzg7zDWgEsuADhBkPYcHQMo",
  authDomain: "db2-2f64c.firebaseapp.com",
  projectId: "db2-2f64c",
  storageBucket: "db2-2f64c.firebasestorage.app",
  messagingSenderId: "234811583682",
  appId: "1:234811583682:web:aa2bd4e29296207c0d5f5b",
  measurementId: "G-38MS80C490"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Global variables for Firestore ---
let currentUserId = null;
let tasksCollectionRef = null;
let tasksUnsubscribe = null;
let addressesCollectionRef = null;
let addressesUnsubscribe = null;
let unitStatusCollectionRef = null;
let unitStatusUnsubscribe = null;
let maintenanceCollectionRef = null;
let maintenanceUnsubscribe = null;
let tickerUnsubscribe = null;
let layoutUnsubscribe = null; // New listener for layout

// --- ROUTER LOGIC (Replaces Tabs) ---
window.Router = {
    current: 'dashboard',
    navigate: function(viewId) {
        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active')); // animation support
        
        // Deselect nav
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.remove('active', 'border-indigo-600', 'text-indigo-600', 'bg-indigo-50');
            el.classList.add('border-transparent', 'text-gray-600');
        });

        // Show target
        const targetView = document.getElementById(`view-${viewId}`);
        if(targetView) {
            targetView.classList.remove('hidden');
            setTimeout(() => targetView.classList.add('active'), 10);
        }

        // Highlight Nav
        const navLink = document.getElementById(`nav-${viewId}`);
        if(navLink) {
            navLink.classList.remove('border-transparent', 'text-gray-600');
            navLink.classList.add('active', 'border-indigo-600', 'text-indigo-600', 'bg-indigo-50');
        }

        this.current = viewId;
        
        // Close mobile menu if open
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        
        // Restore desktop Sidebar visibility logic
        if(window.innerWidth >= 768) {
            sidebar.classList.remove('-translate-x-full', 'translate-x-0');
        }
    }
};

// Mobile Menu Toggles
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('-translate-x-full');
    sidebar.classList.add('translate-x-0');
    overlay.classList.remove('hidden');
});
document.getElementById('sidebarOverlay').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.add('-translate-x-full');
    sidebar.classList.remove('translate-x-0');
    overlay.classList.add('hidden');
});

// --- SHARED HELPER FUNCTIONS ---
function formatFirestoreTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        const date = timestamp.toDate();
        return date.toLocaleString('en-US', {
            year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'
        });
    } catch (e) { return 'Invalid Date'; }
}

function setLoading(isLoading, btn, txt, spinner) {
    if (!btn || !txt || !spinner) return;
    btn.disabled = isLoading;
    if (isLoading) {
        txt.style.display = 'none';
        spinner.style.display = 'inline-block';
    } else {
        txt.style.display = 'inline-block';
        spinner.style.display = 'none';
    }
}

function showMessage(box, message, type) {
    if (!box) return;
    box.textContent = message;
    box.className = 'mt-4 text-center text-sm p-3 rounded-lg';
    if (type === 'success') box.classList.add('bg-green-100', 'text-green-800');
    else box.classList.add('bg-red-100', 'text-red-800');
    box.classList.remove('hidden');
    setTimeout(() => box.classList.add('hidden'), 5000);
}

function showListMessage(area, message, type) {
    if (!area) return;
    area.textContent = message;
    area.classList.remove('hidden', 'text-gray-500', 'text-red-600', 'text-green-600');
    if (type === 'error') area.classList.add('text-red-600');
    else if (type === 'success') area.classList.add('text-green-600');
    else area.classList.add('text-gray-500');
    area.classList.remove('hidden');
}


// --- 2. AUTHENTICATION & UI STATE ---
onAuthStateChanged(auth, (user) => {
    const loginView = document.getElementById('login-view');
    const sidebar = document.getElementById('sidebar');
    const mobileHeader = document.getElementById('mobile-header');
    const mainContent = document.getElementById('main-content');
    const userStatus = document.getElementById('userStatus');

    if (user) {
        // Logged In
        currentUserId = user.uid;
        userStatus.textContent = user.email;
        
        loginView.classList.add('login-fade-out'); // Animation class in CSS
        setTimeout(() => loginView.classList.add('hidden'), 500);
        
        sidebar.classList.remove('hidden');
        sidebar.classList.add('flex');
        mobileHeader.classList.remove('hidden');
        mobileHeader.classList.add('flex');
        mainContent.classList.remove('hidden');
        mainContent.classList.add('flex', 'flex-col'); // Correct flex for main

        // Start Listeners
        setupUnitStatusLogic(); 
        setupTaskLogic();
        setupAddressLogic(); 
        setupMaintenanceLogic();
        setupTickerLogic();
        fetchPosts();
        setupForceReloadLogic(); // NEW: Force Reload logic
        
        // Start Layout Listener
        setupRealtimeLayout();
        
    } else {
        // Logged Out
        currentUserId = null;
        
        loginView.classList.remove('hidden', 'login-fade-out');
        sidebar.classList.add('hidden');
        sidebar.classList.remove('flex');
        mobileHeader.classList.add('hidden');
        mobileHeader.classList.remove('flex');
        mainContent.classList.add('hidden');

        // Stop Listeners
        if(tasksUnsubscribe) tasksUnsubscribe();
        if(addressesUnsubscribe) addressesUnsubscribe();
        if(unitStatusUnsubscribe) unitStatusUnsubscribe();
        if(maintenanceUnsubscribe) maintenanceUnsubscribe();
        if(tickerUnsubscribe) tickerUnsubscribe();
        if(layoutUnsubscribe) layoutUnsubscribe();
    }
});

// Login Form
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const errBox = document.getElementById('login-error');
    
    errBox.classList.add('hidden');
    
    signInWithEmailAndPassword(auth, email, password)
        .catch((error) => {
            console.error(error);
            errBox.classList.remove('hidden');
        });
});

// Sign Out
document.getElementById('sign-out-button').addEventListener('click', () => {
    signOut(auth);
});

// --- NEW: REAL-TIME LAYOUT SYSTEM (Enhanced) ---
function setupRealtimeLayout() {
    const collectionRef = collection(db, 'layout_settings');
    layoutUnsubscribe = onSnapshot(collectionRef, (snapshot) => {
        snapshot.forEach(docSnap => {
            const containerId = docSnap.id;
            const data = docSnap.data();
            const el = document.getElementById(containerId);

            if (el) {
                // Remove existing layout classes (Base + MD + LG + XL)
                // We use a regex-like approach by filtering known prefixes
                const cleanClasses = (cls) => {
                    const prefixes = ['w-', 'grid-cols-', 'gap-'];
                    const bpPrefixes = ['md:', 'lg:', 'xl:'];
                    
                    let keep = true;
                    prefixes.forEach(p => {
                        if (cls.startsWith(p)) keep = false;
                        bpPrefixes.forEach(bp => {
                            if (cls.startsWith(bp + p)) keep = false;
                        });
                    });
                    return keep;
                };
                
                el.className = el.className.split(' ').filter(cleanClasses).join(' ');

                // Build new classes
                let newClasses = ['grid']; // ensure grid

                if (data.fullConfig) {
                    // New Format: Per-Device
                    const { base, md, lg, xl } = data.fullConfig;
                    
                    // Base
                    if(base) newClasses.push(base.width, base.cols, base.gap);
                    // MD
                    if(md) newClasses.push(`md:${md.width}`, `md:${md.cols}`, `md:${md.gap}`);
                    // LG
                    if(lg) newClasses.push(`lg:${lg.width}`, `lg:${lg.cols}`, `lg:${lg.gap}`);
                    // XL
                    if(xl) newClasses.push(`xl:${xl.width}`, `xl:${xl.cols}`, `xl:${xl.gap}`);

                } else {
                    // Legacy/Fallback Format
                    if(data.width) newClasses.push(data.width);
                    if(data.cols) newClasses.push(data.cols);
                    if(data.gap) newClasses.push(data.gap);
                }

                // Apply
                el.className += ' ' + newClasses.join(' ');
            }
        });
    });
}


// --- 3. MODULE LOGIC ---

// --- GOOGLE SHEETS NEWS FEED ---
const MASTER_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwDFsKgHiCD4dEK6Fcou2tWferXLLv6t23hIv-VF5sFOXKVUrRFVuyODzKiB4zshJX4/exec';

document.addEventListener('DOMContentLoaded', () => {
    // News Feed Form
    const newsForm = document.querySelector('#view-news #data-form');
    if(newsForm) {
        newsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = newsForm.querySelector('button[type="submit"]');
            const txt = btn.querySelector('span');
            const ldr = btn.querySelector('div');
            
            setLoading(true, btn, txt, ldr);
            
            const formData = new FormData(newsForm);
            const dataObject = Object.fromEntries(formData.entries());
            dataObject.action = 'addPost';

            fetch(MASTER_WEB_APP_URL, { 
                method: 'POST', body: JSON.stringify(dataObject),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    showMessage(document.getElementById('message-box-news'), 'Post published!', 'success');
                    newsForm.reset();
                    fetchPosts();
                } else throw new Error(data.message);
            })
            .catch(err => showMessage(document.getElementById('message-box-news'), err.message, 'error'))
            .finally(() => setLoading(false, btn, txt, ldr));
        });
    }

    // Refresh Posts Button
    document.getElementById('refresh-posts-button').addEventListener('click', fetchPosts);
});

// Fetch Posts Logic
async function fetchPosts() {
    const container = document.getElementById('existing-posts-container');
    const msgArea = document.getElementById('posts-message-area');
    const btnIcon = document.getElementById('refresh-icon');
    
    if(!container) return; // Guard for situations where DOM might not be ready

    btnIcon.classList.add('fa-spin'); // FontAwesome spin
    container.innerHTML = '';
    
    try {
        const response = await fetch(MASTER_WEB_APP_URL, {
            method: 'POST', body: JSON.stringify({ action: 'getPosts' }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        
        if (result.status === 'success' && result.data.length > 0) {
            msgArea.classList.add('hidden');
            result.data.forEach(post => {
                // Create Card
                const card = document.createElement('div');
                card.className = 'p-4 border border-gray-100 rounded-lg shadow-sm bg-white hover:shadow-md transition';
                card.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-base font-bold text-gray-900">${post.title}</h3>
                            <p class="text-xs text-gray-500 mt-1">
                                <i class="fa-solid fa-user mr-1"></i> ${post.postedBy} 
                                <span class="mx-2">•</span> 
                                <i class="fa-solid fa-users mr-1"></i> ${post.appliesTo}
                            </p>
                        </div>
                        <div class="flex space-x-2">
                             <button class="edit-post-btn text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition"><i class="fa-solid fa-pen-to-square"></i></button>
                             <button class="delete-post-btn text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                    <p class="text-sm text-gray-700 mt-3 whitespace-pre-wrap">${post.description}</p>
                    <div class="mt-4 pt-3 border-t border-gray-50 flex flex-wrap gap-4 text-xs text-gray-400">
                        <span><i class="fa-solid fa-location-dot mr-1"></i> ${post.location}</span>
                        <span><i class="fa-regular fa-clock mr-1"></i> Post: ${formatSheetDate(post.postDate)}</span>
                        ${post.removeDate ? `<span><i class="fa-solid fa-calendar-xmark mr-1"></i> Ends: ${formatSheetDate(post.removeDate, false)}</span>` : ''}
                    </div>
                `;
                
                // Bind Edit/Delete
                const delBtn = card.querySelector('.delete-post-btn');
                delBtn.addEventListener('click', () => handleDeletePost(post.rowId, delBtn));
                
                const editBtn = card.querySelector('.edit-post-btn');
                editBtn.addEventListener('click', () => showEditModal(post));
                
                container.appendChild(card);
            });
        } else {
            msgArea.textContent = 'No active posts found.';
            msgArea.classList.remove('hidden');
        }
    } catch(e) { console.error(e); }
    finally { btnIcon.classList.remove('fa-spin'); }
}

async function handleDeletePost(rowId, btn) {
    if(!confirm('Are you sure you want to delete this post?')) return;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try {
        await fetch(MASTER_WEB_APP_URL, {
            method: 'POST', body: JSON.stringify({ action: 'deletePost', rowId }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        fetchPosts();
    } catch(e) { alert(e.message); btn.innerHTML = '<i class="fa-solid fa-trash"></i>'; }
}

// Edit Modal Logic (News)
const editModal = document.getElementById('edit-post-modal');
const editForm = document.getElementById('edit-form');

function showEditModal(post) {
    editForm.querySelector('#edit-row-id').value = post.rowId;
    editForm.querySelector('#edit-title').value = post.title;
    editForm.querySelector('#edit-description').value = post.description;
    editForm.querySelector('#edit-location-news').value = post.location;
    editForm.querySelector('#edit-applies-to').value = post.appliesTo;
    editForm.querySelector('#edit-posted-by').value = post.postedBy;
    editForm.querySelector('#edit-post-date').value = convertISOToDateTimeLocal(post.postDate);
    editForm.querySelector('#edit-remove-date').value = post.removeDate ? convertISOToDate(post.removeDate) : '';
    
    editModal.style.display = 'block';
}

document.querySelectorAll('.modal-close, #edit-cancel-button').forEach(el => {
    el.addEventListener('click', () => editModal.style.display = 'none');
});

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('edit-save-button');
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    const formData = new FormData(editForm);
    const data = Object.fromEntries(formData.entries());

    try {
        await fetch(MASTER_WEB_APP_URL, {
            method: 'POST', body: JSON.stringify({ action: 'updatePost', rowId: data.rowId, data }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        editModal.style.display = 'none';
        fetchPosts();
    } catch(e) { alert(e.message); }
    finally { btn.innerText = originalText; btn.disabled = false; }
});


// --- TICKER FEED LOGIC ---
function setupTickerLogic() {
    const form = document.getElementById('dataForm-ticker');
    const container = document.getElementById('existing-tickers-container');
    
    // Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        btn.disabled = true; btn.textContent = 'Saving...';
        
        try {
            await addDoc(collection(db, 'ticker'), {
                startDateTime: form.startDateTime.value,
                endDateTime: form.endDateTime.value,
                message: form.message.value,
                createdAt: new Date().toISOString()
            });
            form.reset();
            showMessage(document.getElementById('responseMessage-ticker'), 'Ticker added!', 'success');
        } catch(e) {
            showMessage(document.getElementById('responseMessage-ticker'), e.message, 'error');
        } finally {
            btn.disabled = false; btn.textContent = 'Add to Ticker';
        }
    });

    // Real-time List
    const q = query(collection(db, 'ticker'), orderBy('startDateTime', 'desc'));
    tickerUnsubscribe = onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        if(snapshot.empty) {
            container.innerHTML = '<p class="text-center text-gray-400 text-sm p-4">No active tickers.</p>';
            return;
        }
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'bg-white border border-gray-100 rounded-lg p-4 shadow-sm flex justify-between items-center hover:shadow-md transition';
            div.innerHTML = `
                <div>
                    <p class="font-bold text-gray-800 text-sm">${data.message}</p>
                    <p class="text-xs text-gray-500 mt-1">
                        <i class="fa-regular fa-clock mr-1"></i> ${new Date(data.startDateTime).toLocaleString()} - ${new Date(data.endDateTime).toLocaleString()}
                    </p>
                </div>
                <button class="delete-ticker text-gray-300 hover:text-red-600 transition p-2" data-id="${docSnap.id}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            container.appendChild(div);
        });

        document.querySelectorAll('.delete-ticker').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('Delete this ticker?')) {
                    await deleteDoc(doc(db, 'ticker', e.currentTarget.dataset.id));
                }
            });
        });
    });
}


// --- UNIT STATUS LOGIC ---
function setupUnitStatusLogic() {
    unitStatusCollectionRef = collection(db, 'unitStatus');
    const form = document.querySelector('#view-units #update-form');
    
    // Update
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        setLoading(true, btn, btn.querySelector('.button-text'), btn.querySelector('.button-spinner'));
        
        try {
            const fd = new FormData(form);
            const unitId = fd.get('unit');
            await setDoc(doc(db, 'unitStatus', unitId), {
                unit: unitId,
                status: fd.get('status'),
                location: fd.get('location'),
                comments: fd.get('comments'),
                reported: serverTimestamp()
            });
            showMessage(document.getElementById('message-box-unit'), 'Unit updated.', 'success');
            form.reset();
        } catch(e) { showMessage(document.getElementById('message-box-unit'), e.message, 'error'); }
        finally { setLoading(false, btn, btn.querySelector('.button-text'), btn.querySelector('.button-spinner')); }
    });

    // Listen
    unitStatusUnsubscribe = onSnapshot(query(unitStatusCollectionRef), (snap) => {
        const container = document.getElementById('unit-status-container');
        container.innerHTML = '';
        
        if(snap.empty) {
            document.getElementById('status-message-area').textContent = 'No unit data.';
            return;
        }

        const units = [];
        snap.forEach(d => units.push(d.data()));
        units.sort((a,b) => a.unit.localeCompare(b.unit));

        units.forEach(u => {
            let color = 'text-gray-700 bg-gray-100';
            if(u.status === 'In Service') color = 'text-green-800 bg-green-100';
            else if(u.status === 'OOS') color = 'text-red-800 bg-red-100';
            else if(u.status === 'Limited Service') color = 'text-yellow-800 bg-yellow-100';

            container.innerHTML += `
                <div class="p-4 border border-gray-200 rounded-lg bg-white shadow-sm flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-bold text-gray-900">${u.unit}</h3>
                            <span class="text-xs font-bold px-2 py-1 rounded-full ${color}">${u.status}</span>
                        </div>
                        <p class="text-sm text-gray-600"><span class="font-semibold">Loc:</span> ${u.location}</p>
                        <p class="text-sm text-gray-500 italic mt-1">"${u.comments || '-'}"</p>
                    </div>
                    <p class="text-xs text-gray-400 mt-3 pt-2 border-t text-right">Updated: ${formatFirestoreTimestamp(u.reported)}</p>
                </div>
            `;
        });
    });
}

// --- TASKS LOGIC ---
function setupTaskLogic() {
    tasksCollectionRef = collection(db, 'dailyTasks');
    const form = document.querySelector('#view-tasks #task-form');
    
    // Add
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        setLoading(true, btn, btn.querySelector('.button-text'), btn.querySelector('.button-spinner'));

        try {
            const days = [];
            form.querySelectorAll('input[name="task-day"]:checked').forEach(c => days.push(c.value));
            if(!days.length) throw new Error("Select at least one day.");
            
            await addDoc(tasksCollectionRef, {
                task: form.Task.value,
                assignee: form.Assignee.value,
                day: days,
                createdAt: serverTimestamp()
            });
            form.reset();
            showMessage(document.getElementById('message-box-task'), 'Task added.', 'success');
        } catch(e) { showMessage(document.getElementById('message-box-task'), e.message, 'error'); }
        finally { setLoading(false, btn, btn.querySelector('.button-text'), btn.querySelector('.button-spinner')); }
    });

    // Listen
    tasksUnsubscribe = onSnapshot(query(tasksCollectionRef), (snap) => {
        const container = document.getElementById('existing-tasks-container');
        container.innerHTML = '';
        snap.forEach(d => {
            const t = d.data();
            const div = document.createElement('div');
            div.className = 'p-3 border border-gray-200 rounded-lg shadow-sm bg-white hover:bg-gray-50 transition';
            div.innerHTML = `
                <div class="flex justify-between items-start">
                    <h3 class="font-bold text-gray-800 text-sm">${t.task}</h3>
                    <div class="flex space-x-1">
                        <button class="edit-btn text-blue-500 hover:bg-blue-100 p-1 rounded"><i class="fa-solid fa-pen"></i></button>
                        <button class="del-btn text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="text-xs text-gray-500 mt-2 flex justify-between">
                    <span><i class="fa-solid fa-user mr-1"></i> ${t.assignee}</span>
                    <span class="font-medium text-indigo-600">${Array.isArray(t.day) ? t.day.join(', ') : t.day}</span>
                </div>
            `;
            
            div.querySelector('.del-btn').addEventListener('click', () => deleteDoc(doc(db, 'dailyTasks', d.id)));
            div.querySelector('.edit-btn').addEventListener('click', () => showEditTaskModal(d.id, t));
            
            container.appendChild(div);
        });
    });
}

// Task Edit Modal
const taskModal = document.getElementById('edit-task-modal');
const taskEditForm = document.getElementById('edit-task-form');
let currentTaskEditId = null;

function showEditTaskModal(id, data) {
    currentTaskEditId = id;
    taskEditForm.querySelector('[name="Task"]').value = data.task;
    taskEditForm.querySelector('[name="Assignee"]').value = data.assignee;
    taskEditForm.querySelectorAll('[name="edit-task-day"]').forEach(c => c.checked = false);
    if(Array.isArray(data.day)) {
        data.day.forEach(d => {
            const cb = taskEditForm.querySelector(`[value="${d}"]`);
            if(cb) cb.checked = true;
        });
    }
    taskModal.style.display = 'block';
}

document.querySelector('#task-modal-close-button').onclick = () => taskModal.style.display = 'none';
document.querySelector('#edit-task-cancel-button').onclick = () => taskModal.style.display = 'none';

taskEditForm.onsubmit = async (e) => {
    e.preventDefault();
    const days = [];
    taskEditForm.querySelectorAll('input:checked').forEach(c => days.push(c.value));
    
    await setDoc(doc(db, 'dailyTasks', currentTaskEditId), {
        task: taskEditForm.querySelector('[name="Task"]').value,
        assignee: taskEditForm.querySelector('[name="Assignee"]').value,
        day: days
    }, {merge: true});
    taskModal.style.display = 'none';
};

// --- ADDRESSES LOGIC ---
function setupAddressLogic() {
    addressesCollectionRef = collection(db, 'addressNotes');
    const form = document.querySelector('#view-addresses #contact-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        setLoading(true, btn, btn.querySelector('.button-text'), btn.querySelector('.button-spinner'));
        
        try {
            await addDoc(addressesCollectionRef, {
                address: form.Address.value,
                note: form.Note.value,
                priority: form.Priority.value,
                createdAt: serverTimestamp()
            });
            form.reset();
            showMessage(document.getElementById('status-message-address'), 'Address added.', 'success');
        } catch(e) { showMessage(document.getElementById('status-message-address'), e.message, 'error'); }
        finally { setLoading(false, btn, btn.querySelector('.button-text'), btn.querySelector('.button-spinner')); }
    });

    addressesUnsubscribe = onSnapshot(query(addressesCollectionRef), (snap) => {
        const container = document.getElementById('existing-addresses-container');
        container.innerHTML = '';
        snap.forEach(d => {
            const a = d.data();
            let color = 'bg-green-100 text-green-800';
            if(a.priority === 'Red') color = 'bg-red-100 text-red-800';
            else if(a.priority === 'Yellow') color = 'bg-yellow-100 text-yellow-800';

            const div = document.createElement('div');
            div.className = 'p-4 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition';
            div.innerHTML = `
                <div class="flex justify-between items-start">
                    <h3 class="font-bold text-gray-900">${a.address}</h3>
                    <div class="flex space-x-2">
                        <span class="text-xs px-2 py-1 rounded ${color} font-bold mr-2">${a.priority}</span>
                        <button class="edit-addr text-blue-500 hover:text-blue-700"><i class="fa-solid fa-pen"></i></button>
                        <button class="del-addr text-gray-400 hover:text-red-600"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <p class="text-sm text-gray-600 mt-2">${a.note}</p>
            `;
            div.querySelector('.del-addr').onclick = () => { if(confirm('Delete?')) deleteDoc(doc(db, 'addressNotes', d.id)); };
            div.querySelector('.edit-addr').onclick = () => showEditAddrModal(d.id, a);
            container.appendChild(div);
        });
    });
}

// Edit Address Modal
const addrModal = document.getElementById('edit-address-modal');
const addrForm = document.getElementById('edit-address-form');
let currentAddrId = null;

function showEditAddrModal(id, data) {
    currentAddrId = id;
    addrForm.querySelector('[name="Address"]').value = data.address;
    addrForm.querySelector('[name="Note"]').value = data.note;
    addrForm.querySelector('[name="Priority"]').value = data.priority;
    addrModal.style.display = 'block';
}

document.querySelector('#address-modal-close-button').onclick = () => addrModal.style.display = 'none';
document.querySelector('#edit-address-cancel-button').onclick = () => addrModal.style.display = 'none';

addrForm.onsubmit = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'addressNotes', currentAddrId), {
        address: addrForm.querySelector('[name="Address"]').value,
        note: addrForm.querySelector('[name="Note"]').value,
        priority: addrForm.querySelector('[name="Priority"]').value
    }, {merge: true});
    addrModal.style.display = 'none';
};


// --- MAINTENANCE LOGIC ---
function setupMaintenanceLogic() {
    maintenanceCollectionRef = collection(db, 'maintenance');
    const form = document.querySelector('#view-maintenance #maintenance-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        setLoading(true, btn, btn.querySelector('.button-text'), btn.querySelector('.button-spinner'));
        
        try {
            await addDoc(maintenanceCollectionRef, {
                vendor: form.Vendor.value,
                service: form.Service.value,
                location: form.Location.value,
                date: form.Date.value,
                createdAt: serverTimestamp()
            });
            form.reset();
            showMessage(document.getElementById('message-box-maintenance'), 'Entry logged.', 'success');
        } catch(e) { showMessage(document.getElementById('message-box-maintenance'), e.message, 'error'); }
        finally { setLoading(false, btn, btn.querySelector('.button-text'), btn.querySelector('.button-spinner')); }
    });

    maintenanceUnsubscribe = onSnapshot(query(maintenanceCollectionRef), (snap) => {
        const container = document.getElementById('existing-maintenance-container');
        container.innerHTML = '';
        
        const entries = [];
        snap.forEach(d => entries.push({id: d.id, ...d.data()}));
        entries.sort((a,b) => new Date(b.date) - new Date(a.date));

        entries.forEach(m => {
            const div = document.createElement('div');
            div.className = 'p-3 border border-gray-200 rounded-lg shadow-sm bg-white hover:bg-gray-50 transition';
            div.innerHTML = `
                <div class="flex justify-between items-start">
                    <h3 class="font-bold text-gray-800 text-sm">${m.service}</h3>
                    <div class="flex space-x-1">
                        <button class="edit-maint text-blue-500 hover:bg-blue-100 p-1 rounded"><i class="fa-solid fa-pen"></i></button>
                        <button class="del-maint text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="mt-2 text-xs text-gray-500 grid grid-cols-2 gap-2">
                    <span><i class="fa-solid fa-store mr-1"></i> ${m.vendor}</span>
                    <span><i class="fa-solid fa-location-dot mr-1"></i> ${m.location}</span>
                </div>
                <p class="text-xs text-gray-400 mt-2 border-t pt-1"><i class="fa-regular fa-calendar mr-1"></i> ${m.date}</p>
            `;
            div.querySelector('.del-maint').onclick = () => { if(confirm('Delete?')) deleteDoc(doc(db, 'maintenance', m.id)); };
            div.querySelector('.edit-maint').onclick = () => showEditMaintModal(m.id, m);
            container.appendChild(div);
        });
    });
}

// Edit Maintenance Modal
const maintModal = document.getElementById('edit-maintenance-modal');
const maintForm = document.getElementById('edit-maintenance-form');
let currentMaintId = null;

function showEditMaintModal(id, data) {
    currentMaintId = id;
    maintForm.querySelector('[name="Vendor"]').value = data.vendor;
    maintForm.querySelector('[name="Service"]').value = data.service;
    maintForm.querySelector('[name="Location"]').value = data.location;
    maintForm.querySelector('[name="Date"]').value = data.date;
    maintModal.style.display = 'block';
}

document.querySelector('#maintenance-modal-close-button').onclick = () => maintModal.style.display = 'none';
document.querySelector('#edit-maintenance-cancel-button').onclick = () => maintModal.style.display = 'none';

maintForm.onsubmit = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'maintenance', currentMaintId), {
        vendor: maintForm.querySelector('[name="Vendor"]').value,
        service: maintForm.querySelector('[name="Service"]').value,
        location: maintForm.querySelector('[name="Location"]').value,
        date: maintForm.querySelector('[name="Date"]').value
    }, {merge: true});
    maintModal.style.display = 'none';
};

// --- NEW: FORCE RELOAD LOGIC ---
function setupForceReloadLogic() {
    const reloadBtn = document.getElementById('force-reload-btn');
    if(!reloadBtn) return;

    reloadBtn.addEventListener('click', async () => {
        if(!confirm('This will force ALL dashboards to reload, clearing their cache. This can be disruptive. Are you sure?')) return;

        const originalContent = reloadBtn.innerHTML;
        reloadBtn.disabled = true;
        reloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Sending...';

        try {
            await setDoc(doc(db, 'alerts', 'force_reload'), {
                timestamp: new Date().toISOString(),
                triggeredBy: auth.currentUser?.email || 'unknown'
            });
            
            reloadBtn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Signal Sent!';
            reloadBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
            reloadBtn.classList.add('bg-green-600', 'hover:bg-green-700');

            setTimeout(() => {
                reloadBtn.innerHTML = originalContent;
                reloadBtn.classList.add('bg-red-600', 'hover:bg-red-700');
                reloadBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                reloadBtn.disabled = false;
            }, 3000);
        } catch(e) {
            alert('Error: ' + e.message);
            reloadBtn.disabled = false;
            reloadBtn.innerHTML = originalContent;
        }
    });
}

// --- UTILS ---
function convertISOToDate(iso) {
    if(!iso) return '';
    return iso.split('T')[0];
}
function convertISOToDateTimeLocal(iso) {
    if(!iso) return '';
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}
function formatSheetDate(iso, time=true) {
    if(!iso) return 'N/A';
    const d = new Date(iso);
    const opt = { year:'numeric', month:'numeric', day:'numeric' };
    if(time) { opt.hour='numeric'; opt.minute='numeric'; }
    return d.toLocaleString('en-US', opt);
}