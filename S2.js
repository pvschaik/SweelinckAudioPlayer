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

document.addEventListener("keydown", function(event) {

    if (event.ctrlKey && event.key == "1") {
        event.preventDefault();
        changePlaybackSpeed(0.01);
    }

    if (event.ctrlKey && event.key == "2") {
        event.preventDefault();
        changePlaybackSpeed(0.10);
    }

    if (event.ctrlKey && event.key == "3") {
        event.preventDefault();
        changePlaybackSpeed(-0.01);
    }

    if (event.ctrlKey && event.key == "4") {
        event.preventDefault();
        changePlaybackSpeed(-0.10);
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
	document.getElementById("mediaPlayer").play();
}

function pauseMedium() {
	document.getElementById("mediaPlayer").pause();
}

// (Shortcut-label show/hide is now done in CSS with :hover on desktop only.)

function loadLocalAudio(input) {
	const file = input.files[0];
	if (!file) return;

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
}

function hideHeaderSection() {
	document.getElementById('headerSection').style.display = 'none';
	document.getElementById('concise').style.display = 'none';
	document.getElementById('verbose').style.display = 'inline-block';
}

function showHeaderSection() {
	document.getElementById('headerSection').style.display = 'block';
	document.getElementById('concise').style.display = 'inline-block';
	document.getElementById('verbose').style.display = 'none';
}

function changeVolume(pChange) {
	const mediaPlayer = document.getElementById('mediaPlayer');
	mediaPlayer.volume = Math.min(1.0, Math.max(0.0, mediaPlayer.volume + pChange));
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

// Save about every 2 seconds while playing, and on pause
mediaPlayer.addEventListener("timeupdate", function () {
	const now = Date.now();
	if (now - lastSaveTime > 2000) {
		lastSaveTime = now;
		savePosition();
	}
});
mediaPlayer.addEventListener("pause", savePosition);

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
