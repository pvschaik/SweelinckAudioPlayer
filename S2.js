function changePlaybackSpeed(change) {

    const player = document.getElementById("mediaPlayer");

    // Change speed relative to current speed
    player.playbackRate *= (1 + change);

    // Set minimum and maximum speeds
    player.playbackRate = Math.max(0.25,
        Math.min(2.0, player.playbackRate));

    // Display current speed as a percentage
    document.getElementById("currentSpeed").textContent =
        Math.round(player.playbackRate * 100) + "%";

}

// Ctrl + 1..4 follow the order of the speed buttons on the page:
// Ctrl+1 = -10%, Ctrl+2 = -1%, Ctrl+3 = +1%, Ctrl+4 = +10%
document.addEventListener("keydown", function(event) {

    if (!event.ctrlKey) return;

    const changes = { "1": -0.10, "2": -0.01, "3": 0.01, "4": 0.10 };

    if (event.key in changes) {
        event.preventDefault();
        changePlaybackSpeed(changes[event.key]);
    }
});


function openS() {
	// window.open("https://en.wikipedia.org/wiki/Jan_Pieterszoon_Sweelinck", '_blank');
	window.open("https://www.britannica.com/biography/Jan-Pieterszoon-Sweelinck", '_blank');
}

function showAbout() {
	document.getElementById("aboutTitle").innerText = "Sweelinck audio player";
}

function hideAbout() {
	document.getElementById("aboutTitle").innerText = "Let's continue.";
}

function loadAudio(file) {
	const player = document.getElementById("mediaPlayer");
	if (player._objectURL) {          // free a previously loaded local file
		URL.revokeObjectURL(player._objectURL);
		player._objectURL = null;
	}
	prepareRestore(file);
	player.src = file;
	player.pause();
	player.playbackRate = 1;
	document.getElementById("currentSpeed").textContent = "100%";

	// update current audio label
	document.getElementById("currentAudio").innerText = file;
	updateMediaMetadata(file.split("/").pop());
}

function resetToStart() {
	document.getElementById("mediaPlayer").currentTime = 0;
}

function setCurrentTime() {
	const seconds = document.getElementById("seconds");
	const minutes = document.getElementById("minutes");

	const intervalSeconds = isNumeric(seconds.value) ? parseInt(seconds.value) : 0;
	const intervalMinutes = isNumeric(minutes.value) ? 60 * parseInt(minutes.value) : 0;

	document.getElementById("mediaPlayer").currentTime = intervalMinutes + intervalSeconds;
}

function advance(pInterval) {
	const player = document.getElementById("mediaPlayer");
	player.currentTime = player.currentTime + pInterval;
}

function isNumeric(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

function advanceNumber(pDirection) {
	const seconds = document.getElementById("seconds");
	const minutes = document.getElementById("minutes");

	const intervalSeconds = isNumeric(seconds.value) ? pDirection * parseInt(seconds.value) : 0;
	const intervalMinutes = isNumeric(minutes.value) ? pDirection * 60 * parseInt(minutes.value) : 0;

	const player = document.getElementById("mediaPlayer");
	player.currentTime = player.currentTime + intervalMinutes + intervalSeconds;
}

function playMedium() {
	document.getElementById("mediaPlayer").play().catch(function () {});
}

function pauseMedium() {
	document.getElementById("mediaPlayer").pause();
}

// Play is disabled (greyed out) while playing, Pause while paused.
// The look comes from the button:disabled rule in S2.css.
function updatePlayPauseButtons() {
	const playing = !mediaPlayer.paused && !mediaPlayer.ended;
	document.getElementById("bPlay").disabled = playing;
	document.getElementById("bPause").disabled = !playing;
}

// (Shortcut-label show/hide is now done in CSS with :hover on desktop only.)

function loadLocalAudio(input) {
	const file = input.files[0];
	if (!file) return;
	loadFile(file, true);     // true: remember it for the next start
}

// Load a File object into the player (also used for the remembered file at start-up)
function loadFile(file, remember) {
	const url = URL.createObjectURL(file);
	const player = document.getElementById("mediaPlayer");

	// Revoke any previous object URL to free memory
	if (player._objectURL) {
		URL.revokeObjectURL(player._objectURL);
	}

	player._objectURL = url;
	prepareRestore(file.name + "|" + file.size);
	player.src = url;
	player.load();

	// update current audio label
	document.getElementById("currentAudio").innerText = file.name;
	updateMediaMetadata(file.name);

	player.playbackRate = 1;
	document.getElementById("currentSpeed").textContent = "100%";

	if (remember) saveLastAudio(file);
}

function hideHeaderSection() {
	document.getElementById('headerSection').style.display = 'none';
	document.getElementById('concise').style.display = 'none';
	// document.getElementById('verbose').style.display = 'inline-block';
	document.getElementById('verbose').style.display = 'flex';

}

function showHeaderSection() {
	document.getElementById('headerSection').style.display = 'block';
	// document.getElementById('concise').style.display = 'inline-block';
	document.getElementById('concise').style.display = 'flex';
	document.getElementById('verbose').style.display = 'none';
}

// Show the volume as a percentage (also follows changes made by the browser or OS)
function updateVolumeDisplay() {
	document.getElementById("currentVolume").textContent =
		Math.round(document.getElementById("mediaPlayer").volume * 100) + "%";
}

function changeVolume(pChange) {
	const mediaPlayer = document.getElementById('mediaPlayer');
	mediaPlayer.volume = Math.min(1.0, Math.max(0.0, mediaPlayer.volume + pChange));
}


// ---- Start-up: reload the most recently loaded sound file ----
// A local file cannot be re-opened from its path in a browser, so a copy is kept
// in IndexedDB (private to this app, on this device).
const DEFAULT_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
const DB_NAME = "S-audio-player";
const STORE_NAME = "lastAudio";
let startupRestore = false;   // true while the remembered file is being loaded

function openDb() {
	return new Promise(function (resolve, reject) {
		if (!window.indexedDB) { reject(new Error("IndexedDB unavailable")); return; }
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = function () { request.result.createObjectStore(STORE_NAME); };
		request.onsuccess = function () { resolve(request.result); };
		request.onerror = function () { reject(request.error); };
	});
}

function withStore(mode, action) {
	return openDb().then(function (db) {
		return new Promise(function (resolve, reject) {
			const tx = db.transaction(STORE_NAME, mode);
			const request = action(tx.objectStore(STORE_NAME));
			tx.oncomplete = function () { db.close(); resolve(request.result); };
			tx.onerror = tx.onabort = function () { db.close(); reject(tx.error); };
		});
	});
}

function saveLastAudio(file) {
	withStore("readwrite", function (store) {
		return store.put({ name: file.name, size: file.size, blob: file }, "last");
	}).then(function () {
		// ask the browser not to evict it (it may ignore this)
		if (navigator.storage && navigator.storage.persist) {
			navigator.storage.persist().catch(function () {});
		}
	}).catch(function () {
		clearLastAudio();   // could not store (e.g. too big): do not leave an older file behind
	});
}

function clearLastAudio() {
	withStore("readwrite", function (store) { return store.delete("last"); }).catch(function () {});
}

function startApp() {
	updatePlayPauseButtons();

	withStore("readonly", function (store) { return store.get("last"); })
		.then(function (record) {
			if (record && record.blob && record.blob.size > 0) {
				startupRestore = true;
				loadFile(new File([record.blob], record.name, { type: record.blob.type }), false);
			} else {
				loadAudio(DEFAULT_AUDIO);
			}
		})
		.catch(function () { loadAudio(DEFAULT_AUDIO); });
}


// ---- Remembered playback position ----
let pendingKey = null;   // key of the medium being loaded
let currentKey = null;   // key of the medium whose position is being saved
let lastSaveTime = 0;

function savePosition() {
	if (!currentKey) return;
	const player = document.getElementById("mediaPlayer");
	try {
		localStorage.setItem("pos:" + currentKey, player.currentTime);
	} catch (e) { /* storage unavailable: ignore */ }
}

function prepareRestore(key) {
	savePosition();        // save the old medium's position first
	currentKey = null;     // pause saving until the new medium has loaded
	pendingKey = key;
}

const mediaPlayer = document.getElementById("mediaPlayer");

mediaPlayer.addEventListener("loadedmetadata", function () {
	if (!pendingKey) return;
	let saved = 0;
	try {
		saved = parseFloat(localStorage.getItem("pos:" + pendingKey));
	} catch (e) {}
	// Restore only if valid and not within 5 s of the end
	if (isFinite(saved) && saved > 0 && saved < mediaPlayer.duration - 5) {
		mediaPlayer.currentTime = saved;
	}
	currentKey = pendingKey;
	pendingKey = null;
});

// If the remembered file cannot be played, forget it and use the standard sound file
mediaPlayer.addEventListener("loadedmetadata", function () { startupRestore = false; });
mediaPlayer.addEventListener("error", function () {
	if (!startupRestore) return;
	startupRestore = false;
	clearLastAudio();
	loadAudio(DEFAULT_AUDIO);
});

// Save about every 2 seconds while playing, and on pause
mediaPlayer.addEventListener("timeupdate", function () {
	const now = Date.now();
	if (now - lastSaveTime > 2000) {
		lastSaveTime = now;
		savePosition();
	}
});
mediaPlayer.addEventListener("pause", savePosition);

// Keep the Play/Pause buttons in step with the player (also for the player's own
// controls, the lock screen and Media Session)
["play", "playing", "pause", "ended", "emptied"].forEach(function (name) {
	mediaPlayer.addEventListener(name, updatePlayPauseButtons);
});

// Finished: forget the position so it starts from 0 next time
mediaPlayer.addEventListener("ended", function () {
	if (!currentKey) return;
	try { localStorage.removeItem("pos:" + currentKey); } catch (e) {}
});

// Save when the tab is closed or reloaded, and when it goes to the background
// (mobile browsers often kill background tabs without firing pagehide)
window.addEventListener("pagehide", savePosition);
document.addEventListener("visibilitychange", function () {
	if (document.visibilityState === "hidden") savePosition();
});


// ---- Mobile support ----

// iOS ignores audio.volume (read-only, always 1): hide the volume buttons there.
(function hideVolumeOnIOS() {
	const old = mediaPlayer.volume;
	mediaPlayer.volume = 0.5;
	if (mediaPlayer.volume !== 0.5) {
		const group = document.getElementById("volumeGroup");
		if (group) group.style.display = "none";
	}
	mediaPlayer.volume = old;
})();

mediaPlayer.addEventListener("volumechange", updateVolumeDisplay);
updateVolumeDisplay();

// Keep pitch natural at non-1x speeds (older Safari needs the prefixed property)
mediaPlayer.preservesPitch = true;
mediaPlayer.webkitPreservesPitch = true;

// Media Session: lock-screen / notification controls (Android Chrome, Safari 15+)
function updateMediaMetadata(title) {
	if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
	navigator.mediaSession.metadata = new MediaMetadata({
		title: title,
		artist: "Sweelinck audio player"
	});
}

if ("mediaSession" in navigator) {
	const handlers = {
		play:         () => playMedium(),
		pause:        () => pauseMedium(),
		seekbackward: (d) => advance(-((d && d.seekOffset) || 10)),
		seekforward:  (d) => advance((d && d.seekOffset) || 10),
		seekto:       (d) => { if (d && d.seekTime != null) mediaPlayer.currentTime = d.seekTime; }
	};
	for (const action in handlers) {
		try { navigator.mediaSession.setActionHandler(action, handlers[action]); } catch (e) {}
	}
}


// ---- Offline support (service worker; requires HTTPS) ----
if ("serviceWorker" in navigator) {
	window.addEventListener("load", function () {
		navigator.serviceWorker.register("sw.js").catch(function () { /* ignore */ });
	});
}
