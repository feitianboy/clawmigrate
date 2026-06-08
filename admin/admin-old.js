const API_BASE = '/api';
let currentUser = null;
let authToken = null;

window.onload = () => {
    initAuthCheck();
};

function initAuthCheck() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        showAdminPage();
        loadDashboardData();
    } else {
        showLoginPage();
    }
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
}

// ========== 页面切换 ==========
function showLoginPage() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('adminPage').classList.add('hidden');
}

function showAdminPage() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('adminPage').classList.remove('hidden');
    document.getElementById('currentUser').textContent = currentUser.username;
    document.getElementById('userAvatar').textContent = currentUser.username.charAt(0).toUpperCase();
}

// ========== 登录认证 ==========
function handleLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (!username || !password) {
        showError('请输入用户名和密码');
        return;
    }

    fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showError(data.error);
        } else {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            showAdminPage();
            loadDashboardData();
        }
    })
    .catch(err => {
        showError('登录失败，请稍后重试');
        console.error(err);
    });
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    showLoginPage();
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// ========== 侧边栏导航 ==========
function showSection(section) {
    const sections = ['dashboard', 'users', 'migrations', 'configs'];
    const titles = ['仪表盘', '用户管理', '迁移记录', '配置管理'];
    
    sections.forEach((s, idx) => {
        const el = document.getElementById(`${s}Section`);
        const nav = document.querySelectorAll('.nav-item')[idx];
        
        if (s === section) {
            el.classList.remove('hidden');
            nav.classList.add('active');
            document.getElementById('pageTitle').textContent = titles[idx];
        } else {
            el.classList.add('hidden');
            nav.classList.remove('active');
        }
    });

    if (section === 'dashboard') loadDashboardData();
    if (section === 'users') loadUsersData();
    if (section === 'migrations') loadMigrationsData();
}

// ========== 仪表盘数据 ==========
function loadDashboardData() {
    Promise.all([
        fetch(`${API_BASE}/admin/users`, {
            headers: getAuthHeaders()
        }).then(r => r.json()),
        fetch(`${API_BASE}/migrations`, {
            headers: getAuthHeaders()
        }).then(r => r.json())
    ])
    .then(([users, migrations]) => {
        if (!users.error) {
            document.getElementById('statUsers').textContent = users.length;
            document.getElementById('statAdmins').textContent = users.filter(u => u.role === 'admin').length;
        }
        if (!migrations.error) {
            document.getElementById('statMigrations').textContent = migrations.length;
            renderRecentMigrations(migrations.slice(0, 5));
        }
    })
    .catch(err => console.error(err));
}

function renderRecentMigrations(migrations) {
    const container = document.getElementById('recentMigrationsContent');
    const loading = document.getElementById('recentMigrationsLoading');
    loading.classList.add('hidden');

    if (migrations.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">暂无迁移记录</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>源平台</th>
                    <th>目标平台</th>
                    <th>状态</th>
                    <th>时间</th>
                </tr>
            </thead>
            <tbody>
                ${migrations.map(m => `
                    <tr>
                        <td>${m.source_platform}</td>
                        <td>${m.target_platform}</td>
                        <td><span class="badge ${m.status === 'completed' ? 'badge-success' : 'badge-pending'}">${m.status}</span></td>
                        <td>${formatDate(m.created_at)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ========== 用户管理 ==========
function loadUsersData() {
    const loading = document.getElementById('usersLoading');
    const container = document.getElementById('usersTableContainer');
    loading.classList.remove('hidden');

    fetch(`${API_BASE}/admin/users`, {
        headers: getAuthHeaders()
    })
    .then(res => res.json())
    .then(users => {
        loading.classList.add('hidden');
        if (users.error) {
            container.innerHTML = `<p style="color: var(--text-muted); text-align: center;">${users.error}</p>`;
        } else {
            renderUsersTable(users);
        }
    })
    .catch(err => {
        loading.classList.add('hidden');
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">加载失败</p>';
    });
}

function renderUsersTable(users) {
    const container = document.getElementById('usersTableContainer');
    
    if (users.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">暂无用户</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>用户名</th>
                    <th>邮箱</th>
                    <th>角色</th>
                    <th>创建时间</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td><span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}">${user.role === 'admin' ? '管理员' : '用户'}</span></td>
                        <td>${formatDate(user.created_at)}</td>
                        <td>
                            <div class="actions">
                                <button class="btn btn-secondary btn-sm" onclick="editUser(${user.id})">编辑</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">删除</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showAddUserModal() {
    const username = prompt('请输入用户名:');
    if (!username) return;
    const email = prompt('请输入邮箱:');
    if (!email) return;
    const password = prompt('请输入密码:');
    if (!password) return;
    const role = confirm('设为管理员? (取消为普通用户)') ? 'admin' : 'user';

    fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert('添加失败: ' + data.error);
        } else {
            alert('添加成功!');
            loadUsersData();
            loadDashboardData();
        }
    });
}

function deleteUser(userId) {
    if (!confirm('确定要删除该用户吗?')) return;
    
    fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert('删除失败: ' + data.error);
        } else {
            alert('删除成功!');
            loadUsersData();
            loadDashboardData();
        }
    });
}

function editUser(userId) {
    const newRole = prompt('请输入新角色 (admin / user):');
    if (!newRole) return;
    const newEmail = prompt('请输入新邮箱 (留空不修改):');
    const newUsername = prompt('请输入新用户名 (留空不修改):');

    const updateData = {};
    if (newRole) updateData.role = newRole;
    if (newEmail) updateData.email = newEmail;
    if (newUsername) updateData.username = newUsername;

    if (Object.keys(updateData).length === 0) return;

    fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert('更新失败: ' + data.error);
        } else {
            alert('更新成功!');
            loadUsersData();
        }
    });
}

// ========== 迁移记录管理 ==========
function loadMigrationsData() {
    const loading = document.getElementById('migrationsLoading');
    const container = document.getElementById('migrationsTableContainer');
    loading.classList.remove('hidden');

    fetch(`${API_BASE}/migrations`, {
        headers: getAuthHeaders()
    })
    .then(res => res.json())
    .then(migrations => {
        loading.classList.add('hidden');
        if (migrations.error) {
            container.innerHTML = `<p style="color: var(--text-muted); text-align: center;">${migrations.error}</p>`;
        } else {
            renderMigrationsTable(migrations);
        }
    })
    .catch(err => {
        loading.classList.add('hidden');
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">加载失败</p>';
    });
}

function renderMigrationsTable(migrations) {
    const container = document.getElementById('migrationsTableContainer');
    
    if (migrations.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">暂无迁移记录</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>源平台</th>
                    <th>目标平台</th>
                    <th>状态</th>
                    <th>创建时间</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${migrations.map(m => `
                    <tr>
                        <td>${m.id}</td>
                        <td>${m.source_platform}</td>
                        <td>${m.target_platform}</td>
                        <td><span class="badge ${m.status === 'completed' ? 'badge-success' : 'badge-pending'}">${m.status}</span></td>
                        <td>${formatDate(m.created_at)}</td>
                        <td>
                            <div class="actions">
                                <button class="btn btn-danger btn-sm" onclick="deleteMigration(${m.id})">删除</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function deleteMigration(migrationId) {
    if (!confirm('确定要删除该记录吗?')) return;
    
    fetch(`${API_BASE}/migrations/${migrationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert('删除失败: ' + data.error);
        } else {
            alert('删除成功!');
            loadMigrationsData();
            loadDashboardData();
        }
    });
}

// ========== 工具函数 ==========
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
