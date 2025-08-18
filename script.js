// 从questions.json加载问卷数据
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) {
            throw new Error('加载问卷数据失败');
        }
        const data = await response.json();
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
            
            const title = document.createElement('div');
            title.className = 'question-title';
            title.textContent = `${getDisplayTitle(question.title)}${question.required ? ' *' : ''}`;
            
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'options-container';

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

                case 'radio':
                    question.options.forEach(option => {
                        const optionDiv = document.createElement('div');
                        optionDiv.className = 'option-item';
                        
                        const radio = document.createElement('input');
                        radio.type = 'radio';
                        radio.name = question.id;
                        radio.value = option;
                        radio.required = question.required;
                        
                        const label = document.createElement('label');
                        label.textContent = option;
                        
                        optionDiv.appendChild(radio);
                        optionDiv.appendChild(label);
                        optionsContainer.appendChild(optionDiv);
                    });
                    break;

                case 'checkbox':
                    question.options.forEach(option => {
                        const optionDiv = document.createElement('div');
                        optionDiv.className = 'option-item';
                        
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.name = question.id;
                        checkbox.value = option;
                        if (question.required) {
                            checkbox.setAttribute('data-required', 'true');
                        }
                        
                        const label = document.createElement('label');
                        label.textContent = option;
                        
                        optionDiv.appendChild(checkbox);
                        optionDiv.appendChild(label);
                        optionsContainer.appendChild(optionDiv);
                    });

                    // 如果有注释，添加注释说明
                    if (question.note) {
                        const noteDiv = document.createElement('div');
                        noteDiv.className = 'question-note';
                        noteDiv.textContent = question.note;
                        optionsContainer.appendChild(noteDiv);
                    }
                    break;
            }

            questionDiv.appendChild(title);
            questionDiv.appendChild(optionsContainer);
            container.appendChild(questionDiv);
        });
    });
}

// 生成二维码
function generateQRCode(text) {
    try {
        const qrcodeContainer = document.getElementById('qrcode');
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
    
    // 验证必选的checkbox组是否至少选择了一项
    const checkboxGroups = document.querySelectorAll('input[type="checkbox"][data-required="true"]');
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
        let result = '';

        // 获取最新的问卷数据结构
        const response = await fetch('questions.json');
        const data = await response.json();

        // 生成简化的结果，不分section，跳过未填写的内容
        let allResults = [];
        data.sections.forEach(section => {
            section.questions.forEach(question => {
                let value;
                if (question.type === 'checkbox') {
                    const selectedOptions = Array.from(formData.getAll(question.id));
                    if (selectedOptions.length > 0) {  // 只添加已选择的复选框
                        value = selectedOptions.join('、');
                        allResults.push(`${getResultTitle(question.title)}:${value}`);
                    }
                } else {
                    value = formData.get(question.id);
                    if (value && value.trim() !== '') {  // 只添加已填写的内容
                        allResults.push(`${getResultTitle(question.title)}:${value}`);
                    }
                }
            });
        });
        result = allResults.join(';');

        // 显示结果
        document.getElementById('questionnaireForm').style.display = 'none';
        document.getElementById('result').style.display = 'block';
        document.getElementById('resultText').textContent = result;

        // 生成二维码
        generateQRCode(result);

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
loadQuestions();