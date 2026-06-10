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

function handleLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (!username || !password) {
        showError(errorDiv, '请输入用户名和密码');
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
            showError(errorDiv, data.error);
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
        showError(errorDiv, '登录失败，请稍后重试');
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

function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}

function showSection(section) {
    const sections = ['dashboard', 'users', 'migrations', 'activities'];
    const titles = ['数据仪表盘', '用户管理', '迁移记录', '用户行为'];
    
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
    if (section === 'activities') loadActivitiesData();
}

function loadDashboardData() {
    Promise.all([
        fetch(`${API_BASE}/admin/stats/overview`, { headers: getAuthHeaders() }).then(r => r.json()),
        fetch(`${API_BASE}/admin/stats/trend`, { headers: getAuthHeaders() }).then(r => r.json()),
        fetch(`${API_BASE}/admin/stats/platforms`, { headers: getAuthHeaders() }).then(r => r.json())
    ])
    .then(([overview, trend, platforms]) => {
        renderOverviewStats(overview);
        renderTrendData(trend);
        renderPlatformData(platforms);
    })
    .catch(err => console.error(err));
}

function renderOverviewStats(data) {
    document.getElementById('statTotalUsers').textContent = data.total_users || 0;
    document.getElementById('statTotalMigrations').textContent = data.total_migrations || 0;
    document.getElementById('statTodayPV').textContent = data.today_pv || 0;
    document.getElementById('statTodayUV').textContent = data.today_uv || 0;
}

function renderTrendData(data) {
    const loading = document.getElementById('trendLoading');
    const content = document.getElementById('trendContent');
    loading.classList.add('hidden');

    if (!data || data.length === 0) {
        content.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">暂无数据</p>';
        return;
    }

    content.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>日期</th>
                    <th>页面访问（PV）</th>
                    <th>独立访客（UV）</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(d => `
                    <tr>
                        <td>${d.date}</td>
                        <td>${d.page_views || 0}</td>
                        <td>${d.unique_users || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderPlatformData(data) {
    const loading = document.getElementById('platformsLoading');
    const content = document.getElementById('platformsContent');
    loading.classList.add('hidden');

    if (!data || data.length === 0) {
        content.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">暂无数据</p>';
        return;
    }

    content.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>平台名称</th>
                    <th>使用次数</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(p => `
                    <tr>
                        <td>${p.platform}</td>
                        <td>${p.count}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

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
    
    if (!users || users.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">暂无用户</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>用户</th>
                    <th>邮箱</th>
                    <th>手机号</th>
                    <th>角色</th>
                    <th>迁移次数</th>
                    <th>最后活跃</th>
                    <th>注册时间</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="avatar-badge">${(user.username || 'U').charAt(0).toUpperCase()}</div>
                                <span>${user.username}</span>
                            </div>
                        </td>
                        <td>${user.email}</td>
                        <td>${user.phone || '-'}</td>
                        <td><span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}">${user.role === 'admin' ? '管理员' : '用户'}</span></td>
                        <td>${user.total_migrations || 0}</td>
                        <td>${user.last_active_at ? formatDate(user.last_active_at) : '-'}</td>
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

function loadMigrationsData() {
    const loading = document.getElementById('migrationsLoading');
    const container = document.getElementById('migrationsTableContainer');
    loading.classList.remove('hidden');

    fetch(`${API_BASE}/migrations`, {
        headers: getAuthHeaders()
    })
    .then(res => res.json())
    .then(records => {
        loading.classList.add('hidden');
        if (records.error) {
            container.innerHTML = `<p style="color: var(--text-muted); text-align: center;">${records.error}</p>`;
        } else {
            renderMigrationsTable(records);
        }
    })
    .catch(err => {
        loading.classList.add('hidden');
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">加载失败</p>';
    });
}

function renderMigrationsTable(records) {
    const container = document.getElementById('migrationsTableContainer');
    
    if (!records || records.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">暂无迁移记录</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>用户</th>
                    <th>源平台</th>
                    <th>目标平台</th>
                    <th>状态</th>
                    <th>时间</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${records.map(r => `
                    <tr>
                        <td>${r.id}</td>
                        <td>${r.username || '-'}</td>
                        <td>${r.source_platform}</td>
                        <td>${r.target_platform}</td>
                        <td><span class="badge ${r.status === 'completed' ? 'badge-success' : 'badge-pending'}">${r.status}</span></td>
                        <td>${formatDate(r.created_at)}</td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="deleteMigration(${r.id})">删除</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function loadActivitiesData() {
    const loading = document.getElementById('activitiesLoading');
    const container = document.getElementById('activitiesTableContainer');
    loading.classList.remove('hidden');

    fetch(`${API_BASE}/admin/activities`, {
        headers: getAuthHeaders()
    })
    .then(res => res.json())
    .then(activities => {
        loading.classList.add('hidden');
        if (activities.error) {
            container.innerHTML = `<p style="color: var(--text-muted); text-align: center;">${activities.error}</p>`;
        } else {
            renderActivitiesTable(activities);
        }
    })
    .catch(err => {
        loading.classList.add('hidden');
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">加载失败</p>';
    });
}

function renderActivitiesTable(activities) {
    const container = document.getElementById('activitiesTableContainer');
    
    if (!activities || activities.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">暂无活动记录</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>用户</th>
                    <th>行为类型</th>
                    <th>详情</th>
                    <th>IP地址</th>
                    <th>时间</th>
                </tr>
            </thead>
            <tbody>
                ${activities.map(a => `
                    <tr>
                        <td>${a.id}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="avatar-badge">${(a.username || 'U').charAt(0).toUpperCase()}</div>
                                <span>${a.username || '-'}</span>
                            </div>
                        </td>
                        <td><span class="badge badge-info">${getActionTypeText(a.action_type)}</span></td>
                        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${a.action_details || '-'}</td>
                        <td>${a.ip_address || '-'}</td>
                        <td>${formatDate(a.created_at)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function getActionTypeText(type) {
    const map = {
        'register': '注册账号',
        'login': '登录',
        'migration': '迁移配置',
        'update_profile': '更新资料'
    };
    return map[type] || type;
}

function showAddUserModal() {
    const username = prompt('请输入用户名:');
    if (!username) return;
    const email = prompt('请输入邮箱:');
    if (!email) return;
    const password = prompt('请输入密码:');
    if (!password) return;
    const role = confirm('是否设为管理员? (取消为普通用户)') ? 'admin' : 'user';

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
        }
    });
}

function editUser(userId) {
    const role = prompt('请输入新角色 (admin/user):');
    if (!role) return;

    fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role })
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
        }
    });
}

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
