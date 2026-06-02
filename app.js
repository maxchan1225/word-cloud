import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = {
  projectId: "teachingtest-49f7a",
  appId: "1:354918792935:web:2e74c8744f3bf7c544ec42",
  storageBucket: "teachingtest-49f7a.firebasestorage.app",
  apiKey: "AIzaSyBElQCJTn7DREGG9e_fw8J0RneEqxjHS1o",
  authDomain: "teachingtest-49f7a.firebaseapp.com",
  messagingSenderId: "354918792935"
};

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const textInput = document.getElementById('text-input');
  const btnSubmit = document.getElementById('btn-submit');
  const btnDownload = document.getElementById('btn-download');
  const colorPaletteSelect = document.getElementById('color-palette');
  const fontFamilySelect = document.getElementById('font-family');
  const maxWordsInput = document.getElementById('max-words');
  const wordOrientationSelect = document.getElementById('word-orientation');
  const filterStopwordsCheck = document.getElementById('filter-stopwords');
  
  const canvas = document.getElementById('wordcloud-canvas');
  const ctx = canvas.getContext('2d');
  
  const loadingOverlay = document.getElementById('loading-overlay');
  const emptyState = document.getElementById('empty-state');
  
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const totalCountText = document.getElementById('total-count-text');
  const recentList = document.getElementById('recent-list');

  // Memory cache of submissions
  let allSubmissions = [];

  // --- HSL Color Palettes ---
  const palettes = {
    cyberpunk: [
      { h: 290, s: 95, l: 60 }, // Hot pink
      { h: 195, s: 90, l: 55 }, // Cyan
      { h: 320, s: 90, l: 50 }, // Purple-pink
      { h: 260, s: 85, l: 60 }, // Electric indigo
      { h: 160, s: 90, l: 50 }  // Neon green
    ],
    sunset: [
      { h: 15, s: 90, l: 55 },  // Coral orange
      { h: 350, s: 80, l: 50 }, // Warm red
      { h: 42, s: 95, l: 55 },  // Sunset yellow
      { h: 320, s: 70, l: 45 }, // Crimson purple
      { h: 25, s: 85, l: 50 }   // Tangerine
    ],
    ocean: [
      { h: 200, s: 90, l: 50 }, // Sea blue
      { h: 180, s: 85, l: 45 }, // Turquoise
      { h: 220, s: 80, l: 55 }, // Royal blue
      { h: 160, s: 75, l: 50 }, // Deep mint
      { h: 205, s: 95, l: 60 }  // Sky blue
    ],
    forest: [
      { h: 120, s: 60, l: 45 }, // Moss green
      { h: 145, s: 70, l: 50 }, // Emerald green
      { h: 80, s: 65, l: 48 },  // Lime green
      { h: 40, s: 50, l: 45 },  // Wood brown
      { h: 160, s: 55, l: 40 }  // Pine teal
    ],
    minimalist: [
      { h: 210, s: 15, l: 85 }, // Light gray
      { h: 220, s: 20, l: 65 }, // Cool slate
      { h: 200, s: 10, l: 45 }, // Muted charcoal
      { h: 215, s: 30, l: 75 }, // Silver blue
      { h: 38, s: 40, l: 70 }   // Sand beige
    ]
  };

  // --- Stopwords ---
  const stopWords = new Set([
    '的', '了', '在', '是', '我', '你', '他', '她', '它', '我們', '你們', '他們',
    '這', '那', '有', '無', '和', '與', '或', '及', '等', '之', '而', '但', '因',
    '為', '以', '於', '由', '向', '往', '對', '給', '被', '讓', '把', '個', '隻',
    '個', '張', '條', '件', '本', '所', '並', '更', '很', '最', '非常', '已經',
    '也', '都', '就', '又', '再', '才', '還', '只', '能', '會', '要', '想', '去',
    '來', '到', '上', '下', '前', '後', '裡', '外', '中', '間', '自己', '大家',
    '什麼', '怎麼', '這樣', '那樣', '一個', '一些', '許多', '目前', '進行', '開始',
    'the', 'and', 'a', 'of', 'in', 'to', 'for', 'is', 'on', 'that', 'by', 'this',
    'with', 'i', 'you', 'it', 'he', 'she', 'they', 'we', 'us', 'them', 'my', 'your',
    'his', 'her', 'their', 'our', 'are', 'was', 'were', 'be', 'been', 'has', 'have',
    'had', 'do', 'does', 'did', 'but', 'or', 'so', 'if', 'as', 'at', 'an', 'not'
  ]);

  // --- Initialize Realtime Firestore Listener ---
  const colRef = collection(db, "submissions");
  const q = query(colRef, orderBy("timestamp", "desc"), limit(200));

  onSnapshot(q, (snapshot) => {
    allSubmissions = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      allSubmissions.push({
        id: doc.id,
        text: data.text || "",
        timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
      });
    });

    // Update Connection & Counter Status
    statusDot.className = "pulse-dot green";
    statusText.innerText = "連線正常 (即時同步中)";
    totalCountText.innerText = `累計收集：${allSubmissions.length} 筆資料`;

    // Process and render Word Cloud
    updateWordCloudDisplay();
    // Update Recent Submissions List
    updateRecentListDisplay();
  }, (error) => {
    console.error("Firestore error:", error);
    statusDot.className = "pulse-dot red";
    statusText.innerText = "連線失敗";
  });

  // --- Submit Text to Firestore ---
  btnSubmit.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) {
      alert("請輸入一些文字後再提交！");
      return;
    }

    try {
      btnSubmit.disabled = true;
      btnSubmit.innerText = "正在提交...";
      
      await addDoc(colRef, {
        text: text,
        timestamp: serverTimestamp()
      });

      textInput.value = "";
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("提交失敗，請檢查網路連線。");
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span class="btn-icon">🚀</span> 提交到全域文字雲`;
    }
  });

  // --- Redraw on Design Settings Change ---
  [colorPaletteSelect, fontFamilySelect, maxWordsInput, wordOrientationSelect, filterStopwordsCheck].forEach(el => {
    el.addEventListener('change', updateWordCloudDisplay);
  });

  // --- PNG Download Handler ---
  btnDownload.addEventListener('click', downloadCanvas);

  // --- Render Orchestrator ---
  function updateWordCloudDisplay() {
    if (allSubmissions.length === 0) {
      emptyState.classList.remove('hidden');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    loadingOverlay.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Run layout asynchronously to keep interface responsive
    setTimeout(() => {
      try {
        // Aggregate all submissions into one text block
        const combinedText = allSubmissions.map(s => s.text).join(" ");
        const words = processText(combinedText);
        
        if (words.length === 0) {
          emptyState.classList.remove('hidden');
        } else {
          drawCloud(words);
        }
      } catch (error) {
        console.error("Error generating word cloud: ", error);
      } finally {
        loadingOverlay.classList.add('hidden');
      }
    }, 50);
  }

  // --- Recent Submissions Render ---
  function updateRecentListDisplay() {
    recentList.innerHTML = "";
    
    if (allSubmissions.length === 0) {
      recentList.innerHTML = `<div class="recent-item-empty">尚無資料，快來輸入第一筆吧！</div>`;
      return;
    }

    // Display the 8 most recent submissions
    const recentItems = allSubmissions.slice(0, 8);
    recentItems.forEach(item => {
      const itemEl = document.createElement("div");
      itemEl.className = "recent-item";

      const timeString = formatTimeAgo(item.timestamp);
      
      itemEl.innerHTML = `
        <div class="recent-item-text">${escapeHTML(item.text)}</div>
        <div class="recent-item-meta">
          <span>匿名使用者</span>
          <span>${timeString}</span>
        </div>
      `;
      recentList.appendChild(itemEl);
    });
  }

  // --- Natural Language Tokenizer ---
  function processText(text) {
    const filterStopwords = filterStopwordsCheck.checked;
    
    // Tokenizes Chinese phrases (2-4 characters) and English words
    const regex = /[\u4e00-\u9fa5]{2,4}|[a-zA-Z]+/g;
    const matches = text.match(regex) || [];
    const freqMap = {};

    matches.forEach(token => {
      let word = token.trim();
      
      // Normalize English words
      if (/^[a-zA-Z]+$/.test(word)) {
        word = word.toLowerCase();
      }

      if (word.length < 2) return;
      if (filterStopwords && stopWords.has(word)) return;

      freqMap[word] = (freqMap[word] || 0) + 1;
    });

    const sortedWords = Object.keys(freqMap).map(word => ({
      text: word,
      weight: freqMap[word]
    })).sort((a, b) => b.weight - a.weight);

    const limitCount = parseInt(maxWordsInput.value, 10) || 70;
    return sortedWords.slice(0, limitCount);
  }

  // --- Layout Archimedean Spiral & Collision Engine ---
  function drawCloud(words) {
    const palette = palettes[colorPaletteSelect.value] || palettes.cyberpunk;
    const fontFamily = fontFamilySelect.value;
    const orientation = wordOrientationSelect.value;
    
    const width = canvas.width;
    const height = canvas.height;
    const center = { x: width / 2, y: height / 2 };
    
    const placedWords = [];

    const maxWeight = words[0].weight;
    const minWeight = words[words.length - 1].weight;
    
    const maxFontSize = 68;
    const minFontSize = 13;

    words.forEach((word, index) => {
      let fontSize = minFontSize;
      if (maxWeight !== minWeight) {
        fontSize = minFontSize + ((word.weight - minWeight) / (maxWeight - minWeight)) * (maxFontSize - minFontSize);
      }
      
      let rotate = 0;
      if (orientation === 'vertical') {
        rotate = Math.PI / 2;
      } else if (orientation === 'mixed') {
        rotate = Math.random() > 0.65 ? Math.PI / 2 : 0;
      }

      ctx.font = `bold ${Math.round(fontSize)}px ${fontFamily}`;
      const textMetrics = ctx.measureText(word.text);
      
      const wordWidth = rotate === 0 ? textMetrics.width + 10 : fontSize + 10;
      const wordHeight = rotate === 0 ? fontSize + 10 : textMetrics.width + 10;

      let theta = 0;
      let radius = 0;
      const step = 0.15;
      const spacing = 4.0;
      
      let x = center.x;
      let y = center.y;
      let collision = true;
      let attempts = 0;
      const maxAttempts = 1800;

      while (collision && attempts < maxAttempts) {
        attempts++;
        radius = spacing * theta;
        x = center.x + radius * Math.cos(theta) - wordWidth / 2;
        y = center.y + radius * Math.sin(theta) - wordHeight / 2;

        if (x < 10 || x + wordWidth > width - 10 || y < 10 || y + wordHeight > height - 10) {
          theta += step;
          continue;
        }

        collision = false;
        for (let i = 0; i < placedWords.length; i++) {
          const other = placedWords[i];
          if (!(x + wordWidth < other.x || 
                x > other.x + other.width || 
                y + wordHeight < other.y || 
                y > other.y + other.height)) {
            collision = true;
            break;
          }
        }

        theta += step;
      }

      if (!collision) {
        placedWords.push({
          x: x,
          y: y,
          width: wordWidth,
          height: wordHeight
        });

        const colorToken = palette[index % palette.length];
        const h = colorToken.h;
        const s = Math.min(100, Math.max(30, colorToken.s + Math.floor(Math.random() * 20) - 10));
        const l = Math.min(90, Math.max(40, colorToken.l + Math.floor(Math.random() * 20) - 10));
        
        ctx.save();
        ctx.translate(x + wordWidth / 2, y + wordHeight / 2);
        ctx.rotate(rotate);
        
        ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (index < 6) {
          ctx.shadowColor = `hsla(${h}, ${s}%, ${l}%, 0.5)`;
          ctx.shadowBlur = 12;
        }
        
        ctx.fillText(word.text, 0, 0);
        ctx.restore();
      }
    });
  }

  // --- Helper Functions ---
  function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 5) return "剛剛";
    if (seconds < 60) return `${seconds} 秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分鐘前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小時前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  function downloadCanvas() {
    if (allSubmissions.length === 0) {
      alert("尚無資料庫內容，無法下載文字雲！");
      return;
    }
    const link = document.createElement('a');
    link.download = `live-wordcloud-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
});
