const token =
localStorage.getItem("token");

if(!token){
    window.location.href = "login.html";
}

window.history.pushState(null, "", window.location.href);
window.onpopstate = () => {
  window.history.pushState(null, "", window.location.href);
};
let warningCount = 0;
let faceWarningCount = 0;
let voiceWarningCount = 0;
let lastVoiceAlertTime = 0;
let tabSwitchAlertActive = false;
let cameraReady = false;
let monitoringInterval = null;
let faceMonitoringInterval = null;
let faceDetectionReady = false;
const FACE_API_MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

const video = document.getElementById("video");
const cameraStatus = document.getElementById("cameraStatus");
const audioStatus = document.getElementById("audioStatus");

function showWarning(message, type = "info") {
  const warningBox = document.getElementById("warningBox");
  if (!warningBox) return;

  warningBox.textContent = message;
  warningBox.className = "warning-box";

  if (type === "error") warningBox.classList.add("warning-error");
  if (type === "ok") warningBox.classList.add("warning-ok");
}

function clearWarning() {
  const warningBox = document.getElementById("warningBox");
  if (!warningBox) return;

  warningBox.textContent = "";
  warningBox.className = "warning-box";
}

async function getDeviceInfo() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      hasVideo: devices.some((device) => device.kind === "videoinput"),
      hasAudio: devices.some((device) => device.kind === "audioinput")
    };
  } catch (error) {
    return { hasVideo: false, hasAudio: false };
  }
}

function stopCurrentStream() {
  if (video?.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
}

async function startCamera() {
  const deviceStatus = document.getElementById("deviceStatus");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraStatus.textContent = "This browser does not support camera access. Please use Chrome or Edge.";
    if (deviceStatus) deviceStatus.textContent = "Camera access is not supported in this browser.";
    cameraReady = false;
    return false;
  }

  try {
    stopCurrentStream();
    const deviceInfo = await getDeviceInfo();

    if (!deviceInfo.hasVideo) {
      cameraStatus.textContent = "No webcam was found on this laptop. Please connect a camera or use a device with webcam support.";
      if (deviceStatus) deviceStatus.textContent = "No webcam detected.";
      cameraReady = false;
      return false;
    }

    if (!deviceInfo.hasAudio) {
      cameraStatus.textContent = "No microphone was found on this laptop. Please connect a microphone or use a device with audio input support.";
      if (deviceStatus) deviceStatus.textContent = "No microphone detected.";
      cameraReady = false;
      return false;
    }

    cameraStatus.textContent = "Requesting camera and microphone permission...";
    if (deviceStatus) deviceStatus.textContent = "Requesting camera and microphone permission…";
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: true
    });

    video.srcObject = stream;
    await video.play();
    cameraReady = true;
    cameraStatus.textContent = "Camera is active.";
    audioStatus.textContent = "Microphone is active for voice monitoring.";
    if (deviceStatus) deviceStatus.textContent = "Camera and microphone are ready.";
    startVoiceDetection(stream);
    await startFaceVisibilityMonitoring();
    return true;
  } catch (error) {
    cameraReady = false;
    console.error("Camera access failed:", error);

    const reason = error?.name || "";
    const message = error?.message || "";

    if (reason === "NotFoundError" || /no camera|no webcam|not found/i.test(message)) {
      cameraStatus.textContent = "No webcam was found on this device. Please connect a camera or try another laptop.";
      if (deviceStatus) deviceStatus.textContent = "Webcam not detected.";
    } else if (reason === "NotAllowedError" || /permission|denied/i.test(message)) {
      cameraStatus.textContent = "Camera or microphone permission was denied by the browser or OS. Please allow access and refresh the page.";
      if (deviceStatus) deviceStatus.textContent = "Permission denied by browser or OS.";
    } else if (reason === "NotReadableError" || /in use|busy/i.test(message)) {
      cameraStatus.textContent = "The camera is already in use by another app. Close other programs and try again.";
      if (deviceStatus) deviceStatus.textContent = "Camera is already in use.";
    } else {
      cameraStatus.textContent = "Camera access failed. Please use Chrome or Edge, allow camera/microphone access, and refresh the page.";
      if (deviceStatus) deviceStatus.textContent = "Camera access failed on this device.";
    }

    audioStatus.textContent = "Microphone permission is required for voice monitoring.";
    return false;
  }
}

function startVoiceDetection(stream) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    setInterval(() => {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const average = data.reduce((sum, value) => sum + value, 0) / data.length;

      const loudNoiseDetected = average > 60;

      if (loudNoiseDetected) {
        voiceWarningCount += 1;
      } else {
        voiceWarningCount = 0;
      }

      if (voiceWarningCount >= 2 && Date.now() - lastVoiceAlertTime > 10000) {
        lastVoiceAlertTime = Date.now();
        saveViolation("Voice Activity", "Loud noise detected during exam.");
        showWarning("Loud noise detected. Please keep your environment silent during the test.", "error");
      }
    }, 1500);
  } catch (error) {
    console.error("Voice monitoring failed:", error);
  }
}

startCamera().then((isCameraReady) => {
  if (!isCameraReady) {
    showExamStatus("Camera access is required before the exam can begin.", true);
    return;
  }

  fetchQuestions();
  startTimer();
  startPeriodicMonitoring();
});


const fullscreenBtn = document.getElementById("fullscreenBtn");

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } else if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

if (fullscreenBtn) {
  fullscreenBtn.addEventListener("click", (event) => {
    event.preventDefault();
    toggleFullscreen();
  });
}

document.addEventListener("fullscreenchange", () => {
  if (fullscreenBtn) {
    fullscreenBtn.textContent = document.fullscreenElement ? "Exit Full Screen" : "Full Screen";
  }
});

let aptitudeQuestions = [];
let reasoningQuestions = [];

let aptitudeAnswers = [];
let reasoningAnswers = [];

let currentQuestion = 0;
let currentRound = "aptitude";

const EXAM_TIME_KEY_PREFIX = "examRemainingTime";
const EXAM_TIMER_STARTED_AT_KEY_PREFIX = "examTimerStartedAt";

function getUserIdFromToken() {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return "guest";
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.id || decoded._id || decoded.userId || "guest";
  } catch (error) {
    return "guest";
  }
}

function getExamTimerKey(name) {
  return `${name}_${getUserIdFromToken()}`;
}

function getStoredRemainingTime() {
  const examTimeKey = getExamTimerKey(EXAM_TIME_KEY_PREFIX);
  const examStartedAtKey = getExamTimerKey(EXAM_TIMER_STARTED_AT_KEY_PREFIX);
  const storedRemaining = parseInt(localStorage.getItem(examTimeKey), 10);
  const storedStartedAt = parseInt(localStorage.getItem(examStartedAtKey), 10);

  if (Number.isFinite(storedRemaining) && storedRemaining >= 0 && Number.isFinite(storedStartedAt)) {
    const elapsedSeconds = Math.floor((Date.now() - storedStartedAt) / 1000);
    return Math.max(0, storedRemaining - elapsedSeconds);
  }

  return 30 * 60;
}

let totalTime = getStoredRemainingTime();

const questionContainer =
document.getElementById("questionContainer");
const examStatus = document.getElementById("deviceStatus");
const examTitle = document.getElementById("examTitle");

function showExamStatus(message, isError = false) {
    if (examStatus) {
        examStatus.textContent = message;
        examStatus.style.color = isError ? "#dc2626" : "#2563eb";
    }
}

async function fetchQuestions(){
    try {
        const profileResponse = await fetch("http://localhost:5080/api/auth/profile", {
            headers: { Authorization: "Bearer " + token }
        });
        const profile = await profileResponse.json();

        if (profileResponse.ok) {
          const displayName = profile.username || profile.email || "Candidate";
          const userId = profile.id || profile._id || getUserIdFromToken();
          localStorage.setItem("examUserId", userId);
          localStorage.setItem("examUserName", displayName);
          totalTime = getStoredRemainingTime();
          if (examTitle) {
            examTitle.textContent = `${displayName}'s Assessment`;
          }
        }

        if (profileResponse.ok && profile.testCompleted) {
            localStorage.setItem("testCompleted", "true");
            showExamStatus("You have already completed this exam. Redirecting to your dashboard…", true);
            setTimeout(() => window.location.replace("dashboard.html"), 800);
            return;
        }

        localStorage.setItem("testCompleted", String(Boolean(profile.testCompleted)));
        const response =
        await fetch(
        "http://localhost:5080/api/exam/start",
        {
            headers:{
                Authorization:
                "Bearer " + token
            }
        });

        const data =
        await response.json();

        if (!response.ok) {
            const message = data.message || "Unable to load test questions";
            showExamStatus(message, true);
            questionContainer.innerHTML = "<div class='question-box'><p>" + message + "</p></div>";
            return;
        }

        aptitudeQuestions =
        data.aptitude || [];

        reasoningQuestions =
        data.reasoning || [];

        showExamStatus("Connected. Loading questions…", false);
        renderQuestion();
    } catch (error) {
        console.error("Unable to load exam questions:", error);
        showExamStatus("Unable to connect to the server. Please check your connection and refresh the page.", true);
        questionContainer.innerHTML = "<div class='question-box'><p>Unable to connect to the server right now. Please refresh and try again.</p></div>";
    }

}


function startTimer(){
const examTimeKey = getExamTimerKey(EXAM_TIME_KEY_PREFIX);
const examStartedAtKey = getExamTimerKey(EXAM_TIMER_STARTED_AT_KEY_PREFIX);

if (!localStorage.getItem(examTimeKey)) {
  localStorage.setItem(examTimeKey, String(totalTime));
  localStorage.setItem(examStartedAtKey, String(Date.now()));
}

setInterval(()=>{

let minutes =
Math.floor(
totalTime / 60
);

let seconds =
totalTime % 60;

document.getElementById(
"timer"
).innerText =
`${minutes}:${seconds
.toString()
.padStart(2,'0')}`;

if (totalTime > 0) {
  totalTime--;
  localStorage.setItem(getExamTimerKey(EXAM_TIME_KEY_PREFIX), String(totalTime));
  localStorage.setItem(getExamTimerKey(EXAM_TIMER_STARTED_AT_KEY_PREFIX), String(Date.now()));
}

if(totalTime <= 0){

submitExam();

}

},1000);

}


function updateNavigationButtons() {
  const nextBtn = document.getElementById("nextBtn");
  const questions = currentRound === "aptitude" ? aptitudeQuestions : reasoningQuestions;

  if (nextBtn) {
    const isLastQuestion = currentQuestion >= questions.length - 1;
    nextBtn.style.display = isLastQuestion ? "none" : "inline-flex";
  }
}

function renderQuestion(){

let questions =
currentRound === "aptitude"
?
aptitudeQuestions
:
reasoningQuestions;

if (!questions || questions.length === 0) {
    questionContainer.innerHTML = "<div class='question-box'><p>No questions are available right now.</p></div>";
    return;
}

let q =
questions[currentQuestion];

if (!q) {
    questionContainer.innerHTML = "<div class='question-box'><p>No question found for this round.</p></div>";
    return;
}

questionContainer.innerHTML =

`
<div class="question-box">

<h3>
Q${currentQuestion + 1}.
${q.question}
</h3>

${q.options.map(
option =>

`
<div class="option">

<label>

<input
type="radio"
name="answer"
value="${option}"
onchange="saveAnswer('${q._id}','${option}')"
>

${option}

</label>

</div>
`
).join("")}

</div>
`;

updateNavigationButtons();

}

function saveAnswer(
questionId,
selectedAnswer
){

let answerArray =
currentRound === "aptitude"
?
aptitudeAnswers
:
reasoningAnswers;

const existing =
answerArray.find(
item =>
item.questionId ===
questionId
);

if(existing){

existing.selectedAnswer =
selectedAnswer;

}
else{

answerArray.push({

questionId,

selectedAnswer

});

}

}


document
.getElementById(
"nextBtn"
)
.addEventListener(
"click",
()=>{

let questions =
currentRound === "aptitude"
?
aptitudeQuestions
:
reasoningQuestions;

if(
currentQuestion <
questions.length - 1
){

currentQuestion++;

renderQuestion();

}

});

document
.getElementById(
"prevBtn"
)
.addEventListener(
"click",
()=>{

if(currentQuestion > 0){

currentQuestion--;

renderQuestion();

}

});

document
.getElementById(
"submitRoundBtn"
)
.addEventListener(
"click",
()=>{

if(
currentRound ===
"aptitude"
){

currentRound =
"reasoning";

currentQuestion = 0;

document
.getElementById(
"roundTitle"
).innerText =
"Reasoning Round";

renderQuestion();

}
else{

submitExam();

}

});


async function submitExam(){

if (localStorage.getItem("testCompleted") === "true" || localStorage.getItem("examSubmitted") === "true") {
  showExamStatus("This exam has already been submitted. Redirecting…", true);
  setTimeout(() => window.location.replace("dashboard.html"), 800);
  return;
}

window.onpopstate = null;
showExamStatus("Submitting your answers…", false);

try {
const response =
await fetch(
"http://localhost:5080/api/exam/submit",
{
method:"POST",

headers:{
"Content-Type":
"application/json",

Authorization:
"Bearer " + token
},

body:
JSON.stringify({

aptitudeAnswers,

reasoningAnswers

})

}
);

const data =
await response.json();

if (!response.ok) {
  throw new Error(data.message || "Unable to submit your exam right now.");
}

showExamStatus("Exam submitted successfully.", false);
localStorage.setItem("examSubmitted", "true");
localStorage.removeItem(getExamTimerKey(EXAM_TIME_KEY_PREFIX));
localStorage.removeItem(getExamTimerKey(EXAM_TIMER_STARTED_AT_KEY_PREFIX));
window.location.replace("dashboard.html");
} catch (error) {
  console.error("Exam submission failed:", error);
  showExamStatus("Unable to connect to the server while submitting. Please try again.", true);
}

}

function requestExamFullscreen() {
  if (document.fullscreenElement) return;
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {
      console.warn("Fullscreen launch was blocked by the browser.");
    });
  }
}

function handleTabSwitch() {
  if (!document.hidden) {
    tabSwitchAlertActive = false;
    return;
  }

  if (tabSwitchAlertActive) return;

  tabSwitchAlertActive = true;
  warningCount += 1;
  saveViolation("Tab Switch", `Warning ${warningCount}`);
  showWarning(`Tab switch detected. Warning ${warningCount}/3. Please stay in this tab.`, "error");

  if (warningCount >= 3) {
    showWarning("Too many tab-switch warnings. Exam submitted.", "error");
    submitExam();
  }
}

window.addEventListener("beforeunload", (event) => {
  event.preventDefault();
  event.returnValue = "You cannot leave the exam page.";
});

document.addEventListener("visibilitychange", () => {
  handleTabSwitch();
});

async function saveViolation(
type,
description,
screenshot=""
){

await fetch(
"http://localhost:5080/api/violation/create",
{
method:"POST",

headers:{
"Content-Type":
"application/json",

Authorization:
"Bearer " + token
},

body:
JSON.stringify({

type,

description,

screenshot

})

}
);

}

function captureScreenshot(){

const canvas =
document.getElementById(
"canvas"
);

const context =
canvas.getContext("2d");

canvas.width =
video.videoWidth || 320;

canvas.height =
video.videoHeight || 240;

context.drawImage(
video,
0,
0,
canvas.width,
canvas.height
);

return canvas.toDataURL(
"image/png"
);

}

async function loadFaceDetectionModel() {
  if (!window.faceapi || faceDetectionReady) return true;

  try {
    await window.faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODEL_URL);
    faceDetectionReady = true;
    return true;
  } catch (error) {
    console.warn("Face detection model could not be loaded:", error);
    return false;
  }
}

async function detectFaceVisibility() {
  if (!video || !video.videoWidth || !video.videoHeight) {
    return false;
  }

  if (window.faceapi && faceDetectionReady) {
    try {
      const detection = await window.faceapi.detectSingleFace(
        video,
        new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.25 })
      );

      if (!detection) {
        faceWarningCount += 1;
        if (faceWarningCount <= 2) {
          showWarning("Please keep your face in the camera view.", "error");
          saveViolation("Face Visibility", "Face not visible or out of frame.");
        }
        return true;
      }

      if (faceWarningCount > 0) {
        clearWarning();
      }
      faceWarningCount = 0;
      return false;
    } catch (error) {
      console.warn("Face detection failed:", error);
    }
  }

  const canvas = document.getElementById("canvas");
  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let brightness = 0;
  let variance = 0;
  const sampleSize = Math.max(100, Math.floor(imageData.length / 100));

  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const avg = (r + g + b) / 3;
    brightness += avg;
    variance += avg * avg;
  }

  const mean = brightness / (imageData.length / 4);
  const meanSquare = variance / (imageData.length / 4);
  const stdDev = Math.sqrt(Math.max(0, meanSquare - mean * mean));

  const isTooSmall = video.videoWidth < 160 || video.videoHeight < 120;
  const isTooUniform = stdDev < 18 || mean < 35 || mean > 220;

  if (isTooSmall || isTooUniform) {
    faceWarningCount += 1;
    if (faceWarningCount <= 2) {
      showWarning("Please move your face into the camera view and ensure the frame is clear.", "error");
      saveViolation("Face Visibility", "Face not clearly visible or out of frame.");
    }
    return true;
  }

  if (faceWarningCount > 0) {
    clearWarning();
  }
  faceWarningCount = 0;
  return false;
}

async function startFaceVisibilityMonitoring() {
  if (!window.faceapi) {
    showWarning("Face detection is unavailable in this browser. Camera monitoring will fall back to basic checks.", "info");
    return;
  }

  const faceModelReady = await loadFaceDetectionModel();
  if (!faceModelReady) {
    showWarning("Face detection model is unavailable. Basic camera checks will continue.", "info");
    return;
  }

  if (faceMonitoringInterval) clearInterval(faceMonitoringInterval);

  faceMonitoringInterval = setInterval(async () => {
    if (!cameraReady || !video || !video.srcObject) return;

    try {
      await detectFaceVisibility();
    } catch (error) {
      console.warn("Continuous face monitoring error:", error);
    }
  }, 2000);
}

function startPeriodicMonitoring() {
  if (monitoringInterval) clearInterval(monitoringInterval);

  monitoringInterval = setInterval(async () => {
    if (!cameraReady || !video || !video.srcObject) return;

    const screenshot = captureScreenshot();

    const shouldFlagFace = await detectFaceVisibility();
    if (shouldFlagFace) {
      return;
    }

    saveViolation("Periodic Monitoring", "Screenshot Captured", screenshot);
  }, 30000);
}
