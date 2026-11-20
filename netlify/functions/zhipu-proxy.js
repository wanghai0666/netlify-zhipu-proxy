exports.handler = async (event) => {
  // 1. 定义跨域响应头（允许博客园等外部域名访问）
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // 2. 处理浏览器的 OPTIONS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // 3. 只接受 POST 请求
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
  if (!ZHIPU_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '服务端未配置 ZHIPU_API_KEY 环境变量' })
    };
  }

  // 4. 封装带重试逻辑的请求函数
  async function callZhipuWithRetry(body, maxRetries = 2) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ZHIPU_API_KEY}`
          },
          body: body
        });

        // 如果是 429（请求过多），且还没达到最大重试次数，则等待后重试
        if (response.status === 429 && attempt < maxRetries) {
          console.log(`触发 429 限流，等待 3 秒后重试 (第 ${attempt + 1} 次)...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }

        // 返回成功的响应，或者重试次数用尽后的最终错误响应
        return response;
      } catch (err) {
        // 网络错误（如超时），如果还有重试次数，则等待后重试
        if (attempt < maxRetries) {
          console.log(`网络异常: ${err.message}，等待 3 秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        throw err;
      }
    }
  }

  // 5. 执行请求并返回结果
  try {
    const response = await callZhipuWithRetry(event.body, 2);
    const data = await response.json();
    
    // 返回数据时，带上跨域头
    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
