export let state = {
    name: '', // Display Name
    username: '', // Login Username (Email for Google users)
    roomId: '',
    icon: '👤',
    isHost: false,
    players: [],
    myId: '',
    hasGuessed: false,
    timerInterval: null,
    favorites: [],
    currentFavUrl: null,
    spotifyToken: null,
    roomLang: null,
    roomMode: null,
    selectedCommunityGenre: 'All',
    isPaused: false,
    audioAutoplayAllowed: false,
    teamId: null
};
