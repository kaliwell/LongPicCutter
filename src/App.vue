<template>
  <main class="container">
    <header class="header">
      <div class="title-row">
        <div class="brand"><span class="brand-icon" aria-hidden="true">✂</span><h1>长图快速切割</h1><span class="version-badge">本地保存版</span></div>
        <a href="https://github.com/wumingluren/LongPicCutter" target="_blank" rel="noopener noreferrer" class="source-link">原项目 ↗</a>
      </div>
      <div class="toolbar">
        <el-upload :auto-upload="false" :show-file-list="false" accept="image/png,image/jpeg,image/webp" :on-change="handleUploadChange">
          <el-button type="primary" :loading="loading">选择图片</el-button>
        </el-upload>
        <el-button :disabled="!source" @click="addMark()">标记 S</el-button>
        <el-button :disabled="!marks.length" @click="undoMark">撤销 Ctrl+Z</el-button>
        <el-button :disabled="!marks.length" @click="clearMarks">清空切割线</el-button>
        <el-button type="primary" :disabled="!source" @click="handleCut">分割 Enter</el-button>
        <el-button :disabled="!cutImages.length" :loading="downloading" @click="handleDownload">下载 ZIP</el-button>
        <el-button :disabled="!source" @click="exportPlan">导出方案</el-button>
        <el-button :disabled="!source" @click="planInput.click()">导入方案</el-button>
        <input ref="planInput" hidden type="file" accept=".json,application/json" @change="importPlan" />
      </div>
      <p class="hint">鼠标移到图片上，按 S 添加切割线；Delete 删除附近切割线；Ctrl/Cmd+S 导出方案。切割线自动保存在本浏览器，重新选择同一图片即可恢复。</p>
      <p role="status">{{ source ? `${fileName} · ${source.naturalWidth} × ${source.naturalHeight} · ${marks.length} 条切割线` : '请选择一张图片开始' }} · {{ saveStatus }}</p>
    </header>
    <div class="workspace">
      <section class="panel original-panel" aria-labelledby="original-title">
        <div class="panel-heading"><div><span class="panel-label">原图</span><h2 id="original-title">切割标记</h2></div><span class="panel-meta">{{ marks.length }} 条切割线</span></div>
        <div class="panel-scroll editor" tabindex="0" aria-label="原图滚动区域">
        <el-empty v-if="!source" description="选择图片后，在图上按 S 标记" />
        <div v-show="source" ref="imageBox" class="image-box" @click="selectPosition">
          <canvas ref="canvas" aria-label="原图预览" />
          <div v-for="mark in marks" :key="mark" class="mark-line" :style="{ top: `${mark / imageSize.height * 100}%` }"><span>{{ mark }} px</span></div>
          <div v-if="pointerY !== null" class="cursor-line" :style="{ top: `${pointerY / imageSize.height * 100}%` }"><span>{{ pointerY }} px</span></div>
        </div>
        </div>
      </section>
      <aside class="panel preview-panel" aria-labelledby="preview-title">
        <div class="panel-heading"><div><span class="panel-label">预览</span><h2 id="preview-title">切割结果</h2></div><span class="panel-meta">{{ cutImages.length ? `${cutImages.length} 张图片` : '等待分割' }}</span></div>
        <div class="panel-scroll preview" tabindex="0" aria-label="切图预览滚动区域">
        <el-empty v-if="!cutImages.length" description="标记后按 Enter 生成切图" />
        <figure v-for="(slice, index) in cutImages" :key="index"><figcaption><span class="slice-number">{{ String(index + 1).padStart(2, '0') }}</span><span>{{ slice.width }} × {{ slice.height }} px</span></figcaption><img :src="slice.url" :alt="`第 ${index + 1} 张切图`" /></figure>
        </div>
      </aside>
    </div>
  </main>
</template>

<script setup>
import { ref, shallowRef, watch, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage, ElMessageBox, ElUpload, ElButton, ElEmpty } from 'element-plus';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { validatePlan, boundaries, pixelAtPointer } from './cut-plan.js';

const canvas = ref(null), imageBox = ref(null), planInput = ref(null);
const source = shallowRef(null), imageSize = ref({ width: 1, height: 1 });
const marks = ref([]), cutImages = ref([]), pointerY = ref(null), fileName = ref('');
const loading = ref(false), downloading = ref(false), saveStatus = ref('等待图片');
let storageKey = '', loadId = 0, lastPointer = null, selectedY = null, storageWarned = false;
const prefix = 'long-pic-cutter:plan:v1:';

function currentPlan() {
  return { app: 'LongPicCutter', version: 1, image: { ...imageSize.value, name: fileName.value }, lines: [...marks.value] };
}
function persist() {
  if (!storageKey || !source.value) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(currentPlan()));
    saveStatus.value = '已自动保存';
  } catch {
    saveStatus.value = '自动保存不可用，请导出方案';
    if (!storageWarned) { ElMessage.warning(saveStatus.value); storageWarned = true; }
  }
}
watch(marks, () => { cutImages.value = []; persist(); }, { deep: true, flush: 'sync' });

async function handleUploadChange({ raw }) {
  if (!raw) return;
  const requestId = ++loadId;
  loading.value = true;
  const url = URL.createObjectURL(raw);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    let identity = JSON.stringify([raw.name, raw.size, raw.lastModified, image.naturalWidth, image.naturalHeight]);
    if (globalThis.crypto?.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', await raw.arrayBuffer());
      identity = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    }
    if (requestId !== loadId) return;
    // Prepare the preview before replacing the active image/session.
    const width = Math.min(800, image.naturalWidth);
    const height = Math.max(1, Math.round(width * image.naturalHeight / image.naturalWidth));
    canvas.value.width = width; canvas.value.height = height;
    const context = canvas.value.getContext('2d');
    context.drawImage(image, 0, 0, width, height);
    // Some browsers silently reject oversized canvas allocations.
    context.getImageData(0, 0, 1, 1);
    storageKey = '';
    marks.value = []; cutImages.value = []; pointerY.value = null; selectedY = null;
    source.value = image;
    imageSize.value = { width: image.naturalWidth, height: image.naturalHeight };
    fileName.value = raw.name;
    storageKey = prefix + identity;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        marks.value = validatePlan(JSON.parse(saved), imageSize.value);
        ElMessage.success(`已恢复 ${marks.value.length} 条切割线`);
      }
      persist();
    } catch {
      saveStatus.value = '无法恢复本地方案，请导入 JSON 方案';
    }
  } catch {
    ElMessage.error('图片无法载入，或尺寸超过浏览器处理上限');
  } finally {
    URL.revokeObjectURL(url);
    if (requestId === loadId) loading.value = false;
  }
}
function updatePointer() {
  pointerY.value = source.value && lastPointer && document.elementFromPoint(lastPointer.x, lastPointer.y) === canvas.value
    ? pixelAtPointer(lastPointer, canvas.value.getBoundingClientRect(), imageSize.value.height)
    : null;
}
function trackPointer(event) { lastPointer = { x: event.clientX, y: event.clientY }; updatePointer(); }
function leaveWindow() { lastPointer = null; pointerY.value = null; }
function selectPosition(event) { trackPointer(event); selectedY = pointerY.value; }
function addMark(y = selectedY ?? pointerY.value) {
  if (!source.value || y === null || y === undefined) { ElMessage.info('请先在图片上点击选择位置，或移入图片后按 S'); return; }
  if (y <= 0 || y >= imageSize.value.height) return;
  if (marks.value.includes(y)) return;
  marks.value = [...marks.value, y];
}
function undoMark() { if (marks.value.length) marks.value = marks.value.slice(0, -1); }
async function clearMarks() {
  try {
    await ElMessageBox.confirm('清空当前图片的所有切割线？本地保存也会更新。', '清空切割线', { type: 'warning' });
    marks.value = [];
  } catch { /* 用户取消 */ }
}
function deleteNearest() {
  if (pointerY.value === null || !marks.value.length) return;
  const nearest = marks.value.reduce((a, b) => Math.abs(a - pointerY.value) <= Math.abs(b - pointerY.value) ? a : b);
  const tolerance = 8 * imageSize.value.height / canvas.value.getBoundingClientRect().height;
  if (Math.abs(nearest - pointerY.value) <= tolerance) marks.value = marks.value.filter(y => y !== nearest);
}
function handleCut() {
  if (!source.value) return;
  try {
    const points = boundaries(marks.value, imageSize.value.height);
    const parts = [];
    const target = document.createElement('canvas');
    for (let i = 0; i < points.length - 1; i++) {
      target.width = imageSize.value.width;
      target.height = points[i + 1] - points[i];
      const context = target.getContext('2d');
      context.drawImage(source.value, 0, points[i], target.width, target.height, 0, 0, target.width, target.height);
      const url = target.toDataURL('image/png');
      if (url === 'data:,') throw new Error('Canvas limit');
      parts.push({ url, width: target.width, height: target.height });
    }
    cutImages.value = parts;
    ElMessage.success(`已生成 ${parts.length} 张切图，切割线已保留`);
  } catch { ElMessage.error('切图失败，图片尺寸或内存超出浏览器上限'); }
}
async function handleDownload() {
  if (!cutImages.value.length || downloading.value) return;
  downloading.value = true;
  try {
    const archiveName = `${fileName.value.replace(/\.[^.]+$/, '')}-切图.zip`;
    const zip = new JSZip();
    cutImages.value.forEach((part, i) => zip.file(`image_${String(i + 1).padStart(3, '0')}.png`, part.url.split(',')[1], { base64: true }));
    saveAs(await zip.generateAsync({ type: 'blob' }), archiveName);
  } catch { ElMessage.error('ZIP 生成失败，请尝试减少切图数量'); }
  finally { downloading.value = false; }
}
function exportPlan() {
  if (!source.value) return;
  saveAs(new Blob([JSON.stringify(currentPlan(), null, 2)], { type: 'application/json;charset=utf-8' }), `${fileName.value}-切割方案.json`);
}
async function importPlan(event) {
  const file = event.target.files?.[0]; event.target.value = '';
  if (!file || !source.value) return;
  const requestId = loadId;
  try {
    if (file.size > 1024 * 1024) throw new Error('方案文件不能超过 1 MB');
    const plan = JSON.parse(await file.text());
    if (requestId !== loadId) return;
    const lines = validatePlan(plan, imageSize.value);
    await ElMessageBox.confirm(`用方案中的 ${lines.length} 条切割线替换当前标记？仅接受与当前原图尺寸相同的方案。`, '导入切割方案');
    if (requestId !== loadId) return;
    marks.value = lines;
    ElMessage.success('方案已导入并自动保存');
  } catch (error) {
    if (error instanceof Error) ElMessage.error(error.message || '方案格式不正确');
  }
}
function handleKey(event) {
  if (event.repeat || event.isComposing || event.altKey || document.querySelector('[role="dialog"]')) return;
  if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')) return;
  if (!source.value || loading.value) return;
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.code === 'KeyZ' && !event.shiftKey) { event.preventDefault(); undoMark(); }
  else if (modifier && event.code === 'KeyS' && !event.shiftKey) { event.preventDefault(); exportPlan(); }
  else if (!modifier && !event.shiftKey) {
    if (event.code === 'KeyS') { updatePointer(); if (pointerY.value !== null) { event.preventDefault(); addMark(pointerY.value); } }
    else if (event.code === 'Delete') { updatePointer(); if (pointerY.value !== null) { event.preventDefault(); deleteNearest(); } }
    else if (event.code === 'Enter' && !(event.target instanceof Element && event.target.closest('button,a'))) { event.preventDefault(); handleCut(); }
  }
}
onMounted(() => {
  window.addEventListener('pointermove', trackPointer);
  window.addEventListener('scroll', updatePointer, true);
  window.addEventListener('resize', updatePointer);
  window.addEventListener('blur', leaveWindow);
  document.addEventListener('mouseleave', leaveWindow);
  window.addEventListener('keydown', handleKey);
});
onBeforeUnmount(() => {
  ++loadId;
  window.removeEventListener('pointermove', trackPointer);
  window.removeEventListener('scroll', updatePointer, true);
  window.removeEventListener('resize', updatePointer);
  window.removeEventListener('blur', leaveWindow);
  document.removeEventListener('mouseleave', leaveWindow);
  window.removeEventListener('keydown', handleKey);
});
</script>

<style scoped>
.container { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #243247; background: #eef2f6; height: 100vh; height: 100dvh; display: grid; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; }
.header { z-index: 100; padding: 16px 24px 12px; background: #fff; border-bottom: 1px solid #dde4ed; }
.title-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 14px; }
.brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.brand-icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: #fff; background: #2875ed; font-size: 20px; }
h1 { font-size: 19px; line-height: 1.4; margin: 0; font-weight: 650; }
.version-badge { color: #59708b; background: #f0f4f9; font-size: 11px; padding: 4px 7px; border-radius: 5px; white-space: nowrap; }
.source-link { font-size: 12px; color: #718198; text-decoration: none; white-space: nowrap; }
.source-link:hover { color: #2875ed; }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.toolbar .el-button { margin-left: 0; border-radius: 6px; }
.hint, [role="status"] { font-size: 12px; line-height: 1.6; margin: 8px 0 0; color: #728096; }
[role="status"] { margin-top: 4px; color: #4f6580; overflow-wrap: anywhere; }
.workspace { width: 100%; max-width: 1720px; box-sizing: border-box; min-height: 0; margin: 0 auto; display: grid; grid-template-columns: repeat(2, minmax(280px, 1fr)); gap: 16px; padding: 16px 24px 20px; overflow-x: auto; }
.panel { display: flex; flex-direction: column; min-width: 0; min-height: 0; border: 1px solid #dce3ec; border-radius: 10px; overflow: hidden; background: #fff; box-shadow: 0 2px 6px #24324704; }
.panel-heading { flex: none; min-height: 62px; box-sizing: border-box; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #fff; border-bottom: 1px solid #e5eaf1; }
.panel-heading > div { display: flex; align-items: center; gap: 9px; }
.panel-label { display: inline-flex; align-items: center; justify-content: center; font-size: 11px; color: #2466ca; background: #edf4ff; padding: 3px 7px; border-radius: 4px; }
.preview-panel .panel-label { background: #ecf7f1; color: #2e8158; }
h2 { font-size: 14px; font-weight: 600; margin: 0; }
.panel-meta { font-size: 12px; color: #7a8799; white-space: nowrap; }
.panel-scroll { flex: 1; min-height: 0; overflow: auto; scrollbar-gutter: stable; overscroll-behavior: contain; background: #f5f7fa; padding: 16px; }
.panel-scroll:focus-visible { outline: 2px solid #77a9f6; outline-offset: -2px; }
.image-box { position: relative; width: 100%; max-width: 800px; margin: 0 auto; line-height: 0; box-shadow: 0 1px 5px #24324710; }
canvas { display: block; width: 100%; height: auto; cursor: crosshair; }
.mark-line, .cursor-line { position: absolute; left: 0; right: 0; height: 0; border-top: 1px solid #e33d4e; pointer-events: none; }
.cursor-line { border-top: 1px dashed #1677ff; z-index: 2; }
.mark-line span, .cursor-line span { position: absolute; right: 0; top: 0; font-size: 11px; line-height: 16px; padding: 1px 4px; background: #e33d4e; color: white; }
.cursor-line span { background: #1677ff; left: 0; right: auto; }
figure { position: relative; width: 100%; max-width: 800px; box-sizing: border-box; margin: 0 auto 18px; }
figure:last-child { margin-bottom: 0; }
figcaption { position: absolute; top: 8px; left: 8px; z-index: 1; display: flex; align-items: center; gap: 7px; color: #52637b; background: rgba(255,255,255,.95); border: 1px solid #e1e7ef; border-radius: 5px; font-size: 11px; line-height: 20px; padding: 2px 7px 2px 3px; pointer-events: none; box-shadow: 0 1px 4px #24324708; }
.slice-number { background: #edf2f8; color: #425776; border-radius: 3px; padding: 0 5px; font-weight: 600; }
figure img { width: 100%; height: auto; display: block; box-shadow: 0 1px 5px #24324710; }
@media(max-width: 1000px) { .header { padding: 12px 16px 10px; } .workspace { padding: 12px; gap: 12px; } .panel-heading { padding: 12px; } .panel-scroll { padding: 12px; } }
@media(max-width: 600px) { .header { padding: 10px 12px; } .title-row { margin-bottom: 10px; } h1 { font-size: 16px; } .version-badge { display: none; } .hint { display: none; } .toolbar { gap: 6px; } .toolbar .el-button { padding: 7px 10px; height: 30px; font-size: 12px; } .workspace { gap: 10px; padding: 10px; } }
</style>
