export const rooms = {};

export function setRoomTimeout(room, callback, duration, type) {
    if (room.timeout) clearTimeout(room.timeout);
    room.timeoutStartTime = Date.now();
    room.timeoutDuration = duration;
    room.timeoutType = type;
    room.timeoutCallback = callback;

    if (room.isPaused) {
        room.pauseData = {
            remainingTime: duration,
            timeoutType: type,
            timeoutCallback: callback
        };
        return;
    }

    room.timeout = setTimeout(callback, duration);
}
