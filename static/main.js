// ==========================================
// 1. Data Configuration
// ==========================================

// 题目配置（可修改）
const QUIZ_CONFIG = {
    singleCount: 6,    // 单选题数量
    multiCount: 4,     // 多选题数量
    judgeCount: 0,     // 判断题数量
    fillCount: 0,      // 填空题数量
    passScore: 100,      // 及格分数（百分比）
    maxRecords: 20,     // 最多保存历史记录数
    loginExpireDays: 30 // 登录有效期（天）
};

// 计算总题数
const TOTAL_QUESTIONS = QUIZ_CONFIG.singleCount + QUIZ_CONFIG.multiCount +
                        QUIZ_CONFIG.judgeCount + QUIZ_CONFIG.fillCount;

// Data will be loaded from JSON files
let STUDENTS = [];
let QUESTIONS = [];

// Load data from JSON files
async function loadData() {
    try {
        const [studentsRes, questionsRes] = await Promise.all([
            fetch('static/students.json'),
            fetch('static/questions.json')
        ]);

        STUDENTS = await studentsRes.json();
        QUESTIONS = await questionsRes.json();

        console.log(`数据加载成功：${STUDENTS.length}个学生，${QUESTIONS.length}道题目`);

        // 检查登录状态
        const savedUser = getLoginState();
        if (savedUser) {
            state.currentUser = savedUser;
            renderDashboard();
        } else {
            renderLogin();
        }
    } catch (error) {
        console.error('数据加载失败:', error);
        alert('数据加载失败，请刷新页面重试');
    }
}

// Start loading data
loadData();

// ==========================================
// 2. Application State
// ==========================================

const state = {
    currentUser: null,
    currentQuestions: [],
    currentQuestionIndex: 0,
    score: 0,
    answers: [],           // 用户答案
    submitted: [],         // 是否已提交
    correctFlags: [],      // 是否答对
    quizMode: 'random'     // 试题模式: 'random'随机试题, 'all'全部试题
};

// ==========================================
// 3. Local Storage Functions
// ==========================================

// 保存登录状态（有效期30天）
function saveLoginState(user) {
    const expireTime = Date.now() + QUIZ_CONFIG.loginExpireDays * 24 * 60 * 60 * 1000;
    const loginData = {
        user: user,
        expireTime: expireTime
    };
    localStorage.setItem('zscq_login', JSON.stringify(loginData));
}

// 读取登录状态
function getLoginState() {
    const loginDataStr = localStorage.getItem('zscq_login');
    if (!loginDataStr) return null;

    try {
        const loginData = JSON.parse(loginDataStr);
        // 检查是否过期
        if (Date.now() > loginData.expireTime) {
            localStorage.removeItem('zscq_login');
            return null;
        }
        return loginData.user;
    } catch (e) {
        return null;
    }
}

// 保存考试记录
function saveExamRecord(score, total, date) {
    const records = getExamRecords();
    const record = {
        score: score,
        total: total,
        percentage: (score / total * 100).toFixed(1),
        date: date || new Date().toLocaleString('zh-CN')
    };
    records.push(record);
    // 只保留最近N次记录
    if (records.length > QUIZ_CONFIG.maxRecords) {
        records.shift();
    }
    localStorage.setItem('zscq_records', JSON.stringify(records));
}

// 获取考试记录
function getExamRecords() {
    const recordsStr = localStorage.getItem('zscq_records');
    if (!recordsStr) return [];
    try {
        return JSON.parse(recordsStr);
    } catch (e) {
        return [];
    }
}

// ==========================================
// 4. Utility Functions
// ==========================================

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function getRandomQuestions() {
    // 按类型分组
    const singleQuestions = QUESTIONS.filter(q => q.type === 'single');
    const multiQuestions = QUESTIONS.filter(q => q.type === 'multi');
    const judgeQuestions = QUESTIONS.filter(q => q.type === 'judge');
    const fillQuestions = QUESTIONS.filter(q => q.type === 'fill');

    // 随机抽取指定数量的题目
    const selected = [
        ...shuffleArray(singleQuestions).slice(0, QUIZ_CONFIG.singleCount),
        ...shuffleArray(multiQuestions).slice(0, QUIZ_CONFIG.multiCount),
        ...shuffleArray(judgeQuestions).slice(0, QUIZ_CONFIG.judgeCount),
        ...shuffleArray(fillQuestions).slice(0, QUIZ_CONFIG.fillCount)
    ];

    return shuffleArray(selected);
}

function getAllQuestions() {
    // 获取全部试题并随机排序
    return shuffleArray([...QUESTIONS]);
}

// ==========================================
// 4. Render Functions
// ==========================================

function renderLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="flex-1 flex flex-col p-6 fade-in h-full overflow-y-auto">
            <div class="mb-8 text-center">
                <div class="w-20 h-20 bg-blue-600 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg">
                    <svg class="svg-inline--fa fa-balance-scale text-3xl text-white" data-prefix="fas" data-icon="balance-scale" role="img"
                         viewBox="0 0 640 512" aria-hidden="true">
                        <path fill="currentColor"
                              d="M256 336h128c8.8 0 16-7.2 16-16V176c0-8.8-7.2-16-16-16H256c-8.8 0-16 7.2-16 16v144c0 8.8 7.2 16 16 16zm288-32c0 35.3-28.7 64-64 64s-64-28.7-64-64 28.7-64 64-64 64 28.7 64 64zm-448 0c0 35.3-28.7 64-64 64s-64-28.7-64-64 28.7-64 64-64 64 28.7 64 64zM576 64H384v96h192V64zm0 160H384v96h192v-96zm0 160H384v64h192v-64zM0 64v384h320V64H0z"></path>
                    </svg>
                </div>
                <h1 class="text-2xl font-bold text-gray-800">知识产权知识竞赛</h1>
                <p class="text-gray-500 text-sm mt-1">请使用学号和姓名登录</p>
            </div>

            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">学号</label>
                    <input type="text" id="login-id"
                           class="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none transition"
                           placeholder="请输入学号">
                </div>
                <div class="mb-6">
                    <label class="block text-gray-700 text-sm font-bold mb-2">姓名</label>
                    <input type="text" id="login-name"
                           class="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none transition"
                           placeholder="请输入姓名">
                </div>
                <div id="login-error" class="text-red-500 text-sm mb-4 hidden text-center"></div>
                <button onclick="handleLogin()"
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition transform active:scale-95">
                    开始答题
                </button>
            </div>
        </div>
    `;
}

function renderDashboard() {
    const records = getExamRecords();

    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="flex-1 flex flex-col p-6 fade-in h-full overflow-y-auto">
            <div class="mb-8 text-center">
                <div class="w-20 h-20 bg-blue-600 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg">
                    <svg class="svg-inline--fa fa-balance-scale text-3xl text-white" data-prefix="fas" data-icon="balance-scale" role="img"
                         viewBox="0 0 640 512" aria-hidden="true">
                        <path fill="currentColor"
                              d="M256 336h128c8.8 0 16-7.2 16-16V176c0-8.8-7.2-16-16-16H256c-8.8 0-16 7.2-16 16v144c0 8.8 7.2 16 16 16zm288-32c0 35.3-28.7 64-64 64s-64-28.7-64-64 28.7-64 64-64 64 28.7 64 64zm-448 0c0 35.3-28.7 64-64 64s-64-28.7-64-64 28.7-64 64-64 64 28.7 64 64zM576 64H384v96h192V64zm0 160H384v96h192v-96zm0 160H384v64h192v-64zM0 64v384h320V64H0z"></path>
                    </svg>
                </div>
                <h1 class="text-2xl font-bold text-gray-800">知识产权知识竞赛</h1>
                <p class="text-gray-500 text-sm mt-1">欢迎, ${state.currentUser.name}</p>
            </div>

            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4 text-center">选择试题模式</h3>

                <div class="mb-4 p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
                    <div class="text-center mb-3">
                        <div class="text-xl font-bold text-blue-600">随机试题</div>
                        <div class="text-sm text-gray-500 mt-1">随机抽取${TOTAL_QUESTIONS}道题</div>
                    </div>
                    <button onclick="startQuiz('random')"
                            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition transform active:scale-95">
                        开始答题
                    </button>
                </div>

                <div class="p-4 rounded-lg border-2 border-green-200 bg-green-50">
                    <div class="text-center mb-3">
                        <div class="text-xl font-bold text-green-600">全部试题</div>
                        <div class="text-sm text-gray-500 mt-1">共${QUESTIONS.length}道题</div>
                    </div>
                    <button onclick="startQuiz('all')"
                            class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow transition transform active:scale-95">
                        开始答题
                    </button>
                </div>

                <button onclick="logout()"
                        class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg transition mt-4">
                    退出登录
                </button>
            </div>

            ${records.length > 0 ? `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">历史成绩</h3>
                    <div class="space-y-2">
                        ${records.slice().reverse().slice(0, 5).map((r, idx) => `
                            <div class="flex justify-between items-center p-3 rounded-lg ${idx === 0 ? 'bg-blue-50' : 'bg-gray-50'}">
                                <span class="text-sm text-gray-600">${r.date}</span>
                                <span class="font-bold ${r.score === r.total ? 'text-green-600' : 'text-red-600'}">${r.score}分 ${r.score === r.total ? '✓' : ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function logout() {
    // 清除登录状态
    localStorage.removeItem('zscq_login');
    state.currentUser = null;
    renderLogin();
}

function renderQuiz() {
    const question = state.currentQuestions[state.currentQuestionIndex];
    const progress = ((state.currentQuestionIndex) / state.currentQuestions.length * 100).toFixed(0);
    const isSubmitted = state.submitted[state.currentQuestionIndex];
    const isCorrect = state.correctFlags[state.currentQuestionIndex];

    let questionHtml = '';
    let feedbackHtml = '';

    // 如果已提交，显示反馈
    if (isSubmitted) {
        if (isCorrect) {
            feedbackHtml = `<div class="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg">
                <p class="text-green-700 font-bold">✓ 回答正确！+1分</p>
            </div>`;
        } else {
            feedbackHtml = `<div class="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                <p class="text-red-700 font-bold">✗ 回答错误！正确答案：${getCorrectAnswerText(question)}</p>
            </div>`;
        }
    }

    if (question.type === 'single' || question.type === 'judge') {
        questionHtml = question.options.map((opt, idx) => {
            let btnClass = 'border-gray-200 hover:border-blue-300';
            let textColor = 'text-blue-600';

            if (isSubmitted) {
                // 已提交，显示对错
                let isCorrectOption = false;
                if (question.type === 'single') {
                    // 单选题：判断选项是否以正确答案字母开头
                    isCorrectOption = opt.startsWith(question.answer + '.');
                } else {
                    // 判断题：直接比较索引
                    isCorrectOption = idx === question.answer;
                }

                if (isCorrectOption) {
                    btnClass = 'border-green-500 bg-green-50';
                    textColor = 'text-green-600';
                } else if (state.answers[state.currentQuestionIndex] === idx) {
                    btnClass = 'border-red-500 bg-red-50';
                    textColor = 'text-red-600';
                }
            } else {
                // 未提交，显示选中状态
                if (state.answers[state.currentQuestionIndex] === idx) {
                    btnClass = 'border-blue-500 bg-blue-50';
                }
            }

            return `
                <button ${isSubmitted ? '' : `onclick="selectAnswer(${idx})"`}
                        class="w-full text-left p-4 rounded-lg border-2 transition mb-3 option-btn ${btnClass}">
                    <span class="font-bold ${textColor}">${opt}</span>
                </button>
            `;
        }).join('');
    } else if (question.type === 'multi') {
        questionHtml = question.options.map((opt, idx) => {
            let btnClass = 'border-gray-200 hover:border-blue-300';
            let textColor = 'text-blue-600';
            const userAnswer = state.answers[state.currentQuestionIndex] || [];
            const isSelected = userAnswer.includes(idx);
            const isCorrectOption = question.answer.includes(question.options[idx].charAt(0));

            if (isSubmitted) {
                // 已提交，显示对错
                if (isCorrectOption) {
                    btnClass = 'border-green-500 bg-green-50';
                    textColor = 'text-green-600';
                } else if (isSelected) {
                    btnClass = 'border-red-500 bg-red-50';
                    textColor = 'text-red-600';
                }
            } else {
                // 未提交，显示选中状态
                if (isSelected) {
                    btnClass = 'border-blue-500 bg-blue-50';
                }
            }

            return `
                <button ${isSubmitted ? '' : `onclick="toggleMultiAnswer(${idx})"`}
                        class="w-full text-left p-4 rounded-lg border-2 transition mb-3 option-btn ${btnClass}">
                    <span class="font-bold ${textColor}">${opt}</span>
                </button>
            `;
        }).join('');
    } else if (question.type === 'fill') {
        if (isSubmitted) {
            const userAnswer = state.answers[state.currentQuestionIndex] || '';
            const isAnswerCorrect = userAnswer.includes(question.answer);
            questionHtml = `
                <div class="p-4 rounded-lg border-2 ${isAnswerCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}">
                    <p class="font-bold ${isAnswerCorrect ? 'text-green-600' : 'text-red-600'}">你的答案：${userAnswer || '未作答'}</p>
                    ${!isAnswerCorrect ? `<p class="mt-2 font-bold text-green-600">正确答案：${question.answer}</p>` : ''}
                </div>
            `;
        } else {
            questionHtml = `
                <input type="text" id="fill-answer"
                       class="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none transition"
                       placeholder="请输入答案"
                       value="${state.answers[state.currentQuestionIndex] || ''}">
            `;
        }
    }

    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="flex-1 flex flex-col p-6 fade-in h-full overflow-y-auto">
            <div class="mb-4">
                <div class="flex justify-between text-sm text-gray-500 mb-2">
                    <span>题目 ${state.currentQuestionIndex + 1}/${state.currentQuestions.length}</span>
                    <span>得分: ${state.score}分 / 满分${state.currentQuestions.length}分</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all" style="width: ${progress}%"></div>
                </div>
            </div>

            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex-1">
                <div class="mb-6">
                    <span class="inline-block px-3 py-1 rounded-full text-sm font-bold mb-3
                                ${question.type === 'single' ? 'bg-blue-100 text-blue-600' :
                                  question.type === 'multi' ? 'bg-purple-100 text-purple-600' :
                                  question.type === 'judge' ? 'bg-green-100 text-green-600' :
                                  'bg-orange-100 text-orange-600'}">
                        ${question.type === 'single' ? '单选题' :
                          question.type === 'multi' ? '多选题' :
                          question.type === 'judge' ? '判断题' : '填空题'}
                    </span>
                    <h2 class="text-lg font-bold text-gray-800">${question.question}</h2>
                </div>
                ${questionHtml}
                ${feedbackHtml}
            </div>

            <div class="flex gap-3">
                ${state.currentQuestionIndex > 0 ? `
                    <button onclick="prevQuestion()"
                            class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg transition">
                        上一题
                    </button>
                ` : ''}
                <button onclick="nextQuestion()"
                        class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition">
                    ${isSubmitted ?
                      (state.currentQuestionIndex === state.currentQuestions.length - 1 ? '查看结果' : '下一题') :
                      '提交答案'}
                </button>
                <button onclick="submitExam()"
                        class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg shadow transition">
                    提交试卷
                </button>
            </div>
        </div>
    `;
}

function getCorrectAnswerText(question) {
    if (question.type === 'single') {
        // 单选题：answer是字母，需要找到对应的选项
        const answerIndex = question.options.findIndex(opt => opt.startsWith(question.answer + '.'));
        return answerIndex !== -1 ? question.options[answerIndex] : question.answer;
    } else if (question.type === 'judge') {
        // 判断题：answer是索引（0或1）
        return question.options[question.answer];
    } else if (question.type === 'multi') {
        // 多选题：answer是字母数组
        return question.answer.join('、');
    } else if (question.type === 'fill') {
        // 填空题：answer是字符串
        return question.answer;
    }
    return '';
}

function renderResult() {
    const correctCount = state.score;
    const totalCount = state.currentQuestions.length;
    const percentage = (correctCount / totalCount * 100).toFixed(1);
    const passed = correctCount === totalCount; // 必须全部答对才算通过

    // 保存考试记录
    saveExamRecord(correctCount, totalCount);

    // 获取历史记录
    const records = getExamRecords();

    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="flex-1 flex flex-col p-6 fade-in h-full overflow-y-auto">
            <div class="mb-8 text-center">
                <div class="w-20 h-20 ${passed ? 'bg-green-500' : 'bg-red-500'} rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg">
                    <i class="fas ${passed ? 'fa-check' : 'fa-times'} text-3xl text-white"></i>
                </div>
                <h1 class="text-2xl font-bold text-gray-800">${passed ? '恭喜通过！' : '继续努力！'}</h1>
                <p class="text-gray-500 text-sm mt-1">${state.currentUser.name}</p>
            </div>

            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div class="text-center mb-6">
                    <div class="text-6xl font-bold ${passed ? 'text-green-600' : 'text-red-600'} mb-2">${correctCount}分</div>
                    <div class="text-gray-500">得分（满分${totalCount}分）</div>
                    <div class="text-gray-400 text-sm mt-2">${passed ? '全部答对，考试通过！' : `答错${totalCount - correctCount}题，继续努力！`}</div>
                </div>
                <button onclick="restartQuiz()"
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition transform active:scale-95 mb-3">
                    再来一次
                </button>
                <button onclick="renderDashboard()"
                        class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg transition">
                    返回首页
                </button>
            </div>

            ${records.length > 1 ? `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">历史成绩（满分${totalCount}分，需全部答对）</h3>
                    <div class="space-y-2">
                        ${records.slice().reverse().slice(0, 5).map((r, idx) => `
                            <div class="flex justify-between items-center p-3 rounded-lg ${idx === 0 ? 'bg-blue-50' : 'bg-gray-50'}">
                                <span class="text-sm text-gray-600">${r.date}</span>
                                <span class="font-bold ${r.score === r.total ? 'text-green-600' : 'text-red-600'}">${r.score}分 ${r.score === r.total ? '✓' : ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    if (passed) {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

// ==========================================
// 5. Event Handlers
// ==========================================

function handleLogin() {
    const id = document.getElementById('login-id').value.trim();
    const name = document.getElementById('login-name').value.trim();
    const errorDiv = document.getElementById('login-error');

    const student = STUDENTS.find(s => s.学号 === id && s.姓名 === name);

    if (student) {
        state.currentUser = { id: student.学号, name: student.姓名 };
        // 保存登录状态
        saveLoginState(state.currentUser);
        renderDashboard();
    } else {
        errorDiv.textContent = '学号或姓名错误，请重新输入';
        errorDiv.classList.remove('hidden');
    }
}

function startQuiz(mode = 'random') {
    state.quizMode = mode;
    state.currentQuestions = mode === 'all' ? getAllQuestions() : getRandomQuestions();
    state.currentQuestionIndex = 0;
    state.score = 0;
    state.answers = [];
    state.submitted = [];
    state.correctFlags = [];
    renderQuiz();
}

function selectAnswer(index) {
    if (!state.submitted[state.currentQuestionIndex]) {
        state.answers[state.currentQuestionIndex] = index;
        renderQuiz();
    }
}

function toggleMultiAnswer(index) {
    if (!state.submitted[state.currentQuestionIndex]) {
        if (!state.answers[state.currentQuestionIndex]) {
            state.answers[state.currentQuestionIndex] = [];
        }
        const answers = state.answers[state.currentQuestionIndex];
        const pos = answers.indexOf(index);
        if (pos === -1) {
            answers.push(index);
        } else {
            answers.splice(pos, 1);
        }
        renderQuiz();
    }
}

function nextQuestion() {
    const question = state.currentQuestions[state.currentQuestionIndex];
    const isSubmitted = state.submitted[state.currentQuestionIndex];

    // 如果未提交，先提交答案
    if (!isSubmitted) {
        // 保存填空题答案
        if (question.type === 'fill') {
            const input = document.getElementById('fill-answer');
            if (input) {
                state.answers[state.currentQuestionIndex] = input.value.trim();
            }
        }

        // 计算当前题目是否正确
        const isCorrect = checkAnswer(question, state.answers[state.currentQuestionIndex]);
        state.submitted[state.currentQuestionIndex] = true;
        state.correctFlags[state.currentQuestionIndex] = isCorrect;

        if (isCorrect) {
            state.score++;
        }

        renderQuiz();
    } else {
        // 已提交，进入下一题
        if (state.currentQuestionIndex < state.currentQuestions.length - 1) {
            state.currentQuestionIndex++;
            renderQuiz();
        } else {
            renderResult();
        }
    }
}

function checkAnswer(question, userAnswer) {
    if (question.type === 'single') {
        // 单选题：userAnswer是索引，question.answer是字母
        if (userAnswer === undefined || userAnswer === null) return false;
        const selectedOption = question.options[userAnswer];
        return selectedOption && selectedOption.startsWith(question.answer + '.');
    } else if (question.type === 'judge') {
        // 判断题：userAnswer和question.answer都是索引
        return userAnswer === question.answer;
    } else if (question.type === 'multi') {
        // 多选题：userAnswer是索引数组，question.answer是字母数组
        if (!userAnswer || userAnswer.length !== question.answer.length) {
            return false;
        }
        // 将选项索引转换为字母
        const userAnswerLetters = userAnswer.map(idx => question.options[idx].charAt(0));
        return userAnswerLetters.every(letter => question.answer.includes(letter));
    } else if (question.type === 'fill') {
        // 填空题：userAnswer和question.answer都是字符串
        return userAnswer && userAnswer.includes(question.answer);
    }
    return false;
}

function prevQuestion() {
    if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
        renderQuiz();
    }
}

function submitExam() {
    // 提交所有未提交的题目
    for (let i = 0; i < state.currentQuestions.length; i++) {
        if (!state.submitted[i]) {
            const question = state.currentQuestions[i];
            const userAnswer = state.answers[i];

            // 计算是否正确
            const isCorrect = checkAnswer(question, userAnswer);
            state.submitted[i] = true;
            state.correctFlags[i] = isCorrect;

            if (isCorrect) {
                state.score++;
            }
        }
    }

    // 显示结果
    renderResult();
}

function restartQuiz() {
    state.currentQuestions = state.quizMode === 'all' ? getAllQuestions() : getRandomQuestions();
    state.currentQuestionIndex = 0;
    state.score = 0;
    state.answers = [];
    state.submitted = [];
    state.correctFlags = [];
    renderQuiz();
}

// ==========================================
// 6. Initialize
// ==========================================

// App will be initialized after data loaded

