// 初始化 LeanCloud
AV.init({
    appId: '8k8O5dXKja46k19GFxSPtiEC-gzGzoHsz',
    appKey: 'YP1pWKaZ1WAF8uWfA82XGBcE',
    serverURL: 'https://8k8o5dxk.lc-cn-n1-shared.com'
});

// 用户管理
let currentUser = null;

// 教师留言 LeanCloud 配置（G6 教师面板同一应用）
const LC_TEACHER = {
    appId: 'G9VqaMo4r9Kl7cCbDqg79o5k-gzGzoHsz',
    appKey: 'ukwaWUiWaTugjrNfIpL2Rs91',
    server: 'https://g9vqamo4.lc-cn-n1-shared.com/1.1',
    sessionToken: null
};

function getValidUsersMap() {
    return {
        'test': '123456',
        'user':'123456',
        'Yuki': '20131025',
        'Sarah': '20140409',
        'Richard': '20140731',
        'Taylor': '20140708',
        'Samuel': '20140102',
        'Orange': '20140427',
        'Eddy': '20140824',
        'Butterfly': '20130927',
        'Avina': '20131226',
        'Ella': '20140415',
        'Bella': '20140714',
        'Zoe': '20140528',
        'Yiyi': '20140722',
        'Stephen': '20140408',
        'Jimmy': '20131214',
        'Suzy': '20130723',
        'Alicia': '20140820'
    };
}

async function teacherLcRequest(path, { method = 'GET', body = null, query = null } = {}) {
    const url = new URL(`${LC_TEACHER.server}${path}`);
    if (query) {
        Object.entries(query).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
    }
    const headers = {
        'X-LC-Id': LC_TEACHER.appId,
        'X-LC-Key': LC_TEACHER.appKey,
        'Content-Type': 'application/json'
    };
    if (LC_TEACHER.sessionToken) {
        headers['X-LC-Session'] = LC_TEACHER.sessionToken;
    }
    const res = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`LeanCloud request failed: ${res.status} ${text}`);
    }
    return await res.json();
}

async function teacherLcLoginOrSignup(username, password) {
    try {
        const loginData = await teacherLcRequest('/login', {
            query: { username, password }
        });
        LC_TEACHER.sessionToken = loginData.sessionToken;
        return loginData;
    } catch (err) {
        // Try signup if login failed
        try {
            const signupData = await teacherLcRequest('/users', {
                method: 'POST',
                body: { username, password }
            });
            LC_TEACHER.sessionToken = signupData.sessionToken || null;
            // If sessionToken missing, attempt login again
            if (!LC_TEACHER.sessionToken) {
                const relogin = await teacherLcRequest('/login', {
                    query: { username, password }
                });
                LC_TEACHER.sessionToken = relogin.sessionToken;
            }
            return signupData;
        } catch (signupErr) {
            console.warn('Teacher LC signup/login failed:', signupErr);
            return null;
        }
    }
}

// 登录功能
function initLogin() {
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const mainContent = document.getElementById('mainContent');
    const currentUserSpan = document.getElementById('currentUser');
    const logoutBtn = document.getElementById('logoutBtn');

    // 检查是否已登录
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = savedUser;
        showMainContent();
    }

    // 登录表单提交
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // 定义有效的用户账户
            const validUsers = {
                'test': '123456',
                'user':'123456',
                'Yuki': '20131025',
                'Sarah': '20140409',
                'Richard': '20140731',
                'Taylor': '20140708',
                'Samuel': '20140102',
                'Orange': '20140427',
                'Eddy': '20140824',
                'Butterfly': '20130927',
                'Avina': '20131226',
                'Ella': '20140415',
                'Bella': '20140714',
                'Zoe': '20140528',
                'Yiyi': '20140722',
                'Stephen': '20140408',
                'Jimmy': '20131214',
                'Suzy': '20130723',
                'Alicia': '20140820'
            };
            
            // 验证用户名和密码
            if (validUsers[username] && validUsers[username] === password) {
                currentUser = username;
                localStorage.setItem('currentUser', username);
                showMainContent();
                loginError.style.display = 'none';
            } else {
                loginError.style.display = 'block';
            }
        });
    }

    // 退出登录
    logoutBtn.addEventListener('click', function() {
        currentUser = null;
        localStorage.removeItem('currentUser');
        showLoginModal();
    });

    async function showMainContent() {
    const loginModal = document.getElementById('loginModal');
    const mainContent = document.getElementById('mainContent');
    const currentUserSpan = document.getElementById('currentUser');

    loginModal.style.display = 'none';
    mainContent.style.display = 'block';
    currentUserSpan.textContent = currentUser;
    loadUserRatings();

    // 登录到教师留言的 LeanCloud 应用，以便读取仅当前学生可见的留言
    const pw = getValidUsersMap()[currentUser];
    if (pw) {
        try {
            await teacherLcLoginOrSignup(currentUser, pw);
        } catch (e) {
            console.warn('无法登录教师留言服务，教师留言可能无法加载。', e);
        }
    }

    // After rendering, initialize comment forms and load existing comments
    // Use a timeout to ensure the DOM has been updated by the async render function
    setTimeout(() => {
        document.querySelectorAll('.comment-form').forEach(form => {
            form.addEventListener('submit', handleCommentSubmit);
        });

        document.querySelectorAll('.unit').forEach(unitDiv => {
            const unitTitleElement = unitDiv.querySelector('.unit-title');
            const commentsDisplay = unitDiv.querySelector('.comments-display');
            if (unitTitleElement && commentsDisplay) {
                const unitId = unitTitleElement.textContent; // Fragile, but matches what's available
                loadUnitComments(unitId, commentsDisplay);
            }
            const teacherNotesDisplay = unitDiv.querySelector('.teacher-notes-display');
            if (teacherNotesDisplay) {
                const unitKey = mapUnitKeyFromDiv(unitDiv);
                if (unitKey) {
                    loadTeacherNotesForUnit(unitKey, teacherNotesDisplay);
                }
            }
        });
    }, 250); // A small delay for safety
}

    function showLoginModal() {
        loginModal.style.display = 'flex';
        mainContent.style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        loginError.style.display = 'none';
    }
}

// 加载用户的历史评分数据
async function loadUserRatings() {
    if (!currentUser) return;
    
    try {
        // 查询当前用户的所有评分记录
        const query = new AV.Query('ObjectiveRating');
        query.equalTo('studentId', currentUser);
        const ratings = await query.find();
        
        // 遍历所有评分记录，更新UI显示
        ratings.forEach(rating => {
            const objectiveId = rating.get('objectiveId');
            const ratingValue = rating.get('rating');
            
            // 找到对应的目标元素
            const objectiveItem = document.querySelector(`[data-objective="${objectiveId}"]`);
            if (objectiveItem) {
                // 更新星级显示
                const starRating = objectiveItem.querySelector('.star-rating');
                const stars = starRating.querySelectorAll('.star');
                const ratingLabel = starRating.querySelector('.rating-label');
                
                // 设置星级状态
                stars.forEach((star, index) => {
                    if (index < ratingValue) {
                        star.classList.add('active');
                    } else {
                        star.classList.remove('active');
                    }
                });
                
                // 更新评分标签
                const ratingTexts = ['', '基础', '良好', '优秀'];
                ratingLabel.textContent = ratingTexts[ratingValue];
                
                // 设置data-rating属性
                objectiveItem.setAttribute('data-rating', ratingValue);
                
                // 显示保存按钮（现在应该显示为"更新评分"）
                const lessonSummary = objectiveItem.closest('.lesson-summary');
                const saveBtn = lessonSummary.querySelector('.save-ratings-btn');
                if (saveBtn) {
                    saveBtn.classList.add('show');
                    saveBtn.textContent = '更新评分';
                }
            }
        });
        
        console.log(`已加载 ${ratings.length} 条评分记录`);
        
    } catch (error) {
        console.error('加载评分数据失败:', error);
        // 如果是表不存在的错误，不显示错误信息，因为这是正常的
        if (error.code === 101 || error.message.includes('does not exist')) {
            console.log('ObjectiveRating表尚未创建，这是正常的');
        } else {
            console.error('其他错误:', error);
        }
    }
}

// Function to handle comment submission
async function handleCommentSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const textarea = form.querySelector('textarea');
    const commentText = textarea.value.trim();
    const unitDiv = form.closest('.unit');
    const unitId = unitDiv.querySelector('.unit-title').textContent; // Note: This is fragile, a data-id would be better

    if (commentText && currentUser) {
        const Comment = AV.Object.extend('UnitComment');
        const comment = new Comment();
        comment.set('unitId', unitId);
        comment.set('studentId', currentUser);
        comment.set('comment', commentText);

        try {
            const savedComment = await comment.save();
            textarea.value = '';
            // Reload comments for the unit to show the new one
            loadUnitComments(unitId, unitDiv.querySelector('.comments-display'));
        } catch (error) {
            console.error('保存评论失败：', error);
            // 如果是表不存在的错误，尝试直接创建
            if (error.code === 101 || error.message.includes('does not exist')) {
                try {
                    // 直接创建新评论，让LeanCloud自动创建表
                    const newComment = new Comment();
                    await newComment.save({
                        unitId: unitId,
                        studentId: currentUser,
                        comment: commentText
                    });
                    textarea.value = '';
                    loadUnitComments(unitId, unitDiv.querySelector('.comments-display'));
                } catch (createError) {
                    console.error('创建评论失败:', createError);
                    alert('评论失败，请稍后重试。');
                }
            } else {
                alert('评论失败，请稍后重试。');
            }
        }
    }
}

// Function to create comment element with hyperlink support
function createCommentElement(comment, unitId, displayElement) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    
    // 如果是user的评论，添加特殊样式
    if (comment.get('studentId') === 'user') {
        commentDiv.classList.add('user-comment');
    }
    
    // 创建评论头部容器
    const commentHeader = document.createElement('div');
    commentHeader.className = 'comment-header-info';
    
    const commentMeta = document.createElement('div');
    commentMeta.className = 'comment-meta';
    commentMeta.textContent = `By ${comment.get('studentId')} on ${new Date(comment.get('createdAt')).toLocaleString()}`;

    commentHeader.appendChild(commentMeta);

    // 如果是当前用户的评论，添加删除按钮
    if (currentUser && comment.get('studentId') === currentUser) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-comment-btn';
        deleteBtn.textContent = '删除';
        deleteBtn.setAttribute('data-comment-id', comment.id);
        deleteBtn.onclick = () => deleteComment(comment.id, unitId, displayElement);
        commentHeader.appendChild(deleteBtn);
    }

    const commentText = document.createElement('p');
    const commentContent = comment.get('comment');
    
    // 将网址转换为超链接
    const textWithLinks = convertUrlsToLinks(commentContent);
    commentText.innerHTML = textWithLinks;

    commentDiv.appendChild(commentHeader);
    commentDiv.appendChild(commentText);
    
    return commentDiv;
}

// Function to convert URLs in text to clickable links
function convertUrlsToLinks(text) {
    // URL正则表达式，匹配http、https、www开头的网址
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
    
    return text.replace(urlRegex, function(url) {
        // 如果URL没有协议，添加https://
        let href = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            href = 'https://' + url;
        }
        
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="comment-link">${url}</a>`;
    });
}

// Function to load comments for a unit
async function loadUnitComments(unitId, displayElement) {
    if (!displayElement) return;

    const query = new AV.Query('UnitComment');
    query.equalTo('unitId', unitId);
    query.addDescending('createdAt');

    try {
        const comments = await query.find();
        displayElement.innerHTML = ''; // Clear existing comments
        
        // 分离user的评论和其他用户的评论
        const userComments = comments.filter(comment => comment.get('studentId') === 'user');
        const otherComments = comments.filter(comment => comment.get('studentId') !== 'user');
        
        // 先显示user的评论（置顶）
        userComments.forEach(comment => {
            const commentDiv = createCommentElement(comment, unitId, displayElement);
            displayElement.appendChild(commentDiv);
        });
        
        // 再显示其他用户的评论
        otherComments.forEach(comment => {
            const commentDiv = createCommentElement(comment, unitId, displayElement);
            displayElement.appendChild(commentDiv);
        });
    } catch (error) {
        console.error(`加载 ${unitId} 的评论失败：`, error);
        // 如果是表不存在的错误，不显示错误信息，因为这是正常的
        if (error.code === 101 || error.message.includes('does not exist')) {
            console.log('UnitComment表尚未创建，这是正常的');
        } else {
            console.error('其他错误:', error);
        }
    }
}

// Function to delete a comment
async function deleteComment(commentId, unitId, displayElement) {
    // 添加删除确认
    if (!confirm('确定要删除这条评论吗？此操作无法撤销。')) {
        return;
    }

    try {
        // 首先验证评论是否属于当前用户
        const query = new AV.Query('UnitComment');
        const comment = await query.get(commentId);
        
        // 安全检查：确保只有评论作者可以删除
        if (comment.get('studentId') !== currentUser) {
            alert('您只能删除自己的评论！');
            return;
        }

        // 删除评论
        await comment.destroy();
        
        // 重新加载评论列表
        loadUnitComments(unitId, displayElement);
        
        // 显示成功消息
        alert('评论已成功删除！');
        
    } catch (error) {
        console.error('删除评论失败：', error);
        alert('删除评论失败，请稍后重试。');
    }
}

// Function to toggle comments section
function toggleComments(button) {
    const commentContent = button.closest('.comment-section').querySelector('.comment-content');
    const isCollapsed = commentContent.classList.contains('collapsed');
    
    if (isCollapsed) {
        commentContent.classList.remove('collapsed');
        button.textContent = '▼';
    } else {
        commentContent.classList.add('collapsed');
        button.textContent = '▶';
    }
}

function toggleRubrics(button) {
    const rubricsSection = button.closest('.rubrics-section');
    const rubricsContent = rubricsSection.querySelector('.rubrics-content');
    
    rubricsSection.classList.toggle('collapsed');
    
    if (rubricsSection.classList.contains('collapsed')) {
        button.textContent = '▶';
    } else {
        button.textContent = '▼';
    }
}

function toggleExemplar(button) {
    const exemplarSection = button.closest('.exemplar-section');
    const exemplarContent = exemplarSection.querySelector('.exemplar-content');
    
    exemplarSection.classList.toggle('collapsed');
    
    if (exemplarSection.classList.contains('collapsed')) {
        button.textContent = '▶';
    } else {
        button.textContent = '▼';
    }
}

// Toggle for Teacher Notes section
function toggleTeacherNotes(button) {
    const section = button.closest('.teacher-note-section');
    const content = section.querySelector('.teacher-note-content');
    const isCollapsed = content.classList.contains('collapsed');
    if (isCollapsed) {
        content.classList.remove('collapsed');
        button.textContent = '▼';
    } else {
        content.classList.add('collapsed');
        button.textContent = '▶';
    }
}

// 点击“更新”按钮时，手动刷新该单元的教师留言
function refreshTeacherNotes(button) {
    const section = button.closest('.teacher-note-section');
    const unitDiv = button.closest('.unit');
    const displayElement = section.querySelector('.teacher-notes-display');
    const unitKey = mapUnitKeyFromDiv(unitDiv);

    if (!unitKey || !displayElement) return;

    const originalText = button.textContent;
    button.textContent = '更新中…';
    button.disabled = true;

    // 显示更新提示
    displayElement.innerHTML = '<div class="teacher-note"><div class="teacher-note-meta">正在更新教师留言…</div></div>';

    Promise.resolve()
        .then(() => loadTeacherNotesForUnit(unitKey, displayElement))
        .finally(() => {
            button.textContent = originalText;
            button.disabled = false;
        });
}

function mapUnitKeyFromDiv(unitDiv) {
    if (!unitDiv || !unitDiv.id) return null;
    const match = unitDiv.id.match(/^unit-(\d+)/);
    if (match) return `unit${match[1]}`;
    return null;
}

function normalizeUnitId(raw) {
    if (!raw && raw !== 0) return null;
    const str = String(raw);
    // Try to extract a unit number from common patterns: "unit2", "unit-2", "Unit 2", "2"
    const m = str.match(/unit\s*[-_]?\s*(\d+)/i) || str.match(/\b(\d)\b/);
    if (m && m[1]) return `unit${m[1]}`;
    return null;
}

async function loadTeacherNotesForUnit(unitKey, displayElement) {
    if (!displayElement) return;
    if (!currentUser) {
        displayElement.innerHTML = '<div class="teacher-note">请先登录以查看教师留言。</div>';
        return;
    }
    if (!LC_TEACHER.sessionToken) {
        displayElement.innerHTML = '<div class="teacher-note">教师留言服务未连接，稍后将自动重试或请刷新页面。</div>';
        return;
    }
    try {
        // 宽松查询：仅按学生名查询，前端再按单元过滤，防止因历史数据unitId不一致导致漏显
        const where = JSON.stringify({ studentName: currentUser });
        const data = await teacherLcRequest('/classes/G6TeacherComment', {
            query: { where, order: '-createdAt', limit: '100' }
        });
        const allNotes = data.results || [];
        const notes = allNotes.filter(n => normalizeUnitId(n.unitId) === unitKey);
        displayElement.innerHTML = '';
        notes.forEach(n => {
            const noteEl = renderTeacherNote(n);
            displayElement.appendChild(noteEl);
        });
        if (notes.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'teacher-note';
            empty.textContent = '暂无教师留言。';
            displayElement.appendChild(empty);
        }
    } catch (e) {
        console.error(`加载教师留言失败 (${unitKey}):`, e);
    }
}

function renderTeacherNote(note) {
    const wrap = document.createElement('div');
    wrap.className = 'teacher-note';
    const meta = document.createElement('div');
    meta.className = 'teacher-note-meta';
    const createdAt = note.createdAt ? new Date(note.createdAt).toLocaleString() : '';
    meta.textContent = `时间：${createdAt}`;
    const text = document.createElement('div');
    text.className = 'teacher-note-text';
    text.textContent = note.text || note.message || note.content || '';
    wrap.appendChild(meta);
    wrap.appendChild(text);
    return wrap;
}

document.addEventListener('DOMContentLoaded', function() {
    // 初始化登录功能
    initLogin();
    
    // Get all grade buttons and content sections
    const gradeButtons = document.querySelectorAll('.grade-btn');
    const gradeContents = document.querySelectorAll('.grade-content');
    
    // Add click event listeners to grade buttons
    gradeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetGrade = this.getAttribute('data-grade');
            
            // Remove active class from all buttons and content
            gradeButtons.forEach(btn => btn.classList.remove('active'));
            gradeContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding grade content
            const targetContent = document.getElementById(`grade-${targetGrade}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
    
    // Add smooth scrolling for better user experience
    function smoothScrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
    
    // Add click event to grade buttons for smooth scrolling
    gradeButtons.forEach(button => {
        button.addEventListener('click', smoothScrollToTop);
    });
    
    // Add hover effects for lesson cards
    const lessonCards = document.querySelectorAll('.lesson-card');
    
    lessonCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(5px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0) scale(1)';
        });
    });
    
    // Add collapsible functionality for units and lessons
    function initializeCollapsible() {
        const collapsibleElements = document.querySelectorAll('.collapsible');
        
        collapsibleElements.forEach(element => {
            element.addEventListener('click', function() {
                let content = this.nextElementSibling;
                while(content && !content.classList.contains('collapsible-content')) {
                    content = content.nextElementSibling;
                }
                const icon = this.querySelector('.toggle-icon');
                
                if (content && content.classList.contains('collapsible-content')) {
                    content.classList.toggle('collapsed');
                    icon.classList.toggle('rotated');
                    
                    // Add smooth animation
                    if (content.classList.contains('collapsed')) {
                        content.style.maxHeight = '0';
                        content.style.padding = '0';
                    } else {
                        // Remove maxHeight temporarily to get accurate scrollHeight
                        content.style.maxHeight = 'none';
                        content.style.padding = '';
                        // Force reflow to ensure accurate measurement
                        content.offsetHeight;
                        // Use a more generous height calculation for dynamic content
                        const calculatedHeight = Math.max(content.scrollHeight, content.offsetHeight) + 100;
                        content.style.maxHeight = calculatedHeight + 'px';
                    }
                }
            });
        });
    }
    // 暴露为全局，便于动态渲染后复用
    window.initializeCollapsible = initializeCollapsible;
    
    // Initialize collapsible functionality
    initializeCollapsible();
    
    // Set initial heights for all collapsible content
    function setInitialHeights() {
        const contents = document.querySelectorAll('.collapsible-content');
        contents.forEach(content => {
            if (!content.classList.contains('collapsed')) {
                content.style.maxHeight = 'none';
                content.offsetHeight; // Force reflow
                const calculatedHeight = Math.max(content.scrollHeight, content.offsetHeight) + 100;
                content.style.maxHeight = calculatedHeight + 'px';
            }
        });
    }
    // 暴露为全局
    window.setInitialHeights = setInitialHeights;
    
    // Set initial heights
    setInitialHeights();
    
    // Function to recalculate heights for expanded content
    function recalculateHeights() {
        const expandedContents = document.querySelectorAll('.collapsible-content:not(.collapsed)');
        expandedContents.forEach(content => {
            content.style.maxHeight = 'none';
            content.offsetHeight; // Force reflow
            const calculatedHeight = Math.max(content.scrollHeight, content.offsetHeight) + 100;
            content.style.maxHeight = calculatedHeight + 'px';
        });
    }
    
    // Add mutation observer to watch for content changes
    const observer = new MutationObserver(function(mutations) {
        let shouldRecalculate = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' || mutation.type === 'attributes') {
                shouldRecalculate = true;
            }
        });
        if (shouldRecalculate) {
            setTimeout(recalculateHeights, 100); // Delay to ensure DOM updates are complete
        }
    });
    
    // Observe changes in lesson summaries (where star ratings are)
    document.querySelectorAll('.lesson-summary').forEach(summary => {
        observer.observe(summary, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    });
    
    // Add expand/collapse all functionality
    function addExpandCollapseAllButtons() {
        const gradeContents = document.querySelectorAll('.grade-content');
        
        gradeContents.forEach(gradeContent => {
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'collapse-controls';
            controlsDiv.style.cssText = `
                text-align: center;
                margin-bottom: 1.5rem;
                gap: 1rem;
                display: flex;
                justify-content: center;
            `;
            
            const expandAllBtn = document.createElement('button');
            expandAllBtn.textContent = 'Expand All';
            expandAllBtn.className = 'control-btn';
            expandAllBtn.style.cssText = `
                padding: 8px 16px;
                border: 2px solid #667eea;
                background: white;
                color: #667eea;
                border-radius: 20px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.3s ease;
            `;
            
            const collapseAllBtn = document.createElement('button');
            collapseAllBtn.textContent = 'Collapse All';
            collapseAllBtn.className = 'control-btn';
            collapseAllBtn.style.cssText = expandAllBtn.style.cssText;
            
            // Add hover effects
            [expandAllBtn, collapseAllBtn].forEach(btn => {
                btn.addEventListener('mouseenter', function() {
                    this.style.background = '#667eea';
                    this.style.color = 'white';
                });
                btn.addEventListener('mouseleave', function() {
                    this.style.background = 'white';
                    this.style.color = '#667eea';
                });
            });
            
            expandAllBtn.addEventListener('click', function() {
                const contents = gradeContent.querySelectorAll('.collapsible-content');
                const icons = gradeContent.querySelectorAll('.toggle-icon');
                
                contents.forEach(content => {
                    content.classList.remove('collapsed');
                    // Remove maxHeight temporarily to get accurate scrollHeight
                    content.style.maxHeight = 'none';
                    content.style.padding = '';
                    // Force reflow to ensure accurate measurement
                    content.offsetHeight;
                    // Use a more generous height calculation for dynamic content
                    const calculatedHeight = Math.max(content.scrollHeight, content.offsetHeight) + 100;
                    content.style.maxHeight = calculatedHeight + 'px';
                });
                
                icons.forEach(icon => {
                    icon.classList.remove('rotated');
                });
            });
            
            collapseAllBtn.addEventListener('click', function() {
                const contents = gradeContent.querySelectorAll('.collapsible-content');
                const icons = gradeContent.querySelectorAll('.toggle-icon');
                
                contents.forEach(content => {
                    content.classList.add('collapsed');
                    content.style.maxHeight = '0';
                    content.style.padding = '0';
                });
                
                icons.forEach(icon => {
                    icon.classList.add('rotated');
                });
            });
            
            controlsDiv.appendChild(expandAllBtn);
            controlsDiv.appendChild(collapseAllBtn);
            
            const firstUnit = gradeContent.querySelector('.unit');
            if (firstUnit) {
                gradeContent.insertBefore(controlsDiv, firstUnit);
            }
        });
    }
    // 暴露为全局
    window.addExpandCollapseAllButtons = addExpandCollapseAllButtons;

    // 提供与按钮相同逻辑的程序化方法，供导航点击时调用
    function expandAllContents(container) {
        if (!container) return;
        const contents = container.querySelectorAll('.collapsible-content');
        const icons = container.querySelectorAll('.toggle-icon');
        contents.forEach(content => {
            content.classList.remove('collapsed');
            content.style.maxHeight = 'none';
            content.style.padding = '';
            // 强制重排以确保测量准确
            content.offsetHeight;
            const calculatedHeight = Math.max(content.scrollHeight, content.offsetHeight) + 100;
            content.style.maxHeight = calculatedHeight + 'px';
        });
        icons.forEach(icon => {
            icon.classList.remove('rotated');
        });
    }

    function collapseAllContents(container) {
        if (!container) return;
        const contents = container.querySelectorAll('.collapsible-content');
        const icons = container.querySelectorAll('.toggle-icon');
        contents.forEach(content => {
            content.classList.add('collapsed');
            content.style.maxHeight = '0';
            content.style.padding = '0';
        });
        icons.forEach(icon => {
            icon.classList.add('rotated');
        });
    }
    // 暴露为全局以便其他模块复用
    window.expandAllContents = expandAllContents;
    window.collapseAllContents = collapseAllContents;
    
    // Add expand/collapse all buttons
    addExpandCollapseAllButtons();
    
    // Add loading animation effect
    function addLoadingEffect() {
        const units = document.querySelectorAll('.unit');
        
        units.forEach((unit, index) => {
            unit.style.opacity = '0';
            unit.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                unit.style.transition = 'all 0.6s ease';
                unit.style.opacity = '1';
                unit.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }
    // 暴露为全局
    window.addLoadingEffect = addLoadingEffect;
    
    // Initialize loading effect
    addLoadingEffect();
    
    // Re-apply loading effect and reinitialize collapsible when switching grades
    gradeButtons.forEach(button => {
        button.addEventListener('click', function() {
            setTimeout(() => {
                addLoadingEffect();
                initializeCollapsible();
                setInitialHeights();
            }, 100);
        });
    });
    

    
    // 星级评分功能
    function initializeStarRating() {
        const stars = document.querySelectorAll('.star');
        const saveButtons = document.querySelectorAll('.save-ratings-btn');
        
        // 为每个星星添加点击事件
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const rating = parseInt(this.getAttribute('data-rating'));
                const objectiveItem = this.closest('.objective-item');
                const starRating = this.closest('.star-rating');
                const ratingLabel = starRating.querySelector('.rating-label');
                const allStars = starRating.querySelectorAll('.star');
                const saveBtn = objectiveItem.closest('.lesson-summary').querySelector('.save-ratings-btn');
                
                // 更新星星状态
                allStars.forEach((s, index) => {
                    if (index < rating) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
                
                // 更新评分标签
                const ratingTexts = ['', '基础', '良好', '优秀'];
                ratingLabel.textContent = ratingTexts[rating];
                
                // 存储评分到元素的data属性
                objectiveItem.setAttribute('data-rating', rating);
                
                // 显示保存按钮
                if (saveBtn) {
                    saveBtn.classList.add('show');
                    // 重新计算容器高度以适应新显示的按钮
                    setTimeout(() => {
                        const collapsibleContent = this.closest('.collapsible-content');
                        if (collapsibleContent && !collapsibleContent.classList.contains('collapsed')) {
                            collapsibleContent.style.maxHeight = 'none';
                            collapsibleContent.offsetHeight;
                            const calculatedHeight = Math.max(collapsibleContent.scrollHeight, collapsibleContent.offsetHeight) + 100;
                            collapsibleContent.style.maxHeight = calculatedHeight + 'px';
                        }
                    }, 50);
                }
            });
            
            // 添加悬停效果
            star.addEventListener('mouseenter', function() {
                const rating = parseInt(this.getAttribute('data-rating'));
                const starRating = this.closest('.star-rating');
                const allStars = starRating.querySelectorAll('.star');
                
                allStars.forEach((s, index) => {
                    if (index < rating) {
                        s.style.color = '#ffd700';
                    } else {
                        s.style.color = '#ddd';
                    }
                });
            });
            
            star.addEventListener('mouseleave', function() {
                const starRating = this.closest('.star-rating');
                const allStars = starRating.querySelectorAll('.star');
                
                // 恢复到实际评分状态
                allStars.forEach(s => {
                    if (s.classList.contains('active')) {
                        s.style.color = '#ffd700';
                    } else {
                        s.style.color = '#ddd';
                    }
                });
            });
        });
        
        // 为保存按钮添加点击事件
        saveButtons.forEach(button => {
            button.addEventListener('click', async function() {
                const lessonName = this.getAttribute('data-lesson');
                const lessonSummary = this.closest('.lesson-summary');
                const objectiveItems = lessonSummary.querySelectorAll('.objective-item');
                const successMessage = lessonSummary.querySelector('.rating-success');
                
                // 收集所有评分数据
                const ratings = [];
                objectiveItems.forEach(item => {
                    const objectiveId = item.getAttribute('data-objective');
                    const rating = item.getAttribute('data-rating');
                    const objectiveText = item.querySelector('.objective-text').textContent;
                    
                    if (rating) {
                        ratings.push({
                            objectiveId: objectiveId,
                            objectiveText: objectiveText,
                            rating: parseInt(rating),
                            lessonName: lessonName
                        });
                    }
                });
                
                if (ratings.length === 0) {
                    alert('请至少为一个学习目标评分');
                    return;
                }
                
                // 禁用按钮
                this.disabled = true;
                this.textContent = '保存中...';
                
                try {
                    // 保存到LeanCloud
                    const ObjectiveRating = AV.Object.extend('ObjectiveRating');
                    
                    for (const rating of ratings) {
                        try {
                            // 查询是否已存在相同学生和目标的记录
                            const query = new AV.Query('ObjectiveRating');
                            query.equalTo('studentId', currentUser || 'anonymous');
                            query.equalTo('objectiveId', rating.objectiveId);
                            
                            const existingRating = await query.first();
                            
                            let ratingObj;
                            if (existingRating) {
                                // 如果存在，更新现有记录
                                existingRating.set('lessonName', rating.lessonName);
                                existingRating.set('objectiveText', rating.objectiveText);
                                existingRating.set('rating', rating.rating);
                                existingRating.set('updateTime', new Date());
                                await existingRating.save();
                            } else {
                                // 如果不存在，创建新记录
                                ratingObj = new ObjectiveRating();
                                await ratingObj.save({
                                    lessonName: rating.lessonName,
                                    objectiveText: rating.objectiveText,
                                    rating: rating.rating,
                                    studentId: currentUser || 'anonymous',
                                    objectiveId: rating.objectiveId,
                                    updateTime: new Date()
                                });
                            }
                        } catch (tableError) {
                            console.error('数据表操作失败:', tableError);
                            // 如果ObjectiveRating表不存在，尝试创建并保存
                            if (tableError.code === 101 || tableError.message.includes('does not exist')) {
                                try {
                                    // 直接创建新记录，让LeanCloud自动创建表
                                    const newRating = new ObjectiveRating();
                                    await newRating.save({
                                        lessonName: rating.lessonName,
                                        objectiveText: rating.objectiveText,
                                        rating: rating.rating,
                                        studentId: currentUser || 'anonymous',
                                        objectiveId: rating.objectiveId,
                                        updateTime: new Date()
                                    });
                                } catch (createError) {
                                    console.error('创建记录失败:', createError);
                                    throw createError;
                                }
                            } else {
                                throw tableError;
                            }
                        }
                    }
                    
                    // 显示成功消息
                    successMessage.style.display = 'block';
                    // 保持按钮显示，以便用户可以再次更新评分
                    this.textContent = '更新评分';
                    
                    // 重新计算容器高度以适应成功消息
                    setTimeout(() => {
                        const collapsibleContent = lessonSummary.closest('.collapsible-content');
                        if (collapsibleContent && !collapsibleContent.classList.contains('collapsed')) {
                            collapsibleContent.style.maxHeight = 'none';
                            collapsibleContent.offsetHeight;
                            const calculatedHeight = Math.max(collapsibleContent.scrollHeight, collapsibleContent.offsetHeight) + 100;
                            collapsibleContent.style.maxHeight = calculatedHeight + 'px';
                        }
                    }, 50);
                    
                    // 3秒后隐藏成功消息，但保持按钮显示
                    setTimeout(() => {
                        successMessage.style.display = 'none';
                        // 隐藏成功消息后重新计算高度
                        setTimeout(() => {
                            const collapsibleContent = lessonSummary.closest('.collapsible-content');
                            if (collapsibleContent && !collapsibleContent.classList.contains('collapsed')) {
                                collapsibleContent.style.maxHeight = 'none';
                                collapsibleContent.offsetHeight;
                                const calculatedHeight = Math.max(collapsibleContent.scrollHeight, collapsibleContent.offsetHeight) + 100;
                                collapsibleContent.style.maxHeight = calculatedHeight + 'px';
                            }
                        }, 50);
                    }, 3000);
                    
                } catch (error) {
                    console.error('保存评分失败:', error);
                    alert('保存失败：' + (error.message || '请稍后重试'));
                } finally {
                    // 恢复按钮
                    this.disabled = false;
                    this.textContent = '保存评分';
                }
            });
        });
    }
    // 暴露为全局
    window.initializeStarRating = initializeStarRating;
    
    // 初始化星级评分功能
    initializeStarRating();

    // New popup logic for objective details
    function initializeCustomTooltips() {
        const popup = document.getElementById('details-popup');
        let currentTarget = null;

        function showPopup(target) {
            const detailsContent = target.querySelector('.objective-details');
            if (!detailsContent) return;

            // Set popup content and position
            popup.innerHTML = detailsContent.innerHTML;
            const targetRect = target.getBoundingClientRect();
            const top = window.scrollY + targetRect.bottom;
            const left = window.scrollX + targetRect.left + (targetRect.width / 2) - (popup.offsetWidth / 2);

            popup.style.top = `${top}px`;
            popup.style.left = `${left}px`;

            // Show popup with animation
            popup.classList.add('visible');
            currentTarget = target;
        }

        function hidePopup() {
            popup.classList.remove('visible');
            currentTarget = null;
        }

        // Use event delegation for objective items
        document.body.addEventListener('click', function(event) {
            const target = event.target.closest('.objective-item');

            if (target) {
                event.stopPropagation();
                if (target === currentTarget) {
                    hidePopup();
                } else {
                    showPopup(target);
                }
            } else if (currentTarget && !popup.contains(event.target)) {
                hidePopup();
            }
        });
    }

    window.initializeCustomTooltips = initializeCustomTooltips;
    initializeCustomTooltips();
});


// Smooth scrolling and navbar active state
function initNavbarScroll() {
    const navbar = document.querySelector('.top-navbar');
    const links = document.querySelectorAll('.nav-menu a');
    const sections = Array.from(links).map(link => document.getElementById(link.dataset.target)).filter(Boolean);
    const gradeContent = document.querySelector('#grade-6');

    // Helper: show only one unit and hide others
    function showOnlyUnitById(targetId) {
        if (!gradeContent) return;
        gradeContent.classList.add('single-mode');
        const units = gradeContent.querySelectorAll('.unit');
        units.forEach(unit => {
            if (unit.id === targetId) {
                unit.classList.add('single-active');
            } else {
                unit.classList.remove('single-active');
            }
        });
    }

    // Smooth scroll on click + single-unit mode
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.dataset.target;
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                // Enter single-unit mode
                showOnlyUnitById(targetId);
                // 导航点击时：先全部折叠再全部展开（作用域限定在该单元）
                if (window.collapseAllContents && window.expandAllContents) {
                    window.collapseAllContents(targetEl);
                    // 使用微小延时确保样式应用后再展开，避免高度计算抖动
                    setTimeout(() => window.expandAllContents(targetEl), 0);
                }
                // Update hash to reflect current unit
                if (window.location.hash !== `#${targetId}`) {
                    window.location.hash = targetId;
                }
                // Smooth scroll accounting for fixed navbar
                const headerOffset = 64; // account for fixed navbar
                const elementPosition = targetEl.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = elementPosition - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
        });
    });

    // Active state on scroll using IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const id = entry.target.id;
            const link = document.querySelector(`.nav-menu a[data-target="${id}"]`);
            if (!link) return;
            if (entry.isIntersecting) {
                links.forEach(a => a.classList.remove('active'));
                link.classList.add('active');
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -60% 0px', // trigger when section top crosses viewport top
        threshold: 0.2
    });

    sections.forEach(sec => observer.observe(sec));

    // Enter single-unit mode if URL has hash initially
    const initialHash = window.location.hash ? window.location.hash.replace('#','') : '';
    if (initialHash) {
        showOnlyUnitById(initialHash);
        const activeLink = document.querySelector(`.nav-menu a[data-target="${initialHash}"]`);
        if (activeLink) {
            links.forEach(a => a.classList.remove('active'));
            activeLink.classList.add('active');
        }
    }

    // Listen for hash changes to switch units
    window.addEventListener('hashchange', () => {
        const hashId = window.location.hash ? window.location.hash.replace('#','') : '';
        if (hashId) {
            showOnlyUnitById(hashId);
            const activeLink = document.querySelector(`.nav-menu a[data-target="${hashId}"]`);
            if (activeLink) {
                links.forEach(a => a.classList.remove('active'));
                activeLink.classList.add('active');
            }
        } else {
            // Exit single-unit mode when hash cleared
            if (gradeContent) {
                gradeContent.classList.remove('single-mode');
                const units = gradeContent.querySelectorAll('.unit');
                units.forEach(u => u.classList.remove('single-active'));
            }
        }
    });
}

// Ensure navbar init after showing main content
(function() {
    const originalShowMainContent = window.showMainContent;
    if (typeof originalShowMainContent === 'function') {
        window.showMainContent = function() {
            originalShowMainContent.apply(this, arguments);
            setTimeout(initNavbarScroll, 0);
        };
    } else {
        // Fallback: try init after DOMContentLoaded when navbar exists
        document.addEventListener('DOMContentLoaded', () => {
            if (document.querySelector('.top-navbar')) {
                initNavbarScroll();
            }
        });
    }
})();
