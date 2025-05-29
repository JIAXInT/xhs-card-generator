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

// 解码嵌套的HTML实体编码
function decodeNestedHtml(content) {
  if (!content) return content;

  // 先清理带有零宽空格的HTML实体编码
  content = content.replace(/&[\u200B-\u200F\uFEFF]*lt;/g, "&lt;");
  content = content.replace(/&[\u200B-\u200F\uFEFF]*gt;/g, "&gt;");
  content = content.replace(/&[\u200B-\u200F\uFEFF]*amp;/g, "&amp;");
  content = content.replace(/&[\u200B-\u200F\uFEFF]*quot;/g, "&quot;");
  content = content.replace(/&[\u200B-\u200F\uFEFF]*#39;/g, "&#39;");

  // 递归替换HTML实体编码，直到不再有变化
  let previousContent = "";
  let currentContent = content;

  while (previousContent !== currentContent) {
    previousContent = currentContent;

    // 处理常见的HTML实体编码
    currentContent = currentContent
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // 处理嵌套的strong和span标签的特殊情况
    currentContent = currentContent
      .replace(
        /&lt;strong&gt;(.*?)&lt;span class="highlight"&gt;(.*?)&lt;\/span&gt;(.*?)&lt;\/strong&gt;/g,
        '<strong>$1<span class="highlight">$2</span>$3</strong>'
      )
      .replace(
        /&lt;span class="highlight"&gt;(.*?)&lt;\/span&gt;/g,
        '<span class="highlight">$1</span>'
      );
  }

  return currentContent;
}

// 处理内容中的 emoji 和标签
function processContent(content) {
  if (!content) return "";

  // 定义表情符号的正则表达式
  const emojiRegex =
    /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]|[❤️✨🔥💡])/gu;

  // 清理带有零宽空格的HTML实体编码 - 处理类似&​​​lt;​​​​​​​​​​​​​​​strong&​​​gt;的问题
  // 零宽空格Unicode: \u200B, \u200C, \u200D, \uFEFF等
  content = content.replace(/&[\u200B-\u200F\uFEFF]*lt;/g, "&lt;"); // 替换所有带零宽空格的&lt;
  content = content.replace(/&[\u200B-\u200F\uFEFF]*gt;/g, "&gt;"); // 替换所有带零宽空格的&gt;
  content = content.replace(/&[\u200B-\u200F\uFEFF]*amp;/g, "&amp;"); // 替换所有带零宽空格的&amp;
  content = content.replace(/&[\u200B-\u200F\uFEFF]*quot;/g, "&quot;"); // 替换所有带零宽空格的&quot;
  content = content.replace(/&[\u200B-\u200F\uFEFF]*#39;/g, "&#39;"); // 替换所有带零宽空格的&#39;

  // 清理标签名称中的零宽空格
  content = content.replace(
    /<[\u200B-\u200F\uFEFF]*([a-z]+)[\u200B-\u200F\uFEFF]*/gi,
    "<$1"
  );
  content = content.replace(
    /<\/[\u200B-\u200F\uFEFF]*([a-z]+)[\u200B-\u200F\uFEFF]*/gi,
    "</$1"
  );

  // 清理属性名中的零宽空格
  content = content.replace(/\s+class[\u200B-\u200F\uFEFF]*=/g, " class=");
  content = content.replace(/\s+style[\u200B-\u200F\uFEFF]*=/g, " style=");
  content = content.replace(/\s+id[\u200B-\u200F\uFEFF]*=/g, " id=");

  // 移除所有<em>标签，保留内部内容
  content = content.replace(/<em>(.*?)<\/em>/g, "$1");

  // 移除可能嵌套或转义的<em>标签
  content = content.replace(/&lt;em&gt;(.*?)&lt;\/em&gt;/g, "$1");

  // 解码嵌套的HTML实体编码
  content = decodeNestedHtml(content);

  // 修复HTML标签嵌套错误
  content = fixHtmlStructure(content);

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

  // 检测和修复内容中的乱码HTML标签
  if (
    content.match(/&[\u200B-\u200F\uFEFF]*[a-z]+;/i) ||
    content.match(/<[\u200B-\u200F\uFEFF]*[a-z]+/i) ||
    content.match(/[\u200B-\u200F\uFEFF]+/)
  ) {
    console.warn("检测到内容中含有零宽空格或乱码标签，正在修复...");

    // 修复带零宽空格的HTML实体编码
    content = content.replace(/&[\u200B-\u200F\uFEFF]*lt;/g, "&lt;");
    content = content.replace(/&[\u200B-\u200F\uFEFF]*gt;/g, "&gt;");
    content = content.replace(/&[\u200B-\u200F\uFEFF]*amp;/g, "&amp;");
    content = content.replace(/&[\u200B-\u200F\uFEFF]*quot;/g, "&quot;");
    content = content.replace(/&[\u200B-\u200F\uFEFF]*#39;/g, "&#39;");

    // 清理标签名称中的零宽空格
    content = content.replace(
      /<[\u200B-\u200F\uFEFF]*([a-z]+)[\u200B-\u200F\uFEFF]*/gi,
      "<$1"
    );
    content = content.replace(
      /<\/[\u200B-\u200F\uFEFF]*([a-z]+)[\u200B-\u200F\uFEFF]*/gi,
      "</$1"
    );

    // 清理属性名中的零宽空格
    content = content.replace(/\s+class[\u200B-\u200F\uFEFF]*=/g, " class=");
  }

  return content;
}

// 修复HTML结构的函数
function fixHtmlStructure(content) {
  if (!content) return content;

  // 创建一个临时DOM元素来分析HTML
  const tempElement = document.createElement("div");

  try {
    // 安全地设置HTML内容
    tempElement.innerHTML = content;

    // 1. 修复p标签内的ul标签嵌套问题
    const paragraphs = tempElement.querySelectorAll("p");
    paragraphs.forEach((p) => {
      const ulElements = p.querySelectorAll("ul");
      if (ulElements.length > 0) {
        // 获取p标签的父元素
        const parent = p.parentNode;

        // 分割内容：p开始到ul之前，ul内容，ul之后到p结束
        const pContent = p.innerHTML;
        const ulStart = pContent.indexOf("<ul");
        const ulEnd = pContent.lastIndexOf("</ul>") + 5;

        if (ulStart > 0 && ulEnd > ulStart) {
          const beforeUl = pContent.substring(0, ulStart);
          const ulContent = pContent.substring(ulStart, ulEnd);
          const afterUl = pContent.substring(ulEnd);

          // 创建新元素
          const newP1 = document.createElement("p");
          newP1.innerHTML = beforeUl;

          const tempUlContainer = document.createElement("div");
          tempUlContainer.innerHTML = ulContent;
          const newUl = tempUlContainer.firstChild;

          const newP2 = document.createElement("p");
          newP2.innerHTML = afterUl;

          // 替换原始p标签
          if (beforeUl.trim()) {
            parent.insertBefore(newP1, p);
          }

          if (tempUlContainer.firstChild) {
            parent.insertBefore(newUl, p);
          }

          if (afterUl.trim()) {
            parent.insertBefore(newP2, p);
          }

          // 移除原始p标签
          parent.removeChild(p);
        }
      }
    });

    // 2. 修复内联元素内的块级元素嵌套问题
    const inlineElements = tempElement.querySelectorAll("strong, span");
    inlineElements.forEach((inlineEl) => {
      // 检查是否有块级元素嵌套
      const blockElements = inlineEl.querySelectorAll(
        "p, ul, li, div, h1, h2, h3, h4, h5, h6"
      );
      if (blockElements.length > 0) {
        // 获取内联元素的父元素
        const parent = inlineEl.parentNode;

        // 将内联元素的内容移到它前面
        const inlineContent = inlineEl.innerHTML;
        const tempContainer = document.createElement("div");
        tempContainer.innerHTML = inlineContent;

        // 移除内联元素
        parent.insertBefore(tempContainer, inlineEl);
        parent.removeChild(inlineEl);
      }
    });

    // 返回修复后的HTML
    return tempElement.innerHTML;
  } catch (e) {
    console.error("修复HTML结构时出错:", e);
    return content; // 出错时返回原始内容
  }
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

  // 允许的最大扩展高度 - 卡片最多可增加20%高度
  const maxExtendedHeight = availableHeight * 1.2;

  console.log(`卡片可用高度: ${availableHeight}px`);
  console.log(`卡片最大扩展高度: ${maxExtendedHeight}px`);

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

  // 计算所有元素的总高度
  const totalContentHeight = elementHeights.reduce(
    (sum, el) => sum + el.withMargin,
    0
  );

  console.log(`内容总高度: ${totalContentHeight}px`);

  // 如果内容总高度在最大扩展高度范围内，则不分页
  if (totalContentHeight <= maxExtendedHeight) {
    console.log(
      `内容总高度在可接受范围内 (${totalContentHeight}px <= ${maxExtendedHeight}px)，不分页`
    );

    // 设置卡片自适应高度的标记
    const card = document.getElementById("previewCard");
    if (totalContentHeight > availableHeight) {
      card.setAttribute("data-extended-height", "true");
      card.style.height = `${
        cardHeight * (totalContentHeight / availableHeight)
      }px`;
      console.log(
        `设置卡片高度为: ${
          cardHeight * (totalContentHeight / availableHeight)
        }px`
      );
    } else {
      card.removeAttribute("data-extended-height");
      card.style.height = "";
    }

    document.body.removeChild(measureContainer);
    return [contentElements.map((el) => el.html).join("")];
  }

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

  // 重置卡片高度
  const card = document.getElementById("previewCard");
  card.removeAttribute("data-extended-height");
  card.style.height = "";

  return pages;
}

// 自适应内容填充整个页面
function adaptContentToFillPage(contentElement) {
  // 获取卡片内容区域
  const cardContent = contentElement;
  const contentHeight = cardContent.scrollHeight;
  const cardHeight = cardContent.clientHeight;
  const card = document.getElementById("previewCard");

  console.log(
    `适应内容填充: 内容高度 ${contentHeight}px, 容器高度 ${cardHeight}px`
  );

  // 检查卡片是否处于扩展高度模式
  const isExtendedMode = card.hasAttribute("data-extended-height");
  if (isExtendedMode) {
    console.log("卡片处于扩展高度模式，跳过内容调整");
    return;
  }

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

// 验证内容的合法性
function validateContent(content) {
  // 如果内容太短 - 降低长度限制
  if (content.length < 30) {
    return { valid: false, reason: "内容太短，请添加更多详细信息" };
  }

  // 移除乱码检查，减少误判
  // const hasGibberish = /[\uFFFD\u{10FFFF}]|(\{\{|\}\})|(%\d\d)|(\\\w+)/.test(content);
  // if (hasGibberish) {
  //   return { valid: false, reason: "内容包含乱码或不支持的字符" };
  // }

  // 保留<em>标签检查，但只是作为警告
  if (content.includes("<em>") || content.includes("</em>")) {
    console.warn("内容使用了不推荐的<em>标签，将自动转换为<strong>标签");
    // 不影响valid状态，只做警告
  }

  // 检查HTML标签是否匹配
  const checkTagPairs = [
    { open: "<p>", close: "</p>" },
    { open: "<strong>", close: "</strong>" },
    { open: "<span", close: "</span>" },
    { open: "<ul>", close: "</ul>" },
    { open: "<li>", close: "</li>" },
  ];

  let hasTagMismatch = false;
  let mismatchDetails = "";

  for (const pair of checkTagPairs) {
    const openCount = (content.match(new RegExp(pair.open, "g")) || []).length;
    const closeCount = (content.match(new RegExp(pair.close, "g")) || [])
      .length;

    if (openCount !== closeCount) {
      mismatchDetails = `HTML标签不匹配: ${pair.open}(${openCount}个) 和 ${pair.close}(${closeCount}个)`;
      hasTagMismatch = true;
      break; // 只需要找到第一个不匹配的标签对
    }
  }

  // 只在标签严重不匹配时才返回无效
  if (hasTagMismatch && content.length < 200) {
    return { valid: false, reason: mismatchDetails };
  }

  // 其他检查项改为警告和建议，不影响内容有效性
  // 检查是否有内联元素中嵌套了块级元素
  if (
    content.match(/<strong[^>]*>[^<]*((<p>)|(<ul>)|(<li>))/i) ||
    content.match(/<span[^>]*>[^<]*((<p>)|(<ul>)|(<li>))/i)
  ) {
    console.warn("检测到内联元素中嵌套了块级元素，将尝试自动修复");
    // 允许内容通过，但记录警告
  }

  // 检查是否有p标签中嵌套了ul标签
  if (content.match(/<p[^>]*>[^<]*<ul>/i)) {
    console.warn("检测到p标签中嵌套了ul标签，将尝试自动修复");
    // 允许内容通过，但记录警告
  }

  // 内容通过验证
  return { valid: true };
}

// 更新预览函数
function updatePreview() {
  const title = document.getElementById("titleInput").value;
  let content = document.getElementById("contentInput").value;

  console.log("更新预览，处理内容...");

  // 检查内容是否为空
  if (!content || content.trim() === "") {
    content = "<p>在这里分享你的见解和经验...</p>";
  } else {
    // 先进行内容校验
    const contentValidation = validateContent(content);
    if (!contentValidation.valid) {
      console.warn(`生成的内容校验失败: ${contentValidation.reason}`);
      // 记录警告但不显示弹窗，让内容继续处理
      // const warningMessage = `注意: ${contentValidation.reason}。内容已经过自动修复，但可能需要手动调整。`;
      // setTimeout(() => {
      //   alert(warningMessage);
      // }, 500);
    }
  }

  // 修复可能被错误转义的HTML标签
  content = content.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  content = content.replace(/&amp;lt;/g, "<").replace(/&amp;gt;/g, ">");

  // 移除所有<em>标签，保留内部内容
  content = content.replace(/<em>(.*?)<\/em>/g, "$1");

  // 移除可能嵌套或转义的<em>标签
  content = content.replace(/&lt;em&gt;(.*?)&lt;\/em&gt;/g, "$1");

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

// 下载单张卡片（供下载卡片函数调用）
async function downloadSingleCard(card, width, height) {
  try {
    // 创建一个临时容器，放在页面后方但不可见
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "fixed";
    tempContainer.style.top = "0";
    tempContainer.style.left = "0";
    tempContainer.style.zIndex = "-9999"; // 确保在所有内容后方
    tempContainer.style.pointerEvents = "none"; // 确保容器不会捕获鼠标事件
    document.body.appendChild(tempContainer);

    // 创建一个带背景的容器
    const imageContainer = document.createElement("div");
    imageContainer.className = "image-generation-container";
    imageContainer.style.width = width + "px";
    imageContainer.style.height = height + "px";
    imageContainer.style.backgroundColor = "#ffffff";
    imageContainer.style.display = "flex";
    imageContainer.style.alignItems = "center";
    imageContainer.style.justifyContent = "center";
    tempContainer.appendChild(imageContainer);

    // 克隆卡片
    const clonedCard = card.cloneNode(true);
    clonedCard.style.transform = "none";
    clonedCard.style.width = width + "px";
    clonedCard.style.height = height + "px";

    // 找到内容包装器并强制设置白色背景
    const contentWrapper = clonedCard.querySelector(".card-content-wrapper");
    if (contentWrapper) {
      // 添加内联样式
      contentWrapper.style.backgroundColor = "#ffffff";
      contentWrapper.style.background = "#ffffff";
      contentWrapper.style.borderRadius = "16px"; // 确保内容包装器有圆角

      // 创建一个白色背景div并插入到内容包装器内部的最前面
      const whiteBackground = document.createElement("div");
      whiteBackground.style.position = "absolute";
      whiteBackground.style.top = "0";
      whiteBackground.style.left = "0";
      whiteBackground.style.width = "100%";
      whiteBackground.style.height = "100%";
      whiteBackground.style.backgroundColor = "#ffffff";
      whiteBackground.style.zIndex = "1"; // 确保在内容之下
      whiteBackground.style.borderRadius = "16px"; // 添加圆角，与内容包装器一致

      // 将白色背景作为第一个子元素插入
      contentWrapper.insertBefore(whiteBackground, contentWrapper.firstChild);

      // 确保其他内容在白色背景之上
      const contentChildren = contentWrapper.children;
      for (let i = 1; i < contentChildren.length; i++) {
        contentChildren[i].style.position = "relative";
        contentChildren[i].style.zIndex = "2";
      }
    }

    imageContainer.appendChild(clonedCard);

    // 等待一会儿，确保DOM更新完成
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 使用html2canvas捕获内容
    const canvas = await html2canvas(imageContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
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
          clonedContainer.style.backgroundColor = "#ffffff";
          clonedContainer.style.background = "#ffffff";
          clonedContainer.style.borderRadius = "16px"; // 确保内容包装器有圆角

          // 创建一个白色背景div并插入到内容包装器内部的最前面
          const whiteBackground = document.createElement("div");
          whiteBackground.style.position = "absolute";
          whiteBackground.style.top = "0";
          whiteBackground.style.left = "0";
          whiteBackground.style.width = "100%";
          whiteBackground.style.height = "100%";
          whiteBackground.style.backgroundColor = "#ffffff";
          whiteBackground.style.zIndex = "1"; // 确保在内容之下
          whiteBackground.style.borderRadius = "16px"; // 添加圆角，与内容包装器一致

          // 将白色背景作为第一个子元素插入
          clonedContainer.insertBefore(
            whiteBackground,
            clonedContainer.firstChild
          );

          // 确保其他内容在白色背景之上
          const contentChildren = clonedContainer.children;
          for (let i = 1; i < contentChildren.length; i++) {
            contentChildren[i].style.position = "relative";
            contentChildren[i].style.zIndex = "2";
          }
        }
      },
    });

    // 获取图片URL
    const imageUrl = canvas.toDataURL("image/png", 1.0);

    // 清理临时元素
    document.body.removeChild(tempContainer);

    // 返回图片URL，而不是直接下载
    return imageUrl;
  } catch (error) {
    console.error("单页下载失败:", error);
    alert("图片生成失败: " + error.message);
    throw error;
  }
}

// 下载卡片
async function downloadCard() {
  const card = document.getElementById("previewCard");
  const cardContent = card.querySelector(".card-content");
  const originalPageIndex = currentPageIndex;
  const previewSection = document.querySelector(".preview-section");

  // 保存卡片原始高度状态
  const wasExtendedHeight = card.hasAttribute("data-extended-height");
  const originalHeight = card.style.height;

  try {
    // 检查JSZip和FileSaver是否可用
    if (
      contentPages.length > 1 &&
      (typeof JSZip === "undefined" || typeof saveAs === "undefined")
    ) {
      console.warn("JSZip或FileSaver库未加载，将使用单独下载模式");
    }

    // 添加导出模式类，移除可滚动模式
    card.classList.add("export-mode");
    previewSection.classList.remove("scrollable");

    // 获取卡片的实际尺寸
    const cardRect = card.getBoundingClientRect();
    const originalWidth = cardRect.width;
    const originalHeight = cardRect.height;

    // 创建文件名基础
    const fileNameBase =
      document
        .getElementById("titleInput")
        .value.trim()
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "") || "小红书卡片";

    // 禁用下载按钮，避免重复点击
    const downloadBtn = document.querySelector(".download-btn");
    const originalBtnText = downloadBtn.textContent;
    downloadBtn.disabled = true;
    downloadBtn.textContent = "生成中...";

    // 如果只有一页，直接下载
    if (contentPages.length === 1) {
      try {
        console.log("开始生成单页卡片图片...");
        const imageUrl = await downloadSingleCard(
          card,
          originalWidth,
          originalHeight
        );
        console.log("图片生成成功，准备下载...");
        const link = document.createElement("a");
        link.download = `${fileNameBase}.png`;
        link.href = imageUrl;
        link.click();
      } catch (error) {
        console.error("单页图片生成失败:", error);
        alert("图片生成失败，请重试");
        throw error;
      }
    } else {
      // 存储所有生成的图片URL
      const imageUrls = [];

      // 循环处理每一页，先生成所有图片
      for (let i = 0; i < contentPages.length; i++) {
        // 更新下载按钮文本
        downloadBtn.textContent = `生成中 (${i + 1}/${contentPages.length})...`;

        // 显示当前页
        showPage(i);

        // 等待一会儿，确保内容渲染完成
        await new Promise((resolve) => setTimeout(resolve, 600));

        try {
          console.log(
            `开始生成第 ${i + 1}/${contentPages.length} 页卡片图片...`
          );
          const imageUrl = await downloadSingleCard(
            card,
            originalWidth,
            originalHeight
          );
          console.log(`第 ${i + 1} 页图片生成成功`);
          imageUrls.push({
            url: imageUrl,
            filename: `${fileNameBase}_第${i + 1}页.png`,
          });
        } catch (error) {
          console.error(`第 ${i + 1} 页图片生成失败:`, error);
          alert(`第 ${i + 1} 页生成失败，请重试`);
          throw error;
        }
      }

      // 所有图片生成完成后，创建ZIP文件并下载
      downloadBtn.textContent = "打包下载中...";
      console.log("所有图片生成完成，开始创建ZIP文件...");

      // 检查是否可以使用ZIP功能
      if (typeof JSZip !== "undefined" && typeof saveAs !== "undefined") {
        try {
          // 创建一个新的JSZip实例
          const zip = new JSZip();

          // 将所有图片添加到ZIP文件中
          for (let i = 0; i < imageUrls.length; i++) {
            // 将base64图片URL转换为二进制数据
            const imageData = await urlToBlob(imageUrls[i].url);
            // 添加到zip
            zip.file(imageUrls[i].filename, imageData);
          }

          // 生成ZIP文件
          const zipContent = await zip.generateAsync({ type: "blob" });

          // 使用FileSaver保存ZIP文件
          saveAs(zipContent, `${fileNameBase}.zip`);

          console.log("ZIP文件创建并下载成功");
          return; // 成功后直接返回
        } catch (error) {
          console.error("创建ZIP文件失败:", error);
          alert("创建ZIP文件失败，将尝试单独下载每张图片");
        }
      } else {
        console.warn("JSZip或FileSaver库未加载，使用单独下载模式");
      }

      // 如果ZIP创建失败或不可用，退回到单独下载每张图片
      downloadBtn.textContent = "下载中...";
      for (let i = 0; i < imageUrls.length; i++) {
        const link = document.createElement("a");
        link.download = imageUrls[i].filename;
        link.href = imageUrls[i].url;
        link.click();

        // 添加延迟，避免浏览器下载管理器出问题
        if (i < imageUrls.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    console.log("所有图片生成和下载完成");
  } catch (error) {
    console.error("下载失败:", error);
    alert("卡片下载失败，请稍后重试！");
  } finally {
    // 恢复下载按钮
    const downloadBtn = document.querySelector(".download-btn");
    downloadBtn.disabled = false;
    downloadBtn.textContent = originalBtnText;

    // 移除导出模式类
    card.classList.remove("export-mode");

    // 恢复原始页面
    showPage(originalPageIndex);

    // 恢复原始高度状态
    if (wasExtendedHeight) {
      card.setAttribute("data-extended-height", "true");
    } else {
      card.removeAttribute("data-extended-height");
    }
    if (originalHeight) {
      card.style.height = originalHeight;
    }

    // 检查是否需要滚动模式
    checkIfScrollNeeded();
  }
}

// 将URL转换为Blob对象
async function urlToBlob(url) {
  // 从base64 URL提取数据部分
  const base64Data = url.split(",")[1];
  // 将base64转换为二进制
  const byteCharacters = atob(base64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: "image/png" });
}

// 检查是否需要显示滚动条
function checkIfScrollNeeded() {
  const previewSection = document.querySelector(".preview-section");
  const contentElement = document.getElementById("previewContent");
  const card = document.getElementById("previewCard");

  // 如果卡片处于扩展高度模式，不显示滚动条
  if (card.hasAttribute("data-extended-height")) {
    previewSection.classList.remove("scrollable");
    contentElement.style.overflow = "hidden";
    console.log("卡片处于扩展高度模式，禁用滚动条");
    return;
  }

  if (contentElement.scrollHeight > contentElement.clientHeight) {
    previewSection.classList.add("scrollable");
    console.log("内容超出高度，启用滚动条");
  } else {
    previewSection.classList.remove("scrollable");
    console.log("内容高度适中，禁用滚动条");
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

      // 检测明显的不完整内容，如示例中的问题
      if (
        content.includes('<span class="</div') ||
        content.length < 150 ||
        (content.match(/<p/g) || []).length < 2
      ) {
        console.warn("API返回内容明显不完整，但将尝试自动修复");

        // 尝试修复明显的问题
        content = content.replace(
          /<span class="<\/div/g,
          '<span class="highlight">'
        );

        // 添加默认的结束标签，如果内容非常短，则补充内容
        if (content.length < 150) {
          content += `<p>想了解更多关于${topicInput}的内容，请继续关注更新！</p>`;
        }
      }

      // 进行内容校验，但仅记录警告，不阻止显示
      const contentValidation = validateContent(content);
      if (!contentValidation.valid) {
        console.warn(`生成的内容校验失败: ${contentValidation.reason}`);
      }

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
      // 获取内容并确保HTML标签正确解码
      let pageContent = contentPages[pageIndex];
      pageContent = decodeNestedHtml(pageContent);

      // 设置新内容
      contentElement.innerHTML = pageContent;
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
