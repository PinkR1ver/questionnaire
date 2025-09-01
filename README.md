## 项目简介

- **问卷选择 → 填写 → 结果二维码** 的完整流程
- **问卷制作器（所见即所得）**，无需编辑 JSON 即可创建问卷
- 兼容 **Python 3.8**，本机/局域网均可访问

### 目录与启动

- **主要文件**
  - `index.html`：问卷填写页
  - `select.html`：问卷选择页（按钮卡片）
  - `build.html`：问卷制作页（可视化）
  - `script.js`：前端逻辑（渲染/提交/逻辑控制/二维码）
  - `server.py`：简易静态服务与 API
  - `questions_*.json / question_*.json`：问卷文件（自动被检索）

- **启动服务**
  - 运行：`python server.py`
  - 控制台会打印访问地址：
    - 填写页入口（先从选择页进）：`http://localhost:8000/select.html`
    - 制作页：`http://localhost:8000/build.html`
    - 同局域网访问会显示本机 IP 地址

### 问卷选择与加载

- 打开 `select.html`，以卡片按钮的方式展示所有符合命名规则的问卷：
  - 文件名需以 `question_` 或 `questions_` 开头，后缀 `.json`
- 点击卡片跳转到 `index.html?file=<问卷文件名>` 进行填写

### 问卷填写页功能

- **题型**：`text`、`radio`、`checkbox`、`date`
- **补充输入**：
  - 选项对象可标记 `requiresDetail: true`，被选中时显示行内输入
  - 结果会合并为“；补充: ...”
- **互斥选项**：
  - 选项对象可标记 `exclusive: true`（或包含“无就诊经历/否认/未做过任何检查/无诱发因素/无伴随症状”关键字）
  - 勾选互斥项会自动取消其他项，反之亦然
- **题间逻辑（显示/隐藏）**：字段 `visibleIf`，支持四种写法
  - 单条件：
    ```json
    { "questionId": "q1", "anyOf": ["是"] }
    ```
  - AND 数组：
    ```json
    [ { "questionId": "q1", "anyOf": ["A"] }, { "questionId": "q2", "anyOf": ["B"] } ]
    ```
  - OR：
    ```json
    { "any": [ { "questionId": "q1", "anyOf": ["A"] }, { "questionId": "q2", "anyOf": ["B"] } ] }
    ```
  - AND：
    ```json
    { "all": [ { "questionId": "q1", "anyOf": ["A"] }, { "questionId": "q2", "anyOf": ["B"] } ] }
    ```
  - 隐藏时自动禁用并清空输入，不参与必填校验与提交
- **日期显示**：选择后按“YYYY年MM月DD日”展示
- **结果与二维码**：
  - 按 Section 分块显示结果文本
  - 每段结果生成对应二维码（支持中文，纠错等级高）

### 问卷 JSON 结构要点

- 问卷由 `title` 与 `sections` 组成，每个 `section` 包含 `questions`
- 题目字段：
  - `id`（唯一）、`type`、`title`、`required`（可选）
  - `options`（仅 radio/checkbox），可为字符串或对象：
    ```json
    { "label": "目前饮酒", "requiresDetail": true }
    { "label": "无就诊经历", "exclusive": true }
    ```
  - `visibleIf`（可选）：见上文四种写法

### 问卷制作页（build.html）

- **可视化编辑**
  - 新增/删除部分与题目，题型切换（文本/单选/多选/日期），必填开关
  - 选项的文本、`补充(requiresDetail)`、`互斥(exclusive)` 勾选
- **排序与复制**
  - 按钮：上移/下移/复制
  - 支持拖拽排序（部分、题目）
- **逻辑编辑**
  - 多条件 AND/OR 可视化编辑器（增/删条件行）
- **校验与保存**
  - 一键校验：标题/ID 重复或缺失、选项空值、条件引用 ID 是否存在
  - 保存：输入文件名（需以 `question_` 开头、`.json` 结尾），点击保存
- 提示：目前移除了“导入 JSON / 预览 JSON”，保留“模版示例”一键插入

### 后端 API

- **列出问卷**
  - GET `/api/questionnaires`
  - 返回数组：`[{ "file": "questions_*.json", "title": "..." }]`
- **保存问卷**
  - POST `/api/save_questionnaire`
  - 请求体：`{ "file": "question_xxx.json", "content": { ...问卷JSON... } }`
  - 文件名校验：必须以 `question_` 开头，`.json` 结尾；不允许路径分隔符

### 运行环境

- Python 3.8
- 依赖版本（见 `requirements.txt`）：
  - Flask 2.3.3
  - Werkzeug 2.3.7
  - gunicorn 20.1.0
  - pyinstaller 5.13.0

### 常见问题

- **选择页无问卷**：确认问卷文件名已以 `question_` 或 `questions_` 开头，且与服务同目录
- **逻辑不生效**：确认 `visibleIf` 指向的 `questionId` 存在、匹配值与选项文本一致
- **必填校验**：被逻辑隐藏的问题不参与必填校验；checkbox 必填需至少勾选一项


