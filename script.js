// 问卷数据直接嵌入到JS中，避免fetch加载
const questionsData = {
    "title": "神经内科眩晕科问诊预调查表",
    "questions": [
        {
            "id": "basic1",
            "type": "text",
            "title": "姓名",
            "required": true
        },
        {
            "id": "basic2",
            "type": "text",
            "title": "年龄",
            "required": true
        },
        {
            "id": "basic3",
            "type": "radio",
            "title": "性别",
            "options": ["男", "女"],
            "required": true
        },
        {
            "id": "symptom1",
            "type": "radio",
            "title": "眩晕发作持续时间",
            "options": ["几秒钟", "几分钟", "几小时", "持续整天"],
            "required": true
        },
        {
            "id": "symptom2",
            "type": "checkbox",
            "title": "伴随症状（可多选）",
            "options": [
                "恶心呕吐",
                "头痛",
                "走路不稳"
            ],
            "required": true
        }
    ]
};

// 加载问卷数据
function loadQuestions() {
    try {
        renderQuestionnaire(questionsData);
    } catch (error) {
        console.error('加载问卷失败:', error);
        document.getElementById('questionsContainer').innerHTML = '<p class="error">加载问卷失败，请刷新页面重试。</p>';
    }
}

// 渲染问卷
function renderQuestionnaire(data) {
    const container = document.getElementById('questionsContainer');
    document.querySelector('h1').textContent = data.title;

    data.questions.forEach(question => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        
        const title = document.createElement('div');
        title.className = 'question-title';
        title.textContent = `${question.title}${question.required ? ' *' : ''}`;
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-container';

        switch (question.type) {
            case 'text':
                const input = document.createElement('input');
                input.type = 'text';
                input.name = question.id;
                input.required = question.required;
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
                break;
        }

        questionDiv.appendChild(title);
        questionDiv.appendChild(optionsContainer);
        container.appendChild(questionDiv);
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
            minVersion: 1,      // 最小版本
            maxVersion: 40      // 最大版本，支持更多数据
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

        questionsData.questions.forEach(question => {
            result += `${question.title}：`;
            
            if (question.type === 'checkbox') {
                const selectedOptions = Array.from(formData.getAll(question.id));
                result += selectedOptions.join('、') || '未选择';
            } else {
                result += formData.get(question.id) || '未填写';
            }
            
            result += '\n';
        });

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