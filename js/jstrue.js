let gazeData = [];
let currentImageIndex = 0;
let startTime;
let isTracking = false;

function startWebGazer() {
    webgazer.params.applyKalmanFilter = true; // Kalman filter is selected by default
    document.querySelector('a[onclick="webgazer.applyKalmanFilter(!webgazer.params.applyKalmanFilter)"]').style.display = 'none';

    webgazer.setGazeListener((data, elapsedTime) => {
        if (data !== null && isTracking) {
            createRedDot(data.x, data.y);
            const transformValue = document.querySelector('#webgazerGazeDot').style.transform;
            const regex = /translate3d\((.+?)px, (.+?)px, .+?\)/;
            const matches = transformValue.match(regex);
            const x = matches ? parseFloat(matches[1]) : null;
            const y = matches ? parseFloat(matches[2]) : null;

            gazeData.push({ x, y, time: Date.now() - startTime });
        }
    }).begin();
}

function createRedDot(x, y) {
    const redDot = document.createElement('div');
    redDot.classList.add('red-dot');
    redDot.style.left = x + 'px';
    redDot.style.top = y + 'px';
    document.querySelector('.image-container').appendChild(redDot);
}

function startStudy() {
    swal({
        title: "Start the Study Now?",
        text: "Click 'Yes' to start the study or 'No' to remain in calibration state.",
        icon: "info",
        buttons: ["No", "Yes"],
    }).then((willStart) => {
        if (willStart) {
            // Redirect to the study.html page
            window.location.href = 'study.html';
        }
    });
}

// Check for the existence of the "Start Study" button and attach the event listener
const startStudyButton = document.querySelector('.helpBtn'); // Check for the correct button
if (startStudyButton) {
    startStudyButton.addEventListener('click', startStudy);
}

// Start WebGazer when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    startWebGazer();
});
