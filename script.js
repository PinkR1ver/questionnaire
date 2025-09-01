let currentQuestionnaireFile = '';
let currentQuestionnaireData = null;

// 加载指定问卷文件
async function loadQuestions(file = currentQuestionnaireFile) {
    try {
        const response = await fetch(file);
        if (!response.ok) {
            throw new Error('加载问卷数据失败');
        }
        const data = await response.json();
        currentQuestionnaireFile = file;
        currentQuestionnaireData = data;
        renderQuestionnaire(data);
    } catch (error) {
        console.error('加载问卷失败:', error);
        document.getElementById('questionsContainer').innerHTML = '<p class="error">加载问卷失败，请刷新页面重试。</p>';
    }
}

// 从标题中提取显示文本（去除括号内容）
function getDisplayTitle(title) {
    return title.split('（')[0];
}

// 从标题中提取结果文本（获取括号内容，如果没有括号则使用完整标题）
function getResultTitle(title) {
    const match = title.match(/（(.+)）/);
    return match ? match[1] : title;
}

// 格式化日期为"YYYY年MM月DD日"格式
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日`;
}

// 渲染问卷
function renderQuestionnaire(data) {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = ''; // 清空现有内容
    document.querySelector('h1').textContent = data.title;

    // 渲染每个部分
    data.sections.forEach(section => {
        // 创建部分标题
        const sectionTitle = document.createElement('h2');
        sectionTitle.className = 'section-title';
        sectionTitle.textContent = section.title;
        container.appendChild(sectionTitle);

        // 渲染该部分的所有问题
        section.questions.forEach(question => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.setAttribute('data-question-id', question.id);
            
            const title = document.createElement('div');
            title.className = 'question-title';
            title.textContent = `${getDisplayTitle(question.title)}${question.required ? ' *' : ''}`;
            
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'options-container';

            // 工具：判断选项是否需要补充输入
            const optionNeedsDetail = (text) => {
                if (!text) return false;
                if (typeof text === 'string') {
                    return text.includes('其他') || text.includes('（补充）');
                }
                // 若采用对象选项格式 { label, requiresDetail }
                if (typeof text === 'object' && text !== null) {
                    return !!text.requiresDetail;
                }
                return false;
            };

            // 工具：获取选项显示文本
            const getOptionLabel = (opt) => typeof opt === 'string' ? opt : (opt && opt.label ? opt.label : '');

            // 工具：判断选项是否为互斥（如“无就诊经历/否认/未做过任何检查”等）
            const optionIsExclusive = (opt) => {
                if (typeof opt === 'object' && opt !== null && opt.exclusive === true) return true;
                const label = getOptionLabel(opt);
                const exclusiveKeywords = ['无就诊经历', '否认', '未做过任何检查', '无诱发因素', '无伴随症状'];
                return exclusiveKeywords.some(k => label.includes(k));
            };

            switch (question.type) {
                case 'text':
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.name = question.id;
                    input.required = question.required;
                    if (question.placeholder) {
                        input.placeholder = question.placeholder;
                    }
                    optionsContainer.appendChild(input);
                    break;

                case 'date':
                    const dateInput = document.createElement('input');
                    dateInput.type = 'date';
                    dateInput.name = question.id;
                    dateInput.required = question.required;
                    dateInput.className = 'date-input';
                    
                    // 添加日期显示div
                    const dateDisplay = document.createElement('div');
                    dateDisplay.className = 'date-display';
                    
                    // 监听日期变化
                    dateInput.addEventListener('change', function() {
                        dateDisplay.textContent = formatDate(this.value);
                    });
                    
                    optionsContainer.appendChild(dateInput);
                    optionsContainer.appendChild(dateDisplay);
                    break;

                case 'radio':
                    const radioDetailInputs = [];
                    question.options.forEach((option, optIndex) => {
                        const optionDiv = document.createElement('div');
                        optionDiv.className = 'option-item';
                        
                        const radio = document.createElement('input');
                        radio.type = 'radio';
                        radio.name = question.id;
                        radio.value = getOptionLabel(option);
                        radio.required = question.required;
                        
                        const label = document.createElement('label');
                        label.textContent = getOptionLabel(option);

                        // 行内补充输入
                        const needsDetail = optionNeedsDetail(option);
                        let detailInput;
                        if (needsDetail) {
                            detailInput = document.createElement('input');
                            detailInput.type = 'text';
                            detailInput.name = `${question.id}__detail__${optIndex}`;
                            detailInput.placeholder = '请补充';
                            detailInput.className = 'inline-detail-input hidden';
                            radioDetailInputs.push(detailInput);
                        }

                        radio.addEventListener('change', () => {
                            // 切换单选时，先隐藏同题所有补充输入
                            radioDetailInputs.forEach(inp => {
                                inp.classList.add('hidden');
                                inp.required = false;
                                inp.value = inp.value; // 保留已填内容
                            });
                            if (needsDetail && detailInput && radio.checked) {
                                detailInput.classList.remove('hidden');
                                if (question.required) detailInput.required = true;
                            }
                        });
                        
                        optionDiv.appendChild(radio);
                        optionDiv.appendChild(label);
                        if (needsDetail && detailInput) optionDiv.appendChild(detailInput);
                        optionsContainer.appendChild(optionDiv);
                    });
                    break;

                case 'checkbox':
                    const checkboxGroup = [];
                    question.options.forEach((option, optIndex) => {
                        const optionDiv = document.createElement('div');
                        optionDiv.className = 'option-item';
                        
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.name = question.id;
                        checkbox.value = getOptionLabel(option);
                        if (question.required) {
                            checkbox.setAttribute('data-required', 'true');
                        }
                        
                        const label = document.createElement('label');
                        label.textContent = getOptionLabel(option);

                        // 行内补充输入
                        const needsDetail = optionNeedsDetail(option);
                        let detailInput;
                        if (needsDetail) {
                            detailInput = document.createElement('input');
                            detailInput.type = 'text';
                            detailInput.name = `${question.id}__detail__${optIndex}`;
                            detailInput.placeholder = '请补充';
                            detailInput.className = 'inline-detail-input hidden';
                        }

                        const isExclusive = optionIsExclusive(option);
                        checkboxGroup.push({ checkbox, detailInput, isExclusive });

                        checkbox.addEventListener('change', () => {
                            if (!needsDetail || !detailInput) return;
                            if (checkbox.checked) {
                                detailInput.classList.remove('hidden');
                                if (question.required) detailInput.required = true;
                            } else {
                                detailInput.classList.add('hidden');
                                detailInput.required = false;
                                detailInput.value = '';
                            }
                        });

                        // 互斥逻辑：勾选互斥项 -> 取消其他；勾选普通项 -> 取消互斥项
                        checkbox.addEventListener('change', () => {
                            if (!checkbox.checked) return;
                            if (isExclusive) {
                                checkboxGroup.forEach(item => {
                                    if (item.checkbox !== checkbox && item.checkbox.checked) {
                                        item.checkbox.checked = false;
                                        item.checkbox.dispatchEvent(new Event('change'));
                                    }
                                });
                            } else {
                                checkboxGroup.forEach(item => {
                                    if (item.isExclusive && item.checkbox.checked) {
                                        item.checkbox.checked = false;
                                        item.checkbox.dispatchEvent(new Event('change'));
                                    }
                                });
                            }
                        });
                        
                        optionDiv.appendChild(checkbox);
                        optionDiv.appendChild(label);
                        if (needsDetail && detailInput) optionDiv.appendChild(detailInput);
                        optionsContainer.appendChild(optionDiv);
                    });
                    break;
            }

            questionDiv.appendChild(title);
            questionDiv.appendChild(optionsContainer);
            
            // 如果有注释，添加注释说明（对所有类型的问题）
            if (question.note) {
                const noteDiv = document.createElement('div');
                noteDiv.className = 'question-note';
                noteDiv.textContent = question.note;
                questionDiv.appendChild(noteDiv);
            }
            
            container.appendChild(questionDiv);

            // 题间逻辑：
            // 支持 visibleIf 多种形式：
            // 1) 对象：{ questionId, anyOf }
            // 2) 数组：[ {questionId, anyOf}, ... ] => AND
            // 3) 对象：{ any: [cond,...] } => OR
            // 4) 对象：{ all: [cond,...] } => AND
            if (question.visibleIf) {
                const setQuestionVisibility = (isVisible) => {
                    if (isVisible) {
                        questionDiv.style.display = '';
                    } else {
                        questionDiv.style.display = 'none';
                    }
                    // 启用/禁用内部输入，避免浏览器校验与提交携带
                    const inputs = questionDiv.querySelectorAll('input');
                    inputs.forEach(inp => {
                        inp.disabled = !isVisible;
                        if (!isVisible) {
                            if (inp.type === 'checkbox' || inp.type === 'radio') {
                                inp.checked = false;
                            } else if (inp.type === 'text' || inp.type === 'date') {
                                inp.value = '';
                                const display = questionDiv.querySelector('.date-display');
                                if (display) display.textContent = '';
                            }
                        }
                    });
                };

                const evaluateOne = (cond) => {
                    if (!cond || !cond.questionId || !Array.isArray(cond.anyOf)) return false;
                    const depInputs = document.querySelectorAll(`input[name="${cond.questionId}"]`);
                    if (depInputs.length === 0) return false;
                    const selectedValues = [];
                    depInputs.forEach(inp => {
                        if ((inp.type === 'checkbox' || inp.type === 'radio') && inp.checked) {
                            selectedValues.push(inp.value);
                        } else if ((inp.type === 'text' || inp.type === 'date') && inp.value && inp.value.trim() !== '') {
                            selectedValues.push(inp.value.trim());
                        }
                    });
                    return selectedValues.some(v => cond.anyOf.includes(v));
                };

                const parseConditions = () => {
                    const vi = question.visibleIf;
                    if (Array.isArray(vi)) {
                        return { mode: 'ALL', conds: vi };
                    }
                    if (vi && vi.questionId && Array.isArray(vi.anyOf)) {
                        return { mode: 'ALL', conds: [vi] };
                    }
                    if (vi && Array.isArray(vi.any)) {
                        return { mode: 'ANY', conds: vi.any };
                    }
                    if (vi && Array.isArray(vi.all)) {
                        return { mode: 'ALL', conds: vi.all };
                    }
                    return { mode: 'ALL', conds: [] };
                };

                const evaluateVisible = () => {
                    const { mode, conds } = parseConditions();
                    if (!conds.length) { setQuestionVisibility(false); return; }
                    const res = conds.map(evaluateOne);
                    const visible = mode === 'ANY' ? res.some(Boolean) : res.every(Boolean);
                    setQuestionVisibility(visible);
                };

                // 初始隐藏，随后评估
                setQuestionVisibility(false);
                evaluateVisible();

                // 监听所有依赖题目
                const watched = new Set();
                const { conds } = parseConditions();
                conds.forEach(cond => {
                    if (!cond || !cond.questionId) return;
                    const key = cond.questionId;
                    if (watched.has(key)) return;
                    watched.add(key);
                    const depInputs = document.querySelectorAll(`input[name="${key}"]`);
                    depInputs.forEach(inp => {
                        inp.addEventListener('change', evaluateVisible);
                        inp.addEventListener('input', evaluateVisible);
                    });
                });
            }
        });
    });
}

// 生成二维码
function generateQRCode(text, containerId) {
    try {
        const qrcodeContainer = document.getElementById(containerId);
        qrcodeContainer.innerHTML = ''; // 清除旧的二维码

        // 使用kjua生成二维码
        const qrcode = kjua({
            text: text,
            render: 'canvas',
            size: 300,          // 二维码大小
            ecLevel: 'H',       // 最高纠错级别
            fill: '#000',       // 二维码颜色
            back: '#fff',       // 背景色
            rounded: 100,       // 圆角程度
            quiet: 2,           // 边距
            mode: 'byte',       // 使用byte模式支持中文
            minVersion: 10,     // 提高最小版本以支持更多数据
            maxVersion: 40      // 最大版本
        });

        // 添加生成的二维码到容器
        qrcodeContainer.appendChild(qrcode);

        // 隐藏错误信息
        document.getElementById('qrError').style.display = 'none';
    } catch (error) {
        console.error('生成二维码失败:', error);
        document.getElementById('qrError').style.display = 'block';
    }
}

// 处理表单提交
document.getElementById('questionnaireForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // 验证必选的checkbox组是否至少选择了一项（忽略被隐藏/禁用的题目）
    const checkboxGroups = document.querySelectorAll('input[type="checkbox"][data-required="true"]:not(:disabled)');
    const groupsMap = new Map();
    checkboxGroups.forEach(checkbox => {
        const name = checkbox.name;
        if (!groupsMap.has(name)) {
            groupsMap.set(name, false);
        }
        if (checkbox.checked) {
            groupsMap.set(name, true);
        }
    });

    for (const [name, isChecked] of groupsMap) {
        if (!isChecked) {
            alert('请确保所有必选题目都已回答！');
            return;
        }
    }

    try {
        // 获取问卷数据
        const formData = new FormData(this);
        const data = currentQuestionnaireData || (await (await fetch(currentQuestionnaireFile)).json());

        // 为每个section生成结果
        const sectionResults = data.sections.map(section => {
            let sectionData = [];
            section.questions.forEach(question => {
                let value;
                if (question.type === 'checkbox') {
                    const selectedOptions = Array.from(formData.getAll(question.id));
                    if (selectedOptions.length > 0) {
                        // 汇总所有 detail：匹配 name 前缀 `${question.id}__detail__`
                        const details = [];
                        for (const [key, val] of formData.entries()) {
                            if (typeof key === 'string' && key.startsWith(`${question.id}__detail__`)) {
                                const txt = (val || '').toString().trim();
                                if (txt) details.push(txt);
                            }
                        }
                        value = selectedOptions.join('、');
                        if (details.length > 0) {
                            value = `${value}；补充:${details.join('；')}`;
                        }
                        sectionData.push(`${getResultTitle(question.title)}:${value}`);
                    }
                } else if (question.type === 'date') {
                    value = formData.get(question.id);
                    if (value && value.trim() !== '') {
                        sectionData.push(`${getResultTitle(question.title)}:${formatDate(value)}`);
                    }
                } else {
                    value = formData.get(question.id);
                    // 单选也可能有补充：收集 `${question.id}__detail__*`
                    const details = [];
                    for (const [key, val] of formData.entries()) {
                        if (typeof key === 'string' && key.startsWith(`${question.id}__detail__`)) {
                            const txt = (val || '').toString().trim();
                            if (txt) details.push(txt);
                        }
                    }
                    if (value && value.trim() !== '') {
                        sectionData.push(`${getResultTitle(question.title)}:${value}${details.length ? `；补充:${details.join('；')}` : ''}`);
                    }
                }
            });
            return {
                title: section.title,
                result: sectionData.join(';')
            };
        });

        // 显示结果
        document.getElementById('questionnaireForm').style.display = 'none';
        document.getElementById('result').style.display = 'block';

        // 清空并重建二维码容器
        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = '';

        // 为每个section创建二维码容器和显示结果
        sectionResults.forEach((section, index) => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'section-result';

            const sectionTitle = document.createElement('h3');
            sectionTitle.textContent = section.title;
            sectionDiv.appendChild(sectionTitle);

            const resultText = document.createElement('div');
            resultText.className = 'result-text';
            resultText.textContent = section.result;
            sectionDiv.appendChild(resultText);

            const qrcodeDiv = document.createElement('div');
            qrcodeDiv.id = `qrcode-section-${index}`;
            qrcodeDiv.className = 'qrcode-container';
            sectionDiv.appendChild(qrcodeDiv);

            qrContainer.appendChild(sectionDiv);

            // 生成该section的二维码
            generateQRCode(section.result, `qrcode-section-${index}`);
        });

    } catch (error) {
        console.error('处理表单数据失败:', error);
        document.getElementById('qrError').style.display = 'block';
    }
});

// 重置表单
function resetForm() {
    document.getElementById('questionnaireForm').reset();
    document.getElementById('questionnaireForm').style.display = 'block';
    document.getElementById('result').style.display = 'none';
}

// 页面加载时初始化问卷
function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

async function bootByQuery() {
    const file = getQueryParam('file');
    if (!file) {
        // 未指定问卷，跳转到选择页
        window.location.href = 'select.html';
        return;
    }
    await loadQuestions(file);
}

bootByQuery();