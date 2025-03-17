// --------------------- Validation Constants ---------------------
const TEXT_MAX_LENGTH = 100;
const NUMBER_MIN = 1;
const NUMBER_MAX = 100;
const DATE_MIN = "2020-01-01";
const DATE_MAX = "2025-12-31";

// --------------------- Global Variables & State ---------------------
let questionCounter = 0;
let draggedElement = null;
let currentActiveQuestion = null;
let db; // IndexedDB instance for file uploads

const state = {
  elements: {},
  get: function(key) {
    if (!this.elements[key]) {
      this.elements[key] = document.getElementById(key) || document.querySelector(`.${key}`);
    }
    return this.elements[key];
  }
};

// --------------------- IndexedDB Functions ---------------------
function initDB() {
  const request = indexedDB.open("SubmissionDB", 1);
  
  request.onerror = (event) => console.error("IndexedDB error:", event.target.error);
  
  request.onsuccess = (event) => {
    db = event.target.result;
  };
  
  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("files")) {
      db.createObjectStore("files", { keyPath: "id" });
    }
  };
}

function dbOperation(storeName, mode, operation) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("DB not initialized"));
      return;
    }
    
    const transaction = db.transaction([storeName], mode);
    const store = transaction.objectStore(storeName);
    
    const request = operation(store);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveFileToDB(id, file) {
  return dbOperation("files", "readwrite", (store) => {
    return store.put({ id, file });
  }).then(() => {
    console.log("File saved for question id:", id);
  }).catch(error => {
    console.error("Error saving file:", error);
  });
}

function getFileFromDB(id) {
  return dbOperation("files", "readonly", (store) => {
    return store.get(id);
  }).then(result => result ? result.file : null)
    .catch(error => {
      console.error("Error retrieving file:", error);
      return null;
    });
}

// --------------------- UI & Utility Functions ---------------------
function positionButton(elem) {
  currentActiveQuestion = elem;
  const rect = elem.getBoundingClientRect();
  const containerRect = document.querySelector(".questions-section").getBoundingClientRect();
  const addNewBtn = state.get("add-new-btn");
  
  addNewBtn.style.top = `${rect.top - containerRect.top + 50}px`;
  addNewBtn.style.left = `${rect.right - containerRect.left + 10}px`;
  addNewBtn.style.display = "block";
}

function showWarning(message, confirmAction = null, cancelAction = null) {
  const warningDiv = state.get("showWarningDiv");
  const warningMsg = state.get("warning-msg");
  
  warningDiv.style.display = "block";
  warningMsg.textContent = message;
  
  const okBtn = warningDiv.querySelector(".okBtn");
  const cancelBtn = warningDiv.querySelector(".cancelBtn");
  
  // Remove previous event listeners by cloning buttons
  const newOkBtn = okBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  
  const hideAndExecute = (action) => {
    warningDiv.style.display = "none";
    if (action) action();
  };
  
  newOkBtn.addEventListener("click", () => hideAndExecute(confirmAction));
  newCancelBtn.addEventListener("click", () => hideAndExecute(cancelAction));
}

function hideRemaining(currentElement) {
  document.querySelectorAll(".questions-body .question-element").forEach((question) => {
    if (question !== currentElement) {
      const dropdownEl = question.querySelector(".question-type-dropdown");
      const footerEl = question.querySelector(".question-element-footer");
      
      if (dropdownEl) dropdownEl.style.display = "none";
      if (footerEl) footerEl.style.display = "none";
    }
  });
}

function setupPlaceholder(questionInput) {
  const defaultText = "Question";
  
  // Set initial state
  if (questionInput.textContent.trim() === defaultText) {
    questionInput.classList.add("placeholder");
  }
  
  // Focus event
  questionInput.addEventListener("focus", function() {
    if (this.textContent.trim() === defaultText && this.classList.contains("placeholder")) {
      this.textContent = "";
      this.classList.remove("placeholder");
    }
  });
  
  // Blur event
  questionInput.addEventListener("blur", function() {
    if (this.textContent.trim() === "") {
      this.textContent = defaultText;
      this.classList.add("placeholder");
    }
  });
}

function createElementWithAttributes(tag, attributes = {}) {
  const element = document.createElement(tag);
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'textContent') {
      element.textContent = value;
    } else if (key === 'classList' && Array.isArray(value)) {
      value.forEach(cls => element.classList.add(cls));
    } else {
      element.setAttribute(key, value);
    }
  });
  
  return element;
}

function createOptionsList() {
  const optionsContainer = createElementWithAttributes('div', { classList: ['options-container'] });
  const inputField = createElementWithAttributes('input', { type: 'text', placeholder: 'Enter option' });
  const addButton = createElementWithAttributes('button', { 
    textContent: 'Add Option', 
    classList: ['add-option-btn'] 
  });
  const optionsList = createElementWithAttributes('ul', { classList: ['options-list'] });
  
  addButton.addEventListener("click", () => {
    if (inputField.value.trim() !== "") {
      const listItem = createElementWithAttributes('li', { textContent: inputField.value });
      const deleteBtn = createElementWithAttributes('button', { 
        textContent: '✖', 
        classList: ['delete-option-btn'] 
      });
      
      deleteBtn.addEventListener("click", () => listItem.remove());
      listItem.appendChild(deleteBtn);
      optionsList.appendChild(listItem);
      inputField.value = "";
    }
  });
  
  optionsContainer.appendChild(inputField);
  optionsContainer.appendChild(addButton);
  optionsContainer.appendChild(optionsList);
  
  return optionsContainer;
}

function populateQuestionTypeFields(selectedValue, container) {
  container.innerHTML = "";
  
  if (selectedValue === "Dropdown" || selectedValue === "Multiple Dropdown") {
    container.appendChild(createOptionsList());
  } else {
    const inputTypes = {
      "Text": { type: "text", placeholder: "Enter text answer" },
      "Number": { type: "number", placeholder: "Enter number" },
      "Date": { type: "date" },
      "File upload": { type: "file" }
    };
    
    const inputConfig = inputTypes[selectedValue] || inputTypes["Text"];
    const input = createElementWithAttributes('input', inputConfig);
    input.disabled = true;
    container.appendChild(input);
  }
}

// --------------------- Validation Functions ---------------------
function attachValidation(input, questionType, isRequired) {
  let errorSpan = input.parentNode.querySelector(".error-message");
  
  if (!errorSpan) {
    errorSpan = createElementWithAttributes('span', { 
      className: 'error-message',
      style: 'color: red; font-size: 0.9em;'
    });
    input.parentNode.insertBefore(errorSpan, input.nextSibling);
  }
  
  function validate() {
    let errorMsg = "";
    const value = input.value.trim();
    
    if (isRequired && !value) {
      errorMsg = "This field is required";
    } else if (value) {
      // Type-specific validations
      const validations = {
        "Text": () => value.length > TEXT_MAX_LENGTH ? `Maximum length is ${TEXT_MAX_LENGTH} characters` : "",
        "Number": () => {
          const num = Number(value);
          return isNaN(num) ? "Please enter a valid number" : 
                 (num < NUMBER_MIN || num > NUMBER_MAX) ? `Number must be between ${NUMBER_MIN} and ${NUMBER_MAX}` : "";
        },
        "Date": () => (value < DATE_MIN || value > DATE_MAX) ? `Date must be between ${DATE_MIN} and ${DATE_MAX}` : ""
      };
      
      if (validations[questionType]) {
        errorMsg = validations[questionType]();
      }
    }
    
    errorSpan.textContent = errorMsg;
    return errorMsg === "";
  }
  
  // Add event listeners based on field type
  if (questionType === "Date") {
    input.addEventListener("change", validate);
  } else {
    input.addEventListener("input", validate);
  }
  
  input.addEventListener("blur", validate);
  return validate;
}

function validatePreviewForm() {
  let valid = true;
  let firstInvalidField = null;
  
  const fields = document.querySelectorAll(".preview-section input, .preview-section select, .preview-section textarea");
  
  fields.forEach((field) => {
    field.dispatchEvent(new Event("input", { bubbles: true }));
    const errorSpan = field.parentNode.querySelector(".error-message");
    
    if (errorSpan && errorSpan.textContent) {
      valid = false;
      if (!firstInvalidField) {
        firstInvalidField = field;
      }
    }
  });
  
  return { valid, firstInvalidField };
}

// --------------------- Preview Generation ---------------------
function generatePreview() {
  const previewSection = document.querySelector(".preview-section");
  previewSection.innerHTML = "<h2>Answer Section</h2>";
  
  document.querySelectorAll(".questions-body .question-element").forEach((question, index) => {
    const questionText = question.querySelector(".question-input").textContent;
    const selectEl = question.querySelector(".question-type-dropdown select");
    const questionType = (selectEl && (selectEl.value || selectEl.options[selectEl.selectedIndex].text)) || "";
    const isRequired = question.querySelector(".switch input[type='checkbox']").checked;
    
    // Create preview question container
    const previewQuestion = createElementWithAttributes('div', { classList: ['preview-question'] });
    previewQuestion.dataset.questionId = question.querySelector(".question-input").id || question.id;
    previewQuestion.dataset.questionType = questionType;
    
    // Add question label
    const questionLabel = createElementWithAttributes('label', { 
      textContent: `${index + 1}. ${questionText} ${isRequired ? "*" : ""}`
    });
    previewQuestion.appendChild(questionLabel);
    
    // Handle different question types
    if (questionType === "Dropdown" || questionType === "Multiple Dropdown") {
      const select = createElementWithAttributes('select', {});
      select.multiple = questionType === "Multiple Dropdown";
      select.required = isRequired;
      
      // Add default option
      const defaultOption = createElementWithAttributes('option', { 
        textContent: "Choose an option", 
        value: "" 
      });
      select.appendChild(defaultOption);
      
      // Add all options from the question
      const optionsList = question.querySelector(".options-list");
      if (optionsList) {
        optionsList.querySelectorAll("li").forEach((li) => {
          const optionText = li.textContent.replace("✖", "").trim();
          const option = createElementWithAttributes('option', {
            textContent: optionText,
            value: optionText.toLowerCase()
          });
          select.appendChild(option);
        });
      }
      
      // Add validation
      select.addEventListener("change", () => {
        const errorSpan = select.parentNode.querySelector(".error-message") || 
                          createElementWithAttributes('span', { 
                            className: 'error-message', 
                            style: 'color: red; font-size: 0.9em;' 
                          });
        errorSpan.textContent = !select.value && isRequired ? "Please select an option" : "";
      });
      
      previewQuestion.appendChild(select);
      
      // Add error message span
      const errorSpan = createElementWithAttributes('span', { 
        className: 'error-message', 
        style: 'color: red; font-size: 0.9em;' 
      });
      previewQuestion.appendChild(errorSpan);
    } else {
      // Handle other input types
      const inputTypes = {
        "Text": { type: "text", placeholder: "Enter text answer" },
        "Number": { type: "number", placeholder: "Enter number" },
        "Date": { type: "date" },
        "File upload": { type: "file" }
      };
      
      const inputConfig = inputTypes[questionType] || inputTypes["Text"];
      const input = createElementWithAttributes('input', inputConfig);
      input.required = isRequired;
      
      previewQuestion.appendChild(input);
      
      // Add validation for non-file inputs
      if (questionType !== "File upload") {
        attachValidation(input, questionType, isRequired);
      }
    }
    
    previewSection.appendChild(previewQuestion);
  });
  
  // Add submit button
  const submitBtn = createElementWithAttributes('button', { 
    textContent: 'Submit', 
    classList: ['submit-preview-btn'] 
  });
  submitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    submitAnswers();
  });
  
  previewSection.appendChild(submitBtn);
}

// --------------------- Submission Functions ---------------------
async function submitAnswers() {
  const { valid, firstInvalidField } = validatePreviewForm();
  
  if (!valid) {
    showWarning("Please fix the errors on the form before submitting.", () => {
      if (firstInvalidField) firstInvalidField.focus();
    });
    return;
  }
  
  const submissionAnswers = [];
  const previewQuestions = document.querySelectorAll(".preview-section .preview-question");
  
  for (const pq of previewQuestions) {
    const questionId = pq.dataset.questionId;
    const questionType = pq.dataset.questionType;
    const field = pq.querySelector("select") || pq.querySelector("input");
    
    if (questionType === "File upload" && field && field.files && field.files.length > 0) {
      const file = field.files[0];
      submissionAnswers.push({
        id: questionId,
        type: questionType,
        answer: "FILE_IN_DB"
      });
      await saveFileToDB(questionId, file);
    } else {
      submissionAnswers.push({
        id: questionId,
        type: questionType,
        answer: field ? field.value : ""
      });
    }
  }
  
  localStorage.setItem("submissionData", JSON.stringify({ answers: submissionAnswers }));
  showWarning("Submission saved successfully!");
  
  // Reload the submission preview
  loadSubmissionAnswers();
}

// --------------------- Load Submission Answers ---------------------
async function loadSubmissionAnswers() {
  const submissionJSON = localStorage.getItem("submissionData");
  if (!submissionJSON) return;
  
  const submissionData = JSON.parse(submissionJSON);
  const previewSection = document.querySelector(".preview-section");
  previewSection.innerHTML = "<h2>Answer Section</h2>";
  
  for (const [index, ans] of submissionData.answers.entries()) {
    const previewQuestion = createElementWithAttributes('div', { classList: ['preview-question'] });
    const questionLabel = createElementWithAttributes('label', { 
      textContent: `${index + 1}. Question ${ans.id} (${ans.type}) ${ans.answer ? "" : "*"}`
    });
    previewQuestion.appendChild(questionLabel);
    
    if (ans.type === "File upload") {
      const fileInfo = createElementWithAttributes('div', {
        textContent: "File submitted (click to view)",
        style: "color: blue; cursor: pointer;"
      });
      
      fileInfo.addEventListener("click", async () => {
        const file = await getFileFromDB(ans.id);
        if (file) {
          alert("File: " + file.name);
        } else {
          alert("No file found.");
        }
      });
      
      previewQuestion.appendChild(fileInfo);
    } else {
      const inputTypes = {
        "Text": { type: "text" },
        "Number": { type: "number" },
        "Date": { type: "date" },
        "Dropdown": { type: "text" },
        "Multiple Dropdown": { type: "text" }
      };
      
      const inputConfig = inputTypes[ans.type] || inputTypes["Text"];
      const input = createElementWithAttributes('input', inputConfig);
      input.value = ans.answer;
      input.disabled = true;
      
      previewQuestion.appendChild(input);
    }
    
    previewSection.appendChild(previewQuestion);
  }
  
  // Add disabled submit button
  const submitBtn = createElementWithAttributes('button', {
    textContent: 'Submit',
    classList: ['submit-preview-btn'],
    disabled: true
  });
  
  previewSection.appendChild(submitBtn);
}

// --------------------- Drag & Drop Helper ---------------------
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".question-element:not(.dragging)")];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// --------------------- Question Listeners & Drag & Drop ---------------------
function setupListeners(questionElement) {
  // Click handler to show controls
  questionElement.addEventListener("click", () => {
    hideRemaining(questionElement);
    
    const dropdown = questionElement.querySelector(".question-type-dropdown");
    const footer = questionElement.querySelector(".question-element-footer");
    
    if (dropdown) dropdown.style.display = "block";
    if (footer) footer.style.display = "flex";
    
    positionButton(questionElement);
    questionElement.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // Setup question input placeholder
  const questionInput = questionElement.querySelector(".question-input");
  if (questionInput) setupPlaceholder(questionInput);

  // Setup question type dropdown
  const selectElement = questionElement.querySelector(".question-type-dropdown select");
  const questionTypeContainer = questionElement.querySelector(".question-type");
  
  if (selectElement && questionTypeContainer) {
    selectElement.addEventListener("change", (e) => {
      const selectedValue = e.target.options[e.target.selectedIndex].text;
      populateQuestionTypeFields(selectedValue, questionTypeContainer);
    });
  }

  // Drag & Drop setup
  questionElement.setAttribute("draggable", "true");
  
  questionElement.addEventListener("dragstart", () => {
    draggedElement = questionElement;
    setTimeout(() => questionElement.classList.add("dragging"), 0);
  });
  
  questionElement.addEventListener("dragend", () => {
    questionElement.classList.remove("dragging");
    draggedElement = null;
  });

  // Delete with confirmation
  const deleteBtn = questionElement.querySelector(".delete-question");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      showWarning("Are you sure to delete question?", () => {
        questionElement.remove();
        
        // Update add button if no questions remain
        if (document.querySelectorAll(".questions-body .question-element").length === 0) {
          const addNewBtn = state.get("add-new-btn");
          addNewBtn.style.position = "static";
          addNewBtn.style.display = "block";
        }
      });
    });
  }
}

// --------------------- Add New Question ---------------------
function addNewQuestion() {
  questionCounter++;
  const template = state.get("questionTemplate");
  const questionsBody = document.querySelector(".questions-body");
  const clone = template.content.cloneNode(true);
  const newQuestionElement = clone.querySelector(".question-element");

  // Set unique ID and setup listeners
  newQuestionElement.id = `question-${questionCounter}`;
  setupListeners(newQuestionElement);

  // Insert after current active question or at the end
  if (currentActiveQuestion) {
    const nextSibling = currentActiveQuestion.nextElementSibling;
    if (nextSibling) {
      questionsBody.insertBefore(clone, nextSibling);
    } else {
      questionsBody.appendChild(clone);
    }
  } else {
    questionsBody.appendChild(clone);
  }

  // Focus and show controls
  newQuestionElement.querySelector(".question-input").focus();
  newQuestionElement.querySelector(".question-type-dropdown").style.display = "block";
  newQuestionElement.querySelector(".question-element-footer").style.display = "flex";
  
  positionButton(newQuestionElement);
  hideRemaining(newQuestionElement);
}

// --------------------- Save & Load Question Section (LS) ---------------------
function saveQuestionsSectionToLocalStorage() {
  const questions = document.querySelectorAll(".questions-body .question-element");
  const questionsData = [];
  
  questions.forEach((question) => {
    const id = question.id;
    const questionText = question.querySelector(".question-input").textContent.trim();
    
    const selectEl = question.querySelector(".question-type-dropdown select");
    let questionType = "";
    if (selectEl) {
      questionType = selectEl.value || selectEl.options[selectEl.selectedIndex].text;
    }
    
    let options = [];
    if (questionType === "Dropdown" || questionType === "Multiple Dropdown") {
      const optionsList = question.querySelector(".options-list");
      if (optionsList) {
        options = Array.from(optionsList.querySelectorAll("li")).map(li => {
          return li.firstChild ? li.firstChild.textContent.trim() : li.textContent.trim();
        });
      }
    }
    
    const isRequired = question.querySelector(".switch input[type='checkbox']").checked;
    
    questionsData.push({ id, questionText, questionType, options, isRequired });
  });
  
  localStorage.setItem("questionsSectionData", JSON.stringify(questionsData));
  localStorage.setItem("questionCounter", questionCounter);
  
  console.log("Questions section saved.");
  showWarning("Form questions saved successfully!");
}

function loadQuestionsSectionFromLocalStorage() {
  state.get("add-new-btn").style.display = "block";
  
  const dataJSON = localStorage.getItem("questionsSectionData");
  if (!dataJSON) return;
  
  const questionsData = JSON.parse(dataJSON);
  const questionsBody = document.querySelector(".questions-body");
  questionsBody.innerHTML = "";
  
  questionsData.forEach((data) => {
    const template = state.get("questionTemplate");
    const clone = template.content.cloneNode(true);
    const questionElement = clone.querySelector(".question-element");
    
    // Set ID and question text
    questionElement.id = data.id;
    const questionInput = questionElement.querySelector(".question-input");
    questionInput.textContent = data.questionText || "Question";
    setupPlaceholder(questionInput);
    
    // Set question type
    const selectEl = questionElement.querySelector(".question-type-dropdown select");
    if (selectEl && data.questionType) {
      for (let i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].text === data.questionType) {
          selectEl.selectedIndex = i;
          break;
        }
      }
    }
    
    // Populate type fields and options
    const questionTypeContainer = questionElement.querySelector(".question-type");
    if (questionTypeContainer && data.questionType) {
      populateQuestionTypeFields(data.questionType, questionTypeContainer);
      
      if ((data.questionType === "Dropdown" || data.questionType === "Multiple Dropdown") && data.options) {
        const optionsList = questionTypeContainer.querySelector(".options-list");
        if (optionsList) {
          data.options.forEach((opt) => {
            const listItem = createElementWithAttributes('li', { textContent: opt });
            const deleteBtn = createElementWithAttributes('button', {
              textContent: '✖',
              classList: ['delete-option-btn']
            });
            
            deleteBtn.addEventListener("click", () => listItem.remove());
            listItem.appendChild(deleteBtn);
            optionsList.appendChild(listItem);
          });
        }
      }
    }
    
    // Set required state
    const requiredSwitch = questionElement.querySelector(".switch input[type='checkbox']");
    if (requiredSwitch) {
      requiredSwitch.checked = data.isRequired;
    }
    
    setupListeners(questionElement);
    questionsBody.appendChild(clone);
  });
  
  // Restore question counter
  const storedCounter = localStorage.getItem("questionCounter");
  if (storedCounter) {
    questionCounter = parseInt(storedCounter, 10);
  }
}

// --------------------- Initialize DOM & State ---------------------
function initializeDOM() {
  // Cache frequently used elements
  state.elements = {
    'questionTemplate': document.getElementById("questionTemplate"),
    'add-new-btn': document.querySelector(".add-new-btn"),
    'preview-btn': document.querySelector(".preview-btn"),
    'save-btn': document.querySelector(".save-btn"),
    'showWarningDiv': document.getElementById("showWarningDiv"),
    'warning-msg': document.getElementById("warning-msg")
  };

  // Set up event listeners
  state.get("add-new-btn").addEventListener("click", addNewQuestion);
  state.get("preview-btn").addEventListener("click", generatePreview);
  state.get("save-btn").addEventListener("click", saveQuestionsSectionToLocalStorage);
}

// --------------------- DOMContentLoaded & Drag Over Setup ---------------------
document.addEventListener("DOMContentLoaded", () => {
  // Initialize components
  initDB(); 
  initializeDOM();
  
  // Load previously saved questions or add new one
  loadQuestionsSectionFromLocalStorage();
  if (!localStorage.getItem("questionsSectionData")) {
    addNewQuestion();
  }
  
  // Set up drag and drop for questions container
  const questionsBody = document.querySelector(".questions-body");
  questionsBody.addEventListener("dragover", (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(questionsBody, e.clientY);
    
    if (draggedElement) {
      if (afterElement == null) {
        questionsBody.appendChild(draggedElement);
      } else {
        questionsBody.insertBefore(draggedElement, afterElement);
      }
    }
  });
  
  // Load submitted answers if any
  loadSubmissionAnswers();
});