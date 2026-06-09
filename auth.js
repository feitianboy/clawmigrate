// ClawMigrate 用户认证模块
const API_BASE = 'https://clawmigrate.vercel.app/api';
let currentUser = null;
let authToken = null;

function initAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        updateAuthUI(true);
    } else {
        updateAuthUI(false);
    }
}

function updateAuthUI(isLoggedIn) {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    
    if (isLoggedIn && authButtons && userInfo) {
        authButtons.classList.add('hidden');
        userInfo.classList.remove('hidden');
        if (userName) userName.textContent = currentUser.username;
    } else if (authButtons && userInfo) {
        authButtons.classList.remove('hidden');
        userInfo.classList.add('hidden');
    }
}

function showLoginModal() {
    const modal = createModal('loginModal', `
        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; text-align: center;">登录</h2>
        <p style="color: #94a3b8; text-align: center; margin-bottom: 24px;">欢迎回来！</p>
        <div id="loginError" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: none;"></div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">用户名</label>
            <input type="text" id="loginUsername" placeholder="请输入用户名" style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; color: #f8fafc; font-size: 14px;">
        </div>
        <div style="margin-bottom: 24px;">
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">密码</label>
            <input type="password" id="loginPassword" placeholder="请输入密码" style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; color: #f8fafc; font-size: 14px;">
        </div>
        <button onclick="handleLogin()" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); border: none; border-radius: 10px; color: white; font-size: 15px; font-weight: 600; cursor: pointer; margin-bottom: 16px;">登录</button>
        <p style="text-align: center; color: #94a3b8; font-size: 14px;">
            还没有账号？<a href="#" onclick="closeModal('loginModal'); showRegisterModal(); return false;" style="color: #8b5cf6; text-decoration: none;">立即注册</a>
        </p>
    `);
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

function showRegisterModal() {
    loadCaptcha();
    const modal = createModal('registerModal', `
        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; text-align: center;">注册</h2>
        <p style="color: #94a3b8; text-align: center; margin-bottom: 24px;">创建新账号，开始使用！</p>
        <div id="registerError" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: none;"></div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">用户名</label>
            <input type="text" id="registerUsername" placeholder="请输入用户名" style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; color: #f8fafc; font-size: 14px;">
        </div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">邮箱 <span style="color: #ef4444;">*</span></label>
            <div style="display: flex; gap: 8px;">
                <input type="email" id="registerEmail" placeholder="请输入邮箱" style="flex: 1; padding: 12px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; color: #f8fafc; font-size: 14px;">
                <button id="sendCodeBtn" onclick="sendEmailCode()" style="padding: 12px 16px; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 10px; color: #a78bfa; font-size: 13px; cursor: pointer; white-space: nowrap;">发送验证码</button>
            </div>
        </div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">邮箱验证码 <span style="color: #ef4444;">*</span></label>
            <input type="text" id="registerEmailCode" placeholder="请输入6位验证码" maxlength="6" style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; color: #f8fafc; font-size: 14px;">
        </div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">图形验证码 <span style="color: #ef4444;">*</span></label>
            <div style="display: flex; gap: 8px; align-items: center;">
                <input type="text" id="registerCaptcha" placeholder="请输入图形验证码" maxlength="4" style="flex: 1; padding: 12px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; color: #f8fafc; font-size: 14px;">
                <div id="captchaContainer" style="cursor: pointer; border-radius: 8px; overflow: hidden; border: 1px solid rgba(148, 163, 184, 0.2);" onclick="loadCaptcha()"></div>
            </div>
        </div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">密码 <span style="color: #ef4444;">*</span></label>
            <input type="password" id="registerPassword" placeholder="请输入密码（至少6位）" style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; color: #f8fafc; font-size: 14px;">
        </div>
        <button onclick="handleRegister()" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); border: none; border-radius: 10px; color: white; font-size: 15px; font-weight: 600; cursor: pointer; margin-bottom: 16px;">注册</button>
        <p style="text-align: center; color: #94a3b8; font-size: 14px;">
            已有账号？<a href="#" onclick="closeModal('registerModal'); showLoginModal(); return false;" style="color: #8b5cf6; text-decoration: none;">立即登录</a>
        </p>
    `);
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

function showSettingsModal() {
    const modal = createModal('settingsModal', `
        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; text-align: center;">个人设置</h2>
        <p style="color: #94a3b8; text-align: center; margin-bottom: 24px;">修改您的个人信息</p>
        <div id="settingsError" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: none;"></div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">用户名</label>
            <input type="text" id="settingsUsername" value="${currentUser?.username || ''}" placeholder="请输入用户名" style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; color: #f8fafc; font-size: 14px;">
        </div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">邮箱</label>
            <input type="email" id="settingsEmail" value="${currentUser?.email || ''}" placeholder="请输入邮箱" style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; color: #f8fafc; font-size: 14px;">
        </div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">手机号</label>
            <input type="tel" id="settingsPhone" value="${currentUser?.phone || ''}" placeholder="请输入手机号" style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; color: #f8fafc; font-size: 14px;">
        </div>
        <div style="margin-bottom: 24px;">
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">新密码（留空不修改）</label>
            <input type="password" id="settingsPassword" placeholder="请输入新密码" style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; color: #f8fafc; font-size: 14px;">
        </div>
        <div style="display: flex; gap: 12px;">
            <button onclick="closeModal('settingsModal')" style="flex: 1; padding: 14px; background: rgba(71, 85, 105, 0.6); border: none; border-radius: 10px; color: #f8fafc; font-size: 14px; font-weight: 500; cursor: pointer;">取消</button>
            <button onclick="handleUpdateProfile()" style="flex: 1; padding: 14px; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); border: none; border-radius: 10px; color: white; font-size: 15px; font-weight: 600; cursor: pointer;">保存</button>
        </div>
    `);
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

function createModal(id, content) {
    let modal = document.getElementById(id);
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = id;
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 20px;
    `;
    modal.innerHTML = `
        <div style="background: rgba(30, 41, 59, 0.95); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 20px; padding: 32px; width: 100%; max-width: 420px; position: relative;">
            <button onclick="closeModal('${id}')" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer;">&times;</button>
            ${content}
        </div>
    `;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(id);
    });
    return modal;
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.remove();
}

async function handleLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (!username || !password) {
        showError(errorDiv, '请输入用户名和密码');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        
        if (data.error) {
            showError(errorDiv, data.error);
        } else {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            closeModal('loginModal');
            updateAuthUI(true);
            alert('登录成功！');
        }
    } catch (error) {
        showError(errorDiv, '登录失败，请稍后重试');
        console.error(error);
    }
}

async function handleRegister() {
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const emailCode = document.getElementById('registerEmailCode').value;
    const password = document.getElementById('registerPassword').value;
    const errorDiv = document.getElementById('registerError');

    if (!username || !email || !password || !emailCode) {
        showError(errorDiv, '请填写所有必填字段');
        return;
    }

    if (password.length < 6) {
        showError(errorDiv, '密码长度至少6位');
        return;
    }

    if (emailCode.length !== 6) {
        showError(errorDiv, '请输入6位邮箱验证码');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, emailCode })
        });
        const data = await response.json();
        
        if (data.error) {
            showError(errorDiv, data.error);
        } else {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            closeModal('registerModal');
            updateAuthUI(true);
            alert('注册成功！');
        }
    } catch (error) {
        showError(errorDiv, '注册失败，请稍后重试');
        console.error(error);
    }
}

async function handleUpdateProfile() {
    const username = document.getElementById('settingsUsername').value;
    const email = document.getElementById('settingsEmail').value;
    const phone = document.getElementById('settingsPhone').value;
    const password = document.getElementById('settingsPassword').value;
    const errorDiv = document.getElementById('settingsError');

    if (!username || !email) {
        showError(errorDiv, '用户名和邮箱不能为空');
        return;
    }

    try {
        const body = { username, email, phone };
        if (password) body.password = password;

        const response = await fetch(`${API_BASE}/auth/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        
        if (data.error) {
            showError(errorDiv, data.error);
        } else {
            currentUser.username = username;
            currentUser.email = email;
            currentUser.phone = phone;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            closeModal('settingsModal');
            updateAuthUI(true);
            alert('更新成功！');
        }
    } catch (error) {
        showError(errorDiv, '更新失败，请稍后重试');
        console.error(error);
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    updateAuthUI(false);
    alert('已退出登录');
}

function showError(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// 保存迁移记录
async function saveMigration(sourcePlatform, targetPlatform, selectedItems) {
    if (!authToken) {
        console.log('用户未登录，跳过保存迁移记录');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/migrations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                source_platform: sourcePlatform,
                target_platform: targetPlatform,
                data_content: JSON.stringify(selectedItems),
                status: 'completed'
            })
        });
        const data = await response.json();
        if (data.message) {
            console.log('迁移记录已保存:', data.id);
        }
    } catch (error) {
        console.error('保存迁移记录失败:', error);
    }
}

// 加载图形验证码
async function loadCaptcha() {
    try {
        const response = await fetch(`${API_BASE}/captcha`);
        const data = await response.json();
        
        const container = document.getElementById('captchaContainer');
        if (container) {
            container.innerHTML = data.captcha;
        }
    } catch (error) {
        console.error('加载验证码失败:', error);
    }
}

// 发送邮箱验证码
async function sendEmailCode() {
    const email = document.getElementById('registerEmail').value;
    const sendBtn = document.getElementById('sendCodeBtn');
    const errorDiv = document.getElementById('registerError');

    if (!email || !email.includes('@')) {
        showError(errorDiv, '请输入有效的邮箱地址');
        return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = '发送中...';

    try {
        const response = await fetch(`${API_BASE}/auth/send-email-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        
        if (data.error) {
            showError(errorDiv, data.error);
            sendBtn.disabled = false;
            sendBtn.textContent = '发送验证码';
        } else {
            alert(data.message);
            
            let countdown = 60;
            const timer = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    sendBtn.textContent = `${countdown}秒后可重发`;
                } else {
                    clearInterval(timer);
                    sendBtn.disabled = false;
                    sendBtn.textContent = '发送验证码';
                }
            }, 1000);
        }
    } catch (error) {
        showError(errorDiv, '发送验证码失败，请稍后重试');
        sendBtn.disabled = false;
        sendBtn.textContent = '发送验证码';
        console.error(error);
    }
}

// 初始化
window.addEventListener('DOMContentLoaded', initAuth);
