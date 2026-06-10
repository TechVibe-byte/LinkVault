const MetadataService = (() => {
  const fetchYouTubeMeta = async (url) => {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await fetch(oembedUrl);
      if (!res.ok) throw new Error('YouTube oEmbed failed');
      const data = await res.json();
      return {
        title: data.title,
        thumbnail: data.thumbnail_url,
        channel: data.author_name,
        tags: [data.author_name.toLowerCase().replace(/\s+/g, '')]
      };
    } catch (e) {
      console.warn('MetadataService YouTube Error:', e);
      return null;
    }
  };

  const fetchOpenGraphMeta = async (url) => {
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Proxy failed');
      const data = await res.json();
      const htmlString = data.contents;
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      
      const title = doc.querySelector('title')?.innerText || doc.querySelector('meta[property="og:title"]')?.content || '';
      const description = doc.querySelector('meta[property="og:description"]')?.content || doc.querySelector('meta[name="description"]')?.content || '';
      const image = doc.querySelector('meta[property="og:image"]')?.content || '';
      
      return {
        title: title.trim(),
        description: description.trim(),
        thumbnail: image.trim()
      };
    } catch (e) {
      console.warn('MetadataService Generic Error:', e);
      return null;
    }
  };

  const extract = async (url, platform) => {
    if (platform === 'youtube') {
      return await fetchYouTubeMeta(url);
    } else {
      return await fetchOpenGraphMeta(url);
    }
  };

  return { extract };
})();
