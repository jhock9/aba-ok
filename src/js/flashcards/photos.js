const displayedImages = document.querySelector('#images-container');
let lockedPhoto = null;

import { toggleLockedPhoto } from './saveData.js';

// Fetch photos data from database
const fetchPhotosData = async (tags) => {
  console.log('Fetching photos data...');
  try {
    const response = await fetch('/photos/get-photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    const photos = await response.json();
    console.log('Photos data fetched...');
    return photos;
  } catch (error) {
    console.error('Error fetching photos:', error);
  }
};

const filterPhotosByTags = (photos, selectedTagsAndQuantities, totalPhotos, useRemainder) => {
  console.log('filterPhotosByTags called...');
  
  let filteredPhotos = [];
  let selectedPhotoIds = new Set(); // Keep track of the selected photo IDs
  // Sum of all photos that are intended to be selected (based on slider values)
  let intendedTotal = selectedTagsAndQuantities.reduce((acc, { quantity }) => acc + parseInt(quantity, 10), 0);
  
  // If there's a saved photo and it's not already in the filtered photos, include it
  if (lockedPhoto && !selectedPhotoIds.has(lockedPhoto.googleId)) {
    console.log('Adding locked photo to filtered photos...');
    filteredPhotos.unshift(lockedPhoto);
    selectedPhotoIds.add(lockedPhoto.googleId);
    intendedTotal = Math.max(0, intendedTotal - 1);
  }
  
  console.log('Initial filtered photos:', filteredPhotos);

  console.log('Intended total:', intendedTotal);

  // If the intended total exceeds the maximum total of 10, adjust the quantities
  if (intendedTotal > 10) {
    console.log('Adjusting quantities...');
    selectedTagsAndQuantities = selectedTagsAndQuantities.map(({ tag, quantity }) => {
      const proportion = quantity / intendedTotal;
      const adjustedQuantity = Math.round(proportion * 10);
      return { tag, quantity: adjustedQuantity };
    });
    
    // Recalculate the intended total
    intendedTotal = selectedTagsAndQuantities.reduce((acc, { quantity }) => acc + parseInt(quantity, 10), 0);
  }
  
  console.log('Adjusted intended total:', intendedTotal);

  // Calculate how many more photos are needed to meet the total
  let remainingPhotos = Math.max(0, totalPhotos - intendedTotal);
  
  console.log('Remaining photos:', remainingPhotos);

  // Loop through each tag and quantity
  for (const { tag, quantity } of selectedTagsAndQuantities) {
    console.log(`Processing tag: ${tag}, quantity: ${quantity}`);

    const selectedPhotos = photos.filter(photo => 
      photo.tagsFromGoogle && photo.tagsFromGoogle.includes(tag) && !selectedPhotoIds.has(photo.googleId));
    
    shuffleArray(selectedPhotos);
    const photosToDisplay = selectedPhotos.slice(0, quantity);
    
    photosToDisplay.forEach(photo => selectedPhotoIds.add(photo.googleId)); // Add selected photo IDs to the Set
    filteredPhotos.push(...photosToDisplay);
  }
  console.log('Filtered photos after processing tags:', filteredPhotos);

  // If 'useRemainder' is checked and there are remaining photos to be filled
  if (useRemainder && remainingPhotos > 0) {
    const additionalPhotos = photos.filter(photo => !selectedPhotoIds.has(photo.googleId));
    shuffleArray(additionalPhotos);
    const additionalPhotosToDisplay = additionalPhotos.slice(0, Math.min(remainingPhotos, totalPhotos - filteredPhotos.length));
    filteredPhotos.push(...additionalPhotosToDisplay);
  }
  console.log('Filtered photos after adding remainder:', filteredPhotos);

  // Finally, slice the array based on 'totalPhotos'
  if (totalPhotos > 0) {
    console.log('Slicing filtered photos to total photos...');
    filteredPhotos = filteredPhotos.slice(0, totalPhotos);
  }
  console.log('Final filtered photos:', filteredPhotos);

  shuffleArray(filteredPhotos);
  return filteredPhotos;
};

const shuffleArray = (array) => {
  console.log('Shuffling array...');
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  
  return array;
};

const displayPhotos = (photos) => {
  console.log('displayPhotos called...');
  displayedImages.innerHTML = '';
  const numPhotos = photos.length;
  let flexBasis;
  
  if (numPhotos > 6) {
    flexBasis = `calc((100% / 5) - 2rem)`;
  } else if (numPhotos > 4) {
    flexBasis = `calc((100% / 4) - 2rem)`;
  } else if (numPhotos > 1) {
    flexBasis = `calc((100% / 3) - 2rem)`;
  } else {
    flexBasis = `calc(60% - 2rem)`;
  }
  
  for (let i = 0; i < numPhotos; i++) {
    const img = document.createElement('img');
    img.src = photos[i].baseUrl;
    img.classList.add('image');
    img.style.flexBasis = flexBasis;
    img.photoData = photos[i];
    lockPhoto(img);
    displayedImages.appendChild(img);
    img.classList.remove('locked-photo');
  }
};

const lockPhoto = (photo) => {
  photo.addEventListener('click', async () => {
    // If another photo is already locked, unlock it
    if (lockedPhoto && lockedPhoto !== photo.photoData) {
      await toggleLockedPhoto(lockedPhoto._id, false);
      lockedPhoto.classList.remove('locked-photo');
    }
    
    // Toggle the lock status of the clicked photo
    const save = !photo.classList.contains('locked-photo');
    await toggleLockedPhoto(photo._id, save);
    photo.classList.toggle('locked-photo');
    
    // Update the currently locked photo
    lockedPhoto = save ? photo.photoData : null;
  });
};

// Export to flashcards.js
export {
  fetchPhotosData, // fetchPhotosData(tags)
  filterPhotosByTags, // filterPhotosByTags(photos, selectedTagsAndQuantities, totalPhotos, useRemainder)
  displayPhotos, // displayPhotos(photos)
};
