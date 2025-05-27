import CONFIG from "./config.js";

// 使用配置文件中的API配置

// 生成内容的系统提示词
const SYSTEM_PROMPT = `你是一个专业的小红书内容创作者。请生成标题和内容，并以JSON格式返回，格式为：{"title": "标题", "content": "内容"}。标题限制在20个字以内。内容要分段落，每段使用<p>标签，每段开头加emoji。重要内容用<strong>标签标注。关键词使用<span class="highlight">标签</span>高亮。如果需要列表，使用<ul><li>标签</li></ul>格式。确保内容结构清晰，重点突出。`;

// 解析API返回的内容
function parseApiResponse(apiContent) {
  try {
    // 首先尝试直接解析
    return JSON.parse(apiContent);
  } catch (e) {
    // 尝试查找JSON字符串的开始和结束位置
    const jsonStart = apiContent.indexOf("{");
    const jsonEnd = apiContent.lastIndexOf("}") + 1;

    if (jsonStart !== -1 && jsonEnd !== -1) {
      try {
        const jsonStr = apiContent.substring(jsonStart, jsonEnd);
        return JSON.parse(jsonStr);
      } catch (e2) {
        // 如果还是失败，使用正则表达式提取标题和内容
        const titleMatch = apiContent.match(/"title"\s*:\s*"([^"]+)"/);
        const contentMatch = apiContent.match(/"content"\s*:\s*"([^"]+)"/);

        if (titleMatch && contentMatch) {
          return {
            title: titleMatch[1],
            content: contentMatch[1].replace(/\\n/g, "\n"),
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
          return { title, content };
        }
      }
    }

    // 如果所有解析方法都失败，返回错误提示
    console.error("解析失败的内容:", apiContent);
    throw new Error("无法解析API返回的内容");
  }
}

// 生成内容的API调用
export async function generateContentApi(topic, keyword) {
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
5. 严格按照JSON格式返回`,
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
    return parseApiResponse(content);
  } catch (error) {
    console.error("API调用失败:", error);
    throw new Error(`内容生成失败: ${error.message}`);
  }
}
