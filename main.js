(function () {
  'use strict';

  const SYSTEM_CONFIG = {
    startDate: '2026-06-15T12:00:00'
  };

  const APP_START_TIME = Date.now();

  function getSystemTime() {
    if (!SYSTEM_CONFIG.startDate) {
      return new Date();
    }
    const startOffset = new Date(SYSTEM_CONFIG.startDate).getTime();
    const elapsed = Date.now() - APP_START_TIME;
    return new Date(startOffset + elapsed);
  }

  const CAMERAS = [
    { id: 'CAM-01', label: 'MAIN ENTRANCE', video: 'videos/cam01.mp4', events: [{ id: 'event1', src: 'videos/cam01_event1.mp4' }] },
    { id: 'CAM-02', label: 'LOADING DOCK', video: 'videos/cam02.mp4', },
    { id: 'CAM-03', label: 'STAGE A', video: 'videos/cam03.mp4' },
    { id: 'CAM-04', label: 'STAGE B', video: 'videos/cam04.mp4' },
    { id: 'CAM-05', label: 'GREEN ROOM', video: 'videos/cam05.mp4' },
    { id: 'CAM-06', label: 'WARDROBE', video: 'videos/cam06.mp4' },
    { id: 'CAM-07', label: 'MAKEUP', video: 'videos/cam07.mp4' },
    { id: 'CAM-08', label: 'CRAFT SERVICES', video: 'videos/cam08.mp4' },
    { id: 'CAM-09', label: 'PARKING LOT A', video: 'videos/cam09.mp4' },
    { id: 'CAM-10', label: 'PARKING LOT B', video: 'videos/cam10.mp4' },
    { id: 'CAM-11', label: 'BACK ALLEY', video: 'videos/cam11.mp4' },
    { id: 'CAM-12', label: 'CONTROL ROOM', video: 'videos/cam12.mp4' }
  ];

  const LOG_MESSAGES = [
    '[SYS] Initializing surveillance network...',
    '[NET] Connection established: 192.168.1.100',
    '[CAM-01] Motion detected in sector A',
    '[AUTH] User admin@filmset.local authenticated',
    '[SYS] Storage buffer: 78% utilized',
    '[CAM-05] Low light mode activated',
    '[NET] Packet loss: 0.02%',
    '[REC] Recording buffer flushed to disk',
    '[CAM-09] PTZ calibration complete',
    '[SYS] Temperature: 42°C - Normal',
    '[NET] Bandwidth: 856 Mbps',
    '[CAM-03] Focus adjustment: +2',
    '[AUTH] Session refresh: token valid',
    '[SYS] Memory allocation: 4.2GB/8GB',
    '[REC] Frame drop detected - compensating',
    '[CAM-12] IR mode: ENABLED',
    '[NET] DNS resolution: 12ms',
    '[SYS] CPU utilization: 34%',
    '[CAM-07] White balance: AUTO',
    '[REC] Encoding: H.264 @ 4000kbps',
    '[SYS] Disk I/O: 125 MB/s',
    '[NET] Latency: 8ms',
    '[CAM-02] Exposure compensation: -0.5',
    '[AUTH] ACL check passed for ZONE-ALPHA',
    '[SYS] NTP sync: drift 0.003s',
    '[REC] Segment written: SEG_20240115_143022.mp4',
    '[CAM-08] Gain: +6dB',
    '[NET] TCP connections: 24 active',
    '[SYS] RAID status: OPTIMAL',
    '[CAM-11] Shutter speed: 1/50'
  ];

  const state = {
    selectedCamera: null,
    cpuUsage: 34,
    memUsage: 62,
    diskUsage: 78,
    logId: 0,
    videoTimestamps: {},
    videoMode: {},
    loopTime: {},
    eventIndex: {}
  };

  const elements = {
    cameraGrid: document.getElementById('camera-grid'),
    expandedView: document.getElementById('expanded-view'),
    expandedCamera: document.getElementById('expanded-camera'),
    expandedSidebar: document.getElementById('expanded-sidebar'),
    backBtn: document.getElementById('back-btn'),
    statusClock: document.getElementById('status-clock'),
    cpuStat: document.getElementById('cpu-stat'),
    memStat: document.getElementById('mem-stat'),
    diskStat: document.getElementById('disk-stat'),
    terminalLogs: document.getElementById('terminal-logs'),
    terminal: document.querySelector('.terminal')
  };

  const videoCache = {};

  function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '.');
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createCameraFeed(camera, index, options = {}) {
    const { isExpanded = false, isActive = false } = options;
    const now = getSystemTime();

    const feed = document.createElement('article');
    feed.className = 'camera-feed' + (isExpanded ? ' expanded' : '') + (isActive ? ' active' : '');
    feed.dataset.index = index;

    feed.innerHTML = `
      <div class="frame${isActive ? ' glow-box-active' : ''}"></div>
      <div class="inner">
        <div class="camera-feed-area">
          <div class="noise-bg screen-noise"></div>
          <div class="no-signal">NO SIGNAL</div>
          <div class="cctv-overlay">
            <div class="corner-bracket corner-tl"></div>
            <div class="corner-bracket corner-tr"></div>
            <div class="corner-bracket corner-bl"></div>
            <div class="corner-bracket corner-br"></div>
            <div class="cctv-cam-id glow">${camera.id}</div>
            <div class="cctv-rec rec-blink">
              <span class="rec-dot"></span>
              <span>REC</span>
            </div>
            <div class="cctv-label">${camera.label}</div>
            <div class="cctv-timestamp" data-camera-timestamp>${formatDate(now)} ${formatTime(now)}</div>
          </div>
        </div>
      </div>
      <div class="scan-overlay"></div>
    `;

    const feedArea = feed.querySelector('.camera-feed-area');
    const video = videoCache[index];
    if (video) {
      feedArea.insertBefore(video, feedArea.firstChild);
      if (!video.paused && !video.ended) {
        feed.classList.add('video-active');
      }
    }

    feed.addEventListener('click', () => handleCameraClick(index));

    return feed;
  }

  function renderGrid() {
    elements.cameraGrid.innerHTML = '';
    CAMERAS.forEach((camera, index) => {
      const feed = createCameraFeed(camera, index);
      elements.cameraGrid.appendChild(feed);
    });
  }

  function renderExpanded() {
    const selectedIndex = state.selectedCamera;
    const camera = CAMERAS[selectedIndex];

    elements.expandedCamera.innerHTML = '';
    const mainFeed = createCameraFeed(camera, selectedIndex, {
      isExpanded: true,
      isActive: true
    });
    elements.expandedCamera.appendChild(mainFeed);

    elements.expandedSidebar.innerHTML = '';
    CAMERAS.forEach((cam, index) => {
      if (index === selectedIndex) return;
      const thumb = createCameraFeed(cam, index);
      elements.expandedSidebar.appendChild(thumb);
    });
  }

  function saveVideoStates() {
    document.querySelectorAll('video').forEach(video => {
      const feed = video.closest('.camera-feed');
      if (feed && feed.dataset.index !== undefined) {
        state.videoTimestamps[feed.dataset.index] = video.currentTime;
      }
    });
  }

  function renderApp() {
    saveVideoStates();

    if (state.selectedCamera === null) {
      elements.cameraGrid.classList.remove('hidden');
      elements.expandedView.classList.add('hidden');
      elements.terminal.classList.add('hidden');
      renderGrid();
    } else {
      elements.cameraGrid.classList.add('hidden');
      elements.expandedView.classList.remove('hidden');
      elements.terminal.classList.remove('hidden');
      renderExpanded();
    }

    updateTime();
  }

  function handleCameraClick(index) {
    if (state.selectedCamera === index) {
      restoreAmbient(index);
      state.selectedCamera = null;
    } else {
      if (state.selectedCamera !== null) {
        restoreAmbient(state.selectedCamera);
      }
      state.selectedCamera = index;
    }
    renderApp();
  }

  function handleBackToGrid() {
    if (state.selectedCamera !== null) {
      restoreAmbient(state.selectedCamera);
    }
    state.selectedCamera = null;
    renderApp();
  }

  function triggerEvent(index) {
    const camera = CAMERAS[index];
    if (!camera.events || camera.events.length === 0) return;
    if (state.videoMode[index] === 'event') return;

    const video = videoCache[index];
    if (!video) return;

    state.loopTime[index] = video.currentTime;

    const eventIdx = state.eventIndex[index] || 0;
    const eventData = camera.events[eventIdx];

    state.eventIndex[index] = (eventIdx + 1) % camera.events.length;

    state.videoMode[index] = 'event';

    video.loop = false;
    video.src = eventData.src;
    video.currentTime = 0;
    video.play().catch(() => restoreAmbient(index));

    video.onended = () => restoreAmbient(index);
    video.onerror = () => restoreAmbient(index);
  }

  function restoreAmbient(index) {
    if (state.videoMode[index] !== 'event') return;

    const camera = CAMERAS[index];
    const video = videoCache[index];
    if (!video) return;

    video.onended = null;
    video.onerror = null;

    state.videoMode[index] = 'loop';

    video.loop = true;
    video.src = camera.video;
    video.currentTime = state.loopTime[index] || 0;
    video.play().catch(() => { });
  }

  function getRandomLog() {
    return LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];
  }

  function getLogClass(message) {
    if (message.includes('[SYS]')) return 'sys';
    if (message.includes('[REC]')) return 'rec';
    return '';
  }

  function addLog(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    const time = formatTime(getSystemTime());
    const msgClass = getLogClass(message);

    entry.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-msg ${msgClass}">${message}</span>
    `;

    elements.terminalLogs.appendChild(entry);

    while (elements.terminalLogs.children.length > 51) {
      elements.terminalLogs.removeChild(elements.terminalLogs.firstChild);
    }

    elements.terminalLogs.scrollTop = elements.terminalLogs.scrollHeight;
  }

  function initLogs() {
    for (let i = 0; i < 10; i++) {
      addLog(getRandomLog());
    }

    const cursor = document.createElement('span');
    cursor.className = 'terminal-cursor cursor-blink';
    elements.terminalLogs.appendChild(cursor);
  }

  function startLogInterval() {
    function addRandomLog() {
      addLog(getRandomLog());
      setTimeout(addRandomLog, randomBetween(200, 700));
    }
    setTimeout(addRandomLog, randomBetween(200, 700));
  }

  function updateClock() {
    const now = getSystemTime();
    elements.statusClock.textContent = `${formatDate(now)} ${formatTime(now)}`;
  }

  function updateStats() {
    state.cpuUsage = Math.min(100, Math.max(20, state.cpuUsage + randomBetween(-5, 5)));
    elements.cpuStat.textContent = Math.round(state.cpuUsage) + '%';

    state.memUsage = Math.min(100, Math.max(40, state.memUsage + randomBetween(-2.5, 2.5)));
    elements.memStat.textContent = Math.round(state.memUsage) + '%';
  }

  function updateTime() {
    const now = getSystemTime();
    elements.statusClock.textContent = `${formatDate(now)} ${formatTime(now)}`;

    document.querySelectorAll('[data-camera-timestamp]').forEach(el => {
      el.textContent = `${formatDate(now)} ${formatTime(now)}`;
    });
  }

  function simulateRecFlicker() {
    const indicators = document.querySelectorAll('.rec-indicator');
    indicators.forEach(indicator => {
      if (Math.random() > 0.95) {
        indicator.style.visibility = 'hidden';
        setTimeout(() => {
          indicator.style.visibility = 'visible';
        }, 100);
      }
    });
  }

  function startLiveUpdates() {
    setInterval(() => {
      updateTime();
      updateStats();
    }, 1000);

    setInterval(simulateRecFlicker, 500);
  }

  function initVideoCache() {
    CAMERAS.forEach((camera, index) => {
      const video = document.createElement('video');
      video.className = 'camera-video';
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;

      const source1 = document.createElement('source');
      source1.src = camera.video;
      source1.type = 'video/mp4';
      video.appendChild(source1);

      const source2 = document.createElement('source');
      source2.src = 'test_video.mp4';
      source2.type = 'video/mp4';
      video.appendChild(source2);

      video.addEventListener('playing', () => {
        const feed = video.closest('.camera-feed');
        if (feed) feed.classList.add('video-active');
      });

      videoCache[index] = video;
    });
  }

  function init() {
    initVideoCache();
    renderApp();
    elements.backBtn.addEventListener('click', handleBackToGrid);
    initLogs();
    startLogInterval();
    updateClock();
    startLiveUpdates();

    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;

      const key = e.key;

      const keyMap = {
        '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
        '6': 5, '7': 6, '8': 7, '9': 8, '0': 9,
        '-': 10, '=': 11
      };

      if (key in keyMap) {
        const index = keyMap[key];
        if (state.selectedCamera !== null) {
          restoreAmbient(state.selectedCamera);
        }
        state.selectedCamera = index;
        renderApp();
        return;
      }

      if (key === 'g' || key === 'G') {
        if (state.selectedCamera !== null) {
          restoreAmbient(state.selectedCamera);
        }
        state.selectedCamera = null;
        renderApp();
        return;
      }

      if ((key === 'e' || key === 'E') && state.selectedCamera !== null) {
        triggerEvent(state.selectedCamera);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
