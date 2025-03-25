let questionCounter = 0;
let draggedElement = null;
let currentActiveQuestion = null;
const state = {
  questionTemplate: null,
  addNewBtn: null,
  preViewButton: null,
  saveButton: null,
  warningDiv: null,
  warningMsg: null,
};
//utility function to hide elements in all other questions
function hideRemaining(currentElement) {
  document
    .querySelectorAll(".questions-body .question-element")
    .forEach((question) => {
      if (question !== currentElement) {
        const dropdownEl = question.querySelector(".question-type-dropdown");
        const footerEl = question.querySelector(".question-element-footer");
        const vadilationConfigDiv =
          question.querySelector(".validation-config");
          const optionsContainer=question.querySelector(".options-container")
        if (dropdownEl) dropdownEl.style.display = "none";
        if (footerEl) footerEl.style.display = "none";
        if (vadilationConfigDiv) vadilationConfigDiv.style.display = "none";
        if(optionsContainer) optionsContainer.style.display = "none";
      }
    });
}
//position the button beside the current question
function positionButton(elem) {
  currentActiveQuestion = elem;
  const rect = elem.getBoundingClientRect();
  const containerRect = document
    .querySelector(".questions-section")
    .getBoundingClientRect();
  state.addNewBtn.style.top = rect.top - containerRect.top + 50 + "px";
  state.addNewBtn.style.left = rect.right - containerRect.left + 10 + "px";
  state.addNewBtn.style.display = "block";
}
//function to show warning popup (takes 2 callbacks okay and cancel)
function showWarning(message, confirmAction = null, cancelAction = null) {
  const warningDiv =
    state.warningDiv || document.getElementById("showWarningDiv");
  warningDiv.style.display = "block";
  state.warningMsg.textContent = message;
  const okBtn = warningDiv.querySelector(".okBtn");
  const cancelBtn = warningDiv.querySelector(".cancelBtn");
  // Remove previous event listeners by cloning buttons
  const newOkBtn = okBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  function okHandler() {
    hideWarning();
    if (confirmAction) confirmAction();
    cleanup();
  }
  function cancelHandler() {
    hideWarning();
    if (cancelAction) cancelAction();
    cleanup();
  }
  function cleanup() {
    newOkBtn.removeEventListener("click", okHandler);
    newCancelBtn.removeEventListener("click", cancelHandler);
  }
  newOkBtn.addEventListener("click", okHandler);
  newCancelBtn.addEventListener("click", cancelHandler);
}
//to hide the popup
function hideWarning() {
  const warningDiv =
    state.warningDiv || document.getElementById("showWarningDiv");
  warningDiv.style.display = "none";
}
// as question field is div contenteditable to Mimic placeholder behavior on contenteditable divs
function setupPlaceholder(questionInput) {
  if (questionInput.textContent.trim() === "Question") {
    questionInput.classList.add("placeholder");
  }
  questionInput.addEventListener("focus", function () {
    if (
      this.textContent.trim() === "Question" &&
      this.classList.contains("placeholder")
    ) {
      this.textContent = "";
      this.classList.remove("placeholder");
    }
  });
  questionInput.addEventListener("blur", function () {
    if (this.textContent.trim() === "") {
      this.textContent = "Question";
      this.classList.add("placeholder");
    }
  });
}
//function for drag and drop
function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll(".question-element:not(.dragging)"),
  ];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      return offset < 0 && offset > closest.offset
        ? { offset, element: child }
        : closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}
//to create error span
function createErrorSpan() {
  let errorSpan = document.createElement("span");
  errorSpan.className = "error-message";
  errorSpan.style.color = "red";
  errorSpan.style.fontSize = "0.9em";
  return errorSpan;
}
//function to create delete button in options field in question section
function createDeleteButton() {
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "✖";
  deleteBtn.classList.add("delete-option-btn");
  return deleteBtn;
}
//to create dynamic elements to take input from users for validations (maxLength and ranges)
function createValidationConfig(type) {
  switch (type) {
    case "Text":
      return `
          <label>Max Length: 
            <input type="number" class="max-length-input"  min="1">
          </label>
        `;
    case "Number":
      return `
          <label>Min Value: 
            <input type="number" class="min-value-input">
          </label>
          <label>Max Value: 
            <input type="number" class="max-value-input" >
          </label>
        `;
    case "Date":
      return `
          <label>Min Date: 
            <input type="date" class="min-date-input" >
          </label>
          <label>Max Date: 
            <input type="date" class="max-date-input">
          </label>
        `;
    default:
      return "";
  }
}
//to take options from user dynamically
function createDropdownOptionsContainer() {
  const optionsContainer = document.createElement("div");
  optionsContainer.classList.add("options-container");
  const inputField = document.createElement("input");
  inputField.type = "text";
  inputField.placeholder = "Enter option";
  const addButton = document.createElement("button");
  addButton.textContent = "Add Option";
  addButton.classList.add("add-option-btn");
  const optionsList = document.createElement("ul");
  optionsList.classList.add("options-list");
  addButton.addEventListener("click", () => {
    if (inputField.value.trim() !== "") {
      const listItem = document.createElement("li");
      listItem.textContent = inputField.value;

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "✖";
      deleteBtn.classList.add("delete-option-btn");
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
// function which is used for creating input fields based on selected type from dropdown in the question
function populateQuestionTypeFields(
  selectedValue,
  container,
  isPreview = false
) {
  container.innerHTML = "";
  if (selectedValue === "Dropdown" || selectedValue === "Multiple Dropdown") {
    container.appendChild(createDropdownOptionsContainer());
    return;
  }
  let inputElement = document.createElement("input");
  switch (selectedValue) {
    case "Text":
      inputElement.type = "text";
      inputElement.placeholder = "Enter text answer";
      break;
    case "Number":
      inputElement.type = "number";
      inputElement.placeholder = "Enter number";
      break;
    case "Date":
      inputElement.type = "date";
      break;
    case "File upload":
      inputElement.type = "file";
      container.appendChild(inputElement);
      return;
  }
  inputElement.disabled = true ? !isPreview : false;
  container.appendChild(inputElement);

  if (!isPreview) {
    const validationDiv = document.createElement("div");
    validationDiv.classList.add("validation-config");
    validationDiv.innerHTML = createValidationConfig(selectedValue);
    container.appendChild(validationDiv);
  }
  return inputElement;
}
//function to get validation values given by user
function getValidationConfigFromQuestion(question, questionType) {
  const validationConfig = {};
  switch (questionType) {
    case "Text":
      const maxLengthInput = question.querySelector(".max-length-input");
      validationConfig.maxLength = parseInt(maxLengthInput.value);

      break;
    case "Number":
      const minValueInput = question.querySelector(".min-value-input");
      const maxValueInput = question.querySelector(".max-value-input");
      validationConfig.min = parseInt(minValueInput.value);

      validationConfig.max = parseInt(maxValueInput.value);

      break;
    case "Date":
      const minDateInput = question.querySelector(".min-date-input");
      const maxDateInput = question.querySelector(".max-date-input");
      validationConfig.minDate = minDateInput.value;
      validationConfig.maxDate = maxDateInput.value;
      break;
  }
  return validationConfig;
}
//function to create dropdowns to show in preview
function createPreviewSelect(questionType, optionsList, isRequired) {
  if (questionType === "Multiple Dropdown") {
    const select = document.createElement("select");
    select.multiple = true;
    select.className = "multi-select";

    if (optionsList) {
      optionsList.querySelectorAll("li").forEach((li) => {
        const option = document.createElement("option");
        option.textContent = li.textContent.replace("✖", "").trim();
        option.value = li.textContent.replace("✖", "").trim().toLowerCase();
        select.appendChild(option);
      });
    }

    if (isRequired) select.required = true;
    const helpText = document.createElement("div");
    helpText.className = "help-text";
    helpText.textContent =
      "Hold Ctrl (or Cmd on Mac) to select multiple options";
    const container = document.createElement("div");
    container.className = "multi-select-container";
    container.appendChild(select);
    container.appendChild(helpText);

    return container;
  } else {
    const select = document.createElement("select");
    const defaultOption = document.createElement("option");
    defaultOption.textContent = "Choose an option";
    defaultOption.value = "";
    select.appendChild(defaultOption);

    if (optionsList) {
      optionsList.querySelectorAll("li").forEach((li) => {
        const option = document.createElement("option");
        option.textContent = li.textContent.replace("✖", "").trim();
        option.value = li.textContent.replace("✖", "").trim().toLowerCase();
        select.appendChild(option);
      });
    }
    if (isRequired) select.required = true;
    return select;
  }
}
// to attach the validation to each question if validation  is present
function attachValidation(
  input,
  questionType,
  isRequired,
  validationConfig = {}
) {
  let errorSpan = input?.parentNode.querySelector(".error-message");
  if (!errorSpan) {
    errorSpan = createErrorSpan();
    input.parentNode.insertBefore(errorSpan, input.nextSibling);
  }
  function validate() {
    let errorMsg = "";
    const value = input.value.trim();

    if (isRequired && !value) {
      errorMsg = "This field is required";
    } else if (value) {
      switch (questionType) {
        case "Text":
          const maxLength = validationConfig.maxLength;
          if (maxLength !== undefined && value.length > maxLength) {
            errorMsg = `Maximum length is ${maxLength} characters`;
          }
          break;
        case "Number":
          const num = Number(value);
          const minValue = validationConfig.min;
          const maxValue = validationConfig.max;

          if (isNaN(num)) {
            errorMsg = "Please enter a valid number";
          } else if (
            (minValue !== undefined && num < minValue) ||
            (maxValue !== undefined && num > maxValue)
          ) {
            if (minValue !== undefined && maxValue !== undefined) {
              errorMsg = `Number must be between ${minValue} and ${maxValue}`;
            } else if (minValue !== undefined) {
              errorMsg = `Number must be at least ${minValue}`;
            } else if (maxValue !== undefined) {
              errorMsg = `Number must be at most ${maxValue}`;
            }
          }
          break;
        case "Date":
          const minDate = validationConfig.minDate;
          const maxDate = validationConfig.maxDate;

          if (
            (minDate !== undefined && value < minDate) ||
            (maxDate !== undefined && value > maxDate)
          ) {
            if (minDate !== undefined && maxDate !== undefined) {
              errorMsg = `Date must be between ${minDate} and ${maxDate}`;
            } else if (minDate !== undefined && minDate !== null) {
              errorMsg = `Date must be on or after ${minDate}`;
            } else if (maxDate !== undefined && maxDate !== null) {
              errorMsg = `Date must be on or before ${maxDate}`;
            }
          }
          break;
      }
    }

    errorSpan.textContent = errorMsg;
    return errorMsg === "";
  }
  const eventType = questionType === "Date" ? "change" : "input";
  input.addEventListener(eventType, validate);
  input.addEventListener("blur", validate);

  return validate;
}
//to validate entire form at once
function validatePreviewForm() {
  let valid = true;
  let firstInvalidField = null;
  const fields = document.querySelectorAll(
    ".preview-section input, .preview-section select"
  );
  console.log(fields);
  fields.forEach((field) => {
    console.log(field.type);
    if (field.type === "date" || field.type==="select-one") {
      field.dispatchEvent(new Event("change", { bubbles: true }));
      field.dispatchEvent(new Event("blur", { bubbles: true }));
    } else {
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }
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
//function to generate the preview
function generatePreview() {
  const previewSection = document.querySelector(".preview-section");
  previewSection.innerHTML = "<h2>Preview Section</h2>";
  document
    .querySelectorAll(".questions-body .question-element")
    .forEach((question, index) => {
      const questionText =
        question.querySelector(".question-input").textContent;
      if (questionText === "Question" || questionText.trim() === "") {
        return;
      }
      const selectEl = question.querySelector(".question-type-dropdown select");
      const questionType =
        (selectEl &&
          (selectEl.value || selectEl.options[selectEl.selectedIndex].text)) ||
        "";
      const isRequired = question.querySelector(
        ".switch input[type='checkbox']"
      ).checked;
      const validationConfig = getValidationConfigFromQuestion(
        question,
        questionType
      );
      const previewQuestion = document.createElement("div");
      previewQuestion.classList.add("preview-question");
      previewQuestion.dataset.questionId =
        question.querySelector(".question-input").id || question.id;
      previewQuestion.dataset.questionType = questionType;
      previewQuestion.dataset.validationConfig =
        JSON.stringify(validationConfig);

      const questionLabel = document.createElement("label");
      questionLabel.textContent = `${index + 1}. ${questionText} ${
        isRequired ? "*" : ""
      }`;
      previewQuestion.appendChild(questionLabel);

      const questionBody = document.createElement("div");
      previewQuestion.appendChild(questionBody);
      if (questionType !== "Dropdown" && questionType !== "Multiple Dropdown") {
        const input = populateQuestionTypeFields(
          questionType,
          questionBody,
          true
        );
        attachValidation(input, questionType, isRequired, validationConfig);
      } else {
        const optionsList = question.querySelector(".options-list");
        const select = createPreviewSelect(
          questionType,
          optionsList,
          isRequired
        );
        previewQuestion.appendChild(select);
        select.addEventListener("change", () => {
          const errorSpan = select.parentNode.querySelector(".error-message");
          if (isRequired && !select.value) {
            if (errorSpan) errorSpan.textContent = "Please select an option";
          } else if (errorSpan) {
            errorSpan.textContent = "";
          }
        });
        const errorSpan = createErrorSpan();
        previewQuestion.appendChild(errorSpan);
      }
      previewSection.appendChild(previewQuestion);
    });
  const submitBtn = document.createElement("button");
  submitBtn.textContent = "Submit";
  submitBtn.classList.add("submit-preview-btn");
  submitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    submitAnswers();
  });

  previewSection.appendChild(submitBtn);
}
//to submit answers and store in Local storage
function submitAnswers() {
  const { valid, firstInvalidField } = validatePreviewForm();
  if (!valid) {
    showWarning("Please fix the errors on the form before submitting.", () => {
      if (firstInvalidField) firstInvalidField.focus();
    });
    return;
  }
  showWarning(
    "Are you sure you want to submit your answers?",
    () => {
      const submissionAnswers = [];
      const previewQuestions = document.querySelectorAll(
        ".preview-section .preview-question"
      );
      previewQuestions.forEach((pq) => {
        const questionId = pq.dataset.questionId;
        const questionType = pq.dataset.questionType;
        const field = pq.querySelector("select") || pq.querySelector("input");
        const question = pq.querySelector("label");
        if (questionType === "File upload") {
          console.log("File saved");
        } else {
          const answer = field ? field.value : "";
          submissionAnswers.push({
            id: questionId,
            type: questionType,
            question: question.textContent,
            answer: answer,
          });
        }
      });
      localStorage.setItem(
        "submissionData",
        JSON.stringify({ answers: submissionAnswers })
      );
      showWarning(
        "Submission saved successfully!",
        () => {
          hideWarning();
        },
        null
      );
    },
    () => {
      console.log("Submission cancelled");
    }
  );
}
// to load submitted answers from local storage
function loadSubmissionAnswers() {
  const submissionJSON = localStorage.getItem("submissionData");
  if (!submissionJSON) return;
  const submissionData = JSON.parse(submissionJSON);
  const previewSection = document.querySelector(".preview-section");
  previewSection.innerHTML = "<h2>Answer Section</h2>";
  submissionData.answers.forEach((ans, index) => {
    const previewQuestion = document.createElement("div");
    previewQuestion.classList.add("preview-question");
    const questionLabel = document.createElement("label");
    questionLabel.textContent = ans.question;
    previewQuestion.appendChild(questionLabel);
    const questionBody = document.createElement("div");
    previewQuestion.appendChild(questionBody);
    if (ans.type === "File upload") {
      const fileInfo = document.createElement("div");
      fileInfo.textContent = "File saved ";
    } else {
      let input;
      if (ans.type !== "Dropdown" && ans.type != "Multiple Dropdown") {
        input = populateQuestionTypeFields(ans.type, questionBody, true);
      } else {
        input = document.createElement("input");
        input.type = "text";
        questionBody.appendChild(input);
      }
      input.value = ans.answer;
      input.disabled = true;
    }
    previewSection.appendChild(previewQuestion);
  });
  const submitBtn = document.createElement("button");
  submitBtn.textContent = "Submit";
  submitBtn.classList.add("submit-preview-btn");
  submitBtn.disabled = true;
  previewSection.appendChild(submitBtn);
}
// to set up event listeners for each question in questions section
function setupListeners(questionElement) {
  // Question click handler
  questionElement.addEventListener("click", (e) => {
    hideRemaining(questionElement);
    questionElement.querySelector(".question-type-dropdown").style.display =
      "block";
    questionElement.querySelector(".question-element-footer").style.display =
      "flex";
    const vadilationConfig =
      questionElement.querySelector(".validation-config");
    if (vadilationConfig) {
      vadilationConfig.style.display = "block";
    }
    const optionsContainer =
      questionElement.querySelector(".options-container");
    if (optionsContainer) {
      optionsContainer.style.display = "block";
    }
    positionButton(questionElement);
    questionElement.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  // Question input setup
  const questionInput = questionElement.querySelector(".question-input");
  setupPlaceholder(questionInput);
  // Question type dropdown handler
  const selectElement = questionElement.querySelector(
    ".question-type-dropdown select"
  );
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
    questionElement.classList.add("dragging");
  });
  questionElement.addEventListener("dragend", () => {
    questionElement.classList.remove("dragging");
    draggedElement = null;
  });
  // Delete button handler
  const deleteBtn = questionElement.querySelector(".delete-question");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      showWarning("Are you sure to delete question?", () => {
        if (questionElement.previousElementSibling) {
          positionButton(questionElement.previousElementSibling);
        }
        questionElement.remove();
        if (
          document.querySelectorAll(".questions-body .question-element")
            .length === 0
        ) {
          state.addNewBtn.style.position = "static";
          state.addNewBtn.style.display = "block";
        }
      });
    });
  }
}
//function to create a new question when add button is clicked
function addNewQuestion() {
  questionCounter++;
  const questionsBody = document.querySelector(".questions-body");
  const clone = state.questionTemplate.content.cloneNode(true);
  const newQuestionElement = clone.querySelector(".question-element");
  newQuestionElement.id = `question-${questionCounter}`;
  setupListeners(newQuestionElement);
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
  newQuestionElement.querySelector(".question-input").focus();
  newQuestionElement.querySelector(".question-type-dropdown").style.display =
    "block";
  newQuestionElement.querySelector(".question-element-footer").style.display =
    "flex";
  positionButton(newQuestionElement);
  hideRemaining(newQuestionElement);
}
//function to initialize the state variables
function initializeDOM() {
  state.questionTemplate = document.getElementById("questionTemplate");
  state.addNewBtn = document.querySelector(".add-new-btn");
  state.preViewButton = document.querySelector(".preview-btn");
  state.saveButton = document.querySelector(".save-btn");
  state.warningDiv = document.getElementById("showWarningDiv");
  state.warningMsg = document.getElementById("warning-msg");
  state.addNewBtn.addEventListener("click", addNewQuestion);
  state.preViewButton.addEventListener("click", generatePreview);
  state.saveButton.addEventListener(
    "click",
    saveQuestionsSectionToLocalStorage
  );

  document.querySelector(".clear-btn").addEventListener("click", () => {
    localStorage.clear();
    location.reload();
  });
}
//to save questions to local storage
function saveQuestionsSectionToLocalStorage() {
  const questions = document.querySelectorAll(
    ".questions-body .question-element"
  );
  const questionsData = Array.from(questions).map((question) => {
    const id = question.id;
    const questionText = question
      .querySelector(".question-input")
      .textContent.trim();
    const selectEl = question.querySelector(".question-type-dropdown select");
    const questionType = selectEl
      ? selectEl.value || selectEl.options[selectEl.selectedIndex].text
      : "";
    const isRequired = question.querySelector(
      ".switch input[type='checkbox']"
    ).checked;
    let options = [];
    if (["Dropdown", "Multiple Dropdown"].includes(questionType)) {
      const optionsList = question.querySelector(".options-list");
      if (optionsList) {
        options = Array.from(optionsList.querySelectorAll("li")).map((li) =>
          li.firstChild
            ? li.firstChild.textContent.trim()
            : li.textContent.trim()
        );
      }
    }
    const validationConfig = getValidationConfigFromQuestion(
      question,
      questionType
    );
    return {
      id,
      questionText,
      questionType,
      options,
      validationConfig,
      isRequired,
    };
  });

  localStorage.setItem("questionsSectionData", JSON.stringify(questionsData));
  localStorage.setItem("questionCounter", questionCounter);
  showWarning("Questions saved successfully");
}
//to restore dropdown options when refresh
function restoreDropdownOptions(questionTypeContainer, options) {
  const optionsList = questionTypeContainer.querySelector(".options-list");
  if (!optionsList || !options?.length) return;

  const fragment = document.createElement("div");

  options.forEach((opt) => {
    const listItem = document.createElement("li");
    listItem.textContent = opt;

    const deleteBtn = createDeleteButton();
    deleteBtn.addEventListener("click", () => listItem.remove());

    listItem.appendChild(deleteBtn);
    fragment.appendChild(listItem);
  });

  optionsList.appendChild(fragment);
}
//to restore dropdown validations when refresh
function restoreValidationSettings(
  questionTypeContainer,
  questionType,
  validationConfig
) {
  if (!validationConfig) return;

  const validationMap = {
    Text: () => {
      const maxLengthInput =
        questionTypeContainer.querySelector(".max-length-input");
      if (maxLengthInput && validationConfig.maxLength) {
        maxLengthInput.value = validationConfig.maxLength;
      }
    },
    Number: () => {
      const minValueInput =
        questionTypeContainer.querySelector(".min-value-input");
      const maxValueInput =
        questionTypeContainer.querySelector(".max-value-input");

      if (minValueInput && validationConfig.min) {
        minValueInput.value = validationConfig.min;
      }
      if (maxValueInput && validationConfig.max) {
        maxValueInput.value = validationConfig.max;
      }
    },
    Date: () => {
      const minDateInput =
        questionTypeContainer.querySelector(".min-date-input");
      const maxDateInput =
        questionTypeContainer.querySelector(".max-date-input");

      if (minDateInput && validationConfig.minDate) {
        minDateInput.value = validationConfig.minDate;
      }
      if (maxDateInput && validationConfig.maxDate) {
        maxDateInput.value = validationConfig.maxDate;
      }
    },
  };

  const handler = validationMap[questionType];
  if (handler) handler();
}
//to load questions from Local storage
function loadQuestionsSectionFromLocalStorage() {
  state.addNewBtn.style.display = "block";
  const dataJSON = localStorage.getItem("questionsSectionData");
  if (!dataJSON) return;
  const questionsData = JSON.parse(dataJSON);
  const questionsBody = document.querySelector(".questions-body");
  questionsBody.innerHTML = "";
  const fragment = document.createElement("div");
  questionsData.forEach((data) => {
    const clone = state.questionTemplate.content.cloneNode(true);
    const questionElement = clone.querySelector(".question-element");
    questionElement.id = data.id;
    // Set question text
    const questionInput = questionElement.querySelector(".question-input");
    questionInput.textContent = data.questionText || "Question";
    setupPlaceholder(questionInput);
    // Set question type
    const selectEl = questionElement.querySelector(
      ".question-type-dropdown select"
    );
    if (selectEl && data.questionType) {
      for (let i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].text === data.questionType) {
          selectEl.selectedIndex = i;
          break;
        }
      }
    }
    // Populate question fields
    const questionTypeContainer =
      questionElement.querySelector(".question-type");
    if (questionTypeContainer && data.questionType) {
      populateQuestionTypeFields(data.questionType, questionTypeContainer);
      // Restore validation and options
      restoreValidationSettings(
        questionTypeContainer,
        data.questionType,
        data.validationConfig
      );
      if (
        ["Dropdown", "Multiple Dropdown"].includes(data.questionType) &&
        data.options
      ) {
        restoreDropdownOptions(questionTypeContainer, data.options);
      }
    }
    // Set required state
    const requiredSwitch = questionElement.querySelector(
      ".switch input[type='checkbox']"
    );
    if (requiredSwitch) {
      requiredSwitch.checked = data.isRequired;
    }
    setupListeners(questionElement);
    fragment.appendChild(clone);
  });
  questionsBody.appendChild(fragment);
  // Restore question counter
  const storedCounter = localStorage.getItem("questionCounter");
  if (storedCounter) {
    questionCounter = parseInt(storedCounter, 10);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  initializeDOM();
  loadQuestionsSectionFromLocalStorage();
  if (!localStorage.getItem("questionsSectionData")) {
    addNewQuestion();
  }
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
  loadSubmissionAnswers();
});
