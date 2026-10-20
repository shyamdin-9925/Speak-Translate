// --- DOM ELEMENTS ---
const textInput = document.getElementById('text-input');
const transMode = document.getElementById('trans-mode');
const translateBtn = document.getElementById('translate-btn');
const speakBtn = document.getElementById('speak-btn');
const voiceSelect = document.getElementById('voice-select');
const rateInput = document.getElementById('rate');
const pitchInput = document.getElementById('pitch');
const micBtn = document.getElementById('mic-btn');
const copyBtn = document.getElementById('copy-btn');
const downloadBtn = document.getElementById('download-txt-btn');
const themeToggle = document.getElementById('theme-toggle');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');

const synth = window.speechSynthesis;
let voices = [];

// --- 1. VOICE LOADING ---
function populateVoices() {
    voices = synth.getVoices();
    voiceSelect.innerHTML = '';
    
    voices.forEach((voice) => {
        if(voice.lang.includes('en') || voice.lang.includes('hi') || voice.lang.includes('mr')) {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.setAttribute('data-lang', voice.lang);
            option.setAttribute('data-name', voice.name);
            voiceSelect.appendChild(option);
        }
    });

    if(voiceSelect.innerHTML === '') {
        voiceSelect.innerHTML = '<option>No compatible voices found</option>';
    }
}
populateVoices();
if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = populateVoices;

// --- 2. DARK MODE ---
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

// --- 3. MICROPHONE (Speech to Text) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if(SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop after one sentence
    
    micBtn.addEventListener('click', () => {
        // Detect language based on dropdown source
        let mode = transMode.value.split('|')[0]; // 'en', 'hi', or 'mr'
        recognition.lang = mode === 'en' ? 'en-US' : (mode === 'hi' ? 'hi-IN' : 'mr-IN');
        
        recognition.start();
        micBtn.classList.add('recording');
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        textInput.value = transcript;
        micBtn.classList.remove('recording');
    };

    recognition.onerror = () => micBtn.classList.remove('recording');
    recognition.onend = () => micBtn.classList.remove('recording');
} else {
    micBtn.style.display = 'none'; // Hide if browser doesn't support
    console.log("Speech Recognition not supported");
}

// --- 4. COPY TEXT ---
copyBtn.addEventListener('click', () => {
    if(textInput.value) {
        navigator.clipboard.writeText(textInput.value);
        alert("Copied to clipboard!");
    }
});

// --- 5. DOWNLOAD TEXT ---
downloadBtn.addEventListener('click', () => {
    if(!textInput.value) return;
    const blob = new Blob([textInput.value], { type: 'text/plain' });
    const anchor = document.createElement('a');
    anchor.download = 'translation.txt';
    anchor.href = window.URL.createObjectURL(blob);
    anchor.click();
});

// --- 6. HISTORY SYSTEM ---
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('ttsHistory')) || [];
    historyList.innerHTML = '';
    if(history.length === 0) {
        historyList.innerHTML = '<li class="empty-msg">No history yet...</li>';
        return;
    }
    history.forEach(text => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.textContent = text;
        li.addEventListener('click', () => textInput.value = text); // Click to load
        historyList.appendChild(li);
    });
}
function addToHistory(text) {
    let history = JSON.parse(localStorage.getItem('ttsHistory')) || [];
    if(history.includes(text)) return; // Don't add duplicates
    history.unshift(text); // Add to top
    if(history.length > 5) history.pop(); // Keep only last 5
    localStorage.setItem('ttsHistory', JSON.stringify(history));
    loadHistory();
}
clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('ttsHistory');
    loadHistory();
});
loadHistory(); // Load on start

// --- 7. TRANSLATION ---
translateBtn.addEventListener('click', () => {
    let text = textInput.value;
    let mode = transMode.value;
    if (!text) return alert("Enter text!");

    translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    translateBtn.disabled = true;

    let [source, target] = mode.split('|');
    let apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;

    fetch(apiUrl).then(res => res.json()).then(data => {
        if(data && data[0] && data[0][0]) {
            textInput.value = data[0][0][0];
            addToHistory(data[0][0][0]); // Add translated text to history
            autoSelectVoice(target);
        }
        translateBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Translate';
        translateBtn.disabled = false;
    }).catch(() => {
        alert("Translation Failed");
        translateBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Translate';
        translateBtn.disabled = false;
    });
});

// --- 8. SPEAK ---
function autoSelectVoice(lang) {
    for(let i=0; i<voiceSelect.options.length; i++) {
        if(voiceSelect.options[i].getAttribute('data-lang').includes(lang)) {
            voiceSelect.selectedIndex = i;
            break;
        }
    }
}
// Update Sliders UI
rateInput.addEventListener('input', () => document.getElementById('rate-value').textContent = rateInput.value + 'x');
pitchInput.addEventListener('input', () => document.getElementById('pitch-value').textContent = pitchInput.value + 'x');

speakBtn.addEventListener('click', () => {
    if(synth.speaking) { synth.cancel(); return; }
    if(textInput.value) {
        const utter = new SpeechSynthesisUtterance(textInput.value);
        const selectedName = voiceSelect.selectedOptions[0].getAttribute('data-name');
        utter.voice = voices.find(v => v.name === selectedName);
        utter.rate = rateInput.value;
        utter.pitch = pitchInput.value;
        synth.speak(utter);
    }
});