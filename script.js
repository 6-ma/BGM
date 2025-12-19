// Configuration
const BGM_LYRICS_PATH = 'BGM/maou_short_14_shining_star.mp3';
const BGM_NO_LYRICS_PATH = 'BGM/maou_inst_short_14_shining_star.mp3';
const QUESTIONS_PATH = 'questions.json';

// State
let state = {
    condition: '', // 'Lyrics' or 'No Lyrics'
    questions: [],
    currentQuestionIndex: 0,
    startTime: 0,
    results: [] // Array of { questionId, selected, correct, timeTaken }
};

// DOM Elements
const views = {
    welcome: document.getElementById('view-welcome'),
    wait: document.getElementById('view-wait'),
    quiz: document.getElementById('view-quiz'),
    results: document.getElementById('view-results')
};

const audioPlayer = document.getElementById('bgm-player');
const codeDisplay = document.getElementById('code-display');
const optionsContainer = document.getElementById('options-container');
const questionTracker = document.getElementById('question-tracker');
const btnStart = document.getElementById('btn-start');

// New Elements
const resultsText = document.getElementById('results-text');
const btnCopy = document.getElementById('btn-copy');
const btnTestAudio = document.getElementById('btn-test-audio');
const iconPlay = document.getElementById('icon-play');
const iconStop = document.getElementById('icon-stop');
const countdownEl = document.getElementById('countdown');

// Initialization
async function init() {
    // 1. Random Assignment
    const isLyrics = Math.random() < 0.5;
    state.condition = isLyrics ? 'Lyrics' : 'No Lyrics';

    // Set Audio Source
    audioPlayer.src = isLyrics ? BGM_LYRICS_PATH : BGM_NO_LYRICS_PATH;

    // Debug info (optional, can be removed in prod)
    console.log(`Condition Assigned: ${state.condition}`);

    // 2. Load Questions
    try {
        const response = await fetch(QUESTIONS_PATH);
        state.questions = await response.json();
    } catch (e) {
        console.error("Failed to load questions", e);
        alert("問題の読み込みに失敗しました。コンソールを確認してください。");
    }
}

// Event Listeners
btnStart.addEventListener('click', startExperiment);
btnCopy.addEventListener('click', copyToClipboard);
btnTestAudio.addEventListener('click', toggleTestAudio);

function toggleTestAudio() {
    if (audioPlayer.paused) {
        audioPlayer.play().then(() => {
            iconPlay.style.display = 'none';
            iconStop.style.display = 'block';
        }).catch(err => {
            alert("音声の再生に失敗しました。");
            console.error(err);
        });
    } else {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        iconPlay.style.display = 'block';
        iconStop.style.display = 'none';
    }
}

function startExperiment() {
    // Stop test audio if playing
    if (!audioPlayer.paused) {
        audioPlayer.pause();
        iconPlay.style.display = 'block';
        iconStop.style.display = 'none';
    }

    // Ensure Audio is playing for experiment
    audioPlayer.currentTime = 0;
    audioPlayer.play().then(() => {
        // Switch to Wait View
        switchView('wait');

        let timeLeft = 10;
        countdownEl.textContent = timeLeft;

        const timer = setInterval(() => {
            timeLeft--;
            countdownEl.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(timer);
                switchView('quiz');
                loadQuestion(0);
            }
        }, 1000);

    }).catch(err => {
        alert("音声の再生に失敗しました。画面をクリックしてから再度お試しください。");
        console.error(err);
    });
}

function switchView(viewName) {
    // Hide all
    Object.values(views).forEach(el => el.classList.add('hidden'));
    Object.values(views).forEach(el => el.classList.remove('fade-in'));

    // Show target
    const target = views[viewName];
    target.classList.remove('hidden');
    target.classList.add('fade-in');
}

function loadQuestion(index) {
    const q = state.questions[index];
    state.currentQuestionIndex = index;

    // Update Tracker
    questionTracker.textContent = `第 ${index + 1} 問 / 全 ${state.questions.length} 問`;

    // Display Code
    codeDisplay.textContent = q.code;
    delete codeDisplay.dataset.highlighted; // Fix for highlight.js re-highlighting
    codeDisplay.className = 'language-c';
    hljs.highlightElement(codeDisplay);

    // Generate Options
    optionsContainer.innerHTML = '';
    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => handleAnswer(q, opt);
        optionsContainer.appendChild(btn);
    });

    state.startTime = Date.now();
}

function handleAnswer(question, selectedOption) {
    const timeTaken = Date.now() - state.startTime;
    const isCorrect = selectedOption === question.answer;

    // Record Result
    state.results.push({
        condition: state.condition,
        questionId: question.id,
        selected: selectedOption,
        isCorrect: isCorrect,
        timeMs: timeTaken,
        timestamp: new Date().toISOString()
    });

    // Next Question or Finish
    const nextIndex = state.currentQuestionIndex + 1;
    if (nextIndex < state.questions.length) {
        loadQuestion(nextIndex);
    } else {
        finishExperiment();
    }
}

function finishExperiment() {
    audioPlayer.pause();
    switchView('results');

    const csvContent = generateCSV();
    resultsText.value = csvContent;
}

function generateCSV() {
    // CSV Header
    let csvContent = "Condition,QuestionID,Selected,IsCorrect,TimeMs,Timestamp\n";

    // CSV Rows
    state.results.forEach(row => {
        csvContent += `${row.condition},${row.questionId},"${row.selected}",${row.isCorrect},${row.timeMs},${row.timestamp}\n`;
    });
    return csvContent;
}

function copyToClipboard() {
    resultsText.select();
    resultsText.setSelectionRange(0, 99999); // For mobile devices
    navigator.clipboard.writeText(resultsText.value).then(() => {
        const originalText = btnCopy.textContent;
        btnCopy.textContent = "コピーしました！";
        setTimeout(() => {
            btnCopy.textContent = "クリップボードにコピー";
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('コピーに失敗しました。手動でコピーしてください。');
    });
}

// Kickoff
init();
