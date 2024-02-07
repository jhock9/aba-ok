const displayedImages = document.querySelector('#images-container');
const lockedPhotoBtn = document.querySelector('#locked-photo-btn');
let lockedPhoto = null;

import { removeLockedPhoto } from './selectedTags.js'; // removeLockedPhoto(selectedTag)
import { toggleLockedPhoto } from './saveData.js'; // toggleLockedPhoto(selectedTag, tag, save = true)
import {
  adjustQuantities, // adjustQuantities(selectedTagsAndQuantities, intendedTotal)
  processTags, // processTags(photos, selectedTagsAndQuantities, selectedPhotoIds)
  addRemainingPhotos, // addRemainingPhotos(photos, filteredPhotos, remainingPhotos, selectedPhotoIds)
  addPhotos, // addPhotos(photosToAdd, selectedPhotoIds, filteredPhotos, lockedPhoto, intendedTotal)
  shuffleArray, // shuffleArray(array)
} from './photoHelpers.js';

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
  
  // If there is a locked photo, add it to the selectedPhotoIds
  if (lockedPhoto) {
    selectedPhotoIds.add(lockedPhoto.photoData.googleId);
  }
  
  // Sum of all photos that are intended to be selected (based on slider values)
  let intendedTotal = selectedTagsAndQuantities.reduce((acc, { quantity }) => acc + parseInt(quantity, 10), 0);
  console.log('Intended total:', intendedTotal);
  console.log('Total photos:', totalPhotos);
  
  // If the intended total exceeds the maximum total of 10, adjust the quantities
  if (intendedTotal > 10) {
    selectedTagsAndQuantities = adjustQuantities(selectedTagsAndQuantities, intendedTotal);
    intendedTotal = selectedTagsAndQuantities.reduce((acc, { quantity }) => acc + parseInt(quantity, 10), 0);
  }
  
  // If the intended total is less than the maximum total, add photos based on the tags and quantities
  const photosToAdd = processTags(photos, selectedTagsAndQuantities, selectedPhotoIds);
  addPhotos(photosToAdd, selectedPhotoIds, filteredPhotos, lockedPhoto, intendedTotal);
  
  // If there are still photos remaining, add them to the filtered photos
  let remainingPhotos = Math.max(0, totalPhotos - filteredPhotos.length);
  console.log('Remaining photos:', remainingPhotos);
  
  // If 'userRemainder' is true, add any remaining photos to the filtered photos
  if (useRemainder && remainingPhotos > 0) {
    const photosToAdd = addRemainingPhotos(photos, filteredPhotos, remainingPhotos, selectedPhotoIds);
    addPhotos(photosToAdd, selectedPhotoIds, filteredPhotos, lockedPhoto, intendedTotal);
  }
  
  // Slice the array based on 'totalPhotos'
  if (totalPhotos > 0) {
    console.log('Slicing filtered photos to total photos...');
    filteredPhotos = filteredPhotos.slice(0, totalPhotos);
  }
  
  shuffleArray(filteredPhotos);
  return filteredPhotos;
};

const displayPhotos = (filteredPhotos) => {
  console.log('displayPhotos called...');
  displayedImages.innerHTML = '';
  const numPhotos = filteredPhotos.length;
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
    img.src = filteredPhotos[i].photoData.baseUrl;
    img.classList.add('image');
    img.style.flexBasis = flexBasis;
    img.photoData = filteredPhotos[i].photoData;
    img.tag = filteredPhotos[i].tag;
    lockPhoto(img);
    displayedImages.appendChild(img);
    img.classList.remove('locked-photo');
  }
};

const lockPhoto = (img) => {
  // Lock or unlock the photo when clicked
  img.addEventListener('click', async () => {
    console.log('Image clicked...');
    // If another photo is already locked and it's not the one being clicked, unlock it
    if (lockedPhoto && lockedPhoto.photoData._id !== img.photoData._id) {
      console.log('Another photo is already locked, unlocking it...');
      console.log('Locked photo:', lockedPhoto); 
      if (lockedPhoto.classList) {
        lockedPhoto.classList.toggle('locked-photo');
      }
      // Remove the locked photo div from the selectedTagsWrapper, set lockedPhoto to null
      lockedPhoto = await removeLockedPhoto(lockedPhoto.photoData._id, lockedPhoto);
    }
    // Toggle the lock status of the clicked photo
    const save = !img.classList.contains('locked-photo');
    if (save) {
      console.log('Toggling lock status of clicked photo...');
      await toggleLockedPhoto(img.photoData._id, img.tag, save);
      img.classList.toggle('locked-photo');
      lockedPhoto = {photoData: img.photoData, tag: img.tag};
      lockedPhotoBtn.classList.remove('hide');
    } else {
      removeLockedPhoto(img.photoData._id, lockedPhoto);
    }
  });
};

// Set the locked photo
const setLockedPhoto = (photo) => {
  lockedPhoto = photo;
};

// Export to flashcards.js and selectedTags.js
export {
  fetchPhotosData, // fetchPhotosData(tags)
  filterPhotosByTags, // filterPhotosByTags(photos, selectedTagsAndQuantities, totalPhotos, useRemainder)
  displayPhotos, // displayPhotos(filteredPhotos)
  lockedPhoto, // Export to selectedTags.js // global variable
  setLockedPhoto, // Export to selectedTags.js // setLockedPhoto(photo)
};
