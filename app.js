const STORAGE_KEY = "infp_evolution_optimized";
const DB_NAME = "infp-evolution-files";
const DB_STORE = "handles";

const pages = {
  dashboard: "仪表盘",
  tasks: "今日三任务",
  experiment: "实验日志",
  academic: "学术看板",
  fitness: "健身记录",
  review: "晚间复盘",
  weekly: "周度检查",
  history: "历史记录",
  settings: "设置"
};

const defaultState = {
  theme: "light",
  settings: {
    name: "INFP Explorer",
    stage: "III+",
    experimentType: "科研/实验推进",
    labHours: { start: "09:00", end: "17:00" },
    analysisHours: { start: "20:00", end: "22:00" },
    gymDays: [1, 3, 5],
    gymGoal: "力量训练 + 有氧",
    showStreak: true
  },
  records: {},
  weekly: {},
  createdAt: localDate(),
  updatedAt: localDateTime()
};

let state = loadState();
let route = "dashboard";
let directoryHandle = null;
let saveTimer = null;

const view = document.querySelector("#view");
const pageTitle = document.querySelector("#page-title");
const todayLine = document.querySelector("#today-line");
const saveState = document.querySelector("#save-state");
const storageState = document.querySelector("#storage-state");
const toast = document.querySelector("#toast");

function localDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function localDateTime() {
  const now = new Date();
  return `${localDate(now)} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function formatDate(dateKey) {
  const [year, month, day] = dateKey.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function weekdayName(date = new Date()) {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "夜深了";
  if (h < 12) return "早晨好";
  if (h < 18) return "下午好";
  return "晚上好";
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem("infp_evolution_data");
      return legacy ? migrateLegacy(JSON.parse(legacy)) : structuredClone(defaultState);
    }
    return migrateState(JSON.parse(raw));
  } catch {
    return structuredClone(defaultState);
  }
}

function migrateState(next) {
  const merged = {
    ...structuredClone(defaultState),
    ...next,
    settings: { ...defaultState.settings, ...(next.settings || {}) },
    records: next.records || {},
    weekly: next.weekly || {}
  };
  delete merged.settings.commonReagents;
  return merged;
}

function migrateLegacy(legacy) {
  const next = structuredClone(defaultState);
  next.settings = { ...next.settings, ...(legacy.settings || {}) };
  delete next.settings.commonReagents;
  const dates = new Set([
    ...Object.keys(legacy.tasks || {}),
    ...Object.keys(legacy.experiments || {}),
    ...Object.keys(legacy.academic || {}),
    ...Object.keys(legacy.fitness || {}),
    ...Object.keys(legacy.reviews || {})
  ]);

  dates.forEach((dateKey) => {
    next.records[dateKey] = {
      date: dateKey,
      tasks: legacy.tasks?.[dateKey] || {
        items: [
          { id: makeId(), text: "", done: false },
          { id: makeId(), text: "", done: false },
          { id: makeId(), text: "", done: false }
        ]
      },
      experiment: legacy.experiments?.[dateKey] || {
        isExpDay: false,
        goal: "",
        checklist: ["", "", ""],
        steps: [],
        conclusion: "",
        nextStep: "",
        nonExpTasks: { am: "", pm: "", evening: "" }
      },
      academic: legacy.academic?.[dateKey] || { papers: 0, code: 0, experiments: 0, pomodoros: 0, output: "" },
      fitness: legacy.fitness?.[dateKey]
        ? { done: true, ...legacy.fitness[dateKey] }
        : { done: false, type: next.settings.gymGoal, duration: 60, intensity: "medium", note: "" },
      review: {
        mood: legacy.reviews?.[dateKey]?.mood || 0,
        tasksDone: legacy.reviews?.[dateKey]?.tasksDone === true ? "yes" : legacy.reviews?.[dateKey]?.tasksDone === false ? "no" : "",
        bestAction: legacy.reviews?.[dateKey]?.bestAction || "",
        blocker: legacy.reviews?.[dateKey]?.blocker || legacy.reviews?.[dateKey]?.tasksDetail || "",
        gymDone: legacy.reviews?.[dateKey]?.gymDone === true ? "yes" : legacy.reviews?.[dateKey]?.gymDone === false ? "no" : "",
        tomorrow: legacy.reviews?.[dateKey]?.tomorrow || ""
      },
      updatedAt: localDateTime()
    };
  });

  next.updatedAt = localDateTime();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function todayRecord() {
  return ensureRecord(localDate());
}

function getRecord(dateKey) {
  return state.records[dateKey] || blankRecord(dateKey);
}

function blankRecord(dateKey) {
  return {
    date: dateKey,
    tasks: {
      items: [
        { id: `blank-${dateKey}-1`, text: "", done: false },
        { id: `blank-${dateKey}-2`, text: "", done: false },
        { id: `blank-${dateKey}-3`, text: "", done: false }
      ]
    },
    experiment: {
      isExpDay: false,
      goal: "",
      checklist: ["", "", ""],
      steps: [],
      conclusion: "",
      nextStep: "",
      nonExpTasks: { am: "", pm: "", evening: "" }
    },
    academic: { papers: 0, code: 0, experiments: 0, pomodoros: 0, output: "" },
    fitness: { done: false, type: state.settings.gymGoal, duration: 60, intensity: "medium", note: "" },
    review: { mood: 0, tasksDone: "", bestAction: "", blocker: "", gymDone: "", tomorrow: "" },
    updatedAt: ""
  };
}

function ensureRecord(dateKey) {
  if (!state.records[dateKey]) {
    state.records[dateKey] = {
      date: dateKey,
      tasks: {
        items: [
          { id: makeId(), text: "", done: false },
          { id: makeId(), text: "", done: false },
          { id: makeId(), text: "", done: false }
        ]
      },
      experiment: {
        isExpDay: false,
        goal: "",
        checklist: ["", "", ""],
        steps: [],
        conclusion: "",
        nextStep: "",
        nonExpTasks: { am: "", pm: "", evening: "" }
      },
      academic: { papers: 0, code: 0, experiments: 0, pomodoros: 0, output: "" },
      fitness: { done: false, type: state.settings.gymGoal, duration: 60, intensity: "medium", note: "" },
      review: {
        mood: 0,
        tasksDone: "",
        bestAction: "",
        blocker: "",
        gymDone: "",
        tomorrow: ""
      },
      updatedAt: localDateTime()
    };
  }
  return state.records[dateKey];
}

function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function scheduleSave(message = "正在保存") {
  saveState.textContent = message;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveAll, 350);
}

async function saveAll() {
  state.updatedAt = localDateTime();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveState.textContent = "已保存";
  if (directoryHandle) await writeDailyFile(localDate());
}

async function writeDailyFile(dateKey) {
  try {
    const permission = await verifyPermission(directoryHandle, true);
    if (!permission) {
      storageState.textContent = "等待文件夹写入授权";
      return;
    }
    const record = ensureRecord(dateKey);
    const fileHandle = await directoryHandle.getFileHandle(`${dateKey}.json`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(record, null, 2));
    await writable.close();
    storageState.textContent = `已同步到 ${dateKey}.json`;
  } catch (error) {
    storageState.textContent = "文件夹同步失败，已保存在浏览器";
  }
}

async function verifyPermission(handle, writable) {
  const options = writable ? { mode: "readwrite" } : {};
  if ((await handle.queryPermission(options)) === "granted") return true;
  if ((await handle.requestPermission(options)) === "granted") return true;
  return false;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  const icon = document.querySelector("#theme-toggle i");
  if (icon) {
    icon.className = theme === "dark" ? "ph ph-moon" : "ph ph-sun";
  }
  scheduleSave();
}

function routeTo(nextRoute) {
  route = nextRoute;
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.route === route);
  });
  pageTitle.textContent = pages[route];

  // View transition animation
  view.style.opacity = "0";
  view.style.transform = "translateY(8px)";
  setTimeout(() => {
    render();
    requestAnimationFrame(() => {
      view.style.opacity = "1";
      view.style.transform = "translateY(0)";
    });
  }, 180);
}

function render() {
  ensureRecord(localDate());
  todayLine.textContent = `${formatDate(localDate())} · ${weekdayName()} · ${greeting()}`;
  if (route === "dashboard") renderDashboard();
  if (route === "tasks") renderTasks();
  if (route === "experiment") renderExperiment();
  if (route === "academic") renderAcademic();
  if (route === "fitness") renderFitness();
  if (route === "review") renderReview();
  if (route === "weekly") renderWeekly();
  if (route === "history") renderHistory();
  if (route === "settings") renderSettings();
}

function renderDashboard() {
  const record = todayRecord();
  const records = Object.values(state.records);
  const taskDone = record.tasks.items.filter((item) => item.done).length;
  const reviewDone = Boolean(record.review.tomorrow || record.review.bestAction || record.review.blocker);
  const academicDays = records.filter((r) => hasAcademic(r.academic)).length;
  const expDays = records.filter((r) => r.experiment.isExpDay).length;
  const score = dayScore(record);
  const offset = 440 - (440 * score / 100);

  view.innerHTML = `
    <div class="bento">
      <!-- Greeting -->
      <div class="bento-item col-2" style="display:flex;flex-direction:column;justify-content:center;">
        <span class="eyebrow">Today</span>
        <h3 style="font-size:26px;font-weight:700;letter-spacing:-0.02em;margin-bottom:8px;">${greeting()}，${state.settings.name}</h3>
        <p class="muted" style="font-size:14px;line-height:1.6;">
          今天是${formatDate(localDate())}。${record.experiment.isExpDay ? "实验日，穿上实验服启动机器人模式。" : "非实验日，上午深度动脑，下午推进分析。"}
        </p>
      </div>

      <!-- Ring Progress -->
      <div class="bento-item" style="display:flex;align-items:center;justify-content:center;">
        <div class="ring-progress">
          <svg viewBox="0 0 160 160">
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--accent)"/>
                <stop offset="100%" stop-color="var(--accent-soft)"/>
              </linearGradient>
            </defs>
            <circle class="ring-bg" cx="80" cy="80" r="70"/>
            <circle class="ring-fill" cx="80" cy="80" r="70" style="stroke-dashoffset: ${offset}"/>
          </svg>
          <div class="ring-inner">
            <strong>${score}%</strong>
            <span>今日完成</span>
          </div>
        </div>
      </div>

      <!-- Tasks -->
      <div class="bento-item col-2">
        <div class="section-title" style="margin-bottom:12px;">
          <div>
            <span class="eyebrow">Execution</span>
            <h3 style="font-size:18px;font-weight:700;margin:0;">今日三任务</h3>
          </div>
          <button class="soft-button" data-go="tasks">展开</button>
        </div>
        <div class="stack">
          ${record.tasks.items.map((item, index) => `
            <div class="task-row">
              <input type="checkbox" data-path="tasks.items.${index}.done" ${item.done ? "checked" : ""}>
              <input value="${escapeHtml(item.text)}" data-path="tasks.items.${index}.text" placeholder="任务 ${index + 1}: 写成一个可以完成的动作">
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Experiment -->
      <div class="bento-item">
        <div style="margin-bottom:12px;">
          <span class="eyebrow">Lab</span>
          <h3 style="font-size:18px;font-weight:700;margin:6px 0 0;">实验状态</h3>
        </div>
        <p style="font-size:28px;font-weight:700;color:var(--text-primary);margin:8px 0;">
          ${record.experiment.isExpDay ? "实验日" : "非实验日"}
        </p>
        <p class="muted" style="font-size:13px;line-height:1.5;">
          ${record.experiment.goal || record.experiment.nonExpTasks.am || "尚未设定今日目标"}
        </p>
        <div style="margin-top:14px;">
          <button class="soft-button" data-go="experiment" style="width:100%;">记录实验</button>
        </div>
      </div>

      <!-- Fitness -->
      <div class="bento-item">
        <div style="margin-bottom:12px;">
          <span class="eyebrow">Fitness</span>
          <h3 style="font-size:18px;font-weight:700;margin:6px 0 0;">健身打卡</h3>
        </div>
        <p style="font-size:28px;font-weight:700;color:var(--text-primary);margin:8px 0;">
          ${record.fitness.done ? "已完成" : "待打卡"}
        </p>
        <p class="muted" style="font-size:13px;">本周 ${weekDates().filter((d) => getRecord(d).fitness.done).length}/${state.settings.gymDays.length} 次 · 连续 ${calculateStreak()} 天</p>
        <div style="margin-top:14px;">
          <button class="soft-button" data-go="fitness" style="width:100%;">${record.fitness.done ? "查看记录" : "去打卡"}</button>
        </div>
      </div>

      <!-- Weekly Trend -->
      <div class="bento-item col-3">
        <div class="section-title" style="margin-bottom:14px;">
          <div>
            <span class="eyebrow">Rhythm</span>
            <h3 style="font-size:18px;font-weight:700;margin:0;">最近 7 天</h3>
          </div>
        </div>
        <div style="display:flex;align-items:flex-end;gap:8px;height:100px;padding-top:10px;">
          ${recentDates(7).reverse().map((dateKey) => {
            const day = getRecord(dateKey);
            const s = dayScore(day);
            const isToday = dateKey === localDate();
            return `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
                <div style="width:100%;background:var(--line);border-radius:99px;overflow:hidden;height:80px;position:relative;">
                  <div style="position:absolute;bottom:0;left:0;right:0;background:${isToday ? 'var(--accent)' : 'var(--accent-soft)'};border-radius:99px;transition:height 0.6s ease;height:${s}%;opacity:${isToday ? 1 : 0.6};"></div>
                </div>
                <span style="font-size:11px;font-weight:600;color:${isToday ? 'var(--accent)' : 'var(--text-muted)'};">${dateKey.slice(5).replace('-','/')}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderTasks() {
  const record = todayRecord();
  view.innerHTML = `
    <section class="card" style="max-width:680px;margin:0 auto;">
      <div class="section-title">
        <div>
          <span class="eyebrow">Execution</span>
          <h3>${formatDate(record.date)} · 三任务</h3>
        </div>
        <span class="muted">输入和勾选会自动保存</span>
      </div>
      <div class="stack">
        ${record.tasks.items.map((item, index) => `
          <div class="task-row">
            <input type="checkbox" data-path="tasks.items.${index}.done" ${item.done ? "checked" : ""}>
            <input value="${escapeHtml(item.text)}" data-path="tasks.items.${index}.text" placeholder="任务 ${index + 1}: 具体、可执行、可验证">
          </div>
        `).join("")}
      </div>
      <div style="margin-top:18px;padding:16px;background:var(--surface-secondary);border-radius:var(--radius-md);border:1px solid var(--line);">
        <p style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">填写指南</p>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;">
          <p style="margin-bottom:6px;"><span style="color:var(--danger);margin-right:6px;">✕</span> 模糊目标："今天看文献"、"做实验"</p>
          <p><span style="color:var(--success);margin-right:6px;">✓</span> 具体目标："跑通A组数据代码"、"完成X样品的Y测试"</p>
        </div>
      </div>
    </section>
  `;
}

function renderExperiment() {
  const exp = todayRecord().experiment;
  view.innerHTML = `
    <section class="card stack" style="max-width:900px;margin:0 auto;">
      <div class="section-title">
        <div>
          <span class="eyebrow">Lab / Theory</span>
          <h3>今日判定</h3>
        </div>
        <div class="segmented" id="exp-segmented">
          <button class="${!exp.isExpDay ? "active" : ""}" data-exp-day="false">非实验日</button>
          <button class="${exp.isExpDay ? "active" : ""}" data-exp-day="true">实验日</button>
        </div>
      </div>
      ${exp.isExpDay ? renderExpDay(exp) : renderNonExpDay(exp)}
    </section>

    <section class="card" style="margin-top:18px;max-width:900px;margin-left:auto;margin-right:auto;">
      <div class="section-title">
        <h3>最近实验记录</h3>
      </div>
      <div class="timeline">
        ${Object.values(state.records).filter((r) => r.experiment.isExpDay || hasNonExp(r.experiment)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((record) => `
          <div class="timeline-item">
            <strong>${formatDate(record.date)} · ${record.experiment.isExpDay ? "实验日" : "非实验日"}</strong>
            <p class="muted">${record.experiment.isExpDay ? record.experiment.goal || "未写目标" : record.experiment.nonExpTasks.am || "未写上午任务"}</p>
          </div>
        `).join("") || `<p class="muted">还没有实验记录。</p>`}
      </div>
    </section>
  `;
  requestAnimationFrame(() => updateSegmented("exp-segmented"));
}

function renderExpDay(exp) {
  return `
    <div class="grid-2" style="gap:16px;">
      <div class="input-block">
        <h3>实验目标</h3>
        ${field("实验目标", "experiment.goal", exp.goal, "今天完成 X 测试，拿到 Y 数据")}
        <div class="grid-3" style="margin-top:12px;">
          ${[0, 1, 2].map((i) => field(`预备 ${i + 1}`, `experiment.checklist.${i}`, exp.checklist[i] || "", "材料/参数/设备")).join("")}
        </div>
      </div>
      <div class="input-block">
        <h3>闭环</h3>
        ${area("当日结论", "experiment.conclusion", exp.conclusion, "数据是否正常？异常在哪里？")}
        ${area("下一步安排", "experiment.nextStep", exp.nextStep, "下一次具体做什么？")}
      </div>
    </div>
    <div class="input-block">
      <div class="section-title">
        <h3>实验步骤</h3>
        <button class="primary-button" data-add-step>添加步骤</button>
      </div>
      <div class="exp-timeline">
        ${exp.steps.map((step, index) => `
          <div class="exp-step">
            <div class="grid-3" style="gap:12px;">
              ${field("时间", `experiment.steps.${index}.time`, step.time || "", "10:30")}
              ${field("操作", `experiment.steps.${index}.action`, step.action || "", "加入/测试/调整")}
              ${field("现象/数据", `experiment.steps.${index}.observation`, step.observation || "", "记录可复查的信息")}
            </div>
          </div>
        `).join("") || `<p class="muted">点击“添加步骤”开始记录。</p>`}
      </div>
    </div>
  `;
}

function renderNonExpDay(exp) {
  return `
    <div class="grid-3" style="gap:16px;">
      <div class="input-block">
        <span class="eyebrow" style="color:var(--info);">09:00 – 12:00</span>
        <h3>上午深度任务</h3>
        ${field("", "experiment.nonExpTasks.am", exp.nonExpTasks.am, "文献/代码/论文")}
      </div>
      <div class="input-block">
        <span class="eyebrow" style="color:var(--warning);">14:00 – 17:00</span>
        <h3>下午推进任务</h3>
        ${field("", "experiment.nonExpTasks.pm", exp.nonExpTasks.pm, "数据分析/实验安排")}
      </div>
      <div class="input-block">
        <span class="eyebrow" style="color:var(--accent);">20:00 – 22:00</span>
        <h3>晚间闭环</h3>
        ${field("", "experiment.nonExpTasks.evening", exp.nonExpTasks.evening, "整理判断/明日安排")}
      </div>
    </div>
  `;
}

function renderAcademic() {
  const academic = todayRecord().academic;
  const records = Object.values(state.records).sort((a, b) => b.date.localeCompare(a.date));
  view.innerHTML = `
    <div class="grid-2" style="align-items:start;">
      <section class="card">
        <div class="section-title">
          <div>
            <span class="eyebrow">Output</span>
            <h3>今日学术产出</h3>
          </div>
          <span class="muted">自动保存</span>
        </div>
        <div class="grid-4" style="margin-bottom:16px;">
          <div style="text-align:center;">
            <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:8px;">文献</label>
            <input type="number" data-path="academic.papers" value="${academic.papers || ''}" placeholder="0" style="font-family:var(--font-mono);font-size:32px;font-weight:500;text-align:center;border:none;border-bottom:2px solid var(--line);background:transparent;border-radius:0;padding:4px 0;">
          </div>
          <div style="text-align:center;">
            <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:8px;">代码行</label>
            <input type="number" data-path="academic.code" value="${academic.code || ''}" placeholder="0" style="font-family:var(--font-mono);font-size:32px;font-weight:500;text-align:center;border:none;border-bottom:2px solid var(--line);background:transparent;border-radius:0;padding:4px 0;">
          </div>
          <div style="text-align:center;">
            <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:8px;">实验数据</label>
            <input type="number" data-path="academic.experiments" value="${academic.experiments || ''}" placeholder="0" style="font-family:var(--font-mono);font-size:32px;font-weight:500;text-align:center;border:none;border-bottom:2px solid var(--line);background:transparent;border-radius:0;padding:4px 0;">
          </div>
          <div style="text-align:center;">
            <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:8px;">番茄钟</label>
            <input type="number" data-path="academic.pomodoros" value="${academic.pomodoros || ''}" placeholder="0" style="font-family:var(--font-mono);font-size:32px;font-weight:500;text-align:center;border:none;border-bottom:2px solid var(--line);background:transparent;border-radius:0;padding:4px 0;">
          </div>
        </div>
        ${field("核心产出", "academic.output", academic.output, "一句话写下今天真正推进了什么")}
      </section>
      <section class="card">
        <h3>近 14 天</h3>
        <div class="timeline" style="max-height:320px;overflow-y:auto;">
          ${records.slice(0, 14).map((record) => `
            <div class="timeline-item">
              <strong>${formatDate(record.date)}</strong>
              <p class="muted">文献 ${record.academic.papers || 0} · 代码 ${record.academic.code || 0} · 实验 ${record.academic.experiments || 0} · 番茄 ${record.academic.pomodoros || 0}</p>
              <p style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${escapeHtml(record.academic.output || "")}</p>
            </div>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderFitness() {
  const fitness = todayRecord().fitness;
  const weekDatesList = weekDates();
  const weekData = weekDatesList.map((d) => ({ date: d, data: getRecord(d).fitness }));
  const streak = calculateStreak();
  const total = Object.values(state.records).filter((r) => r.fitness.done).length;

  view.innerHTML = `
    <div class="grid-3" style="margin-bottom:18px;">
      <div class="metric" style="text-align:center;">
        <span>连续打卡</span>
        <strong>${streak}</strong>
        <p>以健身完成日计算</p>
      </div>
      <div class="metric" style="text-align:center;">
        <span>累计次数</span>
        <strong>${total}</strong>
        <p>所有完成记录</p>
      </div>
      <div class="metric" style="text-align:center;">
        <span>本周完成</span>
        <strong>${weekDatesList.filter((d) => getRecord(d).fitness.done).length}/${state.settings.gymDays.length}</strong>
        <p>按设置中的健身日</p>
      </div>
    </div>

    <section class="card" style="max-width:600px;margin:0 auto 18px;">
      <div style="margin-bottom:18px;">
        <span class="eyebrow">This Week</span>
        <h3 style="margin-top:4px;">本周打卡</h3>
      </div>
      <div class="cal-matrix">
        ${weekData.map((d, i) => {
          const isToday = d.date === localDate();
          const dayNames = ["一","二","三","四","五","六","日"];
          return `
            <div class="cal-cell ${d.data.done ? 'done' : ''} ${isToday ? 'today' : ''}">
              ${d.data.done ? '<i class="ph ph-check" style="font-size:18px;"></i>' : `<span style="font-size:16px;font-weight:700;">${dayNames[i]}</span>`}
              ${!d.data.done ? `<span class="cal-day">${d.date.slice(5).replace('-','/')}</span>` : ''}
            </div>
          `;
        }).join("")}
      </div>
    </section>

    <section class="card" style="max-width:600px;margin:0 auto;">
      <div class="section-title">
        <h3>今日健身</h3>
        <div class="segmented" id="fit-segmented">
          <button class="${fitness.done ? "active" : ""}" data-fitness-done="true">已完成</button>
          <button class="${!fitness.done ? "active" : ""}" data-fitness-done="false">未完成</button>
        </div>
      </div>
      <div class="grid-3" style="margin-bottom:12px;">
        ${field("训练类型", "fitness.type", fitness.type, "力量训练 + 有氧")}
        ${numberField("时长（分钟）", "fitness.duration", fitness.duration)}
        ${selectField("强度", "fitness.intensity", fitness.intensity, [["low", "轻松"], ["medium", "适中"], ["high", "很强"]])}
      </div>
      ${field("备注", "fitness.note", fitness.note, "身体状态、训练内容、恢复感受")}
    </section>
  `;
  requestAnimationFrame(() => updateSegmented("fit-segmented"));
}

function renderReview() {
  const review = todayRecord().review;
  const moods = ["", "😔", "😟", "😐", "🙂", "😄"];
  view.innerHTML = `
    <section class="card" style="max-width:800px;margin:0 auto;">
      <div class="section-title">
        <div>
          <span class="eyebrow">Evening</span>
          <h3>${formatDate(localDate())} · 晚间复盘</h3>
        </div>
        <span class="muted">睡前 5 分钟自动保存</span>
      </div>

      <div style="margin-bottom:22px;">
        <label style="font-size:12px;font-weight:700;color:var(--text-secondary);display:block;margin-bottom:10px;">今日情绪评分</label>
        <div class="mood-grid">
          ${[1,2,3,4,5].map(i => `
            <button class="mood-btn ${review.mood === i ? 'selected' : ''}" data-mood="${i}">
              ${moods[i]}
            </button>
          `).join("")}
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px;">${review.mood ? ['','疲惫','低落','平稳','良好','充盈'][review.mood] : '点击选择今日整体情绪状态'}</p>
      </div>

      <div class="grid-2" style="gap:14px;">
        <div class="input-block" style="border-left:3px solid var(--info);">
          ${selectField("三任务完成了吗", "review.tasksDone", review.tasksDone, [["", "未选择"], ["yes", "完成"], ["partial", "部分完成"], ["no", "未完成"]])}
        </div>
        <div class="input-block" style="border-left:3px solid var(--accent);">
          ${selectField("今天有健身吗", "review.gymDone", review.gymDone, [["", "未选择"], ["yes", "有"], ["no", "没有"]])}
        </div>
        <div class="input-block" style="border-left:3px solid var(--success);">
          ${area("今天最有效的行动", "review.bestAction", review.bestAction, "哪一个动作真正产生了推进？")}
        </div>
        <div class="input-block" style="border-left:3px solid var(--warning);">
          ${area("今天最大的卡点", "review.blocker", review.blocker, "情绪、环境、任务定义，还是体力？")}
        </div>
        <div class="input-block" style="border-left:3px solid var(--danger);grid-column:span 2;">
          ${field("明天最重要的一件事", "review.tomorrow", review.tomorrow, "只写一件，具体到动作")}
        </div>
      </div>
    </section>
  `;
}

function renderWeekly() {
  const dates = weekDates();
  const key = dates[0];
  if (!state.weekly[key]) state.weekly[key] = { progress: "", blocker: "", adjust: "" };
  const weekly = state.weekly[key];
  const taskRates = dates.map((d) => getRecord(d).tasks.items.filter((i) => i.done).length / 3);
  const taskAvg = Math.round(taskRates.reduce((a, b) => a + b, 0) / 7 * 100);
  const gym = dates.filter((d) => getRecord(d).fitness.done).length;
  const academic = dates.filter((d) => hasAcademic(getRecord(d).academic)).length;
  const reviews = dates.filter((d) => getRecord(d).review.tomorrow).length;

  view.innerHTML = `
    <div class="grid-4" style="margin-bottom:18px;">
      ${metric("任务完成率", `${taskAvg}%`, "本周平均")}
      ${metric("健身", `${gym}/${state.settings.gymDays.length}`, "按计划次数")}
      ${metric("学术记录", `${academic}/7`, "有产出即计入")}
      ${metric("复盘", `${reviews}/7`, "写下明日重点")}
    </div>
    <section class="card" style="max-width:800px;margin:0 auto;">
      <h3>本周反思</h3>
      <div style="margin-top:16px;">
        ${area("最大的进步", `weekly.${key}.progress`, weekly.progress, "本周哪里更像你想成为的人？", true)}
        ${area("最大的卡点", `weekly.${key}.blocker`, weekly.blocker, "最需要被调整的系统问题是什么？", true)}
        ${field("下周只调整一件事", `weekly.${key}.adjust`, weekly.adjust, "写一个可执行改变", true)}
      </div>
    </section>
  `;
}

function renderHistory() {
  const records = Object.values(state.records).sort((a, b) => b.date.localeCompare(a.date));
  view.innerHTML = `
    <section class="card" style="max-width:800px;margin:0 auto;">
      <div class="section-title">
        <h3>历史记录</h3>
        <span class="muted">${records.length} 天</span>
      </div>
      <div class="timeline">
        ${records.map((record) => `
          <div class="timeline-item">
            <strong>${formatDate(record.date)}</strong>
            <p class="muted">任务 ${record.tasks.items.filter((i) => i.done).length}/3 · 学术 ${record.academic.output || "无"} · 复盘 ${record.review.tomorrow || "无"}</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSettings() {
  const s = state.settings;
  view.innerHTML = `
    <div style="max-width:800px;margin:0 auto;display:grid;gap:18px;">
      <section class="card">
        <div class="section-title">
          <div>
            <span class="eyebrow">Preferences</span>
            <h3>设置与自定义</h3>
          </div>
          <div class="segmented" id="theme-segmented">
            <button class="${state.theme === "light" ? "active" : ""}" data-theme-pick="light">白天</button>
            <button class="${state.theme === "dark" ? "active" : ""}" data-theme-pick="dark">夜间</button>
          </div>
        </div>
        <div class="grid-2" style="gap:16px;">
          ${field("称呼", "settings.name", s.name, "你的称呼", true)}
          ${field("当前阶段", "settings.stage", s.stage, "III+", true)}
          ${field("实验类型", "settings.experimentType", s.experimentType, "科研/实验推进", true)}
          ${field("健身目标", "settings.gymGoal", s.gymGoal, "力量训练 + 有氧", true)}
          ${field("实验室开始", "settings.labHours.start", s.labHours.start, "09:00", true, "time")}
          ${field("实验室结束", "settings.labHours.end", s.labHours.end, "17:00", true, "time")}
          ${field("晚间分析开始", "settings.analysisHours.start", s.analysisHours.start, "20:00", true, "time")}
          ${field("晚间分析结束", "settings.analysisHours.end", s.analysisHours.end, "22:00", true, "time")}
        </div>
      </section>

      <section class="card">
        <h3>本地自动保存</h3>
        <p class="muted" style="margin:8px 0 16px;line-height:1.6;">默认会自动保存在浏览器里。点击“连接数据文件夹”后，本次会话会把每天记录同步为 <code>YYYY-MM-DD.json</code>，不需要手动下载或上传。</p>
        <button class="primary-button" id="connect-folder-inline">连接数据文件夹</button>
      </section>

      <section class="card">
        <h3>数据管理</h3>
        <div style="display:grid;gap:10px;margin-top:14px;">
          <button class="soft-button" onclick="exportData()" style="justify-content:flex-start;display:flex;align-items:center;gap:10px;">
            <i class="ph ph-download-simple" style="font-size:18px;color:var(--info);"></i>
            <span>导出数据为 JSON</span>
          </button>
          <button class="soft-button" onclick="document.getElementById('import-file-hidden').click()" style="justify-content:flex-start;display:flex;align-items:center;gap:10px;">
            <i class="ph ph-upload-simple" style="font-size:18px;color:var(--success);"></i>
            <span>从 JSON 导入数据</span>
          </button>
          <input type="file" id="import-file-hidden" class="hidden" accept=".json" onchange="importData(this)" style="display:none;">
          <button class="soft-button" onclick="clearAllData()" style="justify-content:flex-start;display:flex;align-items:center;gap:10px;border-color:var(--danger);color:var(--danger);">
            <i class="ph ph-trash" style="font-size:18px;"></i>
            <span>清除所有数据（不可撤销）</span>
          </button>
        </div>
      </section>
    </div>
  `;
  requestAnimationFrame(() => updateSegmented("theme-segmented"));
}

function field(label, path, value, placeholder, global = false, type = "text") {
  return `
    <div class="field">
      ${label ? `<label>${label}</label>` : ""}
      <input type="${type}" value="${escapeHtml(value || "")}" data-path="${path}" ${global ? "data-global='true'" : ""} placeholder="${placeholder}">
    </div>
  `;
}

function numberField(label, path, value) {
  return field(label, path, value ?? 0, "0", false, "number");
}

function area(label, path, value, placeholder, global = false) {
  return `
    <div class="field">
      <label>${label}</label>
      <textarea data-path="${path}" ${global ? "data-global='true'" : ""} placeholder="${placeholder}">${escapeHtml(value || "")}</textarea>
    </div>
  `;
}

function selectField(label, path, value, options) {
  return `
    <div class="field">
      <label>${label}</label>
      <select data-path="${path}">
        ${options.map(([optionValue, text]) => `<option value="${optionValue}" ${String(value) === String(optionValue) ? "selected" : ""}>${text}</option>`).join("")}
      </select>
    </div>
  `;
}

function metric(label, value, note) {
  return `
    <div class="metric">
      <span>${label}</span>
      <strong>${value}</strong>
      <p>${note}</p>
    </div>
  `;
}

function setByPath(path, value, global = false) {
  const root = global ? state : todayRecord();
  const parts = path.split(".");
  let target = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (target[key] === undefined) target[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    target = target[key];
  }
  target[parts.at(-1)] = value;
  todayRecord().updatedAt = localDateTime();
  scheduleSave();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hasAcademic(academic) {
  return Boolean(academic.output || academic.papers || academic.code || academic.experiments || academic.pomodoros);
}

function hasNonExp(exp) {
  return Boolean(exp.nonExpTasks?.am || exp.nonExpTasks?.pm || exp.nonExpTasks?.evening);
}

function recentDates(count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return localDate(date);
  });
}

function weekDates() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return localDate(date);
  });
}

function dayScore(record) {
  let score = record.tasks.items.filter((item) => item.done).length * 18;
  if (record.experiment.isExpDay || hasNonExp(record.experiment)) score += 16;
  if (hasAcademic(record.academic)) score += 14;
  if (record.fitness.done) score += 12;
  if (record.review.tomorrow) score += 4;
  return Math.min(score, 100);
}

function calculateStreak() {
  let streak = 0;
  const date = new Date();
  while (true) {
    const key = localDate(date);
    if (!state.records[key]?.fitness?.done) break;
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveHandle(handle) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(handle, "directory");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function loadHandle() {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const request = tx.objectStore(DB_STORE).get("directory");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

async function connectFolder() {
  if (!window.showDirectoryPicker) {
    showToast("当前浏览器不支持文件夹自动同步，已继续使用浏览器自动保存。");
    return;
  }
  directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
  await saveHandle(directoryHandle);
  storageState.textContent = "已连接本地数据文件夹";
  await writeDailyFile(localDate());
  showToast("已连接数据文件夹，之后会自动同步当天 JSON。");
}

function updateSegmented(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const buttons = el.querySelectorAll("button");
  const active = el.querySelector("button.active");
  if (!active) return;
  const parentRect = el.getBoundingClientRect();
  const rect = active.getBoundingClientRect();
  const left = rect.left - parentRect.left;
  const width = rect.width;
  el.style.setProperty("--slide-left", `${left}px`);
  el.style.setProperty("--slide-width", `${width}px`);
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `infp_evolution_backup_${localDate()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("数据已导出");
}

function importData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (confirm(`确认导入 ${file.name}？这将覆盖当前所有数据。`)) {
        state = data;
        saveAll();
        showToast("数据导入成功");
        render();
      }
    } catch (err) {
      showToast("导入失败：文件格式错误");
    }
  };
  reader.readAsText(file);
  input.value = "";
}

function clearAllData() {
  if (confirm("确定要清除所有数据吗？此操作不可撤销！")) {
    localStorage.removeItem(STORAGE_KEY);
    state = structuredClone(defaultState);
    showToast("所有数据已清除");
    render();
  }
}

document.addEventListener("click", async (event) => {
  const nav = event.target.closest("[data-route]");
  if (nav) routeTo(nav.dataset.route);

  const go = event.target.closest("[data-go]");
  if (go) routeTo(go.dataset.go);

  const themePick = event.target.closest("[data-theme-pick]");
  if (themePick) {
    setTheme(themePick.dataset.themePick);
    render();
  }

  const expDay = event.target.closest("[data-exp-day]");
  if (expDay) {
    todayRecord().experiment.isExpDay = expDay.dataset.expDay === "true";
    scheduleSave();
    renderExperiment();
    requestAnimationFrame(() => updateSegmented("exp-segmented"));
  }

  const addStep = event.target.closest("[data-add-step]");
  if (addStep) {
    todayRecord().experiment.steps.push({ time: "", action: "", observation: "" });
    scheduleSave();
    renderExperiment();
  }

  const fitnessDone = event.target.closest("[data-fitness-done]");
  if (fitnessDone) {
    todayRecord().fitness.done = fitnessDone.dataset.fitnessDone === "true";
    todayRecord().review.gymDone = todayRecord().fitness.done ? "yes" : "no";
    scheduleSave();
    renderFitness();
  }

  const moodBtn = event.target.closest("[data-mood]");
  if (moodBtn) {
    todayRecord().review.mood = Number(moodBtn.dataset.mood);
    scheduleSave();
    renderReview();
  }

  if (event.target.id === "theme-toggle") {
    setTheme(state.theme === "dark" ? "light" : "dark");
  }

  if (event.target.id === "connect-folder" || event.target.id === "connect-folder-inline") {
    await connectFolder();
  }
});

document.addEventListener("input", (event) => {
  const input = event.target.closest("[data-path]");
  if (!input) return;
  const value = input.type === "checkbox" ? input.checked : input.type === "number" ? Number(input.value || 0) : input.value;
  setByPath(input.dataset.path, value, input.dataset.global === "true");
});

document.addEventListener("change", (event) => {
  const input = event.target.closest("[data-path]");
  if (!input) return;
  const value = input.type === "checkbox" ? input.checked : input.type === "number" ? Number(input.value || 0) : input.value;
  setByPath(input.dataset.path, value, input.dataset.global === "true");
});

async function init() {
  document.documentElement.dataset.theme = state.theme;
  const icon = document.querySelector("#theme-toggle i");
  if (icon) icon.className = state.theme === "dark" ? "ph ph-moon" : "ph ph-sun";
  try {
    directoryHandle = await loadHandle();
    if (directoryHandle) storageState.textContent = "已记住数据文件夹授权";
  } catch {
    directoryHandle = null;
  }
  ensureRecord(localDate());
  await saveAll();

  // View transition setup
  view.style.transition = "opacity 0.18s ease, transform 0.18s ease";

  routeTo("dashboard");
}

init();
