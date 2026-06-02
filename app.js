/**
 * 微光文字雲 - Core Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const textInput = document.getElementById('text-input');
  const btnExample = document.getElementById('btn-example');
  const btnClear = document.getElementById('btn-clear');
  const btnGenerate = document.getElementById('btn-generate');
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

  // --- Example Text ---
  const exampleText = `人工智慧（AI）正在深刻改變我們的世界。從自動駕駛汽車到醫療診斷，從智慧家居到創意寫作，AI 的應用已經滲透到各行各業。教育領域也正在迎來一場革命。AI 賦能的個人化學習系統，能夠根據每個學生的進度、興趣和理解能力，提供客製化的學習資源與輔導，實現真正的因材施教。

然而，隨著 AI 技術的飛速發展，我們也面臨著焦慮與挑戰。教師開始擔心自己是否會被 AI 替代？學生是否會過度依賴智慧工具而失去獨立思考能力？面對這些焦慮，我們需要認識到，AI 的定位是「教學助手」與「思維放大器」，而不是替代者。教師的溫度、同理心、引導思維以及人文關懷，是任何人工智慧都無法取代的核心價值。

未來的教育將會是人機協同的教育。教師學會善用 AI，將日常重複性的評分、備課工作交給智慧工具，釋放出更多時間來關注學生的身心健康，引導學生進行深度學習、批判性思考與團隊合作。我們應該主動從焦慮走向賦能，將技術轉化為提升教學效率與學習品質的強大引擎，攜手開創智慧教育的新典範。`;

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

  // --- Event Listeners ---
  btnExample.addEventListener('click', () => {
    textInput.value = exampleText;
  });

  btnClear.addEventListener('click', () => {
    textInput.value = '';
    emptyState.classList.remove('hidden');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  btnGenerate.addEventListener('click', generateWordCloud);
  btnDownload.addEventListener('click', downloadCanvas);

  // --- Core Word Cloud Generator ---
  async function generateWordCloud() {
    const text = textInput.value.trim();
    if (!text) {
      alert('請先輸入或貼上文字內容！');
      return;
    }

    // Show loading
    loadingOverlay.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Run processing asynchronously to avoid blocking UI thread
    setTimeout(() => {
      try {
        const words = processText(text);
        if (words.length === 0) {
          alert('未能從文本中提取到足夠的字詞，請更換內容後再試一次！');
          loadingOverlay.classList.add('hidden');
          emptyState.classList.remove('hidden');
          return;
        }

        drawCloud(words);
      } catch (error) {
        console.error(error);
        alert('生成文字雲時出錯：' + error.message);
      } finally {
        loadingOverlay.classList.add('hidden');
      }
    }, 100);
  }

  // --- Natural Language Parsing & Frequency Analysis ---
  function processText(text) {
    const filterStopwords = filterStopwordsCheck.checked;
    
    // Simple multilingual tokenizer (matches words/ideograms)
    // Chinese characters: \u4e00-\u9fa5
    // English words: [a-zA-Z]+
    const regex = /[\u4e00-\u9fa5]{2,4}|[a-zA-Z]+/g;
    
    const matches = text.match(regex) || [];
    const freqMap = {};

    matches.forEach(token => {
      let word = token.trim();
      
      // If English, convert to lowercase
      if (/^[a-zA-Z]+$/.test(word)) {
        word = word.toLowerCase();
      }

      // Filter stop words and short symbols
      if (word.length < 2) return;
      if (filterStopwords && stopWords.has(word)) return;

      freqMap[word] = (freqMap[word] || 0) + 1;
    });

    // Convert to sorted array
    const sortedWords = Object.keys(freqMap).map(word => ({
      text: word,
      weight: freqMap[word]
    })).sort((a, b) => b.weight - a.weight);

    // Limit size
    const limit = parseInt(maxWordsInput.value, 10) || 70;
    return sortedWords.slice(0, limit);
  }

  // --- Layout Spiraling & Bounding Box Collision Checking ---
  function drawCloud(words) {
    const palette = palettes[colorPaletteSelect.value] || palettes.cyberpunk;
    const fontFamily = fontFamilySelect.value;
    const orientation = wordOrientationSelect.value;
    
    const width = canvas.width;
    const height = canvas.height;
    const center = { x: width / 2, y: height / 2 };
    
    const placedWords = [];

    // Scale mapping values
    const maxWeight = words[0].weight;
    const minWeight = words[words.length - 1].weight;
    
    const maxFontSize = 75;
    const minFontSize = 14;

    words.forEach((word, index) => {
      // Determine font size linearly based on weight
      let fontSize = minFontSize;
      if (maxWeight !== minWeight) {
        fontSize = minFontSize + ((word.weight - minWeight) / (maxWeight - minWeight)) * (maxFontSize - minFontSize);
      }
      
      // Select randomized orientation based on mode
      let rotate = 0; // 0 = Horizontal, Math.PI / 2 = Vertical
      if (orientation === 'vertical') {
        rotate = Math.PI / 2;
      } else if (orientation === 'mixed') {
        rotate = Math.random() > 0.65 ? Math.PI / 2 : 0;
      }

      ctx.font = `bold ${Math.round(fontSize)}px ${fontFamily}`;
      const textMetrics = ctx.measureText(word.text);
      
      // Simple bounding box calculations
      const wordWidth = rotate === 0 ? textMetrics.width + 10 : fontSize + 10;
      const wordHeight = rotate === 0 ? fontSize + 10 : textMetrics.width + 10;

      // Archimedean Spiral parameters
      let theta = 0;
      let radius = 0;
      const step = 0.15; // Angular step
      const spacing = 4.5; // Spiral spacing
      
      let x = center.x;
      let y = center.y;
      let collision = true;
      let attempts = 0;
      const maxAttempts = 1500;

      while (collision && attempts < maxAttempts) {
        attempts++;
        
        // Calculate spiral coordinates
        radius = spacing * theta;
        x = center.x + radius * Math.cos(theta) - wordWidth / 2;
        y = center.y + radius * Math.sin(theta) - wordHeight / 2;

        // Check if out of canvas bounds
        if (x < 10 || x + wordWidth > width - 10 || y < 10 || y + wordHeight > height - 10) {
          theta += step;
          continue;
        }

        // Bounding box collision checking
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
        // Safe place found! Store position
        placedWords.push({
          x: x,
          y: y,
          width: wordWidth,
          height: wordHeight
        });

        // Pick color from palette
        const colorToken = palette[index % palette.length];
        // Add subtle variation to lightness & saturation
        const h = colorToken.h;
        const s = Math.min(100, Math.max(30, colorToken.s + Math.floor(Math.random() * 20) - 10));
        const l = Math.min(90, Math.max(40, colorToken.l + Math.floor(Math.random() * 20) - 10));
        
        ctx.save();
        // Translate to the middle of the word bounding box for rotation
        ctx.translate(x + wordWidth / 2, y + wordHeight / 2);
        ctx.rotate(rotate);
        
        ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Set glow shadow for top words
        if (index < 5) {
          ctx.shadowColor = `hsla(${h}, ${s}%, ${l}%, 0.45)`;
          ctx.shadowBlur = 10;
        }
        
        ctx.fillText(word.text, 0, 0);
        ctx.restore();
      }
    });
  }

  // --- PNG Exporter ---
  function downloadCanvas() {
    if (emptyState.classList.contains('hidden') === false) {
      alert('請先產生文字雲再下載！');
      return;
    }
    
    // Create link and download
    const link = document.createElement('a');
    link.download = `microcloud-wordcloud-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
});
