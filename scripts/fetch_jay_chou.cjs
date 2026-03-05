const https = require('https');
const fs = require('fs');
const path = require('path');

const artist = "周杰倫";
const albumData = [
    { name: "Jay", year: 2000, songs: ["可愛女人", "完美主義", "星晴", "娘子", "鬥牛", "黑色幽默", "伊斯坦堡", "印地安老斑鳩", "龍捲風", "反方向的鐘"] },
    { name: "Fantasy", year: 2001, songs: ["愛在西元前", "爸我回來了", "簡單愛", "忍者", "開不了口", "上海一九四三", "對不起", "威廉古堡", "雙截棍", "安靜"] },
    { name: "八度空間", year: 2002, songs: ["半獸人", "半島鐵盒", "暗號", "龍拳", "火車叨位去", "分裂", "爺爺泡的茶", "回到過去", "米蘭的小鐵匠", "最後的戰役"] },
    { name: "葉惠美", year: 2003, songs: ["以父之名", "懦夫", "晴天", "三年二班", "東風破", "你聽得到", "同一種調調", "她的睫毛", "愛情懸崖", "梯田", "雙刀"] },
    { name: "七里香", year: 2004, songs: ["我的地盤", "七里香", "藉口", "外婆", "將軍", "擱淺", "亂舞春秋", "困獸之鬥", "園遊會", "止戰之殤"] },
    { name: "11月的蕭邦", year: 2005, songs: ["夜曲", "藍色風暴", "髮如雪", "黑色毛衣", "四面楚歌", "楓", "浪漫手機", "逆鱗", "麥芽糖", "珊瑚海", "飄移", "一路向北"] },
    { name: "依然范特西", year: 2006, songs: ["夜的第七章", "聽媽媽的話", "千里之外", "本草綱目", "退後", "紅模仿", "心雨", "白色風車", "迷迭香", "菊花台"] },
    { name: "我很忙", year: 2007, songs: ["牛仔很忙", "彩虹", "青花瓷", "陽光宅男", "蒲公英的約定", "無雙", "我不配", "扯", "甜甜的", "最長的電影"] },
    { name: "魔杰座", year: 2008, songs: ["龍戰騎士", "給我一首歌的時間", "蛇舞", "花海", "魔術先生", "說好的幸福呢", "蘭亭序", "流浪詩人", "時光機", "喬克叔叔", "稻香"] },
    { name: "跨時代", year: 2010, songs: ["跨時代", "說了再見", "煙花易冷", "免費教學錄影帶", "好久不見", "雨下一整晚", "嘻哈空姐", "我落淚情緒零碎", "愛的飛行日記", "自導自演", "超人不會飛"] },
    { name: "驚嘆號", year: 2011, songs: ["驚嘆號", "迷魂曲", "Mine Mine", "公主病", "你好嗎", "療傷燒肉粽", "水手怕水", "世界末末日", "皮影戲", "超跑女神", "愛你沒差"] },
    { name: "12新作", year: 2012, songs: ["四季列車", "手語", "明明就", "傻笑", "比較大的大提琴", "愛你沒差", "公公偏頭痛", "紅塵客棧", "夢想啟動", "大笨鐘", "哪裡都是你", "烏克麗麗"] },
    { name: "哎呦，不錯哦", year: 2014, songs: ["陽明山", "竊愛", "算什麼男人", "天涯過客", "怎麼了", "一口氣全唸對", "我要夏天", "聽爸爸的話", "美人魚", "聽見下雨的聲音", "手寫的從前", "鞋子特大號"] },
    { name: "周杰倫的床邊故事", year: 2016, songs: ["床邊故事", "說走就走", "一點點", "前世情人", "英雄", "不該", "土耳其冰淇淋", "告白氣球", "Now You See Me", "愛情廢柴"] },
    { name: "最偉大的作品", year: 2022, songs: ["最偉大的作品", "還在流浪", "倒影", "錯過的煙火", "紅顏如霜", "Mojito", "等你下課", "不愛我就拉倒", "說好不哭"] }
];

let allNewSongs = [];
let totalSongs = albumData.reduce((acc, album) => acc + album.songs.length, 0);
let processedCount = 0;

async function fetchSongData(songTitle, albumInfo) {
    return new Promise((resolve) => {
        const query = `${artist} ${songTitle}`;
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1&country=tw`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const results = JSON.parse(data).results;
                    if (results && results.length > 0) {
                        const song = results[0];
                        resolve({
                            title: song.trackName,
                            artist: song.artistName,
                            audioUrl: song.previewUrl,
                            appleUrl: song.trackViewUrl,
                            year: albumInfo.year,
                            album: albumInfo.name
                        });
                    } else {
                        console.warn(`[iTunes] No results for: ${query}`);
                        resolve(null);
                    }
                } catch (e) {
                    console.error(`[iTunes] Error parsing data for ${query}`, e);
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            console.error(`[iTunes] Network error for ${query}`, err);
            resolve(null);
        });
    });
}

async function run() {
    console.log(`Starting fetch for ${totalSongs} songs...`);

    for (const album of albumData) {
        for (const songTitle of album.songs) {
            const data = await fetchSongData(songTitle, album);
            if (data) allNewSongs.push(data);
            processedCount++;
            if (processedCount % 10 === 0) console.log(`Processed ${processedCount}/${totalSongs}...`);
            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 100));
        }
    }

    console.log(`Finished fetching. Found ${allNewSongs.length} songs.`);
    fs.writeFileSync('scripts/jay_chou_fetched.json', JSON.stringify(allNewSongs, null, 2));
    console.log('Results saved to scripts/jay_chou_fetched.json');
}

run();
