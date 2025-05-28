import CONFIG from "./config.js";

// 使用配置文件中的API配置

// 生成内容的系统提示词
const SYSTEM_PROMPT = `你是一个专业的小红书内容创作者。请生成标题和内容，并以JSON格式返回，格式为：{"title": "标题", "content": "内容"}。标题限制在20个字以内。内容要分段落，每段使用<p>标签，每段开头加emoji。重要内容用<strong>标签标注。关键词使用<span class="highlight">标签</span>高亮。如果需要列表，使用<ul><li>标签</li></ul>格式。确保内容结构清晰，重点突出。`;

// 最大重试次数
const MAX_RETRY_COUNT = 3;

// 检查HTML内容是否完整
function isContentComplete(content) {
  if (!content) return false;

  // 检查是否有未闭合的HTML标签
  const checkTagPairs = [
    { open: "<p>", close: "</p>" },
    { open: "<strong>", close: "</strong>" },
    { open: "<span", close: "</span>" },
    { open: "<ul>", close: "</ul>" },
    { open: "<li>", close: "</li>" },
  ];

  for (const pair of checkTagPairs) {
    const openCount = (content.match(new RegExp(pair.open, "g")) || []).length;
    const closeCount = (content.match(new RegExp(pair.close, "g")) || [])
      .length;

    if (openCount !== closeCount) {
      console.warn(
        `标签不匹配: ${pair.open}(${openCount}个) 和 ${pair.close}(${closeCount}个)`
      );
      return false;
    }
  }

  // 检查是否有不完整的class属性
  if (content.includes("class=") && !content.includes('class="')) {
    console.warn("检测到不完整的class属性");
    return false;
  }

  // 检查是否有明显截断的HTML
  if (
    content.endsWith("<") ||
    content.endsWith("<p") ||
    content.endsWith("<span") ||
    content.endsWith("class=")
  ) {
    console.warn("内容在HTML标签处截断");
    return false;
  }

  return true;
}

// 解析API返回的内容
function parseApiResponse(apiContent) {
  try {
    // 首先尝试直接解析
    const result = JSON.parse(apiContent);

    // 检查内容完整性
    if (!isContentComplete(result.content)) {
      throw new Error("内容不完整");
    }

    return result;
  } catch (e) {
    // 尝试查找JSON字符串的开始和结束位置
    const jsonStart = apiContent.indexOf("{");
    const jsonEnd = apiContent.lastIndexOf("}") + 1;

    if (jsonStart !== -1 && jsonEnd !== -1) {
      try {
        const jsonStr = apiContent.substring(jsonStart, jsonEnd);
        const result = JSON.parse(jsonStr);

        // 检查内容完整性
        if (!isContentComplete(result.content)) {
          throw new Error("内容不完整");
        }

        return result;
      } catch (e2) {
        // 如果还是失败，使用正则表达式提取标题和内容
        const titleMatch = apiContent.match(/"title"\s*:\s*"([^"]+)"/);
        const contentMatch = apiContent.match(/"content"\s*:\s*"([^"]+)"/);

        if (titleMatch && contentMatch) {
          const content = contentMatch[1].replace(/\\n/g, "\n");

          // 检查内容完整性
          if (!isContentComplete(content)) {
            throw new Error("内容不完整");
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
          const content =
            contentLines.join("\n").match(/"([^"]+)"/)?.[1] || "生成的内容";

          // 检查内容完整性
          if (!isContentComplete(content)) {
            throw new Error("内容不完整");
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
4. 可以适当使用列表
5. 严格按照JSON格式返回
6. 确保所有HTML标签都完整闭合，特别是确保<p>、<strong>、<span class="highlight">等标签都有正确的结束标签`,
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

        // 触发自定义事件，通知UI更新状态
        const retryEvent = new CustomEvent("api-retry", {
          detail: {
            type: "retry",
            count: retryCount + 1,
            max: MAX_RETRY_COUNT,
            reason: "内容不完整",
          },
        });
        window.dispatchEvent(retryEvent);

        return generateContentApi(topic, keyword, retryCount + 1);
      } else {
        throw new Error(`经过${MAX_RETRY_COUNT}次尝试，仍无法获取完整内容`);
      }
    }
  } catch (error) {
    console.error("API调用失败:", error);

    // 如果是网络错误且未超过最大重试次数，则重试
    if (
      retryCount < MAX_RETRY_COUNT &&
      (error.message.includes("network") || error.message.includes("timeout"))
    ) {
      console.warn(`网络错误，进行第${retryCount + 1}次重试...`);

      // 触发自定义事件，通知UI更新状态
      const retryEvent = new CustomEvent("api-retry", {
        detail: {
          type: "retry",
          count: retryCount + 1,
          max: MAX_RETRY_COUNT,
          reason: "网络错误",
        },
      });
      window.dispatchEvent(retryEvent);

      return generateContentApi(topic, keyword, retryCount + 1);
    }

    throw new Error(`内容生成失败: ${error.message}`);
  }
}
