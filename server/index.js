const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 12346 });

// Simple room pairing and relay server.
// Messages are JSON: { type, game, room, payload }

const rooms = new Map(); // roomId -> { clients: Set(ws) }

function send(ws, obj) {
  try { ws.send(JSON.stringify(obj)); } catch (e) {}
}

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg); } catch (e) { return; }
    const { type, room, payload } = data;

    if (type === 'create') {
      // create room
      const requestedRoom = String(room || '').trim().toUpperCase();
      const roomId = requestedRoom || (Math.random() + 1).toString(36).substring(2, 8).toUpperCase();
      const existing = rooms.get(roomId);
      if (existing) {
        existing.clients.add(ws);
      } else {
        rooms.set(roomId, { clients: new Set([ws]) });
      }
      ws.roomId = roomId;
      send(ws, { type: 'created', room: roomId });
      rooms.get(roomId)?.clients.forEach(c => {
        if (c !== ws) send(c, { type: 'peer-joined', room: roomId });
      });
      return;
    }

    if (type === 'join') {
      const target = rooms.get(room);
      if (!target) {
        send(ws, { type: 'error', message: 'Room not found' });
        return;
      }
      target.clients.add(ws);
      ws.roomId = room;
      // notify all
      target.clients.forEach(c => send(c, { type: 'peer-joined', room }));
      return;
    }

    // relay generic messages to room
    const r = rooms.get(room || ws.roomId);
    if (r) {
      r.clients.forEach(c => {
        if (c !== ws) send(c, { type: 'relay', originalType: type, payload });
      });
    }
  });

  ws.on('close', () => {
    const rid = ws.roomId;
    if (rid) {
      const r = rooms.get(rid);
      if (r) {
        r.clients.delete(ws);
        r.clients.forEach(c => {
          try { c.send(JSON.stringify({ type: 'peer-left', room: rid })); } catch (e) {}
        });
        if (r.clients.size === 0) rooms.delete(rid);
      }
    }
  });
});

console.log('Games WebSocket server running on ws://localhost:12346');
