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

// 分页相关变量
let contentPages = []; // 存储分页后的内容
let currentPageIndex = 0; // 当前页码

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
  if (!content) return "";

  // 定义表情符号的正则表达式
  const emojiRegex =
    /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]|[❤️✨🔥💡])/gu;

  // 处理特殊符号和标签的问题
  // 1. 修复strong标签内部符号显示问题
  content = content.replace(
    /(<strong[^>]*>)(.*?)(<\/strong>)/gi,
    function (match, openTag, innerContent, closeTag) {
      // 将innerContent中的emoji与非emoji部分分开处理
      let lastIndex = 0;
      let processedContent = "";
      let emojiMatch;

      // 重置正则表达式
      emojiRegex.lastIndex = 0;

      // 处理每个emoji
      while ((emojiMatch = emojiRegex.exec(innerContent)) !== null) {
        // 处理emoji前的文本（添加零宽空格到非字母数字字符）
        if (emojiMatch.index > lastIndex) {
          const beforeText = innerContent.substring(
            lastIndex,
            emojiMatch.index
          );
          processedContent += beforeText.replace(/([^\w\s])/g, "$1\u200B");
        }

        // 添加emoji本身（不修改）
        processedContent += emojiMatch[0];

        lastIndex = emojiMatch.index + emojiMatch[0].length;
      }

      // 处理最后一部分文本
      if (lastIndex < innerContent.length) {
        const remainingText = innerContent.substring(lastIndex);
        processedContent += remainingText.replace(/([^\w\s])/g, "$1\u200B");
      }

      return openTag + processedContent + closeTag;
    }
  );

  // 2. 处理 emoji + 标签的错误组合
  content = content.replace(
    /(<[^>]*)([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]|[❤️✨🔥💡])/gu,
    "$1"
  );

  // 3. 处理标签内的 emoji
  content = content.replace(
    /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]|[❤️✨🔥💡])([^<]*<\/?[^>]*>)/gu,
    "$1 $2"
  );

  return content;
}

// 分页处理内容
function paginateContent(content) {
  if (!content || content.trim() === "") {
    return ["<p>在这里分享你的见解和经验...</p>"];
  }

  console.log("开始分页处理内容...");
  console.log("原始内容长度:", content.length);

  // 创建临时元素来解析HTML
  const tempElement = document.createElement("div");
  tempElement.innerHTML = content;

  // 创建一个测量容器，用于计算每行元素的高度
  const measureContainer = document.createElement("div");
  measureContainer.style.position = "fixed";
  measureContainer.style.top = "-9999px";
  measureContainer.style.left = "-9999px";
  measureContainer.style.width = "360px"; // 卡片内容区域宽度
  measureContainer.style.visibility = "hidden";
  measureContainer.style.padding = "0";
  measureContainer.style.margin = "0";
  measureContainer.style.fontFamily = getComputedStyle(
    document.body
  ).fontFamily;
  measureContainer.style.fontSize = "17px";
  measureContainer.style.lineHeight = "1.7";
  document.body.appendChild(measureContainer);

  // 处理所有段落和列表项，确保它们按照文档中的顺序排列
  const allElements = [];
  let originalIndex = 0;

  // 遍历所有节点，保持它们在文档中的顺序
  function processNode(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName.toLowerCase() === "p") {
        // 段落直接添加
        allElements.push({
          type: "paragraph",
          element: node,
          html: node.outerHTML,
          originalIndex: originalIndex++,
        });
      } else if (node.classList && node.classList.contains("custom-list")) {
        // 对于custom-list，我们不再将整个列表作为一个元素
        // 而是单独处理每个custom-list-item
        const items = node.querySelectorAll(".custom-list-item");

        // 每个列表项单独作为一个元素
        items.forEach((item) => {
          allElements.push({
            type: "list-item",
            element: item,
            html: item.outerHTML,
            originalIndex: originalIndex++,
          });
        });
      } else if (
        node.classList &&
        node.classList.contains("custom-list-item")
      ) {
        // 直接处理单独的custom-list-item
        allElements.push({
          type: "list-item",
          element: node,
          html: node.outerHTML,
          originalIndex: originalIndex++,
        });
      } else {
        // 递归处理其他元素的子节点
        Array.from(node.childNodes).forEach((childNode) => {
          processNode(childNode);
        });
      }
    }
  }

  // 处理所有顶级节点
  Array.from(tempElement.childNodes).forEach((node) => {
    processNode(node);
  });

  // 如果没有找到任何内容元素，返回默认内容
  if (allElements.length === 0) {
    console.log("没有找到有效的内容元素");
    document.body.removeChild(measureContainer);
    return [content];
  }

  console.log(`提取出 ${allElements.length} 个内容元素`);

  // 排序元素确保它们按照原始顺序排列
  const contentElements = allElements.sort(
    (a, b) => a.originalIndex - b.originalIndex
  );

  // 计算卡片内容区域的实际可用高度
  const cardWidth = 420; // 卡片宽度
  const cardHeight = 560; // 卡片高度
  const cardPadding = 30; // 卡片内边距
  const wrapperPadding = 20; // 内容包装器内边距
  const headerHeight = 60; // 估计标题区域高度
  const footerHeight = 50; // 估计页脚区域高度

  // 计算内容区域的可用高度 - 增加一点容量系数以确保内容不会被错误截断
  const availableHeight =
    (cardHeight -
      cardPadding * 2 -
      wrapperPadding * 2 -
      headerHeight -
      footerHeight) *
    0.95; // 添加0.95的容量系数，避免内容过满

  console.log(`卡片可用高度: ${availableHeight}px`);

  // 测量每个元素的高度
  const elementHeights = [];
  contentElements.forEach((el, index) => {
    measureContainer.innerHTML = el.html;
    // 测量实际渲染高度
    const height = measureContainer.scrollHeight;

    elementHeights.push({
      index,
      element: el,
      height,
      withMargin: height + 15, // 增加间距，从12px到15px，确保元素间有更充足的空间
    });

    console.log(
      `元素 ${index + 1} (${el.type}) 高度: ${height}px (含间距: ${
        height + 15
      }px)`
    );
  });

  // 分页算法
  const pages = [];
  let currentPage = [];
  let currentPageHeight = 0;
  const maxPageHeight = availableHeight - 10; // 减少10px，留出安全边距

  for (let i = 0; i < elementHeights.length; i++) {
    const el = elementHeights[i];

    // 检查添加当前元素是否会导致页面溢出
    if (currentPageHeight + el.withMargin > maxPageHeight) {
      // 如果当前页为空，则强制将元素放入
      if (currentPage.length === 0) {
        currentPage.push(el.element.html);

        // 保存当前页并开始新页面
        pages.push(currentPage.join(""));
        currentPage = [];
        currentPageHeight = 0;
      } else {
        // 保存当前页面，并将当前元素放入新页面
        pages.push(currentPage.join(""));
        currentPage = [el.element.html];
        currentPageHeight = el.withMargin;
      }
    } else {
      // 元素可以放入当前页
      currentPage.push(el.element.html);
      currentPageHeight += el.withMargin;
    }
  }

  // 添加最后一页（如果有内容）
  if (currentPage.length > 0) {
    pages.push(currentPage.join(""));
  }

  // 清理测量容器
  document.body.removeChild(measureContainer);

  // 分析分页结果
  console.log(`内容被分为 ${pages.length} 页`);
  pages.forEach((page, i) => {
    const paragraphCount = (page.match(/<p/g) || []).length;
    const listItemCount = (page.match(/<div class="custom-list-item"/g) || [])
      .length;
    console.log(
      `第 ${i + 1} 页包含 ${paragraphCount} 个段落, ${listItemCount} 个列表项`
    );
    console.log(`第 ${i + 1} 页内容长度: ${page.length}`);
  });

  return pages;
}

// 更新分页导航
function updatePagination() {
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const currentPageElement = document.getElementById("currentPage");
  const totalPagesElement = document.getElementById("totalPages");
  const paginationControls = document.querySelector(".pagination-controls");

  // 更新页码显示
  currentPageElement.textContent = currentPageIndex + 1;
  totalPagesElement.textContent = contentPages.length;

  console.log(
    `更新分页导航: 当前页 ${currentPageIndex + 1}/${contentPages.length}`
  );

  // 更新按钮状态
  prevPageBtn.disabled = currentPageIndex === 0;
  nextPageBtn.disabled = currentPageIndex >= contentPages.length - 1;

  // 显示或隐藏分页控件
  if (contentPages.length > 1) {
    paginationControls.style.display = "flex";
    console.log(`显示分页导航，共 ${contentPages.length} 页`);

    // 记录所有页面内容长度，帮助调试
    for (let i = 0; i < contentPages.length; i++) {
      console.log(`第 ${i + 1} 页内容长度: ${contentPages[i].length}`);
    }
  } else {
    paginationControls.style.display = "none";
    console.log("隐藏分页导航");
  }
}

// 显示指定页的内容
function showPage(pageIndex) {
  if (pageIndex < 0 || pageIndex >= contentPages.length) {
    console.error(`页码无效: ${pageIndex + 1}/${contentPages.length}`);
    return;
  }

  currentPageIndex = pageIndex;

  console.log(`显示第 ${pageIndex + 1}/${contentPages.length} 页`);

  // 使用淡入淡出效果
  const contentElement = document.getElementById("previewContent");

  // 淡出当前内容
  contentElement.style.opacity = "0";

  // 等待淡出动画完成后更新内容
  setTimeout(() => {
    // 确保之前的内容完全清除
    contentElement.innerHTML = "";

    // 检查内容是否存在
    if (!contentPages[pageIndex] || contentPages[pageIndex].trim() === "") {
      contentElement.innerHTML = "<p>此页内容为空</p>";
      console.error(`第 ${pageIndex + 1} 页内容为空`);
    } else {
      // 设置新内容
      contentElement.innerHTML = contentPages[pageIndex];
      console.log(
        `已设置第 ${pageIndex + 1} 页内容，长度: ${
          contentPages[pageIndex].length
        }`
      );
    }

    // 在预览模式下禁用滚动条
    contentElement.style.overflow = "hidden";

    // 应用自定义列表样式
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

    // 确保所有的.custom-list-item都被正确设置emoji
    document.querySelectorAll(".custom-list-item").forEach((item) => {
      if (!item.hasAttribute("data-emoji")) {
        item.setAttribute("data-emoji", randomEmoji);
      }
    });

    // 确保内容区域滚动到顶部
    contentElement.scrollTop = 0;

    // 确保所有内容元素可见
    const elements = contentElement.querySelectorAll(
      "p, .custom-list-item, strong, span"
    );

    elements.forEach((el) => {
      el.style.visibility = "visible";
      el.style.opacity = "1";

      // 根据元素类型设置合适的显示方式
      if (el.tagName.toLowerCase() === "span") {
        el.style.display = "inline";
      } else if (el.classList.contains("custom-list-item")) {
        el.style.display = "block";
        el.style.position = "relative";
        el.style.paddingLeft = "1.6em";
        el.style.marginBottom = "0.3em";
      } else if (el.tagName.toLowerCase() === "strong") {
        // 确保strong标签显示为inline并允许换行
        el.style.display = "inline";
        el.style.whiteSpace = "normal"; // 允许换行

        // 只对非表情符号添加零宽空格，保留表情符号原貌
        if (!el.hasAttribute("data-processed")) {
          const text = el.textContent;

          // 定义表情符号的正则表达式
          const emojiRegex =
            /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]|[❤️✨🔥💡])/gu;

          // 将文本拆分为表情符号和非表情符号部分
          let lastIndex = 0;
          let parts = [];
          let match;

          // 收集所有表情符号位置
          while ((match = emojiRegex.exec(text)) !== null) {
            // 添加表情符号前的文本（添加零宽空格）
            if (match.index > lastIndex) {
              const beforeText = text.substring(lastIndex, match.index);
              parts.push(beforeText.replace(/([^\w\s])/g, "$1\u200B"));
            }

            // 添加表情符号本身（不加零宽空格）
            parts.push(match[0]);

            lastIndex = match.index + match[0].length;
          }

          // 添加最后一部分文本
          if (lastIndex < text.length) {
            const remainingText = text.substring(lastIndex);
            parts.push(remainingText.replace(/([^\w\s])/g, "$1\u200B"));
          }

          // 设置新的文本内容
          el.textContent = parts.join("");
          el.setAttribute("data-processed", "true");
        }
      } else {
        el.style.display = "block";
      }
    });

    // 智能调整内容以填满卡片
    adaptContentToFillPage(contentElement);

    // 确保高亮元素使用正确的主题颜色
    const card = document.getElementById("previewCard");
    const computedStyle = getComputedStyle(card);
    const highlightColor = computedStyle
      .getPropertyValue("--highlight-color")
      .trim();

    // 更新卡片内的高亮元素颜色
    const highlightElements = contentElement.querySelectorAll(".highlight");
    highlightElements.forEach((el) => {
      el.style.color = highlightColor;
    });

    // 淡入新内容
    contentElement.style.opacity = "1";

    // 更新分页导航
    updatePagination();

    // 确保分页导航可见（如果有多页）
    const paginationControls = document.querySelector(".pagination-controls");
    if (contentPages.length > 1) {
      paginationControls.style.display = "flex";
    } else {
      paginationControls.style.display = "none";
    }
  }, 200);
}

// 自适应内容填充整个页面
function adaptContentToFillPage(contentElement) {
  // 获取卡片内容区域
  const cardContent = contentElement;
  const contentHeight = cardContent.scrollHeight;
  const cardHeight = cardContent.clientHeight;

  console.log(
    `适应内容填充: 内容高度 ${contentHeight}px, 容器高度 ${cardHeight}px`
  );

  // 只有当内容不需要滚动且高度小于卡片高度的90%时才调整
  if (contentHeight < cardHeight && contentHeight < cardHeight * 0.9) {
    // 获取所有段落和列表项
    const elements = cardContent.querySelectorAll("p, .custom-list-item");
    const count = elements.length;

    console.log(`发现 ${count} 个可调整元素`);

    // 只有当有多个元素时才进行调整
    if (count > 1) {
      // 计算需要分配的额外空间
      const extraSpace = (cardHeight - contentHeight) / (count - 1);

      // 为每个元素（除最后一个）添加额外的下边距
      elements.forEach((el, i) => {
        if (i < count - 1) {
          const currentMargin =
            parseInt(window.getComputedStyle(el).marginBottom) || 10;
          el.style.marginBottom = currentMargin + extraSpace + "px";
          console.log(
            `调整元素 ${i + 1} 底部边距: ${currentMargin} -> ${
              currentMargin + extraSpace
            }px`
          );
        }
      });
    } else if (count === 1 && contentHeight < cardHeight * 0.7) {
      // 只有一个元素且高度远小于容器时，使用内边距或者上下边距来居中
      const el = elements[0];
      const verticalPadding = (cardHeight - contentHeight) / 2;

      // 根据元素类型调整边距或内边距
      el.style.marginTop = verticalPadding + "px";
      el.style.marginBottom = verticalPadding + "px";

      console.log(`单元素居中: 上下间距设置为 ${verticalPadding}px`);
    }
  }
}

// 更新预览函数
function updatePreview() {
  const title = document.getElementById("titleInput").value;
  let content = document.getElementById("contentInput").value;

  console.log("更新预览，处理内容...");

  // 检查内容是否为空
  if (!content || content.trim() === "") {
    content = "<p>在这里分享你的见解和经验...</p>";
  }

  // 替换ul>li为独立的div结构，不使用层级嵌套
  content = content.replace(
    /<ul>([\s\S]*?)<\/ul>/g,
    function (match, listInner) {
      // 将<li>内容</li>直接替换为<div class="custom-list-item">内容</div>，不包裹在custom-list中
      return listInner.replace(
        /<li>([\s\S]*?)<\/li>/g,
        '<div class="custom-list-item">$1</div>'
      );
    }
  );

  // 确保HTML格式正确，添加缺少的标签
  const tempElement = document.createElement("div");
  tempElement.innerHTML = content;

  // 确保所有strong标签内容完整
  tempElement.querySelectorAll("strong").forEach((strongTag) => {
    // 为strong标签添加特殊属性，防止内容被错误拆分
    strongTag.setAttribute("data-preserve", "true");

    // 定义表情符号的正则表达式
    const emojiRegex =
      /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]|[❤️✨🔥💡])/gu;

    // 获取原始文本
    const text = strongTag.textContent;

    // 处理文本，将表情符号和其他部分分开处理
    let lastIndex = 0;
    let processedContent = "";
    let match;

    // 收集所有表情符号位置
    while ((match = emojiRegex.exec(text)) !== null) {
      // 添加表情符号前的文本（添加零宽空格）
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        processedContent += beforeText.replace(/([^\w\s])/g, "$1\u200B");
      }

      // 添加表情符号本身（不加零宽空格）
      processedContent += match[0];

      lastIndex = match.index + match[0].length;
    }

    // 添加最后一部分文本
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      processedContent += remainingText.replace(/([^\w\s])/g, "$1\u200B");
    }

    // 设置处理后的文本
    strongTag.textContent = processedContent;
  });

  // 检查是否有未包含在<p>标签中的纯文本，如果有则添加<p>标签
  let textNodes = Array.from(tempElement.childNodes).filter(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== ""
  );

  textNodes.forEach((node) => {
    const p = document.createElement("p");
    p.textContent = node.textContent;
    node.parentNode.replaceChild(p, node);
  });

  // 获取处理后的内容
  content = tempElement.innerHTML;

  // 处理内容中的emoji和标签
  content = processContent(content);

  console.log("处理后的内容长度:", content.length);

  // 如果标题为空，显示占位符
  document.getElementById("previewTitle").textContent =
    title || "写下一个吸引人的标题...";

  // 分页处理内容
  contentPages = paginateContent(content);
  console.log(`内容已分为 ${contentPages.length} 页`);

  // 显示第一页
  currentPageIndex = 0;
  const contentElement = document.getElementById("previewContent");

  if (contentPages.length > 0) {
    contentElement.innerHTML = contentPages[0];
    console.log(`显示第1页内容，长度: ${contentPages[0].length}`);

    // 确保内容区域不出现滚动条
    contentElement.style.overflow = "hidden";
  } else {
    contentElement.innerHTML = "<p>在这里分享你的见解和经验...</p>";
    console.log("没有内容可显示，使用默认内容");
  }

  contentElement.scrollTop = 0; // 滚动到顶部

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

  // 确保所有列表项样式正确
  document.querySelectorAll(".custom-list-item").forEach((item) => {
    item.style.position = "relative";
    item.style.paddingLeft = "1.6em";
    item.style.marginBottom = "0.3em";
  });

  // 更新分页导航
  updatePagination();

  // 检查是否需要滚动条
  checkIfScrollNeeded();

  // 确保高亮元素使用正确的主题颜色
  const card = document.getElementById("previewCard");
  const computedStyle = getComputedStyle(card);
  const highlightColor = computedStyle
    .getPropertyValue("--highlight-color")
    .trim();

  // 更新卡片内的高亮元素颜色
  const highlightElements = contentElement.querySelectorAll(".highlight");
  highlightElements.forEach((el) => {
    el.style.color = highlightColor;
  });

  // 提取纯文本内容
  extractPlainText();
}

// 下载卡片
async function downloadCard() {
  const card = document.getElementById("previewCard");
  const cardContent = card.querySelector(".card-content");
  const originalPageIndex = currentPageIndex;
  const previewSection = document.querySelector(".preview-section");

  try {
    // 添加导出模式类，移除可滚动模式
    card.classList.add("export-mode");
    previewSection.classList.remove("scrollable");

    // 获取卡片的实际尺寸
    const cardRect = card.getBoundingClientRect();
    const originalWidth = cardRect.width;
    const originalHeight = cardRect.height;

    // 保存所有页面的图片URLs
    const imageUrls = [];

    // 如果只有一页，直接下载
    if (contentPages.length === 1) {
      await downloadSingleCard(card, originalWidth, originalHeight);
      return;
    }

    // 显示下载进度提示
    const downloadBtn = document.querySelector(".download-btn");
    const originalBtnText = downloadBtn.textContent;
    downloadBtn.textContent = `正在处理 (1/${contentPages.length})`;
    downloadBtn.disabled = true;

    // 循环处理每一页
    for (let i = 0; i < contentPages.length; i++) {
      // 更新进度提示
      downloadBtn.textContent = `正在处理 (${i + 1}/${contentPages.length})`;

      // 显示当前页
      showPage(i);

      // 等待一会儿，确保内容渲染完成
      await new Promise((resolve) => setTimeout(resolve, 500));

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
      container.style.visibility = "visible"; // 确保容器可见
      container.style.opacity = "1"; // 确保容器不透明

      // 克隆卡片
      const clonedCard = card.cloneNode(true);
      clonedCard.style.transform = "none";
      clonedCard.style.width = originalWidth + "px";
      clonedCard.style.height = originalHeight + "px";
      clonedCard.style.visibility = "visible"; // 确保卡片可见
      clonedCard.style.opacity = "1"; // 确保卡片不透明
      clonedCard.classList.add("export-mode"); // 添加导出模式类

      // 确保内容区域的内容可见
      const contentWrapper = clonedCard.querySelector(".card-content-wrapper");
      if (contentWrapper) {
        contentWrapper.style.opacity = "1";
        contentWrapper.style.visibility = "visible";
        // 确保padding被保留
        contentWrapper.style.paddingBottom = "20px";
      }

      const contentElement = clonedCard.querySelector(".card-content");
      if (contentElement) {
        contentElement.style.opacity = "1";
        contentElement.style.visibility = "visible";
        // 确保滚动条不可见且内容全部可见
        contentElement.style.overflow = "visible";
        contentElement.style.maxHeight = "none";
        contentElement.style.height = "auto";

        // 确保所有子元素可见
        const elements = contentElement.querySelectorAll("*");
        elements.forEach((el) => {
          el.style.visibility = "visible";
          el.style.opacity = "1";
          if (el.tagName.toLowerCase() === "span") {
            el.style.display = "inline";
          }
        });
      }

      container.appendChild(clonedCard);
      document.body.appendChild(container);

      // 等待一会儿，确保DOM更新完成
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 使用html2canvas捕获内容
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: true, // 开启日志以便调试
        width: originalWidth,
        height: originalHeight,
        allowTaint: true,
        backgroundColor: "#ffffff",
        onclone: function (clonedDoc) {
          // 在克隆的文档上执行操作，确保所有内容可见
          const clonedContainer = clonedDoc.querySelector(
            ".card-content-wrapper"
          );
          if (clonedContainer) {
            clonedContainer.style.opacity = "1";
            clonedContainer.style.visibility = "visible";
            // 确保padding被保留
            clonedContainer.style.paddingBottom = "20px";
          }

          const clonedContent = clonedDoc.querySelector(".card-content");
          if (clonedContent) {
            clonedContent.style.opacity = "1";
            clonedContent.style.visibility = "visible";
            clonedContent.style.overflow = "visible";
            clonedContent.style.maxHeight = "none";
            clonedContent.style.height = "auto";

            // 确保所有子元素可见
            const elements = clonedContent.querySelectorAll("*");
            elements.forEach((el) => {
              el.style.visibility = "visible";
              el.style.opacity = "1";
              if (el.tagName.toLowerCase() === "span") {
                el.style.display = "inline";
              }
            });
          }
        },
      });

      // 获取图片URL
      const imageUrl = canvas.toDataURL("image/png", 1.0);
      imageUrls.push(imageUrl);

      // 清理临时元素
      document.body.removeChild(container);
    }

    // 创建文件名基础
    const fileNameBase =
      document
        .getElementById("titleInput")
        .value.trim()
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "") || "小红书卡片";

    // 下载所有图片
    for (let i = 0; i < imageUrls.length; i++) {
      const link = document.createElement("a");
      const pageNumber = contentPages.length > 1 ? `_第${i + 1}页` : "";
      link.download = `${fileNameBase}${pageNumber}.png`;
      link.href = imageUrls[i];
      link.click();

      // 添加延迟，避免浏览器下载管理器出问题
      if (i < imageUrls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    console.error("下载失败:", error);
    alert("卡片下载失败，请稍后重试！");
  } finally {
    // 移除导出模式类
    card.classList.remove("export-mode");

    // 恢复按钮状态
    const downloadBtn = document.querySelector(".download-btn");
    downloadBtn.textContent = "保存卡片 ⬇️";
    downloadBtn.disabled = false;

    // 恢复原始页面
    showPage(originalPageIndex);

    // 根据内容多少决定是否需要滚动条
    checkIfScrollNeeded();
  }
}

// 检查是否需要显示滚动条
function checkIfScrollNeeded() {
  const previewSection = document.querySelector(".preview-section");
  const contentElement = document.getElementById("previewContent");

  if (contentElement.scrollHeight > contentElement.clientHeight) {
    previewSection.classList.add("scrollable");
  } else {
    previewSection.classList.remove("scrollable");
  }
}

// 下载单张卡片（供下载卡片函数调用）
async function downloadSingleCard(card, width, height) {
  // 添加导出模式类
  card.classList.add("export-mode");
  document.querySelector(".preview-section").classList.remove("scrollable");

  // 创建一个带背景的容器
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = width + "px";
  container.style.height = height + "px";
  container.style.backgroundColor = "#ffffff";
  container.style.zIndex = "-9999";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.visibility = "visible"; // 确保容器可见
  container.style.opacity = "1"; // 确保容器不透明

  // 克隆卡片
  const clonedCard = card.cloneNode(true);
  clonedCard.style.transform = "none";
  clonedCard.style.width = width + "px";
  clonedCard.style.height = height + "px";
  clonedCard.style.visibility = "visible"; // 确保卡片可见
  clonedCard.style.opacity = "1"; // 确保卡片不透明
  clonedCard.classList.add("export-mode"); // 添加导出模式类

  // 确保内容区域的内容可见
  const contentWrapper = clonedCard.querySelector(".card-content-wrapper");
  if (contentWrapper) {
    contentWrapper.style.opacity = "1";
    contentWrapper.style.visibility = "visible";
    // 确保padding被保留
    contentWrapper.style.paddingBottom = "20px";
  }

  const contentElement = clonedCard.querySelector(".card-content");
  if (contentElement) {
    contentElement.style.opacity = "1";
    contentElement.style.visibility = "visible";
    // 确保滚动条不可见且内容全部可见
    contentElement.style.overflow = "visible";
    contentElement.style.maxHeight = "none";
    contentElement.style.height = "auto";

    // 确保所有子元素可见
    const elements = contentElement.querySelectorAll("*");
    elements.forEach((el) => {
      el.style.visibility = "visible";
      el.style.opacity = "1";
      if (el.tagName.toLowerCase() === "span") {
        el.style.display = "inline";
      }
    });
  }

  container.appendChild(clonedCard);
  document.body.appendChild(container);

  // 等待一会儿，确保DOM更新完成
  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: true, // 开启日志以便调试
      width: width,
      height: height,
      allowTaint: true,
      backgroundColor: "#ffffff",
      onclone: function (clonedDoc) {
        // 在克隆的文档上执行操作，确保所有内容可见
        const clonedContainer = clonedDoc.querySelector(
          ".card-content-wrapper"
        );
        if (clonedContainer) {
          clonedContainer.style.opacity = "1";
          clonedContainer.style.visibility = "visible";
          // 确保padding被保留
          clonedContainer.style.paddingBottom = "20px";
        }

        const clonedContent = clonedDoc.querySelector(".card-content");
        if (clonedContent) {
          clonedContent.style.opacity = "1";
          clonedContent.style.visibility = "visible";
          clonedContent.style.overflow = "visible";
          clonedContent.style.maxHeight = "none";
          clonedContent.style.height = "auto";

          // 确保所有子元素可见
          const elements = clonedContent.querySelectorAll("*");
          elements.forEach((el) => {
            el.style.visibility = "visible";
            el.style.opacity = "1";
            if (el.tagName.toLowerCase() === "span") {
              el.style.display = "inline";
            }
          });
        }
      },
    });

    // 创建下载链接
    const link = document.createElement("a");
    const fileName =
      document
        .getElementById("titleInput")
        .value.trim()
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "") || "小红书卡片";

    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
  } catch (error) {
    console.error("下载失败:", error);
    alert("卡片下载失败，请稍后重试！");
  } finally {
    // 清理临时元素
    document.body.removeChild(container);

    // 移除导出模式类
    card.classList.remove("export-mode");

    // 检查是否需要滚动条
    checkIfScrollNeeded();
  }
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
    // 设置一个监听器，用于显示可能的重试过程
    let retryCount = 0;
    const retryListener = (event) => {
      if (event.detail && event.detail.type === "retry") {
        retryCount = event.detail.count;
        btnText.innerHTML = `<span class="loading"></span> 重试中 (${retryCount}/${event.detail.max})...`;
      }
    };

    // 添加自定义事件监听
    window.addEventListener("api-retry", retryListener);

    // 发起API请求
    const result = await generateContentApi(
      selectedTopic.dataset.topic,
      topicInput
    );

    // 移除事件监听
    window.removeEventListener("api-retry", retryListener);

    // 确保内容格式正确
    if (result && result.title && result.content) {
      console.log("API返回内容:", result);

      // 处理标题和内容
      const title = result.title.trim();
      let content = result.content.trim();

      // 处理内容中的emoji和标签
      content = processContent(content);

      // 更新输入框
      document.getElementById("titleInput").value = title;
      document.getElementById("contentInput").value = content;

      // 强制更新预览
      setTimeout(() => {
        updatePreview();
        extractPlainText();

        // 确保分页导航正确显示
        if (contentPages.length > 1) {
          console.log(`内容已分为 ${contentPages.length} 页`);
          document.querySelector(".pagination-controls").style.display = "flex";
          // 记录每一页的内容长度，帮助调试
          for (let i = 0; i < contentPages.length; i++) {
            console.log(`第 ${i + 1} 页内容长度: ${contentPages[i].length}`);
          }
        } else {
          console.log("内容只有一页");
          document.querySelector(".pagination-controls").style.display = "none";
        }
      }, 100);
    } else {
      throw new Error("API返回的内容格式不正确");
    }
  } catch (error) {
    console.error("生成失败:", error);
    alert(
      "内容生成失败，请稍后重试！" +
        (error.message ? `\n错误信息: ${error.message}` : "")
    );
  } finally {
    btn.disabled = false;
    btnText.textContent = originalText;
  }
}

// 提取纯文本内容
function extractPlainText() {
  const contentWithTags = document.getElementById("contentInput").value;
  const title = document.getElementById("titleInput").value;

  // 创建临时元素来解析HTML
  const tempElement = document.createElement("div");
  tempElement.innerHTML = contentWithTags;

  // 处理标题
  let plainText = "";
  if (title) {
    plainText = title + "\n\n";
  }

  // 处理段落和列表项
  const paragraphs = tempElement.querySelectorAll("p");
  const listItems = tempElement.querySelectorAll(".custom-list-item");

  // 添加段落内容
  paragraphs.forEach((p, index) => {
    plainText += p.textContent.trim();
    // 如果不是最后一个段落，添加两个换行符
    if (index < paragraphs.length - 1) {
      plainText += "\n\n";
    }
  });

  // 如果有段落和列表项，添加分隔
  if (paragraphs.length > 0 && listItems.length > 0) {
    plainText += "\n\n";
  }

  // 添加列表项内容
  if (listItems.length > 0) {
    listItems.forEach((item, index) => {
      plainText += "• " + item.textContent.trim();
      // 如果不是最后一个列表项，添加换行符
      if (index < listItems.length - 1) {
        plainText += "\n";
      }
    });
  }

  // 如果内容是空的，使用标题
  if (plainText.trim() === "" && title) {
    plainText = title;
  } else if (plainText.trim() === "") {
    plainText = "在这里分享你的见解和经验...";
  }

  // 设置到纯文本区域
  document.getElementById("plainTextContent").value = plainText;
}

// 复制纯文本到剪贴板
function copyPlainText() {
  const plainTextArea = document.getElementById("plainTextContent");
  plainTextArea.select();

  try {
    document.execCommand("copy");
    // 临时显示复制成功提示
    const copyBtn = document.querySelector(".copy-btn");
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "复制成功！";
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  } catch (err) {
    console.error("复制失败:", err);
    alert("复制失败，请手动复制");
  }

  // 取消选择
  window.getSelection().removeAllRanges();
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

  // 获取当前主题的高亮颜色
  const computedStyle = getComputedStyle(card);
  const highlightColor = computedStyle
    .getPropertyValue("--highlight-color")
    .trim();

  // 更新卡片内的高亮元素颜色
  const highlightElements = card.querySelectorAll(".highlight");
  highlightElements.forEach((el) => {
    el.style.color = highlightColor;
  });

  // 注意：不能直接操作伪元素，伪元素的样式会通过CSS变量自动更新

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
  document.getElementById("titleInput").addEventListener("input", function () {
    updatePreview();
    checkIfScrollNeeded();
  });
  document
    .getElementById("contentInput")
    .addEventListener("input", function () {
      updatePreview();
      checkIfScrollNeeded();
    });

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

  // 分页导航按钮事件
  document.getElementById("prevPage").addEventListener("click", function () {
    if (currentPageIndex > 0) {
      showPage(currentPageIndex - 1);
      checkIfScrollNeeded();
    }
  });

  document.getElementById("nextPage").addEventListener("click", function () {
    if (currentPageIndex < contentPages.length - 1) {
      showPage(currentPageIndex + 1);
      checkIfScrollNeeded();
    }
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

  // 检查是否需要滚动条
  checkIfScrollNeeded();
});

// 导出生成函数，使其可以在全局访问
window.generateContent = generateContent;
window.downloadCard = downloadCard;
window.copyPlainText = copyPlainText;
