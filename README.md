# Points North — games for round tables

An experimental platform for multiplayer games around round tables.

<!-- screenshot.png is regenerated on every push to main by
     .github/workflows/screenshot.yml (headless Chromium via Playwright,
     see .github/workflows/screenshot.js) - don't hand-edit it. -->
<p align="center">
  <img src="screenshot.png" alt="Screenshot of the compass ring and join QR code"><br>
  <sub>Five phones and tablets around a table, each rendering the others as a shape rotated to their real-world compass bearing.</sub>
</p>

The clever part: no device is a central display, and there's no calibration step. Each phone only
knows its own compass bearing — but by sharing that one number over the relay, every device
independently draws everyone else in the right place around the table, turning whatever hardware
people already have in their pockets into a shared, spatially-aware surface.

## Run

```
npm install
node server.js
```

Server runs at `http://localhost:3000`.

## Server

`server.js` is a minimal Express + [`ws`](https://github.com/websockets/ws) WebSocket relay — it
has no game logic of its own. Clients connect to `wss://<host>/pubgames` and join a *session* by
sending a `client_info` message containing a `sessionId` (the value encoded in the join QR code).
The server keeps a `Map` of `sessionId -> Set<WebSocket>` and relays JSON messages between clients
in the same session:

- a message with a `targetClientId` is delivered to that one client
- otherwise it's broadcast to every other client in the session

When a client disconnects, the rest of its session receive a `disconnect` message. There's no
persistence and no HTTP API beyond serving `public/` as static assets — each game built on top of
this defines its own message types and client-side behaviour.

## Client

`public/` is a single-page [p5.js](https://p5js.org) sketch (`script.js`) that draws a compass
ring: your own device sits at the centre, and every other device in the session appears as a
rectangle scaled to their screen size and rotated to their real-world compass bearing (via
`deviceorientation`) — so a group of phones and tablets round a table shows up as a matching ring
of shapes pointing the right way. On load it generates (or reads from the URL) a `sessionId` and
displays it as a QR code; scanning it opens the same session URL on another device, which then
appears as a new shape in the ring.

Interactions so far:

- **Tap** a device's shape to send it a `message`, flashing its screen
- **Swipe** left/right to message whichever device is immediately to your left/right around the ring
- A Screen Wake Lock keeps the display on; an "Enable Compass" button requests iOS's motion-sensor
  permission and hides itself once granted

This is meant as a reusable base — session/client plumbing, the bearing-ordered device list, and
the WebSocket relay — for building actual round-table games on top of.

## Credits

Based on an idea co-developed with [Edward Jenkins](https://edjenkins.co.uk).

## License

All rights reserved. No license is granted to copy, modify, or redistribute this code.
