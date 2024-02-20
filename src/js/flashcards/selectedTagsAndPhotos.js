// Get the appointment data from the URL and initialize the page
const urlParams = new URLSearchParams(window.location.search);
const appointmentData = JSON.parse(decodeURIComponent(urlParams.get('appointment')));
const appointmentId = appointmentData._id;

const selectedTagsWrapper = document.querySelector('#selected-tags-wrapper');
const removeBtns = document.querySelectorAll('.remove-btn');
const lockedPhotoBtn = document.querySelector('#locked-photo-btn');
let selectedTags = [];

import {

  appendToNewDiv, // appendToNewDiv(classList, elements)
  createLockToggle, // createLockToggle(selectedDiv)
  createRemoveBtn, // createRemoveBtn(selectedDiv, callback, lockedPhoto)
  createSlider, // createSlider(selectedTag)
  createTagName, // createTagName(selectedTag)
} from './createSelectedTagDivs.js';
import { lockedPhoto, setLockedPhoto } from './photos.js'; // global variable, setLockedPhoto(savedPhoto)
import {
  toggleLockedPhoto, // toggleLockedPhoto(photoId, selectedTag, save = true) 
  toggleLockedTags, // toggleLockedTags(save = true, tag = null)

} from './saveData.js';

// Load saved tags
const loadSelectedDivs = async (filterInput) => {
  console.log('loadSelectedDivs called...');
  toggleBorders();
  
  const tagsResponse = await fetch(`/appointment/${appointmentId}/load-tags`);
  const tagData = await tagsResponse.json();
  const savedTags = tagData.savedTags;
  
  const photoResponse = await fetch(`/appointment/${appointmentId}/load-photo`);
  const photoData = await photoResponse.json();
  setLockedPhoto(photoData.savedPhotos);
  
  selectedTagsWrapper.innerHTML = '';
  selectedTags = [];
  
  savedTags.forEach(tagInfo => {
    const { name, qty } = tagInfo;
    
    const proceed = handleTagSelection(name, filterInput, null);
    if (!proceed) {
      return;
    }
    
    // Modify the slider value to reflect stored quantity
    const selectedDiv = createSelectedTagDiv(name);
    const slider = selectedDiv.querySelector('.slider');
    const sliderValue = selectedDiv.querySelector('.slider-value');
    slider.value = qty;
    sliderValue.textContent = qty;
    
    // Set tag to locked
    const lockIcon = selectedDiv.querySelector('.fa-solid');
    selectedDiv.dataset.locked = 'true';
    lockIcon.classList.add('fa-lock');
    lockIcon.classList.remove('fa-unlock');
  });
  
  // If there is a locked photo, create a div for it
  if (lockedPhoto !== null) {
    createLockedPhotoDiv(lockedPhoto);
    toggleBorders();
  } else {
    console.log('No locked photo');
  };
  
  resetTagSelect(filterInput);
};

const handleTagSelection = (selectedTag, filterInput, sourceElement = null) => {
  console.log('handleTagSelection called...');
  // Check if the tag is already selected
    if (selectedTags.includes(selectedTag)) {
    removeSelectedDiv(selectedTag);
    resetTagSelect(filterInput);
    return false;
  }
  
  // Check if 4 tags have already been selected
  if (selectedTags.length >= 4) {
    return false;
  }
  
  selectedTags.push(selectedTag);
  toggleBorders();
  
  if (sourceElement) sourceElement.classList.add('selected');
  
  return true;
};

// Creating selected tag divs
const createSelectedTagDiv = (selectedTag) => {
  // Create a new div for the selected tag
  const selectedDiv = document.createElement('div');
  selectedDiv.classList.add('selected-div', 'selected-tag-div', 'center');
  selectedDiv.dataset.tag = selectedTag; // Add a data attribute to identify the tag
  
  // Create elements
  const [slider, sliderValue] = createSlider(selectedTag);
  const tagName = createTagName(selectedTag);
  const lockToggle = createLockToggle(selectedDiv);
  const removeBtn = createRemoveBtn(selectedDiv, removeSelectedDiv); // using removeSelectedDiv() in place of callback here
  
  // Append elements
  const sliderTagDiv = appendToNewDiv('slider-tag-div center', [slider, sliderValue, tagName]);
  const iconDiv = appendToNewDiv('icon-div center', [lockToggle, removeBtn]);
  
  selectedDiv.appendChild(sliderTagDiv);
  selectedDiv.appendChild(iconDiv);
  selectedTagsWrapper.appendChild(selectedDiv);
  
  return selectedDiv;
};

const removeSelectedDiv = async (divToRemove) => {
  // The divToRemove is either a tag name (for selected/locked TAG divs) or a photo ID (for locked PHOTO divs)
  console.log('removeSelectedDiv called...');
  
  // Check if this is a locked photo
  if (lockedPhoto && divToRemove === lockedPhoto.photoData._id) {
    console.log('Locked photo found...');
    await removeLockedPhoto(lockedPhoto.photoData._id, lockedPhoto, lockedPhoto.tag);
  }
  
  // Remove the TAG divToRemove from the selectedTags array
  selectedTags = selectedTags.filter(tag => tag !== divToRemove);
  
  // Remove the divToRemove from the selected-tags-wrapper
  const selectedDiv = document.querySelector(`.selected-div[data-tag="${divToRemove}"]`);
  if (selectedDiv) {
    console.log('Tag removed from database...');
    toggleLockedTags(false, divToRemove); // Removes tag divs from database
    selectedDiv.remove(); // Removes tag from DOM after it's removed from the database
    console.log('Tag removed from DOM...')
  } else {
    console.log('Tag not found in database or DOM...');
  }
  
  // Deselect the TAG divToRemove from the tags-list
  const tagSpan = Array.from(document.querySelectorAll('.tag .name')).find(span => span.textContent === divToRemove);
  if (tagSpan) {
    tagSpan.classList.remove('selected');
  }
  toggleBorders();
};

const clearSelectedDivs = (removeLockedTags = false) => {
  console.log('clearSelectedDivs called...');
  let selectedDivs = Array.from(document.querySelectorAll('.selected-div'));
  
  selectedDivs.forEach((div) => {
    // Check if the div is a locked tag or a locked photo
    const isLockedTag = div.dataset.locked === 'true';
    const isLockedPhoto = lockedPhoto && div.dataset.tag === lockedPhoto.photoData._id;
    
    // if removeLockedTags is true, or if the isLockedTag and isLockedPhoto are both false, remove the tag
    if (removeLockedTags || (!isLockedTag && !isLockedPhoto)) {
      const divToRemove = isLockedPhoto ? lockedPhoto.photoData._id : div.dataset.tag;
      removeSelectedDiv(divToRemove); // Removes from DOM and database
      }
  });
  
  // Filter selectedTags array to only include locked tags
  selectedTags = selectedTags.filter(tag => !removeLockedTags || tag.locked);
  
  // Check if there are any locked tags
  const lockedTags = selectedTags.filter(tag => tag.locked);
  
  // Clear locked tags from database if removeLockedTags is true
  if (removeLockedTags && (lockedTags.length > 0 || lockedPhoto)) {
    console.log('Clearing locked tags and photo from database...')
    toggleLockedTags(false); 
  } else if (lockedTags.length > 0) {
    console.log('Keeping locked tags on database...')
    toggleLockedTags(true);
  };
  
  toggleBorders();
};

// Reset dropdown, filterInput and tags in tagsList
const resetTagSelect = (filterInput) => {
  // dropdown.selectedIndex = 0;
  const tags = document.querySelectorAll(".tag");
  tags.forEach(tag => tag.classList.remove("hide")); 
  filterInput.value = "";
}

// Toggle borders on selected tags wrapper
const toggleBorders = () => {
  const visibleTags = selectedTags.filter (tag => !tag.locked);
  if (visibleTags.length >= 1 || lockedPhoto) {
    selectedTagsWrapper.classList.add('show-borders');
    selectedTagsWrapper.classList.remove('hide');
  } else {
    selectedTagsWrapper.classList.remove('show-borders');
    selectedTagsWrapper.classList.add('hide');
  }
}

removeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    console.log('Remove button clicked..');
    // Select the div to remove based on the button's parent element dataset tag value
    const selectedDiv = btn.parentElement.dataset.tag;
    removeSelectedDiv(selectedDiv);
  });
});

const removeLockedPhoto = async (photoId, lockedPhoto, selectedTag) => {
  console.log('removeLockedPhoto called...');
  if (!photoId || !lockedPhoto) {
    console.log(`photoId: ${photoId}, lockedPhoto: ${JSON.stringify(lockedPhoto, null, 2)}, selectedTag: ${selectedTag} identified as null or undefined`);
    return;
  };
  
  // Check if the photo is locked
  if (lockedPhoto && photoId === lockedPhoto.photoData._id) {
    // Remove the photo from the database
    await toggleLockedPhoto(photoId, selectedTag, false);
    
    // Remove the photo from the DOM
    const images = Array.from(document.getElementsByClassName('image'));
    const photoElement = images.find(img => img.photoData._id === photoId);
    
    if (photoElement) {
      console.log('Removing photo from DOM...');
      photoElement.classList.remove('locked-photo');
    } else {
    console.log('Photo element not found in DOM');
    }
    
    // Remove the locked photo div from the selectedTagsWrapper
    const lockedPhotoDiv = document.querySelector(`.selected-photo-div[data-tag="${photoId}"]`);
    if (lockedPhotoDiv) {
      console.log('Removing locked photo div...');
      lockedPhotoDiv.remove();
    } else {
      console.log('Locked photo div not found in DOM');
    }
  }
  console.log('Hiding locked photo container and toggling borders...');
  lockedPhotoBtn.classList.add('hide');
  
  setLockedPhoto(null); // Resets lockedPhoto to null
  toggleBorders();
};

const createLockedPhotoDiv = (lockedPhoto) => {
  console.log('createLockedPhotoDiv called...');
  
  const selectedDiv = document.createElement('div');
  selectedDiv.classList.add('selected-div', 'selected-photo-div', 'center');
  selectedDiv.dataset.tag = lockedPhoto.photoData._id; 
  
  const tagText = document.createElement('span');
  tagText.classList.add('tag-text', 'center');
  tagText.innerHTML = "Image tag locked:";
  
  const tagName = document.createElement('span');
  tagName.classList.add('name', 'center');
  tagName.textContent = lockedPhoto.tag; 
  
  const removeBtn = createRemoveBtn(selectedDiv, removeLockedPhoto, lockedPhoto);
  
  const tagNameDiv = appendToNewDiv('locked-photo-name center', [tagText, tagName]);
  
  selectedDiv.appendChild(tagNameDiv);
  selectedDiv.appendChild(removeBtn);  
  selectedTagsWrapper.prepend(selectedDiv);
  console.log('Locked photo div added to selected tags wrapper...');
  toggleBorders();
};

lockedPhotoBtn.addEventListener('click', async () => {
  console.log('Locked photo button clicked to unlock...');
  if (lockedPhoto) {
    console.log('lockedPhoto:', lockedPhoto);
    await removeLockedPhoto(lockedPhoto.photoData._id, lockedPhoto, lockedPhoto.tag); // Resets lockedPhoto to null
  }
});

// Export to flashcards.js
export {
  clearSelectedDivs, // clearSelectedDivs(removeLockedTags = false)
  createSelectedTagDiv, // createSelectedTagDiv(selectedTag)
  handleTagSelection, // handleTagSelection(selectedTag, filterInput, sourceElement = null)
  loadSelectedDivs, // loadSelectedDivs(filterInput)
  resetTagSelect, // resetTagSelect(filterInput)
  toggleBorders, // toggleBorders()
  removeLockedPhoto, // export to photos.js, removeLockedPhoto(photoId, lockedPhoto, selectedTag) 
};

