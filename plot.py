import json
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
from matplotlib.backends.backend_pdf import PdfPages
import tkinter as tk
from tkinter import filedialog
import os

# Function to select a JSON file
def select_file():
    root = tk.Tk()
    root.withdraw()  # Hide the root window
    file_path = filedialog.askopenfilename(title='Select JSON File', filetypes=[('JSON Files', '*.json')])
    return file_path

# Load JSON data from the selected file
json_file_path = select_file()

if json_file_path:  # Check if a file was selected
    with open(json_file_path, 'r') as f:
        gaze_data = json.load(f)

    # Lists to store the extracted data
    image_paths = []
    x_points = []
    y_points = []

    # Extracting data from the JSON structure
    for entry in gaze_data:
        image_paths.append(entry['imagePath'])
        x_points.append(entry['gazePoint']['x'])
        y_points.append(entry['gazePoint']['y'])

    # Create a PDF file to save the plots
    pdf_file_path = 'gaze_plot_report.pdf'
    with PdfPages(pdf_file_path) as pdf:
        # Loop through each unique image path and plot gaze points
        for image_path in set(image_paths):
            # Filter gaze points for the current image
            indices = [i for i, path in enumerate(image_paths) if path == image_path]
            x_current = [x_points[i] for i in indices]
            y_current = [y_points[i] for i in indices]

            # Check if the image file exists
            if not os.path.isfile(image_path):
                print(f"Image file not found: {image_path}. Skipping this image.")
                continue  # Skip to the next image if not found

            # Load and plot the image
            img = mpimg.imread(image_path)

            plt.figure(figsize=(10, 6))
            plt.imshow(img)

            # Plot gaze points
            plt.scatter(x_current, y_current, c='red', s=50, label='Gaze Points', alpha=0.7)
            plt.title(f'Gaze Points on {os.path.basename(image_path)}')
            plt.xlabel('X Coordinate')
            plt.ylabel('Y Coordinate')

            # Set limits based on image dimensions
            plt.xlim(0, img.shape[1])  # Set limits based on image width
            plt.ylim(img.shape[0], 0)   # Set limits based on image height (inverted Y-axis)

            plt.legend()
            plt.grid()
            # Save the current plot to the PDF
            pdf.savefig()  # saves the current figure into a pdf page
            plt.close()  # Close the figure window to free up memory

    print(f"PDF report saved as '{pdf_file_path}'.")
else:
    print("No file selected.")
