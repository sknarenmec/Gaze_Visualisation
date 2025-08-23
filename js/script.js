// Loading spinner
const loadingSpinner = document.createElement('div');
loadingSpinner.className = 'loading-spinner';
loadingSpinner.innerHTML = '<div class="spinner"></div><p>Loading...</p>';

// Event listener for file upload
document.getElementById('fileInput').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        alert("Please select a file to upload.");
        return;
    }
    
    if (!file.type.includes("json")) {
        alert("Please upload a valid JSON file.");
        return;
    }

    // Show loading spinner
    const imageGallery = document.getElementById('imageGallery');
    imageGallery.innerHTML = '';
    imageGallery.appendChild(loadingSpinner);

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let parsedData = JSON.parse(e.target.result);
            console.log("Raw JSON data:", parsedData);
            
            // Check if this is the new format with metadata
            let data, metadata;
            if (parsedData.metadata && parsedData.gazeData) {
                // New format with metadata
                metadata = parsedData.metadata;
                data = parsedData.gazeData;
                console.log("Using enhanced data format with metadata");
            } else {
                // Legacy format (array of gaze entries)
                data = parsedData;
                metadata = {
                    timestamp: new Date().toISOString(),
                    subjectName: data[0]?.subjectName || 'Unknown',
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                };
                console.log("Using legacy data format");
            }

            // Validate data structure
            if (!Array.isArray(data)) {
                throw new Error("Invalid data format: Expected an array of gaze entries or an object with metadata and gazeData");
            }

            // If validation passes, initialize visualization with both data and metadata
            initializeVisualization(data, metadata);
        } catch (error) {
            console.error("Error processing JSON:", error);
            alert(`Error processing JSON file: ${error.message}`);
            imageGallery.innerHTML = '<p class="error-message">Error processing file. Please check the JSON structure.</p>';
        }
    };

    reader.onerror = function() {
        alert("Error reading the file. Please try again.");
        imageGallery.innerHTML = '';
    };

    reader.readAsText(file);
}

function initializeVisualization(gazeData, metadata = {}) {
    // Get subject name from metadata or fallback to data
    const subjectName = metadata.subjectName || 
                       (gazeData[0]?.subjectName || 'Unknown');
    document.getElementById('subjectName').innerText = `Subject: ${subjectName}`;

    // Show statistics
    const statsDiv = document.createElement('div');
    statsDiv.className = 'stats-summary';
    statsDiv.innerHTML = `
        <p>Total Gaze Points: ${gazeData.length}</p>
        <p>Unique Images: ${new Set(gazeData.map(e => e.imagePath)).size}</p>
        <p>Duration: ${Math.round((gazeData[gazeData.length - 1].timestamp - gazeData[0].timestamp) / 1000)} seconds</p>
    `;
    document.body.insertBefore(statsDiv, document.getElementById('imageGallery'));

    const imageGallery = document.getElementById('imageGallery');
    imageGallery.innerHTML = ''; // Clear previous images

    // Group gaze points by image
    const imageMap = new Map();
    const defaultImageKey = 'default_image';
    
    // First, count how many entries have image paths
    const entriesWithPath = gazeData.filter(entry => entry && entry.imagePath).length;
    console.log(`Found ${entriesWithPath} entries with image paths out of ${gazeData.length} total entries`);
    
    gazeData.forEach((entry, index) => {
        if (!entry) return; // Skip invalid entries
        
        // Use the entry's imagePath or fall back to a default key
        const entryImagePath = entry.imagePath || defaultImageKey;
        const gazePoint = entry.gazePoint || entry; // Handle both nested and direct gaze points
        
        if (!imageMap.has(entryImagePath)) {
            imageMap.set(entryImagePath, []);
        }
        
        // Add the gaze point with its original data for reference
        if (gazePoint) {
            imageMap.get(entryImagePath).push({
                ...gazePoint,
                _originalEntry: entry, // Store original entry for debugging
                _index: index         // Store original index for reference
            });
        }
    });
    
    console.log(`Grouped into ${imageMap.size} images`);

    // Process each image
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
            
            // Get image metadata if available
            const imageMeta = metadata?.images?.[imagePath];
            
            // Calculate scaling factors if we have image metadata
            let scaleX = 1, scaleY = 1;
            if (imageMeta) {
                scaleX = img.width / imageMeta.naturalWidth;
                scaleY = img.height / imageMeta.naturalHeight;
            }
            
            // Process gaze points based on available data
            const processedGazePoints = gazePoints.map(point => {
                // Use absolute coordinates if available, otherwise use relative
                if (point.gazePoint?.absolute) {
                    return {
                        x: (point.gazePoint.absolute.x - (imageMeta?.position?.x || 0)) / scaleX,
                        y: (point.gazePoint.absolute.y - (imageMeta?.position?.y || 0)) / scaleY,
                        timestamp: point.timestamp
                    };
                } else if (point.gazePoint?.relative) {
                    // Convert relative coordinates to image coordinates
                    return {
                        x: point.gazePoint.relative.x * img.width,
                        y: point.gazePoint.relative.y * img.height,
                        timestamp: point.timestamp
                    };
                }
                // Fallback to direct coordinates (legacy format)
                return {
                    x: point.x || 0,
                    y: point.y || 0,
                    timestamp: point.timestamp || Date.now()
                };
            });
            
            // Draw visualizations with processed points
            console.log('Drawing visualizations for image:', imagePath);
            console.log('Processed gaze points:', processedGazePoints);
            
            // Clear the canvas first
            ctx.clearRect(0, 0, img.width, img.height);
            
            // Redraw the image
            ctx.drawImage(img, 0, 0, img.width, img.height);
            
            // Draw the points
            drawGazePoints(processedGazePoints, ctx, img.width, img.height);
            
            // Draw the heatmap on top
            drawHeatmap(processedGazePoints, ctx, img.width, img.height);
        };

        // Create stats section
        const statsDiv = document.createElement('div');
        statsDiv.className = 'stats';
        
        // Extract filename from path or use a default
        let displayName = 'Image';
        try {
            displayName = imagePath ? imagePath.split('/').pop() : 'Image';
        } catch (e) {
            console.warn('Error parsing image path:', e);
        }
        
        statsDiv.innerHTML = `
            <h2>${displayName}</h2>
            <p>Gaze Points: ${gazePoints.length}</p>
            <p>Average Duration: ${calculateAverageDuration(gazePoints)}</p>
            <p>Total Duration: ${calculateTotalDuration(gazePoints)}</p>
        `;

        imageContainer.appendChild(imgCanvas);
        imageContainer.appendChild(statsDiv);
        imageGallery.appendChild(imageContainer);
    });
}

// Function to draw a heatmap overlay based on gaze points
function drawHeatmap(gazePoints, ctx, canvasWidth, canvasHeight) {
    // Create a heatmap overlay
    const heatmapCtx = document.createElement('canvas').getContext('2d');
    heatmapCtx.canvas.width = canvasWidth;
    heatmapCtx.canvas.height = canvasHeight;

    // Create a radial gradient for the heatmap
    const gradient = heatmapCtx.createRadialGradient(0, 0, 0, 0, 0, 50);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

    // Draw each gaze point with a gradient circle
    gazePoints.forEach(point => {
        const x = point.x;
        const y = point.y;
        heatmapCtx.beginPath();
        heatmapCtx.fillStyle = gradient;
        heatmapCtx.arc(x, y, 50, 0, Math.PI * 2);
        heatmapCtx.fill();
    });

    // Draw the heatmap on top of the image
    ctx.drawImage(heatmapCtx.canvas, 0, 0);
}

// Function to draw individual gaze points
function drawGazePoints(gazePoints, ctx, canvasWidth, canvasHeight) {
    if (!gazePoints || !gazePoints.length) {
        console.warn('No gaze points provided to draw');
        return;
    }
    
    console.log(`Drawing ${gazePoints.length} gaze points on canvas ${canvasWidth}x${canvasHeight}`);
    
    // Draw each gaze point as a small circle
    gazePoints.forEach((point, index) => {
        if (!point) {
            console.warn(`Point at index ${index} is null or undefined`);
            return;
        }
        
        // Handle different point formats
        const x = point.x || point.gazePoint?.x || 0;
        const y = point.y || point.gazePoint?.y || 0;
        
        // Skip if coordinates are invalid
        if (isNaN(x) || isNaN(y)) {
            console.warn(`Invalid coordinates at index ${index}:`, point);
            return;
        }
        
        // Ensure coordinates are within canvas bounds
        const boundedX = Math.max(0, Math.min(x, canvasWidth));
        const boundedY = Math.max(0, Math.min(y, canvasHeight));
        
        // Draw outer circle (red)
        ctx.beginPath();
        ctx.arc(boundedX, boundedY, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fill();
        
        // Draw inner circle (white)
        ctx.beginPath();
        ctx.arc(boundedX, boundedY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // Draw border
        ctx.beginPath();
        ctx.arc(boundedX, boundedY, 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        console.log(`Drew point at (${boundedX}, ${boundedY})`);
    });
    
    // Draw a border around the canvas for debugging
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
}

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
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)' );

    // Draw each gaze point with a gradient circle
    // Iterate through gaze points to create a heatmap
    gazePoints.forEach(point => {
        const { x, y } = point;
        const radius = 30; // You can adjust the radius for the heatmap effect
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= radius) {
                    const index = ((y + dy) * canvasWidth + (x + dx)) * 4;
                    if (index >= 0 && index < canvasWidth * canvasHeight * 4) {
                        const imageData = ctx.getImageData(x + dx, y + dy, 1, 1);
                        imageData.data[0] += 255 * (1 - distance / radius); // Red channel
                        imageData.data[1] += 0; // Green channel
                        imageData.data[2] += 0; // Blue channel
                        imageData.data[3] = 50; // Semi-transparent
                        ctx.putImageData(imageData, x + dx, y + dy);
                    }
                }
            }
        }
    });

    // Draw heatmap onto the heatmap canvas
    ctx.drawImage(heatmapCtx.canvas, 0, 0); // Overlay heatmap on top of the image
}

// Function to draw individual gaze points
function drawGazePoints(gazePoints, ctx, canvasWidth, canvasHeight) {
    // Draw each gaze point as a small circle
    gazePoints.forEach(point => {
        const { x, y } = point; // Assuming point has x, y coordinates
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)'; // Red gaze points
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Function to calculate average gaze duration
function calculateAverageDuration(gazePoints) {
    if (gazePoints.length < 2) return '0.00s';
    
    // Calculate the total duration by finding the difference between consecutive gaze points
    let totalDuration = 0;
    for (let i = 1; i < gazePoints.length; i++) {
        totalDuration += gazePoints[i].timestamp - gazePoints[i - 1].timestamp;
    }
    
    // Divide by number of intervals (gazePoints.length - 1)
    const averageDuration = totalDuration / (gazePoints.length - 1) / 1000; // Convert to seconds
    return averageDuration.toFixed(2) + 's';
}

// Function to calculate total gaze duration
function calculateTotalDuration(gazePoints) {
    if (gazePoints.length === 0) return '0.00s';
    
    // Calculate the total duration from first to last gaze point
    const totalDuration = (gazePoints[gazePoints.length - 1].timestamp - gazePoints[0].timestamp) / 1000; // Convert to seconds
    return totalDuration.toFixed(2) + 's';
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
    const imgWidth = 280; // Adjust width to fit in PDF
    const imgHeight = (canvas.height * imgWidth) / canvas.width; // Maintain aspect ratio
    doc.addImage(imgData, 'PNG', 10, 70, imgWidth, imgHeight);
    
    // Save the PDF
    doc.save('gaze_report.pdf');
}
