const STORAGE_KEY = "lifeReminderHub.records.v1";

const categories = ["全部", "食", "衣", "住／生活", "行／交通", "健康", "藥品備品", "工作", "娛樂／遊戲", "其他"];
const itemCategories = ["食", "衣", "住／生活", "行／交通", "健康", "工作", "娛樂／遊戲", "其他"];
const choreCategories = ["衣", "住／生活", "健康", "其他"];
const locations = ["冰箱", "冷凍", "桌上", "包包", "浴室", "廚房", "玄關", "房間", "其他"];
const today = () => new Date().toISOString().slice(0, 10);
const nowStamp = () => new Date().toISOString();

const typeLabels = {
  food: "食品",
  item: "物品",
  chore: "家務",
  medicine: "藥品",
  emergencySupply: "備品",
  medicationLog: "用藥紀錄",
  dateLog: "日期紀錄",
  all: "全部紀錄"
};

const quickPresets = {
  food: ["便當", "牛奶", "水果", "飲料", "零食", "冷凍食品", "保健品"],
  item: {
    "食": ["無咖啡因飲品", "常溫食品", "零食"],
    "衣": ["洗衣精", "衣物收納袋", "除濕包"],
    "住／生活": ["衛生紙", "垃圾袋", "洗碗精", "濕紙巾", "酒精", "清潔用品"],
    "行／交通": ["悠遊卡加值", "機車加油", "機車保養", "交通票券"],
    "健康": ["保健品", "口罩", "衛生用品"],
    "工作": ["文具", "列印紙", "活動材料", "教具"],
    "娛樂／遊戲": ["遊戲周邊", "訂閱服務", "收藏用品"],
    "其他": ["備用品"]
  },
  chore: {
    "衣": ["洗衣服", "洗床單", "洗毛巾", "清洗外套", "整理包包"],
    "住／生活": ["清冰箱", "倒垃圾", "整理桌面", "打掃房間", "換牙刷"],
    "健康": ["補藥盒", "清洗水壺", "更換口罩備品"],
    "其他": ["整理雜物"]
  },
  emergencySupply: ["OK繃", "紗布", "優碘", "生理食鹽水", "口罩", "酒精", "體溫計", "手電筒", "電池", "行動電源", "飲用水", "乾糧"]
};

const fieldOptions = {
  foodStatus: ["待吃", "已吃", "丟棄", "過期"],
  stock: ["有", "快沒了", "沒有"],
  medStock: ["充足", "快沒了", "沒有"],
  restockCycle: ["不提醒", "每週", "每月", "自訂天數"],
  choreCycle: ["不提醒", "每 3 天", "每週", "每 2 週", "每月", "自訂天數"],
  medType: ["止痛退燒", "感冒", "腸胃", "過敏", "外傷急救", "慢性備藥", "其他"],
  unit: ["顆", "包", "瓶", "條", "片", "盒", "其他"],
  supplyType: ["急救", "防災", "衛生", "照明", "其他"],
  dateType: ["一般紀錄", "重要日", "回診", "繳費", "約定", "其他"],
  dateStatus: ["待處理", "已完成", "純紀錄"]
};

let records = loadRecords();
let activeHomeCategory = "全部";
let activeView = "home";
let editingId = null;
let editingType = null;

const els = {
  homeView: document.querySelector("#homeView"),
  listView: document.querySelector("#listView"),
  homeCategoryFilters: document.querySelector("#homeCategoryFilters"),
  reminderSections: document.querySelector("#reminderSections"),
  todayText: document.querySelector("#todayText"),
  listTitle: document.querySelector("#listTitle"),
  addFromList: document.querySelector("#addFromList"),
  recordList: document.querySelector("#recordList"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  recordDialog: document.querySelector("#recordDialog"),
  recordForm: document.querySelector("#recordForm"),
  formMode: document.querySelector("#formMode"),
  formTitle: document.querySelector("#formTitle"),
  quickPresetArea: document.querySelector("#quickPresetArea"),
  formFields: document.querySelector("#formFields"),
  dataDialog: document.querySelector("#dataDialog"),
  importJson: document.querySelector("#importJson")
};

init();

function init() {
  els.todayText.textContent = formatDate(today());
  renderHomeCategoryFilters();
  bindEvents();
  render();
}

function bindEvents() {
  document.querySelectorAll("[data-create]").forEach((button) => {
    button.addEventListener("click", () => openCreateDialog(button.dataset.create));
  });

  document.querySelectorAll(".bottom-nav button").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  [els.searchInput, els.categoryFilter, els.statusFilter, els.sortSelect].forEach((input) => {
    input.addEventListener("input", renderList);
  });

  els.addFromList.addEventListener("click", () => {
    const type = activeView === "all" ? "food" : activeView;
    openCreateDialog(type);
  });

  els.recordForm.addEventListener("submit", saveForm);
  document.querySelector("#cancelForm").addEventListener("click", closeRecordDialog);
  document.querySelector("#closeDialog").addEventListener("click", closeRecordDialog);
  document.querySelector("#openDataPanel").addEventListener("click", () => els.dataDialog.showModal());
  document.querySelector("#closeDataPanel").addEventListener("click", () => els.dataDialog.close());
  document.querySelector("#exportJson").addEventListener("click", exportJson);
  document.querySelector("#loadSampleData").addEventListener("click", loadSampleData);
  document.querySelector("#clearAllData").addEventListener("click", clearAllData);
  els.importJson.addEventListener("change", importJson);
}

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function render() {
  renderHome();
  if (activeView !== "home") renderList();
}

function renderHomeCategoryFilters() {
  els.homeCategoryFilters.innerHTML = categories.map((category) => (
    `<button type="button" class="${category === activeHomeCategory ? "active" : ""}" data-category="${escapeAttr(category)}">${escapeHtml(category)}</button>`
  )).join("");

  els.homeCategoryFilters.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activeHomeCategory = button.dataset.category;
      renderHomeCategoryFilters();
      renderHome();
    });
  });
}

function renderHome() {
  const source = filterByHomeCategory(records);
  const sections = [
    { title: "快吃掉", items: getFoodReminders(source) },
    { title: "該補貨", items: getRestockReminders(source) },
    { title: "該洗／該處理", items: getChoreReminders(source) },
    { title: "藥品備品提醒", items: getMedicineReminders(source) },
    { title: "日期提醒", items: getDateLogReminders(source) },
    { title: "最近紀錄", items: getRecentRecords(source) }
  ];

  els.reminderSections.innerHTML = sections.map((section) => renderReminderSection(section)).join("");
  if (!sections.some((section) => section.items.length)) {
    els.reminderSections.append(document.querySelector("#emptyStateTemplate").content.cloneNode(true));
  }
  bindCardActions(els.reminderSections);
}

function renderReminderSection(section) {
  const cards = section.items.length
    ? section.items.map((entry) => renderRecordCard(entry.record || entry, { compact: true, reason: entry.reason, severity: entry.severity })).join("")
    : `<div class="empty-state"><strong>暫時沒有</strong><span>有需要注意的項目時會出現在這裡。</span></div>`;

  return `
    <section class="reminder-section">
      <div class="reminder-title">
        <h3>${escapeHtml(section.title)}</h3>
        <span class="count-badge">${section.items.length}</span>
      </div>
      <div class="card-stack">${cards}</div>
    </section>
  `;
}

function switchView(view) {
  activeView = view;
  document.querySelectorAll(".bottom-nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  els.homeView.classList.toggle("hidden", view !== "home");
  els.listView.classList.toggle("hidden", view === "home");

  if (view !== "home") {
    els.listTitle.textContent = typeLabels[view] || "全部紀錄";
    setupListFilters();
    renderList();
  }
}

function setupListFilters() {
  const categoryChoices = activeView === "all"
    ? categories
    : ["全部", ...new Set(getRecordsForView().map((record) => record.category).filter(Boolean))];
  els.categoryFilter.innerHTML = categoryChoices.map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join("");
  els.statusFilter.innerHTML = getStatusChoices().map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join("");
  els.searchInput.value = "";
  els.statusFilter.value = "全部";
  els.sortSelect.value = "updatedDesc";
}

function renderList() {
  let list = getRecordsForView();
  const keyword = els.searchInput.value.trim().toLowerCase();
  const category = els.categoryFilter.value;
  const status = els.statusFilter.value;

  if (keyword) {
    list = list.filter((record) => searchableText(record).includes(keyword));
  }
  if (category && category !== "全部") {
    list = list.filter((record) => record.category === category);
  }
  if (status && status !== "全部") {
    list = list.filter((record) => getRecordStatus(record) === status);
  }

  list = sortRecords(list, els.sortSelect.value);
  els.recordList.innerHTML = list.length
    ? list.map((record) => renderRecordCard(record)).join("")
    : `<div class="empty-state"><strong>沒有符合的紀錄</strong><span>可以調整搜尋或新增一筆資料。</span></div>`;
  bindCardActions(els.recordList);
}

function getRecordsForView() {
  return activeView === "all" ? [...records] : records.filter((record) => record.type === activeView);
}

function getStatusChoices() {
  const base = ["全部"];
  if (activeView === "food") return [...base, ...fieldOptions.foodStatus];
  if (activeView === "item" || activeView === "emergencySupply") return [...base, ...fieldOptions.stock];
  if (activeView === "medicine") return [...base, ...fieldOptions.medStock];
  if (activeView === "chore") return [...base, "已完成", "待處理"];
  if (activeView === "medicationLog") return [...base, "已紀錄"];
  if (activeView === "dateLog") return [...base, ...fieldOptions.dateStatus];
  return [...base, "待吃", "已吃", "丟棄", "過期", "有", "快沒了", "沒有", "充足", "已完成", "待處理", "純紀錄", "已紀錄"];
}

function renderRecordCard(record, options = {}) {
  const severity = options.severity || severityForRecord(record);
  const dateLine = getPrimaryDateLine(record);
  const status = getRecordStatus(record);
  const reason = options.reason ? `<div class="meta-row"><strong>${escapeHtml(options.reason)}</strong></div>` : "";
  const action = getCompleteAction(record);
  const actionButtons = action
    ? `<button type="button" data-action="complete">${escapeHtml(action.label)}</button>
       <button type="button" data-action="edit">編輯</button>
       <button class="danger" type="button" data-action="delete">刪除</button>`
    : `<button type="button" data-action="edit">編輯</button>
       <button class="danger" type="button" data-action="delete">刪除</button>`;
  const note = record.note ? `<div class="muted small">${escapeHtml(record.note)}</div>` : "";

  return `
    <article class="record-card severity-${severity}" data-id="${escapeAttr(record.id)}">
      <div class="card-head">
        <div>
          <div class="card-name">${escapeHtml(getRecordName(record))}</div>
          <div class="meta-row">
            <span class="tag">${escapeHtml(typeLabels[record.type] || record.type)}</span>
            <span class="tag">${escapeHtml(record.category || "其他")}</span>
            <span>${escapeHtml(dateLine)}</span>
          </div>
        </div>
        <span class="status-pill">${escapeHtml(status)}</span>
      </div>
      ${reason}
      ${renderKeyDetails(record)}
      ${note}
      <div class="card-actions">
        ${actionButtons}
      </div>
    </article>
  `;
}

function renderKeyDetails(record) {
  const details = [];
  if (record.location) details.push(`位置：${record.location}`);
  if (record.quantity) details.push(`數量：${record.quantity}${record.unit || ""}`);
  if (record.purpose) details.push(`用途：${record.purpose}`);
  if (record.dateType) details.push(`類型：${record.dateType}`);
  if (record.reason) details.push(`原因：${record.reason}`);
  if (record.beforeSymptom) details.push(`使用前：${record.beforeSymptom}`);
  if (record.afterStatus) details.push(`使用後：${record.afterStatus}`);
  return details.length ? `<div class="meta-row">${details.map((text) => `<span>${escapeHtml(text)}</span>`).join("")}</div>` : "";
}

function bindCardActions(root) {
  root.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest("[data-id]");
      const record = records.find((item) => item.id === card.dataset.id);
      if (!record) return;
      const action = button.dataset.action;
      if (action === "edit") openEditDialog(record);
      if (action === "delete") deleteRecord(record.id);
      if (action === "complete") completeRecord(record.id);
    });
  });
}

function openCreateDialog(type) {
  editingId = null;
  editingType = type === "restock" ? "item" : type;
  els.formMode.textContent = "新增";
  els.formTitle.textContent = type === "restock" ? "補貨了" : `新增${typeLabels[editingType]}`;
  renderPresetArea(editingType, type);
  renderFormFields(getDefaults(editingType, type));
  els.recordDialog.showModal();
}

function openEditDialog(record) {
  editingId = record.id;
  editingType = record.type;
  els.formMode.textContent = "編輯";
  els.formTitle.textContent = `編輯${typeLabels[record.type]}`;
  els.quickPresetArea.innerHTML = "";
  renderFormFields(record);
  els.recordDialog.showModal();
}

function closeRecordDialog() {
  els.recordDialog.close();
  editingId = null;
  editingType = null;
}

function renderPresetArea(type, createMode) {
  const presets = getPresetsForType(type);
  if (!presets.length) {
    els.quickPresetArea.innerHTML = "";
    return;
  }

  els.quickPresetArea.innerHTML = `
    <div>
      <p class="muted small">常用項目一鍵新增</p>
      <div class="preset-grid">
        ${presets.map((preset) => `<button type="button" data-preset="${escapeAttr(preset.name)}" data-category="${escapeAttr(preset.category || "")}">${escapeHtml(preset.name)}</button>`).join("")}
      </div>
    </div>
  `;

  els.quickPresetArea.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const record = getDefaults(type, createMode);
      record.name = button.dataset.preset;
      if (button.dataset.category) record.category = button.dataset.category;
      addRecord(record);
      closeRecordDialog();
      switchView("home");
    });
  });
}

function getPresetsForType(type) {
  if (type === "food") return quickPresets.food.map((name) => ({ name }));
  if (type === "emergencySupply") return quickPresets.emergencySupply.map((name) => ({ name }));
  if (type === "item") {
    return Object.entries(quickPresets.item).flatMap(([category, names]) => names.map((name) => ({ name, category })));
  }
  if (type === "chore") {
    return Object.entries(quickPresets.chore).flatMap(([category, names]) => names.map((name) => ({ name, category })));
  }
  return [];
}

function renderFormFields(record) {
  const configs = getFieldConfig(record.type);
  const mainFields = configs.filter((field) => !field.optional);
  const optionalFields = configs.filter((field) => field.optional);

  els.formFields.innerHTML = `
    <div class="field-grid">${mainFields.map((field) => renderField(field, record)).join("")}</div>
    ${optionalFields.length ? `
      <details>
        <summary>更多欄位</summary>
        <div class="details-grid">${optionalFields.map((field) => renderField(field, record)).join("")}</div>
      </details>
    ` : ""}
  `;
}

function getFieldConfig(type) {
  const commonNote = { key: "note", label: "備註", kind: "textarea", optional: true };
  const customDays = { key: "customDays", label: "自訂天數", kind: "number", optional: true };

  if (type === "food") return [
    { key: "name", label: "名稱", required: true },
    { key: "expireDate", label: "到期日", kind: "date" },
    { key: "purchaseDate", label: "購買日期", kind: "date" },
    { key: "status", label: "狀態", kind: "select", options: fieldOptions.foodStatus },
    { key: "location", label: "放置位置", kind: "select", options: locations, optional: true },
    commonNote
  ];

  if (type === "item") return [
    { key: "name", label: "名稱", required: true },
    { key: "category", label: "分類", kind: "select", options: itemCategories },
    { key: "stockStatus", label: "庫存狀態", kind: "select", options: fieldOptions.stock },
    { key: "nextRestockDate", label: "下次補貨提醒日", kind: "date" },
    { key: "purchaseDate", label: "購買日期", kind: "date", optional: true },
    { key: "location", label: "放置位置", optional: true },
    { key: "restockCycle", label: "補貨週期", kind: "select", options: fieldOptions.restockCycle, optional: true },
    customDays,
    commonNote
  ];

  if (type === "chore") return [
    { key: "name", label: "事件名稱", required: true },
    { key: "category", label: "分類", kind: "select", options: choreCategories },
    { key: "completedDate", label: "完成日期", kind: "date" },
    { key: "nextDate", label: "下次提醒日期", kind: "date" },
    { key: "cycle", label: "建議週期", kind: "select", options: fieldOptions.choreCycle, optional: true },
    customDays,
    commonNote
  ];

  if (type === "medicine") return [
    { key: "name", label: "藥品名稱", required: true },
    { key: "medType", label: "藥品類型", kind: "select", options: fieldOptions.medType },
    { key: "stockStatus", label: "庫存狀態", kind: "select", options: fieldOptions.medStock },
    { key: "expireDate", label: "有效期限", kind: "date" },
    { key: "quantity", label: "數量", kind: "number", optional: true },
    { key: "unit", label: "數量單位", kind: "select", options: fieldOptions.unit, optional: true },
    { key: "location", label: "放置位置", optional: true },
    { key: "purpose", label: "用途", optional: true },
    commonNote
  ];

  if (type === "emergencySupply") return [
    { key: "name", label: "名稱", required: true },
    { key: "supplyType", label: "備品類型", kind: "select", options: fieldOptions.supplyType },
    { key: "stockStatus", label: "庫存狀態", kind: "select", options: fieldOptions.stock },
    { key: "quantity", label: "數量", kind: "number", optional: true },
    { key: "expireDate", label: "有效期限", kind: "date", optional: true },
    { key: "location", label: "放置位置", optional: true },
    commonNote
  ];

  if (type === "dateLog") return [
    { key: "name", label: "事項名稱", required: true },
    { key: "date", label: "日期", kind: "date" },
    { key: "status", label: "狀態", kind: "select", options: fieldOptions.dateStatus },
    { key: "category", label: "分類", kind: "select", options: itemCategories },
    { key: "remindDate", label: "提醒日期", kind: "date", optional: true },
    { key: "time", label: "時間", kind: "time", optional: true },
    { key: "dateType", label: "日期類型", kind: "select", options: fieldOptions.dateType, optional: true },
    commonNote
  ];

  return [
    { key: "date", label: "日期", kind: "date" },
    { key: "time", label: "時間", kind: "time" },
    { key: "medicineName", label: "藥品名稱", required: true },
    { key: "reason", label: "使用原因" },
    { key: "beforeSymptom", label: "使用前症狀", optional: true },
    { key: "afterStatus", label: "使用後狀態", optional: true },
    commonNote
  ];
}

function renderField(field, record) {
  const value = record[field.key] ?? "";
  const required = field.required ? "required" : "";
  const inputName = escapeAttr(field.key);
  const label = escapeHtml(field.label);

  if (field.kind === "select") {
    return `
      <label>${label}
        <select name="${inputName}" ${required}>
          ${field.options.map((option) => `<option value="${escapeAttr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  if (field.kind === "textarea") {
    return `<label>${label}<textarea name="${inputName}" ${required}>${escapeHtml(value)}</textarea></label>`;
  }

  const type = field.kind || "text";
  return `<label>${label}<input name="${inputName}" type="${type}" value="${escapeAttr(value)}" ${required} /></label>`;
}

function getDefaults(type, createMode = type) {
  const base = {
    id: makeId(),
    type,
    category: "其他",
    createdAt: nowStamp(),
    updatedAt: nowStamp(),
    note: ""
  };

  if (type === "food") return {
    ...base,
    category: "食",
    name: "",
    purchaseDate: today(),
    location: "冰箱",
    expireDate: addDays(today(), 3),
    status: "待吃"
  };

  if (type === "item") return {
    ...base,
    category: "住／生活",
    name: "",
    purchaseDate: today(),
    location: "",
    stockStatus: createMode === "restock" ? "有" : "有",
    restockCycle: "不提醒",
    nextRestockDate: "",
    customDays: ""
  };

  if (type === "chore") return {
    ...base,
    category: "住／生活",
    name: "",
    completedDate: today(),
    cycle: "每週",
    nextDate: addDays(today(), 7),
    customDays: ""
  };

  if (type === "medicine") return {
    ...base,
    category: "藥品備品",
    name: "",
    medType: "其他",
    quantity: "",
    unit: "顆",
    stockStatus: "充足",
    expireDate: "",
    location: "",
    purpose: ""
  };

  if (type === "emergencySupply") return {
    ...base,
    category: "藥品備品",
    name: "",
    supplyType: "急救",
    stockStatus: "有",
    quantity: "",
    expireDate: "",
    location: ""
  };

  if (type === "dateLog") return {
    ...base,
    category: "其他",
    name: "",
    date: today(),
    time: "",
    dateType: "一般紀錄",
    status: "待處理",
    remindDate: today()
  };

  return {
    ...base,
    category: "藥品備品",
    date: today(),
    time: new Date().toTimeString().slice(0, 5),
    medicineName: "",
    reason: "",
    beforeSymptom: "",
    afterStatus: ""
  };
}

function saveForm(event) {
  event.preventDefault();
  const formData = new FormData(els.recordForm);
  const record = editingId ? { ...records.find((item) => item.id === editingId) } : getDefaults(editingType);
  getFieldConfig(editingType).forEach((field) => {
    record[field.key] = String(formData.get(field.key) || "").trim();
  });

  record.updatedAt = nowStamp();
  if (!record.createdAt) record.createdAt = nowStamp();
  if (!record.category) record.category = getDefaults(editingType).category;
  applyCycleDates(record);

  if (editingId) {
    records = records.map((item) => item.id === editingId ? record : item);
  } else {
    records.unshift(record);
  }

  saveRecords();
  closeRecordDialog();
  switchView("home");
  render();
}

function addRecord(record) {
  record.createdAt = record.createdAt || nowStamp();
  record.updatedAt = nowStamp();
  applyCycleDates(record);
  records.unshift(record);
  saveRecords();
  render();
}

function applyCycleDates(record) {
  if (record.type === "item" && !record.nextRestockDate) {
    record.nextRestockDate = nextDateFromCycle(record.purchaseDate || today(), record.restockCycle, record.customDays);
  }
  if (record.type === "chore" && !record.nextDate) {
    record.nextDate = nextDateFromCycle(record.completedDate || today(), record.cycle, record.customDays);
  }
}

function nextDateFromCycle(baseDate, cycle, customDays) {
  const daysByCycle = {
    "每週": 7,
    "每月": 30,
    "每 3 天": 3,
    "每 2 週": 14
  };
  if (!cycle || cycle === "不提醒") return "";
  const days = cycle === "自訂天數" ? Number(customDays || 0) : daysByCycle[cycle];
  return days ? addDays(baseDate, days) : "";
}

function deleteRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record) return;
  if (!confirm(`確定要刪除「${getRecordName(record)}」嗎？`)) return;
  records = records.filter((item) => item.id !== id);
  saveRecords();
  render();
}

function completeRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record) return;

  if (record.type === "food") record.status = "已吃";
  if (record.type === "item") {
    record.stockStatus = "有";
    record.purchaseDate = today();
    record.nextRestockDate = nextDateFromCycle(today(), record.restockCycle, record.customDays);
  }
  if (record.type === "chore") {
    record.completedDate = today();
    record.nextDate = nextDateFromCycle(today(), record.cycle, record.customDays);
  }
  if (record.type === "medicine") record.stockStatus = "充足";
  if (record.type === "emergencySupply") record.stockStatus = "有";
  if (record.type === "dateLog") record.status = "已完成";
  record.updatedAt = nowStamp();
  saveRecords();
  render();
}

function getCompleteAction(record) {
  if (record.type === "food" && record.status === "待吃") return { label: "已吃" };
  if (record.type === "item" && record.stockStatus !== "有") return { label: "已補貨" };
  if (record.type === "chore") return { label: "已完成" };
  if (record.type === "medicine" && record.stockStatus !== "充足") return { label: "標記充足" };
  if (record.type === "emergencySupply" && record.stockStatus !== "有") return { label: "標記有" };
  if (record.type === "dateLog" && record.status === "待處理") return { label: "已完成" };
  return null;
}

function getFoodReminders(source) {
  return source
    .filter((record) => record.type === "food" && record.status === "待吃" && record.expireDate && daysUntil(record.expireDate) <= 7)
    .sort((a, b) => daysUntil(a.expireDate) - daysUntil(b.expireDate))
    .slice(0, 8)
    .map((record) => ({
      record,
      severity: severityByDays(daysUntil(record.expireDate), 7),
      reason: dueText(record.expireDate, "到期")
    }));
}

function getRestockReminders(source) {
  return source
    .filter((record) => record.type === "item")
    .filter((record) => record.stockStatus === "快沒了" || record.stockStatus === "沒有" || (record.nextRestockDate && daysUntil(record.nextRestockDate) <= 0))
    .sort((a, b) => daysUntil(a.nextRestockDate || today()) - daysUntil(b.nextRestockDate || today()))
    .slice(0, 8)
    .map((record) => ({
      record,
      severity: record.stockStatus === "沒有" ? "red" : severityByDays(daysUntil(record.nextRestockDate), 7),
      reason: record.stockStatus === "有" ? dueText(record.nextRestockDate, "補貨") : `庫存：${record.stockStatus}`
    }));
}

function getChoreReminders(source) {
  return source
    .filter((record) => record.type === "chore" && record.nextDate && daysUntil(record.nextDate) <= 7)
    .sort((a, b) => daysUntil(a.nextDate) - daysUntil(b.nextDate))
    .slice(0, 8)
    .map((record) => ({
      record,
      severity: severityByDays(daysUntil(record.nextDate), 7),
      reason: dueText(record.nextDate, "處理")
    }));
}

function getMedicineReminders(source) {
  return source
    .filter((record) => record.type === "medicine" || record.type === "emergencySupply")
    .filter((record) => {
      const lowStock = ["快沒了", "沒有"].includes(record.stockStatus);
      const expiring = record.expireDate && daysUntil(record.expireDate) <= (record.type === "medicine" ? 90 : 30);
      return lowStock || expiring;
    })
    .sort((a, b) => daysUntil(a.expireDate || addDays(today(), 999)) - daysUntil(b.expireDate || addDays(today(), 999)))
    .slice(0, 8)
    .map((record) => {
      const expireDays = record.expireDate ? daysUntil(record.expireDate) : 999;
      const reason = ["快沒了", "沒有"].includes(record.stockStatus) ? `庫存：${record.stockStatus}` : dueText(record.expireDate, "到期");
      return { record, severity: medicineSeverity(record, expireDays), reason };
    });
}

function getDateLogReminders(source) {
  return source
    .filter((record) => record.type === "dateLog")
    .filter((record) => record.status === "待處理" && (record.remindDate || record.date) && daysUntil(record.remindDate || record.date) <= 7)
    .sort((a, b) => daysUntil(a.remindDate || a.date) - daysUntil(b.remindDate || b.date))
    .slice(0, 8)
    .map((record) => ({
      record,
      severity: severityByDays(daysUntil(record.remindDate || record.date), 7),
      reason: dueText(record.remindDate || record.date, "提醒")
    }));
}

function getRecentRecords(source) {
  return [...source]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, 6)
    .map((record) => ({ record, severity: severityForRecord(record), reason: "最近新增或更新" }));
}

function filterByHomeCategory(source) {
  return activeHomeCategory === "全部" ? source : source.filter((record) => record.category === activeHomeCategory);
}

function severityForRecord(record) {
  if (record.type === "food") {
    if (record.status !== "待吃") return "gray";
    return record.expireDate ? severityByDays(daysUntil(record.expireDate), 7) : "green";
  }
  if (record.type === "item") {
    if (record.stockStatus === "沒有") return "red";
    if (record.stockStatus === "快沒了") return "orange";
    return record.nextRestockDate ? severityByDays(daysUntil(record.nextRestockDate), 7) : "green";
  }
  if (record.type === "chore") return record.nextDate ? severityByDays(daysUntil(record.nextDate), 7) : "gray";
  if (record.type === "medicine" || record.type === "emergencySupply") return medicineSeverity(record, record.expireDate ? daysUntil(record.expireDate) : 999);
  if (record.type === "dateLog") {
    if (record.status === "已完成" || record.status === "純紀錄") return "gray";
    return (record.remindDate || record.date) ? severityByDays(daysUntil(record.remindDate || record.date), 7) : "green";
  }
  return "gray";
}

function severityByDays(days, normalLimit = 7) {
  if (Number.isNaN(days)) return "green";
  if (days <= 0) return "red";
  if (days <= 3) return "orange";
  if (days <= normalLimit) return "yellow";
  return "green";
}

function medicineSeverity(record, days) {
  if (record.stockStatus === "沒有") return "red";
  if (record.stockStatus === "快沒了") return "orange";
  if (record.expireDate) {
    if (days <= 0) return "red";
    if (record.type === "medicine" && days <= 30) return "orange";
    if (record.type === "medicine" && days <= 90) return "yellow";
    if (record.type === "emergencySupply" && days <= 30) return "yellow";
  }
  return "green";
}

function daysUntil(dateString) {
  if (!dateString) return Number.NaN;
  const base = new Date(`${today()}T00:00:00`);
  const target = new Date(`${dateString}T00:00:00`);
  return Math.round((target - base) / 86400000);
}

function dueText(dateString, label) {
  const days = daysUntil(dateString);
  if (Number.isNaN(days)) return "";
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`;
  if (days === 0) return `今天${label}`;
  return `${days} 天後${label}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + Number(days));
  return date.toISOString().slice(0, 10);
}

function getRecordName(record) {
  return record.name || record.medicineName || "未命名";
}

function getRecordStatus(record) {
  if (record.type === "food") return record.status || "待吃";
  if (record.type === "item" || record.type === "emergencySupply" || record.type === "medicine") return record.stockStatus || "未知";
  if (record.type === "chore") return record.nextDate && daysUntil(record.nextDate) <= 0 ? "待處理" : "已完成";
  if (record.type === "medicationLog") return "已紀錄";
  if (record.type === "dateLog") return record.status || "待處理";
  return "未知";
}

function getPrimaryDateLine(record) {
  if (record.type === "food") return `買：${formatDate(record.purchaseDate)}｜到期：${formatDate(record.expireDate)}`;
  if (record.type === "item") return `買：${formatDate(record.purchaseDate)}${record.nextRestockDate ? `｜補貨：${formatDate(record.nextRestockDate)}` : ""}`;
  if (record.type === "chore") return `完成：${formatDate(record.completedDate)}${record.nextDate ? `｜下次：${formatDate(record.nextDate)}` : ""}`;
  if (record.type === "medicine") return record.expireDate ? `期限：${formatDate(record.expireDate)}` : "未填有效期限";
  if (record.type === "emergencySupply") return record.expireDate ? `期限：${formatDate(record.expireDate)}` : "有效期限可空白";
  if (record.type === "medicationLog") return `${formatDate(record.date)} ${record.time || ""}`;
  if (record.type === "dateLog") return `日期：${formatDate(record.date)}${record.remindDate ? `｜提醒：${formatDate(record.remindDate)}` : ""}${record.time ? `｜${record.time}` : ""}`;
  return "";
}

function formatDate(dateString) {
  if (!dateString) return "未設定";
  return dateString.replaceAll("-", "/");
}

function searchableText(record) {
  return Object.values(record).join(" ").toLowerCase();
}

function sortRecords(list, mode) {
  const getDate = (record) => record.remindDate || record.expireDate || record.nextDate || record.nextRestockDate || record.completedDate || record.purchaseDate || record.date || record.updatedAt || "";
  return [...list].sort((a, b) => {
    if (mode === "nameAsc") return getRecordName(a).localeCompare(getRecordName(b), "zh-Hant");
    if (mode === "dateAsc") return getDate(a).localeCompare(getDate(b));
    if (mode === "dateDesc") return getDate(b).localeCompare(getDate(a));
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });
}

function exportJson() {
  const payload = {
    app: "Life Reminder Hub",
    version: 1,
    exportedAt: nowStamp(),
    records
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `life-reminder-hub-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const importedRecords = Array.isArray(parsed) ? parsed : parsed.records;
      if (!Array.isArray(importedRecords)) throw new Error("JSON 格式不符");
      if (!confirm("匯入會覆蓋目前資料，確定繼續嗎？")) return;
      records = importedRecords.map(normalizeRecord);
      saveRecords();
      els.dataDialog.close();
      render();
      alert("匯入完成");
    } catch (error) {
      alert(`匯入失敗：${error.message}`);
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function normalizeRecord(record) {
  return {
    ...record,
    id: record.id || makeId(),
    createdAt: record.createdAt || nowStamp(),
    updatedAt: record.updatedAt || nowStamp()
  };
}

function clearAllData() {
  if (!confirm("確定要清除全部資料嗎？這個動作無法復原。")) return;
  records = [];
  saveRecords();
  els.dataDialog.close();
  render();
}

function loadSampleData() {
  if (records.length && !confirm("載入測試資料會加入到目前資料中，確定嗎？")) return;
  const sample = [
    { ...getDefaults("food"), name: "便當", expireDate: today(), location: "冰箱" },
    { ...getDefaults("food"), name: "牛奶", expireDate: addDays(today(), 2), location: "冰箱" },
    { ...getDefaults("item"), name: "衛生紙", category: "住／生活", stockStatus: "快沒了", nextRestockDate: today() },
    { ...getDefaults("item"), name: "無咖啡因飲品", category: "食", stockStatus: "沒有", nextRestockDate: "" },
    { ...getDefaults("chore"), name: "洗床單", category: "衣", completedDate: addDays(today(), -14), nextDate: today(), cycle: "每 2 週" },
    { ...getDefaults("chore"), name: "清冰箱", category: "住／生活", completedDate: addDays(today(), -25), nextDate: addDays(today(), 3), cycle: "每月" },
    { ...getDefaults("medicine"), name: "退燒止痛藥", medType: "止痛退燒", stockStatus: "快沒了", expireDate: addDays(today(), 25), quantity: "4", unit: "顆", location: "藥箱" },
    { ...getDefaults("emergencySupply"), name: "OK繃", supplyType: "急救", stockStatus: "有", quantity: "1", location: "藥箱" },
    { ...getDefaults("emergencySupply"), name: "電池", supplyType: "照明", stockStatus: "沒有", quantity: "", location: "收納櫃" },
    { ...getDefaults("medicationLog"), medicineName: "胃藥", reason: "胃不舒服", beforeSymptom: "悶痛", afterStatus: "稍微緩解" },
    { ...getDefaults("dateLog"), name: "回診提醒", category: "健康", dateType: "回診", date: addDays(today(), 2), remindDate: addDays(today(), 1), status: "待處理", note: "記得帶健保卡" }
  ].map((record) => ({ ...record, id: makeId(), createdAt: nowStamp(), updatedAt: nowStamp() }));
  records = [...sample, ...records];
  saveRecords();
  els.dataDialog.close();
  render();
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
