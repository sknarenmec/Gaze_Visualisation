// Event listener for file upload
document.getElementById('fileInput').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.type === "application/json") {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = JSON.parse(e.target.result);
            initializeVisualization(data);
            document.getElementById('downloadFullReportBtn').style.display = 'block'; // Show the button
        };
        reader.readAsText(file);
    } else {
        alert("Please upload a valid JSON file.");
    }
}

function initializeVisualization(gazeData) {
    const imageGallery = document.getElementById('imageGallery');
    imageGallery.innerHTML = ''; // Clear previous images

    const imageMap = new Map(); // To hold images and their gaze points

    gazeData.forEach(entry => {
        const { imagePath, gazePoint } = entry;

        // Collect gaze points by image path
        if (!imageMap.has(imagePath)) {
            imageMap.set(imagePath, []);
        }
        imageMap.get(imagePath).push(gazePoint);
    });

    imageMap.forEach((gazePoints, imagePath) => {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';

        // Create canvas for the image and gaze map
        const imgCanvas = document.createElement('canvas');
        const ctx = imgCanvas.getContext('2d');
        const img = new Image();
        img.src = imagePath;

        img.onload = function() {
            imgCanvas.width = img.width;
            imgCanvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            drawGazePoints(gazePoints, ctx); // Draw gaze points on the image
        };

        // Create a div for visualizations
        const visualizationDiv = document.createElement('div');
        visualizationDiv.className = 'visualization';

        // Create summary statistics section
        const statsDiv = document.createElement('div');
        statsDiv.className = 'stats';
        statsDiv.innerHTML = `
            <h2>${imagePath.split('/').pop()}</h2>
            <p>Total Gaze Points: ${gazePoints.length} <i class="fas fa-eye"></i></p>
            <p>Average Gaze Duration: ${calculateAverageDuration(gazePoints)} <i class="fas fa-clock"></i></p>
        `;

        // Create download button for each image
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = 'Download PDF';
        downloadBtn.onclick = function() {
            const totalDuration = calculateTotalDuration(gazePoints); // Calculate total gaze duration
            const avgPosition = calculateAveragePosition(gazePoints); // Calculate average gaze position
            downloadPdf(imgCanvas, imagePath, gazePoints, totalDuration, avgPosition); // Pass canvas to downloadPdf
        };

        // Append the button to the visualization div
        visualizationDiv.appendChild(statsDiv);
        visualizationDiv.appendChild(downloadBtn); // Append the download button
        imageContainer.appendChild(imgCanvas);
        imageContainer.appendChild(visualizationDiv);
        imageGallery.appendChild(imageContainer);

        // Click event for toggling display of the download button
        imageContainer.onclick = function() {
            imageContainer.classList.toggle('turned'); // Add turning animation class
            imageContainer.classList.toggle('clicked'); // Toggle clicked class to show download button
        };

        // Mouseleave event to reset the image
        imageContainer.onmouseleave = function() {
            imageContainer.classList.remove('turned'); // Remove turning class to reset
        };
    });
}

// Function to draw gaze points on canvas
function drawGazePoints(gazePoints, ctx) {
    gazePoints.forEach(point => {
        const { x, y } = point; // Assuming point has x, y coordinates
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)'; // Red gaze points
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Function to calculate average gaze duration (dummy example)
function calculateAverageDuration(gazePoints) {
    return (Math.random() * 5).toFixed(2) + 's'; // Dummy average for demonstration
}

// Function to calculate total gaze duration (dummy example)
function calculateTotalDuration(gazePoints) {
    return (Math.random() * 30).toFixed(2) + 's'; // Dummy total for demonstration
}

// Function to calculate average gaze position
function calculateAveragePosition(gazePoints) {
    const totalX = gazePoints.reduce((sum, point) => sum + point.x, 0);
    const totalY = gazePoints.reduce((sum, point) => sum + point.y, 0);
    const avgX = totalX / gazePoints.length;
    const avgY = totalY / gazePoints.length;
    return { avgX, avgY };
}

// Function to download individual image report as PDF
function downloadPdf(canvas, imagePath, gazePoints, totalDuration, avgPosition) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    // Function to add a border
    function addBorder() {
        const margin = 10;
        const width = doc.internal.pageSize.getWidth() - margin * 2;
        const height = doc.internal.pageSize.getHeight() - margin * 2;
        doc.setDrawColor(255, 255, 255); // White border color
        doc.rect(margin, margin, width, height); // Draw rectangle for border
    }

    // Page 1: Gaze Report
    addBorder();
    doc.setFontSize(20);
    doc.text('Eye Gaze Study Report', 10, 20);
    doc.setFontSize(14);
    doc.text(`Image: ${imagePath.split('/').pop()}`, 10, 30);
    doc.text(`Total Gaze Points: ${gazePoints.length}`, 10, 40);
    doc.text(`Total Gaze Duration: ${totalDuration}`, 10, 50);
    doc.text(`Average Gaze Position: (${avgPosition.avgX.toFixed(2)}, ${avgPosition.avgY.toFixed(2)})`, 10, 60);
    
    // Add image with gaze points to PDF
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 280; // Image width
    const imgHeight = (canvas.height * imgWidth) / canvas.width; // Maintain aspect ratio
    doc.addImage(imgData, 'PNG', 10, 70, imgWidth, imgHeight); // Adjust position and size as needed

    // Page Number
    doc.setFontSize(10);
    doc.text(`Page 1`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 10);
    
    // Save the PDF
    doc.save(`${imagePath.split('/').pop().split('.')[0]}_report.pdf`);
}
