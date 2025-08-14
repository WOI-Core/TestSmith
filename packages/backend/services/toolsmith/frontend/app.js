document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('problem-form');
    const statusEl = document.getElementById('status');
    const previewSection = document.getElementById('preview-section');
    const fileSelector = document.getElementById('file-selector');
    const fileContentEl = document.getElementById('file-content');
    const downloadButton = document.getElementById('download-button');
    const uploadButton = document.getElementById('upload-button');
    const generateButton = document.getElementById('generate-button');
    const buttonText = document.getElementById('button-text');

    let generatedBlob = null;
    let zipFileName = '';
    let lastRequestData = null; // Store the last request for the upload

    // --- Generate Preview ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        statusEl.textContent = 'Generating... Please wait, this may take a moment.';
        statusEl.className = 'status-area';
        previewSection.style.display = 'none';
        generateButton.disabled = true;
        buttonText.textContent = 'Generating...';

        lastRequestData = {
            content_name: document.getElementById('problemName').value,
            cases_size: parseInt(document.getElementById('testCases').value, 10),
            detail: document.getElementById('description').value,
        };

        try {
            const response = await fetch('http://127.0.0.1:8000/generate-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lastRequestData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'An unknown server error occurred.');
            }

            statusEl.textContent = 'Preview generated successfully! Review the files and click "Upload" to save.';
            generatedBlob = await response.blob();
            
            const contentDisposition = response.headers.get('content-disposition');
            zipFileName = contentDisposition ? contentDisposition.split('filename=')[1].replace(/"/g, '') : `${lastRequestData.content_name}.zip`;

            const zip = await JSZip.loadAsync(generatedBlob);
            
            fileSelector.innerHTML = ''; 
            Object.keys(zip.files).forEach(filename => {
                if (!zip.files[filename].dir) {
                    const option = document.createElement('option');
                    option.value = filename;
                    option.textContent = filename;
                    fileSelector.appendChild(option);
                }
            });

            const displayFile = async () => {
                const selectedFile = fileSelector.value;
                if (selectedFile && zip.files[selectedFile]) {
                    fileContentEl.textContent = await zip.files[selectedFile].async('string');
                }
            };
            fileSelector.onchange = displayFile;
            await displayFile();

            previewSection.style.display = 'block';

        } catch (error) {
            statusEl.textContent = `Error: ${error.message}`;
            statusEl.classList.add('error');
        } finally {
            generateButton.disabled = false;
            buttonText.textContent = 'Generate Problem';
        }
    });

    // --- Upload to Database ---
    uploadButton.addEventListener('click', async () => {
        if (!lastRequestData) {
            statusEl.textContent = 'No data to upload. Please generate a problem first.';
            statusEl.classList.add('error');
            return;
        }

        uploadButton.disabled = true;
        uploadButton.textContent = 'Uploading...';
        statusEl.textContent = 'Uploading task and all files to the database...';
        statusEl.className = 'status-area';

        try {
            // Send only the initial user request data
            const response = await fetch('http://127.0.0.1:8000/upload-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lastRequestData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to upload.');
            }

            // Handle the success response
            const result = await response.json();
            statusEl.textContent = result.message;
            statusEl.classList.add('success');

        } catch (error) {
            statusEl.textContent = `Upload failed: ${error.message}`;
            statusEl.classList.add('error');
        } finally {
            // This part was missing
            uploadButton.disabled = false;
            uploadButton.textContent = 'Approve and Upload to Database';
        }
    });

    // --- Download Button ---
    downloadButton.addEventListener('click', () => {
        if (generatedBlob) {
            const url = window.URL.createObjectURL(generatedBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = zipFileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        }
    });
});