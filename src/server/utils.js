export function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

export function getClientIp(socket) {
    const headers = socket.handshake.headers;
    const forwarded = headers['x-forwarded-for'] || headers['x-real-ip'];
    let ip = socket.handshake.address;

    if (forwarded) {
        ip = forwarded.split(',')[0].trim();
    }

    // Normalize IPv4-mapped IPv6 addresses (::ffff:192.168.1.1 -> 192.168.1.1)
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }

    return ip;
}
