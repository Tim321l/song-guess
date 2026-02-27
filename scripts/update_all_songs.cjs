const https = require('https');
const fs = require('fs');

const categories = [
    {
        name: 'songsEn',
        country: 'us',
        queries: [
            'Ed Sheeran', 'Adele', 'Taylor Swift', 'Justin Bieber', 'Drake',
            'Bruno Mars', 'Katy Perry', 'Rihanna', 'Maroon 5', 'Eminem',
            'Avicii', 'The Weeknd', 'One Direction', 'Coldplay', 'Imagine Dragons',
            'Billie Eilish', 'Dua Lipa', 'Post Malone', 'Ariana Grande', 'Shawn Mendes'
        ]
    },
    {
        name: 'songsCn',
        country: 'tw',
        queries: [
            'Jay Chou', 'Eason Chan', '陳奕迅', 'JJ Lin', 'G.E.M.', 'Eric Chou', 'Mayday',
            'Hebe Tien', 'A-Mei', 'Jolin Tsai', 'David Tao', 'Leehom Wang', 'Stefanie Sun',
            'Fish Leong', 'Rene Liu', 'S.H.E', 'A-Lin', 'Joker Xue', 'Li Ronghao',
            'Yoga Lin', 'WeiBird', 'F.I.R.', 'Tanya Chua', 'Show Lo', 'Rainie Yang',
            'Jacky Cheung', 'Leon Lai', 'Aaron Kwok', 'Andy Lau', 'Leslie Cheung',
            'Anita Mui', 'Faye Wong', 'Beyond', 'Hacken Lee', 'Joey Yung', 'Miriam Yeung',
            'Kay Tse', 'Hins Cheung', 'Khalil Fong', 'Karen Mok', 'Sandy Lam',
            'Jonathan Lee', 'Wakin Chau', 'Jeff Chang', 'Na Ying', 'Wang Feng',
            'Han Hong', 'Teresa Teng', 'Eason Chan 1', 'Eason Chan 2', 'Eason Chan 3'
        ]
    },
    {
        name: 'songsJp',
        country: 'jp',
        queries: [
            'YOASOBI', 'Kenshi Yonezu', 'Ado', 'LiSA', 'Hikaru Utada', 'RADWIMPS',
            'Aimer', 'King Gnu', 'Official HIGE DANdism', 'Aimyon', 'Vaundy', 'Eve',
            'Yorushika', 'Yuri', 'Mrs. GREEN APPLE', 'Milet', 'Kaze Fujii', 'ONE OK ROCK',
            'Back Number', 'Daoko', 'Miku Hatsune', 'Lisa', 'BUMP OF CHICKEN'
        ]
    },
    {
        name: 'songsFr',
        country: 'fr',
        queries: [
            'Stromae', 'Angèle', 'Aya Nakamura', 'Maitre Gims', 'Orelsan',
            'Julien Doré', 'Louane', 'Kendji Girac', 'Vianney', 'Zaz',
            'Indila', 'Booba', 'Nekfeu', 'PNL', 'Ninho', 'Jul', 'Damso',
            'Soprano', 'M. Pokora', 'Gazo', 'Céline Dion', 'Edith Piaf'
        ]
    },
    {
        name: 'songsTh',
        country: 'th',
        queries: [
            'Ink Waruntorn', 'NONT TANONT', 'Three Man Down', 'Tilly Birds', 'BOWKYLION',
            'POLYCAT', 'THE TOYS', 'Stamp Apiwat', 'Potato', 'Clash', 'Bodyslam',
            'Cocktail', '4EVE', 'TRINITY', 'KLEAR', 'Lipta', 'F.HERO', 'UrboyTJ',
            'Wanyai', 'Violette Wautier', 'Palmy', 'TaitosmitH'
        ]
    },
    {
        name: 'songsHk',
        country: 'hk',
        queries: [
            // 1980s Legends
            'Alan Tam', 'Leslie Cheung', 'Anita Mui', 'Danny Chan', 'Beyond', 'Grasshopper',
            'George Lam', 'Sally Yeh', 'Priscilla Chan', 'Roman Tam', 'Jenny Tseng', 'Kenny Bee',
            'Paula Tsui', 'Samuel Hui', 'Lam Chi Cheung', 'Michael Kwan', 'Danny Summer',
            // 1990s Superstars
            'Jacky Cheung', 'Andy Lau', 'Leon Lai', 'Aaron Kwok', 'Faye Wong', 'Sammi Cheng',
            'Kelly Chen', 'Cass Phang', 'Shirley Kwan', 'William So', 'Edmond Leung', 'Andy Hui',
            'Dickboy', 'Grasshopper 1', 'Beyond 1', 'Faye Wong 1', 'Ekin Cheng', 'Jordan Chan',
            // 2000s Pops
            'Eason Chan', 'Joey Yung', 'Twins', 'Miriam Yeung', 'Leo Ku', 'Nicholas Tse',
            'Justin Lo', 'Kay Tse', 'Hins Cheung', 'Khalil Fong', 'Ivana Wong', 'Janice Vidal',
            'Stephy Tang', 'Kary Ng', 'Fiona Sit', 'Pakho Chau', 'Jason Chan', 'RubberBand',
            // 2010s - 2025 Modern
            'G.E.M.', 'AGA', 'Gin Lee', 'Dear Jane', 'Supper Moment', 'MC Cheung', 'Gareth.T',
            'Jay Fung', 'Terence Lam', 'Jace Chan', 'Mike Zeng', 'Yan Ting', 'Lolly Talk',
            'COLLAR', 'Error HK', 'P1X3L', 'Moon Tang', 'Sabrina Cheung', 'Cloud Wan',
            // Specific cantonese search to broaden
            'Cantonese 80s', 'Cantonese 90s', 'Cantonese 2000s', 'Cantonese hits', 'TVB theme'
        ],
        blacklist: [
            'Mirror', 'Keung To', 'Anson Lo', 'Ian Chan', 'Edan Lui', 'Jer Lau', 'Anson Kong',
            'Jeremy Lee', 'Stanley Yau', 'Alton Wong', 'Frankie Chan', 'Tiger Yau', 'Lokman Yeung',
            '姜濤', '盧瀚霆', '陳卓賢', '呂爵安', '柳應廷', '江𤒹生', '李駿傑', '邱士縉', '王智德', '陳瑞輝', '邱傲然', '楊樂文'
        ]
    },
    {
        name: 'songsKr',
        country: 'kr',
        queries: [
            'BTS', 'IU', 'BLACKPINK', 'TWICE', 'EXO', 'NewJeans', 'IVE', 'Stray Kids',
            'SEVENTEEN', 'PSY', 'BIGBANG', 'Girls\' Generation', 'Red Velvet', 'NCT',
            'aespa', 'LE SSERAFIM', 'Jay Park', 'Zico', 'Taeyeon', 'G-DRAGON'
        ]
    },
    {
        name: 'songsEs',
        country: 'us', // Use 'us' for broad Latin hits
        queries: [
            'Shakira', 'Bad Bunny', 'Rosalía', 'Enrique Iglesias', 'J Balvin',
            'Luis Fonsi', 'Ricky Martin', 'Daddy Yankee', 'Maluma', 'Ozuna',
            'Karol G', 'Alejandro Sanz', 'Juanes', 'Camila Cabello', 'C. Tangana',
            'Rauw Alejandro', 'Anuel AA', 'Bizarrap', 'Christian Nodal', 'Sebastián Yatra'
        ]
    }
];

async function fetchSongs() {
    const outputData = {};

    for (const category of categories) {
        let allSongs = [];
        console.log(`Processing ${category.name}...`);

        for (const query of category.queries) {
            let retryCount = 0;
            const maxRetries = 2;
            let results = null;

            while (retryCount <= maxRetries) {
                try {
                    results = await performSearch(query, category.country);
                    if (results !== null) break;
                } catch (e) {
                    console.error(`Error for ${query}: ${e.message}`);
                }
                retryCount++;
                if (retryCount <= maxRetries) {
                    console.log(`Retrying ${query} in 2.5s...`);
                    await new Promise(r => setTimeout(r, 2500));
                }
            }

            if (results) {
                results.forEach(song => {
                    const year = new Date(song.releaseDate).getFullYear();
                    const artist = song.artistName || "";

                    // Filter: Year >= 1980 and must have preview URL
                    if (year >= 1980 && song.previewUrl) {
                        // Check blacklist for HK
                        if (category.blacklist) {
                            const isBlacklisted = category.blacklist.some(b =>
                                artist.toLowerCase().includes(b.toLowerCase())
                            );
                            if (isBlacklisted) return;
                        }

                        allSongs.push({
                            title: song.trackName,
                            artist: artist,
                            audioUrl: song.previewUrl,
                            appleUrl: song.trackViewUrl,
                            year: year
                        });
                    }
                });
            }
            // More conservative delay
            await new Promise(r => setTimeout(r, 1000));
        }

        const uniqueSongs = [];
        const titles = new Set();
        for (const song of allSongs) {
            const key = (song.title + song.artist).toLowerCase();
            if (!titles.has(key)) {
                titles.add(key);
                uniqueSongs.push(song);
            }
        }

        uniqueSongs.sort(() => Math.random() - 0.5);
        const limit = category.name === 'songsHk' ? 1500 : 1000;
        const finalSongs = uniqueSongs.slice(0, limit);
        outputData[category.name] = finalSongs;

        console.log(`Finished ${category.name} with ${finalSongs.length} songs`);
    }

    fs.writeFileSync('c:/Users/ltim2/programme/song guess/src/songs.json', JSON.stringify(outputData, null, 2));
    console.log('All songs updated successfully in src/songs.json!');
}

function performSearch(query, country) {
    return new Promise((resolve, reject) => {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=30&country=${country}`;
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 5000
        };

        const req = https.get(url, options, (res) => {
            if (res.statusCode !== 200) {
                console.log(`Query ${query} failed with status ${res.statusCode}`);
                resolve(null);
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (!data) {
                        console.log(`Empty data for ${query}`);
                        resolve(null);
                        return;
                    }
                    const parsed = JSON.parse(data);
                    resolve(parsed.results);
                } catch (e) {
                    console.log(`Parse error for ${query}: ${e.message}`);
                    resolve(null);
                }
            });
        });

        req.on('error', (e) => {
            console.log(`Request error for ${query}: ${e.message}`);
            resolve(null);
        });

        req.on('timeout', () => {
            req.destroy();
            console.log(`Timeout for ${query}`);
            resolve(null);
        });
    });
}

fetchSongs();
