const AIEnrichmentService = (() => {
  const getApiKey = () => localStorage.getItem('pkm_openrouter_key') || '';
  
  const setApiKey = (key) => localStorage.setItem('pkm_openrouter_key', key);

  const isEnabled = () => !!getApiKey();

  const enrich = async (title, description, url) => {
    const key = getApiKey();
    if (!key) return null;

    try {
      if (key === 'test') {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              summary: "This is a comprehensive guide on the topic, explaining the core concepts clearly step by step.",
              tags: ["tutorial", "guide", "learning"],
              category: "Education",
              difficulty: "Intermediate"
            });
          }, 1500);
        });
      }

      const prompt = `Analyze the following webpage content based on its title, description, and URL.
Title: ${title}
Description: ${description}
URL: ${url}

Provide a JSON response with the following fields:
- summary: A short summary (1-2 sentences).
- tags: Array of 3-5 suggested tags (lowercase strings).
- category: A learning category (e.g., Programming, Design, Science, etc.).
- difficulty: Difficulty level (Beginner, Intermediate, Advanced).

Return ONLY valid JSON. No markdown formatting like \`\`\`json.`;

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.href,
          'X-Title': 'LinkVault'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-exp', // using gemini via openrouter
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!res.ok) throw new Error('OpenRouter API failed');
      
      const data = await res.json();
      const content = data.choices[0].message.content.trim();
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        // Try stripping markdown blocks
        const stripped = content.replace(/^```json/i, '').replace(/```$/, '').trim();
        parsed = JSON.parse(stripped);
      }
      return parsed;
    } catch (e) {
      console.warn('AIEnrichmentService Error:', e);
      return null;
    }
  };

  return { getApiKey, setApiKey, isEnabled, enrich };
})();
