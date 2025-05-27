import { generateContentApi } from "./api.js";
import { topics } from "./topics.js";

// 主题映射
const themeMap = {
  "gradient-bg-1": "gradient-theme-1",
  "gradient-bg-2": "gradient-theme-2",
  "gradient-bg-3": "gradient-theme-3",
  "gradient-bg-4": "gradient-theme-4",
  "gradient-bg-5": "gradient-theme-5",
  "gradient-bg-6": "gradient-theme-6",
  "gradient-bg-7": "gradient-theme-7",
  "gradient-bg-8": "gradient-theme-8",
};

// 渐变背景类名数组
const gradientClasses = [
  "gradient-bg-1",
  "gradient-bg-2",
  "gradient-bg-3",
  "gradient-bg-4",
  "gradient-bg-5",
  "gradient-bg-6",
  "gradient-bg-7",
  "gradient-bg-8",
];

// 获取随机渐变背景
function getRandomGradient() {
  const randomIndex = Math.floor(Math.random() * gradientClasses.length);
  return gradientClasses[randomIndex];
}

// 获取随机话题
function getRandomTopic() {
  const topicTags = document.querySelectorAll(".topic-tag");
  const randomIndex = Math.floor(Math.random() * topicTags.length);
  return topicTags[randomIndex];
}

// 处理内容中的 emoji 和标签
function processContent(content) {
  // 先处理 emoji + 标签的错误组合
  content = content.replace(
    /(<[^>]*)([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]|[❤️✨🔥💡])/gu,
    "$1"
  );

  // 处理标签内的 emoji
  content = content.replace(
    /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]|[❤️✨🔥💡])([^<]*<\/?[^>]*>)/gu,
    "$1 $2"
  );

  return content;
}

// 更新预览函数
function updatePreview() {
  const title = document.getElementById("titleInput").value;
  let content = document.getElementById("contentInput").value;

  // 替换ul>li为div结构，兼容html2canvas
  content = content.replace(
    /<ul>([\s\S]*?)<\/ul>/g,
    function (match, listInner) {
      // 将<li>内容</li>替换为<div class="custom-list-item">内容</div>
      const items = listInner.replace(
        /<li>([\s\S]*?)<\/li>/g,
        '<div class="custom-list-item">$1</div>'
      );
      return '<div class="custom-list">' + items + "</div>";
    }
  );

  // 如果标题为空，显示占位符
  document.getElementById("previewTitle").textContent =
    title || "写下一个吸引人的标题...";

  // 如果内容为空，显示占位符
  document.getElementById("previewContent").innerHTML =
    content || "<p>在这里分享你的见解和经验...</p>";

  // 随机为所有.custom-list-item分配同一个emoji
  const emojiList = [
    "✨",
    "🌟",
    "👉",
    "✅",
    "🔸",
    "💡",
    "📝",
    "📌",
    "🎯",
    "🚀",
  ];
  const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
  document.querySelectorAll(".custom-list-item").forEach((item) => {
    item.setAttribute("data-emoji", randomEmoji);
  });
}

// 下载卡片
function downloadCard() {
  const card = document.getElementById("previewCard");

  // 获取卡片的实际尺寸
  const cardRect = card.getBoundingClientRect();
  const originalWidth = cardRect.width;
  const originalHeight = cardRect.height;

  // 创建一个带背景的容器
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = originalWidth + "px";
  container.style.height = originalHeight + "px";
  container.style.backgroundColor = "#ffffff";
  container.style.zIndex = "-9999";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";

  // 克隆卡片
  const clonedCard = card.cloneNode(true);
  clonedCard.style.transform = "none";
  // 确保克隆的卡片大小与原始卡片相同
  clonedCard.style.width = originalWidth + "px";
  clonedCard.style.height = originalHeight + "px";
  container.appendChild(clonedCard);
  document.body.appendChild(container);

  html2canvas(container, {
    scale: 2, // 使用2倍缩放以获得更好的质量
    useCORS: true,
    logging: false,
    width: originalWidth,
    height: originalHeight,
    allowTaint: true,
    backgroundColor: "#ffffff",
  })
    .then((canvas) => {
      // 创建下载链接
      const link = document.createElement("a");
      const fileName =
        document
          .getElementById("titleInput")
          .value.trim()
          .replace(/[\\/:*?"<>|]/g, "") // 只去除Windows不允许的字符，保留中文
          .replace(/\s+/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "") || // 去除首尾下划线
        "小红书卡片";

      link.download = `${fileName}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();

      // 清理临时元素
      document.body.removeChild(container);
    })
    .catch((error) => {
      console.error("下载失败:", error);
      alert("卡片下载失败，请稍后重试！");
      document.body.removeChild(container);
    });
}

// AI内容生成
async function generateContent() {
  const topicInput = document.getElementById("topicInput").value;
  const selectedTopic = document.querySelector(".topic-tag.selected");

  if (!topicInput || !selectedTopic) {
    alert("请选择话题类型并输入具体关键词！");
    return;
  }

  const btn = document.querySelector(".ai-generate-btn");
  const btnText = btn.querySelector(".btn-text");
  const originalText = btnText.textContent;

  btn.disabled = true;
  btnText.innerHTML = '<span class="loading"></span> 生成中...';

  try {
    const result = await generateContentApi(
      selectedTopic.dataset.topic,
      topicInput
    );
    document.getElementById("titleInput").value = result.title.trim();
    document.getElementById("contentInput").value = result.content.trim();
    updatePreview();
  } catch (error) {
    console.error("生成失败:", error);
    alert("内容生成失败，请稍后重试！");
  } finally {
    btn.disabled = false;
    btnText.textContent = originalText;
  }
}

// 切换卡片背景
function changeCardBackground(gradientClass) {
  const card = document.getElementById("previewCard");
  const background = card.querySelector(".card-background");

  // 更新背景类
  background.className = "card-background " + gradientClass;

  // 更新卡片主题
  const themeNumber = gradientClass.match(/\d+/)[0];
  const themeClass = `gradient-theme-${themeNumber}`;
  card.className = `card ${themeClass}`;

  // 更新颜色选择器的选中状态
  document.querySelectorAll(".color-option").forEach((option) => {
    option.classList.remove("active");
    if (option.classList.contains(gradientClass)) {
      option.classList.add("active");
    }
  });
}

// 初始化事件监听
document.addEventListener("DOMContentLoaded", function () {
  // 实时预览
  document
    .getElementById("titleInput")
    .addEventListener("input", updatePreview);
  document
    .getElementById("contentInput")
    .addEventListener("input", updatePreview);

  // 颜色选择
  document.querySelectorAll(".color-option").forEach((option) => {
    option.addEventListener("click", function () {
      // 移除其他选项的active类
      document
        .querySelectorAll(".color-option")
        .forEach((opt) => opt.classList.remove("active"));
      // 添加当前选项的active类
      this.classList.add("active");
      // 获取渐变类名
      const gradientClass = Array.from(this.classList).find((cls) =>
        cls.startsWith("gradient-bg-")
      );
      if (gradientClass) {
        changeCardBackground(gradientClass);
      }
    });
  });

  // 话题标签点击
  document.querySelectorAll(".topic-tag").forEach((tag) => {
    tag.addEventListener("click", function () {
      document
        .querySelectorAll(".topic-tag")
        .forEach((t) => t.classList.remove("selected"));
      this.classList.add("selected");

      // 生成随机关键词
      const topicKeywords = topics[this.dataset.topic];
      if (topicKeywords && topicKeywords.length > 0) {
        const randomKeyword =
          topicKeywords[Math.floor(Math.random() * topicKeywords.length)];
        document.getElementById("topicInput").value = randomKeyword;
      }
    });
  });

  // 随机选择话题和背景
  const randomTopic = getRandomTopic();
  const randomGradient = getRandomGradient();

  if (randomTopic) {
    randomTopic.click();
  }

  changeCardBackground(randomGradient);

  // 触发一次预览更新
  updatePreview();
});

// 导出生成函数，使其可以在全局访问
window.generateContent = generateContent;
window.downloadCard = downloadCard;
