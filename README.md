# 小红书风格知识卡片生成器

一个简单而强大的工具，用于生成小红书风格的知识分享卡片。支持 AI 自动生成内容，多种精美主题，以及便捷的图片导出功能。

## 功能特点

- 🤖 AI 自动生成内容
- 🎨 8 种精美渐变背景主题
- 📝 实时预览编辑
- 💾 一键导出图片
- 🌈 磨砂玻璃效果
- 📱 响应式设计

## 项目结构

```
├── index.html          # 主页面
├── css/
│   └── styles.css      # 样式文件
├── js/
│   ├── app.js         # 主要应用逻辑
│   ├── api.js         # API调用相关
│   ├── config.js      # API配置（需要自行创建）
│   ├── config.template.js  # API配置模板
│   └── topics.js      # 话题管理相关
└── README.md          # 项目说明文档
```

## 使用方法

### 1. 配置 API 密钥

1. 复制 `js/config.template.js` 为 `js/config.js`
2. 在 `config.js` 中填入你的 API 密钥：

```javascript
const CONFIG = {
  API: {
    BASE_URL: "https://api.siliconflow.cn/v1",
    API_KEY: "your-api-key-here", // 替换为你的API密钥
    MODEL: "Qwen/Qwen3-8B",
  },
};
```

### 2. 使用应用

1. 选择话题类型（AI 大模型、AI 工具、AI 应用、AI 趋势）
2. 输入具体的话题关键词
3. 点击"AI 一键生成内容"按钮生成内容
4. 或者手动编辑标题和内容
5. 选择喜欢的卡片风格
6. 点击"保存卡片"下载图片

## 技术栈

- HTML5
- CSS3
- JavaScript (ES6+)
- html2canvas
- SiliconFlow API (Qwen/Qwen3-8B)

## 本地开发

1. 克隆项目到本地
2. 复制 `js/config.template.js` 为 `js/config.js` 并配置 API 密钥
3. 使用本地服务器运行项目（如 Live Server）
4. 在浏览器中访问 `http://localhost:端口号`

## 注意事项

- 需要有效的 API 密钥才能使用 AI 生成功能
- 建议使用现代浏览器以获得最佳体验
- 图片导出需要一定时间，请耐心等待
- 请勿将 API 密钥提交到代码仓库

## 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进项目。

## 许可证

MIT License
