exports.handler = async (event) => {
  // 1. 定义跨域响应头（允许任何域名，包括博客园访问）
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

  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`
      },
      body: event.body
    });

    const data = await response.json();
    
    // 4. 返回数据时，也带上跨域头
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
