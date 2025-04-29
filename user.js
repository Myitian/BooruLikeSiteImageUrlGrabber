// ==UserScript==
// @name         BooruLikeSiteImageUrlGrabber
// @namespace    net.myitian.js.booru-img-url-grabber
// @version      0
// @author       Myitian
// @description  一个脚本，在booru系网站（基于danbooru或moebooru的网站）批量获取当前页面图片的原图链接。
// @source       https://github.com/Myitian/BooruLikeSiteImageUrlGrabber
// @license      MIT
// @match        https://safebooru.donmai.us/*
// @match        https://danbooru.donmai.us/*
// @match        https://konachan.com/*
// @match        https://konachan.net/*
// @match        https://yande.re/*
// @run-at       document-body
// @grant        GM_setClipboard
// ==/UserScript==

const MD5_REGEX = /[0-9a-f]{32}/;
const QUERY_PATH = /\.donmai\.us$/.test(location.host)
    ? "/posts.json?tags=md5:" : "/post.json?tags=md5:";
const INTERVAL = /konachan\.(?:com|net)$/.test(location.host) ? 1000 : 50;
const BUTTON = document.createElement("button");
BUTTON.addEventListener("click", getRawImageUrls);
BUTTON.innerText = "复制所有图片原图链接";
const DIV = document.createElement("div");
DIV.id = "x-myt-booru-downloader";
DIV.innerHTML = `<style>
#x-myt-booru-downloader button {
    position: fixed;
    top: 0;
    right: 0;
    border-radius: 0.5em;
    padding: 0.5em;
    margin: 0.5em 2.5em;
    border: none;
    background-color: #40e0d0;
    color: #000;
    cursor: pointer;
}
#x-myt-booru-downloader button:hover {
    background-color: #31ada0;
}
#x-myt-booru-downloader button:active {
    background-color: #2a9388;
}
#x-myt-booru-downloader button:disabled {
    background-color: #579c95;
}
</style>`
DIV.appendChild(BUTTON);
document.body.appendChild(DIV);

/** @type {Set<string>} */
const MD5_SET = new Set();

let c = 0;

async function getRawImageUrls() {
    try {
        BUTTON.disabled = true;
        BUTTON.innerText = "正在获取原图信息……";
        MD5_SET.clear();
        for (const img of document.querySelectorAll("img[src]")) {
            const rect = img.getBoundingClientRect();
            if (rect.width == 0 && rect.height == 0) {
                continue;
            }
            /** @ts-ignore @type {string} */
            const src = img.src;
            if (src.includes("assets.yande.re/assets/")) {
                continue;
            }
            const m = MD5_REGEX.exec(src);
            if (m) {
                MD5_SET.add(m[0]);
            }
        }
        if (!MD5_SET.size) {
            alert("当前页面无匹配图片！");
            return;
        }
        BUTTON.innerText = `正在获取原图信息……(0/${MD5_SET.size})`;
        /** @type {Promise<string>[]} */
        const promises = new Array(MD5_SET.size);
        let i = 0;
        c = 0;
        for (const md5 of MD5_SET) {
            promises[i++] = new Promise((resolve, reject) => grabData(md5, resolve, reject));
            await sleep(INTERVAL);
        }
        const results = await Promise.allSettled(promises);
        const links = [];
        let errorCount = 0;
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status === "rejected") {
                console.error("result", i, "rejected:", result.reason);
                errorCount++;
            } else {
                console.info("result", i, "fulfilled:", result.value);
                links.push(result.value);
            }
        }
        const linkStr = links.join("\r\n");
        try {
            await navigator.clipboard.writeText(linkStr);
        } catch {
            try {
                await GM.setClipboard(linkStr, "text");
            } catch {
                try {
                    await new Promise((resolve, _) => GM_setClipboard(linkStr, "text", () => resolve()));
                } catch {
                    alert(`复制失败！`);
                    return;
                }
            }
        }
        if (errorCount === 0) {
            alert(`复制成功！共获取${links.length}条链接。`);
        } else {
            alert(`复制成功！共获取${links.length}条链接，另有${errorCount}条链接获取失败，详细信息请查看浏览器控制台。`);
        }
    } finally {
        BUTTON.innerText = "复制所有图片原图链接";
        BUTTON.disabled = false;
    }
}

/** @param {number} time */
async function sleep(time) {
    return new Promise((resolve, _) => setTimeout(resolve, time));
}

/**
 * @param {string} md5
 * @param {(value:string|PromiseLike<string>)=>void} resolve
 * @param {(reason?:any)=>void} reject
 */
async function grabData(md5, resolve, reject) {
    const resp = await fetch(QUERY_PATH + md5);
    if (resp.status < 200 || resp.status > 299) {
        return reject(resp.status.toString());
    }
    /** @ts-ignore @type {BooruPostsResponseItem[]} */
    const json = await resp.json();
    const url = json?.[0]?.file_url;
    if (url === null || url === undefined || url.length === 0) {
        return reject("Invalid response!");
    }
    BUTTON.innerText = `正在获取原图信息……(${++c}/${MD5_SET.size})`;
    return resolve(url);
}

/**
 * @typedef {Object} BooruPostsResponseItem
 * @property {string} file_url
 */