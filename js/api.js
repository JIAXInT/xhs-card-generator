import CONFIG from "./config.js";

// 使用配置文件中的API配置

// 生成内容的系统提示词
const SYSTEM_PROMPT = `你是一个专业的小红书内容创作者。请生成标题和内容，并以JSON格式返回，格式为：{"title": "标题", "content": "内容"}。标题限制在20个字以内。内容要分段落，每段使用<p>标签，每段开头加emoji。重要内容用<strong>标签标注。关键词使用<span class="highlight">标签</span>高亮。

注意HTML标签的规范和嵌套规则：
1. <p>标签内不能嵌套<ul>、<li>等块级标签，所有列表必须放在<p>标签外部
2. <strong>、<span>等内联标签内不能嵌套<p>、<ul>、<li>等块级标签
3. 所有标签必须正确闭合，例如<p>必须有对应的</p>
4. 标签必须正确嵌套，不能交叉，例如<strong><span>文本</strong></span>是错误的
5. 严禁使用<em>标签，所有强调内容都必须使用<strong>标签

如果需要列表，使用<ul><li>标签</li></ul>格式，必须放在段落外部。确保内容结构清晰，重点突出。`;

// 最大重试次数
const MAX_RETRY_COUNT = 3;

// 检查HTML内容是否完整
function isContentComplete(content) {
  if (!content) return false;

  // 检查内容长度是否太短 - 对于API返回结果，我们期待更丰富的内容
  if (content.length < 150) {
    console.warn(`API返回内容太短: ${content.length}字符`);
    return false;
  }

  // 检查是否有明显截断的HTML标签或不完整的标签
  if (
    content.endsWith("<") ||
    content.endsWith("<p") ||
    content.endsWith("<span") ||
    content.endsWith("class=") ||
    content.endsWith("<div") ||
    content.includes('<span class="</div') || // 特别检查示例中的问题
    content.match(/<[a-z]+[^>]*$/) // 检查以开标签结尾但没有闭合的情况
  ) {
    console.warn("API返回内容在HTML标签处截断，需要重新请求");
    return false;
  }

  // 检查是否有未闭合的HTML标签 - 保留该检查，这是重要的结构性问题
  const checkTagPairs = [
    { open: "<p>", close: "</p>" },
    { open: "<strong>", close: "</strong>" },
    { open: "<span", close: "</span>" },
    { open: "<ul>", close: "</ul>" },
    { open: "<li>", close: "</li>" },
    { open: "<div", close: "</div>" }, // 添加div标签的检查
  ];

  let hasTagMismatch = false;
  let mismatchDetails = "";

  for (const pair of checkTagPairs) {
    const openCount = (content.match(new RegExp(pair.open, "g")) || []).length;
    const closeCount = (content.match(new RegExp(pair.close, "g")) || [])
      .length;

    if (openCount !== closeCount) {
      mismatchDetails = `标签不匹配: ${pair.open}(${openCount}个) 和 ${pair.close}(${closeCount}个)`;
      console.warn(mismatchDetails);
      hasTagMismatch = true;

      // 对于明显的标签不匹配（差异大），直接判定内容不完整
      if (Math.abs(openCount - closeCount) > 2) {
        console.warn("API返回内容标签严重不匹配，需要重新请求");
        return false;
      }
    }
  }

  // 检查是否包含明显不完整的段落（只有一个段落且内容很短）
  const paragraphs = content.match(/<p[^>]*>.*?<\/p>/gs) || [];
  if (paragraphs.length < 2 && content.length < 300) {
    console.warn("API返回内容段落数量不足，内容可能不完整");
    return false;
  }

  // 检查是否存在未闭合的引号或括号（特别是在class属性中）
  if (
    content.includes('class="') &&
    !content.includes('class=""') &&
    (content.match(/class="/g) || []).length !==
      (content.match(/"/g) || []).length / 2
  ) {
    console.warn("API返回内容存在未闭合的引号，可能不完整");
    return false;
  }

  // 检查内容是否看起来被截断（例如最后一个段落太短）
  const lastParagraph = paragraphs[paragraphs.length - 1] || "";
  if (
    paragraphs.length > 0 &&
    lastParagraph.replace(/<[^>]+>/g, "").length < 20
  ) {
    console.warn("API返回内容最后一个段落异常短，可能被截断");
    // 这里不直接返回false，因为有些短结论段落是正常的
  }

  // 保留<em>标签检查，但转为警告并自动修复，而不是拒绝内容
  if (content.includes("<em>") || content.includes("</em>")) {
    console.warn("内容使用了不推荐的<em>标签，将自动转换为<strong>标签");
  }

  // 其他检查改为警告而非拒绝
  // 检查是否有不完整的class属性
  if (content.includes("class=") && !content.includes('class="')) {
    console.warn("检测到不完整的class属性");
  }

  // 检查是否有内联元素中嵌套了块级元素
  if (
    content.match(/<strong[^>]*>[^<]*((<p>)|(<ul>)|(<li>))/i) ||
    content.match(/<span[^>]*>[^<]*((<p>)|(<ul>)|(<li>))/i)
  ) {
    console.warn("检测到内联元素中嵌套了块级元素，将尝试自动修复");
  }

  // 检查是否有p标签中嵌套了ul标签
  if (content.match(/<p[^>]*>[^<]*<ul>/i)) {
    console.warn("检测到p标签中嵌套了ul标签，将尝试自动修复");
  }

  // 检查内容是否包含有效的段落和列表 - 这个检查可以保留但更宽松
  const hasParagraphs = (content.match(/<p[^>]*>/g) || []).length > 0;
  const hasValidContent =
    hasParagraphs ||
    (content.match(/<(ul|li|div)[^>]*>/g) || []).length > 0 ||
    content.length > 300; // 内容足够长可能就是有效的

  if (!hasValidContent) {
    console.warn("API返回内容没有有效的段落或列表");
    return false;
  }

  // 检查是否只包含空段落 - 可以保留但更宽松
  const emptyParagraphs = content.match(/<p[^>]*>\s*<\/p>/g) || [];
  if (
    emptyParagraphs.length > 0 &&
    emptyParagraphs.length === (content.match(/<p[^>]*>/g) || []).length &&
    content.length < 200
  ) {
    console.warn("API返回内容只包含空段落");
    return false;
  }

  // 检查是否有乱码或带零宽空格的实体编码
  const hasBrokenEntities = /&[\u200B-\u200F\uFEFF]+[a-z]+;/i.test(content);
  if (hasBrokenEntities) {
    console.warn("API返回内容中包含带零宽空格的HTML实体编码，将尝试自动修复");
    // 不返回false，由fixHtmlContent处理
  }

  return true;
}

// 解析API返回的内容
function parseApiResponse(apiContent) {
  try {
    // 首先尝试直接解析
    const result = JSON.parse(apiContent);

    // 修复HTML内容中可能被错误转义的标签
    result.content = result.content
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;lt;/g, "<")
      .replace(/&amp;gt;/g, ">");

    // 修复HTML内容
    result.content = fixHtmlContent(result.content);

    // 检查内容完整性 - 如果内容不完整，抛出异常以触发重试
    if (!isContentComplete(result.content)) {
      throw new Error("内容不完整，需要重新请求");
    }

    return result;
  } catch (e) {
    // 如果是明确的内容不完整错误，直接向上抛出以触发重试
    if (
      e.message.includes("内容不完整") ||
      e.message.includes("需要重新请求")
    ) {
      throw e;
    }

    // 尝试查找JSON字符串的开始和结束位置
    const jsonStart = apiContent.indexOf("{");
    const jsonEnd = apiContent.lastIndexOf("}") + 1;

    if (jsonStart !== -1 && jsonEnd !== -1) {
      try {
        const jsonStr = apiContent.substring(jsonStart, jsonEnd);
        const result = JSON.parse(jsonStr);

        // 修复HTML内容中可能被错误转义的标签
        result.content = result.content
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;lt;/g, "<")
          .replace(/&amp;gt;/g, ">");

        // 修复HTML内容
        result.content = fixHtmlContent(result.content);

        // 检查内容完整性
        if (!isContentComplete(result.content)) {
          throw new Error("内容不完整，需要重新请求");
        }

        return result;
      } catch (e2) {
        // 如果是明确的内容不完整错误，直接向上抛出以触发重试
        if (
          e2.message.includes("内容不完整") ||
          e2.message.includes("需要重新请求")
        ) {
          throw e2;
        }

        // 如果还是失败，使用正则表达式提取标题和内容
        const titleMatch = apiContent.match(/"title"\s*:\s*"([^"]+)"/);
        const contentMatch = apiContent.match(/"content"\s*:\s*"([^"]+)"/);

        if (titleMatch && contentMatch) {
          let content = contentMatch[1].replace(/\\n/g, "\n");

          // 修复HTML内容中可能被错误转义的标签
          content = content
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;lt;/g, "<")
            .replace(/&amp;gt;/g, ">");

          // 修复HTML内容
          content = fixHtmlContent(content);

          // 检查内容完整性
          if (!isContentComplete(content)) {
            throw new Error("内容不完整，需要重新请求");
          }

          return {
            title: titleMatch[1],
            content: content,
          };
        }

        // 如果正则匹配失败，尝试按行分割
        const lines = apiContent.split("\n");
        const titleLine = lines.find((line) => line.includes("title"));
        const contentLines = lines.filter((line) => line.includes("content"));

        if (titleLine && contentLines.length > 0) {
          const title = titleLine.match(/"([^"]+)"/)?.[1] || "生成的标题";
          let content =
            contentLines.join("\n").match(/"([^"]+)"/)?.[1] || "生成的内容";

          // 修复HTML内容中可能被错误转义的标签
          content = content
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;lt;/g, "<")
            .replace(/&amp;gt;/g, ">");

          // 修复HTML内容
          content = fixHtmlContent(content);

          // 检查内容完整性
          if (!isContentComplete(content)) {
            throw new Error("内容不完整，需要重新请求");
          }

          return { title, content };
        }
      }
    }

    // 如果所有解析方法都失败，返回错误提示
    console.error("解析失败的内容:", apiContent);
    throw new Error("无法解析API返回的内容或内容不完整");
  }
}

// 修复HTML内容的函数
function fixHtmlContent(content) {
  if (!content) return content;

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

  // 修复嵌套强调标签中的错误转义
  content = content.replace(
    /&lt;strong&gt;(.*?)&lt;span class="highlight"&gt;(.*?)&lt;\/span&gt;(.*?)&lt;\/strong&gt;/g,
    '<strong>$1<span class="highlight">$2</span>$3</strong>'
  );
  content = content.replace(
    /&lt;span class="highlight"&gt;(.*?)&lt;\/span&gt;/g,
    '<span class="highlight">$1</span>'
  );

  // 创建DOM解析器
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${content}</div>`, "text/html");
  const container = doc.body.firstChild;

  // 获取处理后的HTML
  let fixedContent = "";

  // 遍历第一级子元素
  Array.from(container.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      // 处理<p>标签内的错误嵌套
      if (node.tagName.toLowerCase() === "p") {
        // 查找是否有<ul>标签嵌套在<p>标签内
        const ulElements = node.querySelectorAll("ul");

        if (ulElements.length > 0) {
          // 提取<p>标签开头到第一个<ul>标签之间的内容
          let beforeUl = "";
          let afterUl = "";
          let ulContent = "";

          const tempDiv = document.createElement("div");
          tempDiv.appendChild(node.cloneNode(true));
          const html = tempDiv.innerHTML;

          const ulStart = html.indexOf("<ul");
          const ulEnd = html.lastIndexOf("</ul>") + 5;

          if (ulStart > 0 && ulEnd > ulStart) {
            beforeUl = html.substring(0, ulStart).replace(/<p[^>]*>/i, "");
            ulContent = html.substring(ulStart, ulEnd);
            afterUl = html.substring(ulEnd).replace(/<\/p>/i, "");

            // 重新构建结构：将<ul>提到<p>外部
            if (beforeUl.trim()) {
              fixedContent += `<p>${beforeUl}</p>`;
            }

            fixedContent += ulContent;

            if (afterUl.trim()) {
              fixedContent += `<p>${afterUl}</p>`;
            }
          } else {
            // 如果解析失败，保留原始标签
            fixedContent += node.outerHTML;
          }
        } else {
          // 如果没有<ul>嵌套，保持原始内容
          fixedContent += node.outerHTML;
        }
      } else {
        // 其他元素保持不变
        fixedContent += node.outerHTML;
      }
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      // 处理纯文本节点，将其包装在<p>标签内
      fixedContent += `<p>${node.textContent}</p>`;
    }
  });

  // 修复错误嵌套：不允许块级元素嵌套在内联元素内
  fixedContent = fixedContent.replace(
    /<(strong|span[^>]*?)>([\s\S]*?)<(p|ul|li|div|h[1-6])/gi,
    "<$1>$2</$1><$3"
  );
  fixedContent = fixedContent.replace(
    /<\/(p|ul|li|div|h[1-6])>([\s\S]*?)<\/(strong|span)/gi,
    "</$1><$3>$2</$3"
  );

  // 确保所有标签都正确闭合
  const tagPairs = [
    { open: "<p>", close: "</p>" },
    { open: "<strong>", close: "</strong>" },
    { open: "<span", close: "</span>" },
    { open: "<ul>", close: "</ul>" },
    { open: "<li>", close: "</li>" },
  ];

  // 遍历标签对，修复闭合问题
  tagPairs.forEach((pair) => {
    // 计算开标签和闭标签数量
    const openRegex = new RegExp(
      pair.open.replace(/([()[{*+.$^\\|?])/g, "\\$1"),
      "g"
    );
    const closeRegex = new RegExp(
      pair.close.replace(/([()[{*+.$^\\|?])/g, "\\$1"),
      "g"
    );

    const openMatches = fixedContent.match(openRegex) || [];
    const closeMatches = fixedContent.match(closeRegex) || [];

    // 如果开标签多于闭标签，添加缺少的闭标签
    if (openMatches.length > closeMatches.length) {
      const diff = openMatches.length - closeMatches.length;
      for (let i = 0; i < diff; i++) {
        fixedContent += pair.close;
      }
    }
  });

  return fixedContent;
}

// 生成内容的API调用
export async function generateContentApi(topic, keyword, retryCount = 0) {
  try {
    const response = await fetch(`${CONFIG.BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CONFIG.API_KEY}`,
      },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `请以小红书的风格，生成一篇关于"${topic}"的文章，主题是"${keyword}"。要求：
1. 标题要吸引人，带有emoji表情
2. 内容分3-4个段落，每段都要带emoji
3. 突出重点内容，标注关键词
4. 可以适当使用列表，但列表必须放在段落外部，不能将<ul>标签嵌套在<p>标签内
5. 内联标签（如<strong>、<span>等）内不能包含块级标签（如<p>、<ul>等）
6. 严格按照JSON格式返回
7. 所有HTML标签必须正确闭合且符合嵌套规则
8. 返回的内容必须完整，不能有截断的标签或不完整的结构`,
          },
        ],
        temperature: 0.8,
        max_tokens: 2000,
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API请求失败: ${response.status} - ${
          errorData.error?.message || errorData.msg || "未知错误"
        }`
      );
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("API返回数据格式错误");
    }

    const content = data.choices[0].message.content;

    try {
      // 尝试解析并检查内容完整性
      return parseApiResponse(content);
    } catch (parseError) {
      // 如果内容不完整且未超过最大重试次数，则重试
      if (retryCount < MAX_RETRY_COUNT) {
        console.warn(`内容不完整，进行第${retryCount + 1}次重试...`);
        console.warn(`错误原因: ${parseError.message}`);

        // 触发自定义事件，通知UI更新状态
        const retryEvent = new CustomEvent("api-retry", {
          detail: {
            type: "retry",
            count: retryCount + 1,
            max: MAX_RETRY_COUNT,
            reason: parseError.message,
          },
        });
        window.dispatchEvent(retryEvent);

        // 在重试时增加token数量，提高生成完整内容的概率
        return generateContentApi(topic, keyword, retryCount + 1);
      } else {
        throw new Error(`经过${MAX_RETRY_COUNT}次尝试，仍无法获取完整内容`);
      }
    }
  } catch (error) {
    console.error("API调用失败:", error);

    // 如果是网络错误、内容不完整或超时，且未超过最大重试次数，则重试
    if (
      retryCount < MAX_RETRY_COUNT &&
      (error.message.includes("network") ||
        error.message.includes("timeout") ||
        error.message.includes("内容不完整") ||
        error.message.includes("需要重新请求"))
    ) {
      console.warn(`请求失败，进行第${retryCount + 1}次重试...`);
      console.warn(`错误原因: ${error.message}`);

      // 触发自定义事件，通知UI更新状态
      const retryEvent = new CustomEvent("api-retry", {
        detail: {
          type: "retry",
          count: retryCount + 1,
          max: MAX_RETRY_COUNT,
          reason: error.message,
        },
      });
      window.dispatchEvent(retryEvent);

      return generateContentApi(topic, keyword, retryCount + 1);
    }

    throw new Error(`内容生成失败: ${error.message}`);
  }
}
