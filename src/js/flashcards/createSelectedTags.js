import { lockedTags } from './saveData.js';

const createSlider = () => {
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 1;
  slider.max = 6;
  slider.value = 1;
  slider.classList.add('slider');
  
  const sliderValue = document.createElement('span');
  sliderValue.classList.add('slider-value');
  sliderValue.innerHTML = slider.value;
  slider.oninput = () => {
    sliderValue.innerHTML = slider.value;
  };
  
  return [slider, sliderValue];
};

const createTagName = (selectedTag) => {
  const tagName = document.createElement('span');
  tagName.classList.add('name', 'center');
  tagName.textContent = selectedTag;
  return tagName;
};

const createLockToggle = (selectedDiv) => {
  const lockToggle = document.createElement('button');
  lockToggle.type = 'button';
  lockToggle.classList.add('lock-toggle', 'center');
  
  const lockIcon = document.createElement('i');
  lockIcon.classList.add('fa-solid', 'fa-unlock');
  lockToggle.appendChild(lockIcon);
  
  lockToggle.addEventListener('click', () => {
    toggleLock(selectedDiv, lockIcon);
  });
  
  return lockToggle;
};

const toggleLock = (selectedDiv, lockIcon) => {
  const isLocked = selectedDiv.dataset.locked === 'true';
  selectedDiv.dataset.locked = isLocked ? 'false' : 'true';
  lockIcon.classList.toggle('fa-lock');
  lockIcon.classList.toggle('fa-unlock');
  lockedTags(!isLocked);
};

const createRemoveBtn = (selectedDiv) => {
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.classList.add('remove-btn', 'center');
  
  const removeIcon = document.createElement('i');
  removeIcon.classList.add('fa-solid', 'fa-trash-can');
  removeBtn.appendChild(removeIcon);
  
  removeBtn.addEventListener('click', () => {
    const tag = selectedDiv.dataset.tag;
    removeTag(tag);
  });
  
  return removeBtn;
};

const appendToNewDiv = (classList, elements) => {
  const newDiv = document.createElement('div');
  newDiv.classList.add(...classList.split(' '));
  elements.forEach(el => newDiv.appendChild(el));
  return newDiv;
};

export { 
  createSlider, 
  createTagName, 
  createLockToggle, 
  createRemoveBtn, 
  appendToNewDiv 
};