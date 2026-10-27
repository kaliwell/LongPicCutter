## 本修改版：切割线保存与鼠标快捷标记

[**在线使用 → 长图快速切割**](https://kaliwell.github.io/LongPicCutter/)

打开网页即可选择图片、标记切割线并下载切图 ZIP，无需安装。图片仅在浏览器本地处理，不上传服务器。

新增原图像素坐标保存、逐图自动恢复、JSON 方案导入导出、鼠标位置快捷标记。详见 [使用说明](使用说明.md)。原项目介绍保留如下。

本项目基于 [wumingluren/LongPicCutter](https://github.com/wumingluren/LongPicCutter) 修改，原作者为 [无名路人（wumingluren）](https://github.com/wumingluren)。下方的原版在线体验和下载链接属于原作者，不包含本修改版的新增功能。

### 使用本修改版

推荐直接打开 [在线工具](https://kaliwell.github.io/LongPicCutter/)。切割线自动保存在当前浏览器中，也可导出 JSON 方案备份。

下载本仓库后，用 Chrome 或 Edge 打开根目录的 `长图切割-直接打开.html` 即可使用。

开发与验证：

```sh
npm ci
npm test
npm run dev
```

构建 GitHub Pages 版本：`npm run build:github`。完整操作与快捷键见 [使用说明](使用说明.md)。

### 来源与许可证

保留原项目介绍及来源链接。上传时原仓库未提供 LICENSE 文件，本修改版未额外指定许可证。

# 无名长图片自由分割/切割在线工具

新版功能更全，长图，横图，宫格分割都支持。
https://github.com/wumingluren/PicFreeCutter

## 项目介绍

在网上闲逛的时候发现有人需要长图片自由分割工具，也没找到能用的，就想着自己写一个，实现思路就是类似于视频剪辑的视频分割方式。

纯前端实现无需网络

##### 使用技术

Vue3，element-plus，pnpm，file-saver，jszip

## 使用方法

1.点击 "选择图片" 按钮选择图片，即可在左侧预览区预览图片

2.在左侧预览区任意位置点击，或者鼠标在黑色线条处按下拖动，黑色线条即会移动到目标位置，点击 "标记" 按钮就会在当前黑色线条停留位置生成一条红色的线来标记需要分割的位置

3.点击 "分割" 按钮开始分割，并在右侧将预览图展示出来

4.点击 "下载切图压缩包" 按钮即可下载分割好的图片压缩包

5.点击 "撤销" 按钮可撤销最近一次标记

6.点击 "重置" 按钮可重置（暂时没做，手动 F5 刷新）

## 演示图

<center> 图一 </center>

![图一](./演示图/图一.jpg)

<center> 图二 </center>

![图二](./演示图/图二.jpg)

## 地址
无名长图片自由分割/切割在线工具 

在线体验：
https://wumingluren.github.io/LongPicCutter

源码地址：
https://github.com/wumingluren/LongPicCutter

使用[Pake](https://github.com/tw93/Pake)进行打包，有条件的朋友可以打一个Mac版的包

Windows： 
https://pan.baidu.com/s/1mwvwEe59Pd3n2GJ15Cs6rg?pwd=axjm 提取码: axjm 

https://pan.quark.cn/s/a123822c02d4

Mac：暂无 Windows电脑打不了Mac的包
