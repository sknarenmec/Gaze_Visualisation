var PointCalibrate = 0;
var CalibrationPoints = {};
var isPopupConfirmed = false;

// Find the help modal
var helpModal;

/**
 * Clear the canvas and the calibration button.
 */
function ClearCanvas(){
  document.querySelectorAll('.Calibration').forEach((i) => {
    i.style.setProperty('display', 'none');
  });
  var canvas = document.getElementById("plotting_canvas");
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Show the instruction of using calibration at the start up screen.
 */
function PopUpInstruction(){
  ClearCanvas();
  // Hide all points before showing popup
  document.querySelectorAll('.Calibration').forEach((i) => {
    i.style.setProperty('display', 'none');
  });

  Swal.fire({
    title: "Calibration",
    text: "Please click on each of the 16 points on the screen. You must click on each point 5 times till it goes yellow. This will calibrate your eye movements.",
    buttons: {
      cancel: false,
      confirm: true
    },
    background: '#ffffff',
    backdrop: false,
    customClass: {
      container: 'swal-bright'
    }
  }).then(isConfirm => {
    // Show points again after popup
    if (isConfirm) {
      ShowCalibrationPoint();
      isPopupConfirmed = true;
    } else {
      // Show points if user cancels
      ShowCalibrationPoint();
    }
    if (isConfirm) {
      ShowCalibrationPoint();
      isPopupConfirmed = true;
    }
  });
}

/**
  * Show the help instructions right at the start.
  */
function helpModalShow() {
    if(!helpModal) {
        helpModal = new bootstrap.Modal(document.getElementById('helpModal'))
    }
    helpModal.show();
}

function calcAccuracy() {
  // show modal
  // notification for the measurement process
  // Hide all points before showing popup
  document.querySelectorAll('.Calibration').forEach((i) => {
    i.style.setProperty('display', 'none');
  });

  Swal.fire({
      title: "Calculating measurement",
      text: "Please don't move your mouse & stare at the middle dot for the next 5 seconds. This will allow us to calculate the accuracy of our predictions.",
      showCancelButton: false,
      allowOutsideClick: false,
      confirmButtonText: 'OK',
      background: '#ffffff',
      backdrop: false,
      customClass: {
        container: 'swal-bright'
      }
  }).then(() => {
      // Show points again after popup
      ShowCalibrationPoint();
      // makes the variables true for 5 seconds & plots the points

      store_points_variable(); // start storing the prediction points

      sleep(5000).then(() => {
          stop_storing_points_variable(); // stop storing the prediction points
          var past50 = webgazer.getStoredPoints(); // retrieve the stored points
          var precision_measurement = calculatePrecision(past50);
          var accuracyLabel = "<a>Accuracy | " + precision_measurement + "%</a>";
          document.getElementById("Accuracy").innerHTML = accuracyLabel; // Show the accuracy in the nav bar.
          // Hide all points before showing popup
          document.querySelectorAll('.Calibration').forEach((i) => {
            i.style.setProperty('display', 'none');
          });

          Swal.fire({
              title: "Your accuracy measure is " + precision_measurement + "%",
              showCancelButton: true,
              confirmButtonText: 'Start Study',
              cancelButtonText: 'Recalibrate',
              background: '#ffffff',
              backdrop: false,
              customClass: {
                container: 'swal-bright'
              }
          }).then((result) => {
              // Show points again after popup
              ShowCalibrationPoint();
              if (result.isConfirmed) {
                  // Navigate to study page
                  window.location.href = 'study.html';
              } else {
                  //clear the calibration & hide the last middle button
                  ClearCanvas();
              }
              if (result.isConfirmed) {
                  // Navigate to study page
                  window.location.href = 'study.html';
              } else {
                  //clear the calibration & hide the last middle button
                  ClearCanvas();
              }
          });
      });
  });
}

function calPointClick(node) {
    const id = node.id;
    console.log('Click on point:', id, 'Current clicks:', CalibrationPoints[id] || 0);

    // Initialize point if not already initialized
    if (!CalibrationPoints[id]) {
        CalibrationPoints[id] = 0;
    }
    
    // Increment click count
    CalibrationPoints[id]++;

    // Update point appearance based on clicks
    if (CalibrationPoints[id] < 5) {
        var opacity = 0.15 * CalibrationPoints[id] + 0.4;
        node.style.setProperty('opacity', opacity);
    } else if (CalibrationPoints[id] === 5) {
        node.style.setProperty('opacity', '1'); // Fully visible
        node.style.setProperty('background-color', 'yellow');
        node.setAttribute('disabled', 'disabled');
        PointCalibrate++;
        console.log('Point calibrated:', id, 'Total points calibrated:', PointCalibrate);
    }

    // Show center point only after all 16 points are calibrated
    if (PointCalibrate === 16) {
        console.log('Showing center point');
        const centerPoint = document.getElementById('Pt17');
        if (centerPoint) {
            centerPoint.style.setProperty('display', 'block');
            centerPoint.style.setProperty('opacity', '0.4'); // Start with higher initial opacity
            centerPoint.style.setProperty('background-color', 'red');
        }
    }

    // Handle center point click separately
    if (id === 'Pt17') {
        if (CalibrationPoints[id] < 5) {
            var opacity = 0.15 * CalibrationPoints[id] + 0.4;
            node.style.setProperty('opacity', opacity);
        } else if (CalibrationPoints[id] === 5) {
            node.style.setProperty('opacity', '1'); // Fully visible
            node.setAttribute('disabled', 'disabled');
        }
    }

    // Handle accuracy calculation after all points are calibrated AND popup is confirmed
    if (PointCalibrate === 17 && CalibrationPoints[id] === 5 && isPopupConfirmed) {
        console.log('Starting accuracy calculation');
        
        // Hide all points except the 17th
        document.querySelectorAll('.Calibration').forEach((i) => {
            if (i.id !== 'Pt17') {
                i.style.setProperty('display', 'none');
                i.style.setProperty('opacity', '0');
            }
        });

        // Clear the canvas
        const canvas = document.getElementById("plotting_canvas");
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        // Make sure the 17th point is visible and properly positioned
        const centerPoint = document.getElementById('Pt17');
        if (centerPoint) {
            centerPoint.style.setProperty('display', 'block');
            centerPoint.style.setProperty('opacity', '1');
            centerPoint.style.setProperty('background-color', 'red');
        }

        // Calculate accuracy
        calcAccuracy();
    }

    // Debug state
    console.log('Current state:', {
        PointCalibrate,
        CalibrationPoints: Object.entries(CalibrationPoints).reduce((acc, [k, v]) => {
            acc[k] = v;
            return acc;
        }, {})
    });
}

/**
 * Load this function when the index page starts.
* This function listens for button clicks on the html page
* checks that all buttons have been clicked 5 times each, and then goes on to measuring the precision
*/
//$(document).ready(function(){
function docLoad() {
  ClearCanvas();
  helpModalShow();
    
    // click event on the calibration buttons
    const calibrationPoints = document.querySelectorAll('.Calibration');
    calibrationPoints.forEach((i) => {
        // Remove any existing click handlers
        i.onclick = null;
        i.addEventListener('click', () => {
            calPointClick(i);
        });
    });
}
window.addEventListener('load', docLoad);

/**
 * Show the Calibration Points
 */
function ShowCalibrationPoint() {
  // Show all calibration points except the center point
  document.querySelectorAll('.Calibration').forEach((i) => {
    if (i.id !== 'Pt17') {
      i.style.setProperty('display', 'block');
    }
    if (PointCalibrate === 16 && i.id === 'Pt17') {
        document.getElementById('Pt17').style.removeProperty('display');
        // Make it visible and centered
        const centerPoint = document.getElementById('Pt17');
        if (centerPoint) {
            centerPoint.style.setProperty('background-color', 'red');
            centerPoint.style.removeProperty('opacity');
            centerPoint.style.setProperty('z-index', '1000');
        }
    }
  });

  // Initialize calibration points
  CalibrationPoints = {};
  PointCalibrate = 0;
}

/**
* This function clears the calibration buttons memory
*/
function ClearCalibration(){
  // Clear data from WebGazer
  webgazer.clearData();

  document.querySelectorAll('.Calibration').forEach((i) => {
    i.style.setProperty('background-color', 'red');
    i.style.setProperty('opacity', '0.2');
    i.removeAttribute('disabled');
    i.style.setProperty('display', 'block');
  });

  CalibrationPoints = {};
  PointCalibrate = 0;
}

// sleep function because java doesn't have one, sourced from http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
