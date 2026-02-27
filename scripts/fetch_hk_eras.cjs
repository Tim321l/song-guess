const https = require('https');
const fs = require('fs');

const eraCategories = [
    {
        name: 'hk8090s', // 1980 - 2000
        country: 'hk',
        minYear: 1980,
        maxYear: 2000,
        targetCount: 1000,
        queries: [
            'Jacky Cheung', 'Andy Lau', 'Leon Lai', 'Aaron Kwok', 'Leslie Cheung',
            'Anita Mui', 'Alan Tam', 'Beyond', 'Danny Chan', 'Faye Wong',
            'Sammi Cheng', 'Kelly Chen', 'Cass Phang', 'Shirley Kwan', 'William So',
            'Edmond Leung', 'Andy Hui', 'Grasshopper', 'Priscilla Chan', 'Sally Yeh',
            'George Lam', 'Roman Tam', 'Jenny Tseng', 'Kenny Bee', 'Paula Tsui',
            'Samuel Hui', 'Michael Kwan', 'Danny Summer', 'Ekin Cheng', 'Jordan Chan',
            'Dicky Cheung', 'Hack Lee', 'Hacken Lee', 'Vivian Chow', 'Raidas',
            'Tai Chi', 'Blue Jeans', 'Tat Ming Pair', 'Sandy Lam', 'Liza Wang',
            'Adam Cheng', 'Teresa Teng cantonese', 'Frances Yip', 'Agnes Chan',
            'CantiPop 80s', 'CantiPop 90s', 'TVB Theme 80s', 'TVB Theme 90s'
        ]
    },
    {
        name: 'hk2000s', // 2000 - 2010
        country: 'hk',
        minYear: 2000,
        maxYear: 2010,
        targetCount: 1000,
        queries: [
            'Eason Chan', 'Joey Yung', 'Leo Ku', 'Miriam Yeung', 'Twins',
            'Hacken Lee 2000', 'Kelly Chen 2000', 'Andy Lau 2000', 'Nicholas Tse',
            'Janice Vidal', 'Kay Tse', 'Hins Cheung', 'Justin Lo', 'Khalil Fong',
            'Ivana Wong', 'Stephy Tang', 'Kary Ng', 'Fiona Sit', 'Pakho Chau',
            'Jason Chan', 'RubberBand', 'Mr. Band', 'Dear Jane', 'Soler',
            'Shine HK', 'Boyz HK', 'Cookies HK', '2R HK', 'Candy Lo', 'Jade Kwan',
            'Ronald Cheng', 'William So 2000', 'Edmond Leung 2000', 'Andy Hui 2000',
            'Niki Chow', '关心妍', '薛凯琪', '周柏豪', '陳奕迅', '容祖兒', '古巨基',
            'CantiPop 2000s', 'HK Pop 2005'
        ]
    }
];

async function startFetching() {
    const resultsData = {};

    for (const era of eraCategories) {
        console.log(`\n--- Fetching Era: ${era.name} (${era.minYear}-${era.maxYear}) ---`);
        let eraSongs = [];
        const seenKeys = new Set();

        for (const query of era.queries) {
            console.log(`Searching: ${query}...`);
            try {
                const results = await performSearch(query, era.country);
                if (results) {
                    let added = 0;
                    results.forEach(song => {
                        const year = new Date(song.releaseDate).getFullYear();
                        if (year >= era.minYear && year <= era.maxYear && song.previewUrl) {
                            const key = `${song.trackName.toLowerCase()}-${song.artistName.toLowerCase()}`;
                            if (!seenKeys.has(key)) {
                                seenKeys.add(key);
                                eraSongs.push({
                                    title: song.trackName,
                                    artist: song.artistName,
                                    audioUrl: song.previewUrl,
                                    appleUrl: song.trackViewUrl,
                                    year: year
                                });
                                added++;
                            }
                        }
                    });
                    console.log(`  +${added} songs (Total: ${eraSongs.length})`);
                }
                // Rate limit protection
                await new Promise(r => setTimeout(r, 1200));
            } catch (err) {
                console.error(`  Error searching ${query}: ${err.message}`);
            }
        }

        uniqueSongs = eraSongs.sort(() => Math.random() - 0.5);
        resultsData[era.name] = uniqueSongs.slice(0, era.targetCount);
        console.log(`Finished ${era.name} with ${resultsData[era.name].length} songs.`);
    }

    fs.writeFileSync('./hk_era_songs.json', JSON.stringify(resultsData, null, 2));
    console.log('\nSaved all era songs to hk_era_songs.json');
}

function performSearch(query, country) {
    return new Promise((resolve) => {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=100&country=${country}`;
        const options = { headers: { 'User-Agent': 'Mozilla/5.0' } };

        https.get(url, options, (res) => {
            if (res.statusCode !== 200) {
                resolve(null);
                return;
            }
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data).results);
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

startFetching();
