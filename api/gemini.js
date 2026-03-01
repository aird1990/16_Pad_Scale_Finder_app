export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // 404エラー対策: "-latest" を付与したモデル名に変更します
  // （もしこれでも動かない場合は "gemini-pro" や "gemini-1.5-flash-001" に変更してみてください）
  const modelName = "gemini-2.5-flash-preview-09-2025"; 
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key is missing in Vercel settings' });
  }

  try {
    const { contents, systemInstruction, generationConfig } = req.body;

    // Google Gemini API の期待する厳密な構造に再構成
    const payload = {
      contents: contents,
      generationConfig: generationConfig || {}
    };

    if (systemInstruction) {
      payload.systemInstruction = systemInstruction;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // エラー時の詳細な情報を返すように修正した箇所
    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return res.status(response.status).json({ error: 'Gemini API Request Failed', details: data });
    }

    res.status(200).json(data);
  } catch (error) {
    // サーバー内部エラー時の詳細な情報を返すように修正した箇所
    console.error("Server Error:", error);
    res.status(500).json({ error: 'Server Error', details: error.message });
  }
}
