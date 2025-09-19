// King Dice Image Extractor Bookmarklet
// Drag this to your bookmarks bar for easy access on any webpage

javascript:(function(){
  // Create a floating panel
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    max-height: 500px;
    background: white;
    border: 2px solid #fbae17;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    overflow-y: auto;
  `;

  // Find all images on the page
  const images = Array.from(document.querySelectorAll('img')).filter(img => 
    img.src && 
    !img.src.startsWith('data:') && 
    img.naturalWidth > 50 && 
    img.naturalHeight > 50 &&
    !img.src.includes('avatar') &&
    !img.src.includes('icon') &&
    !img.src.includes('logo')
  );

  if (images.length === 0) {
    panel.innerHTML = `
      <div style="padding: 15px; text-align: center; color: #666;">
        <h3 style="margin: 0 0 10px 0; color: #333;">No Images Found</h3>
        <p style="margin: 0;">No suitable images found on this page.</p>
        <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px; background: #fbae17; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;
  } else {
    let selectedImages = new Set();
    
    const updateUI = () => {
      panel.innerHTML = `
        <div style="padding: 15px; border-bottom: 1px solid #eee;">
          <h3 style="margin: 0 0 10px 0; color: #333;">King Dice Image Extractor</h3>
          <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">Found ${images.length} images. Select the ones you want to copy.</p>
          <div style="display: flex; gap: 5px; margin-bottom: 10px;">
            <button onclick="selectAll()" style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Select All</button>
            <button onclick="clearAll()" style="padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Clear</button>
            <button onclick="copySelected()" style="padding: 5px 10px; background: #fbae17; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Copy Selected (${selectedImages.size})</button>
          </div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${images.map((img, index) => `
            <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #f0f0f0; cursor: pointer;" onclick="toggleImage(${index})">
              <input type="checkbox" ${selectedImages.has(index) ? 'checked' : ''} style="margin-right: 10px;">
              <img src="${img.src}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 10px;">
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: bold; font-size: 12px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${img.alt || 'Image ' + (index + 1)}</div>
                <div style="font-size: 10px; color: #666;">${img.naturalWidth}×${img.naturalHeight}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="padding: 15px; text-align: center; border-top: 1px solid #eee;">
          <button onclick="this.parentElement.parentElement.remove()" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        </div>
      `;
    };

    // Global functions for the panel
    window.selectAll = () => {
      selectedImages = new Set(images.map((_, i) => i));
      updateUI();
    };

    window.clearAll = () => {
      selectedImages = new Set();
      updateUI();
    };

    window.toggleImage = (index) => {
      if (selectedImages.has(index)) {
        selectedImages.delete(index);
      } else {
        selectedImages.add(index);
      }
      updateUI();
    };

    window.copySelected = async () => {
      if (selectedImages.size === 0) {
        alert('Please select at least one image.');
        return;
      }

      try {
        const imageData = [];
        for (const index of selectedImages) {
          const img = images[index];
          const response = await fetch(img.src);
          const blob = await response.blob();
          const reader = new FileReader();
          const base64 = await new Promise(resolve => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          imageData.push({
            src: base64,
            alt: img.alt || `Image ${index + 1}`,
            width: img.naturalWidth,
            height: img.naturalHeight
          });
        }

        // Store in localStorage for the King Dice app to pick up
        localStorage.setItem('kingDiceExtractedImages', JSON.stringify(imageData));
        
        // Show success message
        alert(`Successfully copied ${selectedImages.size} images! You can now paste them in the King Dice editor.`);
        
        // Close the panel
        panel.remove();
      } catch (error) {
        alert('Error copying images: ' + error.message);
      }
    };

    updateUI();
  }

  // Add close button functionality
  panel.addEventListener('click', (e) => {
    if (e.target === panel) {
      panel.remove();
    }
  });

  document.body.appendChild(panel);
})();
