export interface ExtractedDownloadLink {
  label: string;
  url: string;
  type?: 'google-drive' | 'mediafire' | 'mega' | 'direct' | 'other';
  providerName?: string;
  fileSize?: string;
}

export function parseUniversalDownloadLinks(gameOrPost: any): ExtractedDownloadLink[] {
  if (!gameOrPost) return [];
  const results: ExtractedDownloadLink[] = [];

  const detectType = (url: string): { type: ExtractedDownloadLink['type']; provider: string } => {
    const u = url.toLowerCase();
    if (u.includes('drive.google.com')) return { type: 'google-drive', provider: 'Google Drive' };
    if (u.includes('mediafire.com')) return { type: 'mediafire', provider: 'MediaFire' };
    if (u.includes('mega.nz') || u.includes('mega.co.nz')) return { type: 'mega', provider: 'Mega.nz' };
    return { type: 'direct', provider: 'Direct Server' };
  };

  // 1. Check array of links
  if (Array.isArray(gameOrPost.links) && gameOrPost.links.length > 0) {
    gameOrPost.links.forEach((l: any, idx: number) => {
      const url = typeof l === 'string' ? l : (l.url || l.link || l.href);
      if (url && typeof url === 'string' && url.trim().startsWith('http')) {
        const { type, provider } = detectType(url);
        const name = typeof l === 'object' && l.name ? l.name : (typeof l === 'object' && l.title ? l.title : `${provider} Mirror #${idx + 1}`);
        results.push({
          label: name,
          url: url.trim(),
          type,
          providerName: provider,
          fileSize: typeof l === 'object' ? l.size : undefined,
        });
      }
    });
  }

  // 2. Check direct download_url field
  if (gameOrPost.download_url && typeof gameOrPost.download_url === 'string') {
    const dUrl = gameOrPost.download_url.trim();
    if (dUrl.startsWith('http') && !results.some(r => r.url === dUrl)) {
      const { type, provider } = detectType(dUrl);
      results.push({
        label: `Primary Download (${provider})`,
        url: dUrl,
        type,
        providerName: provider,
      });
    }
  }

  // 3. Fallback if empty
  if (results.length === 0) {
    const title = gameOrPost.title || 'Game';
    results.push({
      label: `Pakua ${title} (Direct Server)`,
      url: `/download?id=${gameOrPost.id || ''}`,
      type: 'direct',
      providerName: 'Chidy Prime Fast Server',
    });
  }

  return results;
}
