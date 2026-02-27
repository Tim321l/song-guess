const fs = require('fs');
const content = fs.readFileSync('src/songs_fixed.js', 'utf8');

const memesArray = `export const songsMemes = [
  {
    id: 10001,
    title: "Never Gonna Give You Up",
    artist: "Rick Astley",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6e/b3/33/6eb33356-a55e-a371-d05b-1a2fc578099e/mzaf_3270305946600257414.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/never-gonna-give-you-up/1773292758?i=1773293184&uo=4",
    year: 1987
  },
  {
    id: 10002,
    title: "All Star",
    artist: "Smash Mouth",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/b0/03/ef/b003ef4c-1a22-6b15-e851-fb106ad96a3b/mzaf_3320656447657988367.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/all-star/1440915299?i=1440915693&uo=4",
    year: 1999
  },
  {
    id: 10003,
    title: "Astronomia",
    artist: "Vicetone & Tony Igy",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/6f/14/f5/6f14f580-82c6-be4b-bde8-2a56f92765b6/mzaf_11078404958271572278.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/astronomia/1274299861?i=1274300446&uo=4",
    year: 2016
  },
  {
    id: 10004,
    title: "Shooting Stars",
    artist: "Bag Raiders",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/2d/e1/1b/2de11bd6-f85f-cec0-dd40-43f6135ec6d6/mzaf_18223882874946322170.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/shooting-stars/1440759632?i=1440759730&uo=4",
    year: 2008
  },
  {
    id: 10005,
    title: "Caramelldansen",
    artist: "Caramella Girls",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/6f/ce/21/6fce2128-16e5-ca68-4740-5aa19531967b/mzaf_4206433795640452081.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/caramelldansen/1495013032?i=1495013033&uo=4",
    year: 2008
  },
  {
    id: 10006,
    title: "Baby Shark",
    artist: "Pinkfong",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/02/d5/bb/02d5bb3e-0b02-d107-e67a-d54a1c7b977a/mzaf_17590281178329794907.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/baby-shark/1264976423?i=1264976429&uo=4",
    year: 2017
  },
  {
    id: 10007,
    title: "Gangnam Style",
    artist: "PSY",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/3d/65/ae/3d65ae0a-7b2c-f14d-5680-cdafaa8cfb2d/mzaf_11206445915046452880.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/gangnam-style/1445144506?i=1445144527&uo=4",
    year: 2012
  },
  {
    id: 10008,
    title: "PPAP (Pen Pineapple Apple Pen)",
    artist: "PIKOTARO",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/b7/85/98/b78598aa-284b-9cb5-8caf-068838066600/mzaf_8821895894493071775.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/ppap-pen-pineapple-apple-pen-long-version/1711651633?i=1711651634&uo=4",
    year: 2016
  },
  {
    id: 10009,
    title: "Entry of the Gladiators",
    artist: "Julius Fučík",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/24/96/81/2496815e-e93c-2858-e01a-8b836b20e05d/mzaf_9866758632889372926.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/entry-of-the-gladiators-arr-for-brass-ensemble/1452139753?i=1452140202&uo=4",
    year: 1999
  },
  {
    id: 10010,
    title: "Nyan Cat",
    artist: "Daniwell",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/b6/0c/4b/b60c4bb1-ff5e-2e58-12c5-8d6263257e4a/mzaf_11674089185802923177.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/nyan-cat-hashi-yasume-mix-feat-momone-momo/1070844296?i=1070844528&uo=4",
    year: 2016
  },
  {
    id: 10011,
    title: "Tunak Tunak Tun",
    artist: "Daler Mehndi",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/5a/ff/a7/5affa7d8-c4bb-4530-c4cd-1a043cdb1ec0/mzaf_15053694872004469718.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/tunak-tunak-tun/604814335?i=604814341&uo=4",
    year: 1998
  },
  {
    id: 10012,
    title: "Baby (feat. Ludacris)",
    artist: "Justin Bieber",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/89/66/d3/8966d3cb-68eb-5f2c-fef8-4ac420721387/mzaf_3044382270474258872.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/baby-feat-ludacris/1440661543?i=1440661545&uo=4",
    year: 2010
  },
  {
    id: 10013,
    title: "Friday",
    artist: "Rebecca Black",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/32/f9/76/32f9764e-8703-450e-95b3-d83d4eea7289/mzaf_2661788675734745718.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/friday/1650021643?i=1650021644&uo=4",
    year: 2011
  },
  {
    id: 10014,
    title: "The Fox (What Does the Fox Say?)",
    artist: "Ylvis",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/53/e4/44/53e4446d-3162-ee21-8e31-bfa16c53f38c/mzaf_12946431043245579822.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/the-fox-what-does-the-fox-say/690233609?i=690233856&uo=4",
    year: 2013
  },
  {
    id: 10015,
    title: "Вокализ (Тро-ло-ло)",
    artist: "Eduard Khil",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/f3/b8/ef/f3b8ef27-1d9e-67a2-e341-5ec18004e4b0/mzaf_7983549338350880017.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/%D0%B2%D0%BE%D0%BA%D0%B0%D0%BB%D0%B8%D0%B7-%D1%82%D1%80%D0%BE-%D0%BB%D0%BE-%D0%BB%D0%BE/1681500029?i=1681500031&uo=4",
    year: 2016
  },
  {
    id: 10016,
    title: "Song for Denise",
    artist: "Piano Fantasia",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/c8/70/2c/c8702cc2-ba65-2ae0-6eb1-7c4dec9f29d9/mzaf_14666105717669293921.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/song-for-denise/512140852?i=512140858&uo=4",
    year: 2012
  },
  {
    id: 10017,
    title: "Can You Feel My Heart",
    artist: "Bring Me The Horizon",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/2d/0c/e3/2d0ce34b-f92f-a685-e9e9-fa88e4f9ab8e/mzaf_15928914092567315421.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/can-you-feel-my-heart/1485070495?i=1485070702&uo=4",
    year: 2013
  },
  {
    id: 10018,
    title: "Baka Mitai [Ishin Spec Edition]",
    artist: "Hajime Saito(Takaya Kuroda)",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/c1/2d/3f/c12d3f6f-6e09-325e-a804-2d0efd4db408/mzaf_13134961158735907174.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/baka-mitai-ishin-spec-edition/1656182148?i=1656182157&uo=4",
    year: 2023
  },
  {
    id: 10019,
    title: "Big Enough (feat. Alex Cameron, Molly Lewis & Jimmy Barnes)",
    artist: "Kirin J Callinan",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/af/cd/10/afcd100a-b325-18d1-41da-74bd7a286ace/mzaf_10282331372335888784.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/big-enough-feat-alex-cameron-molly-lewis-jimmy-barnes/1647931732?i=1647931741&uo=4",
    year: 2017
  },
  {
    id: 10020,
    title: "Caramelldansen",
    artist: "Caramell",
    audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/d2/5a/dc/d25adc5d-e0bc-6ee2-41d2-5e131afbe400/mzaf_8694215729796960181.plus.aac.p.m4a",
    appleUrl: "https://music.apple.com/us/album/caramelldansen/1505925178?i=1505925183&uo=4",
    year: 2001
  }
];`;

const parts = content.split('export const songsMemes =');
const finalContent = parts[0] + memesArray;

fs.writeFileSync('src/songs.js', finalContent);
console.log("Successfully rebuilt src/songs.js with fixed HK songs and Memes.");
