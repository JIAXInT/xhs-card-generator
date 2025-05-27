// 话题数据
const topics = {
  AI大模型: [
    "AI大模型使用技巧",
    "ChatGPT提示词教程",
    "Claude使用指南",
    "Gemini实践经验",
    "AI提示工程",
  ],
  AI工具: [
    "AI绘画工具实战",
    "AI写作助手技巧",
    "AI编程助手使用",
    "AI效率工具推荐",
    "AI工具最佳实践",
  ],
  AI应用: [
    "AI助手实战应用",
    "AI提升工作效率",
    "AI创意玩法",
    "AI学习方法",
    "AI个性化定制",
  ],
  AI趋势: [
    "AI技术发展趋势",
    "AI产品最新动态",
    "AI行业分析",
    "AI能力边界探索",
    "AI未来展望",
  ],
};

// 随机选择话题标签
function selectRandomTopic() {
  const topicTags = document.querySelectorAll(".topic-tag");
  const randomIndex = Math.floor(Math.random() * topicTags.length);
  const selectedTopic = topicTags[randomIndex];

  // 移除其他标签的选中状态
  topicTags.forEach((t) => t.classList.remove("selected"));
  // 选中随机标签
  selectedTopic.classList.add("selected");

  // 生成随机关键词
  generateRandomKeyword(selectedTopic);
}

// 生成随机关键词
function generateRandomKeyword(topicElement) {
  const keywords = JSON.parse(topicElement.dataset.keywords);
  const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
  document.getElementById("topicInput").value = randomKeyword;
}

// 导出函数
export { selectRandomTopic, generateRandomKeyword, topics };
