// Device clocks can be minutes off, so duel deadlines are counted on the server's clock.
// Every event with a deadline carries serverTime; the difference to this device's clock is the offset.
// Network delay makes the server look slightly behind, which errs on the side of showing a bit more time.

let offset = 0

export function syncServerClock(serverTime: string) {
  offset = new Date(serverTime).getTime() - Date.now()
}

// The server's current time in milliseconds
export function serverNow() {
  return Date.now() + offset
}
