var io = require('socket.io-client');
var render = require('./render');
var ChatClient = require('./chat-client');
var Canvas = require('./canvas');
var global = require('./global');

var playerNameInput = document.getElementById('playerNameInput');
var socket;
var queryParams = new URLSearchParams(window.location.search);
var embedMode = queryParams.get('embed') === '1';
var roomCode = (queryParams.get('room') || 'PUBLIC').replace(/[^\w-]/g, '').substring(0, 24) || 'PUBLIC';
var forbiddensUserId = queryParams.get('userId') || '';
var forbiddensPlayerId = queryParams.get('playerId') || '';
var forbiddensAvatarUrl = queryParams.get('avatarUrl') || '';
var bestMassReached = 0;
var playersEaten = 0;
var lastReportedSessionScore = 0;

function safePlayerName(value) {
    var clean = String(value || 'Jugador')
        .replace(/(<([^>]+)>)/ig, '')
        .replace(/[^\w]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 25);
    return clean || 'Jugador';
}

function publishForbiddensPresence(serverPlayers, fallbackLeaderboard) {
    if (!embedMode || !window.parent) return;
    var sourcePlayers = Array.isArray(serverPlayers) && serverPlayers.length ? serverPlayers : fallbackLeaderboard || [];
    var players = sourcePlayers.map(function (serverPlayer, index) {
        var serverId = String(serverPlayer.id || serverPlayer.playerId || index);
        var isLocal = player && serverId === String(player.id);
        var safeName = safePlayerName(serverPlayer.name || (isLocal ? global.playerName : 'Jugador'));
        return {
            userId: isLocal && forbiddensUserId ? forbiddensUserId : 'agar-server:' + serverId,
            playerId: isLocal && forbiddensPlayerId ? forbiddensPlayerId : serverId,
            name: safeName,
            avatarUrl: serverPlayer.avatarUrl || (isLocal ? forbiddensAvatarUrl : ''),
            score: Math.floor(Number(serverPlayer.massTotal || serverPlayer.score || 0)),
            massTotal: Math.floor(Number(serverPlayer.massTotal || serverPlayer.score || 0)),
            rank: index + 1,
            points: 0,
            sessionPoints: 0,
            joinedAt: Date.now() - ((sourcePlayers.length - index) * 10),
            updatedAt: Date.now()
        };
    });
    window.parent.postMessage({
        type: 'game:updateLeaderboard',
        source: 'agar-server',
        room: roomCode,
        players: players
    }, '*');
}

function getForbiddensEstimatedScore() {
    var bestMass = Math.max(bestMassReached, Math.floor(Number(player.massTotal || 0)));
    return Math.max(0, Math.min(250, Math.floor((bestMass - 10) / 5) + playersEaten * 10));
}

function reportForbiddensSessionScore(force) {
    if (!embedMode || !window.parent) return;
    var score = getForbiddensEstimatedScore();
    if (!force && score <= lastReportedSessionScore) return;
    window.parent.postMessage({
        type: 'game:sessionScore',
        source: 'agar-server',
        room: roomCode,
        pointsDelta: Math.max(0, score - lastReportedSessionScore),
        sessionPoints: score
    }, '*');
    lastReportedSessionScore = Math.max(lastReportedSessionScore, score);
}

var debug = function (args) {
    if (console && console.log) {
        console.log(args);
    }
};

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
    global.mobile = true;
}

function startGame(type) {
    global.playerName = safePlayerName(playerNameInput.value);
    global.playerType = type;
    bestMassReached = 0;
    playersEaten = 0;
    lastReportedSessionScore = 0;

    global.screen.width = window.innerWidth;
    global.screen.height = window.innerHeight;

    document.getElementById('startMenuWrapper').style.maxHeight = '0px';
    document.getElementById('gameAreaWrapper').style.opacity = 1;
    if (!socket) {
        socket = io({ query: "type=" + encodeURIComponent(type) + "&room=" + encodeURIComponent(roomCode) });
        setupSocket(socket);
    }
    if (!global.animLoopHandle)
        animloop();
    socket.emit('respawn');
    window.chat.socket = socket;
    window.chat.registerFunctions();
    window.canvas.socket = socket;
    global.socket = socket;
}

// Checks if the nick chosen contains valid alphanumeric characters (and underscores).
function validNick() {
    var regex = /^\w*$/;
    debug('Regex Test', regex.exec(playerNameInput.value));
    return regex.exec(playerNameInput.value) !== null;
}

window.onload = function () {

    var btn = document.getElementById('startButton'),
        btnS = document.getElementById('spectateButton'),
        nickErrorText = document.querySelector('#startMenu .input-error');
    var requestedName = queryParams.get('name') || queryParams.get('displayName');
    if (requestedName) {
        playerNameInput.value = safePlayerName(requestedName);
    }
    if (embedMode) {
        document.body.classList.add('embed-mode');
    }

    btnS.onclick = function () {
        startGame('spectator');
    };

    btn.onclick = function () {

        // Checks if the nick is valid.
        if (validNick()) {
            nickErrorText.style.opacity = 0;
            startGame('player');
        } else {
            nickErrorText.style.opacity = 1;
        }
    };

    var settingsMenu = document.getElementById('settingsButton');
    var settings = document.getElementById('settings');

    settingsMenu.onclick = function () {
        if (settings.style.maxHeight == '300px') {
            settings.style.maxHeight = '0px';
        } else {
            settings.style.maxHeight = '300px';
        }
    };

    playerNameInput.addEventListener('keypress', function (e) {
        var key = e.which || e.keyCode;

        if (key === global.KEY_ENTER) {
            if (validNick()) {
                nickErrorText.style.opacity = 0;
                startGame('player');
            } else {
                nickErrorText.style.opacity = 1;
            }
        }
    });

    if (embedMode) {
        window.setTimeout(function () {
            nickErrorText.style.opacity = 0;
            startGame('player');
        }, 100);
    }
};

// TODO: Break out into GameControls.

var playerConfig = {
    border: 6,
    textColor: '#FFFFFF',
    textBorder: '#000000',
    textBorderSize: 3,
    defaultSize: 30
};

var player = {
    id: -1,
    x: global.screen.width / 2,
    y: global.screen.height / 2,
    screenWidth: global.screen.width,
    screenHeight: global.screen.height,
    target: { x: global.screen.width / 2, y: global.screen.height / 2 }
};
global.player = player;

var foods = [];
var viruses = [];
var fireFood = [];
var users = [];
var leaderboard = [];
var target = { x: player.x, y: player.y };
global.target = target;

window.canvas = new Canvas();
window.chat = new ChatClient();

var visibleBorderSetting = document.getElementById('visBord');
visibleBorderSetting.onchange = settings.toggleBorder;

var showMassSetting = document.getElementById('showMass');
showMassSetting.onchange = settings.toggleMass;

var continuitySetting = document.getElementById('continuity');
continuitySetting.onchange = settings.toggleContinuity;

var roundFoodSetting = document.getElementById('roundFood');
roundFoodSetting.onchange = settings.toggleRoundFood;

var c = window.canvas.cv;
var graph = c.getContext('2d');

$("#feed").click(function () {
    socket.emit('1');
    window.canvas.reenviar = false;
});

$("#split").click(function () {
    socket.emit('2');
    window.canvas.reenviar = false;
});

function handleDisconnect() {
    socket.close();
    if (!global.kicked) { // We have a more specific error message 
        render.drawErrorMessage('Disconnected!', graph, global.screen);
    }
}

function showDeathSummary(data) {
    const summary = document.getElementById('deathSummary');
    const bestMassEl = document.getElementById('summaryBestMass');
    const pointsEl = document.getElementById('summaryPoints');
    const killsEl = document.getElementById('summaryKills');
    const killerEl = document.getElementById('summaryKiller');
    const bestMass = Math.max(bestMassReached, Math.floor(Number(player.massTotal || 0)));
    const estimatedPoints = getForbiddensEstimatedScore();
    bestMassEl.textContent = String(bestMass);
    pointsEl.textContent = String(estimatedPoints);
    killsEl.textContent = String(playersEaten);
    killerEl.textContent = data.killerName ? 'Te comio ' + safePlayerName(data.killerName) + '.' : '';
    reportForbiddensSessionScore(true);
    summary.classList.add('show');
}

document.getElementById('summaryRestart').addEventListener('click', function () {
    document.getElementById('deathSummary').classList.remove('show');
    bestMassReached = 0;
    playersEaten = 0;
    lastReportedSessionScore = 0;
    startGame('player');
});

// socket stuff.
function setupSocket(socket) {
    // Handle ping.
    socket.on('pongcheck', function () {
        var latency = Date.now() - global.startPingTime;
        debug('Latency: ' + latency + 'ms');
        window.chat.addSystemLine('Ping: ' + latency + 'ms');
    });

    // Handle error.
    socket.on('connect_error', handleDisconnect);
    socket.on('disconnect', handleDisconnect);

    // Handle connection.
    socket.on('welcome', function (playerSettings, gameSizes) {
        player = playerSettings;
        player.name = global.playerName;
        player.screenWidth = global.screen.width;
        player.screenHeight = global.screen.height;
        player.target = window.canvas.target;
        player.avatarUrl = forbiddensAvatarUrl;
        global.player = player;
        window.chat.player = player;
        socket.emit('gotit', player);
        global.gameStart = true;
        window.chat.addSystemLine('Connected to the game!');
        window.chat.addSystemLine('Type <b>-help</b> for a list of commands.');
        if (global.mobile) {
            document.getElementById('gameAreaWrapper').removeChild(document.getElementById('chatbox'));
        }
        c.focus();
        global.game.width = gameSizes.width;
        global.game.height = gameSizes.height;
        resize();
    });

    socket.on('playerDied', (data) => {
        const eatenName = isUnnamedCell(data.playerEatenName || data.name || '') ? 'An unnamed cell' : (data.playerEatenName || data.name);
        //const killer = isUnnamedCell(data.playerWhoAtePlayerName) ? 'An unnamed cell' : data.playerWhoAtePlayerName;

        //window.chat.addSystemLine('{GAME} - <b>' + (player) + '</b> was eaten by <b>' + (killer) + '</b>');
        window.chat.addSystemLine('{GAME} - <b>' + (eatenName) + '</b> was eaten');
        if (data.playerWhoAtePlayerId && player.id && data.playerWhoAtePlayerId === player.id) {
            playersEaten += 1;
        }
    });

    socket.on('playerDisconnect', (data) => {
        window.chat.addSystemLine('{GAME} - <b>' + (isUnnamedCell(data.name) ? 'An unnamed cell' : data.name) + '</b> disconnected.');
        window.setTimeout(function () {
            publishForbiddensPresence(users, leaderboard);
        }, 250);
    });

    socket.on('playerJoin', (data) => {
        window.chat.addSystemLine('{GAME} - <b>' + (isUnnamedCell(data.name) ? 'An unnamed cell' : data.name) + '</b> joined.');
        window.setTimeout(function () {
            publishForbiddensPresence(users, leaderboard);
        }, 250);
    });

    socket.on('leaderboard', (data) => {
        leaderboard = data.leaderboard;
        publishForbiddensPresence(data.onlinePlayers, leaderboard);
        if (!embedMode) {
            var status = '<span class="title">Leaderboard</span>';
            for (var i = 0; i < leaderboard.length; i++) {
                status += '<br />';
                if (leaderboard[i].id == player.id) {
                    if (leaderboard[i].name.length !== 0)
                        status += '<span class="me">' + (i + 1) + '. ' + leaderboard[i].name + "</span>";
                    else
                        status += '<span class="me">' + (i + 1) + ". An unnamed cell</span>";
                } else {
                    if (leaderboard[i].name.length !== 0)
                        status += (i + 1) + '. ' + leaderboard[i].name;
                    else
                        status += (i + 1) + '. An unnamed cell';
                }
            }
            document.getElementById('status').innerHTML = status;
        }
    });

    socket.on('onlinePlayers', (data) => {
        publishForbiddensPresence(data.onlinePlayers, leaderboard);
    });

    socket.on('serverMSG', function (data) {
        window.chat.addSystemLine(data);
    });

    // Chat.
    socket.on('serverSendPlayerChat', function (data) {
        window.chat.addChatLine(data.sender, data.message, false);
    });

    // Handle movement.
    socket.on('serverTellPlayerMove', function (playerData, userData, foodsList, massList, virusList) {
        if (global.playerType == 'player') {
            player.x = playerData.x;
            player.y = playerData.y;
            player.hue = playerData.hue;
            player.massTotal = playerData.massTotal;
            player.cells = playerData.cells;
            bestMassReached = Math.max(bestMassReached, Math.floor(Number(player.massTotal || 0)));
            reportForbiddensSessionScore(false);
        }
        users = userData;
        foods = foodsList;
        viruses = virusList;
        fireFood = massList;
        publishForbiddensPresence(users, leaderboard);
    });

    // Death.
    socket.on('RIP', function (data) {
        global.gameStart = false;
        showDeathSummary(data || {});
    });

    socket.on('kick', function (reason) {
        global.gameStart = false;
        global.kicked = true;
        if (reason !== '') {
            render.drawErrorMessage('You were kicked for: ' + reason, graph, global.screen);
        }
        else {
            render.drawErrorMessage('You were kicked!', graph, global.screen);
        }
        socket.close();
    });
}

const isUnnamedCell = (name) => name.length < 1;

const getPosition = (entity, player, screen) => {
    return {
        x: entity.x - player.x + screen.width / 2,
        y: entity.y - player.y + screen.height / 2
    }
}

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

window.cancelAnimFrame = (function (handle) {
    return window.cancelAnimationFrame ||
        window.mozCancelAnimationFrame;
})();

function animloop() {
    global.animLoopHandle = window.requestAnimFrame(animloop);
    gameLoop();
}

function gameLoop() {
    if (global.gameStart) {
        graph.fillStyle = global.backgroundColor;
        graph.fillRect(0, 0, global.screen.width, global.screen.height);

        render.drawGrid(global, player, global.screen, graph);
        foods.forEach(food => {
            let position = getPosition(food, player, global.screen);
            render.drawFood(position, food, graph);
        });
        fireFood.forEach(fireFood => {
            let position = getPosition(fireFood, player, global.screen);
            render.drawFireFood(position, fireFood, playerConfig, graph);
        });
        viruses.forEach(virus => {
            let position = getPosition(virus, player, global.screen);
            render.drawVirus(position, virus, graph);
        });


        let borders = { // Position of the borders on the screen
            left: global.screen.width / 2 - player.x,
            right: global.screen.width / 2 + global.game.width - player.x,
            top: global.screen.height / 2 - player.y,
            bottom: global.screen.height / 2 + global.game.height - player.y
        }
        if (global.borderDraw) {
            render.drawBorder(borders, graph);
        }

        var cellsToDraw = [];
        for (var i = 0; i < users.length; i++) {
            let color = 'hsl(' + users[i].hue + ', 100%, 50%)';
            let borderColor = 'hsl(' + users[i].hue + ', 100%, 45%)';
            for (var j = 0; j < users[i].cells.length; j++) {
                cellsToDraw.push({
                    color: color,
                    borderColor: borderColor,
                    mass: users[i].cells[j].mass,
                    name: users[i].name,
                    avatarUrl: users[i].avatarUrl,
                    radius: users[i].cells[j].radius,
                    x: users[i].cells[j].x - player.x + global.screen.width / 2,
                    y: users[i].cells[j].y - player.y + global.screen.height / 2
                });
            }
        }
        cellsToDraw.sort(function (obj1, obj2) {
            return obj1.mass - obj2.mass;
        });
        render.drawCells(cellsToDraw, playerConfig, global.toggleMassState, borders, graph);
        render.drawMinimap(global, player, users, graph);

        socket.emit('0', window.canvas.target); // playerSendTarget "Heartbeat".
    }
}

window.addEventListener('resize', resize);

function resize() {
    if (!socket) return;

    player.screenWidth = c.width = global.screen.width = global.playerType == 'player' ? window.innerWidth : global.game.width;
    player.screenHeight = c.height = global.screen.height = global.playerType == 'player' ? window.innerHeight : global.game.height;

    if (global.playerType == 'spectator') {
        player.x = global.game.width / 2;
        player.y = global.game.height / 2;
    }

    socket.emit('windowResized', { screenWidth: global.screen.width, screenHeight: global.screen.height });
}
