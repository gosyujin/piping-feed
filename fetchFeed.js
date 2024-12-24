// require('dotenv').config({ path: '/Users/USER/.rss' });
// const FEEDS = process.env.feed.split(',');
const FEEDS = ['https://www.nhk.or.jp/rss/news/cat2.xml', 'https://www.nhk.or.jp/rss/news/cat3.xml'];

const fs = require('fs');
const Parser = require('rss-parser');
const parser = new Parser();
const { execSync } = require('child_process');

const ppng_server = 'https://gosyujin-ppng.glitch.me/rss';
const n = ''; // '?n=1';
const send_ppng_cmd = `curl -s -T - ${ppng_server}${n}`;
const seenArticlesFile = `${process.env["HOME"]}/.seenArticles.json`;

// 既に見た記事をファイルから読み込む
function loadSeenArticles() {
  if(fs.existsSync(seenArticlesFile)) {
    const data = fs.readFileSync(seenArticlesFile, 'utf8');
    return JSON.parse(data);
  } else {
    console.info(`initialize ${seenArticlesFile}`);
    fs.writeFileSync(seenArticlesFile, "", { flag: 'w' });
    return [];
  }
}
  
// 新しく見た記事をファイルに保存する
function saveSeenArticles(seenArticles) {
  fs.writeFileSync(seenArticlesFile, JSON.stringify(seenArticles, null, 2));
}

// 待ってみる
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// piping serverにポストする
function exec(post) {
  execSync(`echo '${post}\n' | ${send_ppng_cmd}`);
}

// feedが存在するかチェックする
function existsFeeds() {
  if(FEEDS) return true;
  return false;
}

async function fetchAndDisplayFeeds() {
  let seenArticles = loadSeenArticles();
  let newSeenArticles = [...seenArticles];

  if(!existsFeeds()) {
    console.error('MUST ~/.rss file');
    return;
  }
  for(const feedUrl of FEEDS) {
    try{
      // console.info(`feed: ${feedUrl}`);
      const feed = await parser.parseURL(feedUrl);

      feed.items.map(item => {
        if(seenArticles.includes(item.link)) {
          // console.info(`feed article: already post ${item.link}`)
          return;
        }

        const post = `
${item.link}
${item.title?.replace(/\`/g, '')
        .replace(/&gt;/g, '＞')
        .replace(/'/g, '＇')
        .replace(/\(/g, '（')
        .replace(/\)/g, '）')
        .replace(/\|/g, '｜')
}:
${item.content?.replace(/\`/g, '')
        .replace(/&gt;/g, '＞')
        .replace(/'/g, '＇')
        .replace(/\(/g, '（')
        .replace(/\)/g, '）')
        .replace(/\|/g, '｜')
}
`;
        // 投稿
        console.debug(post);
        exec(post);

        newSeenArticles.push(item.link);
      });

      await sleep(1000);
    }catch (error){
      console.error(`Error fetching feed ${feedUrl}:`, error);
    }
  }

  saveSeenArticles(newSeenArticles);
}

fetchAndDisplayFeeds();
