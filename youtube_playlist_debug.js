const urls = [
  'https://invidious.io/api/v1/playlists/PL4cUxeGkcC9h6S0zdiEHdQlT7F3E0S2vc?fields=videos',
  'https://yewtu.cafe/api/v1/playlists/PL4cUxeGkcC9h6S0zdiEHdQlT7F3E0S2vc?fields=videos'
];

(async () => {
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      console.log('URL', url, 'status', res.status);
      const text = await res.text();
      console.log(text.slice(0, 2000));
    } catch (error) {
      console.error('ERR', url, error.message);
    }
  }
})();
