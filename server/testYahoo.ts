// uses global fetch

const TICKER_MAP: Record<string, string> = {
  VIX: '^VIX',
  DXY: 'DX-Y.NYB'
};

async function run() {
  for (const [id, ticker] of Object.entries(TICKER_MAP)) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=30d`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
        }
      });
      console.log(`Ticker ${ticker} (${id}): status ${res.status}`);
      if (res.status === 200) {
        const data = await res.json() as any;
        const timestamp = data.chart?.result?.[0]?.timestamp;
        const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
        console.log(`  Got ${timestamp?.length} candles. Last close: ${closes?.[closes.length - 1]}`);
      }
    } catch (e: any) {
      console.error(`  Error for ${ticker}:`, e.message);
    }
  }
}

run();
