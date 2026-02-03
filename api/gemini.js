// Vercel Serverless Function: Google Gemini APIへのプロキシ
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Vercelの環境変数 GEMINI_API_KEY が設定されていません。' });
    }

    const { prompt, systemPrompt, schema } = req.body;

    // Gemini API 2.5 Flash Preview
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { 
            responseMimeType: "application/json", 
            responseSchema: schema 
        }
    };

    // 指数バックオフによるリトライ処理 (最大5回)
    const fetchWithRetry = async (retries = 5) => {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorBody}`);
                }
                
                return await response.json();
            } catch (e) {
                if (i === retries - 1) throw e;
                const delay = Math.pow(2, i) * 1000;
                await new Promise(r => setTimeout(r, delay));
            }
        }
    };

    try {
        const data = await fetchWithRetry();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!resultText) {
            throw new Error("Geminiからの応答が空です。");
        }

        res.status(200).json(JSON.parse(resultText));
    } catch (error) {
        console.error("Gemini Proxy Error:", error.message);
        res.status(500).json({ error: error.message });
    }
}
