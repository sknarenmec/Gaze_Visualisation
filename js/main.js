// Kalman Filter implementation
class KalmanFilter {
    constructor({ R = 1, Q = 1, A = 1, B = 0, C = 1 } = {}) {
        this.R = R; // noise power desirable
        this.Q = Q; // noise power estimated
        this.A = A;
        this.B = B;
        this.C = C;
        this.cov = NaN;
        this.x = NaN; // estimated signal without noise
    }

    filter(z, u = 0) {
        if (isNaN(this.x)) {
            this.x = (1 / this.C) * z;
            this.cov = (1 / this.C) * this.Q * (1 / this.C);
        } else {
            // Compute prediction
            const predX = (this.A * this.x) + (this.B * u);
            const predCov = ((this.A * this.cov) * this.A) + this.R;

            // Kalman gain
            const K = predCov * this.C * (1 / ((this.C * predCov * this.C) + this.Q));

            // Correction
            this.x = predX + K * (z - (this.C * predX));
            this.cov = predCov - (K * this.C * predCov);
        }
        return this.x;
    }
}

const THRESHOLD_DISTANCE = 50; // Example threshold distance in pixels

// Initialize Kalman filters with optimized parameters
const kalmanFilterX = new KalmanFilter({
    R: 0.5,   // Process noise (lower = more smoothing)
    Q: 0.3,   // Measurement noise (higher = trust measurements less)
    A: 1,     // State transition
    B: 0,     // Control input (0 since we're not using control inputs)
    C: 1      // Measurement
});

const kalmanFilterY = new KalmanFilter({
    R: 0.5,
    Q: 0.3,
    A: 1,
    B: 0,
    C: 1
});

// Add velocity-based filtering
let lastPoint = null;
const MAX_VELOCITY = 300; // pixels per second

function isVelocityValid(x, y, timestamp) {
    if (!lastPoint) {
        lastPoint = { x, y, timestamp };
        return true;
    }
    
    const dt = (timestamp - lastPoint.timestamp) / 1000; // Convert to seconds
    if (dt <= 0) return true;
    
    const dx = x - lastPoint.x;
    const dy = y - lastPoint.y;
    const velocity = Math.sqrt(dx*dx + dy*dy) / dt;
    
    lastPoint = { x, y, timestamp };
    return velocity < MAX_VELOCITY;
}

// Add moving average filter
const positionHistory = [];
const HISTORY_LENGTH = 3; // Number of frames to average

function getSmoothedPosition(x, y) {
    positionHistory.push({x, y});
    if (positionHistory.length > HISTORY_LENGTH) {
        positionHistory.shift();
    }
    
    return positionHistory.reduce((acc, pos, _, arr) => ({
        x: acc.x + (pos.x / arr.length),
        y: acc.y + (pos.y / arr.length)
    }), {x: 0, y: 0});
}

window.onload = async function() {
    await webgazer.setRegression('ridge')
        .setTracker('TFFacemesh')
        .setGazeListener(function(data, clock) {
            if (data && data.x !== null && data.y !== null) {
                // First apply velocity check
                if (!isVelocityValid(data.x, data.y, performance.now())) {
                    return; // Skip this point if velocity is too high
                }
                
                // Then apply moving average
                const smoothedPos = getSmoothedPosition(data.x, data.y);
                
                // Then apply threshold filter
                const filteredData = filterGazePoint(smoothedPos.x, smoothedPos.y);
                
                if (filteredData) {
                    // Finally apply Kalman filter
                    const smoothedX = kalmanFilterX.filter(filteredData.x);
                    const smoothedY = kalmanFilterY.filter(filteredData.y);
                    
                    // Update the display
                    updateScatterPlot([smoothedX], [smoothedY]);
                }
            }
        })
        .saveDataAcrossSessions(true)
        .begin();

    webgazer.showVideoPreview(false) // Hide video preview
        .showPredictionPoints(true) // Show WebGazer's default prediction dot
        .showFaceOverlay(true) // Hide face overlay
        .showFaceFeedbackBox(true) // Hide face feedback box
        .applyKalmanFilter(true); // Keep Kalman filter enabled for smoothing

    //Set up the webgazer video feedback.
    var setup = function() {
        //Set up the main canvas. The main canvas is used to calibrate the webgazer.
        var canvas = document.getElementById("plotting_canvas");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.position = 'fixed';
    };
    setup();
};

// Set to true if you want to save the data even if you reload the page.
window.saveDataAcrossSessions = true;

window.onbeforeunload = function() {
    webgazer.end();
}

/**
 * Restart the calibration process by clearing the local storage and reseting the calibration point
 */
function Restart() {
    document.getElementById("Accuracy").innerHTML = "<a>Not yet Calibrated</a>";
    webgazer.clearData();
    ClearCalibration();
    PopUpInstruction();
}

/**
 * Filter gaze point with threshold distance
 */
function filterGazePoint(x, y) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    if (distance < THRESHOLD_DISTANCE) {
        return { x, y };
    }
    return null;
}

/**
 * Update scatter plot with gaze position data
 */
function updateScatterPlot(x, y) {
    var layout = {
        title: 'Live Gaze Position Scatter Plot',
        xaxis: { title: 'X Position' },
        yaxis: { title: 'Y Position' }
    };

    var trace = {
        x: x,
        y: y,
        mode: 'markers',
        type: 'scatter'
    };

    Plotly.newPlot('plotting_canvas', [trace], layout);
}
